import type { Tag, BookmarkTag } from '@/types/tag';

import { DEFAULT_TAGS } from '@/constants/defaultTags';
import { db } from '@/storage/database';
import { TagSource, TagAssignmentSource } from '@/types/tag';

export class TagService {
  private static instance: TagService;

  private tagCache: Map<string, Tag> = new Map();
  private cacheInitialized = false;

  static getInstance(): TagService {
    if (!TagService.instance) {
      TagService.instance = new TagService();
    }
    return TagService.instance;
  }

  static resetInstance(): void {
    if (TagService.instance) {
      TagService.instance.invalidateCache();
      TagService.instance = undefined as unknown as TagService;
    }
  }

  private async ensureCacheInitialized(): Promise<void> {
    if (!this.cacheInitialized) {
      const tags = await db.tags.toArray();
      this.tagCache.clear();
      tags.forEach((tag) => this.tagCache.set(tag.name.toLowerCase(), tag));
      this.cacheInitialized = true;
    }
  }

  private invalidateCache(): void {
    this.cacheInitialized = false;
    this.tagCache.clear();
  }

  async createTag(
    name: string,
    source: TagSource = TagSource.USER,
    description?: string,
    color?: string
  ): Promise<Tag> {
    await this.ensureCacheInitialized();

    const normalizedName = name.toLowerCase();
    if (this.tagCache.has(normalizedName)) {
      throw new Error(`Tag with name "${name}" already exists`);
    }

    const tag: Tag = {
      id: crypto.randomUUID(),
      name,
      source,
      createdAt: new Date(),
      updatedAt: new Date(),
      description,
      color,
      usageCount: 0,
    };

    await db.tags.add(tag);
    this.tagCache.set(normalizedName, tag);
    return tag;
  }

  async getTag(tagId: string): Promise<Tag | undefined> {
    return await db.tags.get(tagId);
  }

  async getTagByName(name: string): Promise<Tag | undefined> {
    await this.ensureCacheInitialized();
    return this.tagCache.get(name.toLowerCase());
  }

  async getAllTags(): Promise<Tag[]> {
    await this.ensureCacheInitialized();
    return Array.from(this.tagCache.values());
  }

  async getDefaultTags(): Promise<Tag[]> {
    return await db.tags.where('source').equals(TagSource.DEFAULT).toArray();
  }

  async renameTag(tagId: string, newName: string): Promise<void> {
    const tag = await this.getTag(tagId);
    if (!tag) {
      throw new Error(`Tag with id "${tagId}" not found`);
    }

    const existingTag = await this.getTagByName(newName);
    if (existingTag && existingTag.id !== tagId) {
      throw new Error(
        `Cannot rename: Tag with name "${newName}" already exists. Use mergeTags to combine them.`
      );
    }

    await db.tags.update(tagId, {
      name: newName,
      updatedAt: new Date(),
    });

    this.invalidateCache();
  }

  async updateTagDescription(
    tagId: string,
    description: string
  ): Promise<void> {
    const tag = await this.getTag(tagId);
    if (!tag) {
      throw new Error(`Tag with id "${tagId}" not found`);
    }

    await db.tags.update(tagId, {
      description,
      updatedAt: new Date(),
    });

    this.invalidateCache();
  }

  async updateTagColor(tagId: string, color: string): Promise<void> {
    const tag = await this.getTag(tagId);
    if (!tag) {
      throw new Error(`Tag with id "${tagId}" not found`);
    }

    await db.tags.update(tagId, {
      color,
      updatedAt: new Date(),
    });

    this.invalidateCache();
  }

  async deleteTag(tagId: string): Promise<void> {
    const tag = await this.getTag(tagId);
    if (!tag) {
      throw new Error(`Tag with id "${tagId}" not found`);
    }

    if (tag.source === TagSource.DEFAULT) {
      throw new Error('Cannot delete default tags');
    }

    await db.transaction('rw', [db.tags, db.bookmarkTags], async () => {
      await db.bookmarkTags.where('tagId').equals(tagId).delete();
      await db.tags.delete(tagId);
    });

    this.invalidateCache();
  }

  async mergeTags(sourceTagId: string, targetTagId: string): Promise<void> {
    if (sourceTagId === targetTagId) {
      throw new Error('Cannot merge a tag with itself');
    }

    const sourceTag = await this.getTag(sourceTagId);
    const targetTag = await this.getTag(targetTagId);

    if (!sourceTag) {
      throw new Error(`Source tag with id "${sourceTagId}" not found`);
    }

    if (!targetTag) {
      throw new Error(`Target tag with id "${targetTagId}" not found`);
    }

    if (sourceTag.source === TagSource.DEFAULT) {
      throw new Error('Cannot merge default tags');
    }

    await db.transaction('rw', [db.tags, db.bookmarkTags], async () => {
      const bookmarkTagsToUpdate = await db.bookmarkTags
        .where('tagId')
        .equals(sourceTagId)
        .toArray();

      for (const bookmarkTag of bookmarkTagsToUpdate) {
        const existingAssociation = await db.bookmarkTags.get([
          bookmarkTag.bookmarkId,
          targetTagId,
        ]);

        if (!existingAssociation) {
          await db.bookmarkTags.put({
            bookmarkId: bookmarkTag.bookmarkId,
            tagId: targetTagId,
            assignedBy: bookmarkTag.assignedBy,
            assignedAt: bookmarkTag.assignedAt,
          });
        }

        await db.bookmarkTags.delete([bookmarkTag.bookmarkId, sourceTagId]);
      }

      await this.recalculateUsageCount(sourceTagId);
      await this.recalculateUsageCount(targetTagId);
      await db.tags.delete(sourceTagId);
    });

    this.invalidateCache();
  }

  async assignTagToBookmark(
    bookmarkId: string,
    tagId: string,
    assignedBy: TagAssignmentSource = TagAssignmentSource.USER
  ): Promise<void> {
    const tag = await this.getTag(tagId);
    if (!tag) {
      throw new Error(`Tag with id "${tagId}" not found`);
    }

    const existingAssociation = await db.bookmarkTags.get([bookmarkId, tagId]);

    if (existingAssociation) {
      return;
    }

    await db.transaction('rw', [db.tags, db.bookmarkTags], async () => {
      const bookmarkTag: BookmarkTag = {
        bookmarkId,
        tagId,
        assignedBy,
        assignedAt: new Date(),
      };

      await db.bookmarkTags.add(bookmarkTag);
      await db.tags.update(tagId, {
        usageCount: tag.usageCount + 1,
      });
    });
  }

  async removeTagFromBookmark(
    bookmarkId: string,
    tagId: string
  ): Promise<void> {
    const tag = await this.getTag(tagId);
    if (!tag) {
      throw new Error(`Tag with id "${tagId}" not found`);
    }

    const existingAssociation = await db.bookmarkTags.get([bookmarkId, tagId]);

    if (!existingAssociation) {
      return;
    }

    await db.transaction('rw', [db.tags, db.bookmarkTags], async () => {
      await db.bookmarkTags.delete([bookmarkId, tagId]);
      await db.tags.update(tagId, {
        usageCount: Math.max(0, tag.usageCount - 1),
      });
    });
  }

  async getBookmarkTags(bookmarkId: string): Promise<Tag[]> {
    const bookmarkTags = await db.bookmarkTags
      .where('bookmarkId')
      .equals(bookmarkId)
      .toArray();

    const tagIds = bookmarkTags.map((bt) => bt.tagId);
    const tags = await db.tags.bulkGet(tagIds);

    return tags.filter((tag): tag is Tag => tag !== undefined);
  }

  async getTaggedBookmarks(tagId: string): Promise<string[]> {
    const bookmarkTags = await db.bookmarkTags
      .where('tagId')
      .equals(tagId)
      .toArray();

    return bookmarkTags.map((bt) => bt.bookmarkId);
  }

  async isDeletable(tagId: string): Promise<boolean> {
    const tag = await this.getTag(tagId);
    if (!tag) {
      return false;
    }

    return tag.source !== TagSource.DEFAULT;
  }

  async restoreDefaultTags(): Promise<void> {
    const uniqueTagNames = new Set<string>();
    const tagsToCreate: Array<{ name: string; description: string }> = [];

    for (const defaultTag of DEFAULT_TAGS) {
      const normalizedName = defaultTag.name.toLowerCase();
      if (!uniqueTagNames.has(normalizedName)) {
        uniqueTagNames.add(normalizedName);
        tagsToCreate.push(defaultTag);
      }
    }

    for (const tagDef of tagsToCreate) {
      const exists = await this.getTagByName(tagDef.name);
      if (!exists) {
        await this.createTag(
          tagDef.name,
          TagSource.DEFAULT,
          tagDef.description
        );
      }
    }
  }

  private async recalculateUsageCount(tagId: string): Promise<void> {
    const count = await db.bookmarkTags.where('tagId').equals(tagId).count();
    await db.tags.update(tagId, { usageCount: count });
  }
}
