export enum ContentType {
  PRIMARY = 'primary',
  RELATED = 'related',
}

export interface Content {
  bookmarkId: string;
  url: string;
  type: ContentType;
  title: string;
  description?: string;
  content: string;
  contentHash: string;
  links: string[];
  fetchedAt: number;
  fetchError?: string;
}

export interface RelatedPage {
  id: string;
  bookmarkId: string;
  url: string;
  depth: number;
  title?: string;
  discoveredAt: number;
}
