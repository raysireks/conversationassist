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
```bash
python main.py
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
