import type { Tag } from '@/types/tag';

import { TagService } from '@/services/TagService';
import { TagSource } from '@/types/tag';

const tagService = new TagService();

const tagsListContainer = document.getElementById(
  'tags-list'
) as HTMLDivElement;
const addTagBtn = document.getElementById('add-tag-btn') as HTMLButtonElement;
const restoreDefaultsBtn = document.getElementById(
  'restore-defaults-btn'
) as HTMLButtonElement;
const addModal = document.getElementById('add-modal') as HTMLDivElement;
const editModal = document.getElementById('edit-modal') as HTMLDivElement;
const addTagForm = document.getElementById('add-tag-form') as HTMLFormElement;
const editTagForm = document.getElementById('edit-tag-form') as HTMLFormElement;
const cancelAddBtn = document.getElementById(
  'cancel-add-btn'
) as HTMLButtonElement;
const cancelEditBtn = document.getElementById(
  'cancel-edit-btn'
) as HTMLButtonElement;

let currentEditingTagId: string | null = null;
let isLoading = false;

async function loadTags() {
  try {
    const tags = await tagService.getAllTags();

    if (tags.length === 0) {
      tagsListContainer.innerHTML = `
        <div class="empty-state">
          <svg fill="currentColor" viewBox="0 0 24 24">
            <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/>
          </svg>
          <p>No tags found</p>
          <p style="font-size: 12px; color: #999;">Click "Add Tag" or "Restore Defaults" to get started</p>
        </div>
      `;
      return;
    }

    tagsListContainer.innerHTML = tags.map((tag) => renderTag(tag)).join('');

    tags.forEach((tag) => {
      const deleteBtn = document.getElementById(`delete-${tag.id}`);
      const editBtn = document.getElementById(`edit-${tag.id}`);

      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          void handleDeleteTag(tag);
        });
      }

      if (editBtn) {
        editBtn.addEventListener('click', () => {
          handleEditTag(tag);
        });
      }
    });
  } catch (error) {
    tagsListContainer.innerHTML = `
      <div class="empty-state">
        <p style="color: #e74c3c;">Error loading tags</p>
        <p style="font-size: 12px; color: #999;">${error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    `;
  }
}

function renderTag(tag: Tag): string {
  const isDeletable = tag.source !== TagSource.DEFAULT;

  return `
    <div class="tag-item">
      <div class="tag-info">
        <div class="tag-name">
          ${tag.name}
          <span class="tag-badge ${tag.source}">${tag.source}</span>
        </div>
        ${tag.description ? `<div class="tag-description">${tag.description}</div>` : ''}
        <div class="tag-meta">
          Used by ${tag.usageCount} bookmark${tag.usageCount !== 1 ? 's' : ''}
        </div>
      </div>
      <div class="tag-actions">
        <button id="edit-${tag.id}" class="icon-btn" title="Edit tag">
          <svg fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        </button>
        <button id="delete-${tag.id}" class="icon-btn danger" title="Delete tag" ${!isDeletable ? 'disabled' : ''} style="${!isDeletable ? 'opacity: 0.3; cursor: not-allowed;' : ''}">
          <svg fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function showAddModal() {
  addModal.classList.add('active');
  const nameInput = document.getElementById('tag-name') as HTMLInputElement;
  nameInput.focus();
}

function hideAddModal() {
  addModal.classList.remove('active');
  addTagForm.reset();
}

function showEditModal() {
  editModal.classList.add('active');
}

function hideEditModal() {
  editModal.classList.remove('active');
  editTagForm.reset();
  currentEditingTagId = null;
}

async function handleAddTag(event: Event) {
  event.preventDefault();

  if (isLoading) {
    return;
  }

  const nameInput = document.getElementById('tag-name') as HTMLInputElement;
  const descriptionInput = document.getElementById(
    'tag-description'
  ) as HTMLTextAreaElement;

  const name = nameInput.value.trim();
  const description = descriptionInput.value.trim();

  if (!name) {
    return;
  }

  isLoading = true;

  try {
    await tagService.createTag(name, TagSource.USER, description || undefined);
    hideAddModal();
    await loadTags();
  } catch (error) {
    alert(error instanceof Error ? error.message : 'Failed to create tag');
  } finally {
    isLoading = false;
  }
}

function handleEditTag(tag: Tag) {
  currentEditingTagId = tag.id;

  const nameInput = document.getElementById(
    'edit-tag-name'
  ) as HTMLInputElement;
  const descriptionInput = document.getElementById(
    'edit-tag-description'
  ) as HTMLTextAreaElement;
  const idInput = document.getElementById('edit-tag-id') as HTMLInputElement;

  nameInput.value = tag.name;
  descriptionInput.value = tag.description ?? '';
  idInput.value = tag.id;

  showEditModal();
}

async function handleSaveEdit(event: Event) {
  event.preventDefault();

  if (isLoading || !currentEditingTagId) {
    return;
  }

  const nameInput = document.getElementById(
    'edit-tag-name'
  ) as HTMLInputElement;
  const descriptionInput = document.getElementById(
    'edit-tag-description'
  ) as HTMLTextAreaElement;

  const name = nameInput.value.trim();
  const description = descriptionInput.value.trim();

  if (!name) {
    return;
  }

  isLoading = true;

  try {
    await tagService.renameTag(currentEditingTagId, name);
    await tagService.updateTagDescription(
      currentEditingTagId,
      description || ''
    );
    hideEditModal();
    await loadTags();
  } catch (error) {
    alert(error instanceof Error ? error.message : 'Failed to update tag');
  } finally {
    isLoading = false;
  }
}

async function handleDeleteTag(tag: Tag) {
  if (isLoading) {
    return;
  }

  if (tag.source === TagSource.DEFAULT) {
    alert('Cannot delete default tags');
    return;
  }

  const confirmMessage =
    tag.usageCount > 0
      ? `Are you sure you want to delete "${tag.name}"?\n\nThis tag is used by ${tag.usageCount} bookmark${tag.usageCount !== 1 ? 's' : ''}. The tag will be removed from all bookmarks.`
      : `Are you sure you want to delete "${tag.name}"?`;

  if (!confirm(confirmMessage)) {
    return;
  }

  isLoading = true;

  try {
    await tagService.deleteTag(tag.id);
    await loadTags();
  } catch (error) {
    alert(error instanceof Error ? error.message : 'Failed to delete tag');
  } finally {
    isLoading = false;
  }
}

async function handleRestoreDefaults() {
  if (isLoading) {
    return;
  }

  if (
    !confirm(
      'This will restore all default tags. Existing default tags will not be affected.\n\nContinue?'
    )
  ) {
    return;
  }

  isLoading = true;
  restoreDefaultsBtn.disabled = true;
  addTagBtn.disabled = true;

  try {
    await tagService.restoreDefaultTags();
    await loadTags();
  } catch (error) {
    alert(
      error instanceof Error ? error.message : 'Failed to restore default tags'
    );
  } finally {
    isLoading = false;
    restoreDefaultsBtn.disabled = false;
    addTagBtn.disabled = false;
  }
}

addTagBtn.addEventListener('click', showAddModal);
restoreDefaultsBtn.addEventListener('click', () => {
  void handleRestoreDefaults();
});
cancelAddBtn.addEventListener('click', hideAddModal);
cancelEditBtn.addEventListener('click', hideEditModal);
addTagForm.addEventListener('submit', (event) => {
  void handleAddTag(event);
});
editTagForm.addEventListener('submit', (event) => {
  void handleSaveEdit(event);
});

addModal.addEventListener('click', (event) => {
  if (event.target === addModal) {
    hideAddModal();
  }
});

editModal.addEventListener('click', (event) => {
  if (event.target === editModal) {
    hideEditModal();
  }
});

void loadTags();
