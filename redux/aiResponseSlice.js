import { createSlice } from '@reduxjs/toolkit';

export const aiResponseSlice = createSlice({
  name: 'aiResponse',
  initialState: '',
  reducers: {
    setAIResponse: (state, action) => action.payload,
    appendAIResponse: (state, action) => state + action.payload,
  },
});

export const { setAIResponse, appendAIResponse } = aiResponseSlice.actions;
export default aiResponseSlice.reducer;