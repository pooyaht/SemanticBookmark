import React, { useState, useEffect } from 'react';

import type { Bookmark } from '@/types/bookmark';
import type { Tag } from '@/types/tag';

import { TagService } from '@/services/TagService';

const tagService = new TagService();

interface BookmarkListProps {
  bookmarks: Bookmark[];
  onBookmarkClick: (bookmark: Bookmark) => void;
}

export const BookmarkList: React.FC<BookmarkListProps> = ({
  bookmarks,
  onBookmarkClick,
}) => {
  const [bookmarkTags, setBookmarkTags] = useState<Map<string, Tag[]>>(
    new Map()
  );

  useEffect(() => {
    void loadTags();
  }, [bookmarks]);

  const loadTags = async () => {
    const tagsMap = new Map<string, Tag[]>();

    for (const bookmark of bookmarks) {
      const tags = await tagService.getBookmarkTags(bookmark.id);
      tagsMap.set(bookmark.id, tags);
    }

    setBookmarkTags(tagsMap);
  };

  const truncateUrl = (url: string, maxLength: number) => {
    if (url.length <= maxLength) {
      return url;
    }
    return `${url.substring(0, maxLength)}...`;
  };

  if (bookmarks.length === 0) {
    return (
      <div className="empty-state">
        <svg fill="currentColor" viewBox="0 0 24 24">
          <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z" />
        </svg>
        <p>No bookmarks found</p>
        <p style={{ fontSize: '12px', color: '#999' }}>
          Click Sync to load your browser bookmarks
        </p>
      </div>
    );
  }

  return (
    <div className="bookmarks-list">
      {bookmarks.map((bookmark) => {
        const tags = bookmarkTags.get(bookmark.id) ?? [];

        return (
          <div
            key={bookmark.id}
            className={`bookmark-item ${bookmark.hidden ? 'hidden' : ''}`}
            onClick={() => onBookmarkClick(bookmark)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onBookmarkClick(bookmark);
              }
            }}
          >
            <div className="bookmark-icon">
              {bookmark.favicon ? (
                <img src={bookmark.favicon} alt="" />
              ) : (
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              )}
            </div>
            <div className="bookmark-info">
              <div className="bookmark-title">
                {bookmark.title}
                {bookmark.hidden && (
                  <span className="hidden-badge">Hidden</span>
                )}
              </div>
              <div className="bookmark-url">
                {truncateUrl(bookmark.url, 50)}
              </div>
              {tags.length > 0 && (
                <div className="bookmark-tags">
                  {tags.slice(0, 3).map((tag) => (
                    <span key={tag.id} className="tag-chip">
                      {tag.name}
                    </span>
                  ))}
                  {tags.length > 3 && (
                    <span className="tag-chip more">+{tags.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
