import type {
  ProviderType,
  ProviderTestResult,
  EmbeddingGenerationResult,
} from '@/types/provider';

export abstract class BaseProviderAdapter {
  abstract type: ProviderType;

  abstract generateEmbedding(
    text: string,
    endpoint: string,
    model: string,
    prefix?: string,
    suffix?: string
  ): Promise<EmbeddingGenerationResult>;

  abstract testConnection(
    endpoint: string,
    model: string,
    prefix?: string,
    suffix?: string
  ): Promise<ProviderTestResult>;

  protected applyTokens(
    text: string,
    prefix?: string,
    suffix?: string
  ): string {
    return `${prefix ?? ''}${text}${suffix ?? ''}`;
  }

  protected async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number = 30000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  protected handleFetchError(error: unknown): string {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return 'Request timed out';
      }
      return error.message;
    }
    return 'Unknown error occurred';
  }
}
