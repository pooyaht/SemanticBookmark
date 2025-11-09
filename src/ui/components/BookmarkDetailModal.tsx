import React, { useState, useEffect } from 'react';

import type { Bookmark } from '@/types/bookmark';
import type { Tag } from '@/types/tag';

import { BookmarkService } from '@/services/BookmarkService';
import { TagService } from '@/services/TagService';
import { TagAssignmentSource } from '@/types/tag';

const bookmarkService = new BookmarkService();
const tagService = new TagService();

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
  const [userDescription, setUserDescription] = useState(
    bookmark.userDescription ?? ''
  );
  const [assignedTags, setAssignedTags] = useState<Tag[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void loadData();
  }, [bookmark.id]);

  const loadData = async () => {
    const tags = await tagService.getBookmarkTags(bookmark.id);
    setAssignedTags(tags);

    const allTags = await tagService.getAllTags();
    setAvailableTags(allTags);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      if (userDescription !== bookmark.userDescription) {
        await bookmarkService.updateUserDescription(
          bookmark.id,
          userDescription
        );
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

  const handleAddTag = async (tag: Tag) => {
    if (assignedTags.some((t) => t.id === tag.id)) {
      return;
    }

    await tagService.assignTagToBookmark(
      bookmark.id,
      tag.id,
      TagAssignmentSource.USER
    );

    setAssignedTags([...assignedTags, tag]);
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const handleRemoveTag = async (tagId: string) => {
    await tagService.removeTagFromBookmark(bookmark.id, tagId);
    setAssignedTags(assignedTags.filter((t) => t.id !== tagId));
  };

  const filteredTags = availableTags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
      !assignedTags.some((t) => t.id === tag.id)
  );

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
            <div className="form-value">{bookmark.title}</div>
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
                    onClick={() => void handleRemoveTag(tag.id)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="tag-input-wrapper">
              <input
                type="text"
                className="form-input"
                placeholder="Type to add tags..."
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value);
                  setShowTagSuggestions(e.target.value.length > 0);
                }}
                onFocus={() => setShowTagSuggestions(tagInput.length > 0)}
              />
              {showTagSuggestions && filteredTags.length > 0 && (
                <div className="tag-suggestions">
                  {filteredTags.slice(0, 5).map((tag) => (
                    <div
                      key={tag.id}
                      className="tag-suggestion-item"
                      onClick={() => void handleAddTag(tag)}
                    >
                      {tag.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
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
