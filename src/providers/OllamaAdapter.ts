import { BaseProviderAdapter } from './BaseProviderAdapter';

import type {
  ProviderTestResult,
  EmbeddingGenerationResult,
} from '@/types/provider';

export class OllamaAdapter extends BaseProviderAdapter {
  type = 'ollama' as const;

  async generateEmbedding(
    text: string,
    endpoint: string,
    model: string
  ): Promise<EmbeddingGenerationResult> {
    try {
      const url = `${endpoint}/api/embeddings`;
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        embedding?: number[];
      };

      if (!data.embedding) {
        throw new Error('Invalid response format from provider');
      }

      const embedding = data.embedding;

      return {
        embedding,
        dimensions: embedding.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to generate embedding: ${this.handleFetchError(error)}`
      );
    }
  }

  async testConnection(
    endpoint: string,
    model: string
  ): Promise<ProviderTestResult> {
    try {
      const result = await this.generateEmbedding(
        'test connection',
        endpoint,
        model
      );

      return {
        success: true,
        dimensions: result.dimensions,
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleFetchError(error),
      };
    }
  }
}
