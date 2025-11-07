import browser from 'webextension-polyfill';

// Basic installation handler
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Extension installed - initialization can be added here
  } else if (details.reason === 'update') {
    // Extension updated - migration logic can be added here
  }
});

// Keep service worker alive (Chrome)
if (typeof self !== 'undefined' && 'ServiceWorkerGlobalScope' in self) {
  self.addEventListener('activate', () => {
    // Service worker activated
  });
}
