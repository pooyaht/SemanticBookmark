export enum TagSource {
  DEFAULT = 'default',
  USER = 'user',
  FOLDER = 'folder',
  LLM = 'llm',
}

export enum TagAssignmentSource {
  USER = 'user',
  LLM = 'llm',
  FOLDER_SYNC = 'folder_sync',
}

export interface Tag {
  id: string;
  name: string;
  source: TagSource;
  createdAt: Date;
  updatedAt: Date;
  description?: string;
  color?: string;
  usageCount: number;
}

export interface BookmarkTag {
  bookmarkId: string;
  tagId: string;
  assignedBy: TagAssignmentSource;
  assignedAt: Date;
}

export interface DefaultTagDefinition {
  name: string;
  description: string;
}
