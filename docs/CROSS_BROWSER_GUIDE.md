# Cross-Browser Extension Development Guide

## Answer to: "Is a single source enough for both Firefox and Chrome?"

**YES! A single codebase can cleanly handle both browsers.**

Here's the complete breakdown:

---

## Why Single Codebase Works

### 1. WebExtensions API Standard

Both Chrome and Firefox implement the **WebExtensions API** specification, which provides ~95% compatibility out of the box. Most of your code will work identically in both browsers.

### 2. webextension-polyfill Library

Mozilla provides `webextension-polyfill` which normalizes the differences:

- **Chrome**: Uses `chrome.*` namespace with callbacks (now also supports promises)
- **Firefox**: Uses `browser.*` namespace with promises
- **Polyfill**: Provides consistent `browser.*` API that works everywhere

```typescript
// Instead of this (Chrome-specific)
chrome.bookmarks.getTree((tree) => {
  // callback hell
});

// Write this (works everywhere with polyfill)
import browser from 'webextension-polyfill';
const tree = await browser.bookmarks.getTree();
```

---

## The 5% That's Different

### 1. Background Scripts

**Chrome (MV3)**: Requires service workers
**Firefox (MV3)**: Supports both service workers and scripts

**Solution**: Specify both in manifest, each browser uses what it supports

```json
{
  "background": {
    "service_worker": "background.js", // Chrome uses this
    "scripts": ["background.js"] // Firefox uses this
  }
}
```

### 2. Manifest Fields

Some fields are browser-specific:

**Firefox-only:**

```json
{
  "browser_specific_settings": {
    "gecko": {
      "id": "addon@example.com"
    }
  }
}
```

**Solution**: Use separate manifest files that get merged during build

### 3. Content Security Policy

Slightly different syntax between browsers:

**Chrome:**

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'"
  }
}
```

**Firefox:**

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'"
  }
}
```

---

## Our Build Strategy

### Single Source, Multiple Outputs

```
src/
  ├── background/        # ← Same code
  ├── ui/               # ← Same code
  ├── services/         # ← Same code
  └── utils/            # ← Same code

manifests/
  ├── base.json         # ← Common fields (90%)
  ├── chrome.json       # ← Chrome-specific overrides
  └── firefox.json      # ← Firefox-specific overrides

dist/
  ├── chrome/           # ← Built for Chrome
  └── firefox/          # ← Built for Firefox
```

### Build Process

1. **Same TypeScript code** compiles for both
2. **Manifest merging** at build time:
   ```javascript
   // Build script
   const manifest =
     browser === 'chrome' ? merge(base, chrome) : merge(base, firefox);
   ```
3. **Separate output directories** for each browser
4. **No runtime browser detection needed** - polyfill handles it

### Package.json Scripts

```json
{
  "scripts": {
    "dev:chrome": "webpack --config build/webpack.dev.js --env browser=chrome --watch",
    "dev:firefox": "webpack --config build/webpack.dev.js --env browser=firefox --watch",
    "build:all": "npm run build:chrome && npm run build:firefox",
    "build:chrome": "webpack --config build/webpack.prod.js --env browser=chrome",
    "build:firefox": "webpack --config build/webpack.prod.js --env browser=firefox"
  }
}
```

---

## Real-World Example: Our Semantic Bookmark Extension

### Shared Code (99% of the codebase)

**services/searchService.ts** - Works identically in both browsers:

```typescript
import browser from 'webextension-polyfill';

export class SearchService {
  async search(query: string): Promise<SearchResult[]> {
    // Get bookmarks - same API in both browsers
    const tree = await browser.bookmarks.getTree();

    // Generate embeddings - same code
    const queryEmbedding = await this.embeddingService.embed(query);

    // Search - same logic
    return this.computeSimilarity(queryEmbedding);
  }
}
```

**background/index.ts** - Same code, different execution context:

```typescript
import browser from 'webextension-polyfill';

// Works in both Chrome's service worker and Firefox's background script
browser.bookmarks.onCreated.addListener(async (id, bookmark) => {
  await indexingService.indexBookmark(id);
});

browser.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'SEARCH') {
    return await searchService.search(message.query);
  }
});
```

### Browser-Specific Code (1% - just manifests)

**manifests/base.json** (shared):

```json
{
  "manifest_version": 3,
  "name": "Semantic Bookmark Search",
  "permissions": ["bookmarks", "storage"],
  "icons": { "128": "icons/icon128.png" },
  "action": {
    "default_title": "Semantic Bookmark Search",
    "default_popup": "popup.html"
  },
  "options_page": "settings.html"
}
```

**manifests/chrome.json** (Chrome-specific):

```json
{
  "background": {
    "service_worker": "background.js"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
  }
}
```

**manifests/firefox.json** (Firefox-specific):

```json
{
  "background": {
    "scripts": ["background.js"]
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "semantic-bookmark@example.com"
    }
  }
}
```

---

## Benefits of Single Codebase

### 1. Development Efficiency

- Write once, run everywhere
- No code duplication
- Easier to maintain

### 2. Feature Parity

- Same features in both browsers
- Simultaneous updates
- Consistent user experience

### 3. Testing

- Test core logic once
- Only browser-specific integration tests needed
- Shared test fixtures

### 4. Bug Fixes

- Fix once, both browsers benefit
- Reduced technical debt

---

## Potential Issues & Solutions

### Issue 1: API Not Supported in One Browser

**Example**: Some APIs are Chrome-only or Firefox-only

**Solution**: Feature detection

```typescript
import browser from 'webextension-polyfill';

// Example: Check if API exists before using
if (browser.notifications) {
  await browser.notifications.create({
    type: 'basic',
    title: 'Indexing Complete',
    message: 'All bookmarks have been indexed',
  });
}
```

### Issue 2: Different Performance Characteristics

**Example**: TensorFlow.js might perform differently

**Solution**: Shared optimization code, browser-agnostic

```typescript
// Same optimization works in both
const results = await this.batchProcess(bookmarks, {
  batchSize: 10,
  concurrency: 2,
});
```

### Issue 3: Store Submission

**Chrome Web Store** and **Firefox Add-ons** have different requirements

**Solution**: Separate build outputs, same source

```bash
npm run build:chrome   # → dist/chrome/
npm run build:firefox  # → dist/firefox/
```

---

## What We DON'T Need

### ❌ NO Conditional Browser Logic

```typescript
// DON'T DO THIS
if (isChrome) {
  chrome.bookmarks.getTree(callback);
} else {
  browser.bookmarks.getTree().then(...);
}

// DO THIS (polyfill handles it)
await browser.bookmarks.getTree();
```

### ❌ NO Separate Codebases

```
❌ semantic-bookmark-chrome/
❌ semantic-bookmark-firefox/

✅ semantic-bookmark/
   ├── src/           # Single source
   └── dist/
       ├── chrome/    # Build output
       └── firefox/   # Build output
```

### ❌ NO Runtime Browser Detection (Mostly)

The polyfill abstracts this away. Only needed for truly browser-specific features (rare).

---

## Libraries That Just Work

These work identically in both browsers:

- ✅ **Dexie.js** - IndexedDB wrapper
- ✅ **TensorFlow.js** - ML models
- ✅ **Axios/Fetch** - HTTP requests
- ✅ **ml-distance** - Vector operations
- ✅ **lodash, date-fns** - Utilities

---

## Our Specific Use Case: Semantic Bookmark Search

### Cross-Browser Compatibility Status

| Feature                 | Chrome | Firefox | Notes                         |
| ----------------------- | ------ | ------- | ----------------------------- |
| Bookmarks API           | ✅     | ✅      | Identical                     |
| IndexedDB (Dexie)       | ✅     | ✅      | Identical                     |
| TensorFlow.js           | ✅     | ✅      | Identical                     |
| Popup UI                | ✅     | ✅      | Identical                     |
| Service Worker          | ✅     | ⚠️      | Firefox also supports scripts |
| Content Security Policy | ⚠️     | ⚠️      | Different syntax for WASM     |
| Extension ID            | N/A    | ⚠️      | Firefox requires explicit ID  |

**Legend**: ✅ Same code works, ⚠️ Manifest difference only

### Our Implementation: 99% Shared

**Shared (all core logic):**

- Embedding generation (TensorFlow.js or API)
- Vector search and ranking
- IndexedDB storage with Dexie
- UI components (popup, settings)
- Provider system architecture
- Bookmark monitoring and indexing

**Browser-specific (manifests only):**

- Background script declaration
- Extension ID (Firefox only)
- CSP for WASM (TensorFlow.js)

---

## Recommended Development Workflow

### 1. Develop in Chrome

- Faster DevTools reload
- Better debugging tools
- Use Chrome for primary development

### 2. Test in Firefox Regularly

- At least weekly during development
- Before each release
- Catch browser-specific issues early

### 3. CI/CD for Both

```yaml
# .github/workflows/build.yml
- name: Build Chrome
  run: npm run build:chrome

- name: Build Firefox
  run: npm run build:firefox

- name: Test Chrome
  run: npm run test:chrome

- name: Test Firefox
  run: npm run test:firefox
```

---

## Conclusion

**YES, a single codebase is not only possible but recommended for your semantic bookmark extension.**

### Summary:

- ✅ **95%+ code sharing** - All business logic is identical
- ✅ **webextension-polyfill** - Handles API differences
- ✅ **Build-time differentiation** - Manifest merging
- ✅ **All your features work in both browsers** - Embeddings, search, storage, UI
- ✅ **Proven approach** - Used by thousands of extensions

### The Only Difference:

You'll have two manifest files (chrome.json, firefox.json) with minor overrides. Everything else is **truly single source**.

---

## Next Steps

Ready to start coding? Here's what we'll do:

1. Initialize project with TypeScript + Webpack
2. Set up webextension-polyfill
3. Configure build system for both browsers
4. Implement core features (works in both)
5. Test in Chrome and Firefox
6. Package for both stores

**Your extension will work beautifully in both browsers from a single, clean codebase!**
