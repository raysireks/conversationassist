# Feature Backlog

This document defines the features required to implement the Local Transcription & Stealth UI Roadmap.

---

## Feature 1: Local Transcription Backend Service
**Summary**: Build a standalone Python-based WebSocket server that leverages the local GPU (RTX 3080) for high-performance speech-to-text using `faster-whisper`.
**Acceptance Criteria**:
- [ ] Server is built using Python and FastAPI.
- [ ] Server runs successfully on Windows/WSL environment.
- [ ] Exposes a WebSocket endpoint `ws://localhost:8000/ws/transcribe`.
- [ ] Endpoint accepts binary audio streams (PCM).
- [ ] Endpoint returns real-time JSON events containing partial and final transcriptions.
- [ ] Server implements Voice Activity Detection (VAD) to ignore silence and optimize GPU usage.
- [ ] Docker container or `venv` setup script provided for easy deployment.

## Feature 2: Frontend Audio Abstraction & Socket Client
**Summary**: Refactor the Next.js application to abstract audio capture logic and implement a client capable of communicating with the new Local Backend.
**Acceptance Criteria**:
- [ ] Existing Azure code is refactored behind a generic `AudioProvider` interface.
- [ ] `WebAudioRecorder` is implemented to capture raw PCM audio from the browser's `AudioContext`.
- [ ] `LocalTranscriptionClient` is implemented to manage the WebSocket connection to the Python backend.
- [ ] Client automatically resamples browser audio (e.g., 44.1kHz/48kHz) to the 16kHz required by Whisper.
- [ ] Client gracefully handles connection failures or server unavailability (optional: fallback to Azure).

## Feature 3: Settings UI for Transcription Provider
**Summary**: Update the application's Settings Dialog to allow the user to choose between Azure and Local transcription services.
**Acceptance Criteria**:
- [ ] "Transcription" section added to Settings Dialog.
- [ ] Toggle or Dropdown allows selection of "Azure Speech Services" or "Local Whisper Server".
- [ ] Input field provided to specify "Local Server URL" (defaults to `ws://localhost:8000`).
- [ ] Selected provider and URL are persisted in application configuration (LocalStorage).
- [ ] Application hot-reloads the transcription engine when settings change.

## Feature 4: Backend State Synchronization (Session Hub)
**Summary**: Enhance the Python Backend to act as a central hub that maintains the "Source of Truth" for the session, allowing decoupling of Listeners and Viewers.
**Acceptance Criteria**:
- [ ] Backend maintains in-memory state of the current conversation (transcript history + AI responses).
- [ ] WebSocket protocol updated to support "Session" events (e.g., `SYNC_STATE`, `NEW_MESSAGE`).
- [ ] Backend broadcasts state updates to all connected clients identified as "Viewers".
- [ ] Backend accepts transcription segments from clients identified as "Listeners".

## Feature 5: Stealth Listener Mode
**Summary**: Create a specific "Listener" mode for the frontend that captures audio while displaying an innocuous, boring interface (Stealth Mode).
**Acceptance Criteria**:
- [ ] Frontend detects `?role=listener` query parameter.
- [ ] When in Listener mode, the UI mimics a generic static page (e.g., "404 Not Found" or a "Documentation" page).
- [ ] Microphone and System Audio capture start automatically or via a hidden trigger.
- [ ] Audio is streamed to the backend.
- [ ] Heavy UI components (Chat Log, AI Responses) are NOT rendered to save resources and maintain stealth.

## Feature 6: Remote Viewer Mode
**Summary**: Create a specific "Viewer" mode for the frontend that serves as a passive display for the interview session.
**Acceptance Criteria**:
- [ ] Frontend detects `?role=viewer` query parameter.
- [ ] When in Viewer mode, all Audio Capture logic (Mic/System) is disabled.
- [ ] App connects to the backend solely to subscribe to state updates.
- [ ] UI renders the real-time Transcript and AI Responses as they are pushed from the server.
- [ ] UI is responsive and optimized for mobile devices (phones/tablets).
