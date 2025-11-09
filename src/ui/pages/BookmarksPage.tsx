import React, { useState, useEffect, useMemo } from 'react';

import { BookmarkDetailModal } from '../components/BookmarkDetailModal';
import { BookmarkList } from '../components/BookmarkList';
import { Layout } from '../components/Layout';

import type { Bookmark } from '@/types/bookmark';
import type { Tag } from '@/types/tag';

import { BookmarkService } from '@/services/BookmarkService';
import { TagService } from '@/services/TagService';

const bookmarkService = new BookmarkService();
const tagService = new TagService();

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

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>('visible');

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

      if (selectedTagIds.size === 0) {
        return true;
      }

      const bookmarkTagIds = bookmarkTags.get(bookmark.id) ?? [];
      return Array.from(selectedTagIds).every((tagId) =>
        bookmarkTagIds.includes(tagId)
      );
    });
  }, [bookmarks, bookmarkTags, searchTerm, visibilityFilter, selectedTagIds]);

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
        <button
          className="btn btn-primary btn-small"
          onClick={() => void handleSync()}
          disabled={isSyncing}
        >
          {isSyncing ? 'Syncing...' : 'Sync'}
        </button>
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
