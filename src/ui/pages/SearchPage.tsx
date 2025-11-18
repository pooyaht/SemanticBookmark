import {
  Globe,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Settings,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Layout } from '../components/Layout';

import type { SearchResult } from '@/services/SearchService';

import { SearchService } from '@/services/SearchService';

const searchService = SearchService.getInstance();

const STORAGE_KEYS = {
  TOP_K: 'search_topK',
  MIN_SCORE: 'search_minScore',
  QUERY_PREFIX: 'search_queryPrefix',
  QUERY_SUFFIX: 'search_querySuffix',
};

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  const [topK, setTopK] = useState(20);
  const [minScore, setMinScore] = useState(0.3);
  const [queryPrefix, setQueryPrefix] = useState('');
  const [querySuffix, setQuerySuffix] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      const stored = await chrome.storage.local.get(
        Object.values(STORAGE_KEYS)
      );
      setTopK((stored[STORAGE_KEYS.TOP_K] as number | undefined) ?? 20);
      setMinScore(
        (stored[STORAGE_KEYS.MIN_SCORE] as number | undefined) ?? 0.3
      );
      setQueryPrefix(
        (stored[STORAGE_KEYS.QUERY_PREFIX] as string | undefined) ?? ''
      );
      setQuerySuffix(
        (stored[STORAGE_KEYS.QUERY_SUFFIX] as string | undefined) ?? ''
      );
    };
    void loadSettings();
  }, []);

  const saveSettings = async () => {
    await chrome.storage.local.set({
      [STORAGE_KEYS.TOP_K]: topK,
      [STORAGE_KEYS.MIN_SCORE]: minScore,
      [STORAGE_KEYS.QUERY_PREFIX]: queryPrefix,
      [STORAGE_KEYS.QUERY_SUFFIX]: querySuffix,
    });
    setShowConfig(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      return;
    }

    setSearching(true);
    setError(null);
    setHasSearched(true);
    setExpandedId(null);

    try {
      const fullQuery = `${queryPrefix}${query.trim()}${querySuffix}`.trim();
      const searchResults = await searchService.search(fullQuery, {
        limit: topK,
        minScore,
      });
      setResults(searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
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
    <Layout currentPage="search">
      <div className="search-page-modern">
        <h1>Semantic Search</h1>

        <div className="search-header-actions">
          <button
            className={`config-btn-modern ${showConfig ? 'active' : ''}`}
            onClick={() => setShowConfig(!showConfig)}
            title="Search Configuration"
          >
            <Settings size={18} />
            Config
          </button>
        </div>

        {showConfig && (
          <div className="search-config-panel">
            <div className="config-panel-header">
              <h3>Search Configuration</h3>
            </div>
            <div className="config-panel-body">
              <div className="config-group">
                <label className="config-label">
                  Top K Results
                  <span className="config-value">{topK}</span>
                </label>
                <input
                  type="range"
                  className="config-slider"
                  min="5"
                  max="50"
                  step="5"
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                />
                <div className="config-hint">
                  Maximum number of results to return
                </div>
              </div>

              <div className="config-group">
                <label className="config-label">
                  Similarity Threshold
                  <span className="config-value">
                    {(minScore * 100).toFixed(0)}%
                  </span>
                </label>
                <input
                  type="range"
                  className="config-slider"
                  min="0"
                  max="100"
                  step="5"
                  value={minScore * 100}
                  onChange={(e) => setMinScore(Number(e.target.value) / 100)}
                />
                <div className="config-hint">
                  Minimum similarity score (0-100%)
                </div>
              </div>

              <div className="config-group">
                <label className="config-label">Query Prefix</label>
                <input
                  type="text"
                  className="config-input"
                  placeholder="Text to prepend to query..."
                  value={queryPrefix}
                  onChange={(e) => setQueryPrefix(e.target.value)}
                />
                <div className="config-hint">
                  Text added before your search query
                </div>
              </div>

              <div className="config-group">
                <label className="config-label">Query Suffix</label>
                <input
                  type="text"
                  className="config-input"
                  placeholder="Text to append to query..."
                  value={querySuffix}
                  onChange={(e) => setQuerySuffix(e.target.value)}
                />
                <div className="config-hint">
                  Text added after your search query
                </div>
              </div>
            </div>
            <div className="config-panel-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowConfig(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => void saveSettings()}
              >
                Save
              </button>
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            void handleSearch(e);
          }}
          className="search-form-modern"
        >
          <input
            type="text"
            className="search-input-large"
            placeholder="Search your bookmarks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            className="btn btn-primary btn-large"
            disabled={searching || !query.trim()}
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {error && (
          <div className="alert alert-error" style={{ marginTop: '16px' }}>
            {error}
          </div>
        )}

        {hasSearched && !searching && results.length === 0 && !error && (
          <div className="empty-state">
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <p>No results found</p>
            <p style={{ fontSize: '12px', color: '#999' }}>
              Try different keywords or check if your bookmarks are indexed
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className="search-results-modern">
            <p className="results-count">
              Found {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
            <div className="results-list-modern">
              {results.map((result) => {
                const isExpanded = expandedId === result.bookmark.id;
                return (
                  <div key={result.bookmark.id} className="result-card-modern">
                    <div
                      className="result-card-header"
                      onClick={() => toggleExpand(result.bookmark.id)}
                    >
                      <div className="result-card-left">
                        <div className="result-favicon">
                          {result.bookmark.favicon ? (
                            <img src={result.bookmark.favicon} alt="" />
                          ) : (
                            <Globe size={16} />
                          )}
                        </div>
                        <div className="result-info">
                          <div className="result-title">
                            {result.bookmark.title}
                          </div>
                          <div className="result-domain">
                            {extractDomain(result.bookmark.url)}
                          </div>
                        </div>
                      </div>
                      <div className="result-card-right">
                        <div className="result-score">
                          {Math.round(result.score * 100)}%
                        </div>
                        {isExpanded ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="result-card-details">
                        <div className="detail-row">
                          <label className="detail-label">URL</label>
                          <a
                            href={result.bookmark.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="detail-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {result.bookmark.url}
                            <ExternalLink size={12} />
                          </a>
                        </div>

                        {result.bookmark.userDescription && (
                          <div className="detail-row">
                            <label className="detail-label">Description</label>
                            <div className="detail-text">
                              {result.bookmark.userDescription}
                            </div>
                          </div>
                        )}

                        {result.bookmark.aiSummary && (
                          <div className="detail-row">
                            <label className="detail-label">AI Summary</label>
                            <div className="detail-text detail-summary">
                              {result.bookmark.aiSummary}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!hasSearched && (
          <div className="empty-state">
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <p>Search your bookmarks</p>
            <p style={{ fontSize: '12px', color: '#999' }}>
              Enter a query to search your bookmarks semantically
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};
