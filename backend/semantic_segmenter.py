import logging
from sentence_transformers import SentenceTransformer, util
import torch

class SemanticSegmenter:
    def __init__(self, model_name='all-MiniLM-L6-v2'):
        self.logger = logging.getLogger(__name__)
        self.logger.info(f"Loading Semantic Model: {model_name}...")
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.model = SentenceTransformer(model_name, device=self.device)
        self.logger.info(f"Model loaded on {self.device}")

        # State
        self.current_thought_buffer = ""
        self.current_thought_embedding = None
        self.similarity_threshold = 0.45  # Tunable threshold for "Same Thought"

    def process(self, text_chunk):
        """
        Ingests a new text chunk (sentence/phrase).
        Returns a decision dict:
        {
            "action": "CONTINUE" | "FINAL",
            "text": <text_content_to_display_or_finalize>,
            "segment_type": "STATEMENT" | "QUESTION" | ...
        }
        """
        text = text_chunk.strip()
        if not text:
            return None

        # 1. If buffer is empty, just start
        if not self.current_thought_buffer:
            self.current_thought_buffer = text
            self.update_embedding(text)
            return {
                "action": "UPDATE",
                "text": self.current_thought_buffer
            }

        # 2. Compute similarity with current thought
        new_embedding = self.model.encode(text, convert_to_tensor=True)
        
        # We compare New chunk vs Current Thought Context
        # (Could essentially be the whole buffer or just the last few sentences)
        similarity = util.cos_sim(self.current_thought_embedding, new_embedding).item()
        
        self.logger.info(f"Similarity: {similarity:.4f} | Chunk: '{text[:20]}...'")

        # 3. Check Heuristic Overrides (Questions usually break context)
        is_question = text.strip().endswith('?')
        
        # DECISION LOGIC
        # If similarity is LOW (< threshold) OR it's a hard question shift -> SEGMENT
        if similarity < self.similarity_threshold or (is_question and not self.current_thought_buffer.strip().endswith('?')):
            
            finalized_text = self.current_thought_buffer
            
            # Start New Thought
            self.current_thought_buffer = text
            self.update_embedding(text)
            
            return {
                "action": "FINAL",
                "text": finalized_text,
                "similarity_score": similarity,
                "segment_type": "QUESTION" if finalized_text.strip().endswith('?') else "STATEMENT"
            }
        else:
            # Continue Thought
            self.current_thought_buffer += " " + text
            # Update embedding using the WHOLE buffer to keep the "center of gravity" of the topic
            # averaging might be better, but re-encoding buffer is safer for now for short thoughts
            self.update_embedding(self.current_thought_buffer)
            
            return {
                "action": "UPDATE",
                "text": self.current_thought_buffer,
                "similarity_score": similarity
            }

    def update_embedding(self, text):
        self.current_thought_embedding = self.model.encode(text, convert_to_tensor=True)

    def manual_segment_trigger(self):
        """Called when user presses 'End Thought' button"""
        if not self.current_thought_buffer:
            return None
            
        final_text = self.current_thought_buffer
        self.current_thought_buffer = ""
        self.current_thought_embedding = None
        
        return {
            "action": "FINAL",
            "text": final_text,
            "segment_type": "FORCED_END"
        }
