import browser from 'webextension-polyfill';

import type { AIProviderSettings, ProviderTestResult } from '@/types/provider';
import type { Settings, CrawlerSettings } from '@/types/settings';

import { DEFAULT_SETTINGS } from '@/types/settings';

const SETTINGS_KEY = 'app_settings';

export class SettingsService {
  private static instance: SettingsService;

  private constructor() {}

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  async getSettings(): Promise<Settings> {
    try {
      const result = await browser.storage.sync.get(SETTINGS_KEY);
      const stored = result[SETTINGS_KEY] as Settings | undefined;

      if (!stored) {
        await this.saveSettings(DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }

      return {
        ...DEFAULT_SETTINGS,
        ...stored,
        crawler: {
          ...DEFAULT_SETTINGS.crawler,
          ...(stored.crawler || {}),
        },
        aiProvider: {
          ...DEFAULT_SETTINGS.aiProvider,
          ...(stored.aiProvider || {}),
        },
      };
    } catch (error) {
      console.error('Failed to load settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: Settings): Promise<void> {
    try {
      await browser.storage.sync.set({ [SETTINGS_KEY]: settings });
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  async getCrawlerSettings(): Promise<CrawlerSettings> {
    const settings = await this.getSettings();
    return settings.crawler;
  }

  async updateCrawlerSettings(
    crawler: Partial<CrawlerSettings>
  ): Promise<void> {
    const settings = await this.getSettings();
    settings.crawler = {
      ...settings.crawler,
      ...crawler,
    };
    await this.saveSettings(settings);
  }

  async resetToDefaults(): Promise<void> {
    await this.saveSettings(DEFAULT_SETTINGS);
  }

  async getAIProviderSettings(): Promise<AIProviderSettings> {
    const settings = await this.getSettings();
    return settings.aiProvider;
  }

  async updateAIProviderSettings(
    aiProvider: Partial<AIProviderSettings>
  ): Promise<void> {
    const settings = await this.getSettings();
    settings.aiProvider = {
      ...settings.aiProvider,
      ...aiProvider,
    };
    await this.saveSettings(settings);
  }

  async testAIProviderConnection(): Promise<ProviderTestResult> {
    const aiProvider = await this.getAIProviderSettings();

    if (!aiProvider.enabled) {
      return {
        success: false,
        error: 'AI provider is not enabled',
      };
    }

    if (!aiProvider.endpoint || !aiProvider.modelName) {
      return {
        success: false,
        error: 'AI provider endpoint or model name is missing',
      };
    }

    try {
      const url = `${aiProvider.endpoint}/v1/chat/completions`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: aiProvider.modelName,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = (await response.json()) as {
        choices?: Array<unknown>;
      };

      if (!data.choices?.[0]) {
        return {
          success: false,
          error: 'Invalid response format from provider',
        };
      }

      await this.updateAIProviderSettings({
        isConnected: true,
        lastTestedAt: new Date(),
      });

      return {
        success: true,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await this.updateAIProviderSettings({
        isConnected: false,
        lastTestedAt: new Date(),
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
