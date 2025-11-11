import React, { useState, useEffect } from 'react';

import { Layout } from '../components/Layout';
import { ProviderFormModal } from '../components/ProviderFormModal';

import type {
  EmbeddingProvider,
  AIProviderSettings,
  ProviderType,
} from '@/types/provider';
import type { CrawlerSettings } from '@/types/settings';

import { EmbeddingProviderService } from '@/services/EmbeddingProviderService';
import { SettingsService } from '@/services/SettingsService';

const settingsService = SettingsService.getInstance();
const providerService = EmbeddingProviderService.getInstance();

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<CrawlerSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [providers, setProviders] = useState<EmbeddingProvider[]>([]);
  const [activeProvider, setActiveProvider] =
    useState<EmbeddingProvider | null>(null);
  const [providerStats, setProviderStats] = useState<{
    [key: string]: { total: number; indexed: number };
  }>({});
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<
    string | undefined
  >();

  const [aiSettings, setAiSettings] = useState<AIProviderSettings | null>(null);
  const [aiTestingConnection, setAiTestingConnection] = useState(false);
  const [hasAiChanges, setHasAiChanges] = useState(false);

  useEffect(() => {
    void loadSettings();
    void loadProviders();
    void loadAISettings();
  }, []);

  const loadSettings = async () => {
    try {
      const crawlerSettings = await settingsService.getCrawlerSettings();
      setSettings(crawlerSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      const allProviders = await providerService.getAllProviders();
      setProviders(allProviders);

      const active = await providerService.getActiveProvider();
      setActiveProvider(active ?? null);

      const stats: { [key: string]: { total: number; indexed: number } } = {};
      for (const provider of allProviders) {
        const providerStats = await providerService.getProviderStats(
          provider.id
        );
        stats[provider.id] = {
          total: providerStats.totalBookmarks,
          indexed: providerStats.indexedBookmarks,
        };
      }
      setProviderStats(stats);
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  const loadAISettings = async () => {
    try {
      const settings = await settingsService.getAIProviderSettings();
      setAiSettings(settings);
    } catch (error) {
      console.error('Failed to load AI settings:', error);
    }
  };

  const handleChange = <K extends keyof CrawlerSettings>(
    key: K,
    value: CrawlerSettings[K]
  ) => {
    if (!settings) {
      return;
    }
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!settings || saving) {
      return;
    }

    setSaving(true);
    try {
      await settingsService.updateCrawlerSettings(settings);
      setHasChanges(false);
    } catch {
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        'Are you sure you want to reset all settings to their default values?'
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      await settingsService.resetToDefaults();
      await loadSettings();
      setHasChanges(false);
    } catch {
      alert('Failed to reset settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const calculateEstimatedPages = (): number => {
    if (!settings) {
      return 0;
    }
    return 1 + settings.defaultDepth;
  };

  const calculateEstimatedStorage = (): string => {
    const pages = calculateEstimatedPages();
    const sizeKb = pages * 50;
    if (sizeKb < 1024) {
      return `~${sizeKb} KB`;
    }
    return `~${(sizeKb / 1024).toFixed(1)} MB`;
  };

  const handleAddProvider = () => {
    setEditingProviderId(undefined);
    setShowProviderModal(true);
  };

  const handleEditProvider = (providerId: string) => {
    setEditingProviderId(providerId);
    setShowProviderModal(true);
  };

  const handleDeleteProvider = async (providerId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this provider? Embeddings will be kept.'
      )
    ) {
      return;
    }

    try {
      await providerService.deleteProvider(providerId);
      await loadProviders();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : 'Failed to delete provider'
      );
    }
  };

  const handleSetActiveProvider = async (providerId: string) => {
    try {
      await providerService.setActiveProvider(providerId);
      await loadProviders();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : 'Failed to set active provider'
      );
    }
  };

  const handleTestProvider = async (providerId: string) => {
    try {
      const result = await providerService.testProviderConnection(providerId);
      if (result.success) {
        alert('Connection successful!');
      } else {
        alert(`Connection failed: ${result.error}`);
      }
      await loadProviders();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : 'Failed to test connection'
      );
    }
  };

  const handleAISettingChange = <K extends keyof AIProviderSettings>(
    key: K,
    value: AIProviderSettings[K]
  ) => {
    if (!aiSettings) {
      return;
    }
    setAiSettings({ ...aiSettings, [key]: value });
    setHasAiChanges(true);
  };

  const handleTestAIConnection = async () => {
    setAiTestingConnection(true);
    try {
      const result = await settingsService.testAIProviderConnection();
      if (result.success) {
        alert('AI provider connected successfully!');
        await loadAISettings();
      } else {
        alert(`Connection failed: ${result.error}`);
      }
    } catch (error) {
      alert(
        error instanceof Error ? error.message : 'Failed to test AI connection'
      );
    } finally {
      setAiTestingConnection(false);
    }
  };

  const handleSaveAISettings = async () => {
    if (!aiSettings) {
      return;
    }

    setSaving(true);
    try {
      await settingsService.updateAIProviderSettings(aiSettings);
      setHasAiChanges(false);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : 'Failed to save AI settings'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <Layout currentPage="settings">
        <div className="header">
          <h1>Settings</h1>
        </div>
        <div className="empty-state">
          <p>Loading settings...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="settings">
      <div className="header">
        <h1>Settings</h1>
        <div>
          <button
            className="btn btn-secondary btn-small"
            onClick={() => {
              void handleReset();
            }}
            disabled={saving}
          >
            Reset to Defaults
          </button>
          {hasChanges && (
            <button
              className="btn btn-primary btn-small"
              onClick={() => {
                void handleSave();
              }}
              disabled={saving}
              style={{ marginLeft: '8px' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      <div className="settings-container">
        <div className="settings-section">
          <h2 className="settings-section-title">Content Crawling</h2>
          <p className="settings-section-description">
            Configure how the extension fetches and indexes webpage content for
            your bookmarks.
          </p>

          <div className="settings-group">
            <div className="setting-item">
              <div className="setting-header">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => handleChange('enabled', e.target.checked)}
                  />
                  <span>Enable automatic crawling</span>
                </label>
              </div>
              <p className="setting-description">
                Automatically fetch and extract content when bookmarks are
                added. You can still manually trigger crawling when disabled.
              </p>
            </div>

            <div className="setting-item">
              <div className="setting-header">
                <label className="setting-label-text">Crawl depth</label>
                <span className="setting-value">{settings.defaultDepth}</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={settings.defaultDepth}
                onChange={(e) =>
                  handleChange('defaultDepth', parseInt(e.target.value))
                }
                className="setting-slider"
              />
              <p className="setting-description">
                Depth {settings.defaultDepth} = Original page +{' '}
                {settings.defaultDepth} direct link
                {settings.defaultDepth !== 1 ? 's' : ''} ={' '}
                {calculateEstimatedPages()} page
                {calculateEstimatedPages() !== 1 ? 's' : ''} total
                <br />
                Estimated storage per bookmark: {calculateEstimatedStorage()}
              </p>
            </div>

            <div className="setting-item">
              <div className="setting-header">
                <label className="setting-label-text">
                  Maximum links per page
                </label>
                <span className="setting-value">
                  {settings.maxLinksPerPage}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={settings.maxLinksPerPage}
                onChange={(e) =>
                  handleChange('maxLinksPerPage', parseInt(e.target.value))
                }
                className="setting-slider"
              />
              <p className="setting-description">
                When crawling at depth &gt; 0, limit how many links to follow
                from the original page. Lower values save storage but may miss
                content.
              </p>
            </div>

            <div className="setting-item">
              <div className="setting-header">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={settings.sameOriginOnly}
                    onChange={(e) =>
                      handleChange('sameOriginOnly', e.target.checked)
                    }
                  />
                  <span>Same-origin links only</span>
                </label>
              </div>
              <p className="setting-description">
                Only follow links from the same domain. Recommended to keep
                crawling focused and prevent following external links.
              </p>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">Advanced Options</h2>

          <div className="settings-group">
            <div className="setting-item">
              <div className="setting-header">
                <label className="setting-label-text">
                  Rate limit (milliseconds)
                </label>
                <span className="setting-value">{settings.rateLimitMs}ms</span>
              </div>
              <input
                type="range"
                min="100"
                max="5000"
                step="100"
                value={settings.rateLimitMs}
                onChange={(e) =>
                  handleChange('rateLimitMs', parseInt(e.target.value))
                }
                className="setting-slider"
              />
              <p className="setting-description">
                Minimum time between requests to avoid overwhelming servers.
                Higher values are more polite but slower.
              </p>
            </div>

            <div className="setting-item">
              <div className="setting-header">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={settings.respectRobotsTxt}
                    onChange={(e) =>
                      handleChange('respectRobotsTxt', e.target.checked)
                    }
                  />
                  <span>Respect robots.txt</span>
                </label>
              </div>
              <p className="setting-description">
                Honor website robots.txt directives. Recommended for ethical
                crawling.
              </p>
            </div>

            <div className="setting-item">
              <div className="setting-header">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={settings.autoRetryOnFailure}
                    onChange={(e) =>
                      handleChange('autoRetryOnFailure', e.target.checked)
                    }
                  />
                  <span>Auto-retry on failure</span>
                </label>
              </div>
              <p className="setting-description">
                Automatically retry failed requests with exponential backoff.
              </p>
            </div>

            {settings.autoRetryOnFailure && (
              <div className="setting-item">
                <div className="setting-header">
                  <label className="setting-label-text">Maximum retries</label>
                  <span className="setting-value">{settings.maxRetries}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={settings.maxRetries}
                  onChange={(e) =>
                    handleChange('maxRetries', parseInt(e.target.value))
                  }
                  className="setting-slider"
                />
                <p className="setting-description">
                  Number of retry attempts before marking a crawl as failed.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">
            Embedding Providers (Required)
          </h2>
          <p className="settings-section-description">
            Configure embedding providers for semantic search. At least one
            provider must be configured and active.
          </p>

          <div className="settings-group">
            {activeProvider && (
              <div className="provider-card active">
                <div className="provider-header">
                  <div>
                    <h3 className="provider-name">{activeProvider.name}</h3>
                    <div className="provider-meta">
                      <span className="provider-type">
                        {activeProvider.type}
                      </span>
                      <span
                        className={`provider-status ${activeProvider.isConnected ? 'connected' : 'disconnected'}`}
                      >
                        {activeProvider.isConnected
                          ? '● Connected'
                          : '○ Not tested'}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => handleEditProvider(activeProvider.id)}
                  >
                    Edit
                  </button>
                </div>

                <div className="provider-details">
                  <div className="provider-detail-item">
                    <span className="provider-detail-label">Endpoint:</span>
                    <span className="provider-detail-value">
                      {activeProvider.endpoint}
                    </span>
                  </div>
                  <div className="provider-detail-item">
                    <span className="provider-detail-label">Model:</span>
                    <span className="provider-detail-value">
                      {activeProvider.modelName}
                    </span>
                  </div>
                  {providerStats[activeProvider.id] && (
                    <div className="provider-detail-item">
                      <span className="provider-detail-label">Indexed:</span>
                      <span className="provider-detail-value">
                        {providerStats[activeProvider.id]?.indexed} /{' '}
                        {providerStats[activeProvider.id]?.total} bookmarks
                      </span>
                    </div>
                  )}
                </div>

                <div className="provider-actions">
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => {
                      void handleTestProvider(activeProvider.id);
                    }}
                  >
                    Test Connection
                  </button>
                  <button className="btn btn-secondary btn-small" disabled>
                    Reindex All
                  </button>
                </div>
              </div>
            )}

            {!activeProvider && (
              <div className="alert alert-warning">
                No active provider configured. Search will use phrase matching
                only.
              </div>
            )}

            {providers.length > 0 && (
              <div>
                <h3 style={{ marginTop: '24px', marginBottom: '12px' }}>
                  All Providers
                </h3>
                <div className="provider-list">
                  {providers.map((provider) => (
                    <div
                      key={provider.id}
                      className={`provider-list-item ${provider.isActive ? 'active' : ''}`}
                    >
                      <div className="provider-list-info">
                        <div>
                          <span className="provider-list-name">
                            {provider.name}
                          </span>
                          {provider.isActive && (
                            <span className="badge">Active</span>
                          )}
                        </div>
                        <div className="provider-list-meta">
                          {provider.endpoint} - {provider.modelName}
                        </div>
                      </div>
                      <div className="provider-list-actions">
                        {!provider.isActive && (
                          <button
                            className="btn btn-link btn-small"
                            onClick={() => {
                              void handleSetActiveProvider(provider.id);
                            }}
                          >
                            Set Active
                          </button>
                        )}
                        <button
                          className="btn btn-link btn-small"
                          onClick={() => handleEditProvider(provider.id)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-link btn-small"
                          onClick={() => {
                            void handleDeleteProvider(provider.id);
                          }}
                          disabled={provider.isActive}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleAddProvider}
              style={{ marginTop: '16px' }}
            >
              + Add Embedding Provider
            </button>
          </div>
        </div>

        {aiSettings && (
          <div className="settings-section">
            <h2 className="settings-section-title">AI Provider (Optional)</h2>
            <p className="settings-section-description">
              Configure AI provider for query enhancement and natural language
              processing features. This is optional and separate from embedding
              providers.
            </p>

            <div className="settings-group">
              <div className="setting-item">
                <div className="setting-header">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={aiSettings.enabled}
                      onChange={(e) =>
                        handleAISettingChange('enabled', e.target.checked)
                      }
                    />
                    <span>Enable AI Features</span>
                  </label>
                </div>
              </div>

              {aiSettings.enabled && (
                <>
                  <div className="setting-item">
                    <label className="setting-label-text">Provider Type</label>
                    <select
                      className="form-input"
                      value={aiSettings.type}
                      onChange={(e) =>
                        handleAISettingChange(
                          'type',
                          e.target.value as ProviderType
                        )
                      }
                    >
                      <option value="localai">LocalAI</option>
                      <option value="llamacpp">llama.cpp</option>
                      <option value="ollama">Ollama</option>
                    </select>
                  </div>

                  <div className="setting-item">
                    <label className="setting-label-text">Endpoint</label>
                    <input
                      type="text"
                      className="form-input"
                      value={aiSettings.endpoint}
                      onChange={(e) =>
                        handleAISettingChange('endpoint', e.target.value)
                      }
                      placeholder="http://localhost:8080"
                    />
                  </div>

                  <div className="setting-item">
                    <label className="setting-label-text">Model Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={aiSettings.modelName}
                      onChange={(e) =>
                        handleAISettingChange('modelName', e.target.value)
                      }
                      placeholder="llama-3.1-8b-instruct"
                    />
                  </div>

                  <div className="setting-item">
                    <div
                      className={`alert ${aiSettings.isConnected ? 'alert-success' : 'alert-info'}`}
                    >
                      Status:{' '}
                      {aiSettings.isConnected ? '● Connected' : '○ Not tested'}
                      {aiSettings.lastTestedAt &&
                        ` (Last tested: ${new Date(aiSettings.lastTestedAt).toLocaleString()})`}
                    </div>
                  </div>

                  <div className="setting-item">
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => {
                        void handleTestAIConnection();
                      }}
                      disabled={aiTestingConnection}
                    >
                      {aiTestingConnection ? 'Testing...' : 'Test Connection'}
                    </button>
                    {hasAiChanges && (
                      <button
                        className="btn btn-primary btn-small"
                        onClick={() => {
                          void handleSaveAISettings();
                        }}
                        disabled={saving}
                        style={{ marginLeft: '8px' }}
                      >
                        {saving ? 'Saving...' : 'Save AI Settings'}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <ProviderFormModal
        isOpen={showProviderModal}
        onClose={() => setShowProviderModal(false)}
        onSaved={() => {
          void loadProviders();
        }}
        editingProviderId={editingProviderId}
      />
    </Layout>
  );
};
