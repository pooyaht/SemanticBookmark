import React, { useState, useEffect } from 'react';

import type { Bookmark } from '@/types/bookmark';
import type { Content, RelatedPage } from '@/types/content';
import type { Tag } from '@/types/tag';

import { BookmarkService } from '@/services/BookmarkService';
import { TagService } from '@/services/TagService';
import { ContentType } from '@/types/content';
import { TagAssignmentSource, TagSource } from '@/types/tag';

const bookmarkService = BookmarkService.getInstance();
const tagService = TagService.getInstance();

interface BookmarkDetailModalProps {
  bookmark: Bookmark;
  onClose: () => void;
  onSave: () => void;
}

export const BookmarkDetailModal: React.FC<BookmarkDetailModalProps> = ({
  bookmark,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(bookmark.title);
  const [userDescription, setUserDescription] = useState(
    bookmark.userDescription ?? ''
  );
  const [assignedTags, setAssignedTags] = useState<Tag[]>([]);
  const [originalTagIds, setOriginalTagIds] = useState<Set<string>>(new Set());
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);
  const [content, setContent] = useState<Content[]>([]);
  const [relatedPages, setRelatedPages] = useState<RelatedPage[]>([]);
  const [showContent, setShowContent] = useState(false);
  const [expandedContent, setExpandedContent] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    void loadData();
  }, [bookmark.id]);

  const loadData = async () => {
    const tags = await tagService.getBookmarkTags(bookmark.id);
    setAssignedTags(tags);
    setOriginalTagIds(new Set(tags.map((t) => t.id)));

    const allTags = await tagService.getAllTags();
    setAvailableTags(allTags);

    const bookmarkContent = await bookmarkService.getBookmarkContent(
      bookmark.id
    );
    setContent(bookmarkContent);

    const pages = await bookmarkService.getRelatedPages(bookmark.id);
    setRelatedPages(pages);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      if (title !== bookmark.title) {
        await bookmarkService.updateTitle(bookmark.id, title);
      }

      if (userDescription !== bookmark.userDescription) {
        await bookmarkService.updateUserDescription(
          bookmark.id,
          userDescription
        );
      }

      const currentTagIds = new Set(assignedTags.map((t) => t.id));
      const tagsToAdd = assignedTags.filter((t) => !originalTagIds.has(t.id));
      const tagsToRemove = Array.from(originalTagIds).filter(
        (id) => !currentTagIds.has(id)
      );

      for (const tag of tagsToAdd) {
        await tagService.assignTagToBookmark(
          bookmark.id,
          tag.id,
          TagAssignmentSource.USER
        );
      }

      for (const tagId of tagsToRemove) {
        await tagService.removeTagFromBookmark(bookmark.id, tagId);
      }

      onSave();
    } catch {
      alert('Failed to save bookmark. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleHidden = async () => {
    if (bookmark.hidden) {
      await bookmarkService.unhideBookmark(bookmark.id);
    } else {
      await bookmarkService.hideBookmark(bookmark.id);
    }
    onSave();
  };

  const handleCrawl = async () => {
    setIsCrawling(true);
    console.log(
      '[BookmarkDetailModal] Starting crawl for bookmark:',
      bookmark.id
    );
    try {
      await bookmarkService.crawlBookmark(bookmark.id);
      console.log('[BookmarkDetailModal] Crawl completed successfully');
      await loadData();
      setShowContent(true);
    } catch (error) {
      console.error('[BookmarkDetailModal] Crawl failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      alert(
        `Failed to crawl bookmark: ${errorMessage}\n\nCheck the browser console for detailed logs.`
      );
    } finally {
      setIsCrawling(false);
    }
  };

  const toggleContentExpansion = (url: string) => {
    setExpandedContent((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(url)) {
        newSet.delete(url);
      } else {
        newSet.add(url);
      }
      return newSet;
    });
  };

  const handleAddTag = (tag: Tag) => {
    if (assignedTags.some((t) => t.id === tag.id)) {
      return;
    }

    setAssignedTags([...assignedTags, tag]);
    setTagInput('');
    setShowSuggestions(false);
  };

  const handleRemoveTag = (tagId: string) => {
    setAssignedTags(assignedTags.filter((t) => t.id !== tagId));
  };

  const unassignedTags = availableTags.filter(
    (tag) => !assignedTags.some((t) => t.id === tag.id)
  );

  const filteredTags = unassignedTags.filter((tag) =>
    tag.name.toLowerCase().includes(tagInput.toLowerCase())
  );

  const groupedFilteredTags = {
    [TagSource.DEFAULT]: filteredTags.filter(
      (t) => t.source === TagSource.DEFAULT
    ),
    [TagSource.USER]: filteredTags.filter((t) => t.source === TagSource.USER),
    [TagSource.FOLDER]: filteredTags.filter(
      (t) => t.source === TagSource.FOLDER
    ),
    [TagSource.LLM]: filteredTags.filter((t) => t.source === TagSource.LLM),
  };

  const tagSourceLabels = {
    [TagSource.DEFAULT]: 'Default Tags',
    [TagSource.USER]: 'User Tags',
    [TagSource.FOLDER]: 'Folder Tags',
    [TagSource.LLM]: 'AI Tags',
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTagInput(value);
    setShowSuggestions(value.length > 0);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setTagInput('');
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="bookmark-modal-overlay" onClick={handleOverlayClick}>
      <div className="bookmark-modal-content">
        <div className="bookmark-modal-header">
          <h2>Bookmark Details</h2>
          <button className="icon-btn" onClick={onClose}>
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className="bookmark-modal-body">
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">URL</label>
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bookmark-link"
            >
              {bookmark.url}
            </a>
          </div>

          <div className="form-group">
            <label className="form-label">Tags</label>
            <div className="assigned-tags">
              {assignedTags.map((tag) => (
                <span key={tag.id} className="assigned-tag">
                  {tag.name}
                  <button
                    className="remove-tag-btn"
                    onClick={() => handleRemoveTag(tag.id)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            {unassignedTags.length > 0 ? (
              <div className="tag-input-wrapper">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Type to search and add tags..."
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={handleTagInputKeyDown}
                  onFocus={() => setShowSuggestions(tagInput.length > 0)}
                  onBlur={() =>
                    setTimeout(() => setShowSuggestions(false), 200)
                  }
                />
                {showSuggestions && filteredTags.length > 0 && (
                  <div className="tag-suggestions-grouped">
                    {Object.entries(groupedFilteredTags).map(
                      ([source, tags]) =>
                        tags.length > 0 ? (
                          <div key={source} className="tag-group">
                            <div className="tag-group-label">
                              {tagSourceLabels[source as TagSource]}
                            </div>
                            {tags.map((tag) => (
                              <div
                                key={tag.id}
                                className="tag-suggestion-item"
                                onClick={() => handleAddTag(tag)}
                              >
                                {tag.name}
                              </div>
                            ))}
                          </div>
                        ) : null
                    )}
                  </div>
                )}
                {showSuggestions && filteredTags.length === 0 && tagInput && (
                  <div className="tag-suggestions-grouped">
                    <div className="tag-no-results">
                      No matching tags found. Only existing tags can be
                      assigned.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="form-hint">
                {availableTags.length === 0
                  ? 'No tags available. Create tags in the Tags page first.'
                  : 'All available tags have been assigned.'}
              </div>
            )}
          </div>

          {bookmark.aiSummary && (
            <div className="form-group">
              <label className="form-label">AI Summary</label>
              <div className="form-value readonly">{bookmark.aiSummary}</div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">User Description</label>
            <textarea
              className="form-input form-textarea"
              placeholder="Add your own description..."
              value={userDescription}
              onChange={(e) => setUserDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Content Crawling</label>
            <div className="crawl-controls">
              <button
                className="btn btn-primary btn-small"
                onClick={() => void handleCrawl()}
                disabled={isCrawling}
              >
                {isCrawling ? 'Fetching Content...' : 'Fetch Content'}
              </button>
              {content.length > 0 && (
                <div className="crawl-status">
                  <span className="status-badge success">
                    Content crawled ({content.length} page
                    {content.length > 1 ? 's' : ''})
                  </span>
                  {content[0] && (
                    <span className="crawl-date">
                      Last crawled:{' '}
                      {new Date(content[0].fetchedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
              {content.length === 0 && !isCrawling && (
                <span className="status-badge neutral">Not crawled yet</span>
              )}
            </div>
            {content.length > 0 && (
              <button
                className="btn btn-secondary btn-small"
                onClick={() => setShowContent(!showContent)}
                style={{ marginTop: '8px' }}
              >
                {showContent ? 'Hide Content Preview' : 'Show Content Preview'}
              </button>
            )}
          </div>

          {showContent && content.length > 0 && (
            <div className="form-group">
              <label className="form-label">Content Preview</label>
              {content.map((c) => {
                const isExpanded = expandedContent.has(c.url);
                const shouldTruncate = c.content.length > 300;
                return (
                  <div key={c.url} className="content-preview">
                    <div className="content-header">
                      <span className="content-type-badge">
                        {c.type === ContentType.PRIMARY ? 'Primary' : 'Related'}
                      </span>
                      <strong className="content-title">{c.title}</strong>
                    </div>
                    {c.description && (
                      <p className="content-description">{c.description}</p>
                    )}
                    <div className="content-text">
                      {isExpanded || !shouldTruncate
                        ? c.content
                        : `${c.content.substring(0, 300)}...`}
                    </div>
                    {shouldTruncate && (
                      <button
                        className="btn btn-secondary btn-small"
                        onClick={() => toggleContentExpansion(c.url)}
                        style={{ marginTop: '8px' }}
                      >
                        {isExpanded ? 'Show Less' : 'Read More'}
                      </button>
                    )}
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="content-url"
                    >
                      {c.url}
                    </a>
                  </div>
                );
              })}
            </div>
          )}

          {relatedPages.length > 0 && (
            <div className="form-group">
              <label className="form-label">
                Related Pages ({relatedPages.length})
              </label>
              <div className="related-pages-list">
                {relatedPages.map((page) => (
                  <div key={page.id} className="related-page-item">
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="related-page-link"
                    >
                      {page.title || page.url}
                    </a>
                    <span className="related-page-meta">
                      Depth {page.depth}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Embedding Status</label>
            <div className="embedding-status">
              <span className="status-badge neutral">
                Embedding support coming soon
              </span>
            </div>
            <div className="form-hint">
              Configure an embedding provider in settings to enable semantic
              search
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Visibility</label>
            <button
              className={`btn ${bookmark.hidden ? 'btn-secondary' : 'btn-danger'} btn-small`}
              onClick={() => void handleToggleHidden()}
            >
              {bookmark.hidden ? 'Unhide Bookmark' : 'Hide Bookmark'}
            </button>
            {bookmark.hidden && (
              <div className="form-hint">
                Hidden bookmarks are excluded from search results
              </div>
            )}
          </div>
        </div>

        <div className="bookmark-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            className="btn btn-primary"
            onClick={() => void handleSave()}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
