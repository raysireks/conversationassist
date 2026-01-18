
/**
 * A drop-in replacement for Microsoft's SpeechSDK.SpeechRecognizer
 * that connects to our local Python backend instead of Azure.
 */
export class LocalTranscriptionService {
    constructor(audioConfig, role = 'listener') {
        // Mimic the Azure SDK structure
        this.audioConfig = audioConfig; // We expect the helper to pass the stream here somehow
        this.privStream = audioConfig.privStream; // Custom hack to get stream if needed
        this.role = role;

        // Azure SDK Callbacks
        this.recognized = null;       // (s, e) => void
        this.canceled = null;         // (s, e) => void
        this.onHistory = null;        // (history) => void
        this.sampleRate = 16000;      // Whisper expects 16kHz
    }

    // Mimic Azure Enums for compatibility
    static ResultReason = {
        RecognizingSpeech: 'RecognizingSpeech',
        RecognizedSpeech: 'RecognizedSpeech',
        NoMatch: 'NoMatch',
        Canceled: 'Canceled',
    };

    static CancellationReason = {
        Error: 'Error',
        EndOfStream: 'EndOfStream',
    };

    /**
     * Starts connection to local backend and audio processing.
     * Signature matches: startContinuousRecognitionAsync()
     */
    async startContinuousRecognitionAsync() {
        return new Promise(async (resolve, reject) => {
            try {
                // 1. Setup WebSocket
                const host = window.location.hostname || 'localhost';
                this.ws = new WebSocket(`ws://${host}:8000/ws/session?role=${this.role}`);
                this.ws.binaryType = "arraybuffer";

                this.ws.onopen = () => {
                    resolve(); // Resolve success once connected
                };

                this.ws.onerror = (e) => {
                    this._triggerCanceled("WebSocket connection failed", "ConnectivityError");
                    reject(new Error("WebSocket connection failed"));
                };

                this.ws.onmessage = (event) => {
                    try {
                        const data = typeof event.data === 'string' ? JSON.parse(event.data) : null;
                        if (!data) return;

                        if (data.type === "session_state") {
                            this.lastState = data;
                            if (this.onHistory) this.onHistory(data.history);
                        } else if (data.type === "transcription") {
                            // Construct the event object that interview.js expects
                            const text = data.segments.map(s => s.text).join(" ").trim();

                            if (!text) return;

                            const reason = data.is_final
                                ? LocalTranscriptionService.ResultReason.RecognizedSpeech
                                : LocalTranscriptionService.ResultReason.RecognizingSpeech;

                            const eventPayload = {
                                result: {
                                    reason: reason,
                                    text: text,
                                }
                            };

                            // Trigger appropriate callback
                            if (data.is_final) {
                                if (this.recognized) this.recognized(this, eventPayload);
                            } else {
                                if (this.recognizing) this.recognizing(this, eventPayload);
                            }
                        } else {
                            // Relay other message types (like ai_log)
                            if (this.onMessage) this.onMessage(data);
                        }
                    } catch (e) {
                        console.error("Local backend parse error:", e);
                    }
                };

                this.ws.onclose = () => {
                    if (this.sessionStopped) this.sessionStopped(this, {});
                };

                // 2. Setup Audio Processing
                // use the stream from the passed audioConfig (we need to patch logic to pass it)
                const mediaStream = this.privStream;
                if (!mediaStream) {
                    // This is a "Hub Only" connection (e.g. Viewer or Listener pre-init)
                    // We don't start audio processing, but we keep the WS open for messages.
                    return;
                }
                this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
                this.inputStream = this.audioContext.createMediaStreamSource(mediaStream);

                // 4096 buffer size ~0.25s latency @ 16kHz
                this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

                this.processor.onaudioprocess = (e) => {
                    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcmData = this.floatTo16BitPCM(inputData);
                    this.ws.send(pcmData);
                };

                this.inputStream.connect(this.processor);
                this.processor.connect(this.audioContext.destination);

            } catch (err) {
                this._triggerCanceled(err.message, "SetupError");
                reject(err);
            }
        });
    }

    /**
     * Stops processing.
     * Signature matches: stopContinuousRecognitionAsync()
     */
    async stopContinuousRecognitionAsync() {
        this._cleanup();
        if (this.sessionStopped) this.sessionStopped(this, {});
        return Promise.resolve();
    }

    // Internal Helper: Cleanup resources
    _cleanup() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        if (this.inputStream) {
            this.inputStream.disconnect();
            this.inputStream = null;
        }
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    // Internal Helper: Trigger canceled callback
    _triggerCanceled(details, code) {
        if (this.canceled) {
            this.canceled(this, {
                reason: LocalTranscriptionService.CancellationReason.Error,
                errorDetails: details,
                errorCode: code
            });
        }
    }

    // Internal Helper: Convert Float32 audio to Int16 PCM for backend
    floatTo16BitPCM(output, offset = 0) {
        const buffer = new ArrayBuffer(output.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < output.length; i++, offset += 2) {
            let s = Math.max(-1, Math.min(1, output[i]));
            s = s < 0 ? s * 0x8000 : s * 0x7FFF;
            view.setInt16(offset, s, true);
        }
        return buffer;
    }
}
