# Semantic Bookmark Search Extension - Requirements & Design

## Project Overview
A cross-browser extension (Chrome & Firefox) that enables semantic search over browser bookmarks with support for multiple embedding providers and optional AI-powered query enhancement.

## Functional Requirements

### 1. Core Features

#### 1.1 Semantic Search
- Users can search bookmarks using natural language queries
- Search uses vector similarity (cosine similarity) between query and bookmark embeddings
- Returns ranked results based on semantic relevance
- Search includes bookmark title, URL, and page content (if available)

#### 1.2 Embedding Provider Support
- **Pluggable Architecture**: Support multiple embedding providers
- **Built-in Providers**:
  - Browser-based: TensorFlow.js with local model (e.g., Universal Sentence Encoder)
  - API-based: User-configurable endpoints (OpenAI, Anthropic, local Ollama, etc.)
- **Configuration**: User provides API URL and API key for external providers
- **Provider Switching**: When user changes provider, check if embeddings exist:
  - If missing → trigger re-indexing of all bookmarks
  - If exists → use cached embeddings

#### 1.3 Agent Mode (Optional)
- **Availability**: Only when API provider is configured
- **Purpose**: Advanced search with query re-ranking
- **Features**:
  - Query understanding and expansion
  - Result re-ranking using LLM
  - Natural language query refinement

#### 1.4 Bookmark Indexing
- **Initial Index**: On first install, index all existing bookmarks
- **Incremental Updates**: Listen to bookmark changes (add/update/delete)
- **Re-indexing**: When provider changes or on user request
- **Content Extraction**: Optionally fetch page content for better embeddings

### 2. User Interface

#### 2.1 Side Panel (Primary)
- **Search Input**: Text field for queries
- **Results Display**: List of matching bookmarks with relevance scores
- **Settings Access**: Button to open configuration
- **Mode Toggle**: Switch between normal and agent mode (if available)

#### 2.2 Settings Page
- **Provider Selection**: Dropdown to choose embedding provider
- **API Configuration**: URL and API key inputs (for API providers)
- **Indexing Controls**: Manual re-index button, index status display
- **Privacy Settings**: Control what data is sent to external APIs
- **Performance Settings**: Cache size, indexing batch size

#### 2.3 Future UI Extensions (Design Considerations)
- Omnibox integration: Search via address bar (keyword: "bs" for bookmark search)
- Keyboard shortcuts
- Context menu integration

### 3. Privacy & Security

#### 3.1 Privacy-First Design
- **Local-First**: All data stored locally by default
- **No Telemetry**: No usage tracking or data collection
- **Transparent**: Clear indication when data leaves the browser
- **User Control**: User explicitly enables cloud APIs

#### 3.2 Data Handling
- **Local Provider**: All embeddings generated and stored locally
- **API Provider**: Bookmarks sent to API only for embedding generation
  - User is informed and accepts this trade-off
  - API keys stored securely in browser storage
  - No bookmark data sent to our servers (only to user-specified APIs)

### 4. Performance Requirements

#### 4.1 Scale
- Support up to 1000 bookmarks efficiently
- Target: <500ms search latency for typical queries
- Indexing: Process bookmarks in batches to avoid blocking

#### 4.2 Storage
- Use IndexedDB with Dexie.js for vector storage
- Efficient storage: Float32 arrays for embeddings
- Compression for large bookmark collections

## Technical Architecture

### 1. Technology Stack

#### 1.1 Core
- **Manifest**: V3 (cross-browser compatible)
- **Language**: TypeScript
- **Build Tool**: Webpack or Vite
- **Polyfill**: webextension-polyfill for cross-browser compatibility

#### 1.2 Libraries
- **Storage**: Dexie.js (IndexedDB wrapper)
- **ML**: TensorFlow.js (for local embeddings)
- **Vector Operations**: ml-distance or custom cosine similarity
- **UI**: Vanilla JS/TS or lightweight framework (Preact/Svelte)

#### 1.3 Build System
- Single codebase, separate builds for Chrome/Firefox
- Conditional manifest fields based on browser target
- Shared source code with browser-specific overrides if needed

### 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Side Panel  │  │   Settings   │  │ (Future:     │      │
│  │              │  │     Page     │  │  Omnibox)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Search Service                            │   │
│  │  - Query embedding generation                        │   │
│  │  - Vector similarity search                          │   │
│  │  - Result ranking                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Indexing Service                          │   │
│  │  - Bookmark monitoring                               │   │
│  │  - Batch embedding generation                        │   │
│  │  - Index management                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Agent Service (Optional)                  │   │
│  │  - Query enhancement                                 │   │
│  │  - Result re-ranking                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   Provider Layer                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Embedding Provider Interface                 │   │
│  └──────────────────────────────────────────────────────┘   │
│         ↓                    ↓                               │
│  ┌─────────────┐      ┌─────────────────┐                   │
│  │   TF.js     │      │   API Provider  │                   │
│  │   Provider  │      │   (OpenAI, etc) │                   │
│  └─────────────┘      └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Storage Layer                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Dexie.js (IndexedDB)                    │   │
│  │  - Embeddings storage                                │   │
│  │  - Metadata storage                                  │   │
│  │  - Settings storage                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  Browser APIs                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Bookmarks  │  │   Storage   │  │  Side Panel │         │
│  │     API     │  │     API     │  │     API     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### 3. Data Models

#### 3.1 Bookmark Entry
```typescript
interface BookmarkEntry {
  id: string;                    // Browser bookmark ID
  title: string;                 // Bookmark title
  url: string;                   // Bookmark URL
  dateAdded: number;             // Timestamp
  dateModified?: number;         // Timestamp
  parentId?: string;             // Folder ID
  tags?: string[];               // Extracted tags/folders
}
```

#### 3.2 Embedding Entry
```typescript
interface EmbeddingEntry {
  bookmarkId: string;            // Foreign key to bookmark
  providerId: string;            // Which provider generated this
  embedding: Float32Array;       // Vector embedding
  dimension: number;             // Embedding dimension (e.g., 512)
  createdAt: number;             // Timestamp
  contentHash?: string;          // Hash of content used for embedding
}
```

#### 3.3 Provider Configuration
```typescript
interface ProviderConfig {
  id: string;                    // Unique provider ID
  type: 'local' | 'api';         // Provider type
  name: string;                  // Display name
  enabled: boolean;              // Is this provider active
  config: {
    // For API providers
    apiUrl?: string;             // API endpoint
    apiKey?: string;             // API key (encrypted)
    model?: string;              // Model name
    // For local providers
    modelPath?: string;          // TF.js model path
    dimension?: number;          // Embedding dimension
  };
}
```

#### 3.4 Search Result
```typescript
interface SearchResult {
  bookmark: BookmarkEntry;
  score: number;                 // Similarity score (0-1)
  highlights?: string[];         // Matching phrases
  metadata?: {
    providerUsed: string;
    searchTime: number;
  };
}
```

### 4. Provider Interface

#### 4.1 Embedding Provider Contract
```typescript
interface EmbeddingProvider {
  id: string;
  name: string;
  type: 'local' | 'api';

  // Initialize the provider
  initialize(config: ProviderConfig): Promise<void>;

  // Check if provider is ready
  isReady(): boolean;

  // Generate embedding for text
  embed(text: string): Promise<Float32Array>;

  // Batch embedding generation
  embedBatch(texts: string[]): Promise<Float32Array[]>;

  // Get embedding dimension
  getDimension(): number;

  // Cleanup resources
  dispose(): Promise<void>;
}
```

#### 4.2 Built-in Providers

**Local Provider (TensorFlow.js)**
- Model: Universal Sentence Encoder
- Dimension: 512
- Pros: Privacy, offline, no API costs
- Cons: Initial model download (~50MB), slower than API

**API Provider Template**
- Generic HTTP API client
- Configurable endpoint and request format
- Support for common formats (OpenAI, Anthropic, Ollama)

### 5. Storage Schema (Dexie.js)

```typescript
const db = new Dexie('SemanticBookmarkDB');

db.version(1).stores({
  // Bookmarks cache
  bookmarks: 'id, url, title, dateAdded, parentId',

  // Embeddings indexed by bookmark and provider
  embeddings: '[bookmarkId+providerId], bookmarkId, providerId, createdAt',

  // Provider configurations
  providers: 'id, type, enabled',

  // Settings
  settings: 'key',

  // Indexing queue (for background processing)
  indexQueue: '++id, bookmarkId, status, createdAt'
});
```

### 6. Key Workflows

#### 6.1 Initial Setup
1. Extension installed
2. Request bookmark permissions
3. Show settings page
4. User chooses provider
5. If API: user enters credentials
6. Start initial indexing
7. Show progress in UI

#### 6.2 Search Flow
1. User enters query in side panel
2. Generate query embedding using active provider
3. Query IndexedDB for all embeddings (same provider)
4. Calculate cosine similarity for each result
5. Sort by score descending
6. Return top N results (configurable, default: 20)
7. Display in UI with scores

#### 6.3 Agent Mode Search (Optional)
1. User enters query with agent mode enabled
2. Send query to LLM for understanding
3. LLM generates multiple query variations
4. Perform semantic search for each variation
5. LLM re-ranks combined results
6. Return top results with explanations

#### 6.4 Provider Change
1. User selects new provider in settings
2. Check if embeddings exist for new provider
3. If not: Show "Re-indexing required" message
4. User confirms → Start re-indexing
5. Process bookmarks in batches (e.g., 10 at a time)
6. Show progress bar
7. Complete → Search enabled with new provider

#### 6.5 Bookmark Update
1. Browser fires bookmark event (add/update/delete)
2. Background service worker receives event
3. For add/update: Add to indexing queue
4. Process queue with rate limiting
5. Generate embedding and store
6. Update UI if search is open

### 7. Cross-Browser Compatibility

#### 7.1 Manifest Differences
```json
{
  "manifest_version": 3,
  "background": {
    // Chrome: service_worker
    "service_worker": "background.js",
    // Firefox: scripts array
    "scripts": ["background.js"]
  },
  "browser_specific_settings": {
    // Firefox only
    "gecko": {
      "id": "semantic-bookmark@example.com"
    }
  }
}
```

#### 7.2 Build Configuration
- Base manifest.json with common fields
- Browser-specific overrides in separate files
- Build script merges manifests per browser
- Output to `dist/chrome` and `dist/firefox`

### 8. Performance Optimizations

#### 8.1 Indexing
- Batch processing: Generate embeddings for multiple bookmarks at once
- Rate limiting: Don't overwhelm API providers
- Background processing: Use service worker queues
- Caching: Store processed content hashes to avoid re-indexing

#### 8.2 Search
- Early termination: Stop after finding N results above threshold
- Index optimization: Store embeddings in efficient format
- Lazy loading: Load bookmark details only for top results
- Debouncing: Wait for user to stop typing before searching

#### 8.3 Memory Management
- Dispose TF.js models when not in use
- Clear embedding cache for inactive providers
- Limit result set size

### 9. Error Handling

#### 9.1 Provider Errors
- API timeout: Fallback to cached results or show error
- Invalid API key: Show clear error message
- Network errors: Retry with exponential backoff
- Model load failure: Fallback to another provider if available

#### 9.2 Storage Errors
- IndexedDB quota exceeded: Prompt user to clear old embeddings
- Corruption: Provide re-index option
- Migration errors: Log and notify user

#### 9.3 Browser API Errors
- Bookmark permission denied: Show permission prompt
- Side panel not supported: Fallback to popup

## Development Phases

### Phase 1: Foundation (MVP)
- [ ] Project setup with TypeScript + Webpack/Vite
- [ ] Cross-browser manifest configuration
- [ ] IndexedDB schema with Dexie.js
- [ ] Browser bookmarks API integration
- [ ] Basic UI: Side panel with search input

### Phase 2: Local Embedding
- [ ] TensorFlow.js integration
- [ ] Local embedding provider implementation
- [ ] Initial indexing flow
- [ ] Basic semantic search (cosine similarity)
- [ ] Display search results

### Phase 3: API Provider Support
- [ ] Provider interface design
- [ ] Generic API provider implementation
- [ ] Settings page for provider configuration
- [ ] Provider switching with re-indexing
- [ ] API key secure storage

### Phase 4: Advanced Features
- [ ] Agent mode with query enhancement
- [ ] Result re-ranking
- [ ] Incremental indexing (bookmark change listeners)
- [ ] Search result highlighting
- [ ] Export/import settings

### Phase 5: Polish & Optimization
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] User onboarding flow
- [ ] Documentation
- [ ] Cross-browser testing
- [ ] Package for Chrome Web Store & Firefox Add-ons

### Future Enhancements
- [ ] Omnibox integration
- [ ] Keyboard shortcuts
- [ ] Context menu search
- [ ] Bookmark content scraping (with permission)
- [ ] Folder-aware search
- [ ] Search history
- [ ] Analytics (local only)

## Testing Strategy

### Unit Tests
- Embedding provider implementations
- Vector similarity calculations
- Storage layer (Dexie operations)
- Utility functions

### Integration Tests
- Provider switching flow
- Indexing pipeline
- Search end-to-end
- Bookmark sync

### Manual Testing
- Chrome installation and usage
- Firefox installation and usage
- Cross-browser feature parity
- Performance under load (1000+ bookmarks)

## Security Considerations

1. **API Key Storage**: Use browser.storage.local with encryption
2. **Content Security Policy**: Strict CSP in manifest
3. **HTTPS Only**: Require HTTPS for API endpoints
4. **Input Sanitization**: Sanitize all user inputs
5. **Permissions**: Request minimal necessary permissions
6. **No eval()**: Avoid eval or unsafe code execution

## Open Questions

1. Should we support multiple active providers simultaneously?
2. How to handle very large bookmarks collections (10k+)?
3. Should we cache webpage content or just use title/URL?
4. What's the best way to handle provider API costs for users?
5. Should we support bookmark tags/folders in search?

---

**Next Steps:**
1. Review and approve requirements
2. Set up project structure
3. Begin Phase 1 implementation
