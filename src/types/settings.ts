export enum ContentExtractionMode {
  STATIC_ONLY = 'static_only',
  HYBRID = 'hybrid',
  ALWAYS_JS = 'always_js',
}

export interface CrawlerSettings {
  enabled: boolean;
  defaultDepth: number;
  maxLinksPerPage: number;
  sameOriginOnly: boolean;
  extractionMode: ContentExtractionMode;
  rateLimitMs: number;
  respectRobotsTxt: boolean;
  showTabWhenRendering: boolean;
  autoRetryOnFailure: boolean;
  maxRetries: number;
}

export const DEFAULT_CRAWLER_SETTINGS: CrawlerSettings = {
  enabled: false,
  defaultDepth: 0,
  maxLinksPerPage: 10,
  sameOriginOnly: true,
  extractionMode: ContentExtractionMode.HYBRID,
  rateLimitMs: 1000,
  respectRobotsTxt: true,
  showTabWhenRendering: false,
  autoRetryOnFailure: true,
  maxRetries: 3,
};

export interface Settings {
  crawler: CrawlerSettings;
}

export const DEFAULT_SETTINGS: Settings = {
  crawler: DEFAULT_CRAWLER_SETTINGS,
};
