import Dexie from 'dexie';

import type { Bookmark } from '@/types/bookmark';
import type { Content, RelatedPage } from '@/types/content';
import type { EmbeddingProvider, Embedding } from '@/types/provider';
import type { Tag, BookmarkTag } from '@/types/tag';
import type { Table } from 'dexie';

import { STORAGE_CONFIG } from '@/constants/config';

export class SemanticBookmarkDatabase extends Dexie {
  tags!: Table<Tag, string>;
  bookmarkTags!: Table<BookmarkTag, [string, string]>;
  bookmarks!: Table<Bookmark, string>;
  content!: Table<Content, [string, string]>;
  relatedPages!: Table<RelatedPage, string>;
  embeddingProviders!: Table<EmbeddingProvider, string>;
  embeddings!: Table<Embedding, [string, string]>;

  constructor() {
    super(STORAGE_CONFIG.DB_NAME);

    this.version(2).stores({
      tags: 'id, name, source, usageCount',
      bookmarkTags: '[bookmarkId+tagId], bookmarkId, tagId, assignedBy',
      bookmarks: 'id, url, title, version, dateAdded, lastModified',
    });

    this.version(STORAGE_CONFIG.DB_VERSION).stores({
      tags: 'id, name, source, usageCount',
      bookmarkTags: '[bookmarkId+tagId], bookmarkId, tagId, assignedBy',
      bookmarks: 'id, url, title, version, dateAdded, lastModified',
      content:
        '[bookmarkId+url], bookmarkId, url, type, contentHash, fetchedAt',
      relatedPages: 'id, bookmarkId, url, depth, discoveredAt',
    });

    this.version(4).stores({
      tags: 'id, name, source, usageCount',
      bookmarkTags: '[bookmarkId+tagId], bookmarkId, tagId, assignedBy',
      bookmarks: 'id, url, title, version, dateAdded, lastModified',
      content:
        '[bookmarkId+url], bookmarkId, url, type, contentHash, fetchedAt',
      relatedPages: 'id, bookmarkId, url, depth, discoveredAt',
      embeddingProviders: 'id, type, createdAt',
      embeddings: '[bookmarkId+providerId], bookmarkId, providerId, createdAt',
    });
  }
}

export const db = new SemanticBookmarkDatabase();
