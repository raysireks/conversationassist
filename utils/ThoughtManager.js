import { EventEmitter } from 'events';

class ThoughtManager extends EventEmitter {
    constructor() {
        super();
        this.accumulatedBuffer = ''; // Holds the "Ongoing Thought"
        this.thoughtState = 'IDLE';
        this.contextBuzzwords = [];
        this.keywords = [
            'database', 'server', 'api', 'react', 'ai', 'google', 'sql', 'python',
            'aws', 'azure', 'docker', 'kubernetes', 'cloud', 'security', 'encryption',
            'frontend', 'backend', 'fullstack', 'mobile', 'ios', 'android', 'javascript',
            'typescript', 'node', 'java', 'c#', 'golang', 'rust', 'testing', 'deployment',
            'ci/cd', 'agile', 'scrum', 'architecture', 'microservices', 'graphql', 'rest',
            'authentication', 'authorization', 'oauth', 'jwt', 'performance', 'scaling'
        ];
    }

    /**
     * Handles a structured segmentation event from the backend.
     * @param {object} segmentData - { action: "UPDATE"|"FINAL", text: "...", segment_type: "...", similarity_score: ... }
     */
    handleBackendEvent(segmentData) {
        if (!segmentData) return;

        const { action, text, segment_type } = segmentData;

        if (action === 'FINAL') {
            // Backend says: "This thought is DONE."
            this.classifyAndFinalize(text, segment_type);
            this.checkForContextKeywords(text); // Restore Context Logic
            this.accumulatedBuffer = ''; // Reset local buffer
        } else if (action === 'UPDATE') {
            // Backend says: "This is the current ongoing thought."
            this.accumulatedBuffer = text;

            this.emit('thoughtUpdate', {
                text: this.accumulatedBuffer,
                state: 'forming'
            });
        }
    }

    // Note: The original processInput is now largely redundant for logic, 
    // but might still be used for real-time "Interim" visualization if needed.
    // For now, we will rely on handleBackendEvent for the main logic.

    checkForContextKeywords(text) {
        const lowerText = text.toLowerCase();
        const found = this.keywords.filter(k => lowerText.includes(k) && !this.contextBuzzwords.includes(k));

        if (found.length > 0) {
            this.contextBuzzwords = [...this.contextBuzzwords, ...found];
            this.emit('contextUpdate', {
                keywords: this.contextBuzzwords,
                latest: found
            });
        }
    }

    classifyAndFinalize(text, typeOverride) {
        let type = typeOverride || 'STATEMENT';
        let summary = 'Point Recorded';

        const lower = text.toLowerCase().trim();

        if (type === 'QUESTION' || lower.endsWith('?') || lower.startsWith('what') || lower.startsWith('how')) {
            type = 'QUESTION';
            summary = 'Question';
        } else if (lower.includes('conclusion') || lower.includes('therefore')) {
            type = 'CONCLUSION';
            summary = 'Conclusion';
        }

        this.emit('finalThought', {
            text: text,
            type: type,
            summary: summary
        });
    }
}

export const thoughtManager = new ThoughtManager();
