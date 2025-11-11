import type {
  EmbeddingProvider,
  ProviderType,
  ProviderTestResult,
} from '@/types/provider';

import { ProviderFactory } from '@/providers/ProviderFactory';
import { db } from '@/storage/database';

export class EmbeddingProviderService {
  private static instance: EmbeddingProviderService;

  private constructor() {}

  static getInstance(): EmbeddingProviderService {
    if (!EmbeddingProviderService.instance) {
      EmbeddingProviderService.instance = new EmbeddingProviderService();
    }
    return EmbeddingProviderService.instance;
  }

  async getAllProviders(): Promise<EmbeddingProvider[]> {
    return await db.embeddingProviders.toArray();
  }

  async getProvider(id: string): Promise<EmbeddingProvider | undefined> {
    return await db.embeddingProviders.get(id);
  }

  async getActiveProvider(): Promise<EmbeddingProvider | undefined> {
    const providers = await db.embeddingProviders.toArray();
    return providers.find((p) => p.isActive);
  }

  async createProvider(
    provider: Omit<EmbeddingProvider, 'createdAt' | 'isActive' | 'isConnected'>
  ): Promise<EmbeddingProvider> {
    const existing = await db.embeddingProviders.get(provider.id);
    if (existing) {
      throw new Error(`Provider with ID "${provider.id}" already exists`);
    }

    const hasActiveProvider = await this.getActiveProvider();

    const newProvider: EmbeddingProvider = {
      ...provider,
      isActive: !hasActiveProvider,
      isConnected: false,
      createdAt: new Date(),
    };

    await db.embeddingProviders.add(newProvider);
    return newProvider;
  }

  async updateProvider(
    id: string,
    updates: Partial<Omit<EmbeddingProvider, 'id' | 'createdAt'>>
  ): Promise<void> {
    const provider = await db.embeddingProviders.get(id);
    if (!provider) {
      throw new Error(`Provider with ID "${id}" not found`);
    }

    await db.embeddingProviders.update(id, updates);
  }

  async deleteProvider(id: string): Promise<void> {
    const provider = await db.embeddingProviders.get(id);
    if (!provider) {
      throw new Error(`Provider with ID "${id}" not found`);
    }

    if (provider.isActive) {
      throw new Error(
        'Cannot delete active provider. Please activate another provider first.'
      );
    }

    await db.embeddingProviders.delete(id);
  }

  async setActiveProvider(id: string): Promise<void> {
    const provider = await db.embeddingProviders.get(id);
    if (!provider) {
      throw new Error(`Provider with ID "${id}" not found`);
    }

    await db.transaction('rw', db.embeddingProviders, async () => {
      await db.embeddingProviders.toCollection().modify({ isActive: false });
      await db.embeddingProviders.update(id, {
        isActive: true,
        lastUsedAt: new Date(),
      });
    });
  }

  async testConnection(
    type: ProviderType,
    endpoint: string,
    model: string,
    prefix?: string,
    suffix?: string
  ): Promise<ProviderTestResult> {
    const adapter = ProviderFactory.getAdapter(type);
    return await adapter.testConnection(endpoint, model, prefix, suffix);
  }

  async testProviderConnection(id: string): Promise<ProviderTestResult> {
    const provider = await db.embeddingProviders.get(id);
    if (!provider) {
      throw new Error(`Provider with ID "${id}" not found`);
    }

    const result = await this.testConnection(
      provider.type,
      provider.endpoint,
      provider.modelName,
      provider.documentPrefix,
      provider.documentSuffix
    );

    await db.embeddingProviders.update(id, {
      isConnected: result.success,
      lastTestedAt: new Date(),
    });

    return result;
  }

  async getIndexedBookmarkCount(providerId: string): Promise<number> {
    return await db.embeddings.where('providerId').equals(providerId).count();
  }

  async getProviderStats(providerId: string): Promise<{
    totalBookmarks: number;
    indexedBookmarks: number;
  }> {
    const totalBookmarks = await db.bookmarks.count();
    const indexedBookmarks = await this.getIndexedBookmarkCount(providerId);

    return {
      totalBookmarks,
      indexedBookmarks,
    };
  }
}
