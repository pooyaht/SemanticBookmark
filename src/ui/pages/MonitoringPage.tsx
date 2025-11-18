import React, { useState, useEffect } from 'react';

import { Accordion } from '../components/Accordion';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';

import type { TableStats } from '@/services/DatabaseStatsService';
import type { Bookmark } from '@/types/bookmark';
import type { Content, RelatedPage } from '@/types/content';
import type { Embedding, EmbeddingProvider } from '@/types/provider';
import type { Tag, BookmarkTag } from '@/types/tag';

import { DatabaseStatsService } from '@/services/DatabaseStatsService';
import { db } from '@/storage/database';

const statsService = DatabaseStatsService.getInstance();

export const MonitoringPage: React.FC = () => {
  const [stats, setStats] = useState<TableStats[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<unknown[]>([]);
  const [loadingTableData, setLoadingTableData] = useState(false);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [tableToClear, setTableToClear] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  useEffect(() => {
    void loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const dbStats = await statsService.getDatabaseStats();
      setStats(dbStats.tables);
      setTotalRows(dbStats.totalRows);
      setTotalSize(dbStats.totalSize);
    } catch (error) {
      console.error('Failed to load database stats:', error);
      alert('Failed to load database statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    if (selectedTable) {
      await loadTableData(selectedTable);
    }
    setRefreshing(false);
  };

  const loadTableData = async (tableName: string) => {
    setLoadingTableData(true);
    try {
      let data: unknown[] = [];
      switch (tableName) {
        case 'bookmarks':
          data = await db.bookmarks.toArray();
          break;
        case 'content':
          data = await db.content.toArray();
          break;
        case 'embeddings':
          data = await db.embeddings.toArray();
          break;
        case 'tags':
          data = await db.tags.toArray();
          break;
        case 'bookmarkTags':
          data = await db.bookmarkTags.toArray();
          break;
        case 'relatedPages':
          data = await db.relatedPages.toArray();
          break;
        case 'embeddingProviders':
          data = await db.embeddingProviders.toArray();
          break;
      }
      setTableData(data);
      setSelectedTable(tableName);
    } catch (error) {
      console.error(`Failed to load ${tableName} data:`, error);
      alert(`Failed to load ${tableName} data`);
    } finally {
      setLoadingTableData(false);
    }
  };

  const handleClearTable = (tableName: string) => {
    setTableToClear(tableName);
    setShowClearConfirm(true);
  };

  const confirmClearTable = async () => {
    if (!tableToClear) {
      return;
    }

    try {
      await statsService.clearTable(tableToClear);
      setShowClearConfirm(false);
      setTableToClear(null);
      if (selectedTable === tableToClear) {
        setSelectedTable(null);
        setTableData([]);
      }
      await loadStats();
      alert(`Table "${tableToClear}" cleared successfully`);
    } catch (error) {
      console.error(`Failed to clear ${tableToClear}:`, error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      alert(`Failed to clear table: ${errorMessage}`);
    }
  };

  const handleClearAllData = () => {
    setShowClearAllConfirm(true);
  };

  const confirmClearAllData = async () => {
    try {
      await statsService.clearAllData();
      setShowClearAllConfirm(false);
      setSelectedTable(null);
      setTableData([]);
      await loadStats();
      alert('All data cleared successfully');
    } catch (error) {
      console.error('Failed to clear all data:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      alert(`Failed to clear all data: ${errorMessage}`);
    }
  };

  const handleDeleteRow = async (tableName: string, row: unknown) => {
    if (!confirm('Are you sure you want to delete this row?')) {
      return;
    }

    try {
      switch (tableName) {
        case 'bookmarks':
          await statsService.deleteBookmark((row as Bookmark).id);
          break;
        case 'content':
          await statsService.deleteContent(
            (row as Content).bookmarkId,
            (row as Content).url
          );
          break;
        case 'embeddings':
          await statsService.deleteEmbedding(
            (row as Embedding).bookmarkId,
            (row as Embedding).providerId
          );
          break;
        case 'tags':
          await statsService.deleteTag((row as Tag).id);
          break;
        case 'bookmarkTags':
          await statsService.deleteBookmarkTag(
            (row as BookmarkTag).bookmarkId,
            (row as BookmarkTag).tagId
          );
          break;
        case 'relatedPages':
          await statsService.deleteRelatedPage((row as RelatedPage).id);
          break;
        case 'embeddingProviders':
          await statsService.deleteProvider((row as EmbeddingProvider).id);
          break;
      }
      await loadTableData(tableName);
      await loadStats();
    } catch (error) {
      console.error(`Failed to delete row:`, error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      alert(`Failed to delete row: ${errorMessage}`);
    }
  };

  const renderRowKey = (tableName: string, row: unknown): string => {
    switch (tableName) {
      case 'bookmarks':
        return `${(row as Bookmark).id}: ${(row as Bookmark).title}`;
      case 'content':
        return `${(row as Content).bookmarkId} - ${(row as Content).url}`;
      case 'embeddings':
        return `${(row as Embedding).bookmarkId} + ${(row as Embedding).providerId}`;
      case 'tags':
        return `${(row as Tag).id}: ${(row as Tag).name}`;
      case 'bookmarkTags':
        return `${(row as BookmarkTag).bookmarkId} + ${(row as BookmarkTag).tagId}`;
      case 'relatedPages':
        return `${(row as RelatedPage).id}: ${(row as RelatedPage).url}`;
      case 'embeddingProviders':
        return `${(row as EmbeddingProvider).id}: ${(row as EmbeddingProvider).name}`;
      default:
        return JSON.stringify(row).substring(0, 50);
    }
  };

  if (loading) {
    return (
      <Layout currentPage="monitoring">
        <div className="page-container">
          <div className="loading">Loading database statistics...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="monitoring">
      <div className="page-container">
        <h1 className="page-title">Database Monitoring</h1>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button
              onClick={() => {
                void handleRefresh();
              }}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={handleClearAllData}
              style={{ backgroundColor: '#dc3545', color: 'white' }}
            >
              Clear All Data
            </button>
          </div>

          <div
            style={{
              padding: '15px',
              backgroundColor: '#f5f5f5',
              borderRadius: '5px',
            }}
          >
            <div>
              <strong>Total Rows:</strong> {totalRows.toLocaleString()}
            </div>
            <div>
              <strong>Estimated Size:</strong>{' '}
              {statsService.formatBytes(totalSize)}
            </div>
          </div>
        </div>

        <Accordion title="Database Tables" defaultOpen>
          <div style={{ marginTop: '10px' }}>
            {stats.map((table) => (
              <div
                key={table.name}
                style={{
                  padding: '10px',
                  marginBottom: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  backgroundColor:
                    selectedTable === table.name ? '#e3f2fd' : 'white',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong>{table.name}</strong>
                    <div style={{ fontSize: '0.9em', color: '#666' }}>
                      Rows: {table.rowCount.toLocaleString()} | Size:{' '}
                      {statsService.formatBytes(table.estimatedSize)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      onClick={() => {
                        void loadTableData(table.name);
                      }}
                      style={{ fontSize: '0.9em' }}
                    >
                      View Rows
                    </button>
                    <button
                      onClick={() => handleClearTable(table.name)}
                      style={{
                        fontSize: '0.9em',
                        backgroundColor: '#dc3545',
                        color: 'white',
                      }}
                      disabled={table.rowCount === 0}
                    >
                      Clear Table
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Accordion>

        {selectedTable && (
          <Accordion
            title={`${selectedTable} Rows (${tableData.length})`}
            defaultOpen
          >
            {loadingTableData ? (
              <div className="loading">Loading table data...</div>
            ) : (
              <div
                style={{
                  marginTop: '10px',
                  maxHeight: '400px',
                  overflow: 'auto',
                }}
              >
                {tableData.length === 0 ? (
                  <div style={{ padding: '10px', color: '#666' }}>
                    No data in this table
                  </div>
                ) : (
                  tableData.map((row, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '8px',
                        marginBottom: '5px',
                        border: '1px solid #eee',
                        borderRadius: '3px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.85em',
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {renderRowKey(selectedTable, row)}
                      </div>
                      <button
                        onClick={() => {
                          void handleDeleteRow(selectedTable, row);
                        }}
                        style={{
                          fontSize: '0.8em',
                          padding: '4px 8px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </Accordion>
        )}

        <Modal
          isOpen={showClearConfirm}
          onClose={() => {
            setShowClearConfirm(false);
            setTableToClear(null);
          }}
          title="Confirm Clear Table"
        >
          <div style={{ padding: '20px' }}>
            <p>
              Are you sure you want to clear all data from the "{tableToClear}"
              table? This action cannot be undone.
            </p>
            <div
              style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
                marginTop: '20px',
              }}
            >
              <button
                onClick={() => {
                  setShowClearConfirm(false);
                  setTableToClear(null);
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  void confirmClearTable();
                }}
                style={{ backgroundColor: '#dc3545', color: 'white' }}
              >
                Clear Table
              </button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={showClearAllConfirm}
          onClose={() => setShowClearAllConfirm(false)}
          title="Confirm Clear All Data"
        >
          <div style={{ padding: '20px' }}>
            <p>
              <strong>Warning:</strong> This will permanently delete all data
              from all tables in the database. This action cannot be undone.
            </p>
            <p>Are you absolutely sure you want to proceed?</p>
            <div
              style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
                marginTop: '20px',
              }}
            >
              <button onClick={() => setShowClearAllConfirm(false)}>
                Cancel
              </button>
              <button
                onClick={() => {
                  void confirmClearAllData();
                }}
                style={{ backgroundColor: '#dc3545', color: 'white' }}
              >
                Clear All Data
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};
