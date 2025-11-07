import React, { useState, useEffect } from 'react';

import { Layout } from '../components/Layout';
import { MergeTagModal } from '../components/MergeTagModal';
import { Modal } from '../components/Modal';

import type { Tag } from '@/types/tag';

import { TagService } from '@/services/TagService';
import { TagSource } from '@/types/tag';

const tagService = new TagService();

export const TagsPage: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [mergingTag, setMergingTag] = useState<Tag | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [addFormData, setAddFormData] = useState({ name: '', description: '' });
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    void loadTags();
  }, []);

  const loadTags = async () => {
    try {
      setError(null);
      const loadedTags = await tagService.getAllTags();
      setTags(loadedTags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing || !addFormData.name.trim()) {
      return;
    }

    setIsProcessing(true);
    try {
      await tagService.createTag(
        addFormData.name.trim(),
        TagSource.USER,
        addFormData.description.trim() || undefined
      );
      setIsAddModalOpen(false);
      setAddFormData({ name: '', description: '' });
      await loadTags();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create tag');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setEditFormData({
      name: tag.name,
      description: tag.description ?? '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing || !editingTag || !editFormData.name.trim()) {
      return;
    }

    setIsProcessing(true);
    try {
      await tagService.renameTag(editingTag.id, editFormData.name.trim());
      await tagService.updateTagDescription(
        editingTag.id,
        editFormData.description.trim()
      );
      setIsEditModalOpen(false);
      setEditingTag(null);
      setEditFormData({ name: '', description: '' });
      await loadTags();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update tag');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteTag = async (tag: Tag) => {
    if (isProcessing) {
      return;
    }

    if (tag.source === TagSource.DEFAULT) {
      alert('Cannot delete default tags');
      return;
    }

    const confirmMessage =
      tag.usageCount > 0
        ? `Are you sure you want to delete "${tag.name}"?\n\nThis tag is used by ${tag.usageCount} bookmark${tag.usageCount !== 1 ? 's' : ''}. The tag will be removed from all bookmarks.`
        : `Are you sure you want to delete "${tag.name}"?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsProcessing(true);
    try {
      await tagService.deleteTag(tag.id);
      await loadTags();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete tag');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenMerge = (tag: Tag) => {
    setMergingTag(tag);
    setIsMergeModalOpen(true);
  };

  const handleMerge = async (targetTagId: string) => {
    if (isProcessing || !mergingTag) {
      return;
    }

    setIsProcessing(true);
    try {
      await tagService.mergeTags(mergingTag.id, targetTagId);
      setIsMergeModalOpen(false);
      setMergingTag(null);
      await loadTags();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to merge tags');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreDefaults = async () => {
    if (isProcessing) {
      return;
    }

    if (
      !confirm(
        'This will restore all default tags. Existing default tags will not be affected.\n\nContinue?'
      )
    ) {
      return;
    }

    setIsProcessing(true);
    try {
      await tagService.restoreDefaultTags();
      await loadTags();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : 'Failed to restore default tags'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const renderTag = (tag: Tag) => {
    const isDeletable = tag.source !== TagSource.DEFAULT;

    return (
      <div key={tag.id} className="tag-item">
        <div className="tag-info">
          <div className="tag-name">
            {tag.name}
            <span className={`tag-badge ${tag.source}`}>{tag.source}</span>
          </div>
          {tag.description && (
            <div className="tag-description">{tag.description}</div>
          )}
          <div className="tag-meta">
            Used by {tag.usageCount} bookmark{tag.usageCount !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="tag-actions">
          <button
            className="icon-btn"
            onClick={() => handleEditTag(tag)}
            title="Edit tag"
            disabled={isProcessing}
          >
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
          </button>
          <button
            className="icon-btn"
            onClick={() => handleOpenMerge(tag)}
            title="Merge tag"
            disabled={!isDeletable || isProcessing}
          >
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 20.41L18.41 19 15 15.59 13.59 17 17 20.41zM7.5 8H11v5.59L5.59 19 7 20.41l6-6V8h3.5L12 3.5 7.5 8z" />
            </svg>
          </button>
          <button
            className="icon-btn danger"
            onClick={() => {
              void handleDeleteTag(tag);
            }}
            title="Delete tag"
            disabled={!isDeletable || isProcessing}
          >
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <Layout currentPage="tags">
      <div className="header">
        <h1>Manage Tags</h1>
        <div>
          <button
            className="btn btn-secondary btn-small"
            onClick={() => {
              void handleRestoreDefaults();
            }}
            disabled={isProcessing}
          >
            Restore Defaults
          </button>
          <button
            className="btn btn-primary btn-small"
            onClick={() => setIsAddModalOpen(true)}
            disabled={isProcessing}
            style={{ marginLeft: '8px' }}
          >
            Add Tag
          </button>
        </div>
      </div>

      <div
        className="tags-list"
        style={{ maxHeight: '400px', overflowY: 'auto' }}
      >
        {loading && (
          <div className="empty-state">
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
            </svg>
            <p>Loading tags...</p>
          </div>
        )}

        {!loading && error && (
          <div className="empty-state">
            <p style={{ color: '#e74c3c' }}>Error loading tags</p>
            <p style={{ fontSize: '12px', color: '#999' }}>{error}</p>
          </div>
        )}

        {!loading && !error && tags.length === 0 && (
          <div className="empty-state">
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
            </svg>
            <p>No tags found</p>
            <p style={{ fontSize: '12px', color: '#999' }}>
              Click &quot;Add Tag&quot; or &quot;Restore Defaults&quot; to get
              started
            </p>
          </div>
        )}

        {!loading && !error && tags.length > 0 && (
          <div style={{ paddingBottom: '8px' }}>
            {tags.map((tag) => renderTag(tag))}
          </div>
        )}
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setAddFormData({ name: '', description: '' });
        }}
        title="Add New Tag"
      >
        <form
          onSubmit={(e) => {
            void handleAddTag(e);
          }}
        >
          <div className="form-group">
            <label className="form-label" htmlFor="tag-name">
              Tag Name
            </label>
            <input
              type="text"
              id="tag-name"
              className="form-input"
              placeholder="Enter tag name"
              value={addFormData.name}
              onChange={(e) =>
                setAddFormData({ ...addFormData, name: e.target.value })
              }
              required
              autoFocus
              disabled={isProcessing}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="tag-description">
              Description (optional)
            </label>
            <textarea
              id="tag-description"
              className="form-input form-textarea"
              placeholder="Enter description"
              value={addFormData.description}
              onChange={(e) =>
                setAddFormData({ ...addFormData, description: e.target.value })
              }
              disabled={isProcessing}
            />
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setIsAddModalOpen(false);
                setAddFormData({ name: '', description: '' });
              }}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isProcessing}
            >
              Add Tag
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTag(null);
          setEditFormData({ name: '', description: '' });
        }}
        title="Edit Tag"
      >
        <form
          onSubmit={(e) => {
            void handleSaveEdit(e);
          }}
        >
          <div className="form-group">
            <label className="form-label" htmlFor="edit-tag-name">
              Tag Name
            </label>
            <input
              type="text"
              id="edit-tag-name"
              className="form-input"
              placeholder="Enter tag name"
              value={editFormData.name}
              onChange={(e) =>
                setEditFormData({ ...editFormData, name: e.target.value })
              }
              required
              autoFocus
              disabled={isProcessing}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-tag-description">
              Description (optional)
            </label>
            <textarea
              id="edit-tag-description"
              className="form-input form-textarea"
              placeholder="Enter description"
              value={editFormData.description}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  description: e.target.value,
                })
              }
              disabled={isProcessing}
            />
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingTag(null);
                setEditFormData({ name: '', description: '' });
              }}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isProcessing}
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      <MergeTagModal
        isOpen={isMergeModalOpen}
        onClose={() => {
          setIsMergeModalOpen(false);
          setMergingTag(null);
        }}
        sourceTag={mergingTag}
        availableTags={tags}
        onMerge={handleMerge}
        isProcessing={isProcessing}
      />
    </Layout>
  );
};
