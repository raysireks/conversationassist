# Local Transcription Backend

This is a standalone Python-based WebSocket server that leverages local GPU/CPU for high-performance speech-to-text using `faster-whisper`.

## Features
- Real-time transcription via WebSockets.
- Voice Activity Detection (VAD) using Silero-VAD.
- Supports CUDA for GPU acceleration (optimized for RTX 3080).
- FastAPI based.

## Setup

### Prerequisites
- Python 3.10+
- (Optional) NVIDIA GPU with CUDA 11.8+ for performance.
- `ffmpeg` installed on the system.

### Local Installation
1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Running the Server
You can run the server using the `npm` scripts defined in `package.json`:

### Running the Server
You can run the server using the `npm` scripts defined in `package.json`.

**For Development (Mac or WSL CPU-only):**
This uses your local `venv` environment.
```bash
npm run dev:mac
# OR
npm run dev:wsl
```

**For Production / GPU (Windows via WSL + Docker):**
This builds and runs the Docker container with NVIDIA GPU support.
*Requires Docker Desktop with WSL 2 backend and NVIDIA Container Toolkit.*
```bash
npm run start:gpu
```

Alternatively, run manually:
```bash
# Local
source venv/bin/activate
python main.py

# Docker
docker build -t transcription-backend .
docker run --gpus all -p 8000:8000 transcription-backend
```
The server will start on `http://localhost:8000`.

## WebSocket API
Endpoint: `ws://localhost:8000/ws/transcribe`

### Protocol
1. Connect to the WebSocket.
2. Send binary messages containing raw PCM 16-bit 16kHz mono audio.
3. Receive JSON events:
   ```json
   {
     "type": "transcription",
     "segments": [
       {
         "start": 0.0,
         "end": 1.2,
         "text": "Hello world",
         "id": 0
       }
     ],
     "is_final": false
   }
   ```

## Docker Support
To build and run with Docker (requires NVIDIA Container Toolkit):
```bash
docker build -t transcription-backend .
docker run --gpus all -p 8000:8000 transcription-backend
```
