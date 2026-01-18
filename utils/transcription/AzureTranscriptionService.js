
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

export class AzureTranscriptionService {
    constructor(config) {
        this.config = config;
        this.recognizer = null;
        this.onInterim = null;
        this.onFinal = null;
        this.onError = null;
        this.onStopped = null;
    }

    async start(mediaStream) {
        if (!this.config.azureToken || !this.config.azureRegion) {
            if (this.onError) this.onError(new Error("Azure Speech credentials missing"));
            return;
        }

        try {
            const audioConfig = SpeechSDK.AudioConfig.fromStreamInput(mediaStream);
            const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(this.config.azureToken, this.config.azureRegion);
            speechConfig.speechRecognitionLanguage = this.config.azureLanguage || 'en-US';

            this.recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

            this.recognizer.recognizing = (s, e) => {
                if (e.result.reason === SpeechSDK.ResultReason.RecognizingSpeech) {
                    if (this.onInterim) this.onInterim(e.result.text);
                }
            };

            this.recognizer.recognized = (s, e) => {
                if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech && e.result.text) {
                    if (this.onFinal) this.onFinal(e.result.text);
                }
            };

            this.recognizer.canceled = (s, e) => {
                if (e.reason === SpeechSDK.CancellationReason.Error) {
                    if (this.onError) this.onError(new Error(e.errorDetails));
                } else {
                    console.log("Azure canceled", e.reason);
                }
                this.stop();
            };

            this.recognizer.sessionStopped = (s, e) => {
                this.stop();
                if (this.onStopped) this.onStopped();
            };

            await this.recognizer.startContinuousRecognitionAsync();

        } catch (error) {
            if (this.onError) this.onError(error);
            this.stop();
            throw error;
        }
    }

    stop() {
        if (this.recognizer) {
            try {
                this.recognizer.stopContinuousRecognitionAsync();
                // Force cleanup of audio config
                if (this.recognizer.audioConfig) {
                    // Accessing private stream to stop tracks? 
                    // The calling code handles stream track stopping usually.
                    this.recognizer.audioConfig.close();
                }
                this.recognizer.close();
            } catch (e) {
                console.error("Error stopping Azure recognizer", e);
            }
            this.recognizer = null;
        }
    }
}
