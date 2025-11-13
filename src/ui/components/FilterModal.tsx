import { X, Eye, Tag, CheckCircle } from 'lucide-react';
import React from 'react';

import type { Tag as TagType } from '@/types/tag';

type VisibilityFilter = 'all' | 'visible' | 'hidden';

interface StatusFilters {
  crawled: 'all' | 'yes' | 'no';
  indexed: 'all' | 'yes' | 'no';
  aiSummary: 'all' | 'yes' | 'no';
  userDescription: 'all' | 'yes' | 'no';
  stale: 'all' | 'yes' | 'no';
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  visibilityFilter: VisibilityFilter;
  onVisibilityChange: (filter: VisibilityFilter) => void;
  allTags: TagType[];
  selectedTagIds: Set<string>;
  onToggleTag: (tagId: string) => void;
  statusFilters: StatusFilters;
  onStatusFilterChange: (filters: StatusFilters) => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  onApply,
  visibilityFilter,
  onVisibilityChange,
  allTags,
  selectedTagIds,
  onToggleTag,
  statusFilters,
  onStatusFilterChange,
}) => {
  if (!isOpen) {return null;}

  const handleClearAll = () => {
    onVisibilityChange('visible');
    selectedTagIds.forEach((tagId) => onToggleTag(tagId));
    onStatusFilterChange({
      crawled: 'all',
      indexed: 'all',
      aiSummary: 'all',
      userDescription: 'all',
      stale: 'all',
    });
  };

  const handleApply = () => {
    onApply();
    onClose();
  };

  return (
    <div className="filter-modal-overlay" onClick={onClose}>
      <div className="filter-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="filter-modal-header">
          <div className="filter-modal-title">
            <CheckCircle size={20} />
            <span>Filters</span>
          </div>
          <button
            className="filter-close-btn"
            onClick={onClose}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="filter-modal-body">
          <div className="filter-section">
            <div className="filter-section-header">
              <Eye size={16} />
              <span>Visibility</span>
            </div>
            <div className="filter-radio-group">
              <label className="filter-radio-item">
                <input
                  type="radio"
                  name="visibility"
                  checked={visibilityFilter === 'all'}
                  onChange={() => onVisibilityChange('all')}
                />
                <span>All</span>
              </label>
              <label className="filter-radio-item">
                <input
                  type="radio"
                  name="visibility"
                  checked={visibilityFilter === 'visible'}
                  onChange={() => onVisibilityChange('visible')}
                />
                <span>Visible</span>
              </label>
              <label className="filter-radio-item">
                <input
                  type="radio"
                  name="visibility"
                  checked={visibilityFilter === 'hidden'}
                  onChange={() => onVisibilityChange('hidden')}
                />
                <span>Hidden</span>
              </label>
            </div>
          </div>

          {allTags.length > 0 && (
            <div className="filter-section">
              <div className="filter-section-header">
                <Tag size={16} />
                <span>Tags</span>
                {selectedTagIds.size > 0 && (
                  <span className="filter-count">({selectedTagIds.size})</span>
                )}
              </div>
              <div className="filter-tags-grid">
                {allTags.map((tag) => (
                  <label key={tag.id} className="filter-checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedTagIds.has(tag.id)}
                      onChange={() => onToggleTag(tag.id)}
                    />
                    <span>{tag.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="filter-section">
            <div className="filter-section-header">
              <CheckCircle size={16} />
              <span>Status</span>
            </div>

            <div className="filter-status-grid">
              <div className="filter-status-row">
                <span className="filter-status-label">Crawled</span>
                <div className="filter-status-options">
                  <button
                    className={`filter-status-btn ${statusFilters.crawled === 'all' ? 'active' : ''}`}
                    onClick={() =>
                      onStatusFilterChange({ ...statusFilters, crawled: 'all' })
                    }
                  >
                    All
                  </button>
                  <button
                    className={`filter-status-btn ${statusFilters.crawled === 'yes' ? 'active' : ''}`}
                    onClick={() =>
                      onStatusFilterChange({ ...statusFilters, crawled: 'yes' })
                    }
                  >
                    Yes
                  </button>
                  <button
                    className={`filter-status-btn ${statusFilters.crawled === 'no' ? 'active' : ''}`}
                    onClick={() =>
                      onStatusFilterChange({ ...statusFilters, crawled: 'no' })
                    }
                  >
                    No
                  </button>
                </div>
              </div>

              <div className="filter-status-row">
                <span className="filter-status-label">Indexed</span>
                <div className="filter-status-options">
                  <button
                    className={`filter-status-btn ${statusFilters.indexed === 'all' ? 'active' : ''}`}
                    onClick={() =>
                      onStatusFilterChange({ ...statusFilters, indexed: 'all' })
                    }
                  >
                    All
                  </button>
                  <button
                    className={`filter-status-btn ${statusFilters.indexed === 'yes' ? 'active' : ''}`}
                    onClick={() =>
                      onStatusFilterChange({ ...statusFilters, indexed: 'yes' })
                    }
                  >
                    Yes
                  </button>
                  <button
                    className={`filter-status-btn ${statusFilters.indexed === 'no' ? 'active' : ''}`}
                    onClick={() =>
                      onStatusFilterChange({ ...statusFilters, indexed: 'no' })
                    }
                  >
                    No
                  </button>
                </div>
              </div>

              <div className="filter-status-row">
                <span className="filter-status-label">AI Summary</span>
                <div className="filter-status-options">
                  <button
                    className={`filter-status-btn ${statusFilters.aiSummary === 'all' ? 'active' : ''}`}
                    onClick={() =>
                      onStatusFilterChange({
                        ...statusFilters,
                        aiSummary: 'all',
                      })
                    }
                  >
                    All
                  </button>
                  <button
                    className={`filter-status-btn ${statusFilters.aiSummary === 'yes' ? 'active' : ''}`}
                    onClick={() =>
                      onStatusFilterChange({
                        ...statusFilters,
                        aiSummary: 'yes',
                      })
                    }
                  >
                    Yes
                  </button>
                  <button
                    className={`filter-status-btn ${statusFilters.aiSummary === 'no' ? 'active' : ''}`}
                    onClick={() =>
                      onStatusFilterChange({ ...statusFilters, aiSummary: 'no' })
                    }
                  >
                    No
                  </button>
                </div>
              </div>

              <div className="filter-status-row">
                <span className="filter-status-label">Description</span>
                <div className="filter-status-options">
                  <button
                    className={`filter-status-btn ${statusFilters.userDescription === 'all' ? 'active' : ''}`}
                    onClick={() =>
                      onStatusFilterChange({
                        ...statusFilters,
                        userDescription: 'all',
                      })
                    }
                  >
                    All
                  </button>
                  <button
                    className={`filter-status-btn ${statusFilters.userDescription === 'yes' ? 'active' : ''}`}
                    onClick={() =>
                      onStatusFilterChange({
                        ...statusFilters,
                        userDescription: 'yes',
                      })
                    }
                  >
                    Yes
                  </button>
                  <button
                    className={`filter-status-btn ${statusFilters.userDescription === 'no' ? 'active' : ''}`}
                    onClick={() =>
                      onStatusFilterChange({
                        ...statusFilters,
                        userDescription: 'no',
                      })
                    }
                  >
                    No
                  </button>
                </div>
              </div>

              <div className="filter-status-row">
                <span className="filter-status-label">Stale</span>
                <div className="filter-status-options">
                  <button
                    className={`filter-status-btn ${statusFilters.stale === 'all' ? 'active' : ''}`}
                    onClick={() =>
                      onStatusFilterChange({ ...statusFilters, stale: 'all' })
                    }
                  >
                    All
                  </button>
                  <button
                    className={`filter-status-btn ${statusFilters.stale === 'yes' ? 'active' : ''}`}
                    onClick={() =>
                      onStatusFilterChange({ ...statusFilters, stale: 'yes' })
                    }
                  >
                    Yes
                  </button>
                  <button
                    className={`filter-status-btn ${statusFilters.stale === 'no' ? 'active' : ''}`}
                    onClick={() =>
                      onStatusFilterChange({ ...statusFilters, stale: 'no' })
                    }
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="filter-modal-footer">
          <button className="btn btn-secondary" onClick={handleClearAll}>
            Clear All
          </button>
          <button className="btn btn-primary" onClick={handleApply}>
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};
