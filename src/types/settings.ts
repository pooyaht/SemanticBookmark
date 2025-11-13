import type { AIProviderSettings } from './provider';

export interface CrawlerSettings {
  enabled: boolean;
  defaultDepth: number;
  maxLinksPerPage: number;
  sameOriginOnly: boolean;
  rateLimitMs: number;
  respectRobotsTxt: boolean;
  autoRetryOnFailure: boolean;
  maxRetries: number;
}

export const DEFAULT_CRAWLER_SETTINGS: CrawlerSettings = {
  enabled: false,
  defaultDepth: 0,
  maxLinksPerPage: 10,
  sameOriginOnly: true,
  rateLimitMs: 200,
  respectRobotsTxt: true,
  autoRetryOnFailure: true,
  maxRetries: 3,
};

export interface Settings {
  crawler: CrawlerSettings;
  aiProvider: AIProviderSettings;
}

export const DEFAULT_SETTINGS: Settings = {
  crawler: DEFAULT_CRAWLER_SETTINGS,
  aiProvider: {
    enabled: false,
    type: 'localai',
    endpoint: 'http://localhost:8080',
    modelName: '',
    isConnected: false,
  },
};
