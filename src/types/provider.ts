export type ProviderType = 'localai' | 'llamacpp' | 'ollama';

export interface EmbeddingProvider {
  id: string;
  name: string;
  type: ProviderType;
  endpoint: string;
  modelName: string;
  dimensions: number;
  inputPrefix?: string;
  inputSuffix?: string;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
  lastTestedAt?: Date;
  isConnected: boolean;
}

export interface Embedding {
  bookmarkId: string;
  providerId: string;
  embedding: Float32Array;
  dimension: number;
  createdAt: Date;
  modelName: string;
}

export interface AIProviderSettings {
  enabled: boolean;
  type: ProviderType;
  endpoint: string;
  modelName: string;
  lastTestedAt?: Date;
  isConnected: boolean;
}

export const DEFAULT_AI_PROVIDER_SETTINGS: AIProviderSettings = {
  enabled: false,
  type: 'localai',
  endpoint: 'http://localhost:8080',
  modelName: '',
  isConnected: false,
};

export interface ProviderTestResult {
  success: boolean;
  dimensions?: number;
  error?: string;
}

export interface EmbeddingGenerationResult {
  embedding: number[];
  dimensions: number;
}
