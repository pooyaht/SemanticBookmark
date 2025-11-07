# AI Agent Development Guidelines

This file contains all development guidelines, code style requirements, testing practices, and git workflow for the Semantic Bookmark Search Extension project.

## Table of Contents

- [Code Style & Quality](#code-style--quality)
- [Testing Requirements](#testing-requirements)
- [Git Workflow & Commits](#git-workflow--commits)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Project Architecture](#project-architecture)
- [Cross-Browser Development](#cross-browser-development)
- [Development Commands](#development-commands)

---

## Code Style & Quality

### Core Principles

1. **No Emojis in Code**
   - Never use emojis in code, comments, or commit messages
   - Keep code professional and universally readable

2. **Minimal Comments**
   - Only add comments when absolutely necessary
   - Code should be self-explanatory
   - Prefer descriptive variable/function names over comments
   - Good: `calculateCosineSimilarity(vector1, vector2)`
   - Bad: `calc(v1, v2) // calculates cosine similarity`

3. **Self-Documenting Code**
   - Use clear, descriptive names for variables, functions, and classes
   - Follow single responsibility principle
   - Keep functions small and focused
   - Use TypeScript types to document intent

### Code Examples

**Good:**
```typescript
async function indexBookmarkWithProvider(
  bookmarkId: string,
  providerId: string
): Promise<void> {
  const bookmark = await fetchBookmark(bookmarkId);
  const content = await extractPageContent(bookmark.url);
  const embedding = await generateEmbedding(content, providerId);
  await saveEmbedding(bookmarkId, providerId, embedding);
}
```

**Bad:**
```typescript
// This function indexes a bookmark
async function index(id: string, pid: string): Promise<void> {
  const b = await getB(id); // get bookmark
  const c = await getC(b.url); // get content
  const e = await genEmb(c, pid); // generate embedding
  await save(id, pid, e); // save it
}
```

### TypeScript Best Practices

- Always enable strict mode in tsconfig.json
- Use explicit types for function parameters and return values
- Avoid `any` type unless absolutely necessary
- Use interfaces for data structures
- Use type guards for runtime type checking
- Leverage union types and type narrowing

---

## Testing Requirements

### Testing Philosophy

1. **Meaningful Tests**
   - Write tests that verify actual behavior, not implementation details
   - Avoid writing many trivial tests just to raise coverage numbers
   - Focus on testing critical paths and edge cases

2. **High Coverage Without Cheating**
   - Aim for high test coverage naturally through well-designed tests
   - Do NOT write superficial tests just to hit coverage targets
   - If coverage is low, it means the code needs better test design or refactoring

3. **Unit Test First**
   - Write code in a way that can be unit tested
   - Avoid tight coupling that requires excessive mocking
   - Design for testability from the start
   - Prefer pure functions and dependency injection

4. **Minimize Mocking/Monkey Patching**
   - Only mock external dependencies (APIs, browser APIs, file system)
   - Avoid mocking internal modules - refactor instead
   - Use integration tests when mocking becomes too complex
   - If you find yourself mocking extensively, the design needs improvement

5. **Integration Tests When Necessary**
   - Use integration tests for workflows that span multiple modules
   - Test actual interactions between services
   - Use integration tests for database operations (Dexie.js)
   - Test end-to-end search flows with real data

### Test Structure

```typescript
// Good unit test - tests behavior without excessive mocking
describe('SearchService', () => {
  it('should rank results by cosine similarity score', () => {
    const service = new SearchService();
    const query = new Float32Array([1, 0, 0]);
    const results = [
      { embedding: new Float32Array([0.9, 0.1, 0]), id: '1' },
      { embedding: new Float32Array([0.5, 0.5, 0]), id: '2' },
      { embedding: new Float32Array([1, 0, 0]), id: '3' },
    ];

    const ranked = service.rankByScore(query, results);

    expect(ranked[0].id).toBe('3');
    expect(ranked[2].id).toBe('2');
  });
});

// Good integration test - tests actual service interaction
describe('Indexing Flow', () => {
  it('should index bookmark with content and generate embedding', async () => {
    const db = await createTestDatabase();
    const service = new IndexingService(db);
    const bookmark = { id: '1', url: 'https://example.com', title: 'Test' };

    await service.indexBookmark(bookmark);

    const embedding = await db.embeddings.get(['1', 'local']);
    expect(embedding).toBeDefined();
    expect(embedding.dimension).toBe(512);
  });
});
```

### Test Coverage Guidelines

- **Critical paths:** 100% coverage (auth, data storage, search algorithms)
- **Business logic:** 90%+ coverage
- **UI components:** 70%+ coverage (focus on logic, not rendering details)
- **Utilities:** 100% coverage (pure functions should be easy to test)

---

## Git Workflow & Commits

### Creating Effective Commits

#### Commit Message Format

Follow conventional commit format:

```
type(scope): brief description

Longer description if needed explaining the why, not the what.

- List specific changes if helpful
- Include any breaking changes
- Reference issues (e.g., "Fixes #123")
```

#### Commit Types

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring without functional changes
- `test:` - Adding or modifying tests
- `chore:` - Build process or auxiliary tool changes

#### Commit Message Examples

```bash
# Good commit messages
git commit -s -m "feat: add multi-provider embedding support

The extension now supports multiple embedding providers running
simultaneously. Each bookmark can have embeddings from different
models, allowing users to compare search results across providers.

- Modified EmbeddingService to handle multiple providers
- Added provider selector UI in popup
- Updated IndexedDB schema with composite keys
- Added comprehensive test coverage

Fixes #42"

git commit -s -m "fix: resolve race condition in bookmark indexing queue"

git commit -s -m "test: improve embedding provider test coverage

- Use dependency injection to avoid mocking internal modules
- Add integration tests for provider switching
- Test actual TensorFlow.js model loading"
```

#### Bad Commit Messages

```bash
# Avoid these
git commit -m "fixed stuff"
git commit -m "WIP"
git commit -m "updates"
git commit -m "feat: add feature X and also fixed bug Y and updated docs"
```

### Commit Guidelines

- **One logical change per commit** - Don't mix feature additions with bug fixes
- **Commit early and often** - Small, focused commits are easier to review
- **Sign your commits** - Use `-s` flag for Developer Certificate of Origin
- **Write complete commit messages** - Explain the "why", not just the "what"
- **Reference issues** - Use "Fixes #123" or "Related to #456"

### Trunk-Based Development

Every PR should contain a working example up to that point:

- **Incremental functionality** - Each PR should add working, testable features
- **No broken main** - Main branch must always be in a deployable state
- **Feature flags** - Use feature flags for incomplete features if needed
- **Working tests** - All tests must pass before merging
- **Demonstrable progress** - Each PR should show tangible progress

---

## Pull Request Guidelines

### PR Title Format

Use the same conventional commit format for PR titles:

```
type(scope): brief description
```

### PR Description Template

```markdown
## Summary

Brief description of what this PR does and why.

## Changes

- **Modified `file1.ts`**: Specific change description
- **Added `file2_test.ts`**: Test coverage description
- **Updated `config.json`**: Configuration change description

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed in Chrome
- [ ] Manual testing completed in Firefox

## Backward Compatibility

Describe any backward compatibility or breaking change considerations.

## Working Example

Describe the working functionality this PR delivers (for trunk-based development).

## Additional Notes

Any other context, screenshots, or related issues.
```

### PR Best Practices

1. **Keep PRs focused** - One logical change per PR
2. **Write descriptive titles** - Use conventional commit format
3. **Provide context** - Explain the "why" behind changes
4. **Include tests** - Always add tests for new functionality
5. **Run quality checks** - Format and lint before creating PR
6. **Reference issues** - Use "Fixes #123" to auto-close issues
7. **Review your own PR** - Look through the diff before requesting review
8. **Small PRs are better** - Easier to review and less likely to have issues

### Quality Checklist

Before creating a PR, ensure:

- [ ] Code follows style guidelines (no emojis, minimal comments)
- [ ] Tests are added and passing (meaningful tests, high coverage)
- [ ] Linting passes (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] Commit messages are clear and descriptive
- [ ] PR description explains the change and its purpose
- [ ] Working example is demonstrated (trunk-based development)
- [ ] Manual testing in both Chrome and Firefox completed
- [ ] No console errors or warnings

---

## Project Architecture

### Overview

The Semantic Bookmark Search Extension is a cross-browser extension that enables AI-powered semantic search over bookmarks. It supports multiple embedding providers, content crawling, and advanced search features.

### Key Features

1. **Semantic Search** - Natural language search using vector embeddings
2. **Multi-Provider Support** - Multiple embedding providers (TensorFlow.js, OpenAI, Anthropic, custom APIs)
3. **Content Crawling** - Automatic webpage content extraction and indexing
4. **Tagging System** - User-defined tags and folder-based tags
5. **Agent Mode** - Optional LLM-powered query enhancement
6. **Cross-Browser** - Single codebase for Chrome and Firefox

### Technology Stack

- **Language:** TypeScript (strict mode)
- **Build Tool:** Webpack
- **Storage:** Dexie.js (IndexedDB wrapper)
- **ML:** TensorFlow.js for local embeddings
- **Content Extraction:** @mozilla/readability
- **Browser API:** webextension-polyfill for cross-browser compatibility
- **Testing:** Jest with ts-jest

### Directory Structure

```
semantic-bookmark/
├── src/
│   ├── background/          # Service worker / background scripts
│   ├── providers/           # Embedding provider implementations
│   ├── services/            # Business logic services
│   ├── storage/             # Database and repositories
│   ├── ui/                  # Popup and settings UI
│   │   ├── popup/
│   │   └── settings/
│   ├── utils/               # Utility functions
│   ├── types/               # TypeScript type definitions
│   └── constants/           # Configuration constants
├── manifests/
│   ├── base.json            # Common manifest fields
│   ├── chrome.json          # Chrome-specific overrides
│   └── firefox.json         # Firefox-specific overrides
├── docs/
│   ├── PROJECT_STRUCTURE.md # Detailed architecture
│   ├── CROSS_BROWSER_GUIDE.md # Cross-browser development guide
│   └── REQUIREMENTS.md      # Complete requirements
├── tests/
│   ├── unit/                # Unit tests
│   └── integration/         # Integration tests
└── dist/
    ├── chrome/              # Chrome build output
    └── firefox/             # Firefox build output
```

### Core Services

1. **SearchService** - Semantic search and ranking
2. **IndexingService** - Bookmark indexing and embedding generation
3. **EmbeddingService** - Embedding provider coordination
4. **CrawlerService** - Content fetching and extraction
5. **StorageService** - Database abstraction layer
6. **TagService** - Tag management
7. **AgentService** - LLM-powered query enhancement (optional)

### Data Models

Key entities stored in IndexedDB:

- **Bookmarks** - Cached bookmark data with metadata
- **Content** - Extracted page content (primary + related pages)
- **Embeddings** - Vector embeddings (multiple per bookmark for different providers)
- **Providers** - Provider configurations
- **Tags** - User-defined and folder-based tags
- **RelatedPages** - Same-origin pages discovered during crawling

For complete architecture details, see [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) and [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md).

---

## Cross-Browser Development

### Philosophy

**Single codebase, multiple outputs.** The same TypeScript code compiles for both Chrome and Firefox, with only manifest differences.

### Key Points

1. **Use webextension-polyfill** - Provides consistent `browser.*` API across browsers
2. **No runtime browser detection** - Polyfill handles differences automatically
3. **Manifest merging** - Build-time differentiation for browser-specific fields
4. **95%+ code sharing** - Only manifests differ, all logic is identical

### Differences Between Browsers

| Feature                 | Chrome               | Firefox              | Solution                     |
| ----------------------- | -------------------- | -------------------- | ---------------------------- |
| Background              | Service worker       | Service worker or scripts | Specify both in manifest     |
| Extension ID            | Auto-generated       | Requires explicit ID | Firefox manifest override    |
| Content Security Policy | WASM-unsafe-eval     | Different syntax     | Browser-specific manifest    |

### Development Workflow

1. **Develop in Chrome** - Faster DevTools reload, better debugging
2. **Test in Firefox regularly** - Weekly during development, before each release
3. **Use same code** - No conditional browser logic needed
4. **Separate builds** - `npm run build:chrome` and `npm run build:firefox`

For complete cross-browser guide, see [docs/CROSS_BROWSER_GUIDE.md](docs/CROSS_BROWSER_GUIDE.md).

---

## Development Commands

### Installation

```bash
npm install
```

### Development (watch mode)

```bash
npm run dev:chrome    # Start Chrome dev build with watch
npm run dev:firefox   # Start Firefox dev build with watch
```

After running the dev command:
- **Chrome:** Load `dist/chrome` as unpacked extension
- **Firefox:** Load `dist/firefox` as temporary extension

### Testing

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run lint          # Check code quality with ESLint
npm run format        # Format code with Prettier
```

### Production Build

```bash
npm run build:chrome      # Build for Chrome
npm run build:firefox     # Build for Firefox
npm run build:all         # Build both browsers
npm run package:chrome    # Create chrome.zip for store submission
npm run package:firefox   # Create firefox.zip for store submission
```

### Quality Checks

Before committing:

```bash
npm run lint          # Must pass
npm run format        # Must be run
npm test              # All tests must pass
```

---

## Documentation References

For more detailed information, see:

- **[docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)** - Complete architecture and file structure
- **[docs/CROSS_BROWSER_GUIDE.md](docs/CROSS_BROWSER_GUIDE.md)** - Cross-browser development guide
- **[docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)** - Full requirements and specifications

---

## Summary for AI Agents

When working on this project:

1. **No emojis anywhere** - Professional code only
2. **Minimal comments** - Write self-explanatory code
3. **Test meaningfully** - High coverage through good design, not superficial tests
4. **Design for testability** - Minimize mocking, prefer integration tests when needed
5. **Commit atomically** - One logical change per commit with descriptive messages
6. **Trunk-based development** - Every PR delivers working functionality
7. **Cross-browser by default** - Use webextension-polyfill, no browser detection
8. **Follow conventional commits** - `type(scope): description` format
9. **Review checklist** - Lint, format, test before creating PR
10. **Read the docs** - Refer to docs/ folder for detailed specifications

---

**Last Updated:** 2025-11-07
