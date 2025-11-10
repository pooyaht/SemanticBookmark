import { SettingsService } from './SettingsService';

import type { Content, RelatedPage } from '@/types/content';
import type { CrawlerSettings } from '@/types/settings';

import { db } from '@/storage/database';
import { ContentType } from '@/types/content';

const settingsService = SettingsService.getInstance();

export class CrawlerService {
  private static instance: CrawlerService;
  private lastFetchTime = 0;

  private constructor() {}

  static getInstance(): CrawlerService {
    if (!CrawlerService.instance) {
      CrawlerService.instance = new CrawlerService();
    }
    return CrawlerService.instance;
  }

  async crawlBookmark(bookmarkId: string, bookmarkUrl: string): Promise<void> {
    console.log('[CrawlerService] Starting crawl:', {
      bookmarkId,
      bookmarkUrl,
    });
    const settings = await settingsService.getCrawlerSettings();
    console.log('[CrawlerService] Crawler settings:', settings);

    const primaryContent = await this.fetchAndExtractContent(
      bookmarkUrl,
      bookmarkId,
      ContentType.PRIMARY,
      settings
    );

    if (!primaryContent) {
      console.error(
        '[CrawlerService] Failed to fetch primary content for:',
        bookmarkUrl
      );
      throw new Error('Failed to fetch bookmark content');
    }

    console.log('[CrawlerService] Primary content extracted:', {
      url: primaryContent.url,
      title: primaryContent.title,
      contentLength: primaryContent.content.length,
      linksCount: primaryContent.links.length,
    });

    await db.content.put(primaryContent);
    console.log('[CrawlerService] Primary content stored successfully');

    if (settings.defaultDepth > 0 && primaryContent.links.length > 0) {
      console.log(
        `[CrawlerService] Starting related pages crawl (depth: ${settings.defaultDepth})`
      );
      await this.crawlRelatedPages(
        bookmarkId,
        bookmarkUrl,
        primaryContent.links,
        settings
      );
    } else {
      console.log(
        '[CrawlerService] Skipping related pages crawl (depth=0 or no links)'
      );
    }
  }

  private async crawlRelatedPages(
    bookmarkId: string,
    baseUrl: string,
    links: string[],
    settings: CrawlerSettings
  ): Promise<void> {
    const filteredLinks = this.filterLinks(links, baseUrl, settings);
    const linksToFetch = filteredLinks.slice(0, settings.defaultDepth);

    for (const link of linksToFetch) {
      try {
        await this.applyRateLimit(settings.rateLimitMs);

        const relatedContent = await this.fetchAndExtractContent(
          link,
          bookmarkId,
          ContentType.RELATED,
          settings
        );

        if (relatedContent) {
          await db.content.put(relatedContent);

          const relatedPage: RelatedPage = {
            id: crypto.randomUUID(),
            bookmarkId,
            url: link,
            depth: 1,
            title: relatedContent.title,
            discoveredAt: Date.now(),
          };

          await db.relatedPages.put(relatedPage);
        }
      } catch (error) {
        console.error(`Failed to crawl related page ${link}:`, error);
      }
    }
  }

  private async fetchAndExtractContent(
    url: string,
    bookmarkId: string,
    type: ContentType,
    settings: CrawlerSettings
  ): Promise<Content | null> {
    try {
      console.log(`[CrawlerService] Fetching content for ${type}:`, url);
      await this.applyRateLimit(settings.rateLimitMs);

      const html = await this.fetchHTML(url);
      if (!html) {
        console.error(`[CrawlerService] No HTML received for:`, url);
        return null;
      }

      console.log(
        `[CrawlerService] HTML fetched successfully (${html.length} bytes)`
      );

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      console.log(`[CrawlerService] HTML parsed successfully`);

      const title = this.extractTitle(doc);
      const description = this.extractDescription(doc);
      const content = this.extractTextContent(doc);
      const links = this.extractLinks(doc, url);
      const contentHash = await this.calculateHash(content);

      console.log(`[CrawlerService] Content extracted:`, {
        title,
        hasDescription: !!description,
        contentLength: content.length,
        linksCount: links.length,
        contentHash: `${contentHash.substring(0, 10)}...`,
      });

      return {
        bookmarkId,
        url,
        type,
        title,
        description,
        content,
        contentHash,
        links,
        fetchedAt: Date.now(),
      };
    } catch (error) {
      console.error(
        `[CrawlerService] Exception in fetchAndExtractContent for ${url}:`,
        error
      );
      if (error instanceof Error) {
        console.error('[CrawlerService] Error stack:', error.stack);
      }
      return null;
    }
  }

  private async fetchHTML(url: string): Promise<string | null> {
    try {
      console.log(`[CrawlerService] Making HTTP request to:`, url);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SemanticBookmarkBot/1.0)',
        },
      });

      console.log(`[CrawlerService] HTTP response:`, {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        url: response.url,
      });

      if (!response.ok) {
        console.error(
          `[CrawlerService] HTTP error ${response.status}: ${response.statusText}`
        );
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      console.log(
        `[CrawlerService] Successfully fetched ${html.length} bytes of HTML`
      );
      return html;
    } catch (error) {
      console.error(`[CrawlerService] Fetch failed for ${url}:`, error);
      if (error instanceof TypeError) {
        console.error(
          '[CrawlerService] Network error (likely CORS or network issue)'
        );
      }
      if (error instanceof Error) {
        console.error('[CrawlerService] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }
      return null;
    }
  }

  private extractTitle(document: Document): string {
    const titleElement = document.querySelector('title');
    if (titleElement?.textContent) {
      return titleElement.textContent.trim();
    }

    const h1 = document.querySelector('h1');
    if (h1?.textContent) {
      return h1.textContent.trim();
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      const content = ogTitle.getAttribute('content');
      if (content) {
        return content.trim();
      }
    }

    return 'Untitled';
  }

  private extractDescription(document: Document): string | undefined {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      const content = metaDesc.getAttribute('content');
      if (content) {
        return content.trim();
      }
    }

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      const content = ogDesc.getAttribute('content');
      if (content) {
        return content.trim();
      }
    }

    return undefined;
  }

  private extractTextContent(document: Document): string {
    const article = document.querySelector('article');
    if (article) {
      return this.cleanText(article.textContent ?? '');
    }

    const main = document.querySelector('main');
    if (main) {
      return this.cleanText(main.textContent ?? '');
    }

    const content = document.querySelector(
      '.content, #content, .post, .article'
    );
    if (content) {
      return this.cleanText(content.textContent ?? '');
    }

    const body = document.body;
    if (body) {
      const clone = body.cloneNode(true) as HTMLElement;
      const selectorsToRemove = [
        'script',
        'style',
        'nav',
        'header',
        'footer',
        'aside',
      ];
      selectorsToRemove.forEach((selector) => {
        clone.querySelectorAll(selector).forEach((el) => el.remove());
      });
      return this.cleanText(clone.textContent ?? '');
    }

    return '';
  }

  private cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim();
  }

  private extractLinks(document: Document, baseUrl: string): string[] {
    const links: string[] = [];
    const anchorElements = document.querySelectorAll('a[href]');

    for (const anchor of anchorElements) {
      try {
        const href = anchor.getAttribute('href');
        if (!href) {
          continue;
        }

        const absoluteUrl = new URL(href, baseUrl).href;

        if (
          absoluteUrl.startsWith('http://') ||
          absoluteUrl.startsWith('https://')
        ) {
          links.push(absoluteUrl);
        }
      } catch {
        continue;
      }
    }

    return [...new Set(links)];
  }

  private filterLinks(
    links: string[],
    baseUrl: string,
    settings: CrawlerSettings
  ): string[] {
    const baseUrlObj = new URL(baseUrl);

    return links.filter((link) => {
      try {
        const linkUrl = new URL(link);

        if (link === baseUrl) {
          return false;
        }

        if (
          linkUrl.hash &&
          linkUrl.href.split('#')[0] === baseUrl.split('#')[0]
        ) {
          return false;
        }

        if (settings.sameOriginOnly && linkUrl.origin !== baseUrlObj.origin) {
          return false;
        }

        const pathSegments = linkUrl.pathname.toLowerCase().split('/');
        const excludePatterns = [
          'login',
          'signin',
          'signup',
          'register',
          'logout',
          'account',
          'settings',
          'profile',
          'admin',
          'cart',
          'checkout',
        ];

        if (pathSegments.some((segment) => excludePatterns.includes(segment))) {
          return false;
        }

        return true;
      } catch {
        return false;
      }
    });
  }

  private async calculateHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  private async applyRateLimit(rateLimitMs: number): Promise<void> {
    const now = Date.now();
    const timeSinceLastFetch = now - this.lastFetchTime;

    if (timeSinceLastFetch < rateLimitMs) {
      await new Promise((resolve) =>
        setTimeout(resolve, rateLimitMs - timeSinceLastFetch)
      );
    }

    this.lastFetchTime = Date.now();
  }

  async getBookmarkContent(bookmarkId: string): Promise<Content[]> {
    return await db.content.where('bookmarkId').equals(bookmarkId).toArray();
  }

  async getRelatedPages(bookmarkId: string): Promise<RelatedPage[]> {
    return await db.relatedPages
      .where('bookmarkId')
      .equals(bookmarkId)
      .toArray();
  }

  async deleteBookmarkContent(bookmarkId: string): Promise<void> {
    await db.content.where('bookmarkId').equals(bookmarkId).delete();
    await db.relatedPages.where('bookmarkId').equals(bookmarkId).delete();
  }
}
