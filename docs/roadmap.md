# Project Roadmap: usage of Local Transcription & Stealth UI

This roadmap outlines the plan to migrate from Azure-only transcription to a high-performance local transcription service (leveraging a 3080 GPU) and to implement stealth/remote viewing capabilities.

## Phase 1: Local Transcription Backend 🚀
**Goal**: Build a standalone service running on Windows/WSL that listens for audio and returns text using Whisper.

### User View
*   We will build a "Backend Server" that runs on your powerful Windows machine.
*   It will replace Azure's "ears" with your own "ears" (OpenAI Whisper model).
*   It will run fast on your RTX 3080.

### Technical Steps
- [ ] **Tech Stack Selection**: Python + FastAPI + `faster-whisper`.
    *   *Why*: Python has the best ML support. FastAPI is high-performance and async (critical for streaming audio). `faster-whisper` is optimized for CTranslate2 and much faster than standard Whisper.
- [ ] **API Design**: Define WebSocket endpoints for real-time audio streaming.
    *   `/ws/transcribe`: Accepts binary audio stream, returns JSON transcript events.
- [ ] **Implementation**:
    *   Setup Python project structure.
    *   Implement VAD (Voice Activity Detection) to avoid processing silence (saving GPU cycles).
    *   Implement the `faster-whisper` loop.

## Phase 2: Frontend Integration 🔌
**Goal**: Connect the existing Next.js application to our new Local Backend.

### User View
*   Update the "Settings" menu to have a "Use Local Transcription" toggle.
*   When enabled, the app talks to your local computer instead of Microsoft Azure.

### Technical Steps
- [ ] **Audio Capture Refactor**:
    *   We need to abstract audio capture into a generic `AudioProvider` interface.
    *   Implement a `WebAudioRecorder` that captures raw PCM data from the browser's `AudioContext`.
- [ ] **Socket Client**:
    *   Create a `LocalTranscriptionClient` in the frontend.
    *   Connects to `ws://localhost:8000/ws/transcribe`.
    *   Resamples browser audio (usually 44.1/48kHz) to Whisper's required rate (16kHz).
- [ ] **Settings UI**:
    *   Add fields for `Local Server URL` (default: `ws://localhost:8000`).
    *   Add Toggle: `Transcription Provider: [Azure | Local]`.

## Phase 3: Single User, Flexible Architecture ↔️
**Goal**: Decouple the "Listener" (Audio Source) from the "Viewer" (UI & AI) for a single user. Allow the user to run these components on the same or different devices.

### User View
*   **Single User Session**: Designed for one person to control their interview setup.
*   **Flexible Roles**:
    *   **Listener**: Capture audio (mic/system) and stream it to the server.
    *   **Viewer**: See the live transcript and AI suggestions.
    *   **Hybrid**: Do both on one machine (Classic Mode).
    *   *Note*: Typcially one active Listener and one active Viewer at a time.
*   **Scenario A (Stealth)**: Desktop runs "Listener" (disguised), Phone runs "Viewer".
*   **Scenario B (Remote)**: Laptop runs "Listener" in a meeting room, Desktop runs "Viewer" in your office.

### Technical Steps
- [ ] **Socket.IO Sync Hub**:
    *   Update the Python Backend to act as a **State Synchronization Hub**.
    *   It maintains the "Session Truth": current transcript, AI response history, and active audio streams.
- [ ] **Role-Based Client Logic**:
    *   Update frontend to support "Join Mode":
        *   `?role=listener`: Activates VAD & Streaming, hides UI (or shows dummy UI).
        *   `?role=viewer`: Disables Mic/System audio, subscribes to State Updates.
        *   `?role=full` (Default): Does both.
- [ ] **"Stealth" Listener Mode**:
    *   Implement the "Disguised" UI for the `listener` role.

