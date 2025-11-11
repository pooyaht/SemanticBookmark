export type ProviderType = 'localai' | 'llamacpp' | 'ollama';

export interface EmbeddingProvider {
  id: string;
  name: string;
  type: ProviderType;
  endpoint: string;
  modelName: string;
  documentPrefix?: string;
  documentSuffix?: string;
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
  error?: string;
}

export interface EmbeddingGenerationResult {
  embedding: number[];
}
