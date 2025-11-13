import React, { useState, useEffect, useMemo } from 'react';

import { BookmarkDetailModal } from '../components/BookmarkDetailModal';
import { BookmarkList } from '../components/BookmarkList';
import { Layout } from '../components/Layout';

import type { BookmarkStatus } from '@/services/BookmarkStatusService';
import type { Bookmark } from '@/types/bookmark';
import type { Tag } from '@/types/tag';

import { BookmarkService } from '@/services/BookmarkService';
import { BookmarkStatusService } from '@/services/BookmarkStatusService';
import { EmbeddingProviderService } from '@/services/EmbeddingProviderService';
import { IndexingService } from '@/services/IndexingService';
import { TagService } from '@/services/TagService';

const bookmarkService = BookmarkService.getInstance();
const tagService = TagService.getInstance();
const indexingService = IndexingService.getInstance();
const providerService = EmbeddingProviderService.getInstance();
const statusService = BookmarkStatusService.getInstance();

type VisibilityFilter = 'all' | 'visible' | 'hidden';

export const BookmarksPage: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [bookmarkTags, setBookmarkTags] = useState<Map<string, string[]>>(
    new Map()
  );
  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(
    null
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const [bookmarkStatuses, setBookmarkStatuses] = useState<
    Map<string, BookmarkStatus>
  >(new Map());

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>('visible');

  const [statusFilters, setStatusFilters] = useState({
    crawled: 'all' as 'all' | 'yes' | 'no',
    indexed: 'all' as 'all' | 'yes' | 'no',
    aiSummary: 'all' as 'all' | 'yes' | 'no',
    userDescription: 'all' as 'all' | 'yes' | 'no',
    stale: 'all' as 'all' | 'yes' | 'no',
  });

  useEffect(() => {
    void loadBookmarks();
    void loadTags();
  }, []);

  const loadBookmarks = async () => {
    const allBookmarks = await bookmarkService.getAllBookmarks();
    setBookmarks(allBookmarks);

    const tagsMap = new Map<string, string[]>();
    for (const bookmark of allBookmarks) {
      const tags = await tagService.getBookmarkTags(bookmark.id);
      tagsMap.set(
        bookmark.id,
        tags.map((t) => t.id)
      );
    }
    setBookmarkTags(tagsMap);

    const statuses = await statusService.getBatchStatus(allBookmarks);
    setBookmarkStatuses(statuses);
  };

  const loadTags = async () => {
    const tags = await tagService.getAllTags();
    setAllTags(tags);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const result = await bookmarkService.syncBookmarks();
      setSyncMessage(
        `Synced: ${result.added} added, ${result.removed} removed`
      );
      await loadBookmarks();
      await loadTags();
    } catch {
      setSyncMessage('Sync failed. Please try again.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 3000);
    }
  };

  const handleIndexAll = async () => {
    const activeProvider = await providerService.getActiveProvider();
    if (!activeProvider) {
      alert('No active embedding provider. Please configure one in settings.');
      return;
    }

    if (
      !confirm(
        `This will generate embeddings for all ${bookmarks.length} bookmarks. This may take a while. Continue?`
      )
    ) {
      return;
    }

    setIsIndexing(true);
    setIndexingProgress({ current: 0, total: bookmarks.length });

    try {
      await indexingService.indexAllBookmarks((progress) => {
        setIndexingProgress({
          current: progress.current,
          total: progress.total,
        });
      });

      alert(
        `Indexing complete!\nSucceeded: ${indexingProgress?.current ?? 0} / ${indexingProgress?.total ?? 0}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      alert(`Indexing failed: ${errorMessage}`);
    } finally {
      setIsIndexing(false);
      setIndexingProgress(null);
    }
  };

  const handleBookmarkClick = (bookmark: Bookmark) => {
    setSelectedBookmark(bookmark);
  };

  const handleCloseModal = () => {
    setSelectedBookmark(null);
  };

  const handleSaveBookmark = async () => {
    await loadBookmarks();
    setSelectedBookmark(null);
  };

  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((bookmark) => {
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch =
        searchLower === '' ||
        bookmark.title.toLowerCase().includes(searchLower) ||
        bookmark.url.toLowerCase().includes(searchLower);

      const matchesVisibility =
        visibilityFilter === 'all' ||
        (visibilityFilter === 'visible' && !bookmark.hidden) ||
        (visibilityFilter === 'hidden' && bookmark.hidden);

      if (!matchesSearch || !matchesVisibility) {
        return false;
      }

      if (selectedTagIds.size > 0) {
        const bookmarkTagIds = bookmarkTags.get(bookmark.id) ?? [];
        const matchesTags = Array.from(selectedTagIds).every((tagId) =>
          bookmarkTagIds.includes(tagId)
        );
        if (!matchesTags) {
          return false;
        }
      }

      const status = bookmarkStatuses.get(bookmark.id);
      if (!status) {
        return false;
      }

      if (statusFilters.crawled !== 'all') {
        const shouldBeCrawled = statusFilters.crawled === 'yes';
        if (status.isCrawled !== shouldBeCrawled) {
          return false;
        }
      }

      if (statusFilters.indexed !== 'all') {
        const shouldBeIndexed = statusFilters.indexed === 'yes';
        if (status.isIndexed !== shouldBeIndexed) {
          return false;
        }
      }

      if (statusFilters.aiSummary !== 'all') {
        const shouldHaveAISummary = statusFilters.aiSummary === 'yes';
        if (status.hasAISummary !== shouldHaveAISummary) {
          return false;
        }
      }

      if (statusFilters.userDescription !== 'all') {
        const shouldHaveUserDesc = statusFilters.userDescription === 'yes';
        if (status.hasUserDescription !== shouldHaveUserDesc) {
          return false;
        }
      }

      if (statusFilters.stale !== 'all') {
        const shouldBeStale = statusFilters.stale === 'yes';
        if (status.isStale !== shouldBeStale) {
          return false;
        }
      }

      return true;
    });
  }, [
    bookmarks,
    bookmarkTags,
    searchTerm,
    visibilityFilter,
    selectedTagIds,
    statusFilters,
    bookmarkStatuses,
  ]);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) {
        newSet.delete(tagId);
      } else {
        newSet.add(tagId);
      }
      return newSet;
    });
  };

  const toggleVisibility = (filter: VisibilityFilter) => {
    setVisibilityFilter(filter);
  };

  return (
    <Layout currentPage="bookmarks">
      <div className="header">
        <h1>Bookmarks</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary btn-small"
            onClick={() => {
              void handleIndexAll();
            }}
            disabled={isIndexing || isSyncing}
          >
            {isIndexing ? 'Indexing...' : 'Index All'}
          </button>
          <button
            className="btn btn-primary btn-small"
            onClick={() => void handleSync()}
            disabled={isSyncing || isIndexing}
          >
            {isSyncing ? 'Syncing...' : 'Sync'}
          </button>
        </div>
      </div>

      {syncMessage && (
        <div
          style={{
            padding: '8px 12px',
            background: '#e8f5e9',
            borderRadius: '4px',
            fontSize: '12px',
            marginBottom: '12px',
            color: '#2e7d32',
          }}
        >
          {syncMessage}
        </div>
      )}

      {indexingProgress && (
        <div
          style={{
            padding: '8px 12px',
            background: '#e3f2fd',
            borderRadius: '4px',
            fontSize: '12px',
            marginBottom: '12px',
            color: '#1565c0',
          }}
        >
          Indexing: {indexingProgress.current} / {indexingProgress.total}{' '}
          bookmarks
        </div>
      )}

      <div className="search-container">
        <div className="search-input-wrapper">
          <svg className="search-icon" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search bookmarks by title or URL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchTerm('')}
              title="Clear search"
            >
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          )}
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: '#666',
              marginBottom: '6px',
            }}
          >
            Visibility
          </div>
          <div className="category-filters">
            <label className="category-filter-item">
              <input
                type="radio"
                name="visibility"
                checked={visibilityFilter === 'all'}
                onChange={() => toggleVisibility('all')}
              />
              <span>All</span>
            </label>
            <label className="category-filter-item">
              <input
                type="radio"
                name="visibility"
                checked={visibilityFilter === 'visible'}
                onChange={() => toggleVisibility('visible')}
              />
              <span>Visible</span>
            </label>
            <label className="category-filter-item">
              <input
                type="radio"
                name="visibility"
                checked={visibilityFilter === 'hidden'}
                onChange={() => toggleVisibility('hidden')}
              />
              <span>Hidden</span>
            </label>
          </div>
        </div>

        {allTags.length > 0 && (
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: '#666',
                marginBottom: '6px',
              }}
            >
              Filter by Tags{' '}
              {selectedTagIds.size > 0 && `(${selectedTagIds.size})`}
            </div>
            <div className="category-filters">
              {allTags.map((tag) => (
                <label key={tag.id} className="category-filter-item">
                  <input
                    type="checkbox"
                    checked={selectedTagIds.has(tag.id)}
                    onChange={() => toggleTag(tag.id)}
                  />
                  <span>{tag.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '16px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: '#666',
              marginBottom: '6px',
            }}
          >
            Status Filters
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  marginBottom: '4px',
                }}
              >
                Crawled
              </div>
              <div className="category-filters">
                <label className="category-filter-item">
                  <input
                    type="radio"
                    name="crawled"
                    checked={statusFilters.crawled === 'all'}
                    onChange={() =>
                      setStatusFilters({ ...statusFilters, crawled: 'all' })
                    }
                  />
                  <span>All</span>
                </label>
                <label className="category-filter-item">
                  <input
                    type="radio"
                    name="crawled"
                    checked={statusFilters.crawled === 'yes'}
                    onChange={() =>
                      setStatusFilters({ ...statusFilters, crawled: 'yes' })
                    }
                  />
                  <span>Yes</span>
                </label>
                <label className="category-filter-item">
                  <input
                    type="radio"
                    name="crawled"
                    checked={statusFilters.crawled === 'no'}
                    onChange={() =>
                      setStatusFilters({ ...statusFilters, crawled: 'no' })
                    }
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  marginBottom: '4px',
                }}
              >
                Indexed
              </div>
              <div className="category-filters">
                <label className="category-filter-item">
                  <input
                    type="radio"
                    name="indexed"
                    checked={statusFilters.indexed === 'all'}
                    onChange={() =>
                      setStatusFilters({ ...statusFilters, indexed: 'all' })
                    }
                  />
                  <span>All</span>
                </label>
                <label className="category-filter-item">
                  <input
                    type="radio"
                    name="indexed"
                    checked={statusFilters.indexed === 'yes'}
                    onChange={() =>
                      setStatusFilters({ ...statusFilters, indexed: 'yes' })
                    }
                  />
                  <span>Yes</span>
                </label>
                <label className="category-filter-item">
                  <input
                    type="radio"
                    name="indexed"
                    checked={statusFilters.indexed === 'no'}
                    onChange={() =>
                      setStatusFilters({ ...statusFilters, indexed: 'no' })
                    }
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  marginBottom: '4px',
                }}
              >
                AI Summary
              </div>
              <div className="category-filters">
                <label className="category-filter-item">
                  <input
                    type="radio"
                    name="aiSummary"
                    checked={statusFilters.aiSummary === 'all'}
                    onChange={() =>
                      setStatusFilters({ ...statusFilters, aiSummary: 'all' })
                    }
                  />
                  <span>All</span>
                </label>
                <label className="category-filter-item">
                  <input
                    type="radio"
                    name="aiSummary"
                    checked={statusFilters.aiSummary === 'yes'}
                    onChange={() =>
                      setStatusFilters({ ...statusFilters, aiSummary: 'yes' })
                    }
                  />
                  <span>Yes</span>
                </label>
                <label className="category-filter-item">
                  <input
                    type="radio"
                    name="aiSummary"
                    checked={statusFilters.aiSummary === 'no'}
                    onChange={() =>
                      setStatusFilters({ ...statusFilters, aiSummary: 'no' })
                    }
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  marginBottom: '4px',
                }}
              >
                User Description
              </div>
              <div className="category-filters">
                <label className="category-filter-item">
                  <input
                    type="radio"
                    name="userDescription"
                    checked={statusFilters.userDescription === 'all'}
                    onChange={() =>
                      setStatusFilters({
                        ...statusFilters,
                        userDescription: 'all',
                      })
                    }
                  />
                  <span>All</span>
                </label>
                <label className="category-filter-item">
                  <input
                    type="radio"
                    name="userDescription"
                    checked={statusFilters.userDescription === 'yes'}
                    onChange={() =>
                      setStatusFilters({
                        ...statusFilters,
                        userDescription: 'yes',
                      })
                    }
                  />
                  <span>Yes</span>
                </label>
                <label className="category-filter-item">
                  <input
                    type="radio"
                    name="userDescription"
                    checked={statusFilters.userDescription === 'no'}
                    onChange={() =>
                      setStatusFilters({
                        ...statusFilters,
                        userDescription: 'no',
                      })
                    }
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  marginBottom: '4px',
                }}
              >
                Stale Embeddings
              </div>
              <div className="category-filters">
                <label className="category-filter-item">
                  <input
                    type="radio"
                    name="stale"
                    checked={statusFilters.stale === 'all'}
                    onChange={() =>
                      setStatusFilters({ ...statusFilters, stale: 'all' })
                    }
                  />
                  <span>All</span>
                </label>
                <label className="category-filter-item">
                  <input
                    type="radio"
                    name="stale"
                    checked={statusFilters.stale === 'yes'}
                    onChange={() =>
                      setStatusFilters({ ...statusFilters, stale: 'yes' })
                    }
                  />
                  <span>Yes</span>
                </label>
                <label className="category-filter-item">
                  <input
                    type="radio"
                    name="stale"
                    checked={statusFilters.stale === 'no'}
                    onChange={() =>
                      setStatusFilters({ ...statusFilters, stale: 'no' })
                    }
                  />
                  <span>No</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ fontSize: '12px', color: '#999', marginBottom: '12px' }}>
        Showing {filteredBookmarks.length} of {bookmarks.length} bookmark
        {bookmarks.length !== 1 ? 's' : ''}
      </div>

      <BookmarkList
        bookmarks={filteredBookmarks}
        onBookmarkClick={handleBookmarkClick}
      />

      {selectedBookmark && (
        <BookmarkDetailModal
          bookmark={selectedBookmark}
          onClose={handleCloseModal}
          onSave={() => void handleSaveBookmark()}
        />
      )}
    </Layout>
  );
};
