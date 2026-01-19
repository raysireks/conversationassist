import asyncio
import json
import logging
import numpy as np
import threading
import queue
import time
import logging
import os
from typing import List, Dict, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from faster_whisper import WhisperModel
from dotenv import load_dotenv
import openai
import google.generativeai as genai

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load config
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Local Transcription Backend")

# Enable CORS for all origins (Required for mirrored networking and mobile access)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os

# Initialize Whisper Model
MODEL_SIZE = os.getenv("WHISPER_MODEL", "base")
MODEL_CACHE = os.getenv("WHISPER_CACHE", None)
DEVICE = "cuda" if threading.active_count() > 0 else "cpu" 

logger.info(f"Initializing with model size: {MODEL_SIZE}, cache: {MODEL_CACHE}")

try:
    # RTX 3080 supports float16
    model = WhisperModel(
        MODEL_SIZE, 
        device="cuda", 
        compute_type="float16", 
        download_root=MODEL_CACHE
    )
    logger.info(f"Loaded Whisper model '{MODEL_SIZE}' on CUDA.")
except Exception as e:
    logger.warning(f"Failed to load CUDA, falling back to CPU: {e}")
    model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")

@app.get("/")
async def root():
    return {"status": "online", "model": MODEL_SIZE, "device": model.model.device}

@app.get("/config")
async def get_backend_config():
    return {
        "status": "online",
        "openai_available": bool(OPENAI_API_KEY),
        "gemini_available": bool(GEMINI_API_KEY),
        "whisper_model": MODEL_SIZE,
        "device": DEVICE
    }

# ... imports ...
from semantic_segmenter import SemanticSegmenter

# ... existing code ...

class SessionManager:
    def __init__(self):
        self.active_viewers: Set[WebSocket] = set()
        self.active_listeners: Set[WebSocket] = set()
        self.history: List[Dict] = []
        self.lock = asyncio.Lock()
        
        # AI Config
        self.ai_enabled = True
        self.ai_model = os.getenv("DEFAULT_AI_MODEL", "gpt-4o-mini")
        self.system_prompt = "You are a helpful interview assistant. Provide concise feedback based on the conversation."

        # Initialize Semantic Segmenter
        try:
            self.segmenter = SemanticSegmenter()
        except Exception as e:
            logger.error(f"Failed to load Segmenter (likely missing dependencies): {e}")
            self.segmenter = None

    async def handle_force_segment(self):
        if self.segmenter:
            decision = self.segmenter.manual_segment_trigger()
            if decision:
                logger.info(f"Manual Force Segment Triggered: {decision}")
                await self.broadcast({
                    "type": "transcription", 
                    "segments": [], 
                    "is_final": True,
                    "thought_segment": decision
                })

    async def add_viewer(self, websocket: WebSocket):
        async with self.lock:
            self.active_viewers.add(websocket)
            await websocket.send_json({
                "type": "session_state",
                "history": self.history,
                "ai_enabled": self.ai_enabled,
                "ai_model": self.ai_model
            })

    async def toggle_ai(self, enabled: bool):
        async with self.lock:
            self.ai_enabled = enabled
            logger.info(f"AI Toggled: {self.ai_enabled}")
        await self.broadcast({
            "type": "ai_state",
            "enabled": self.ai_enabled
        })

    async def call_ai(self, text: str):
        if not self.ai_enabled:
            return

        messages = [{"role": "system", "content": self.system_prompt}]
        for item in self.history[-6:]:
            if item.get("type") == "ai_log":
                role = "assistant" if item["role"] == "assistant" else "user"
                messages.append({"role": role, "content": item["text"]})
            elif item.get("type") == "transcription":
                full_text = " ".join([s["text"] for s in item["segments"]])
                messages.append({"role": "user", "content": full_text})
        
        messages.append({"role": "user", "content": text})

        try:
            response_text = ""
            if "gemini" in self.ai_model.lower() and GEMINI_API_KEY:
                model = genai.GenerativeModel(self.ai_model)
                contents = []
                for m in messages:
                    role = "user" if m["role"] == "user" else "model"
                    if m["role"] == "system": continue 
                    contents.append({"role": role, "parts": [{"text": m["content"]}]})
                
                response = await asyncio.to_thread(model.generate_content, contents)
                response_text = response.text
                
            elif OPENAI_API_KEY:
                client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
                response = await client.chat.completions.create(
                    model=self.ai_model,
                    messages=messages,
                    temperature=0.7
                )
                response_text = response.choices[0].message.content
            
            if response_text:
                await self.broadcast({
                    "type": "ai_log",
                    "text": response_text,
                    "role": "assistant"
                }, save_to_history=True)

        except Exception as e:
            logger.error(f"AI Service Error: {e}")
            await self.broadcast({
                "type": "error",
                "message": f"AI Error: {str(e)}"
            })

    async def remove_viewer(self, websocket: WebSocket):
        async with self.lock:
            self.active_viewers.remove(websocket)

    async def add_listener(self, websocket: WebSocket):
        async with self.lock:
            self.active_listeners.add(websocket)
            await websocket.send_json({
                "type": "session_state",
                "history": self.history
            })

    async def remove_listener(self, websocket: WebSocket):
        async with self.lock:
            self.active_listeners.remove(websocket)

    async def broadcast(self, message: Dict, save_to_history: bool = False):
        async with self.lock:
            if save_to_history:
                self.history.append({
                    **message,
                    "timestamp": asyncio.get_event_loop().time()
                })
            
            all_clients = self.active_viewers.union(self.active_listeners)
            disconnected = []
            for client in all_clients:
                try:
                    await client.send_json(message)
                except Exception:
                    disconnected.append(client)
            
            for client in disconnected:
                if client in self.active_viewers:
                    self.active_viewers.remove(client)
                if client in self.active_listeners:
                    self.active_listeners.remove(client)

    async def broadcast_update(self, segments: List[Dict], is_final: bool):
        # 1. Process Semantic Segmentation (Integrated)
        thought_payload = None
        if self.segmenter and is_final:
            full_text = " ".join([s["text"] for s in segments])
            thought_payload = self.segmenter.process(full_text)

        # 2. Prepare Message
        message = {
            "type": "transcription",
            "segments": segments,
            "is_final": is_final
        }
        
        if thought_payload:
            message["thought_segment"] = thought_payload

        await self.broadcast(message, save_to_history=is_final)
        
        # 3. Auto-trigger AI if it's a final sentence
        if is_final:
            full_text = " ".join([s["text"] for s in segments])
            if full_text.strip():
                asyncio.create_task(self.call_ai(full_text))

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
        # List of common Whisper hallucinations to ignore
        HALLUCINATIONS = {
            "Thank you.", "Thank you", "Thank you for watching.", 
            "Thanks for watching.", "Please subscribe", "Please subscribe.", 
            "Subtitles by", "you", "Thank you very much.", "Thanks."
        }
        
        while not self.stop_event.is_set():
            try:
                # 1. Drain the queue completely to catch up to the latest audio
                new_data = []
                while not self.audio_queue.empty():
                    try:
                        new_data.append(self.audio_queue.get_nowait())
                    except queue.Empty:
                        break
                
                if new_data:
                    self.buffer = np.concatenate([self.buffer] + new_data)

                total_duration = len(self.buffer) / 16000.0

                # 2. Lag Protection: If we have more than 15s in the queue/buffer and aren't finishing, 
                # we are likely falling behind. Trim it.
                if total_duration > 20.0:
                    logger.warning(f"Transcription lagging ({total_duration:.1f}s). Trimming buffer.")
                    self.buffer = self.buffer[-16000 * 10:]
                    total_duration = 10.0

                # 3. Process if we have enough audio
                if total_duration >= 1.0: 
                    # Use a smaller window (10s) for re-transcription to keep it fast
                    audio_to_process = self.buffer
                    if len(audio_to_process) > 16000 * 10:
                        audio_to_process = audio_to_process[-16000 * 10:]

                    # 4. Streamlined transcription call
                    segments, info = self.model.transcribe(
                        audio_to_process,
                        beam_size=1,        # Fast processing (3080 handles this in ms)
                        language="en", 
                        vad_filter=True,
                        vad_parameters=dict(min_silence_duration_ms=600),
                        condition_on_previous_text=True,
                        initial_prompt="Interview transcription. Stable and fast."
                    )
                    
                    results = []
                    last_segment_end = 0.0
                    for segment in segments:
                        text = segment.text.strip()
                        if text in HALLUCINATIONS or len(text) <= 1:
                            continue
                            
                        results.append({
                            "start": round(segment.start, 2),
                            "end": round(segment.end, 2),
                            "text": text,
                            "id": segment.id
                        })
                        last_segment_end = segment.end
                    
                    is_final = False
                    should_clear_buffer = False
                    
                    if results:
                        # 5. Faster Finalization: 0.8s of silence is usually a safe break point
                        silence_duration = total_duration - last_segment_end
                        if silence_duration > 1.2: 
                            is_final = True
                            should_clear_buffer = True
                    else:
                        if total_duration > 3.0: # Clear silence faster
                            should_clear_buffer = True

                    if results:
                        asyncio.run_coroutine_threadsafe(
                            self.session_manager.broadcast_update(results, is_final),
                            self.loop
                        )
                    
                    if should_clear_buffer:
                        self.buffer = np.array([], dtype=np.float32)
                
                # Small sleep to prevent tight-loop CPU hogging
                time.sleep(0.05)
                
            except Exception as e:
                logger.error(f"Error in transcription worker: {e}")
                time.sleep(0.1)

@app.websocket("/ws/session")
async def session_websocket(websocket: WebSocket, role: str = Query(...)):
    await websocket.accept()
    logger.info(f"New client connected as {role}")
    
    if role == "viewer":
        await session_manager.add_viewer(websocket)
        try:
            while True:
                # Viewers can also send relay messages (like manual adjustments)
                message = await websocket.receive()
                if "text" in message:
                    try:
                        data = json.loads(message["text"])
                        if data.get("type") == "toggle_ai":
                            await session_manager.toggle_ai(data["enabled"])
                        elif data.get("type") == "change_model":
                            session_manager.ai_model = data["model"]
                        elif data.get("type") == "force_segment":
                            await session_manager.handle_force_segment()
                        else:
                            await session_manager.broadcast(data, save_to_history=True)
                    except json.JSONDecodeError:
                        pass
        except WebSocketDisconnect:
            await session_manager.remove_viewer(websocket)
            logger.info("Viewer disconnected")
    
    elif role in ["listener", "candidate"]:
        await session_manager.add_listener(websocket)
        worker = TranscriptionWorker(model, websocket, session_manager)
        worker.start()
        try:
            while True:
                message = await websocket.receive()
                if "bytes" in message:
                    data = message["bytes"]
                    audio_chunk = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0
                    worker.add_audio(audio_chunk)
                elif "text" in message:
                    try:
                        data = json.loads(message["text"])
                        if data.get("type") == "toggle_ai":
                            await session_manager.toggle_ai(data["enabled"])
                        elif data.get("type") == "change_model":
                            session_manager.ai_model = data["model"]
                        elif data.get("type") == "force_segment":
                            await session_manager.handle_force_segment()
                        else:
                            # Relay other state updates to all viewers
                            await session_manager.broadcast(data, save_to_history=True)
                    except json.JSONDecodeError:
                        pass
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
