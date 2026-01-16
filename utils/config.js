export const builtInModelGroups = [
  {
    name: "OpenAI Models",
    models: [
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
      { value: "gpt-4", label: "GPT-4" },
      { value: "gpt-4-turbo-preview", label: "GPT-4 Turbo Preview" },
      { value: "gpt-4o", label: "GPT-4o (Omni)" },
    ]
  },
  {
    name: "Gemini Models",
    models: [
      { value: "gemini-3-pro", label: "Gemini 3 Pro" },
      { value: "gemini-3-flash", label: "Gemini 3 Flash" },
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite" },
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash-Lite" },
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
      { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    ]
  }
];


const defaultConfig = {
  openaiKey: '',
  geminiKey: '',
  aiModel: 'gpt-3.5-turbo', // Default to a common one
  silenceTimerDuration: 1.2,
  responseLength: 'medium',
  gptSystemPrompt: `You are an AI interview assistant. Your role is to:
- Highlight key points in responses
- Suggest related technical concepts to explore
- Maintain professional tone`,
  azureToken: '',
  azureRegion: 'eastus',
  azureLanguage: 'en-US',
  customModels: [], // Array for user-added models { value: 'model-id', label: 'Display Name', type: 'openai' | 'gemini' }
  systemAutoMode: true,
  isManualMode: false,
  useLocalBackend: false, // Default to Azure for now
};

export function getConfig() {
  if (typeof window !== 'undefined') {
    const storedConfig = localStorage.getItem('interviewCopilotConfig');
    let parsed = storedConfig ? JSON.parse(storedConfig) : {};

    // Migrate old config format for aiModel if gptModel exists
    if (parsed.gptModel && !parsed.aiModel) {
      parsed.aiModel = parsed.gptModel;
      delete parsed.gptModel;
    }
    // Ensure customModels is an array
    if (!Array.isArray(parsed.customModels)) {
      parsed.customModels = [];
    }

    return { ...defaultConfig, ...parsed };
  }
  return defaultConfig;
}

export function setConfig(config) {
  if (typeof window !== 'undefined') {
    // Ensure customModels is an array before saving
    const configToSave = {
      ...config,
      customModels: Array.isArray(config.customModels) ? config.customModels : []
    };
    localStorage.setItem('interviewCopilotConfig', JSON.stringify(configToSave));
  }
}
