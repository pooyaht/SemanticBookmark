import React, { useState, useEffect } from 'react';

import type { Bookmark } from '@/types/bookmark';
import type { Tag } from '@/types/tag';

import { BookmarkService } from '@/services/BookmarkService';
import { TagService } from '@/services/TagService';
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

  useEffect(() => {
    void loadData();
  }, [bookmark.id]);

  const loadData = async () => {
    const tags = await tagService.getBookmarkTags(bookmark.id);
    setAssignedTags(tags);
    setOriginalTagIds(new Set(tags.map((t) => t.id)));

    const allTags = await tagService.getAllTags();
    setAvailableTags(allTags);
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
