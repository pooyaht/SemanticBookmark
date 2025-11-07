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
- **Multi-Provider Support**: Enable multiple providers simultaneously
  - Each bookmark can have embeddings from different models
  - Embeddings tagged by provider ID and model name
  - Search can use specific provider or aggregate across all
  - Compare results from different models side-by-side
- **Built-in Providers**:
  - Browser-based: TensorFlow.js with local model (e.g., Universal Sentence Encoder)
  - API-based: User-configurable endpoints (OpenAI, Anthropic, local Ollama, etc.)
- **Configuration**: User provides API URL and API key for external providers
- **Provider Management**:
  - Add/remove providers without losing existing embeddings
  - Each provider can be enabled/disabled independently
  - Re-index bookmarks for specific provider when needed
  - View which bookmarks have embeddings from which providers

#### 1.3 Agent Mode (Optional)

- **Availability**: Only when API provider is configured
- **Purpose**: Advanced search with query re-ranking
- **Features**:
  - Query understanding and expansion
  - Result re-ranking using LLM
  - Natural language query refinement

#### 1.3 Tagging System

- **User-Defined Tags**: Users can add custom tags to bookmarks
- **Tag Management**: Create, edit, delete, and organize tags
- **Tag-Based Filtering**: Filter search results by tags
- **Tag Suggestions**: Auto-suggest tags based on content
- **Tag Embeddings**: Tags are also embedded for semantic tag search
- **Folder Integration**: Browser bookmark folders automatically become tags
- **Bulk Tagging**: Apply tags to multiple bookmarks at once

#### 1.4 Content Crawling & Extraction (Essential)

- **Page Content Fetching**: Automatically fetch and extract page content for all bookmarks
  - Extract main text content (strip HTML, ads, navigation)
  - Store title, description, and main content
  - Support for common content types (articles, blogs, documentation)
  - Handle dynamic content (JavaScript-rendered pages)
- **Same-Origin Link Discovery**: Optionally crawl related pages for better context
  - Extract links from bookmarked page that share same origin (domain)
  - User can configure: depth limit (0=disabled, 1=direct links, 2=2 levels deep)
  - Respect robots.txt and rate limiting
  - Store relationship graph (bookmark → related pages)
  - Include related page content in embedding generation
- **Crawling Settings**:
  - Enable/disable crawling per bookmark or globally
  - Configure crawl depth (0-2 levels recommended)
  - Set rate limits to avoid overwhelming sites
  - Content cache expiration (re-crawl after N days)
  - Respect privacy mode (don't crawl incognito bookmarks)
- **Content Processing**:
  - Use Mozilla's Readability library for content extraction
  - Fallback to raw text if extraction fails
  - Store content hash to detect changes
  - Re-crawl on content change detection

#### 1.5 Bookmark Indexing

- **Initial Index**: On first install, index all existing bookmarks
- **Content Crawling**: Fetch page content for each bookmark during indexing
- **Incremental Updates**: Listen to bookmark changes (add/update/delete)
- **Re-indexing**: When provider changes, content updates, or on user request
- **Batch Processing**: Process bookmarks in batches to avoid rate limiting
- **Progress Tracking**: Show detailed progress (fetching content, generating embeddings, etc.)

### 2. User Interface

#### 2.1 Popup Interface

- **Search Input**: Text field for queries
- **Provider Selector**: Dropdown to choose which provider(s) to search with
  - Option to search with specific provider
  - Option to search across all providers (aggregated results)
- **Tag Filter**: Multi-select dropdown to filter by tags
- **Results Display**: List of matching bookmarks with:
  - Relevance scores
  - Provider/model used for matching
  - Applied tags
  - Content snippet preview
  - Last crawled timestamp
- **Settings Access**: Button to open configuration
- **Mode Toggle**: Switch between normal and agent mode (if available)
- **Tag Management**: Quick tag add/remove for bookmarks

#### 2.2 Settings Page

- **Provider Management**:
  - List of all configured providers (local and API-based)
  - Add new provider button
  - Enable/disable individual providers
  - Delete provider (keeps existing embeddings)
  - Re-index with specific provider
  - View indexing status per provider
- **API Configuration**: URL and API key inputs (for API providers)
- **Crawling Settings**:
  - Enable/disable content crawling globally
  - Configure crawl depth (0-2 levels)
  - Set rate limits (requests per second)
  - Content cache expiration (days)
  - Robots.txt compliance toggle
  - View crawl statistics (pages fetched, errors, etc.)
- **Tag Management**:
  - View all tags with bookmark counts
  - Create/edit/delete tags
  - Merge tags
  - Export/import tag configurations
- **Indexing Controls**:
  - Manual re-index button (per provider or all)
  - Clear all embeddings
  - Index status display with progress bars
  - View indexing history and errors
- **Privacy Settings**:
  - Control what data is sent to external APIs
  - Exclude URLs from crawling (blacklist)
  - Incognito bookmark handling
- **Performance Settings**:
  - Cache size limits
  - Indexing batch size
  - Maximum concurrent crawls
  - IndexedDB storage quota

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
- **Content Extraction**: @mozilla/readability (article extraction)
- **HTML Parsing**: jsdom or cheerio (for link extraction)
- **Crawling**: Custom crawler with rate limiting and robots.txt support
- **Robots.txt Parsing**: robots-parser (npm package)
- **Hashing**: crypto.subtle API (built-in) for content hashing
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
│  │    Popup     │  │   Settings   │  │ (Future:     │      │
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
│  ┌──────────────────────┐  ┌──────────────────────┐         │
│  │     Bookmarks        │  │      Storage         │         │
│  │       API            │  │        API           │         │
│  └──────────────────────┘  └──────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### 3. Data Models

#### 3.1 Bookmark Entry

```typescript
interface BookmarkEntry {
  id: string; // Browser bookmark ID
  title: string; // Bookmark title
  url: string; // Bookmark URL
  dateAdded: number; // Timestamp
  dateModified?: number; // Timestamp
  parentId?: string; // Folder ID
  tags: string[]; // User-defined tags + folder tags
  crawlEnabled: boolean; // Whether to crawl this bookmark
  lastCrawled?: number; // Last crawl timestamp
  crawlDepth: number; // Depth to crawl (0=disabled, 1-2=levels)
}
```

#### 3.2 Content Entry

```typescript
interface ContentEntry {
  bookmarkId: string; // Foreign key to bookmark
  url: string; // Content URL (may differ from bookmark if related page)
  type: 'primary' | 'related'; // Primary bookmark or related page
  title: string; // Page title
  description?: string; // Meta description
  content: string; // Extracted main content
  contentHash: string; // Hash of content for change detection
  links: string[]; // Extracted same-origin links
  fetchedAt: number; // Timestamp
  fetchError?: string; // Error message if fetch failed
}
```

#### 3.3 Embedding Entry

```typescript
interface EmbeddingEntry {
  id: string; // Unique embedding ID
  bookmarkId: string; // Foreign key to bookmark
  providerId: string; // Which provider generated this
  modelName: string; // Model name (e.g., "text-embedding-3-small")
  embedding: Float32Array; // Vector embedding
  dimension: number; // Embedding dimension (e.g., 512)
  createdAt: number; // Timestamp
  contentHash: string; // Hash of content used for embedding
  includesRelated: boolean; // Whether related pages were included
}
```

#### 3.4 Tag Entry

```typescript
interface TagEntry {
  id: string; // Unique tag ID
  name: string; // Tag name (unique)
  color?: string; // Optional color for UI
  createdAt: number; // Timestamp
  source: 'user' | 'folder'; // User-created or from bookmark folder
}
```

#### 3.5 Related Page Entry

```typescript
interface RelatedPageEntry {
  id: string; // Unique ID
  bookmarkId: string; // Foreign key to bookmark
  url: string; // Related page URL
  depth: number; // Discovery depth (1 or 2)
  title?: string; // Page title
  discoveredAt: number; // Timestamp
}
```

#### 3.3 Provider Configuration

```typescript
interface ProviderConfig {
  id: string; // Unique provider ID
  type: 'local' | 'api'; // Provider type
  name: string; // Display name
  enabled: boolean; // Is this provider active
  config: {
    // For API providers
    apiUrl?: string; // API endpoint
    apiKey?: string; // API key (encrypted)
    model?: string; // Model name
    // For local providers
    modelPath?: string; // TF.js model path
    dimension?: number; // Embedding dimension
  };
}
```

#### 3.6 Search Result

```typescript
interface SearchResult {
  bookmark: BookmarkEntry;
  score: number; // Similarity score (0-1)
  providerId: string; // Which provider matched this result
  modelName: string; // Model name used
  highlights?: string[]; // Matching phrases from content
  matchedTags?: string[]; // Tags that matched the query
  contentPreview?: string; // Preview of matched content
  metadata?: {
    searchTime: number;
    hasRelatedPages: boolean;
    lastCrawled?: number;
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
  bookmarks: 'id, url, title, dateAdded, parentId, lastCrawled',

  // Page content (primary + related pages)
  content: '[bookmarkId+url], bookmarkId, url, type, contentHash, fetchedAt',

  // Embeddings - multiple per bookmark (one per provider)
  // Composite key allows multiple embeddings per bookmark
  embeddings:
    'id, [bookmarkId+providerId], bookmarkId, providerId, modelName, createdAt',

  // Provider configurations
  providers: 'id, type, enabled, modelName',

  // Tags (user-defined and folder-based)
  tags: 'id, name, source, createdAt',

  // Bookmark-Tag relationships (many-to-many)
  bookmarkTags: '[bookmarkId+tagId], bookmarkId, tagId',

  // Related pages discovered during crawling
  relatedPages: 'id, bookmarkId, url, depth, discoveredAt',

  // Settings
  settings: 'key',

  // Indexing queue (for background processing)
  indexQueue: '++id, bookmarkId, providerId, status, createdAt',

  // Crawl queue (for background crawling)
  crawlQueue: '++id, bookmarkId, url, depth, status, createdAt',
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

#### 6.2 Search Flow (Single Provider)

1. User enters query in popup
2. User selects provider (or uses default)
3. Apply tag filters if selected
4. Generate query embedding using selected provider
5. Query IndexedDB for all embeddings from that provider
6. Calculate cosine similarity for each result
7. Filter by tag if tag filter is active
8. Sort by score descending
9. Return top N results (configurable, default: 20)
10. Display in UI with scores, provider info, tags, and content preview

#### 6.2b Search Flow (Multi-Provider / Aggregate)

1. User enters query and selects "All Providers"
2. Apply tag filters if selected
3. For each enabled provider:
   - Generate query embedding
   - Search embeddings from that provider
   - Tag results with provider ID and model name
4. Aggregate results from all providers
5. Normalize scores across providers
6. Sort by normalized score descending
7. Display results with provider badges showing which model matched

#### 6.3 Agent Mode Search (Optional)

1. User enters query with agent mode enabled
2. Send query to LLM for understanding
3. LLM generates multiple query variations
4. Perform semantic search for each variation
5. LLM re-ranks combined results
6. Return top results with explanations

#### 6.4 Content Crawling Workflow

1. User adds new bookmark or triggers re-crawl
2. Add bookmark to crawl queue
3. Background crawler processes queue:
   - Fetch primary page content
   - Use Readability to extract main content
   - Parse and extract same-origin links (if crawl depth > 0)
   - Store content with hash
   - If depth > 0: Add same-origin links to crawl queue with depth-1
4. Rate limit between requests (respect robots.txt)
5. Store all crawled content in content table
6. Link related pages to bookmark in relatedPages table
7. Trigger embedding generation for all crawled content
8. Update bookmark.lastCrawled timestamp
9. Show crawl progress in UI

#### 6.5 Provider Management Workflow

1. **Adding New Provider**:
   - User clicks "Add Provider" in settings
   - Configure provider (type, API details, model name)
   - Save configuration
   - Provider added but no embeddings yet
   - User can trigger indexing for this provider

2. **Enabling/Disabling Provider**:
   - User toggles provider enabled state
   - Embeddings remain in database
   - Disabled providers not used in search
   - Can re-enable anytime without re-indexing

3. **Removing Provider**:
   - User deletes provider
   - Option to keep or delete embeddings
   - If kept: embeddings remain but provider config removed
   - If deleted: cascade delete all embeddings for that provider

4. **Re-indexing with Provider**:
   - User selects provider and clicks "Re-index"
   - Delete existing embeddings for that provider (optional)
   - Generate new embeddings using current content
   - Process in batches with progress bar

#### 6.6 Bookmark Update Workflow

1. Browser fires bookmark event (add/update/delete)
2. Background service worker receives event
3. For **add**:
   - Add to crawl queue (if crawling enabled)
   - Wait for content to be fetched
   - Add to indexing queue for each enabled provider
   - Extract folder as tag
4. For **update** (title/URL change):
   - Trigger re-crawl if URL changed
   - Re-generate embeddings with new content
5. For **delete**:
   - Cascade delete content, embeddings, tags, related pages
   - Clean up orphaned data
6. Process queues with rate limiting
7. Update UI if search is open

#### 6.7 Tagging Workflow

1. **Adding Tags to Bookmark**:
   - User selects bookmark in results
   - Clicks tag button / dropdown
   - Selects existing tags or creates new one
   - Creates bookmarkTags relationship
   - Updates UI immediately

2. **Creating New Tag**:
   - User types new tag name
   - System checks if tag exists
   - Creates tag entry with source='user'
   - Links to bookmark

3. **Folder Tags**:
   - On bookmark sync, extract folder path
   - Create tag for each folder level
   - Mark as source='folder'
   - Link to bookmark

4. **Tag-Based Search**:
   - User selects tags from filter
   - Search performs vector similarity as normal
   - Results filtered by tag after similarity ranking
   - Can combine multiple tags (AND/OR logic)

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

## Development Phases

### Phase 1: Foundation (MVP)

- [ ] Project setup with TypeScript + Webpack/Vite
- [ ] Cross-browser manifest configuration
- [ ] IndexedDB schema with Dexie.js (all tables)
- [ ] Browser bookmarks API integration
- [ ] Basic UI: Popup with search input
- [ ] Content crawling infrastructure
- [ ] Readability integration for content extraction

### Phase 2: Content Crawling & Storage

- [ ] Implement crawler with rate limiting
- [ ] Robots.txt parser integration
- [ ] Same-origin link discovery
- [ ] Content storage and hashing
- [ ] Crawl queue management
- [ ] Progress tracking UI for crawling

### Phase 3: Local Embedding Provider

- [ ] TensorFlow.js integration
- [ ] Local embedding provider implementation
- [ ] Initial indexing flow (with crawled content)
- [ ] Basic semantic search (cosine similarity)
- [ ] Display search results with content previews

### Phase 4: Multi-Provider Support

- [ ] Provider interface design
- [ ] Provider registry and management
- [ ] Generic API provider implementation
- [ ] Multiple simultaneous providers support
- [ ] Settings page for provider configuration
- [ ] Per-provider indexing and re-indexing
- [ ] API key secure storage
- [ ] Aggregated search across providers

### Phase 5: Tagging System

- [ ] Tag data model and storage
- [ ] Tag UI components (add, edit, delete)
- [ ] Folder-to-tag conversion
- [ ] Tag-based filtering in search
- [ ] Tag suggestions based on content
- [ ] Bulk tagging operations
- [ ] Tag management page

### Phase 6: Advanced Features

- [ ] Agent mode with query enhancement
- [ ] Result re-ranking with LLM
- [ ] Incremental indexing (bookmark change listeners)
- [ ] Search result highlighting
- [ ] Content snippet preview in results
- [ ] Re-crawl on content change detection
- [ ] Export/import settings and tags

### Phase 7: Polish & Optimization

- [ ] Performance optimization (large bookmark collections)
- [ ] Error handling improvements
- [ ] User onboarding flow
- [ ] Crawl failure recovery and retry logic
- [ ] Storage quota management
- [ ] Cross-browser testing
- [ ] Documentation
- [ ] Package for Chrome Web Store & Firefox Add-ons

### Future Enhancements

- [ ] Omnibox integration
- [ ] Keyboard shortcuts
- [ ] Context menu search
- [ ] Search history
- [ ] Analytics dashboard (local only)
- [ ] Embedding visualization (t-SNE/UMAP)
- [ ] Bookmark clustering and recommendations
- [ ] Full-text search alongside semantic search
- [ ] Export bookmarks with embeddings

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

## Design Decisions Made

1. ✅ **Multiple active providers simultaneously**: YES - Supported with embeddings tagged by providerId and modelName
2. ✅ **Cache webpage content**: YES - Essential feature with content crawling and storage
3. ✅ **Bookmark tags/folders**: YES - Full tagging system with folder integration
4. ✅ **Related page crawling**: YES - Optional same-origin link discovery with configurable depth

## Open Questions

1. How to handle very large bookmarks collections (10k+)?
   - May need pagination/virtualization in UI
   - Consider embedding compression strategies
   - Implement smart cache eviction policies

2. What's the best way to handle provider API costs for users?
   - Show estimated costs before indexing
   - Allow per-provider rate limiting
   - Support batching to reduce API calls

3. Should we support incremental/delta updates for content?
   - Only re-crawl if content hash changes?
   - Configurable re-crawl frequency?

4. How to handle failed crawls?
   - Retry logic with exponential backoff
   - Manual re-crawl option
   - Fallback to title/URL only embeddings

---

**Next Steps:**

1. Review and approve requirements
2. Set up project structure
3. Begin Phase 1 implementation
