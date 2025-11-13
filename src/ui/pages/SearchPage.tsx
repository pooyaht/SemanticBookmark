import React, { useState } from 'react';

import { Layout } from '../components/Layout';

import type { SearchResult } from '@/services/SearchService';

import { SearchService } from '@/services/SearchService';

const searchService = SearchService.getInstance();

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      return;
    }

    setSearching(true);
    setError(null);
    setHasSearched(true);

    try {
      const searchResults = await searchService.searchWithFallback(
        query.trim()
      );
      setResults(searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const openBookmark = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <Layout currentPage="search">
      <h1>Semantic Bookmark Search</h1>
      <form
        onSubmit={(e) => {
          void handleSearch(e);
        }}
      >
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search your bookmarks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{ width: '100%' }}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
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
        <div style={{ marginTop: '24px' }}>
          <p
            style={{
              fontSize: '13px',
              color: '#666',
              marginBottom: '12px',
            }}
          >
            Found {results.length} result{results.length !== 1 ? 's' : ''}
          </p>
          <div className="bookmark-list">
            {results.map((result) => (
              <div key={result.bookmark.id} className="bookmark-item">
                <div className="bookmark-header">
                  <div className="bookmark-title-section">
                    <button
                      className="bookmark-title-btn"
                      onClick={() => openBookmark(result.bookmark.url)}
                      title={result.bookmark.title}
                    >
                      {result.bookmark.title}
                    </button>
                    <span className="bookmark-score">
                      {Math.round(result.score * 100)}% match
                    </span>
                  </div>
                </div>

                <div className="bookmark-url">{result.bookmark.url}</div>

                {result.bookmark.userDescription && (
                  <div className="bookmark-description">
                    {result.bookmark.userDescription}
                  </div>
                )}

                {result.bookmark.aiSummary && (
                  <div className="bookmark-ai-summary">
                    <strong>AI Summary:</strong> {result.bookmark.aiSummary}
                  </div>
                )}
              </div>
            ))}
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
    </Layout>
  );
};
