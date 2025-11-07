import React, { useState } from 'react';

import { Modal } from './Modal';

import type { Tag } from '@/types/tag';


interface MergeTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceTag: Tag | null;
  availableTags: Tag[];
  onMerge: (targetTagId: string) => Promise<void>;
  isProcessing: boolean;
}

export const MergeTagModal: React.FC<MergeTagModalProps> = ({
  isOpen,
  onClose,
  sourceTag,
  availableTags,
  onMerge,
  isProcessing,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetId) {
      return;
    }
    await onMerge(selectedTargetId);
    setSelectedTargetId('');
  };

  const handleClose = () => {
    setSelectedTargetId('');
    onClose();
  };

  if (!sourceTag) {
    return null;
  }

  const targetTag = availableTags.find((tag) => tag.id === selectedTargetId);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Merge Tags">
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
      >
        <div className="merge-info">
          <p style={{ fontSize: '13px', marginBottom: '16px', color: '#666' }}>
            Merge <strong>{sourceTag.name}</strong> into another tag. All
            bookmarks with this tag will be moved to the target tag, and{' '}
            <strong>{sourceTag.name}</strong> will be deleted.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="target-tag">
            Merge into
          </label>
          <select
            id="target-tag"
            className="form-input"
            value={selectedTargetId}
            onChange={(e) => setSelectedTargetId(e.target.value)}
            required
            disabled={isProcessing}
            autoFocus
          >
            <option value="">Select a tag...</option>
            {availableTags
              .filter((tag) => tag.id !== sourceTag.id)
              .map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name} ({tag.usageCount} bookmark
                  {tag.usageCount !== 1 ? 's' : ''})
                </option>
              ))}
          </select>
        </div>

        {targetTag && (
          <div className="merge-preview">
            <p
              style={{
                fontSize: '12px',
                padding: '12px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                marginBottom: '16px',
              }}
            >
              <strong>Result:</strong> {targetTag.name} will have{' '}
              {targetTag.usageCount + sourceTag.usageCount} bookmark
              {targetTag.usageCount + sourceTag.usageCount !== 1
                ? 's'
                : ''}{' '}
              after merging.
            </p>
          </div>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-danger"
            disabled={!selectedTargetId || isProcessing}
          >
            Merge Tags
          </button>
        </div>
      </form>
    </Modal>
  );
};
