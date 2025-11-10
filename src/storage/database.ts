import Dexie from 'dexie';

import type { Bookmark } from '@/types/bookmark';
import type { Content, RelatedPage } from '@/types/content';
import type { Tag, BookmarkTag } from '@/types/tag';
import type { Table } from 'dexie';

import { STORAGE_CONFIG } from '@/constants/config';

export class SemanticBookmarkDatabase extends Dexie {
  tags!: Table<Tag, string>;
  bookmarkTags!: Table<BookmarkTag, [string, string]>;
  bookmarks!: Table<Bookmark, string>;
  content!: Table<Content, [string, string]>;
  relatedPages!: Table<RelatedPage, string>;

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
  }
}

export const db = new SemanticBookmarkDatabase();
