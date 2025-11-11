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
  rateLimitMs: 1000,
  respectRobotsTxt: true,
  autoRetryOnFailure: true,
  maxRetries: 3,
};

export interface Settings {
  crawler: CrawlerSettings;
}

export const DEFAULT_SETTINGS: Settings = {
  crawler: DEFAULT_CRAWLER_SETTINGS,
};
