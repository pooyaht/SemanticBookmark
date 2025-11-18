import browser from 'webextension-polyfill';

import type { Bookmark } from '@/types/bookmark';
import type { Content, RelatedPage } from '@/types/content';
import type { EmbeddingProvider, Embedding } from '@/types/provider';
import type { Settings } from '@/types/settings';
import type { Tag, BookmarkTag } from '@/types/tag';

import { APP_VERSION } from '@/constants/config';
import { db } from '@/storage/database';
import { DEFAULT_SETTINGS } from '@/types/settings';

export const EXPORT_FORMAT_VERSION = '1.0.0';

interface SerializedEmbedding {
  bookmarkId: string;
  providerId: string;
  embedding: number[];
  createdAt: string;
  modelName: string;
  bookmarkVersion: number;
  isTruncated?: boolean;
  tokenCount?: number;
}

interface SerializedBookmark
  extends Omit<Bookmark, 'dateAdded' | 'lastModified'> {
  dateAdded: string;
  lastModified: string;
}

interface SerializedContent extends Omit<Content, 'fetchedAt'> {
  fetchedAt: number;
}

interface SerializedRelatedPage extends Omit<RelatedPage, 'discoveredAt'> {
  discoveredAt: number;
}

interface SerializedProvider
  extends Omit<EmbeddingProvider, 'createdAt' | 'lastUsedAt' | 'lastTestedAt'> {
  createdAt: string;
  lastUsedAt?: string;
  lastTestedAt?: string;
}

interface SerializedTag extends Omit<Tag, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

interface SerializedBookmarkTag extends Omit<BookmarkTag, 'assignedAt'> {
  assignedAt: string;
}

export interface ExportData {
  version: string;
  exportedAt: string;
  appVersion: string;
  metadata: {
    bookmarkCount: number;
    embeddingCount: number;
    contentCount: number;
    relatedPageCount: number;
    providerCount: number;
    tagCount: number;
    bookmarkTagCount: number;
  };
  data: {
    bookmarks: SerializedBookmark[];
    content: SerializedContent[];
    relatedPages: SerializedRelatedPage[];
    embeddingProviders: SerializedProvider[];
    embeddings: SerializedEmbedding[];
    tags: SerializedTag[];
    bookmarkTags: SerializedBookmarkTag[];
    settings: Settings;
  };
}

export interface ImportProgress {
  stage: string;
  current: number;
  total: number;
}

export interface ImportOptions {
  clearExisting?: boolean;
  onProgress?: (progress: ImportProgress) => void;
}

export interface ImportResult {
  success: boolean;
  imported: {
    bookmarks: number;
    embeddings: number;
    content: number;
    relatedPages: number;
    providers: number;
    tags: number;
    bookmarkTags: number;
  };
  errors: string[];
}

export class ImportExportService {
  private static instance: ImportExportService;

  private constructor() {}

  static getInstance(): ImportExportService {
    if (!ImportExportService.instance) {
      ImportExportService.instance = new ImportExportService();
    }
    return ImportExportService.instance;
  }

  async exportAllData(): Promise<ExportData> {
    const [
      bookmarks,
      content,
      relatedPages,
      embeddingProviders,
      embeddings,
      tags,
      bookmarkTags,
      settings,
    ] = await Promise.all([
      db.bookmarks.toArray(),
      db.content.toArray(),
      db.relatedPages.toArray(),
      db.embeddingProviders.toArray(),
      db.embeddings.toArray(),
      db.tags.toArray(),
      db.bookmarkTags.toArray(),
      this.getSettings(),
    ]);

    const serializedBookmarks = bookmarks.map((b) => this.serializeBookmark(b));
    const serializedProviders = embeddingProviders.map((p) =>
      this.serializeProvider(p)
    );
    const serializedEmbeddings = embeddings.map((e) =>
      this.serializeEmbedding(e)
    );
    const serializedTags = tags.map((t) => this.serializeTag(t));
    const serializedBookmarkTags = bookmarkTags.map((bt) =>
      this.serializeBookmarkTag(bt)
    );

    const exportData: ExportData = {
      version: EXPORT_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      metadata: {
        bookmarkCount: bookmarks.length,
        embeddingCount: embeddings.length,
        contentCount: content.length,
        relatedPageCount: relatedPages.length,
        providerCount: embeddingProviders.length,
        tagCount: tags.length,
        bookmarkTagCount: bookmarkTags.length,
      },
      data: {
        bookmarks: serializedBookmarks,
        content,
        relatedPages,
        embeddingProviders: serializedProviders,
        embeddings: serializedEmbeddings,
        tags: serializedTags,
        bookmarkTags: serializedBookmarkTags,
        settings,
      },
    };

    return exportData;
  }

  async exportToFile(): Promise<void> {
    const data = await this.exportAllData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, -5);
    const filename = `semantic-bookmarks-${timestamp}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async importAllData(
    exportData: ExportData,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const { clearExisting = false, onProgress } = options;
    const errors: string[] = [];
    const imported = {
      bookmarks: 0,
      embeddings: 0,
      content: 0,
      relatedPages: 0,
      providers: 0,
      tags: 0,
      bookmarkTags: 0,
    };

    try {
      this.validateExportData(exportData);

      if (clearExisting) {
        onProgress?.({ stage: 'Clearing existing data', current: 0, total: 1 });
        await this.clearAllData();
      }

      onProgress?.({
        stage: 'Importing settings',
        current: 0,
        total: 1,
      });
      await this.saveSettings(exportData.data.settings);

      onProgress?.({
        stage: 'Importing tags',
        current: 0,
        total: exportData.data.tags.length,
      });
      for (let i = 0; i < exportData.data.tags.length; i++) {
        try {
          const tagData = exportData.data.tags[i];
          if (!tagData) {
            continue;
          }
          const tag = this.deserializeTag(tagData);
          await db.tags.put(tag);
          imported.tags++;
          onProgress?.({
            stage: 'Importing tags',
            current: i + 1,
            total: exportData.data.tags.length,
          });
        } catch (error) {
          const tagData = exportData.data.tags[i];
          errors.push(
            `Failed to import tag ${tagData?.id ?? 'unknown'}: ${String(error)}`
          );
        }
      }

      onProgress?.({
        stage: 'Importing bookmarks',
        current: 0,
        total: exportData.data.bookmarks.length,
      });
      for (let i = 0; i < exportData.data.bookmarks.length; i++) {
        try {
          const bookmarkData = exportData.data.bookmarks[i];
          if (!bookmarkData) {
            continue;
          }
          const bookmark = this.deserializeBookmark(bookmarkData);
          await db.bookmarks.put(bookmark);
          imported.bookmarks++;
          onProgress?.({
            stage: 'Importing bookmarks',
            current: i + 1,
            total: exportData.data.bookmarks.length,
          });
        } catch (error) {
          const bookmarkData = exportData.data.bookmarks[i];
          errors.push(
            `Failed to import bookmark ${bookmarkData?.id ?? 'unknown'}: ${String(error)}`
          );
        }
      }

      onProgress?.({
        stage: 'Importing bookmark-tag associations',
        current: 0,
        total: exportData.data.bookmarkTags.length,
      });
      for (let i = 0; i < exportData.data.bookmarkTags.length; i++) {
        try {
          const bookmarkTagData = exportData.data.bookmarkTags[i];
          if (!bookmarkTagData) {
            continue;
          }
          const bookmarkTag = this.deserializeBookmarkTag(bookmarkTagData);
          await db.bookmarkTags.put(bookmarkTag);
          imported.bookmarkTags++;
          onProgress?.({
            stage: 'Importing bookmark-tag associations',
            current: i + 1,
            total: exportData.data.bookmarkTags.length,
          });
        } catch (error) {
          const bookmarkTagData = exportData.data.bookmarkTags[i];
          errors.push(
            `Failed to import bookmark-tag ${bookmarkTagData?.bookmarkId ?? 'unknown'}-${bookmarkTagData?.tagId ?? 'unknown'}: ${String(error)}`
          );
        }
      }

      onProgress?.({
        stage: 'Importing content',
        current: 0,
        total: exportData.data.content.length,
      });
      for (let i = 0; i < exportData.data.content.length; i++) {
        try {
          const contentData = exportData.data.content[i];
          if (!contentData) {
            continue;
          }
          await db.content.put(contentData);
          imported.content++;
          onProgress?.({
            stage: 'Importing content',
            current: i + 1,
            total: exportData.data.content.length,
          });
        } catch (error) {
          const contentData = exportData.data.content[i];
          errors.push(
            `Failed to import content ${contentData?.bookmarkId ?? 'unknown'}: ${String(error)}`
          );
        }
      }

      onProgress?.({
        stage: 'Importing related pages',
        current: 0,
        total: exportData.data.relatedPages.length,
      });
      for (let i = 0; i < exportData.data.relatedPages.length; i++) {
        try {
          const relatedPageData = exportData.data.relatedPages[i];
          if (!relatedPageData) {
            continue;
          }
          await db.relatedPages.put(relatedPageData);
          imported.relatedPages++;
          onProgress?.({
            stage: 'Importing related pages',
            current: i + 1,
            total: exportData.data.relatedPages.length,
          });
        } catch (error) {
          const relatedPageData = exportData.data.relatedPages[i];
          errors.push(
            `Failed to import related page ${relatedPageData?.id ?? 'unknown'}: ${String(error)}`
          );
        }
      }

      onProgress?.({
        stage: 'Importing embedding providers',
        current: 0,
        total: exportData.data.embeddingProviders.length,
      });
      for (let i = 0; i < exportData.data.embeddingProviders.length; i++) {
        try {
          const providerData = exportData.data.embeddingProviders[i];
          if (!providerData) {
            continue;
          }
          const provider = this.deserializeProvider(providerData);
          await db.embeddingProviders.put(provider);
          imported.providers++;
          onProgress?.({
            stage: 'Importing embedding providers',
            current: i + 1,
            total: exportData.data.embeddingProviders.length,
          });
        } catch (error) {
          const providerData = exportData.data.embeddingProviders[i];
          errors.push(
            `Failed to import provider ${providerData?.id ?? 'unknown'}: ${String(error)}`
          );
        }
      }

      onProgress?.({
        stage: 'Importing embeddings',
        current: 0,
        total: exportData.data.embeddings.length,
      });
      for (let i = 0; i < exportData.data.embeddings.length; i++) {
        try {
          const embeddingData = exportData.data.embeddings[i];
          if (!embeddingData) {
            continue;
          }
          const embedding = this.deserializeEmbedding(embeddingData);
          await db.embeddings.put(embedding);
          imported.embeddings++;
          onProgress?.({
            stage: 'Importing embeddings',
            current: i + 1,
            total: exportData.data.embeddings.length,
          });
        } catch (error) {
          const embeddingData = exportData.data.embeddings[i];
          errors.push(
            `Failed to import embedding ${embeddingData?.bookmarkId ?? 'unknown'}-${embeddingData?.providerId ?? 'unknown'}: ${String(error)}`
          );
        }
      }

      return {
        success: errors.length === 0,
        imported,
        errors,
      };
    } catch (error) {
      errors.push(`Import failed: ${String(error)}`);
      return {
        success: false,
        imported,
        errors,
      };
    }
  }

  async importFromFile(
    file: File,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportData;
      return await this.importAllData(data, options);
    } catch (error) {
      return {
        success: false,
        imported: {
          bookmarks: 0,
          embeddings: 0,
          content: 0,
          relatedPages: 0,
          providers: 0,
          tags: 0,
          bookmarkTags: 0,
        },
        errors: [`Failed to parse import file: ${String(error)}`],
      };
    }
  }

  private validateExportData(data: ExportData): void {
    if (!data.version) {
      throw new Error('Invalid export data: missing version');
    }

    if (data.version !== EXPORT_FORMAT_VERSION) {
      throw new Error(
        `Unsupported export format version: ${data.version} (expected ${EXPORT_FORMAT_VERSION})`
      );
    }

    if (!data.data) {
      throw new Error('Invalid export data: missing data section');
    }

    const requiredFields = [
      'bookmarks',
      'content',
      'relatedPages',
      'embeddingProviders',
      'embeddings',
      'tags',
      'bookmarkTags',
      'settings',
    ];

    for (const field of requiredFields) {
      if (!(field in data.data)) {
        throw new Error(`Invalid export data: missing ${field}`);
      }
    }
  }

  private async clearAllData(): Promise<void> {
    await Promise.all([
      db.bookmarks.clear(),
      db.content.clear(),
      db.relatedPages.clear(),
      db.embeddingProviders.clear(),
      db.embeddings.clear(),
      db.tags.clear(),
      db.bookmarkTags.clear(),
    ]);
  }

  private serializeBookmark(bookmark: Bookmark): SerializedBookmark {
    return {
      ...bookmark,
      dateAdded: bookmark.dateAdded.toISOString(),
      lastModified: bookmark.lastModified.toISOString(),
    };
  }

  private deserializeBookmark(data: SerializedBookmark): Bookmark {
    return {
      ...data,
      dateAdded: new Date(data.dateAdded),
      lastModified: new Date(data.lastModified),
    };
  }

  private serializeProvider(provider: EmbeddingProvider): SerializedProvider {
    return {
      ...provider,
      createdAt: provider.createdAt.toISOString(),
      lastUsedAt: provider.lastUsedAt?.toISOString(),
      lastTestedAt: provider.lastTestedAt?.toISOString(),
    };
  }

  private deserializeProvider(data: SerializedProvider): EmbeddingProvider {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      lastUsedAt: data.lastUsedAt ? new Date(data.lastUsedAt) : undefined,
      lastTestedAt: data.lastTestedAt ? new Date(data.lastTestedAt) : undefined,
    };
  }

  private serializeEmbedding(embedding: Embedding): SerializedEmbedding {
    return {
      ...embedding,
      embedding: Array.from(embedding.embedding),
      createdAt: embedding.createdAt.toISOString(),
    };
  }

  private deserializeEmbedding(data: SerializedEmbedding): Embedding {
    return {
      ...data,
      embedding: new Float32Array(data.embedding),
      createdAt: new Date(data.createdAt),
    };
  }

  private serializeTag(tag: Tag): SerializedTag {
    return {
      ...tag,
      createdAt: tag.createdAt.toISOString(),
      updatedAt: tag.updatedAt.toISOString(),
    };
  }

  private deserializeTag(data: SerializedTag): Tag {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  private serializeBookmarkTag(
    bookmarkTag: BookmarkTag
  ): SerializedBookmarkTag {
    return {
      ...bookmarkTag,
      assignedAt: bookmarkTag.assignedAt.toISOString(),
    };
  }

  private deserializeBookmarkTag(data: SerializedBookmarkTag): BookmarkTag {
    return {
      ...data,
      assignedAt: new Date(data.assignedAt),
    };
  }

  private async getSettings(): Promise<Settings> {
    const result = await browser.storage.sync.get('app_settings');
    return (result.app_settings as Settings) || DEFAULT_SETTINGS;
  }

  private async saveSettings(settings: Settings): Promise<void> {
    await browser.storage.sync.set({ app_settings: settings });
  }
}

export const importExportService = ImportExportService.getInstance();
