import browser from 'webextension-polyfill';

import type { Bookmark } from '@/types/bookmark';
import { db } from '@/storage/database';

export class BookmarkService {
  async getAllBookmarks(): Promise<Bookmark[]> {
    return await db.bookmarks.toArray();
  }

  async getVisibleBookmarks(): Promise<Bookmark[]> {
    return await db.bookmarks.where('hidden').equals(false).toArray();
  }

  async getBookmark(id: string): Promise<Bookmark | undefined> {
    return await db.bookmarks.get(id);
  }

  async hideBookmark(id: string): Promise<void> {
    const bookmark = await this.getBookmark(id);
    if (!bookmark) {
      throw new Error(`Bookmark with id "${id}" not found`);
    }

    await db.bookmarks.update(id, {
      hidden: true,
      lastModified: new Date(),
    });
  }

  async unhideBookmark(id: string): Promise<void> {
    const bookmark = await this.getBookmark(id);
    if (!bookmark) {
      throw new Error(`Bookmark with id "${id}" not found`);
    }

    await db.bookmarks.update(id, {
      hidden: false,
      lastModified: new Date(),
    });
  }

  async updateUserDescription(id: string, description: string): Promise<void> {
    const bookmark = await this.getBookmark(id);
    if (!bookmark) {
      throw new Error(`Bookmark with id "${id}" not found`);
    }

    await db.bookmarks.update(id, {
      userDescription: description,
      version: bookmark.version + 1,
      lastModified: new Date(),
    });
  }

  async syncBookmarks(): Promise<{
    added: number;
    removed: number;
  }> {
    const browserBookmarks = await this.fetchBrowserBookmarks();
    const existingBookmarks = await this.getAllBookmarks();

    const browserBookmarkIds = new Set(browserBookmarks.map((b) => b.id));
    const existingBookmarkIds = new Set(existingBookmarks.map((b) => b.id));

    let addedCount = 0;
    let removedCount = 0;

    for (const browserBookmark of browserBookmarks) {
      if (!existingBookmarkIds.has(browserBookmark.id)) {
        await db.bookmarks.add(browserBookmark);
        addedCount++;
      }
    }

    for (const existingBookmark of existingBookmarks) {
      if (!browserBookmarkIds.has(existingBookmark.id)) {
        await this.removeBookmark(existingBookmark.id);
        removedCount++;
      }
    }

    return { added: addedCount, removed: removedCount };
  }

  private async removeBookmark(id: string): Promise<void> {
    await db.transaction('rw', [db.bookmarks, db.bookmarkTags], async () => {
      await db.bookmarkTags.where('bookmarkId').equals(id).delete();
      await db.bookmarks.delete(id);
    });
  }

  private async fetchBrowserBookmarks(): Promise<Bookmark[]> {
    const bookmarkTree = await browser.bookmarks.getTree();
    const bookmarks: Bookmark[] = [];

    const traverse = (nodes: browser.Bookmarks.BookmarkTreeNode[]) => {
      for (const node of nodes) {
        if (node.url) {
          bookmarks.push({
            id: node.id,
            url: node.url,
            title: node.title || node.url,
            version: 0,
            hidden: false,
            dateAdded: node.dateAdded ? new Date(node.dateAdded) : new Date(),
            lastModified: new Date(),
          });
        }

        if (node.children) {
          traverse(node.children);
        }
      }
    };

    traverse(bookmarkTree);
    return bookmarks;
  }
}
