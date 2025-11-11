import React, { useState, useEffect } from 'react';

import { Layout } from '../components/Layout';

import type { CrawlerSettings } from '@/types/settings';

import { SettingsService } from '@/services/SettingsService';

const settingsService = SettingsService.getInstance();

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<CrawlerSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    void loadSettings();
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
      </div>
    </Layout>
  );
};
