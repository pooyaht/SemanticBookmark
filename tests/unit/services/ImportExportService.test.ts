import {
  ImportExportService,
  EXPORT_FORMAT_VERSION,
} from '@/services/ImportExportService';
import { db } from '@/storage/database';
import { TagSource, TagAssignmentSource } from '@/types/tag';
import type { Bookmark } from '@/types/bookmark';
import type { EmbeddingProvider, Embedding } from '@/types/provider';
import type { Content } from '@/types/content';
import type { Settings } from '@/types/settings';
import browser from 'webextension-polyfill';

jest.mock('webextension-polyfill', () => ({
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
}));

describe('ImportExportService', () => {
  let service: ImportExportService;

  beforeEach(async () => {
    service = ImportExportService.getInstance();
    await db.delete();
    await db.open();

    (browser.storage.sync.get as jest.Mock).mockResolvedValue({});
    (browser.storage.sync.set as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await db.delete();
    jest.clearAllMocks();
  });

  describe('exportAllData', () => {
    it('should export empty database', async () => {
      const exportData = await service.exportAllData();

      expect(exportData.version).toBe(EXPORT_FORMAT_VERSION);
      expect(exportData.exportedAt).toBeDefined();
      expect(exportData.metadata.bookmarkCount).toBe(0);
      expect(exportData.metadata.embeddingCount).toBe(0);
      expect(exportData.data.bookmarks).toEqual([]);
      expect(exportData.data.embeddings).toEqual([]);
    });

    it('should export bookmarks with proper serialization', async () => {
      const bookmark: Bookmark = {
        id: 'test-bookmark-1',
        url: 'https://example.com',
        title: 'Test Bookmark',
        version: 1,
        hidden: false,
        dateAdded: new Date('2024-01-01T00:00:00Z'),
        lastModified: new Date('2024-01-02T00:00:00Z'),
      };

      await db.bookmarks.add(bookmark);

      const exportData = await service.exportAllData();

      expect(exportData.metadata.bookmarkCount).toBe(1);
      expect(exportData.data.bookmarks).toHaveLength(1);
      expect(exportData.data.bookmarks[0].id).toBe('test-bookmark-1');
      expect(exportData.data.bookmarks[0].dateAdded).toBe(
        '2024-01-01T00:00:00.000Z'
      );
      expect(exportData.data.bookmarks[0].lastModified).toBe(
        '2024-01-02T00:00:00.000Z'
      );
    });

    it('should export embeddings with Float32Array serialization', async () => {
      const provider: EmbeddingProvider = {
        id: 'provider-1',
        name: 'Test Provider',
        type: 'localai',
        endpoint: 'http://localhost:8080',
        modelName: 'test-model',
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        isConnected: true,
      };

      const embedding: Embedding = {
        bookmarkId: 'bookmark-1',
        providerId: 'provider-1',
        embedding: new Float32Array([0.1, 0.2, 0.3, 0.4]),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        modelName: 'test-model',
        bookmarkVersion: 1,
      };

      await db.embeddingProviders.add(provider);
      await db.embeddings.add(embedding);

      const stored = await db.embeddings.toArray();
      const exportData = await service.exportAllData();

      expect(exportData.metadata.embeddingCount).toBe(1);
      expect(exportData.data.embeddings).toHaveLength(1);

      const exportedEmbedding = exportData.data.embeddings[0].embedding;
      expect(Array.isArray(exportedEmbedding)).toBe(true);
      expect(exportedEmbedding.length).toBe(4);
      expect(exportedEmbedding[0]).toBeCloseTo(0.1);
      expect(exportedEmbedding[1]).toBeCloseTo(0.2);
      expect(exportedEmbedding[2]).toBeCloseTo(0.3);
      expect(exportedEmbedding[3]).toBeCloseTo(0.4);
    });

    it('should export tags with proper serialization', async () => {
      await db.tags.add({
        id: 'tag-1',
        name: 'test-tag',
        source: TagSource.USER,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        usageCount: 0,
      });

      const exportData = await service.exportAllData();

      expect(exportData.metadata.tagCount).toBe(1);
      expect(exportData.data.tags[0].createdAt).toBe(
        '2024-01-01T00:00:00.000Z'
      );
      expect(exportData.data.tags[0].updatedAt).toBe(
        '2024-01-02T00:00:00.000Z'
      );
    });

    it('should export content and related pages', async () => {
      const content: Content = {
        bookmarkId: 'bookmark-1',
        url: 'https://example.com',
        type: 'primary',
        title: 'Test Content',
        content: 'Test content text',
        contentHash: 'hash123',
        links: ['https://example.com/link1'],
        fetchedAt: Date.now(),
      };

      await db.content.add(content);
      await db.relatedPages.add({
        id: 'related-1',
        bookmarkId: 'bookmark-1',
        url: 'https://example.com/related',
        depth: 1,
        discoveredAt: Date.now(),
      });

      const exportData = await service.exportAllData();

      expect(exportData.metadata.contentCount).toBe(1);
      expect(exportData.metadata.relatedPageCount).toBe(1);
      expect(exportData.data.content).toHaveLength(1);
      expect(exportData.data.relatedPages).toHaveLength(1);
    });

    it('should export settings from browser storage', async () => {
      const mockSettings: Settings = {
        crawler: {
          enabled: true,
          defaultDepth: 2,
          maxLinksPerPage: 10,
          sameOriginOnly: true,
          rateLimitMs: 200,
          respectRobotsTxt: true,
          autoRetryOnFailure: true,
          maxRetries: 3,
        },
        aiProvider: {
          enabled: false,
          type: 'localai',
          endpoint: 'http://localhost:8080',
          modelName: 'test-model',
          isConnected: false,
        },
      };

      (browser.storage.sync.get as jest.Mock).mockResolvedValue({
        app_settings: mockSettings,
      });

      const exportData = await service.exportAllData();

      expect(exportData.data.settings).toEqual(mockSettings);
    });
  });

  describe('importAllData', () => {
    it('should reject invalid export data with missing version', async () => {
      const invalidData = { data: {} } as any;

      const result = await service.importAllData(invalidData);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Invalid export data');
    });

    it('should reject unsupported export format version', async () => {
      const invalidData = {
        version: '99.0.0',
        exportedAt: new Date().toISOString(),
        appVersion: '0.1.0',
        metadata: {
          bookmarkCount: 0,
          embeddingCount: 0,
          contentCount: 0,
          relatedPageCount: 0,
          providerCount: 0,
          tagCount: 0,
          bookmarkTagCount: 0,
        },
        data: {
          bookmarks: [],
          content: [],
          relatedPages: [],
          embeddingProviders: [],
          embeddings: [],
          tags: [],
          bookmarkTags: [],
          settings: {},
        },
      } as any;

      const result = await service.importAllData(invalidData);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Unsupported export format version');
    });

    it('should import bookmarks with proper deserialization', async () => {
      const exportData = {
        version: EXPORT_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        appVersion: '0.1.0',
        metadata: {
          bookmarkCount: 1,
          embeddingCount: 0,
          contentCount: 0,
          relatedPageCount: 0,
          providerCount: 0,
          tagCount: 0,
          bookmarkTagCount: 0,
        },
        data: {
          bookmarks: [
            {
              id: 'bookmark-1',
              url: 'https://example.com',
              title: 'Test',
              version: 1,
              hidden: false,
              dateAdded: '2024-01-01T00:00:00.000Z',
              lastModified: '2024-01-02T00:00:00.000Z',
            },
          ],
          content: [],
          relatedPages: [],
          embeddingProviders: [],
          embeddings: [],
          tags: [],
          bookmarkTags: [],
          settings: {},
        },
      };

      const result = await service.importAllData(exportData);

      expect(result.success).toBe(true);
      expect(result.imported.bookmarks).toBe(1);

      const bookmarks = await db.bookmarks.toArray();
      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0].id).toBe('bookmark-1');
      expect(bookmarks[0].dateAdded).toBeInstanceOf(Date);
      expect(bookmarks[0].lastModified).toBeInstanceOf(Date);
    });

    it('should import embeddings with Float32Array deserialization', async () => {
      const exportData = {
        version: EXPORT_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        appVersion: '0.1.0',
        metadata: {
          bookmarkCount: 0,
          embeddingCount: 1,
          contentCount: 0,
          relatedPageCount: 0,
          providerCount: 1,
          tagCount: 0,
          bookmarkTagCount: 0,
        },
        data: {
          bookmarks: [],
          content: [],
          relatedPages: [],
          embeddingProviders: [
            {
              id: 'provider-1',
              name: 'Test Provider',
              type: 'localai',
              endpoint: 'http://localhost:8080',
              modelName: 'test-model',
              isActive: true,
              createdAt: '2024-01-01T00:00:00.000Z',
              isConnected: true,
            },
          ],
          embeddings: [
            {
              bookmarkId: 'bookmark-1',
              providerId: 'provider-1',
              embedding: [0.1, 0.2, 0.3, 0.4],
              createdAt: '2024-01-01T00:00:00.000Z',
              modelName: 'test-model',
              bookmarkVersion: 1,
            },
          ],
          tags: [],
          bookmarkTags: [],
          settings: {},
        },
      };

      const result = await service.importAllData(exportData);

      expect(result.success).toBe(true);
      expect(result.imported.embeddings).toBe(1);

      const embeddings = await db.embeddings.toArray();
      expect(embeddings).toHaveLength(1);
      expect(embeddings[0].embedding).toBeInstanceOf(Float32Array);
      const embeddingArray = Array.from(embeddings[0].embedding);
      expect(embeddingArray).toHaveLength(4);
      expect(embeddingArray[0]).toBeCloseTo(0.1, 5);
      expect(embeddingArray[1]).toBeCloseTo(0.2, 5);
      expect(embeddingArray[2]).toBeCloseTo(0.3, 5);
      expect(embeddingArray[3]).toBeCloseTo(0.4, 5);
    });

    it('should clear existing data when clearExisting is true', async () => {
      await db.bookmarks.add({
        id: 'existing-bookmark',
        url: 'https://existing.com',
        title: 'Existing',
        version: 1,
        hidden: false,
        dateAdded: new Date(),
        lastModified: new Date(),
      });

      const exportData = {
        version: EXPORT_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        appVersion: '0.1.0',
        metadata: {
          bookmarkCount: 1,
          embeddingCount: 0,
          contentCount: 0,
          relatedPageCount: 0,
          providerCount: 0,
          tagCount: 0,
          bookmarkTagCount: 0,
        },
        data: {
          bookmarks: [
            {
              id: 'new-bookmark',
              url: 'https://new.com',
              title: 'New',
              version: 1,
              hidden: false,
              dateAdded: '2024-01-01T00:00:00.000Z',
              lastModified: '2024-01-02T00:00:00.000Z',
            },
          ],
          content: [],
          relatedPages: [],
          embeddingProviders: [],
          embeddings: [],
          tags: [],
          bookmarkTags: [],
          settings: {},
        },
      };

      const result = await service.importAllData(exportData, {
        clearExisting: true,
      });

      expect(result.success).toBe(true);

      const bookmarks = await db.bookmarks.toArray();
      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0].id).toBe('new-bookmark');
    });

    it('should merge with existing data when clearExisting is false', async () => {
      await db.bookmarks.add({
        id: 'existing-bookmark',
        url: 'https://existing.com',
        title: 'Existing',
        version: 1,
        hidden: false,
        dateAdded: new Date(),
        lastModified: new Date(),
      });

      const exportData = {
        version: EXPORT_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        appVersion: '0.1.0',
        metadata: {
          bookmarkCount: 1,
          embeddingCount: 0,
          contentCount: 0,
          relatedPageCount: 0,
          providerCount: 0,
          tagCount: 0,
          bookmarkTagCount: 0,
        },
        data: {
          bookmarks: [
            {
              id: 'new-bookmark',
              url: 'https://new.com',
              title: 'New',
              version: 1,
              hidden: false,
              dateAdded: '2024-01-01T00:00:00.000Z',
              lastModified: '2024-01-02T00:00:00.000Z',
            },
          ],
          content: [],
          relatedPages: [],
          embeddingProviders: [],
          embeddings: [],
          tags: [],
          bookmarkTags: [],
          settings: {},
        },
      };

      const result = await service.importAllData(exportData, {
        clearExisting: false,
      });

      expect(result.success).toBe(true);

      const bookmarks = await db.bookmarks.toArray();
      expect(bookmarks).toHaveLength(2);
      expect(bookmarks.map((b) => b.id)).toContain('existing-bookmark');
      expect(bookmarks.map((b) => b.id)).toContain('new-bookmark');
    });

    it('should call progress callback during import', async () => {
      const onProgress = jest.fn();

      const exportData = {
        version: EXPORT_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        appVersion: '0.1.0',
        metadata: {
          bookmarkCount: 2,
          embeddingCount: 0,
          contentCount: 0,
          relatedPageCount: 0,
          providerCount: 0,
          tagCount: 0,
          bookmarkTagCount: 0,
        },
        data: {
          bookmarks: [
            {
              id: 'bookmark-1',
              url: 'https://example1.com',
              title: 'Test 1',
              version: 1,
              hidden: false,
              dateAdded: '2024-01-01T00:00:00.000Z',
              lastModified: '2024-01-02T00:00:00.000Z',
            },
            {
              id: 'bookmark-2',
              url: 'https://example2.com',
              title: 'Test 2',
              version: 1,
              hidden: false,
              dateAdded: '2024-01-01T00:00:00.000Z',
              lastModified: '2024-01-02T00:00:00.000Z',
            },
          ],
          content: [],
          relatedPages: [],
          embeddingProviders: [],
          embeddings: [],
          tags: [],
          bookmarkTags: [],
          settings: {},
        },
      };

      await service.importAllData(exportData, { onProgress });

      expect(onProgress).toHaveBeenCalled();
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: expect.any(String),
          current: expect.any(Number),
          total: expect.any(Number),
        })
      );
    });

    it('should import settings to browser storage', async () => {
      const mockSettings: Settings = {
        crawler: {
          enabled: true,
          defaultDepth: 2,
          maxLinksPerPage: 10,
          sameOriginOnly: true,
          rateLimitMs: 200,
          respectRobotsTxt: true,
          autoRetryOnFailure: true,
          maxRetries: 3,
        },
        aiProvider: {
          enabled: false,
          type: 'localai',
          endpoint: 'http://localhost:8080',
          modelName: 'test-model',
          isConnected: false,
        },
      };

      const exportData = {
        version: EXPORT_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        appVersion: '0.1.0',
        metadata: {
          bookmarkCount: 0,
          embeddingCount: 0,
          contentCount: 0,
          relatedPageCount: 0,
          providerCount: 0,
          tagCount: 0,
          bookmarkTagCount: 0,
        },
        data: {
          bookmarks: [],
          content: [],
          relatedPages: [],
          embeddingProviders: [],
          embeddings: [],
          tags: [],
          bookmarkTags: [],
          settings: mockSettings,
        },
      };

      await service.importAllData(exportData);

      expect(browser.storage.sync.set).toHaveBeenCalledWith({
        app_settings: mockSettings,
      });
    });
  });

  describe('importFromFile', () => {
    it('should parse and import valid JSON file', async () => {
      const exportData = {
        version: EXPORT_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        appVersion: '0.1.0',
        metadata: {
          bookmarkCount: 1,
          embeddingCount: 0,
          contentCount: 0,
          relatedPageCount: 0,
          providerCount: 0,
          tagCount: 0,
          bookmarkTagCount: 0,
        },
        data: {
          bookmarks: [
            {
              id: 'bookmark-1',
              url: 'https://example.com',
              title: 'Test',
              version: 1,
              hidden: false,
              dateAdded: '2024-01-01T00:00:00.000Z',
              lastModified: '2024-01-02T00:00:00.000Z',
            },
          ],
          content: [],
          relatedPages: [],
          embeddingProviders: [],
          embeddings: [],
          tags: [],
          bookmarkTags: [],
          settings: {},
        },
      };

      const fileContent = JSON.stringify(exportData);
      const file = new File([fileContent], 'export.json', {
        type: 'application/json',
      });

      file.text = jest.fn().mockResolvedValue(fileContent);

      const result = await service.importFromFile(file);

      if (!result.success) {
        console.log('Import errors:', result.errors);
      }
      expect(result.success).toBe(true);
      expect(result.imported.bookmarks).toBe(1);
    });

    it('should handle invalid JSON file', async () => {
      const file = new File(['invalid json{'], 'export.json', {
        type: 'application/json',
      });

      const result = await service.importFromFile(file);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Failed to parse import file');
    });
  });
});
