import browser from 'webextension-polyfill';

console.log('Semantic Bookmark Search - Background script loaded');

// Basic installation handler
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');
  } else if (details.reason === 'update') {
    console.log('Extension updated');
  }
});

// Keep service worker alive (Chrome)
if (typeof self !== 'undefined' && 'ServiceWorkerGlobalScope' in self) {
  self.addEventListener('activate', () => {
    console.log('Service worker activated');
  });
}
