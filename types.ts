import { User } from 'firebase/auth';
export type { User };


export interface UserProfile {
  fullName: string;
  email: string;
  createdAt: Date;
}

export interface Persona {
  name: string;
  description: string;
}

export interface TrendingTopic {
  name: string;
  reason: string;
}

export interface TopSellingProduct {
  brandName: string;
  productName: string;
  description: string;
  problemSolved: string;
  successfulAdCreative: string;
  idealCustomer: string;
  idealInfluencer: string;
  imagePrompt: string;
  imageUrl?: string;
  url?: string;
  isGeneratingImage?: boolean;
  imageError?: string;
}

export interface ViralHook {
  type: string;
  description: string;
}

export interface Source {
    uri: string;
    title: string;
}

export interface AnalysisResult {
  trends: string[];
  characteristics: string[];
  personas: Persona[];
  trendingTopics: TrendingTopic[];
  topSellingProducts: TopSellingProduct[];
  viralHooks: ViralHook[];
  topKeywords: string[];
  sources: Source[];
}

export interface Scene {
  visual: string;
  script: string;
  scriptType: 'voiceover' | 'dialogue';
  imageUrl?: string;
  isGeneratingImage?: boolean;
  interactionPrompt?: string;
  videoUrl?: string;
  videoStatus?: 'idle' | 'queued' | 'processing' | 'done' | 'error';
  videoGenerationMessage?: string;
  voiceoverAudioUrl?: string;
  isGeneratingVoiceover?: boolean;
}

export interface Hook {
  verbal: string;
  visual: string;
  textOverlay: string;
}

export interface PlatformVariation {
    platformName: string;
    callToAction: string;
    suggestedSound: string;
    notes?: string;
}

export interface ScriptResult {
  hook: Hook;
  scenes: Scene[];
  callToAction: string;
  suggestedSound: string;
  platformVariations?: PlatformVariation[];
}

export interface GeneratedInfluencer {
  description: string;
  imageUrl: string;
  imageFile: {
    data: string;
    mimeType: string;
  };
  voiceId?: string;
}

export interface ProductAnalysis {
  salesPotential: string;
  problemSolved: string;

  valueProposition: string;
  marketSaturation: string;
}

export interface GeneratedProduct {
  description: string;
  imageUrl: string;
  imageFile?: {
    data: string;
    mimeType: string;
  };
  productAnalysis?: ProductAnalysis;
}

export interface VoiceDesignParameters {
    gender: string;
    age: string;
    accent: string;
    voiceDescription: string;
    sampleText: string;
}