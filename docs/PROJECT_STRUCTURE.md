# Project Structure

## Directory Layout

```
semantic-bookmark/
├── src/
│   ├── background/
│   │   ├── index.ts                    # Service worker entry point
│   │   ├── bookmarkListener.ts         # Bookmark change listeners
│   │   ├── crawlQueue.ts               # Background crawl queue
│   │   ├── indexingQueue.ts            # Background indexing queue
│   │   └── messageHandler.ts           # Message passing between components
│   │
│   ├── providers/
│   │   ├── types.ts                    # Provider interfaces and types
│   │   ├── BaseProvider.ts             # Abstract base provider class
│   │   ├── registry.ts                 # Provider registry
│   │   ├── local/
│   │   │   ├── TensorFlowProvider.ts   # TF.js implementation
│   │   │   └── models/                 # Model configurations
│   │   └── api/
│   │       ├── BaseAPIProvider.ts      # Base API provider
│   │       ├── OpenAIProvider.ts       # OpenAI adapter
│   │       ├── AnthropicProvider.ts    # Anthropic adapter
│   │       └── GenericAPIProvider.ts   # User-configurable API
│   │
│   ├── services/
│   │   ├── searchService.ts            # Search logic and ranking
│   │   ├── indexingService.ts          # Bookmark indexing
│   │   ├── embeddingService.ts         # Embedding generation coordination
│   │   ├── crawlerService.ts           # Content crawling and fetching
│   │   ├── contentService.ts           # Content extraction and processing
│   │   ├── tagService.ts               # Tag management
│   │   ├── agentService.ts             # Agent mode (query enhancement)
│   │   ├── storageService.ts           # Storage abstraction layer
│   │   └── bookmarkService.ts          # Bookmark API wrapper
│   │
│   ├── storage/
│   │   ├── db.ts                       # Dexie database definition
│   │   ├── migrations.ts               # Schema migrations
│   │   ├── repositories/
│   │   │   ├── BookmarkRepository.ts
│   │   │   ├── ContentRepository.ts
│   │   │   ├── EmbeddingRepository.ts
│   │   │   ├── ProviderRepository.ts
│   │   │   ├── TagRepository.ts
│   │   │   ├── RelatedPageRepository.ts
│   │   │   └── SettingsRepository.ts
│   │   └── models.ts                   # TypeScript interfaces
│   │
│   ├── ui/
│   │   ├── sidepanel/
│   │   │   ├── index.html
│   │   │   ├── index.ts
│   │   │   ├── App.ts                  # Main side panel component
│   │   │   ├── components/
│   │   │   │   ├── SearchInput.ts
│   │   │   │   ├── ProviderSelector.ts # Provider selection dropdown
│   │   │   │   ├── TagFilter.ts        # Tag filtering component
│   │   │   │   ├── SearchResults.ts
│   │   │   │   ├── ResultItem.ts
│   │   │   │   ├── TagBadge.ts         # Tag display component
│   │   │   │   ├── ModeToggle.ts       # Normal/Agent mode toggle
│   │   │   │   └── StatusBadge.ts      # Indexing/crawling status
│   │   │   └── styles/
│   │   │       ├── main.css
│   │   │       └── variables.css
│   │   │
│   │   ├── settings/
│   │   │   ├── index.html
│   │   │   ├── index.ts
│   │   │   ├── Settings.ts             # Settings page component
│   │   │   ├── components/
│   │   │   │   ├── ProviderManager.ts   # Multi-provider management
│   │   │   │   ├── APIConfigForm.ts
│   │   │   │   ├── CrawlSettings.ts     # Crawling configuration
│   │   │   │   ├── TagManager.ts        # Tag management UI
│   │   │   │   ├── IndexingControls.ts
│   │   │   │   └── PrivacySettings.ts
│   │   │   └── styles/
│   │   │       └── settings.css
│   │   │
│   │   └── popup/
│   │       ├── index.html              # Fallback popup (future)
│   │       └── index.ts
│   │
│   ├── utils/
│   │   ├── vector.ts                   # Vector operations (cosine similarity)
│   │   ├── text.ts                     # Text processing utilities
│   │   ├── crypto.ts                   # Encryption for API keys
│   │   ├── hash.ts                     # Content hashing utilities
│   │   ├── url.ts                      # URL parsing and same-origin detection
│   │   ├── readability.ts              # Readability wrapper for content extraction
│   │   ├── robotsParser.ts             # Robots.txt parsing
│   │   ├── rateLimit.ts                # Rate limiting for crawling
│   │   ├── logger.ts                   # Logging utility
│   │   ├── retry.ts                    # Retry logic with backoff
│   │   ├── batch.ts                    # Batch processing utilities
│   │   └── browser.ts                  # Browser compatibility helpers
│   │
│   ├── types/
│   │   ├── index.ts                    # Shared TypeScript types
│   │   ├── browser.d.ts                # Browser API type augmentations
│   │   └── vendor.d.ts                 # Third-party library types
│   │
│   └── constants/
│       ├── config.ts                   # App configuration
│       ├── providers.ts                # Provider configurations
│       └── messages.ts                 # Message type constants
│
├── public/
│   ├── icons/
│   │   ├── icon16.png
│   │   ├── icon32.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   └── models/                         # TF.js models (if bundled)
│       └── universal-sentence-encoder/
│
├── build/
│   ├── webpack.common.js               # Shared webpack config
│   ├── webpack.dev.js                  # Development config
│   ├── webpack.prod.js                 # Production config
│   └── manifest.js                     # Manifest generation script
│
├── manifests/
│   ├── base.json                       # Common manifest fields
│   ├── chrome.json                     # Chrome-specific overrides
│   └── firefox.json                    # Firefox-specific overrides
│
├── dist/
│   ├── chrome/                         # Chrome build output
│   └── firefox/                        # Firefox build output
│
├── tests/
│   ├── unit/
│   │   ├── providers/
│   │   ├── services/
│   │   ├── utils/
│   │   └── storage/
│   ├── integration/
│   │   ├── search.test.ts
│   │   ├── indexing.test.ts
│   │   └── providerSwitch.test.ts
│   └── fixtures/
│       ├── bookmarks.json
│       └── embeddings.json
│
├── docs/
│   ├── API.md                          # API documentation
│   ├── PROVIDERS.md                    # Adding custom providers
│   ├── DEVELOPMENT.md                  # Development guide
│   └── USER_GUIDE.md                   # User documentation
│
├── .github/
│   └── workflows/
│       ├── build.yml                   # CI/CD pipeline
│       └── test.yml
│
├── package.json
├── tsconfig.json
├── .eslintrc.js
├── .prettierrc
├── .gitignore
├── README.md
├── LICENSE
├── REQUIREMENTS.md                     # ✅ Created
└── PROJECT_STRUCTURE.md                # ✅ This file
```

## Key Files Explained

### Entry Points

1. **background/index.ts**
   - Service worker initialization
   - Message routing
   - Lifecycle management
   - Bookmark change listeners

2. **ui/sidepanel/index.ts**
   - Side panel UI initialization
   - Event listeners
   - Communication with background

3. **ui/settings/index.ts**
   - Settings page initialization
   - Form handling
   - Provider configuration

### Core Services

1. **searchService.ts**
   ```typescript
   class SearchService {
     async search(query: string, options?: SearchOptions): Promise<SearchResult[]>
     async agentSearch(query: string): Promise<SearchResult[]>
     private computeSimilarity(vector1: Float32Array, vector2: Float32Array): number
     private rankResults(results: SearchResult[]): SearchResult[]
   }
   ```

2. **indexingService.ts**
   ```typescript
   class IndexingService {
     async indexAll(providerId: string): Promise<void>
     async indexBookmark(bookmarkId: string): Promise<void>
     async reindexWithProvider(providerId: string): Promise<void>
     async getIndexingStatus(): Promise<IndexingStatus>
   }
   ```

3. **embeddingService.ts**
   ```typescript
   class EmbeddingService {
     async generateEmbedding(text: string, providerId: string): Promise<Float32Array>
     async generateBatch(texts: string[], providerId: string): Promise<Float32Array[]>
     async getActiveProvider(): Promise<EmbeddingProvider>
     async switchProvider(providerId: string): Promise<void>
   }
   ```

### Provider System

1. **types.ts** - Provider interfaces
2. **registry.ts** - Provider registration and retrieval
3. **BaseProvider.ts** - Common provider functionality
4. Specific implementations for each provider type

### Storage Layer

1. **db.ts** - Dexie database schema
2. **repositories/** - Data access layer (one per entity)
3. **models.ts** - TypeScript interfaces matching DB schema

### Utilities

1. **vector.ts** - Cosine similarity, normalization, etc.
2. **crypto.ts** - API key encryption/decryption
3. **retry.ts** - Exponential backoff for API calls
4. **batch.ts** - Batch processing with rate limiting

## Build System

### Webpack Configuration

**webpack.common.js**
```javascript
module.exports = {
  entry: {
    background: './src/background/index.ts',
    sidepanel: './src/ui/sidepanel/index.ts',
    settings: './src/ui/settings/index.ts',
  },
  module: {
    rules: [
      { test: /\.ts$/, use: 'ts-loader' },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, '../src'),
    },
  },
};
```

**manifest.js** - Manifest generation
```javascript
const base = require('../manifests/base.json');
const chrome = require('../manifests/chrome.json');
const firefox = require('../manifests/firefox.json');

function generateManifest(browser) {
  const specific = browser === 'chrome' ? chrome : firefox;
  return merge(base, specific);
}
```

### Build Commands

```json
{
  "scripts": {
    "dev": "webpack --config build/webpack.dev.js --watch",
    "dev:chrome": "cross-env BROWSER=chrome npm run dev",
    "dev:firefox": "cross-env BROWSER=firefox npm run dev",
    "build": "webpack --config build/webpack.prod.js",
    "build:all": "npm run build:chrome && npm run build:firefox",
    "build:chrome": "cross-env BROWSER=chrome npm run build",
    "build:firefox": "cross-env BROWSER=firefox npm run build",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.{ts,css}\"",
    "package:chrome": "cd dist/chrome && zip -r ../chrome.zip .",
    "package:firefox": "cd dist/firefox && zip -r ../firefox.zip ."
  }
}
```

## Development Workflow

### 1. Initial Setup
```bash
npm install
npm run build:chrome  # or build:firefox
```

### 2. Development
```bash
# Chrome
npm run dev:chrome
# Then load dist/chrome as unpacked extension

# Firefox
npm run dev:firefox
# Then load dist/firefox as temporary extension
```

### 3. Testing
```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run lint                # Check code quality
```

### 4. Production Build
```bash
npm run build:all           # Build both browsers
npm run package:chrome      # Create chrome.zip
npm run package:firefox     # Create firefox.zip
```

## Dependencies

### Core Dependencies
```json
{
  "dependencies": {
    "webextension-polyfill": "^0.12.0",
    "dexie": "^4.0.0",
    "@tensorflow/tfjs": "^4.20.0",
    "@tensorflow-models/universal-sentence-encoder": "^1.3.3",
    "@mozilla/readability": "^0.5.0",
    "jsdom": "^24.0.0",
    "robots-parser": "^3.0.0",
    "ml-distance": "^4.0.1"
  }
}
```

### Dev Dependencies
```json
{
  "devDependencies": {
    "typescript": "^5.3.0",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.4",
    "ts-loader": "^9.5.0",
    "style-loader": "^3.3.3",
    "css-loader": "^6.8.1",
    "@types/webextension-polyfill": "^0.12.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.13.0",
    "@typescript-eslint/parser": "^6.13.0",
    "prettier": "^3.1.0",
    "cross-env": "^7.0.3"
  }
}
```

## Configuration Files

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### .eslintrc.js
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
  },
};
```

## Manifest Structure

### base.json (Common)
```json
{
  "manifest_version": 3,
  "name": "Semantic Bookmark Search",
  "version": "0.1.0",
  "description": "Search bookmarks semantically using AI",
  "permissions": [
    "bookmarks",
    "storage",
    "sidePanel"
  ],
  "host_permissions": [
    "https://*/*"
  ],
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_title": "Semantic Bookmark Search"
  },
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "options_page": "settings.html"
}
```

### chrome.json (Chrome-specific)
```json
{
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
  }
}
```

### firefox.json (Firefox-specific)
```json
{
  "background": {
    "scripts": ["background.js"],
    "type": "module"
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "semantic-bookmark@yourdomain.com",
      "strict_min_version": "121.0"
    }
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

## Message Protocol

### Message Types
```typescript
// Background ↔ UI communication
enum MessageType {
  SEARCH = 'SEARCH',
  SEARCH_RESULT = 'SEARCH_RESULT',
  START_INDEXING = 'START_INDEXING',
  INDEXING_PROGRESS = 'INDEXING_PROGRESS',
  GET_STATUS = 'GET_STATUS',
  STATUS_UPDATE = 'STATUS_UPDATE',
  CHANGE_PROVIDER = 'CHANGE_PROVIDER',
  GET_SETTINGS = 'GET_SETTINGS',
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',
}

interface Message {
  type: MessageType;
  payload?: any;
}
```

## Next Steps

With this structure in mind, we can:
1. ✅ Requirements documented (REQUIREMENTS.md)
2. ✅ Architecture designed (both files)
3. ✅ Project structure planned (this file)
4. 🔜 Initialize project with package.json
5. 🔜 Set up build system
6. 🔜 Implement core infrastructure
7. 🔜 Build Phase 1 (MVP)
