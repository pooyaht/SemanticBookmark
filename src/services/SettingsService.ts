import browser from 'webextension-polyfill';

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
}
