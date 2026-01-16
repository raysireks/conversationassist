import asyncio
import json
import logging
import numpy as np
import threading
import queue
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from faster_whisper import WhisperModel

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Local Transcription Backend")

# Initialize Whisper Model
MODEL_SIZE = "base" # base, small, medium, large-v3
DEVICE = "cuda" if threading.active_count() > 0 else "cpu" # Default to cpu if check fails, but we'll try cuda

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

class TranscriptionWorker:
    def __init__(self, model, websocket):
        self.model = model
        self.websocket = websocket
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
                # Wait for audio chunks
                try:
                    chunk = self.audio_queue.get(timeout=0.1)
                    self.buffer = np.concatenate([self.buffer, chunk])
                except queue.Empty:
                    pass

                # TRANSCRIPTION LOGIC:
                # Strategy:
                # 1. Accumulate at least 1.0s to avoid hallucination.
                # 2. Run Whisper on buffer.
                # 3. If we detect a "completed phrase" (silence at end), mark as Final and clear buffer.
                
                total_duration = len(self.buffer) / 16000.0
                if total_duration >= 1.0: 
                    
                    audio_to_process = self.buffer
                    # Cap context at 30s
                    if len(audio_to_process) > 16000 * 30:
                        audio_to_process = audio_to_process[-16000*30:]

                    # Transcribe
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
                    
                    # Logic to determine if we should "Finalize" (Commit) this text
                    # If silence at the end > 1.0s, or if buffer is getting huge
                    
                    is_final = False
                    should_clear_buffer = False
                    
                    if results:
                        # Check trailing silence
                        silence_duration = total_duration - last_segment_end
                        if silence_duration > 1.0:
                            is_final = True
                            should_clear_buffer = True
                    else:
                        # No speech detected
                        # If buffer is long (>5s) and empty, clear it to reset state
                        if total_duration > 5.0:
                            should_clear_buffer = True

                    if results:
                        asyncio.run_coroutine_threadsafe(
                            self.websocket.send_json({
                                "type": "transcription",
                                "segments": results,
                                "is_final": is_final 
                            }),
                            self.loop
                        )
                    
                    # Smart Buffer Management
                    if should_clear_buffer:
                        # If we finalized, we clear the buffer to start fresh
                        # This keeps latency low and prevents reprocessing "committed" audio
                        self.buffer = np.array([], dtype=np.float32)
                    elif len(self.buffer) > 16000 * 30:
                        # Safety fallback: Drop old audio if we haven't finalized in 30s
                         self.buffer = self.buffer[-16000 * 10:] 
                
            except Exception as e:
                logger.error(f"Error in transcription worker: {e}")

@app.websocket("/ws/transcribe")
async def transcribe_websocket(websocket: WebSocket):
    await websocket.accept()
    logger.info("New client connected to /ws/transcribe")
    
    worker = TranscriptionWorker(model, websocket)
    worker.start()
    
    try:
        while True:
            # Expecting raw PCM 16-bit 16kHz mono audio
            data = await websocket.receive_bytes()
            # Convert to float32
            audio_chunk = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0
            worker.add_audio(audio_chunk)
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        worker.stop()
        try:
            await websocket.close()
        except:
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
