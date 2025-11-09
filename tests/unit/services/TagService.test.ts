import { TagService } from '@/services/TagService';
import { db } from '@/storage/database';
import { TagSource, TagAssignmentSource } from '@/types/tag';
import { DEFAULT_TAGS } from '@/constants/defaultTags';

describe('TagService', () => {
  let tagService: TagService;

  beforeEach(async () => {
    TagService.resetInstance();
    tagService = new TagService();
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
    TagService.resetInstance();
  });

  describe('createTag', () => {
    it('should create a user tag with all properties', async () => {
      const tag = await tagService.createTag(
        'test-tag',
        TagSource.USER,
        'Test description',
        '#ff0000'
      );

      expect(tag.name).toBe('test-tag');
      expect(tag.source).toBe(TagSource.USER);
      expect(tag.description).toBe('Test description');
      expect(tag.color).toBe('#ff0000');
      expect(tag.usageCount).toBe(0);
      expect(tag.id).toBeDefined();
      expect(tag.createdAt).toBeInstanceOf(Date);
      expect(tag.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a tag with minimal properties', async () => {
      const tag = await tagService.createTag('minimal-tag');

      expect(tag.name).toBe('minimal-tag');
      expect(tag.source).toBe(TagSource.USER);
      expect(tag.description).toBeUndefined();
      expect(tag.color).toBeUndefined();
      expect(tag.usageCount).toBe(0);
    });

    it('should throw error when creating duplicate tag', async () => {
      await tagService.createTag('duplicate');

      await expect(tagService.createTag('duplicate')).rejects.toThrow(
        'Tag with name "duplicate" already exists'
      );
    });
  });

  describe('getTag', () => {
    it('should retrieve tag by id', async () => {
      const created = await tagService.createTag('test-tag');
      const retrieved = await tagService.getTag(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('test-tag');
    });

    it('should return undefined for non-existent tag', async () => {
      const tag = await tagService.getTag('non-existent-id');
      expect(tag).toBeUndefined();
    });
  });

  describe('getTagByName', () => {
    it('should retrieve tag by name', async () => {
      await tagService.createTag('search-tag');
      const tag = await tagService.getTagByName('search-tag');

      expect(tag).toBeDefined();
      expect(tag?.name).toBe('search-tag');
    });

    it('should return undefined for non-existent tag name', async () => {
      const tag = await tagService.getTagByName('non-existent');
      expect(tag).toBeUndefined();
    });
  });

  describe('getAllTags', () => {
    it('should return all tags', async () => {
      await tagService.createTag('tag1');
      await tagService.createTag('tag2');
      await tagService.createTag('tag3');

      const tags = await tagService.getAllTags();
      expect(tags).toHaveLength(3);
      expect(tags.map((t) => t.name)).toContain('tag1');
      expect(tags.map((t) => t.name)).toContain('tag2');
      expect(tags.map((t) => t.name)).toContain('tag3');
    });

    it('should return empty array when no tags exist', async () => {
      const tags = await tagService.getAllTags();
      expect(tags).toEqual([]);
    });
  });

  describe('getDefaultTags', () => {
    it('should return only default tags', async () => {
      await tagService.createTag('default1', TagSource.DEFAULT);
      await tagService.createTag('user1', TagSource.USER);
      await tagService.createTag('default2', TagSource.DEFAULT);

      const defaultTags = await tagService.getDefaultTags();
      expect(defaultTags).toHaveLength(2);
      expect(defaultTags.every((t) => t.source === TagSource.DEFAULT)).toBe(
        true
      );
    });
  });

  describe('renameTag', () => {
    it('should rename tag successfully', async () => {
      const tag = await tagService.createTag('old-name');
      await tagService.renameTag(tag.id, 'new-name');

      const updated = await tagService.getTag(tag.id);
      expect(updated?.name).toBe('new-name');
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(
        tag.updatedAt.getTime()
      );
    });

    it('should throw error when renaming to existing tag name', async () => {
      const tag1 = await tagService.createTag('tag1');
      await tagService.createTag('tag2');

      await expect(tagService.renameTag(tag1.id, 'tag2')).rejects.toThrow(
        'Cannot rename: Tag with name "tag2" already exists'
      );
    });

    it('should throw error when renaming non-existent tag', async () => {
      await expect(
        tagService.renameTag('non-existent', 'new-name')
      ).rejects.toThrow('Tag with id "non-existent" not found');
    });
  });

  describe('updateTagDescription', () => {
    it('should update tag description', async () => {
      const tag = await tagService.createTag('test-tag');
      await tagService.updateTagDescription(tag.id, 'New description');

      const updated = await tagService.getTag(tag.id);
      expect(updated?.description).toBe('New description');
    });

    it('should throw error for non-existent tag', async () => {
      await expect(
        tagService.updateTagDescription('non-existent', 'description')
      ).rejects.toThrow('Tag with id "non-existent" not found');
    });
  });

  describe('updateTagColor', () => {
    it('should update tag color', async () => {
      const tag = await tagService.createTag('test-tag');
      await tagService.updateTagColor(tag.id, '#00ff00');

      const updated = await tagService.getTag(tag.id);
      expect(updated?.color).toBe('#00ff00');
    });

    it('should throw error for non-existent tag', async () => {
      await expect(
        tagService.updateTagColor('non-existent', '#000000')
      ).rejects.toThrow('Tag with id "non-existent" not found');
    });
  });

  describe('deleteTag', () => {
    it('should delete user-created tag', async () => {
      const tag = await tagService.createTag('user-tag', TagSource.USER);
      await tagService.deleteTag(tag.id);

      const deleted = await tagService.getTag(tag.id);
      expect(deleted).toBeUndefined();
    });

    it('should throw error when deleting default tag', async () => {
      const tag = await tagService.createTag('default-tag', TagSource.DEFAULT);

      await expect(tagService.deleteTag(tag.id)).rejects.toThrow(
        'Cannot delete default tags'
      );
    });

    it('should remove all bookmark associations when deleting tag', async () => {
      const tag = await tagService.createTag('test-tag', TagSource.USER);
      await tagService.assignTagToBookmark('bookmark1', tag.id);
      await tagService.assignTagToBookmark('bookmark2', tag.id);

      await tagService.deleteTag(tag.id);

      const bookmarkTags = await db.bookmarkTags
        .where('tagId')
        .equals(tag.id)
        .toArray();
      expect(bookmarkTags).toHaveLength(0);
    });

    it('should throw error for non-existent tag', async () => {
      await expect(tagService.deleteTag('non-existent')).rejects.toThrow(
        'Tag with id "non-existent" not found'
      );
    });
  });

  describe('mergeTags', () => {
    it('should merge source tag into target tag', async () => {
      const sourceTag = await tagService.createTag('source', TagSource.USER);
      const targetTag = await tagService.createTag('target', TagSource.USER);

      await tagService.assignTagToBookmark('bookmark1', sourceTag.id);
      await tagService.assignTagToBookmark('bookmark2', sourceTag.id);
      await tagService.assignTagToBookmark('bookmark3', targetTag.id);

      await tagService.mergeTags(sourceTag.id, targetTag.id);

      const sourceExists = await tagService.getTag(sourceTag.id);
      expect(sourceExists).toBeUndefined();

      const targetBookmarks = await tagService.getTaggedBookmarks(targetTag.id);
      expect(targetBookmarks).toHaveLength(3);
      expect(targetBookmarks).toContain('bookmark1');
      expect(targetBookmarks).toContain('bookmark2');
      expect(targetBookmarks).toContain('bookmark3');
    });

    it('should not create duplicate bookmark associations during merge', async () => {
      const sourceTag = await tagService.createTag('source', TagSource.USER);
      const targetTag = await tagService.createTag('target', TagSource.USER);

      await tagService.assignTagToBookmark('bookmark1', sourceTag.id);
      await tagService.assignTagToBookmark('bookmark1', targetTag.id);

      await tagService.mergeTags(sourceTag.id, targetTag.id);

      const targetBookmarks = await tagService.getTaggedBookmarks(targetTag.id);
      expect(targetBookmarks).toHaveLength(1);
      expect(targetBookmarks).toContain('bookmark1');
    });

    it('should throw error when merging default tag', async () => {
      const defaultTag = await tagService.createTag(
        'default',
        TagSource.DEFAULT
      );
      const userTag = await tagService.createTag('user', TagSource.USER);

      await expect(
        tagService.mergeTags(defaultTag.id, userTag.id)
      ).rejects.toThrow('Cannot merge default tags');
    });

    it('should throw error when merging tag with itself', async () => {
      const tag = await tagService.createTag('tag');

      await expect(tagService.mergeTags(tag.id, tag.id)).rejects.toThrow(
        'Cannot merge a tag with itself'
      );
    });

    it('should throw error when source tag does not exist', async () => {
      const targetTag = await tagService.createTag('target');

      await expect(
        tagService.mergeTags('non-existent', targetTag.id)
      ).rejects.toThrow('Source tag with id "non-existent" not found');
    });

    it('should throw error when target tag does not exist', async () => {
      const sourceTag = await tagService.createTag('source');

      await expect(
        tagService.mergeTags(sourceTag.id, 'non-existent')
      ).rejects.toThrow('Target tag with id "non-existent" not found');
    });
  });

  describe('assignTagToBookmark', () => {
    it('should assign tag to bookmark', async () => {
      const tag = await tagService.createTag('test-tag');
      await tagService.assignTagToBookmark('bookmark1', tag.id);

      const tags = await tagService.getBookmarkTags('bookmark1');
      expect(tags).toHaveLength(1);
      expect(tags[0]?.name).toBe('test-tag');

      const updatedTag = await tagService.getTag(tag.id);
      expect(updatedTag?.usageCount).toBe(1);
    });

    it('should track assignment source', async () => {
      const tag = await tagService.createTag('test-tag');
      await tagService.assignTagToBookmark(
        'bookmark1',
        tag.id,
        TagAssignmentSource.LLM
      );

      const bookmarkTag = await db.bookmarkTags.get(['bookmark1', tag.id]);
      expect(bookmarkTag?.assignedBy).toBe(TagAssignmentSource.LLM);
    });

    it('should not create duplicate assignments', async () => {
      const tag = await tagService.createTag('test-tag');
      await tagService.assignTagToBookmark('bookmark1', tag.id);
      await tagService.assignTagToBookmark('bookmark1', tag.id);

      const tags = await tagService.getBookmarkTags('bookmark1');
      expect(tags).toHaveLength(1);

      const updatedTag = await tagService.getTag(tag.id);
      expect(updatedTag?.usageCount).toBe(1);
    });

    it('should throw error for non-existent tag', async () => {
      await expect(
        tagService.assignTagToBookmark('bookmark1', 'non-existent')
      ).rejects.toThrow('Tag with id "non-existent" not found');
    });
  });

  describe('removeTagFromBookmark', () => {
    it('should remove tag from bookmark', async () => {
      const tag = await tagService.createTag('test-tag');
      await tagService.assignTagToBookmark('bookmark1', tag.id);
      await tagService.removeTagFromBookmark('bookmark1', tag.id);

      const tags = await tagService.getBookmarkTags('bookmark1');
      expect(tags).toHaveLength(0);

      const updatedTag = await tagService.getTag(tag.id);
      expect(updatedTag?.usageCount).toBe(0);
    });

    it('should handle removing non-existent association', async () => {
      const tag = await tagService.createTag('test-tag');
      await expect(
        tagService.removeTagFromBookmark('bookmark1', tag.id)
      ).resolves.not.toThrow();
    });

    it('should throw error for non-existent tag', async () => {
      await expect(
        tagService.removeTagFromBookmark('bookmark1', 'non-existent')
      ).rejects.toThrow('Tag with id "non-existent" not found');
    });

    it('should not allow negative usage count', async () => {
      const tag = await tagService.createTag('test-tag');
      await tagService.removeTagFromBookmark('bookmark1', tag.id);

      const updatedTag = await tagService.getTag(tag.id);
      expect(updatedTag?.usageCount).toBe(0);
    });
  });

  describe('getBookmarkTags', () => {
    it('should return all tags for a bookmark', async () => {
      const tag1 = await tagService.createTag('tag1');
      const tag2 = await tagService.createTag('tag2');
      const tag3 = await tagService.createTag('tag3');

      await tagService.assignTagToBookmark('bookmark1', tag1.id);
      await tagService.assignTagToBookmark('bookmark1', tag2.id);
      await tagService.assignTagToBookmark('bookmark1', tag3.id);

      const tags = await tagService.getBookmarkTags('bookmark1');
      expect(tags).toHaveLength(3);
      expect(tags.map((t) => t.name)).toContain('tag1');
      expect(tags.map((t) => t.name)).toContain('tag2');
      expect(tags.map((t) => t.name)).toContain('tag3');
    });

    it('should return empty array for bookmark with no tags', async () => {
      const tags = await tagService.getBookmarkTags('bookmark1');
      expect(tags).toEqual([]);
    });
  });

  describe('getTaggedBookmarks', () => {
    it('should return all bookmarks with a tag', async () => {
      const tag = await tagService.createTag('test-tag');

      await tagService.assignTagToBookmark('bookmark1', tag.id);
      await tagService.assignTagToBookmark('bookmark2', tag.id);
      await tagService.assignTagToBookmark('bookmark3', tag.id);

      const bookmarks = await tagService.getTaggedBookmarks(tag.id);
      expect(bookmarks).toHaveLength(3);
      expect(bookmarks).toContain('bookmark1');
      expect(bookmarks).toContain('bookmark2');
      expect(bookmarks).toContain('bookmark3');
    });

    it('should return empty array for tag with no bookmarks', async () => {
      const tag = await tagService.createTag('test-tag');
      const bookmarks = await tagService.getTaggedBookmarks(tag.id);
      expect(bookmarks).toEqual([]);
    });
  });

  describe('isDeletable', () => {
    it('should return false for default tags', async () => {
      const tag = await tagService.createTag('default-tag', TagSource.DEFAULT);
      const deletable = await tagService.isDeletable(tag.id);
      expect(deletable).toBe(false);
    });

    it('should return true for user tags', async () => {
      const tag = await tagService.createTag('user-tag', TagSource.USER);
      const deletable = await tagService.isDeletable(tag.id);
      expect(deletable).toBe(true);
    });

    it('should return true for folder tags', async () => {
      const tag = await tagService.createTag('folder-tag', TagSource.FOLDER);
      const deletable = await tagService.isDeletable(tag.id);
      expect(deletable).toBe(true);
    });

    it('should return true for LLM tags', async () => {
      const tag = await tagService.createTag('llm-tag', TagSource.LLM);
      const deletable = await tagService.isDeletable(tag.id);
      expect(deletable).toBe(true);
    });

    it('should return false for non-existent tag', async () => {
      const deletable = await tagService.isDeletable('non-existent');
      expect(deletable).toBe(false);
    });
  });

  describe('restoreDefaultTags', () => {
    it('should create all default tags', async () => {
      await tagService.restoreDefaultTags();

      const defaultTags = await tagService.getDefaultTags();
      expect(defaultTags).toHaveLength(DEFAULT_TAGS.length);

      for (const defaultTag of DEFAULT_TAGS) {
        const tag = await tagService.getTagByName(defaultTag.name);
        expect(tag).toBeDefined();
        expect(tag?.source).toBe(TagSource.DEFAULT);
        expect(tag?.description).toBe(defaultTag.description);
      }
    });

    it('should not duplicate default tags if called multiple times', async () => {
      await tagService.restoreDefaultTags();
      await tagService.restoreDefaultTags();
      await tagService.restoreDefaultTags();

      const defaultTags = await tagService.getDefaultTags();
      expect(defaultTags).toHaveLength(DEFAULT_TAGS.length);
    });

    it('should restore missing default tags', async () => {
      await tagService.restoreDefaultTags();

      const youtubeTag = await tagService.getTagByName('youtube');
      if (youtubeTag && youtubeTag.source !== TagSource.DEFAULT) {
        await db.tags.delete(youtubeTag.id);
      }

      await tagService.restoreDefaultTags();

      const restoredTag = await tagService.getTagByName('youtube');
      expect(restoredTag).toBeDefined();
      expect(restoredTag?.source).toBe(TagSource.DEFAULT);
    });

    it('should not delete user tags when restoring defaults', async () => {
      const userTag1 = await tagService.createTag(
        'my-custom-tag',
        TagSource.USER
      );
      const userTag2 = await tagService.createTag(
        'another-tag',
        TagSource.USER
      );
      const folderTag = await tagService.createTag('work', TagSource.FOLDER);

      await tagService.restoreDefaultTags();

      const allTags = await tagService.getAllTags();
      const userTags = allTags.filter((t) => t.source === TagSource.USER);
      const folderTags = allTags.filter((t) => t.source === TagSource.FOLDER);
      const defaultTags = allTags.filter((t) => t.source === TagSource.DEFAULT);

      expect(defaultTags).toHaveLength(DEFAULT_TAGS.length);
      expect(userTags).toHaveLength(2);
      expect(folderTags).toHaveLength(1);

      expect(userTags.map((t) => t.id)).toContain(userTag1.id);
      expect(userTags.map((t) => t.id)).toContain(userTag2.id);
      expect(folderTags.map((t) => t.id)).toContain(folderTag.id);
    });
  });

  describe('bookmarks without tags', () => {
    it('should allow bookmarks to exist without any tags', async () => {
      const tags = await tagService.getBookmarkTags('untagged-bookmark');
      expect(tags).toEqual([]);
    });

    it('should handle mixed tagged and untagged bookmarks', async () => {
      const tag = await tagService.createTag('test-tag');
      await tagService.assignTagToBookmark('tagged-bookmark', tag.id);

      const taggedBookmarkTags =
        await tagService.getBookmarkTags('tagged-bookmark');
      const untaggedBookmarkTags =
        await tagService.getBookmarkTags('untagged-bookmark');

      expect(taggedBookmarkTags).toHaveLength(1);
      expect(untaggedBookmarkTags).toHaveLength(0);
    });
  });
});
