import {
  X,
  ExternalLink,
  Copy,
  Globe,
  Tag as TagIcon,
  FileText,
  Download,
  Search,
  EyeOff,
  Eye,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import type { Bookmark } from '@/types/bookmark';
import type { Content, RelatedPage } from '@/types/content';
import type { Tag } from '@/types/tag';

import { AIService } from '@/services/AIService';
import { BookmarkService } from '@/services/BookmarkService';
import { EmbeddingProviderService } from '@/services/EmbeddingProviderService';
import { IndexingService } from '@/services/IndexingService';
import { TagService } from '@/services/TagService';
import { ContentType } from '@/types/content';
import { TagAssignmentSource, TagSource } from '@/types/tag';

const bookmarkService = BookmarkService.getInstance();
const tagService = TagService.getInstance();
const indexingService = IndexingService.getInstance();
const aiService = AIService.getInstance();
const providerService = EmbeddingProviderService.getInstance();

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
  const [crawlDepth, setCrawlDepth] = useState<number | undefined>(
    bookmark.crawlDepth
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
  const [isIndexing, setIsIndexing] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isIndexed, setIsIndexed] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [hasActiveProvider, setHasActiveProvider] = useState(false);

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
    const sortedContent = bookmarkContent.sort((a, b) => {
      if (a.type === ContentType.PRIMARY && b.type !== ContentType.PRIMARY) {
        return -1;
      }
      if (a.type !== ContentType.PRIMARY && b.type === ContentType.PRIMARY) {
        return 1;
      }
      return 0;
    });
    setContent(sortedContent);

    const pages = await bookmarkService.getRelatedPages(bookmark.id);
    setRelatedPages(pages);

    const indexed = await indexingService.isBookmarkIndexed(bookmark.id);
    setIsIndexed(indexed);

    const aiServiceEnabled = await aiService.isAIEnabled();
    setAiEnabled(aiServiceEnabled);

    const activeProvider = await providerService.getActiveProvider();
    setHasActiveProvider(!!activeProvider);
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

      if (crawlDepth !== bookmark.crawlDepth) {
        await bookmarkService.updateCrawlDepth(bookmark.id, crawlDepth);
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
      bookmark.id,
      'with depth:',
      crawlDepth
    );
    try {
      await bookmarkService.crawlBookmark(bookmark.id, crawlDepth);
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

  const handleGenerateEmbedding = async () => {
    if (!hasActiveProvider) {
      alert('No active embedding provider. Please configure one in settings.');
      return;
    }

    setIsIndexing(true);
    try {
      const result = await indexingService.indexBookmark(bookmark.id);
      if (result.success) {
        alert(
          `Embedding generated successfully!\nTokens: ${result.tokenCount}${result.isTruncated ? ' (truncated)' : ''}`
        );
        await loadData();
      } else {
        alert(`Failed to generate embedding: ${result.error}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to generate embedding: ${errorMessage}`);
    } finally {
      setIsIndexing(false);
    }
  };

  const handleGenerateAISummary = async () => {
    if (content.length === 0) {
      alert(
        'Please crawl the bookmark content first before generating a summary.'
      );
      return;
    }

    setIsGeneratingSummary(true);
    try {
      await aiService.generateSummary(bookmark.id);
      alert('AI summary generated successfully!');
      await loadData();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to generate AI summary: ${errorMessage}`);
    } finally {
      setIsGeneratingSummary(false);
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

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(bookmark.url);
    } catch {
      alert('Failed to copy URL to clipboard');
    }
  };

  const handleOpenUrl = () => {
    window.open(bookmark.url, '_blank', 'noopener,noreferrer');
  };

  const extractDomain = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="bookmark-modal-overlay" onClick={handleOverlayClick}>
      <div className="bookmark-detail-modal-modern">
        <div className="bookmark-detail-header-modern">
          <div className="bookmark-detail-header-left">
            <div className="bookmark-detail-favicon">
              {bookmark.favicon ? (
                <img src={bookmark.favicon} alt="" />
              ) : (
                <Globe size={24} />
              )}
            </div>
            <div className="bookmark-detail-header-info">
              <h2 className="bookmark-detail-title-display">{bookmark.title}</h2>
              <span className="bookmark-detail-domain">
                {extractDomain(bookmark.url)}
              </span>
            </div>
          </div>
          <div className="bookmark-detail-header-actions">
            <button
              className="icon-btn-modern"
              onClick={handleOpenUrl}
              title="Open URL"
            >
              <ExternalLink size={18} />
            </button>
            <button
              className="icon-btn-modern"
              onClick={() => void handleCopyUrl()}
              title="Copy URL"
            >
              <Copy size={18} />
            </button>
            <button className="icon-btn-modern" onClick={onClose} title="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="bookmark-detail-body-modern">
          <div className="detail-card-modern">
            <div className="detail-card-header">
              <FileText size={18} />
              <span>Basic Information</span>
            </div>
            <div className="detail-card-body">
              <div className="form-group-modern">
                <label className="form-label-modern">Title</label>
                <input
                  type="text"
                  className="form-input-modern"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group-modern">
                <label className="form-label-modern">URL</label>
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="url-link-modern"
                >
                  {bookmark.url}
                  <ExternalLink size={14} />
                </a>
              </div>

              {bookmark.aiSummary && (
                <div className="form-group-modern">
                  <label className="form-label-modern">AI Summary</label>
                  <div className="ai-summary-display">{bookmark.aiSummary}</div>
                </div>
              )}

              <div className="form-group-modern">
                <label className="form-label-modern">User Description</label>
                <textarea
                  className="form-textarea-modern"
                  placeholder="Add your personal notes about this bookmark..."
                  value={userDescription}
                  onChange={(e) => setUserDescription(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div className="detail-card-modern">
            <div className="detail-card-header">
              <TagIcon size={18} />
              <span>Tags</span>
            </div>
            <div className="detail-card-body">
              {assignedTags.length > 0 ? (
                <div className="assigned-tags-modern">
                  {assignedTags.map((tag) => (
                    <span key={tag.id} className="tag-chip-modern">
                      {tag.name}
                      <button
                        className="tag-chip-remove"
                        onClick={() => handleRemoveTag(tag.id)}
                        title="Remove tag"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="empty-state-inline">
                  <TagIcon size={16} />
                  <span>No tags assigned</span>
                </div>
              )}

              {unassignedTags.length > 0 ? (
                <div className="tag-input-wrapper-modern">
                  <input
                    type="text"
                    className="form-input-modern"
                    placeholder="Search and add tags..."
                    value={tagInput}
                    onChange={handleTagInputChange}
                    onKeyDown={handleTagInputKeyDown}
                    onFocus={() => setShowSuggestions(tagInput.length > 0)}
                    onBlur={() =>
                      setTimeout(() => setShowSuggestions(false), 200)
                    }
                  />
                  {showSuggestions && filteredTags.length > 0 && (
                    <div className="tag-suggestions-modern">
                      {Object.entries(groupedFilteredTags).map(
                        ([source, tags]) =>
                          tags.length > 0 ? (
                            <div key={source} className="tag-group-modern">
                              <div className="tag-group-label-modern">
                                {tagSourceLabels[source as TagSource]}
                              </div>
                              {tags.map((tag) => (
                                <div
                                  key={tag.id}
                                  className="tag-suggestion-item-modern"
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
                    <div className="tag-suggestions-modern">
                      <div className="tag-no-results-modern">
                        No matching tags found
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="form-hint-modern">
                  {availableTags.length === 0
                    ? 'No tags available. Create tags in the Tags page first.'
                    : 'All available tags have been assigned.'}
                </div>
              )}
            </div>
          </div>

          <div className="detail-card-modern">
            <div className="detail-card-header">
              <Download size={18} />
              <span>Content Crawling</span>
            </div>
            <div className="detail-card-body">
              <div className="form-group-modern">
                <label className="form-label-modern">Crawl Depth</label>
                <select
                  className="form-select-modern"
                  value={crawlDepth ?? ''}
                  onChange={(e) =>
                    setCrawlDepth(
                      e.target.value === '' ? undefined : Number(e.target.value)
                    )
                  }
                >
                  <option value="">Use default from settings</option>
                  <option value="0">0 - Original page only</option>
                  <option value="1">1 - Original + 1 direct link</option>
                  <option value="2">2 - Original + 2 direct links</option>
                  <option value="3">3 - Original + 3 direct links</option>
                  <option value="5">5 - Original + 5 direct links</option>
                  <option value="10">10 - Original + 10 direct links</option>
                </select>
              </div>

              <div className="status-action-row">
                {content.length > 0 ? (
                  <div className="status-badge-modern status-success">
                    <CheckCircle size={14} />
                    <span>
                      Crawled ({content.length} page
                      {content.length > 1 ? 's' : ''})
                    </span>
                  </div>
                ) : (
                  <div className="status-badge-modern status-neutral">
                    <AlertCircle size={14} />
                    <span>Not crawled yet</span>
                  </div>
                )}

                <button
                  className="btn btn-primary btn-small"
                  onClick={() => void handleCrawl()}
                  disabled={isCrawling}
                >
                  {isCrawling ? (
                    <>
                      <Loader2 size={14} className="spin-icon" />
                      Crawling...
                    </>
                  ) : (
                    'Crawl Content'
                  )}
                </button>
              </div>

              {content.length > 0 && content[0] && (
                <div className="form-hint-modern">
                  Last crawled: {new Date(content[0].fetchedAt).toLocaleString()}
                </div>
              )}

              {content.length > 0 && (
                <>
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => setShowContent(!showContent)}
                    style={{ marginTop: '12px' }}
                  >
                    {showContent ? 'Hide Preview' : 'Show Preview'}
                  </button>

                  {showContent && (
                    <div className="content-preview-container">
                      {content.map((c) => {
                        const isExpanded = expandedContent.has(c.url);
                        const shouldTruncate = c.content.length > 300;
                        const hasError = !!c.fetchError;

                        return (
                          <div
                            key={c.url}
                            className={`content-preview-card ${hasError ? 'has-error' : ''}`}
                          >
                            <div className="content-preview-header">
                              <span
                                className={`content-type-badge ${c.type === ContentType.PRIMARY ? 'primary' : 'related'}`}
                              >
                                {c.type === ContentType.PRIMARY
                                  ? 'Primary'
                                  : 'Related'}
                              </span>
                              <strong className="content-preview-title">
                                {c.title}
                              </strong>
                            </div>

                            {hasError ? (
                              <div className="content-error-modern">
                                <AlertCircle size={16} />
                                <div>
                                  <div className="error-message-modern">
                                    {c.fetchError}
                                  </div>
                                  <div className="error-hint-modern">
                                    Unable to fetch this page
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                {c.description && (
                                  <p className="content-preview-description">
                                    {c.description}
                                  </p>
                                )}
                                <div className="content-preview-text">
                                  {isExpanded || !shouldTruncate
                                    ? c.content
                                    : `${c.content.substring(0, 300)}...`}
                                </div>
                                {shouldTruncate && (
                                  <button
                                    className="btn btn-text btn-small"
                                    onClick={() => toggleContentExpansion(c.url)}
                                  >
                                    {isExpanded ? 'Show Less' : 'Read More'}
                                  </button>
                                )}
                              </>
                            )}

                            <a
                              href={c.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="content-preview-url"
                            >
                              <ExternalLink size={12} />
                              {c.url}
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {relatedPages.length > 0 && (
                <div className="related-pages-section">
                  <div className="related-pages-header">
                    Related Pages ({relatedPages.length})
                  </div>
                  <div className="related-pages-list-modern">
                    {relatedPages.map((page) => (
                      <div key={page.id} className="related-page-item-modern">
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="related-page-link-modern"
                        >
                          <Globe size={14} />
                          {page.title || page.url}
                        </a>
                        <span className="related-page-depth">
                          Depth {page.depth}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="detail-card-modern">
            <div className="detail-card-header">
              <Search size={18} />
              <span>Semantic Search</span>
            </div>
            <div className="detail-card-body">
              {hasActiveProvider ? (
                <>
                  <div className="status-action-row">
                    <div
                      className={`status-badge-modern ${isIndexed ? 'status-success' : 'status-neutral'}`}
                    >
                      {isIndexed ? (
                        <>
                          <CheckCircle size={14} />
                          <span>Indexed</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={14} />
                          <span>Not indexed</span>
                        </>
                      )}
                    </div>
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => void handleGenerateEmbedding()}
                      disabled={isIndexing}
                    >
                      {isIndexing ? (
                        <>
                          <Loader2 size={14} className="spin-icon" />
                          Generating...
                        </>
                      ) : isIndexed ? (
                        'Regenerate'
                      ) : (
                        'Generate Embedding'
                      )}
                    </button>
                  </div>

                  {aiEnabled && (
                    <div className="status-action-row">
                      <div
                        className={`status-badge-modern ${bookmark.aiSummary ? 'status-success' : 'status-neutral'}`}
                      >
                        {bookmark.aiSummary ? (
                          <>
                            <CheckCircle size={14} />
                            <span>AI Summary</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={14} />
                            <span>No AI Summary</span>
                          </>
                        )}
                      </div>
                      <button
                        className="btn btn-secondary btn-small"
                        onClick={() => void handleGenerateAISummary()}
                        disabled={isGeneratingSummary || content.length === 0}
                      >
                        {isGeneratingSummary ? (
                          <>
                            <Loader2 size={14} className="spin-icon" />
                            Generating...
                          </>
                        ) : bookmark.aiSummary ? (
                          'Regenerate'
                        ) : (
                          'Generate AI Summary'
                        )}
                      </button>
                    </div>
                  )}

                  <div className="form-hint-modern">
                    Generate embedding to enable semantic search.
                    {aiEnabled && ' AI summaries enhance search quality.'}
                  </div>
                </>
              ) : (
                <>
                  <div className="status-badge-modern status-warning">
                    <AlertCircle size={14} />
                    <span>No provider configured</span>
                  </div>
                  <div className="form-hint-modern">
                    Configure an embedding provider in settings to enable
                    semantic search.
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="detail-card-modern">
            <div className="detail-card-header">
              {bookmark.hidden ? <EyeOff size={18} /> : <Eye size={18} />}
              <span>Visibility</span>
            </div>
            <div className="detail-card-body">
              <div className="status-action-row">
                <div
                  className={`status-badge-modern ${bookmark.hidden ? 'status-warning' : 'status-success'}`}
                >
                  {bookmark.hidden ? (
                    <>
                      <EyeOff size={14} />
                      <span>Hidden</span>
                    </>
                  ) : (
                    <>
                      <Eye size={14} />
                      <span>Visible</span>
                    </>
                  )}
                </div>
                <button
                  className={`btn btn-small ${bookmark.hidden ? 'btn-secondary' : 'btn-danger'}`}
                  onClick={() => void handleToggleHidden()}
                >
                  {bookmark.hidden ? 'Unhide Bookmark' : 'Hide Bookmark'}
                </button>
              </div>
              {bookmark.hidden && (
                <div className="form-hint-modern">
                  Hidden bookmarks are excluded from search results
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bookmark-modal-footer-sticky">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            className="btn btn-primary"
            onClick={() => void handleSave()}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="spin-icon" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
