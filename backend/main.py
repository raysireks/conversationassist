import asyncio
import json
import logging
import numpy as np
import threading
import queue
from typing import List, Dict, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from faster_whisper import WhisperModel

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Local Transcription Backend")

# Initialize Whisper Model
MODEL_SIZE = "base" # base, small, medium, large-v3
DEVICE = "cuda" if threading.active_count() > 0 else "cpu" 

try:
    # RTX 3080 supports float16
    model = WhisperModel(MODEL_SIZE, device="cuda", compute_type="float16")
    logger.info(f"Loaded Whisper model '{MODEL_SIZE}' on CUDA.")
except Exception as e:
    logger.warning(f"Failed to load CUDA, falling back to CPU: {e}")
    model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")

@app.get("/")
async def root():
    return {"status": "online", "model": MODEL_SIZE, "device": model.model.device}

class SessionManager:
    def __init__(self):
        self.active_viewers: Set[WebSocket] = set()
        self.active_listeners: Set[WebSocket] = set()
        self.history: List[Dict] = []
        self.lock = asyncio.Lock()

    async def add_viewer(self, websocket: WebSocket):
        async with self.lock:
            self.active_viewers.add(websocket)
            # Send current history to the new viewer
            await websocket.send_json({
                "type": "session_state",
                "history": self.history
            })

    async def remove_viewer(self, websocket: WebSocket):
        async with self.lock:
            self.active_viewers.remove(websocket)

    async def add_listener(self, websocket: WebSocket):
        async with self.lock:
            self.active_listeners.add(websocket)

    async def remove_listener(self, websocket: WebSocket):
        async with self.lock:
            self.active_listeners.remove(websocket)

    async def broadcast_update(self, segments: List[Dict], is_final: bool):
        message = {
            "type": "transcription_update",
            "segments": segments,
            "is_final": is_final
        }
        
        async with self.lock:
            if is_final:
                self.history.append({
                    "segments": segments,
                    "timestamp": asyncio.get_event_loop().time()
                })
            
            # Broadcast to all viewers
            disconnected = []
            for viewer in self.active_viewers:
                try:
                    await viewer.send_json(message)
                except Exception:
                    disconnected.append(viewer)
            
            for viewer in disconnected:
                self.active_viewers.remove(viewer)

session_manager = SessionManager()

class TranscriptionWorker:
    def __init__(self, model, websocket, session_manager):
        self.model = model
        self.websocket = websocket
        self.session_manager = session_manager
        self.audio_queue = queue.Queue()
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self._run)
        self.buffer = np.array([], dtype=np.float32)
        self.loop = asyncio.get_running_loop()

    def start(self):
        self.thread.start()

    def stop(self):
        self.stop_event.set()
        self.thread.join()

    def add_audio(self, data):
        self.audio_queue.put(data)

    def _run(self):
        while not self.stop_event.is_set():
            try:
                try:
                    chunk = self.audio_queue.get(timeout=0.1)
                    self.buffer = np.concatenate([self.buffer, chunk])
                except queue.Empty:
                    pass

                total_duration = len(self.buffer) / 16000.0
                if total_duration >= 1.0: 
                    audio_to_process = self.buffer
                    if len(audio_to_process) > 16000 * 30:
                        audio_to_process = audio_to_process[-16000*30:]

                    segments, info = self.model.transcribe(
                        audio_to_process,
                        beam_size=5,
                        language="en", 
                        vad_filter=True,
                        vad_parameters=dict(min_silence_duration_ms=500),
                        condition_on_previous_text=False
                    )
                    
                    results = []
                    last_segment_end = 0.0
                    for segment in segments:
                        results.append({
                            "start": round(segment.start, 2),
                            "end": round(segment.end, 2),
                            "text": segment.text.strip(),
                            "id": segment.id
                        })
                        last_segment_end = segment.end
                    
                    is_final = False
                    should_clear_buffer = False
                    
                    if results:
                        silence_duration = total_duration - last_segment_end
                        if silence_duration > 1.0:
                            is_final = True
                            should_clear_buffer = True
                    else:
                        if total_duration > 5.0:
                            should_clear_buffer = True

                    if results:
                        # Report to SessionManager instead of just sending back to the local client
                        asyncio.run_coroutine_threadsafe(
                            self.session_manager.broadcast_update(results, is_final),
                            self.loop
                        )
                    
                    if should_clear_buffer:
                        self.buffer = np.array([], dtype=np.float32)
                    elif len(self.buffer) > 16000 * 30:
                         self.buffer = self.buffer[-16000 * 10:] 
                
            except Exception as e:
                logger.error(f"Error in transcription worker: {e}")

@app.websocket("/ws/session")
async def session_websocket(websocket: WebSocket, role: str = Query(...)):
    await websocket.accept()
    logger.info(f"New client connected as {role}")
    
    if role == "viewer":
        await session_manager.add_viewer(websocket)
        try:
            while True:
                # Keep connection open, wait for disconnect
                await websocket.receive_text()
        except WebSocketDisconnect:
            await session_manager.remove_viewer(websocket)
            logger.info("Viewer disconnected")
    
    elif role == "listener":
        await session_manager.add_listener(websocket)
        worker = TranscriptionWorker(model, websocket, session_manager)
        worker.start()
        try:
            while True:
                data = await websocket.receive_bytes()
                audio_chunk = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0
                worker.add_audio(audio_chunk)
        except WebSocketDisconnect:
            await session_manager.remove_listener(websocket)
            logger.info("Listener disconnected")
        finally:
            worker.stop()
    else:
        await websocket.close(code=4000, reason="Invalid role")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
