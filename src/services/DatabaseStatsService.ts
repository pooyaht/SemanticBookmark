import { db } from '@/storage/database';

export interface TableStats {
  name: string;
  rowCount: number;
  estimatedSize: number;
}

export interface DatabaseStats {
  tables: TableStats[];
  totalRows: number;
  totalSize: number;
}

export class DatabaseStatsService {
  private static instance: DatabaseStatsService;

  static getInstance(): DatabaseStatsService {
    if (!DatabaseStatsService.instance) {
      DatabaseStatsService.instance = new DatabaseStatsService();
    }
    return DatabaseStatsService.instance;
  }

  async getDatabaseStats(): Promise<DatabaseStats> {
    const tables: TableStats[] = [];
    let totalRows = 0;
    let totalSize = 0;

    const bookmarksCount = await db.bookmarks.count();
    const bookmarksSize = await this.estimateTableSize('bookmarks');
    tables.push({
      name: 'bookmarks',
      rowCount: bookmarksCount,
      estimatedSize: bookmarksSize,
    });
    totalRows += bookmarksCount;
    totalSize += bookmarksSize;

    const contentCount = await db.content.count();
    const contentSize = await this.estimateTableSize('content');
    tables.push({
      name: 'content',
      rowCount: contentCount,
      estimatedSize: contentSize,
    });
    totalRows += contentCount;
    totalSize += contentSize;

    const embeddingsCount = await db.embeddings.count();
    const embeddingsSize = await this.estimateTableSize('embeddings');
    tables.push({
      name: 'embeddings',
      rowCount: embeddingsCount,
      estimatedSize: embeddingsSize,
    });
    totalRows += embeddingsCount;
    totalSize += embeddingsSize;

    const tagsCount = await db.tags.count();
    const tagsSize = await this.estimateTableSize('tags');
    tables.push({
      name: 'tags',
      rowCount: tagsCount,
      estimatedSize: tagsSize,
    });
    totalRows += tagsCount;
    totalSize += tagsSize;

    const bookmarkTagsCount = await db.bookmarkTags.count();
    const bookmarkTagsSize = await this.estimateTableSize('bookmarkTags');
    tables.push({
      name: 'bookmarkTags',
      rowCount: bookmarkTagsCount,
      estimatedSize: bookmarkTagsSize,
    });
    totalRows += bookmarkTagsCount;
    totalSize += bookmarkTagsSize;

    const relatedPagesCount = await db.relatedPages.count();
    const relatedPagesSize = await this.estimateTableSize('relatedPages');
    tables.push({
      name: 'relatedPages',
      rowCount: relatedPagesCount,
      estimatedSize: relatedPagesSize,
    });
    totalRows += relatedPagesCount;
    totalSize += relatedPagesSize;

    const providersCount = await db.embeddingProviders.count();
    const providersSize = await this.estimateTableSize('embeddingProviders');
    tables.push({
      name: 'embeddingProviders',
      rowCount: providersCount,
      estimatedSize: providersSize,
    });
    totalRows += providersCount;
    totalSize += providersSize;

    return {
      tables,
      totalRows,
      totalSize,
    };
  }

  private async estimateTableSize(tableName: string): Promise<number> {
    let totalSize = 0;

    switch (tableName) {
      case 'bookmarks': {
        const items = await db.bookmarks.toArray();
        items.forEach((item) => {
          totalSize += this.estimateObjectSize(item);
        });
        break;
      }
      case 'content': {
        const items = await db.content.toArray();
        items.forEach((item) => {
          totalSize += this.estimateObjectSize(item);
        });
        break;
      }
      case 'embeddings': {
        const items = await db.embeddings.toArray();
        items.forEach((item) => {
          totalSize += this.estimateObjectSize(item);
        });
        break;
      }
      case 'tags': {
        const items = await db.tags.toArray();
        items.forEach((item) => {
          totalSize += this.estimateObjectSize(item);
        });
        break;
      }
      case 'bookmarkTags': {
        const items = await db.bookmarkTags.toArray();
        items.forEach((item) => {
          totalSize += this.estimateObjectSize(item);
        });
        break;
      }
      case 'relatedPages': {
        const items = await db.relatedPages.toArray();
        items.forEach((item) => {
          totalSize += this.estimateObjectSize(item);
        });
        break;
      }
      case 'embeddingProviders': {
        const items = await db.embeddingProviders.toArray();
        items.forEach((item) => {
          totalSize += this.estimateObjectSize(item);
        });
        break;
      }
    }

    return totalSize;
  }

  private estimateObjectSize(obj: unknown): number {
    const jsonString = JSON.stringify(obj, (_key, value) => {
      if (value instanceof Float32Array) {
        return value.length * 4;
      }
      return value as unknown;
    });
    return new Blob([jsonString]).size;
  }

  async clearTable(tableName: string): Promise<void> {
    switch (tableName) {
      case 'bookmarks':
        await db.bookmarks.clear();
        break;
      case 'content':
        await db.content.clear();
        break;
      case 'embeddings':
        await db.embeddings.clear();
        break;
      case 'tags':
        await db.tags.clear();
        break;
      case 'bookmarkTags':
        await db.bookmarkTags.clear();
        break;
      case 'relatedPages':
        await db.relatedPages.clear();
        break;
      case 'embeddingProviders':
        await db.embeddingProviders.clear();
        break;
      default:
        throw new Error(`Unknown table: ${tableName}`);
    }
  }

  async deleteBookmark(id: string): Promise<void> {
    await db.transaction(
      'rw',
      [
        db.bookmarks,
        db.content,
        db.embeddings,
        db.bookmarkTags,
        db.relatedPages,
      ],
      async () => {
        await db.bookmarks.delete(id);
        await db.content.where('bookmarkId').equals(id).delete();
        await db.embeddings.where('bookmarkId').equals(id).delete();
        await db.bookmarkTags.where('bookmarkId').equals(id).delete();
        await db.relatedPages.where('bookmarkId').equals(id).delete();
      }
    );
  }

  async deleteContent(bookmarkId: string, url: string): Promise<void> {
    await db.content.delete([bookmarkId, url]);
  }

  async deleteEmbedding(bookmarkId: string, providerId: string): Promise<void> {
    await db.embeddings.delete([bookmarkId, providerId]);
  }

  async deleteTag(id: string): Promise<void> {
    await db.transaction('rw', db.tags, db.bookmarkTags, async () => {
      await db.tags.delete(id);
      await db.bookmarkTags.where('tagId').equals(id).delete();
    });
  }

  async deleteBookmarkTag(bookmarkId: string, tagId: string): Promise<void> {
    await db.bookmarkTags.delete([bookmarkId, tagId]);
  }

  async deleteRelatedPage(id: string): Promise<void> {
    await db.relatedPages.delete(id);
  }

  async deleteProvider(id: string): Promise<void> {
    await db.transaction(
      'rw',
      [db.embeddingProviders, db.embeddings],
      async () => {
        await db.embeddingProviders.delete(id);
        await db.embeddings.where('providerId').equals(id).delete();
      }
    );
  }

  async clearAllData(): Promise<void> {
    await db.transaction(
      'rw',
      [
        db.bookmarks,
        db.content,
        db.embeddings,
        db.tags,
        db.bookmarkTags,
        db.relatedPages,
        db.embeddingProviders,
      ],
      async () => {
        await db.bookmarks.clear();
        await db.content.clear();
        await db.embeddings.clear();
        await db.tags.clear();
        await db.bookmarkTags.clear();
        await db.relatedPages.clear();
        await db.embeddingProviders.clear();
      }
    );
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) {
      return '0 B';
    }
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}
