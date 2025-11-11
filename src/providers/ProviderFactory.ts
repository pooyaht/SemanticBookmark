import { LlamaCppAdapter } from './LlamaCppAdapter';
import { LocalAIAdapter } from './LocalAIAdapter';
import { OllamaAdapter } from './OllamaAdapter';

import type { BaseProviderAdapter } from './BaseProviderAdapter';
import type { ProviderType } from '@/types/provider';

export class ProviderFactory {
  private static adapters: Map<ProviderType, BaseProviderAdapter> = new Map<
    ProviderType,
    BaseProviderAdapter
  >([
    ['localai', new LocalAIAdapter()],
    ['llamacpp', new LlamaCppAdapter()],
    ['ollama', new OllamaAdapter()],
  ]);

  static getAdapter(type: ProviderType): BaseProviderAdapter {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      throw new Error(`Unknown provider type: ${type}`);
    }
    return adapter;
  }

  static getSupportedTypes(): ProviderType[] {
    return Array.from(this.adapters.keys());
  }
}
