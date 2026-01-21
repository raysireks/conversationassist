# Feature Backlog

This document defines the features required to implement the Local Transcription & Stealth UI Roadmap.

---

## Feature 1: Local Transcription Backend Service
**Summary**: Build a standalone Python-based WebSocket server that leverages the local GPU (RTX 3080) for high-performance speech-to-text using `faster-whisper`.
**Acceptance Criteria**:
- [x] Server is built using Python and FastAPI.
- [x] Server runs successfully on Windows/WSL environment.
- [x] Exposes a WebSocket endpoint `ws://localhost:8000/ws/transcribe`.
- [x] Endpoint accepts binary audio streams (PCM).
- [x] Endpoint returns real-time JSON events containing partial and final transcriptions.
- [x] Server implements Voice Activity Detection (VAD) to ignore silence and optimize GPU usage.
- [x] Docker container or `venv` setup script provided for easy deployment.

## Feature 2: Frontend Audio Abstraction & Socket Client
**Summary**: Refactor the Next.js application to abstract audio capture logic and implement a client capable of communicating with the new Local Backend.
**Acceptance Criteria**:
- [x] Existing Azure code is refactored behind a generic `AudioProvider` interface.
- [x] `WebAudioRecorder` is implemented to capture raw PCM audio from the browser's `AudioContext`.
- [x] `LocalTranscriptionClient` is implemented to manage the WebSocket connection to the Python backend.
- [x] Client automatically resamples browser audio (e.g., 44.1kHz/48kHz) to the 16kHz required by Whisper.
- [x] Client gracefully handles connection failures or server unavailability (optional: fallback to Azure).

## Feature 3: Settings UI for Transcription Provider
**Summary**: Update the application's Settings Dialog to allow the user to choose between Azure and Local transcription services.
**Acceptance Criteria**:
- [x] "Transcription" section added to Settings Dialog.
- [x] Toggle or Dropdown allows selection of "Azure Speech Services" or "Local Whisper Server".
- [x] Input field provided to specify "Local Server URL" (defaults to `ws://localhost:8000`).
- [x] Selected provider and URL are persisted in application configuration (LocalStorage).
- [x] Application hot-reloads the transcription engine when settings change.

## Feature 4: Backend State Synchronization (Session Hub)
**Summary**: Enhance the Python Backend to act as a central hub that maintains the "Source of Truth" for the session, allowing decoupling of Listeners and Viewers.
**Acceptance Criteria**:
- [x] Backend maintains in-memory state of the current conversation (transcript history + AI responses).
- [x] WebSocket protocol updated to support "Session" events (e.g., `SYNC_STATE`, `NEW_MESSAGE`).
- [x] Backend broadcasts state updates to all connected clients identified as "Viewers".
- [x] Backend accepts transcription segments from clients identified as "Listeners".

## Feature 5: Stealth Listener Mode
**Summary**: Create a specific "Listener" mode for the frontend that captures audio while displaying an innocuous, boring interface (Stealth Mode).
**Acceptance Criteria**:
- [x] Frontend detects `?role=listener` query parameter.
- [x] When in Listener mode, the UI mimics a generic static page (e.g., "404 Not Found" or a "Documentation" page).
- [x] Microphone and System Audio capture start automatically or via a hidden trigger.
- [x] Audio is streamed to the backend.
- [x] Heavy UI components (Chat Log, AI Responses) are NOT rendered to save resources and maintain stealth.

## Feature 6: Remote Viewer Mode
**Summary**: Create a specific "Viewer" mode for the frontend that serves as a passive display for the interview session.
**Acceptance Criteria**:
- [x] Frontend detects `?role=viewer` query parameter.
- [x] When in Viewer mode, all Audio Capture logic (Mic/System) is disabled.
- [x] App connects to the backend solely to subscribe to state updates.
- [x] UI renders the real-time Transcript and AI Responses as they are pushed from the server.
- [x] UI is responsive and optimized for mobile devices (phones/tablets).

## Feature 7: The 4-Column Dashboard
**Summary**: Restructure the Viewer UI into a high-density dashboard with 4 distinct columns to maximize information intake.
**Acceptance Criteria**:
- [ ] **Questions Column (Col 1)**: Collapsible sidebar for pending questions.
- [ ] **Context Column (Col 2)**: Displays insight chips derived from *every* summary block.
- [ ] **Transcript Column (Col 3)**: Main conversation view + "In Progress" thought box.
- [ ] **Candidate Column (Col 4)**: Dedicated space for Candidate statements and verification.

## Feature 8: Smart Summarization & Research
**Summary**: Clickable elements triggering deep-dive analysis.
**Acceptance Criteria**:
- [ ] **Research Modal**: Clicking a Question opens a modal with "Top 10 Keywords" and "5 Ws" analysis.
- [ ] **Context Synthesis**: Logic to aggregate all context chips into a master summary on demand.
- [ ] **Local AI**: "In Progress" thoughts are summarized by a cheap Local LLM to save tokens.

## Feature 9: Fact Checking
**Summary**: Real-time verification of candidate statements.
**Acceptance Criteria**:
- [ ] Backend Service analyzes Candidate text for factual accuracy.
- [ ] Frontend displays Green Check / Red No indicators on Candidate cards.
- [ ] Clicking an indicator opens a "Fact Check Detail" view.
