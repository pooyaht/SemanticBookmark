# Semantic Bookmark Search Extension - Claude Instructions

**Read this first:** @AGENTS.md

This file contains all development guidelines, code style requirements, testing practices, and git workflow for this project.

## Quick Reference

**Common Commands:**
```bash
# Development
pnpm install                 # Install dependencies
pnpm dev:chrome              # Start Chrome dev build
pnpm dev:firefox             # Start Firefox dev build

# Testing
pnpm test                    # Run all tests
pnpm test:watch              # Watch mode

# Quality
pnpm lint                    # Check code quality
pnpm format                  # Format code with prettier

# Build
pnpm build:chrome            # Build for Chrome
pnpm build:firefox           # Build for Firefox
pnpm build:all               # Build both browsers
```

## Project Context

This is a **cross-browser extension** (Chrome & Firefox) that enables semantic search over browser bookmarks using AI embeddings. The project uses:

- TypeScript + Webpack
- Dexie.js for IndexedDB storage
- TensorFlow.js for local embeddings
- Multiple embedding provider support (OpenAI, Anthropic, local models)
- Content crawling and extraction

**Key directories:**
- `src/` - All source code
- `docs/` - Detailed documentation
- `manifests/` - Browser-specific manifest files
- `dist/` - Build outputs

For complete architecture, requirements, and guidelines, see **AGENTS.md**.
