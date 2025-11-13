import { Search, SlidersHorizontal, X } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';

import { BookmarkDetailModal } from '../components/BookmarkDetailModal';
import { BookmarkList } from '../components/BookmarkList';
import { FilterModal } from '../components/FilterModal';
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
  const [isLoading, setIsLoading] = useState(true);

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

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  useEffect(() => {
    void loadBookmarks();
    void loadTags();
  }, []);

  const loadBookmarks = async () => {
    setIsLoading(true);
    try {
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
    } finally {
      setIsLoading(false);
    }
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

  const getActiveFilterCount = () => {
    let count = 0;

    if (visibilityFilter !== 'visible') {count++;}
    count += selectedTagIds.size;
    if (statusFilters.crawled !== 'all') {count++;}
    if (statusFilters.indexed !== 'all') {count++;}
    if (statusFilters.aiSummary !== 'all') {count++;}
    if (statusFilters.userDescription !== 'all') {count++;}
    if (statusFilters.stale !== 'all') {count++;}

    return count;
  };

  const hasActiveFilters = getActiveFilterCount() > 0;

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

      <div className="search-container-modern">
        <div className="search-bar-wrapper">
          <div className="search-input-modern">
            <Search size={18} className="search-icon-modern" />
            <input
              type="text"
              placeholder="Search bookmarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="clear-btn-modern"
                onClick={() => setSearchTerm('')}
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            className={`filter-btn-modern ${hasActiveFilters ? 'active' : ''}`}
            onClick={() => setIsFilterModalOpen(true)}
            title="Filters"
          >
            <SlidersHorizontal size={18} />
            {hasActiveFilters && (
              <span className="filter-badge">{getActiveFilterCount()}</span>
            )}
          </button>
        </div>
      </div>

      {!isLoading && (
        <div style={{ fontSize: '12px', color: '#999', marginBottom: '12px' }}>
          Showing {filteredBookmarks.length} of {bookmarks.length} bookmark
          {bookmarks.length !== 1 ? 's' : ''}
        </div>
      )}

      <BookmarkList
        bookmarks={filteredBookmarks}
        isLoading={isLoading}
        onBookmarkClick={handleBookmarkClick}
      />

      {selectedBookmark && (
        <BookmarkDetailModal
          bookmark={selectedBookmark}
          onClose={handleCloseModal}
          onSave={() => void handleSaveBookmark()}
        />
      )}

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={() => setIsFilterModalOpen(false)}
        visibilityFilter={visibilityFilter}
        onVisibilityChange={toggleVisibility}
        allTags={allTags}
        selectedTagIds={selectedTagIds}
        onToggleTag={toggleTag}
        statusFilters={statusFilters}
        onStatusFilterChange={setStatusFilters}
      />
    </Layout>
  );
};
