import { Readability } from '@mozilla/readability';

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

    await db.content.put(primaryContent);
    console.log('[CrawlerService] Primary content stored');

    if (primaryContent.fetchError) {
      console.error(
        '[CrawlerService] Failed to fetch primary content:',
        primaryContent.fetchError
      );
      throw new Error(primaryContent.fetchError);
    }

    console.log('[CrawlerService] Primary content extracted:', {
      url: primaryContent.url,
      title: primaryContent.title,
      contentLength: primaryContent.content.length,
      linksCount: primaryContent.links.length,
    });

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

        await db.content.put(relatedContent);

        if (!relatedContent.fetchError) {
          const relatedPage: RelatedPage = {
            id: crypto.randomUUID(),
            bookmarkId,
            url: link,
            depth: 1,
            title: relatedContent.title,
            discoveredAt: Date.now(),
          };

          await db.relatedPages.put(relatedPage);
        } else {
          console.warn(
            `[CrawlerService] Skipping related page due to error: ${link}`,
            relatedContent.fetchError
          );
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
  ): Promise<Content> {
    try {
      console.log(`[CrawlerService] Fetching content for ${type}:`, url);
      await this.applyRateLimit(settings.rateLimitMs);

      const fetchResult = await this.fetchHTML(url);
      if (fetchResult.error) {
        console.error(
          `[CrawlerService] Fetch failed for ${url}:`,
          fetchResult.error
        );
        return this.createErrorContent(
          bookmarkId,
          url,
          type,
          fetchResult.error
        );
      }

      if (!fetchResult.html) {
        console.error(`[CrawlerService] No HTML received for:`, url);
        return this.createErrorContent(
          bookmarkId,
          url,
          type,
          'No content received from server'
        );
      }

      console.log(
        `[CrawlerService] HTML fetched successfully (${fetchResult.html.length} bytes)`
      );

      const parser = new DOMParser();
      const doc = parser.parseFromString(fetchResult.html, 'text/html');
      console.log(`[CrawlerService] HTML parsed successfully`);

      const extractedContent = this.extractContentWithReadability(doc, url);
      const links = this.extractLinks(doc, url);
      const contentHash = await this.calculateHash(extractedContent.content);

      console.log(`[CrawlerService] Content extracted:`, {
        title: extractedContent.title,
        hasDescription: !!extractedContent.description,
        contentLength: extractedContent.content.length,
        linksCount: links.length,
        contentHash: `${contentHash.substring(0, 10)}...`,
        usedReadability: extractedContent.usedReadability,
      });

      return {
        bookmarkId,
        url,
        type,
        title: extractedContent.title,
        description: extractedContent.description,
        content: extractedContent.content,
        contentHash,
        links,
        fetchedAt: Date.now(),
      };
    } catch (error) {
      console.error(
        `[CrawlerService] Exception in fetchAndExtractContent for ${url}:`,
        error
      );
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return this.createErrorContent(bookmarkId, url, type, errorMessage);
    }
  }

  private async fetchHTML(
    url: string
  ): Promise<{ html: string | null; error: string | null }> {
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
        const errorMessage = this.getHttpErrorMessage(
          response.status,
          response.statusText
        );
        console.error(
          `[CrawlerService] HTTP error ${response.status}: ${response.statusText}`
        );
        return { html: null, error: errorMessage };
      }

      const html = await response.text();
      console.log(
        `[CrawlerService] Successfully fetched ${html.length} bytes of HTML`
      );
      return { html, error: null };
    } catch (error) {
      console.error(`[CrawlerService] Fetch failed for ${url}:`, error);

      let errorMessage = 'Network error: Unable to fetch content';

      if (error instanceof TypeError) {
        console.error(
          '[CrawlerService] Network error (likely CORS or network issue)'
        );
        errorMessage =
          'Network error: Unable to connect to the server. This may be due to CORS restrictions or network connectivity issues.';
      } else if (error instanceof Error) {
        console.error('[CrawlerService] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
        errorMessage = `Network error: ${error.message}`;
      }

      return { html: null, error: errorMessage };
    }
  }

  private getHttpErrorMessage(status: number, statusText: string): string {
    switch (status) {
      case 400:
        return 'Bad Request: The server could not understand the request';
      case 401:
        return 'Unauthorized: Authentication is required to access this page';
      case 403:
        return 'Forbidden: You do not have permission to access this page';
      case 404:
        return 'Not Found: The requested page does not exist';
      case 405:
        return 'Method Not Allowed: The request method is not supported';
      case 408:
        return 'Request Timeout: The server timed out waiting for the request';
      case 429:
        return 'Too Many Requests: Rate limit exceeded, please try again later';
      case 500:
        return 'Internal Server Error: The server encountered an error';
      case 502:
        return 'Bad Gateway: The server received an invalid response';
      case 503:
        return 'Service Unavailable: The server is temporarily unavailable';
      case 504:
        return 'Gateway Timeout: The server timed out';
      default:
        if (status >= 400 && status < 500) {
          return `Client Error (${status}): ${statusText}`;
        } else if (status >= 500) {
          return `Server Error (${status}): ${statusText}`;
        }
        return `HTTP Error ${status}: ${statusText}`;
    }
  }

  private async createErrorContent(
    bookmarkId: string,
    url: string,
    type: ContentType,
    errorMessage: string
  ): Promise<Content> {
    return {
      bookmarkId,
      url,
      type,
      title: 'Failed to fetch',
      content: '',
      contentHash: await this.calculateHash(''),
      links: [],
      fetchedAt: Date.now(),
      fetchError: errorMessage,
    };
  }

  private extractContentWithReadability(
    document: Document,
    _url: string
  ): {
    title: string;
    description: string | undefined;
    content: string;
    usedReadability: boolean;
  } {
    try {
      const documentClone = document.cloneNode(true) as Document;
      const reader = new Readability(documentClone, {
        keepClasses: false,
        charThreshold: 500,
      });
      const article = reader.parse();

      if (article?.textContent && article.textContent.length > 300) {
        console.log(
          `[CrawlerService] Readability extracted ${article.textContent.length} chars`
        );
        return {
          title: article.title || this.extractTitle(document),
          description: article.excerpt || this.extractDescription(document),
          content: this.cleanText(article.textContent),
          usedReadability: true,
        };
      } else {
        console.log(
          '[CrawlerService] Readability failed or content too short, using fallback'
        );
      }
    } catch (error) {
      console.warn('[CrawlerService] Readability parsing error:', error);
    }

    return {
      title: this.extractTitle(document),
      description: this.extractDescription(document),
      content: this.extractTextContent(document),
      usedReadability: false,
    };
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
      return this.cleanText(this.removeNoiseFromElement(article));
    }

    const main = document.querySelector('main');
    if (main) {
      return this.cleanText(this.removeNoiseFromElement(main));
    }

    const content = document.querySelector(
      '.content, #content, .post, .article'
    );
    if (content) {
      return this.cleanText(this.removeNoiseFromElement(content));
    }

    const body = document.body;
    if (body) {
      return this.cleanText(this.removeNoiseFromElement(body));
    }

    return '';
  }

  private removeNoiseFromElement(element: Element): string {
    const clone = element.cloneNode(true) as HTMLElement;

    const selectorsToRemove = [
      'script',
      'style',
      'noscript',
      'svg',
      'canvas',
      'nav',
      'header',
      'footer',
      'aside',
      '.navigation',
      '.nav',
      '.menu',
      '.sidebar',
      '.footer',
      '.header',
      '.ad',
      '.ads',
      '.advertisement',
      '[role="navigation"]',
      '[role="banner"]',
      '[role="complementary"]',
    ];

    selectorsToRemove.forEach((selector) => {
      clone.querySelectorAll(selector).forEach((el) => el.remove());
    });

    return clone.textContent ?? '';
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
