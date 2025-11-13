import type { Bookmark } from '@/types/bookmark';
import type { Tag } from '@/types/tag';

interface PreparedContent {
  text: string;
  components: {
    title: string;
    userDescription?: string;
    tags: string;
    aiSummary?: string;
  };
}

export class ContentPreparationService {
  private static instance: ContentPreparationService;

  private constructor() {}

  static getInstance(): ContentPreparationService {
    if (!ContentPreparationService.instance) {
      ContentPreparationService.instance = new ContentPreparationService();
    }
    return ContentPreparationService.instance;
  }

  prepareContentForEmbedding(bookmark: Bookmark, tags: Tag[]): PreparedContent {
    const components: PreparedContent['components'] = {
      title: bookmark.title.trim(),
      tags: this.formatTags(tags),
    };

    if (bookmark.userDescription?.trim()) {
      components.userDescription = bookmark.userDescription.trim();
    }

    if (bookmark.aiSummary?.trim()) {
      components.aiSummary = bookmark.aiSummary.trim();
    }

    const textParts: string[] = [components.title];

    if (components.userDescription) {
      textParts.push(components.userDescription);
    }

    if (components.tags) {
      textParts.push(components.tags);
    }

    if (components.aiSummary) {
      textParts.push(components.aiSummary);
      textParts.push(components.title);
      textParts.push(components.title);
    }

    const text = textParts.join('\n\n');

    return {
      text,
      components,
    };
  }

  private formatTags(tags: Tag[]): string {
    if (tags.length === 0) {
      return '';
    }

    const tagNames = tags.map((tag) => tag.name).join(', ');
    return `Tagged with: ${tagNames}`;
  }

  prepareQueryForEmbedding(query: string): string {
    return query.trim();
  }
}
