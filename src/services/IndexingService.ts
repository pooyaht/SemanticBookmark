import { ContentPreparationService } from './ContentPreparationService';
import { EmbeddingProviderService } from './EmbeddingProviderService';
import { TagService } from './TagService';

import type { Bookmark } from '@/types/bookmark';

import { ProviderFactory } from '@/providers/ProviderFactory';
import { db } from '@/storage/database';
import { truncateToTokenLimit } from '@/utils/vectorUtils';

interface IndexingResult {
  success: boolean;
  bookmarkId: string;
  providerId: string;
  error?: string;
  tokenCount?: number;
  isTruncated?: boolean;
}

interface IndexingProgress {
  total: number;
  current: number;
  succeeded: number;
  failed: number;
}

export class IndexingService {
  private static instance: IndexingService;
  private contentPrep: ContentPreparationService;
  private providerService: EmbeddingProviderService;
  private tagService: TagService;

  private constructor() {
    this.contentPrep = ContentPreparationService.getInstance();
    this.providerService = EmbeddingProviderService.getInstance();
    this.tagService = TagService.getInstance();
  }

  static getInstance(): IndexingService {
    if (!IndexingService.instance) {
      IndexingService.instance = new IndexingService();
    }
    return IndexingService.instance;
  }

  async indexBookmark(bookmarkId: string): Promise<IndexingResult> {
    try {
      const provider = await this.providerService.getActiveProvider();
      if (!provider) {
        throw new Error('No active embedding provider configured');
      }

      const bookmark = await db.bookmarks.get(bookmarkId);
      if (!bookmark) {
        throw new Error('Bookmark not found');
      }

      const tags = await this.tagService.getBookmarkTags(bookmarkId);

      const { text } = this.contentPrep.prepareContentForEmbedding(
        bookmark,
        tags
      );

      const maxTokens = provider.maxContextTokens ?? 512;
      const {
        text: truncatedText,
        isTruncated,
        tokenCount,
      } = truncateToTokenLimit(text, maxTokens);

      const adapter = ProviderFactory.getAdapter(provider.type);
      const result = await adapter.generateEmbedding(
        truncatedText,
        provider.endpoint,
        provider.modelName,
        provider.documentPrefix,
        provider.documentSuffix
      );

      const embeddingArray = new Float32Array(result.embedding);

      await db.embeddings.put({
        bookmarkId,
        providerId: provider.id,
        embedding: embeddingArray,
        modelName: provider.modelName,
        createdAt: new Date(),
        isTruncated,
        tokenCount,
      });

      await db.embeddingProviders.update(provider.id, {
        lastUsedAt: new Date(),
      });

      return {
        success: true,
        bookmarkId,
        providerId: provider.id,
        tokenCount,
        isTruncated,
      };
    } catch (error) {
      return {
        success: false,
        bookmarkId,
        providerId: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async indexAllBookmarks(
    onProgress?: (progress: IndexingProgress) => void
  ): Promise<IndexingResult[]> {
    const bookmarks = await db.bookmarks.toArray();
    const results: IndexingResult[] = [];

    const progress: IndexingProgress = {
      total: bookmarks.length,
      current: 0,
      succeeded: 0,
      failed: 0,
    };

    for (const bookmark of bookmarks) {
      const result = await this.indexBookmark(bookmark.id);
      results.push(result);

      progress.current++;
      if (result.success) {
        progress.succeeded++;
      } else {
        progress.failed++;
      }

      if (onProgress) {
        onProgress(progress);
      }

      await this.delay(200);
    }

    return results;
  }

  async isBookmarkIndexed(
    bookmarkId: string,
    providerId?: string
  ): Promise<boolean> {
    const provider = providerId
      ? await this.providerService.getProvider(providerId)
      : await this.providerService.getActiveProvider();

    if (!provider) {
      return false;
    }

    const embedding = await db.embeddings.get([bookmarkId, provider.id]);
    return !!embedding;
  }

  async getBookmarkIndexingStatus(bookmarkId: string): Promise<{
    isIndexed: boolean;
    providers: string[];
  }> {
    const embeddings = await db.embeddings
      .where('bookmarkId')
      .equals(bookmarkId)
      .toArray();

    return {
      isIndexed: embeddings.length > 0,
      providers: embeddings.map((e) => e.providerId),
    };
  }

  async getUnindexedBookmarks(): Promise<Bookmark[]> {
    const provider = await this.providerService.getActiveProvider();
    if (!provider) {
      return [];
    }

    const allBookmarks = await db.bookmarks.toArray();
    const indexed = await db.embeddings
      .where('providerId')
      .equals(provider.id)
      .toArray();

    const indexedIds = new Set(indexed.map((e) => e.bookmarkId));
    return allBookmarks.filter((b) => !indexedIds.has(b.id));
  }

  async deleteBookmarkEmbeddings(bookmarkId: string): Promise<void> {
    await db.embeddings.where('bookmarkId').equals(bookmarkId).delete();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
