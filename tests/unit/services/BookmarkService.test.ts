import browser from 'webextension-polyfill';

import { BookmarkService } from '@/services/BookmarkService';
import { db } from '@/storage/database';

jest.mock('webextension-polyfill', () => ({
  bookmarks: {
    getTree: jest.fn(),
  },
}));

describe('BookmarkService', () => {
  let bookmarkService: BookmarkService;

  beforeEach(async () => {
    await db.delete();
    await db.open();
    bookmarkService = new BookmarkService();
  });

  afterEach(async () => {
    await db.delete();
  });

  describe('Folder Path Handling', () => {
    it('should not tag bookmarks in root folders', async () => {
      const mockTree = [
        {
          id: 'root',
          title: '',
          children: [
            {
              id: 'toolbar',
              title: 'Bookmarks Toolbar',
              children: [
                {
                  id: '1',
                  title: 'My Bookmark',
                  url: 'https://example.com',
                  dateAdded: Date.now(),
                },
              ],
            },
          ],
        },
      ];

      (browser.bookmarks.getTree as jest.Mock).mockResolvedValue(mockTree);

      await bookmarkService.syncBookmarks();

      const bookmarks = await db.bookmarks.toArray();
      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0].folderPath).toBeUndefined();
      expect(bookmarks[0].title).toBe('My Bookmark');
    });

    it('should tag bookmarks in subfolders', async () => {
      const mockTree = [
        {
          id: 'root',
          title: '',
          children: [
            {
              id: 'toolbar',
              title: 'Bookmarks Toolbar',
              children: [
                {
                  id: 'work-folder',
                  title: 'Work',
                  children: [
                    {
                      id: '1',
                      title: 'My Work Bookmark',
                      url: 'https://work.com',
                      dateAdded: Date.now(),
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      (browser.bookmarks.getTree as jest.Mock).mockResolvedValue(mockTree);

      await bookmarkService.syncBookmarks();

      const bookmarks = await db.bookmarks.toArray();
      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0].folderPath).toBe('Work');
      expect(bookmarks[0].title).toBe('My Work Bookmark');
    });

    it('should create hierarchical folder paths', async () => {
      const mockTree = [
        {
          id: 'root',
          title: '',
          children: [
            {
              id: 'toolbar',
              title: 'Bookmarks Toolbar',
              children: [
                {
                  id: 'work',
                  title: 'Work',
                  children: [
                    {
                      id: 'projects',
                      title: 'Projects',
                      children: [
                        {
                          id: '2025',
                          title: '2025',
                          children: [
                            {
                              id: '1',
                              title: 'Project Doc',
                              url: 'https://docs.com',
                              dateAdded: Date.now(),
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      (browser.bookmarks.getTree as jest.Mock).mockResolvedValue(mockTree);

      await bookmarkService.syncBookmarks();

      const bookmarks = await db.bookmarks.toArray();
      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0].folderPath).toBe('Work/Projects/2025');
    });

    it('should handle all Firefox root folders', async () => {
      const rootFolders = [
        'Bookmarks Bar',
        'Bookmarks Menu',
        'Bookmarks Toolbar',
        'Other Bookmarks',
        'Mobile Bookmarks',
        'Unfiled Bookmarks',
      ];

      for (const rootFolder of rootFolders) {
        await db.delete();
        await db.open();

        const mockTree = [
          {
            id: 'root',
            title: '',
            children: [
              {
                id: 'root-folder',
                title: rootFolder,
                children: [
                  {
                    id: '1',
                    title: 'Test Bookmark',
                    url: 'https://test.com',
                    dateAdded: Date.now(),
                  },
                ],
              },
            ],
          },
        ];

        (browser.bookmarks.getTree as jest.Mock).mockResolvedValue(mockTree);

        await bookmarkService.syncBookmarks();

        const bookmarks = await db.bookmarks.toArray();
        expect(bookmarks).toHaveLength(1);
        expect(bookmarks[0].folderPath).toBeUndefined();
      }
    });

    it('should handle mixed root and nested bookmarks', async () => {
      const mockTree = [
        {
          id: 'root',
          title: '',
          children: [
            {
              id: 'toolbar',
              title: 'Bookmarks Toolbar',
              children: [
                {
                  id: '1',
                  title: 'Root Bookmark',
                  url: 'https://root.com',
                  dateAdded: Date.now(),
                },
                {
                  id: 'folder',
                  title: 'MyFolder',
                  children: [
                    {
                      id: '2',
                      title: 'Nested Bookmark',
                      url: 'https://nested.com',
                      dateAdded: Date.now(),
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      (browser.bookmarks.getTree as jest.Mock).mockResolvedValue(mockTree);

      await bookmarkService.syncBookmarks();

      const bookmarks = await db.bookmarks.toArray();
      expect(bookmarks).toHaveLength(2);

      const rootBookmark = bookmarks.find((b) => b.id === '1');
      const nestedBookmark = bookmarks.find((b) => b.id === '2');

      expect(rootBookmark?.folderPath).toBeUndefined();
      expect(nestedBookmark?.folderPath).toBe('MyFolder');
    });

    it('should not include bookmark title in folder path', async () => {
      const mockTree = [
        {
          id: 'root',
          title: '',
          children: [
            {
              id: 'toolbar',
              title: 'Other Bookmarks',
              children: [
                {
                  id: '1',
                  title:
                    'IGRICE Za Decu Od 3 Do 103 godine - ServiceWorker Cookbook',
                  url: 'https://example.com',
                  dateAdded: Date.now(),
                },
              ],
            },
          ],
        },
      ];

      (browser.bookmarks.getTree as jest.Mock).mockResolvedValue(mockTree);

      await bookmarkService.syncBookmarks();

      const bookmarks = await db.bookmarks.toArray();
      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0].folderPath).toBeUndefined();
      expect(bookmarks[0].title).toBe(
        'IGRICE Za Decu Od 3 Do 103 godine - ServiceWorker Cookbook'
      );
    });

    it('should handle folders without titles', async () => {
      const mockTree = [
        {
          id: 'root',
          title: '',
          children: [
            {
              id: 'toolbar',
              title: 'Bookmarks Toolbar',
              children: [
                {
                  id: 'folder-no-title',
                  title: null,
                  children: [
                    {
                      id: '1',
                      title: 'Bookmark in Untitled Folder',
                      url: 'https://test.com',
                      dateAdded: Date.now(),
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      (browser.bookmarks.getTree as jest.Mock).mockResolvedValue(mockTree);

      await bookmarkService.syncBookmarks();

      const bookmarks = await db.bookmarks.toArray();
      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0].folderPath).toBeUndefined();
    });
  });

  describe('Folder Tag Assignment', () => {
    it('should assign folder tags to nested bookmarks', async () => {
      const mockTree = [
        {
          id: 'root',
          title: '',
          children: [
            {
              id: 'toolbar',
              title: 'Bookmarks Toolbar',
              children: [
                {
                  id: 'work',
                  title: 'Work',
                  children: [
                    {
                      id: '1',
                      title: 'Work Bookmark',
                      url: 'https://work.com',
                      dateAdded: Date.now(),
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      (browser.bookmarks.getTree as jest.Mock).mockResolvedValue(mockTree);

      await bookmarkService.syncBookmarks();

      const tags = await db.tags.toArray();
      const folderTags = tags.filter((t) => t.source === 'folder');

      expect(folderTags).toHaveLength(1);
      expect(folderTags[0].name).toBe('Work');

      const bookmarkTags = await db.bookmarkTags.toArray();
      expect(bookmarkTags).toHaveLength(1);
      expect(bookmarkTags[0].bookmarkId).toBe('1');
      expect(bookmarkTags[0].tagId).toBe(folderTags[0].id);
    });

    it('should not assign folder tags to root folder bookmarks', async () => {
      const mockTree = [
        {
          id: 'root',
          title: '',
          children: [
            {
              id: 'toolbar',
              title: 'Bookmarks Toolbar',
              children: [
                {
                  id: '1',
                  title: 'Root Bookmark',
                  url: 'https://root.com',
                  dateAdded: Date.now(),
                },
              ],
            },
          ],
        },
      ];

      (browser.bookmarks.getTree as jest.Mock).mockResolvedValue(mockTree);

      await bookmarkService.syncBookmarks();

      const folderTags = await db.tags
        .where('source')
        .equals('folder')
        .toArray();
      expect(folderTags).toHaveLength(0);

      const bookmarkTags = await db.bookmarkTags.toArray();
      expect(bookmarkTags).toHaveLength(0);
    });
  });
});
