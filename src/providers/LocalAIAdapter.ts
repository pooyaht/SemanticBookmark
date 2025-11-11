import { BaseProviderAdapter } from './BaseProviderAdapter';

import type {
  ProviderTestResult,
  EmbeddingGenerationResult,
} from '@/types/provider';

export class LocalAIAdapter extends BaseProviderAdapter {
  type = 'localai' as const;

  async generateEmbedding(
    text: string,
    endpoint: string,
    model: string,
    prefix?: string,
    suffix?: string
  ): Promise<EmbeddingGenerationResult> {
    try {
      const processedText = this.applyTokens(text, prefix, suffix);
      const url = `${endpoint}/v1/embeddings`;
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: processedText,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        data?: Array<{ embedding?: number[] }>;
      };

      if (!data.data?.[0]?.embedding) {
        throw new Error('Invalid response format from provider');
      }

      const embedding = data.data[0].embedding;

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
    model: string,
    prefix?: string,
    suffix?: string
  ): Promise<ProviderTestResult> {
    try {
      const result = await this.generateEmbedding(
        'test connection',
        endpoint,
        model,
        prefix,
        suffix
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
