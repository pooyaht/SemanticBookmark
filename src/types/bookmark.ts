export interface Bookmark {
  id: string;
  url: string;
  title: string;
  version: number;
  hidden: boolean;
  folderPath?: string;
  aiSummary?: string;
  userDescription?: string;
  favicon?: string;
  dateAdded: Date;
  lastModified: Date;
}

export interface EmbeddingStatus {
  providerId: string;
  version: number;
  isUpToDate: boolean;
}
