import browser from 'webextension-polyfill';

console.log('Semantic Bookmark Search - Popup loaded');

const searchInput = document.getElementById('search-input') as HTMLInputElement;
const resultsContainer = document.getElementById('results') as HTMLDivElement;
const openSidepanelButton = document.getElementById('open-sidepanel') as HTMLButtonElement;

// Check if side panel API is available (Chrome only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const browserAny = browser as any;
if (browserAny.sidePanel && openSidepanelButton) {
  openSidepanelButton.style.display = 'block';
  openSidepanelButton.addEventListener('click', async () => {
    try {
      // Get current window
      const windows = await browser.windows.getCurrent();
      if (windows.id && browserAny.sidePanel) {
        await browserAny.sidePanel.open({ windowId: windows.id });
        window.close();
      }
    } catch (error) {
      console.error('Failed to open side panel:', error);
    }
  });
}

if (searchInput && resultsContainer) {
  searchInput.addEventListener('input', handleSearch);
  searchInput.focus();
}

function handleSearch(event: Event) {
  const query = (event.target as HTMLInputElement).value.trim();

  if (!query) {
    resultsContainer.innerHTML = '<p class="placeholder">Enter a search query to find bookmarks</p>';
    return;
  }

  // Placeholder for actual search implementation
  resultsContainer.innerHTML = `
    <div class="info-message">
      <p>Search functionality coming soon!</p>
      <p>Query: "${query}"</p>
    </div>
  `;
}

// Log extension version
const manifest = browser.runtime.getManifest();
console.log(`Extension version: ${manifest.version}`);
