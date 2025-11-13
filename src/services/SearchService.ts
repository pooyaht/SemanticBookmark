import { ContentPreparationService } from './ContentPreparationService';
import { EmbeddingProviderService } from './EmbeddingProviderService';

import type { Bookmark } from '@/types/bookmark';

import { ProviderFactory } from '@/providers/ProviderFactory';
import { db } from '@/storage/database';
import { cosineSimilarity } from '@/utils/vectorUtils';

export interface SearchResult {
  bookmark: Bookmark;
  score: number;
  providerId: string;
}

interface SearchOptions {
  limit?: number;
  minScore?: number;
  providerId?: string;
}

const DEFAULT_SEARCH_OPTIONS: Required<SearchOptions> = {
  limit: 20,
  minScore: 0.3,
  providerId: '',
};

export class SearchService {
  private static instance: SearchService;
  private contentPrep: ContentPreparationService;
  private providerService: EmbeddingProviderService;

  private constructor() {
    this.contentPrep = ContentPreparationService.getInstance();
    this.providerService = EmbeddingProviderService.getInstance();
  }

  static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };

    const provider = opts.providerId
      ? await this.providerService.getProvider(opts.providerId)
      : await this.providerService.getActiveProvider();

    if (!provider) {
      throw new Error('No active embedding provider configured');
    }

    const preparedQuery = this.contentPrep.prepareQueryForEmbedding(query);

    const adapter = ProviderFactory.getAdapter(provider.type);
    const queryEmbeddingResult = await adapter.generateEmbedding(
      preparedQuery,
      provider.endpoint,
      provider.modelName,
      provider.documentPrefix,
      provider.documentSuffix
    );

    const queryEmbedding = new Float32Array(queryEmbeddingResult.embedding);

    const embeddings = await db.embeddings
      .where('providerId')
      .equals(provider.id)
      .toArray();

    const scoredResults: SearchResult[] = [];

    for (const embedding of embeddings) {
      const score = cosineSimilarity(queryEmbedding, embedding.embedding);

      if (score >= opts.minScore) {
        const bookmark = await db.bookmarks.get(embedding.bookmarkId);
        if (bookmark && !bookmark.hidden) {
          scoredResults.push({
            bookmark,
            score,
            providerId: provider.id,
          });
        }
      }
    }

    scoredResults.sort((a, b) => b.score - a.score);

    return scoredResults.slice(0, opts.limit);
  }

  async searchWithFallback(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    try {
      return await this.search(query, options);
    } catch (error) {
      console.warn(
        'Semantic search failed, falling back to text search:',
        error
      );
      return await this.textSearch(query, options.limit);
    }
  }

  async textSearch(query: string, limit = 20): Promise<SearchResult[]> {
    const lowercaseQuery = query.toLowerCase();
    const terms = lowercaseQuery.split(/\s+/).filter((t) => t.length > 0);

    const bookmarks = await db.bookmarks.toArray();

    const scoredResults: SearchResult[] = [];

    for (const bookmark of bookmarks) {
      if (bookmark.hidden) {
        continue;
      }

      let score = 0;
      const searchableText = [
        bookmark.title,
        bookmark.url,
        bookmark.userDescription ?? '',
        bookmark.aiSummary ?? '',
      ]
        .join(' ')
        .toLowerCase();

      for (const term of terms) {
        if (searchableText.includes(term)) {
          if (bookmark.title.toLowerCase().includes(term)) {
            score += 3;
          } else if (bookmark.userDescription?.toLowerCase().includes(term)) {
            score += 2;
          } else {
            score += 1;
          }
        }
      }

      if (score > 0) {
        scoredResults.push({
          bookmark,
          score: score / 10,
          providerId: 'text-search',
        });
      }
    }

    scoredResults.sort((a, b) => b.score - a.score);

    return scoredResults.slice(0, limit);
  }
}
