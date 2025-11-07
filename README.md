# Semantic Bookmark Search Extension

![CI](https://github.com/pooyaht/SemanticBookmark/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/github/license/pooyaht/SemanticBookmark)
![Version](https://img.shields.io/github/package-json/v/pooyaht/SemanticBookmark)

A powerful cross-browser extension that enables **semantic search** over your bookmarks using AI-powered embeddings. Find bookmarks by meaning, not just keywords!

## ✨ Features

### 🔍 Semantic Search
- Search bookmarks using natural language queries
- Find bookmarks by **meaning**, not just exact keyword matches
- Example: "articles about machine learning" finds relevant ML content even without those exact words

### 🤖 Multiple Embedding Providers
- **Local Models**: Privacy-first with TensorFlow.js (Universal Sentence Encoder)
- **API Providers**: OpenAI, Anthropic, local Ollama, or custom endpoints
- **Multi-Provider Support**: Use multiple models simultaneously and compare results

### 🏷️ Smart Tagging
- Auto-tag bookmarks from folder structure
- Create custom tags with bulk operations
- Filter search results by tags
- Tag-based semantic search

### 📄 Content Crawling (Essential)
- Automatically fetch and extract page content for better search
- Same-origin link discovery for richer context
- Configurable crawl depth (0-2 levels)
- Respects robots.txt and rate limits
- Content change detection for smart re-crawling

### 🔐 Privacy-First
- All data stored locally by default
- Optional cloud APIs with user consent
- No telemetry or tracking
- Open source and transparent

### 🌐 Cross-Browser
- Works on **Chrome** and **Firefox** from a single codebase
- Identical features across browsers

## 🚀 Quick Start

### Download Pre-built Extension

#### From GitHub Actions (Latest Build)
1. Go to [Actions](https://github.com/pooyaht/SemanticBookmark/actions)
2. Click on the latest successful workflow run
3. Scroll to "Artifacts" section
4. Download:
   - `semantic-bookmark-chrome.zip` for Chrome
   - `semantic-bookmark-firefox.zip` for Firefox

#### From Releases (Stable Versions)
1. Go to [Releases](https://github.com/pooyaht/SemanticBookmark/releases)
2. Download the latest release for your browser

### Installation

#### Chrome
1. Extract the downloaded zip file
2. Open `chrome://extensions`
3. Enable "Developer mode" (top-right toggle)
4. Click "Load unpacked"
5. Select the extracted folder

#### Firefox
1. Extract the downloaded zip file
2. Open `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select any file in the extracted folder

> **Note**: For permanent Firefox installation, the extension needs to be signed. Temporary installation is reset on browser restart.

## 🛠️ Development

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0

### Setup

```bash
# Clone the repository
git clone https://github.com/pooyaht/SemanticBookmark.git
cd SemanticBookmark

# Install dependencies
npm install

# Build for development (with watch mode)
npm run dev:chrome   # For Chrome
npm run dev:firefox  # For Firefox

# Build for production
npm run build:chrome   # Chrome only
npm run build:firefox  # Firefox only
npm run build:all      # Both browsers
```

### Project Structure

```
semantic-bookmark/
├── src/              # Source code
│   ├── background/   # Service worker / background scripts
│   ├── providers/    # Embedding providers (TF.js, APIs)
│   ├── services/     # Core services (search, crawling, tagging)
│   ├── storage/      # IndexedDB with Dexie.js
│   ├── ui/           # Side panel and settings UI
│   ├── utils/        # Utilities
│   └── types/        # TypeScript types
├── build/            # Webpack configurations
├── manifests/        # Browser-specific manifests
├── tests/            # Unit and integration tests
└── docs/             # Documentation
```

### Development Commands

```bash
# Development
npm run dev:chrome        # Watch mode for Chrome
npm run dev:firefox       # Watch mode for Firefox

# Building
npm run build:all         # Build both browsers
npm run package:all       # Package both as .zip

# Testing
npm test                  # Run tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage

# Code Quality
npm run lint              # Run ESLint
npm run lint:fix          # Fix linting issues
npm run format            # Format with Prettier
npm run type-check        # TypeScript type checking
```

## 📚 Documentation

- [Requirements & Design](docs/REQUIREMENTS.md) - Complete feature specifications
- [Project Structure](docs/PROJECT_STRUCTURE.md) - Codebase organization
- [Cross-Browser Guide](docs/CROSS_BROWSER_GUIDE.md) - Single codebase strategy

## 🏗️ Architecture

### Technology Stack
- **Language**: TypeScript
- **Build**: Webpack 5
- **Storage**: Dexie.js (IndexedDB)
- **ML**: TensorFlow.js
- **Content Extraction**: @mozilla/readability
- **Testing**: Jest
- **Linting**: ESLint + Prettier

### Key Services
- **Search Service**: Vector similarity search with ranking
- **Crawler Service**: Content fetching with rate limiting
- **Embedding Service**: Multi-provider embedding generation
- **Tag Service**: Tag management and filtering
- **Agent Service**: Optional LLM-powered query enhancement

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

Coverage thresholds: 70% (branches, functions, lines, statements)

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines (coming soon).

### Development Workflow (Trunk-Based)
1. Work on main branch or short-lived feature branches
2. CI runs on every push (lint, test, build)
3. Download built artifacts from GitHub Actions
4. Merge frequently to main

## 📦 CI/CD

### Automated Workflows
- ✅ **Lint & Type Check** on every push
- ✅ **Run Tests** with coverage reporting
- ✅ **Build Chrome & Firefox** extensions
- ✅ **Upload Artifacts** (available for 30 days)
- ✅ **Release on Tags** (v*.*.*)
- ✅ **Dependabot** for dependency updates

### Downloading Builds
Every commit triggers a CI build. To download:
1. Go to [Actions](https://github.com/pooyaht/SemanticBookmark/actions)
2. Click on the latest workflow run
3. Scroll to "Artifacts" at the bottom
4. Download `semantic-bookmark-chrome.zip` or `semantic-bookmark-firefox.zip`

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## 🙏 Acknowledgments

- [@mozilla/readability](https://github.com/mozilla/readability) - Content extraction
- [TensorFlow.js](https://www.tensorflow.org/js) - Local ML models
- [Dexie.js](https://dexie.org/) - IndexedDB wrapper
- [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) - Cross-browser API

## 🗺️ Roadmap

### Phase 1: Foundation ✅ (In Progress)
- [x] Project setup
- [x] CI/CD pipeline
- [ ] Database schema
- [ ] Cross-browser build system

### Phase 2: Content Crawling
- [ ] Readability integration
- [ ] Same-origin link discovery
- [ ] Rate limiting and robots.txt

### Phase 3: Local Embedding
- [ ] TensorFlow.js integration
- [ ] Basic semantic search
- [ ] Search UI

### Phase 4: Multi-Provider
- [ ] Provider interface
- [ ] API providers (OpenAI, Anthropic, Ollama)
- [ ] Simultaneous multi-provider support

### Phase 5: Tagging
- [ ] Tag management
- [ ] Folder-to-tag conversion
- [ ] Tag-based filtering

### Phase 6: Advanced Features
- [ ] Agent mode with query enhancement
- [ ] Result re-ranking
- [ ] Advanced search options

### Phase 7: Polish
- [ ] Performance optimization
- [ ] User onboarding
- [ ] Chrome Web Store & Firefox Add-ons submission

## 📧 Contact

- GitHub: [@pooyaht](https://github.com/pooyaht)
- Issues: [GitHub Issues](https://github.com/pooyaht/SemanticBookmark/issues)

---

**Made with ❤️ for better bookmark management**
