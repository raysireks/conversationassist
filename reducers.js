import { combineReducers } from 'redux';
import transcriptionReducer from './redux/transcriptionSlice';
import aiResponseReducer from './redux/aiResponseSlice';
import historyReducer from './redux/historySlice';

const rootReducer = combineReducers({
  transcription: transcriptionReducer,
  aiResponse: aiResponseReducer,
  history: historyReducer,
});

export default rootReducer;
