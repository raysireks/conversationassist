import { createSlice } from '@reduxjs/toolkit';

const transcriptionSlice = createSlice({
  name: 'transcription',
  initialState: '',
  reducers: {
    setTranscription: (state, action) => action.payload,
    clearTranscription: () => ''
  },
});

export const { setTranscription, clearTranscription } = transcriptionSlice.actions;
export default transcriptionSlice.reducer;
