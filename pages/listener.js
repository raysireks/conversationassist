import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Head from 'next/head';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';

// MUI Components
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Snackbar,
  Switch,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';

// MUI Icons
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import HearingIcon from '@mui/icons-material/Hearing';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import PersonIcon from '@mui/icons-material/Person';
import PictureInPictureAltIcon from '@mui/icons-material/PictureInPictureAlt';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SpeakerNotesIcon from '@mui/icons-material/SpeakerNotes';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import SwapVertIcon from '@mui/icons-material/SwapVert';

// Third-party Libraries
import { GoogleGenerativeAI } from '@google/generative-ai';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import throttle from 'lodash.throttle';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import OpenAI from 'openai';
import ReactMarkdown from 'react-markdown';
import ScrollToBottom from 'react-scroll-to-bottom';

// Local Imports
import SettingsDialog from '../components/SettingsDialog';
import StealthUI from '../components/StealthUI';
import { setAIResponse } from '../redux/aiResponseSlice';
import { addToHistory } from '../redux/historySlice';
import { clearTranscription, setTranscription } from '../redux/transcriptionSlice';
import { getConfig, setConfig as saveConfig } from '../utils/config';
import { LocalTranscriptionService } from '../utils/transcription/LocalTranscriptionService';
// Dashboard components removed




function debounce(func, timeout = 100) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, timeout);
  };
}


export default function InterviewPage() {
  const router = useRouter();
  const role = 'listener';
  const isStealth = true;

  const dispatch = useDispatch();
  const transcriptionFromStore = useSelector(state => state.transcription);
  const aiResponseFromStore = useSelector(state => state.aiResponse);
  const history = useSelector(state => state.history);
  const theme = useTheme();

  const [appConfig, setAppConfig] = useState(getConfig());
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const [systemRecognizer, setSystemRecognizer] = useState(null);
  const [micRecognizer, setMicRecognizer] = useState(null);
  const [systemAutoMode, setSystemAutoMode] = useState(appConfig.systemAutoMode !== undefined ? appConfig.systemAutoMode : true);
  const [openAI, setOpenAI] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isMicrophoneActive, setIsMicrophoneActive] = useState(false);
  const [isSystemAudioActive, setIsSystemAudioActive] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [isStealthModeActive, setIsStealthModeActive] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [isManualMode, setIsManualMode] = useState(appConfig.isManualMode !== undefined ? appConfig.isManualMode : false);
  const [micTranscription, setMicTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAILoading, setIsAILoading] = useState(true);

  // Dashboard state removed

  const pipWindowRef = useRef(null);
  const documentPipWindowRef = useRef(null);
  const documentPipIframeRef = useRef(null);
  const systemInterimTranscription = useRef('');
  const micInterimTranscription = useRef('');
  const hubServiceRef = useRef(null);
  // const silenceTimer = useRef(null); // Removed in favor of ThoughtManager
  const finalTranscript = useRef({ system: '', microphone: '' });



  const isManualModeRef = useRef(isManualMode);
  const systemAutoModeRef = useRef(systemAutoMode);
  const throttledDispatchSetAIResponseRef = useRef(null);

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const handleSettingsSaved = () => {
    const newConfig = getConfig();
    setAppConfig(newConfig);
    setSystemAutoMode(newConfig.systemAutoMode !== undefined ? newConfig.systemAutoMode : true);
    setIsManualMode(newConfig.isManualMode !== undefined ? newConfig.isManualMode : false);

    // Sync model change to backend if using local hub
    if (newConfig.useLocalBackend && hubServiceRef.current && hubServiceRef.current.ws && hubServiceRef.current.ws.readyState === WebSocket.OPEN) {
      hubServiceRef.current.ws.send(JSON.stringify({
        type: 'change_model',
        model: newConfig.aiModel
      }));
    }
  };

  const [aiEnabled, setAiEnabled] = useState(true);

  const handleToggleAI = (enabled) => {
    if (hubServiceRef.current && hubServiceRef.current.ws && hubServiceRef.current.ws.readyState === WebSocket.OPEN) {
      hubServiceRef.current.ws.send(JSON.stringify({
        type: 'toggle_ai',
        enabled: enabled
      }));
    }
    setAiEnabled(enabled);
  };

  const handleForceFinalize = useCallback(() => {
    if (hubServiceRef.current && hubServiceRef.current.ws && hubServiceRef.current.ws.readyState === WebSocket.OPEN) {
      console.log("Triggering manual thought segmentation...");
      hubServiceRef.current.ws.send(JSON.stringify({ type: 'force_segment' }));
    }
  }, []);

  useEffect(() => {
    const currentConfig = appConfig;
    const initializeAI = () => {
      try {
        if (currentConfig.aiModel.startsWith('gemini')) {
          if (!currentConfig.geminiKey) {
            showSnackbar('Gemini API key required. Please set it in Settings.', 'error');
            setOpenAI(null);
            return;
          }
          const genAI = new GoogleGenerativeAI(currentConfig.geminiKey);
          setOpenAI(genAI);
        } else {
          if (!currentConfig.openaiKey) {
            showSnackbar('OpenAI API key required. Please set it in Settings.', 'error');
            setOpenAI(null);
            return;
          }
          const openaiClient = new OpenAI({
            apiKey: currentConfig.openaiKey,
            dangerouslyAllowBrowser: true
          });
          setOpenAI(openaiClient);
        }
      } catch (error) {
        console.error('Error initializing AI client:', error);
        showSnackbar('Error initializing AI client: ' + error.message, 'error');
        setOpenAI(null);
      } finally {
        setIsAILoading(false);
      }
    };
    if (isAILoading) initializeAI();
  }, [appConfig, isAILoading, showSnackbar]);

  useEffect(() => { isManualModeRef.current = isManualMode; }, [isManualMode]);
  useEffect(() => { systemAutoModeRef.current = systemAutoMode; }, [systemAutoMode]);

  // ThoughtManager listeners removed for Listener role

  useEffect(() => {
    throttledDispatchSetAIResponseRef.current = throttle((payload) => {
      dispatch(setAIResponse(payload));
    }, 250, { leading: true, trailing: true });

    return () => {
      if (throttledDispatchSetAIResponseRef.current && typeof throttledDispatchSetAIResponseRef.current.cancel === 'function') {
        throttledDispatchSetAIResponseRef.current.cancel();
      }
    };
  }, [dispatch]);

  useEffect(() => {
    if (isStealth && !isStealthModeActive) {
      console.log('Stealth Mode UI active.');
      setIsStealthModeActive(true);
    }
  }, [isStealth, isStealthModeActive]);

  // --- SESSION HUB CONNECTION (for all roles) ---
  useEffect(() => {
    const currentRole = role || 'candidate';
    const currentConfig = getConfig();

    // Only connect if using local backend or explicitly specified
    if (!currentConfig.useLocalBackend && currentRole !== 'viewer') return;

    let hubService = null;

    const connectHub = async () => {
      try {
        console.log(`Connecting to session hub as ${currentRole}...`);
        const hubService = new LocalTranscriptionService({ privStream: null }, currentRole);
        hubServiceRef.current = hubService;

        hubService.onThoughtSegment = (data) => {
          // Pass backend thoughts directly to manager
          thoughtManager.handleBackendEvent(data);
        };

        hubService.onHistory = (historyData) => {
          console.log("Received comprehensive session history:", historyData);
          if (historyData && historyData.length > 0) {
            historyData.forEach(item => {
              if (item.type === "transcription") {
                const fullText = item.segments.map(s => s.text).join(' ').trim();
                if (fullText) {
                  dispatch(setTranscription(fullText));
                  finalTranscript.current.system = fullText;
                }
              } else if (item.type === "ai_log") {
                const historyItem = {
                  type: item.role === 'user' ? 'question' : 'response',
                  text: item.text,
                  timestamp: item.timestamp || new Date().toLocaleTimeString(),
                  status: 'completed'
                };
                dispatch(addToHistory(historyItem));
              }
            });
          }
          // Also set AI enabled state if provided in session state
          if (hubService.lastState && hubService.lastState.ai_enabled !== undefined) {
            setAiEnabled(hubService.lastState.ai_enabled);
          }
        };

        hubService.onMessage = (data) => {
          if (data.type === "ai_log" && currentRole === 'viewer') {
            const historyItem = {
              type: data.role === 'user' ? 'question' : 'response',
              text: data.text,
              timestamp: data.timestamp || new Date().toLocaleTimeString(),
              status: 'completed'
            };
            dispatch(addToHistory(historyItem));
          } else if (data.type === "ai_state") {
            setAiEnabled(data.enabled);
          }
        };

        hubService.recognizing = (s, e) => {
          if (e.result.text) {
            systemInterimTranscription.current = e.result.text;
            dispatch(setTranscription(finalTranscript.current.system + e.result.text));
          }
        };

        hubService.recognized = (s, e) => {
          if (e.result.text) {
            systemInterimTranscription.current = '';
            handleTranscriptionEvent(e.result.text, 'system');
          }
        };

        await hubService.startContinuousRecognitionAsync().catch(err => {
          console.warn("Hub connection failed (recordings will still work locally):", err);
        });
      } catch (err) {
        console.error("Session hub error:", err);
      }
    };

    connectHub();

    return () => {
      if (hubService) hubService.stopContinuousRecognitionAsync();
    };
  }, [role, dispatch]);

  const handleSnackbarClose = () => setSnackbarOpen(false);

  const stopRecording = async (source) => {
    const recognizer = source === 'system' ? systemRecognizer : micRecognizer;
    if (recognizer && typeof recognizer.stopContinuousRecognitionAsync === 'function') {
      try {
        await recognizer.stopContinuousRecognitionAsync();
        if (recognizer.audioConfig && recognizer.audioConfig.privSource && recognizer.audioConfig.privSource.privStream) {
          const stream = recognizer.audioConfig.privSource.privStream;
          if (stream instanceof MediaStream) {
            stream.getTracks().forEach(track => {
              track.stop();
            });
          }
        }
        if (recognizer.audioConfig && typeof recognizer.audioConfig.close === 'function') {
          recognizer.audioConfig.close();
        }
      } catch (error) {
        console.error(`Error stopping ${source} recognition:`, error);
        showSnackbar(`Error stopping ${source} audio: ${error.message}`, 'error');
      } finally {
        if (source === 'system') {
          setIsSystemAudioActive(false);
          setSystemRecognizer(null);
        } else {
          setIsMicrophoneActive(false);
          setMicRecognizer(null);
        }
      }
    }
  };

  const handleClearSystemTranscription = () => {
    finalTranscript.current.system = '';
    systemInterimTranscription.current = '';
    dispatch(clearTranscription());
  };

  const handleClearMicTranscription = () => {
    finalTranscript.current.microphone = '';
    micInterimTranscription.current = '';
    setMicTranscription('');
  };

  const handleTranscriptionEvent = (text, source) => {
    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (!cleanText) return;

    finalTranscript.current[source] += cleanText + ' ';

    if (source === 'system') {
      dispatch(setTranscription(finalTranscript.current.system + systemInterimTranscription.current));
    } else {
      setMicTranscription(finalTranscript.current.microphone + micInterimTranscription.current);
    }

    const currentConfig = getConfig();
    const currentSilenceTimerDuration = currentConfig.silenceTimerDuration;

    if ((source === 'system' && systemAutoModeRef.current) || (source === 'microphone' && !isManualModeRef.current)) {
      if (source === 'system') { // NEW: Explicit check for system source to handle interim display
        if (text) {
          // If we are getting text, we trigger re-render to update the 'displayThought'
          // which uses systemInterimTranscription.current
          setThoughtStatus(prev => prev);
        }
      }

      // If using local backend, the BACKEND handles the auto-trigger on final segments (legacy behavior)
      // But now we want to intercept for ThoughtManager logic if we are doing frontend-driven logic.
      // For now, let's assume we feed into ThoughtManager on every update.

      // Feed ThoughtManager
      // Note: 'text' here acts as a "chunk" or "segment". 
      // construct "isFinal" based on source if strictly needed, or just let ThoughtManager accumulate.
      // Since `handleTranscriptionEvent` is called when `recognized` (final segment), we say isFinal=true for this segment.

      // thoughtManager.processInput(cleanText, true); // DISABLED: Using backend Semantic Segmentation now.

      // Legacy direct OpenAI call removed.
    }
  };

  const handleManualInputChange = (value, source) => {
    if (source === 'system') {
      dispatch(setTranscription(value));
      finalTranscript.current.system = value;
    } else {
      setMicTranscription(value);
      finalTranscript.current.microphone = value;
    }
  };

  const handleManualSubmit = (source) => {
    const textToSubmit = source === 'system' ? transcriptionFromStore : micTranscription;
    if (textToSubmit.trim()) {
      askOpenAI(textToSubmit.trim(), source);
    } else {
      showSnackbar('Input is empty.', 'warning');
    }
  };

  const handleKeyPress = (e, source) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleManualSubmit(source);
    }
  };

  const handleCombineAndSubmit = () => {
    if (selectedQuestions.length === 0) {
      showSnackbar('No questions selected to combine.', 'warning');
      return;
    }
    const questionHistory = history.filter(e => e.type === 'question').slice().reverse();
    const questionTexts = selectedQuestions.map(selectedIndexInReversedArray => {
      return questionHistory[selectedIndexInReversedArray]?.text;
    }).filter(text => text);

    if (questionTexts.length === 0) {
      showSnackbar('Could not retrieve selected question texts.', 'warning');
      return;
    }

    const combinedText = questionTexts.join('\n\n---\n\n');
    askOpenAI(combinedText, 'combined');
    setSelectedQuestions([]);
  };

  const createRecognizer = async (mediaStream, source) => {
    const currentConfig = getConfig();
    const useLocalBackend = currentConfig.useLocalBackend;

    // Only check for Azure credentials if we are NOT using the local backend
    if (!useLocalBackend && (!currentConfig.azureToken || !currentConfig.azureRegion)) {
      showSnackbar('Azure Speech credentials missing. Please set them in Settings.', 'error');
      mediaStream.getTracks().forEach(track => track.stop());
      return null;
    }

    let audioConfig;
    try {
      audioConfig = SpeechSDK.AudioConfig.fromStreamInput(mediaStream);
    } catch (configError) {
      console.error(`Error creating AudioConfig for ${source}:`, configError);
      showSnackbar(`Error setting up audio for ${source}: ${configError.message}`, 'error');
      mediaStream.getTracks().forEach(track => track.stop());
      return null;
    }

    // --- SELECTION LOGIC: AZURE vs LOCAL ---
    // useLocalBackend is already defined at top of function
    let recognizer;

    if (useLocalBackend) {
      // LOCAL MODE
      // Patch the AudioConfig slightly to pass the stream to our custom class
      audioConfig.privStream = mediaStream;
      recognizer = new LocalTranscriptionService(audioConfig, role || 'listener');

      // We need to inject the Azure SDK enums onto the class instance 
      // or ensure the class has static members that match what we check below.
      // But actually, we only check e.result.reason against SpeechSDK.ResultReason enums.
      // The LocalTranscriptionService event payloads MUST use SpeechSDK.ResultReason values
      // if we want to avoid changing the check loops below.
      // Let's modify the checks below to use the SDK enums OR the LocalService enums, or just trust exact string matching.
      // Re-reading LocalTranscriptionService: it emits strings 'RecognizingSpeech', etc.
      // SpeechSDK.ResultReason.RecognizingSpeech is actually an Enum/Number in some versions or String in JS SDK?
      // In JS SDK, ResultReason.RecognizingSpeech is usually an Enum Value (3).
      // WAIT: SpeechSDK is imported here. We should use SpeechSDK enums in our LocalService to be 100% safe!

    } else {
      // AZURE MODE
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(currentConfig.azureToken, currentConfig.azureRegion);
      speechConfig.speechRecognitionLanguage = currentConfig.azureLanguage;
      recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
    }

    // --- EVENT HANDLERS (Shared) ---
    // The handlers below use SpeechSDK enums. We must ensure our LocalService emits compatible values.
    // Hack: We will override the event checker in LocalService to emit real SpeechSDK enums if we have access,
    // OR we modify the checks below to be loose.
    // Cleaner: Let's modify the check below to be robust.

    recognizer.recognizing = (s, e) => {
      // LocalService emits object with { result: { reason: ..., text: ... } }
      // Azure SDK emits object with { result: { reason: ..., text: ... } }
      // We need to unify the "reason" check.

      const isRecognizing = e.result.reason === SpeechSDK.ResultReason.RecognizingSpeech || e.result.reason === 'RecognizingSpeech';

      if (isRecognizing) {
        const interimText = e.result.text;
        if (source === 'system') {
          systemInterimTranscription.current = interimText;
          dispatch(setTranscription(finalTranscript.current.system + interimText));
        } else {
          micInterimTranscription.current = interimText;
          setMicTranscription(finalTranscript.current.microphone + interimText);
        }
      }
    };

    recognizer.recognized = (s, e) => {
      const isRecognized = e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech || e.result.reason === 'RecognizedSpeech';
      if (isRecognized && e.result.text) {
        if (source === 'system') systemInterimTranscription.current = '';
        else micInterimTranscription.current = '';
        handleTranscriptionEvent(e.result.text, source);
      } else if (e.result.reason === SpeechSDK.ResultReason.NoMatch) {
        // console.log(`NOMATCH: Speech could not be recognized for ${source}.`);
      }
    };

    recognizer.canceled = (s, e) => {
      console.log(`CANCELED: Reason=${e.reason} for ${source}`);
      if (e.reason === SpeechSDK.CancellationReason.Error) {
        console.error(`CANCELED: ErrorCode=${e.errorCode}`);
        console.error(`CANCELED: ErrorDetails=${e.errorDetails}`);
        showSnackbar(`Speech recognition error for ${source}: ${e.errorDetails}`, 'error');
      }
      stopRecording(source);
    };

    recognizer.sessionStopped = (s, e) => {
      console.log(`Session stopped event for ${source}.`);
      stopRecording(source);
    };

    try {
      await recognizer.startContinuousRecognitionAsync();
      return recognizer;
    } catch (error) {
      console.error(`Error starting ${source} continuous recognition:`, error);
      showSnackbar(`Failed to start ${source} recognition: ${error.message}`, 'error');
      if (audioConfig && typeof audioConfig.close === 'function') audioConfig.close();
      mediaStream.getTracks().forEach(track => track.stop());
      return null;
    }
  };

  const startSystemAudioRecognition = async () => {
    if (isSystemAudioActive) {
      await stopRecording('system');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      showSnackbar('Screen sharing is not supported by your browser.', 'error');
      setIsSystemAudioActive(false);
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: {
          displaySurface: 'browser',
          logicalSurface: true
        }
      });

      const audioTracks = mediaStream.getAudioTracks();
      if (audioTracks.length === 0) {
        showSnackbar('No audio track detected. Please ensure you share a tab with audio.', 'warning');
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }

      if (systemRecognizer) {
        await stopRecording('system');
      }

      const recognizerInstance = await createRecognizer(mediaStream, 'system');
      if (recognizerInstance) {
        setSystemRecognizer(recognizerInstance);
        setIsSystemAudioActive(true);
        showSnackbar('System audio recording started.', 'success');
        mediaStream.getTracks().forEach(track => {
          track.onended = () => {
            showSnackbar('Tab sharing ended.', 'info');
            stopRecording('system');
          };
        });
      } else {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    } catch (error) {
      console.error('System audio capture error:', error);
      if (error.name === "NotAllowedError") {
        showSnackbar('Permission denied for screen recording. Please allow access.', 'error');
      } else if (error.name === "NotFoundError") {
        showSnackbar('No suitable tab/window found to share.', 'error');
      } else if (error.name === "NotSupportedError") {
        showSnackbar('System audio capture not supported by your browser.', 'error');
      } else {
        showSnackbar(`Failed to start system audio capture: ${error.message || 'Unknown error'}`, 'error');
      }
      setIsSystemAudioActive(false);
    }
  };

  const startMicrophoneRecognition = async () => {
    if (isMicrophoneActive) {
      await stopRecording('microphone');
      return;
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (micRecognizer) await stopRecording('microphone');

      const recognizerInstance = await createRecognizer(mediaStream, 'microphone');
      if (recognizerInstance) {
        setMicRecognizer(recognizerInstance);
        setIsMicrophoneActive(true);
        showSnackbar('Microphone recording started.', 'success');
      } else {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    } catch (error) {
      console.error('Microphone capture error:', error);
      if (error.name === "NotAllowedError" || error.name === "NotFoundError") {
        showSnackbar('Permission denied for microphone. Please allow access.', 'error');
      } else {
        showSnackbar(`Failed to access microphone: ${error.message || 'Unknown error'}`, 'error');
      }
      setIsMicrophoneActive(false);
    }
  };

  const askOpenAI = async (text, source) => {
    if (!text.trim()) {
      showSnackbar('No input text to process.', 'warning');
      return;
    }
    if (!openAI || isAILoading) {
      showSnackbar('AI client is not ready. Please wait or check settings.', 'warning');
      return;
    }

    const currentConfig = getConfig();
    const lengthSettings = {
      concise: { temperature: 0.4, maxTokens: 250 },
      medium: { temperature: 0.6, maxTokens: 500 },
      lengthy: { temperature: 0.8, maxTokens: 1000 }
    };
    const { temperature, maxTokens } = lengthSettings[currentConfig.responseLength || 'medium'];

    setIsProcessing(true);
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let streamedResponse = '';

    dispatch(addToHistory({ type: 'question', text, timestamp, source, status: 'pending' }));
    dispatch(setAIResponse(''));

    // RELAY question to session hub
    if (hubServiceRef.current && hubServiceRef.current.ws && hubServiceRef.current.ws.readyState === WebSocket.OPEN) {
      hubServiceRef.current.ws.send(JSON.stringify({
        type: 'ai_log',
        text: text,
        role: 'user',
        timestamp: timestamp
      }));
    }

    try {
      const conversationHistoryForAPI = history
        .filter(e => e.text && (e.type === 'question' || e.type === 'response') && e.status !== 'pending')
        .slice(-6)
        .map(event => ({
          role: event.type === 'question' ? 'user' : 'assistant',
          content: event.text,
        }));

      if (currentConfig.aiModel.startsWith('gemini')) {
        const model = openAI.getGenerativeModel({
          model: currentConfig.aiModel,
          generationConfig: { temperature, maxOutputTokens: maxTokens },
          systemInstruction: { parts: [{ text: currentConfig.gptSystemPrompt }] }
        });
        let mappedHistory = conversationHistoryForAPI.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }));

        // Gemini API requires the first message in history (if present) to be from 'user'.
        if (mappedHistory.length > 0 && mappedHistory[0].role === 'model') {
          mappedHistory.shift();
        }

        const chat = model.startChat({
          history: mappedHistory,
        });
        const result = await chat.sendMessageStream(text);
        for await (const chunk of result.stream) {
          if (chunk && typeof chunk.text === 'function') {
            const chunkText = chunk.text();
            streamedResponse += chunkText;
            if (throttledDispatchSetAIResponseRef.current) {
              throttledDispatchSetAIResponseRef.current(streamedResponse);
            }
          }
        }
      } else {
        const messages = [
          { role: 'system', content: currentConfig.gptSystemPrompt },
          ...conversationHistoryForAPI,
          { role: 'user', content: text }
        ];
        const stream = await openAI.chat.completions.create({
          model: currentConfig.aiModel,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        });
        for await (const chunk of stream) {
          const chunkText = chunk.choices[0]?.delta?.content || '';
          streamedResponse += chunkText;
          if (throttledDispatchSetAIResponseRef.current) {
            throttledDispatchSetAIResponseRef.current(streamedResponse);
          }
        }
      }
      if (throttledDispatchSetAIResponseRef.current && typeof throttledDispatchSetAIResponseRef.current.cancel === 'function') {
        throttledDispatchSetAIResponseRef.current.cancel();
      }
      dispatch(setAIResponse(streamedResponse));

      const finalTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      dispatch(addToHistory({ type: 'response', text: streamedResponse, timestamp: finalTimestamp, status: 'completed' }));

      // RELAY to session hub so viewers see it
      if (hubServiceRef.current && hubServiceRef.current.ws && hubServiceRef.current.ws.readyState === WebSocket.OPEN) {
        hubServiceRef.current.ws.send(JSON.stringify({
          type: 'ai_log',
          text: streamedResponse,
          role: 'assistant',
          timestamp: finalTimestamp
        }));
      }

    } catch (error) {
      console.error("AI request error:", error);
      const errorMessage = `AI request failed: ${error.message || 'Unknown error'}`;
      showSnackbar(errorMessage, 'error');
      dispatch(setAIResponse(`Error: ${errorMessage}`));
      dispatch(addToHistory({ type: 'response', text: `Error: ${errorMessage}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), status: 'error' }));
    } finally {
      if ((source === 'system' && systemAutoModeRef.current) || (source === 'microphone' && !isManualModeRef.current)) {
        finalTranscript.current[source] = '';
        if (source === 'system') {
          systemInterimTranscription.current = '';
          dispatch(setTranscription(''));
        } else {
          micInterimTranscription.current = '';
          setMicTranscription('');
        }
      }
      setIsProcessing(false);
    }
  };

  const formatAndDisplayResponse = useCallback((response) => {
    if (!response) return null;
    return (
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <Box sx={{
                my: 1,
                position: 'relative',
                '& pre': {
                  borderRadius: '4px',
                  padding: '12px !important',
                  fontSize: '0.875rem',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }
              }}>
                <pre><code className={className} {...props} dangerouslySetInnerHTML={{ __html: hljs.highlight(String(children).replace(/\n$/, ''), { language: match[1], ignoreIllegals: true }).value }} /></pre>
              </Box>
            ) : (
              <code
                className={className}
                {...props}
                style={{
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  wordBreak: 'break-all'
                }}
              >
                {children}
              </code>
            );
          },
          p: ({ node, ...props }) => <Typography paragraph {...props} sx={{ mb: 1, fontSize: '0.95rem', wordBreak: 'break-word' }} />,
          strong: ({ node, ...props }) => <Typography component="strong" fontWeight="bold" {...props} />,
          em: ({ node, ...props }) => <Typography component="em" fontStyle="italic" {...props} />,
          ul: ({ node, ...props }) => <Typography component="ul" sx={{ pl: 2.5, mb: 1, fontSize: '0.95rem', wordBreak: 'break-word' }} {...props} />,
          ol: ({ node, ...props }) => <Typography component="ol" sx={{ pl: 2.5, mb: 1, fontSize: '0.95rem', wordBreak: 'break-word' }} {...props} />,
          li: ({ node, ...props }) => <Typography component="li" sx={{ mb: 0.25, fontSize: '0.95rem', wordBreak: 'break-word' }} {...props} />,
        }}
      >
        {response}
      </ReactMarkdown>
    );
  }, []);

  const renderHistoryItem = (item, index) => {
    if (item.type !== 'response') return null;
    const Icon = SmartToyIcon;
    const title = 'AI Assistant';
    const avatarBgColor = theme.palette.secondary.light;

    return (
      <ListItem key={`response-${index}`} sx={{ alignItems: 'flex-start', px: 0, py: 1.5 }}>
        <Avatar sx={{ bgcolor: avatarBgColor, mr: 2, mt: 0.5 }}>
          <Icon sx={{ color: theme.palette.getContrastText(avatarBgColor) }} />
        </Avatar>
        <Paper variant="outlined" sx={{ p: 1.5, flexGrow: 1, bgcolor: theme.palette.background.default, borderColor: theme.palette.divider, overflowX: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="subtitle2" fontWeight="bold">{title}</Typography>
            <Typography variant="caption" color="text.secondary">{item.timestamp}</Typography>
          </Box>
          {formatAndDisplayResponse(item.text)}
        </Paper>
      </ListItem>
    );
  };

  const renderQuestionHistoryItem = (item, index) => {
    const Icon = item.source === 'system' ? HearingIcon : PersonIcon;
    const title = item.source === 'system' ? 'Interviewer' : 'Candidate';
    const avatarBgColor = item.source === 'system' ? theme.palette.info.light : theme.palette.success.light;

    return (
      <ListItem
        key={`question-hist-${index}`}
        secondaryAction={
          <Checkbox
            edge="end"
            checked={selectedQuestions.includes(index)}
            onChange={() => {
              setSelectedQuestions(prev =>
                prev.includes(index) ? prev.filter(x => x !== index) : [...prev, index]
              );
            }}
            color="secondary"
            size="small"
          />
        }
        disablePadding
        sx={{ py: 0.5, display: 'flex', alignItems: 'center' }}
      >
        <Avatar sx={{ bgcolor: avatarBgColor, mr: 1.5, width: 32, height: 32, fontSize: '1rem' }}>
          <Icon fontSize="small" />
        </Avatar>
        <ListItemText
          primary={
            <Typography variant="body2" noWrap sx={{ fontWeight: selectedQuestions.includes(index) ? 'bold' : 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.text}
            </Typography>
          }
          secondary={`${title} - ${item.timestamp}`}
        />
      </ListItem>
    );
  };

  const handleSortOrderToggle = () => {
    setAiResponseSortOrder(prev => prev === 'newestAtBottom' ? 'newestAtTop' : 'newestAtBottom');
  };

  const getAiResponsesToDisplay = () => {
    let responses = history.filter(item => item.type === 'response').slice();
    const currentStreamingText = aiResponseFromStore;

    if (isProcessing && currentStreamingText && currentStreamingText.trim() !== '') {
      responses.push({ text: currentStreamingText, timestamp: 'Streaming...', type: 'current_streaming' });
    }

    if (aiResponseSortOrder === 'newestAtTop') {
      return responses.reverse();
    }
    return responses;
  };

  const togglePipWindow = async () => {
    if (isPipWindowActive) {
      if (documentPipWindowRef.current && typeof documentPipWindowRef.current.close === 'function') {
        try {
          await documentPipWindowRef.current.close();
        } catch (e) { console.error("Error closing document PiP window:", e); }
      } else if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close();
      }
      return; // State update will be handled by pagehide/interval listeners
    }

    const addResizeListener = (pipWindow) => {
      const handlePipResize = debounce(() => {
        if (!pipWindow || (pipWindow.closed)) return;
        const target = documentPipIframeRef.current ? documentPipIframeRef.current.contentWindow : pipWindow;
        if (target) {
          target.postMessage({
            type: 'PIP_RESIZE',
            payload: {
              width: pipWindow.innerWidth,
              height: pipWindow.innerHeight
            }
          }, '*');
        }
      }, 50);

      pipWindow.addEventListener('resize', handlePipResize);
      return () => pipWindow.removeEventListener('resize', handlePipResize); // Return a cleanup function
    };

    if (window.documentPictureInPicture && typeof window.documentPictureInPicture.requestWindow === 'function') {
      try {
        const pipOptions = { width: 400, height: 300 };
        const requestedPipWindow = await window.documentPictureInPicture.requestWindow(pipOptions);
        documentPipWindowRef.current = requestedPipWindow;
        setIsPipWindowActive(true);

        const iframe = documentPipWindowRef.current.document.createElement('iframe');
        iframe.src = '/pip-log';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        documentPipWindowRef.current.document.body.style.margin = '0';
        documentPipWindowRef.current.document.body.style.overflow = 'hidden';
        documentPipWindowRef.current.document.body.append(iframe);
        documentPipIframeRef.current = iframe;

        const removeResizeListener = addResizeListener(documentPipWindowRef.current);

        iframe.onload = () => {
          if (documentPipIframeRef.current && documentPipIframeRef.current.contentWindow) {
            documentPipIframeRef.current.contentWindow.postMessage({
              type: 'AI_LOG_DATA',
              payload: {
                historicalResponses: history.filter(item => item.type === 'response'),
                currentStreamingText: isProcessing ? aiResponseFromStore : '',
                isProcessing: isProcessing,
                sortOrder: aiResponseSortOrder
              }
            }, '*');
          }
        };

        documentPipWindowRef.current.addEventListener('pagehide', () => {
          removeResizeListener();
          setIsPipWindowActive(false);
          documentPipWindowRef.current = null;
          documentPipIframeRef.current = null;
        });

        showSnackbar('Native PiP window opened.', 'success');
        return;

      } catch (err) {
        console.error('Document Picture-in-Picture API error:', err);
        showSnackbar(`Native PiP not available or failed. Trying popup. (${err.message})`, 'warning');
      }
    }

    pipWindowRef.current = window.open('/pip-log', 'AIResponsePiP', 'width=400,height=550,resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no,noopener,noreferrer,popup=yes');

    if (pipWindowRef.current) {
      setIsPipWindowActive(true);
      const removeResizeListener = addResizeListener(pipWindowRef.current);

      pipWindowRef.current.onload = () => {
        if (pipWindowRef.current && !pipWindowRef.current.closed) {
          pipWindowRef.current.postMessage({
            type: 'AI_LOG_DATA',
            payload: {
              historicalResponses: history.filter(item => item.type === 'response'),
              currentStreamingText: isProcessing ? aiResponseFromStore : '',
              isProcessing: isProcessing,
              sortOrder: aiResponseSortOrder
            }
          }, '*');
        }
      };
      const pipCheckInterval = setInterval(() => {
        if (pipWindowRef.current && pipWindowRef.current.closed) {
          clearInterval(pipCheckInterval);
          removeResizeListener();
          setIsPipWindowActive(false);
          pipWindowRef.current = null;
        }
      }, 500);
      if (pipWindowRef.current) pipWindowRef.current._pipIntervalId = pipCheckInterval;
    } else {
      showSnackbar('Failed to open PiP window. Please check popup blocker settings.', 'error');
      setIsPipWindowActive(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pipWindowRef.current && pipWindowRef.current._pipIntervalId) {
        clearInterval(pipWindowRef.current._pipIntervalId);
      }
      if (documentPipWindowRef.current && typeof documentPipWindowRef.current.close === 'function') {
        try { documentPipWindowRef.current.close(); } catch (e) { /*ignore*/ }
      }
    };
  }, []);



  if (!hasMounted) return null;

  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Head>
        <title>Listener (Audio Capture)</title>
      </Head>
      <StealthUI
        onStartMic={startMicrophoneRecognition}
        onStartSystemAudio={startSystemAudioRecognition}
        isMicActive={isMicrophoneActive}
        isSystemActive={isSystemAudioActive}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSettingsSaved}
      />
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%', boxShadow: theme.shadows[6] }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}