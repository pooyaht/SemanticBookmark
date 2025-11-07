const searchInput = document.getElementById('search-input') as HTMLInputElement;
const resultsContainer = document.getElementById('results') as HTMLDivElement;

if (searchInput && resultsContainer) {
  searchInput.addEventListener('input', handleSearch);
  searchInput.focus();
}

function handleSearch(event: Event) {
  const query = (event.target as HTMLInputElement).value.trim();

  if (!query) {
    resultsContainer.innerHTML =
      '<p class="placeholder">Enter a search query to find bookmarks</p>';
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
