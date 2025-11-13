import {
  Globe,
  CheckCircle,
  FileText,
  MessageSquare,
  Tag as TagIcon,
  EyeOff,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { LoadingSpinner } from './LoadingSpinner';

import type { BookmarkStatus } from '@/services/BookmarkStatusService';
import type { Bookmark } from '@/types/bookmark';
import type { Tag } from '@/types/tag';

import { BookmarkStatusService } from '@/services/BookmarkStatusService';
import { TagService } from '@/services/TagService';

const tagService = TagService.getInstance();
const statusService = BookmarkStatusService.getInstance();

interface BookmarkListProps {
  bookmarks: Bookmark[];
  isLoading: boolean;
  onBookmarkClick: (bookmark: Bookmark) => void;
}

export const BookmarkList: React.FC<BookmarkListProps> = ({
  bookmarks,
  isLoading,
  onBookmarkClick,
}) => {
  const [bookmarkTags, setBookmarkTags] = useState<Map<string, Tag[]>>(
    new Map()
  );
  const [bookmarkStatuses, setBookmarkStatuses] = useState<
    Map<string, BookmarkStatus>
  >(new Map());

  useEffect(() => {
    void loadTags();
    void loadStatuses();
  }, [bookmarks]);

  const loadTags = async () => {
    const tagsMap = new Map<string, Tag[]>();

    for (const bookmark of bookmarks) {
      const tags = await tagService.getBookmarkTags(bookmark.id);
      tagsMap.set(bookmark.id, tags);
    }

    setBookmarkTags(tagsMap);
  };

  const loadStatuses = async () => {
    const statuses = await statusService.getBatchStatus(bookmarks);
    setBookmarkStatuses(statuses);
  };

  const extractDomain = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="large" message="Loading bookmarks..." />;
  }

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
    <div className="bookmarks-list-modern">
      {bookmarks.map((bookmark) => {
        const tags = bookmarkTags.get(bookmark.id) ?? [];
        const status = bookmarkStatuses.get(bookmark.id);
        const domain = extractDomain(bookmark.url);

        return (
          <div
            key={bookmark.id}
            className={`bookmark-card-modern ${bookmark.hidden ? 'hidden' : ''}`}
            onClick={() => onBookmarkClick(bookmark)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onBookmarkClick(bookmark);
              }
            }}
          >
            <div className="bookmark-card-header">
              <div className="bookmark-favicon">
                {bookmark.favicon ? (
                  <img src={bookmark.favicon} alt="" />
                ) : (
                  <Globe size={20} />
                )}
              </div>
              <div className="bookmark-card-info">
                <div className="bookmark-card-title">
                  {bookmark.title}
                  {bookmark.hidden && (
                    <span className="bookmark-hidden-badge">
                      <EyeOff size={12} />
                    </span>
                  )}
                </div>
                <div className="bookmark-card-domain">{domain}</div>
              </div>
            </div>

            <div className="bookmark-card-footer">
              <div className="bookmark-status-icons">
                {status?.isCrawled && (
                  <div className="status-icon" title="Crawled">
                    <CheckCircle size={14} />
                  </div>
                )}
                {status?.isIndexed && (
                  <div className="status-icon" title="Indexed">
                    <FileText size={14} />
                  </div>
                )}
                {status?.hasAISummary && (
                  <div className="status-icon" title="AI Summary">
                    <MessageSquare size={14} />
                  </div>
                )}
              </div>

              {tags.length > 0 && (
                <div className="bookmark-card-tags">
                  <TagIcon size={12} />
                  <span className="tag-count">{tags.length}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
