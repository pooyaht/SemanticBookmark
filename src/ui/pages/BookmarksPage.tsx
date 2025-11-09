import React, { useState, useEffect } from 'react';

import { Layout } from '../components/Layout';
import { BookmarkList } from '../components/BookmarkList';
import { BookmarkDetailModal } from '../components/BookmarkDetailModal';
import type { Bookmark } from '@/types/bookmark';
import { BookmarkService } from '@/services/BookmarkService';

const bookmarkService = new BookmarkService();

export const BookmarksPage: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(
    null
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    const allBookmarks = await bookmarkService.getAllBookmarks();
    setBookmarks(allBookmarks);
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
    } catch (error) {
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

      <div style={{ fontSize: '12px', color: '#999', marginBottom: '12px' }}>
        {bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''}
      </div>

      <BookmarkList bookmarks={bookmarks} onBookmarkClick={handleBookmarkClick} />

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
