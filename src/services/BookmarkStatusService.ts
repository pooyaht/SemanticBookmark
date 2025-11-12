import { IndexingService } from './IndexingService';

import type { Bookmark } from '@/types/bookmark';

import { db } from '@/storage/database';

export interface BookmarkStatus {
  isCrawled: boolean;
  isIndexed: boolean;
  hasAISummary: boolean;
  hasUserDescription: boolean;
  isStale: boolean;
}

export class BookmarkStatusService {
  private static instance: BookmarkStatusService;
  private indexingService: IndexingService;

  private constructor() {
    this.indexingService = IndexingService.getInstance();
  }

  static getInstance(): BookmarkStatusService {
    if (!BookmarkStatusService.instance) {
      BookmarkStatusService.instance = new BookmarkStatusService();
    }
    return BookmarkStatusService.instance;
  }

  async getBatchStatus(
    bookmarks: Bookmark[]
  ): Promise<Map<string, BookmarkStatus>> {
    const statusMap = new Map<string, BookmarkStatus>();

    const allContent = await db.content.toArray();
    const contentByBookmark = new Map<string, boolean>();
    for (const content of allContent) {
      contentByBookmark.set(content.bookmarkId, true);
    }

    const allEmbeddings = await db.embeddings.toArray();
    const embeddingsByBookmark = new Map<
      string,
      { createdAt: Date; modelName: string }
    >();
    for (const embedding of allEmbeddings) {
      embeddingsByBookmark.set(embedding.bookmarkId, {
        createdAt: embedding.createdAt,
        modelName: embedding.modelName,
      });
    }

    for (const bookmark of bookmarks) {
      const isCrawled = contentByBookmark.has(bookmark.id);
      const isIndexed = embeddingsByBookmark.has(bookmark.id);
      const hasAISummary = !!bookmark.aiSummary;
      const hasUserDescription = !!bookmark.userDescription;

      let isStale = false;
      if (isIndexed) {
        const embeddingInfo = embeddingsByBookmark.get(bookmark.id);
        if (embeddingInfo) {
          isStale =
            bookmark.lastModified.getTime() > embeddingInfo.createdAt.getTime();
        }
      }

      statusMap.set(bookmark.id, {
        isCrawled,
        isIndexed,
        hasAISummary,
        hasUserDescription,
        isStale,
      });
    }

    return statusMap;
  }

  async getBookmarkStatus(bookmarkId: string): Promise<BookmarkStatus> {
    const bookmark = await db.bookmarks.get(bookmarkId);
    if (!bookmark) {
      return {
        isCrawled: false,
        isIndexed: false,
        hasAISummary: false,
        hasUserDescription: false,
        isStale: false,
      };
    }

    const isCrawled =
      (await db.content.where('bookmarkId').equals(bookmarkId).count()) > 0;

    const isIndexed = await this.indexingService.isBookmarkIndexed(bookmarkId);

    const hasAISummary = !!bookmark.aiSummary;
    const hasUserDescription = !!bookmark.userDescription;

    let isStale = false;
    if (isIndexed) {
      const embedding = await db.embeddings
        .where('bookmarkId')
        .equals(bookmarkId)
        .first();
      if (embedding) {
        isStale =
          bookmark.lastModified.getTime() > embedding.createdAt.getTime();
      }
    }

    return {
      isCrawled,
      isIndexed,
      hasAISummary,
      hasUserDescription,
      isStale,
    };
  }
}
