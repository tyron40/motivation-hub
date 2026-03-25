export interface CreditCost {
  feature: string;
  cost: number;
  description: string;
  icon: string;
  examples?: string[];
}

export const CREDIT_COSTS: CreditCost[] = [
  {
    feature: 'AI Chat Message',
    cost: 1,
    description: 'Each message you send to the AI coach',
    icon: 'MessageCircle',
    examples: [
      'Asking for speech advice',
      'Getting feedback on delivery',
      'Requesting practice tips',
    ],
  },
  {
    feature: 'Voice Generation (TTS)',
    cost: 1,
    description: 'Converting AI responses to speech audio',
    icon: 'Mic',
    examples: [
      'Reading AI chat responses aloud',
      'Practicing pronunciation with coach voice',
      'Listening to feedback',
    ],
  },
  {
    feature: 'Voice Analysis',
    cost: 2,
    description: 'Analyzing your voice recording for feedback',
    icon: 'Activity',
    examples: [
      'Getting feedback on your speech delivery',
      'Analyzing tone and pacing',
      'Evaluating articulation',
    ],
  },
  {
    feature: 'Speech Transcription',
    cost: 1,
    description: 'Converting your voice recording to text',
    icon: 'FileText',
    examples: [
      'Transcribing practice sessions',
      'Converting speech to text for review',
      'Creating written records of speeches',
    ],
  },
];

export const CREDIT_PACKAGES = [
  {
    credits: 10,
    title: 'Starter',
    description: 'Try out AI features',
    price: 'Free for new users',
    estimated: '~10 AI interactions',
  },
  {
    credits: 100,
    title: 'Basic',
    description: 'Regular practice sessions',
    price: '$4.99',
    estimated: '~100 AI interactions',
  },
  {
    credits: 500,
    title: 'Pro',
    description: 'Extended training',
    price: '$19.99',
    estimated: '~500 AI interactions',
    popular: true,
  },
  {
    credits: 1000,
    title: 'Expert',
    description: 'Unlimited practice',
    price: '$34.99',
    estimated: '~1000 AI interactions',
  },
];

export function calculateEstimatedUsage(credits: number): {
  chatMessages: number;
  voiceGenerations: number;
  voiceAnalysis: number;
  transcriptions: number;
} {
  return {
    chatMessages: Math.floor(credits / 1),
    voiceGenerations: Math.floor(credits / 1),
    voiceAnalysis: Math.floor(credits / 2),
    transcriptions: Math.floor(credits / 1),
  };
}

export function getFeatureDisplayName(feature: string): string {
  const mapping: Record<string, string> = {
    'chat': 'AI Chat Message',
    'tts': 'Voice Generation',
    'voice_analysis': 'Voice Analysis',
    'transcription': 'Speech Transcription',
  };
  return mapping[feature] || feature;
}
