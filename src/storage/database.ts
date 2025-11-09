import Dexie from 'dexie';

import type { Bookmark } from '@/types/bookmark';
import type { Tag, BookmarkTag } from '@/types/tag';
import type { Table } from 'dexie';

import { STORAGE_CONFIG } from '@/constants/config';

export class SemanticBookmarkDatabase extends Dexie {
  tags!: Table<Tag, string>;
  bookmarkTags!: Table<BookmarkTag, [string, string]>;
  bookmarks!: Table<Bookmark, string>;

  constructor() {
    super(STORAGE_CONFIG.DB_NAME);

    this.version(STORAGE_CONFIG.DB_VERSION).stores({
      tags: 'id, name, source, usageCount',
      bookmarkTags: '[bookmarkId+tagId], bookmarkId, tagId, assignedBy',
      bookmarks: 'id, url, title, version, dateAdded, lastModified',
    });
  }
}

export const db = new SemanticBookmarkDatabase();
