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
                    if len(self.buffer) == 0:
                        continue

                # Once we have enough audio (e.g., 0.5s), transcribe
                if len(self.buffer) >= 8000: # 0.5s at 16kHz
                    # For real-time, we might want to look at the last few seconds
                    # Whisper works best with context.
                    audio_to_process = self.buffer
                    
                    # Transcribe
                    segments, info = self.model.transcribe(
                        audio_to_process,
                        beam_size=5,
                        vad_filter=True,
                        vad_parameters=dict(min_silence_duration_ms=500),
                        task="transcribe"
                    )
                    
                    results = []
                    for segment in segments:
                        results.append({
                            "start": round(segment.start, 2),
                            "end": round(segment.end, 2),
                            "text": segment.text.strip(),
                            "id": segment.id
                        })
                    
                    if results:
                        # Send transcription update
                        asyncio.run_coroutine_threadsafe(
                            self.websocket.send_json({
                                "type": "transcription",
                                "segments": results,
                                "is_final": False # In this simplified version, all are "current"
                            }),
                            self.loop
                        )
                    
                    # Manage buffer: keep some context but don't let it grow infinitely
                    # If we have more than 30 seconds, trim the beginning
                    if len(self.buffer) > 16000 * 30:
                        self.buffer = self.buffer[-16000 * 10:] # Keep last 10 seconds

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
