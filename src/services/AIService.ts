import { SettingsService } from './SettingsService';

import type { Content } from '@/types/content';
import type { ProviderType } from '@/types/provider';

import { db } from '@/storage/database';

const SUMMARY_GENERATION_PROMPT = `You are an AI assistant helping to generate summaries for a bookmark retrieval system (RAG).

Your task: Create a concise summary of the provided webpage content that maximizes retrieval performance when searching bookmarks.

Requirements:
- Focus on key topics, concepts, and main ideas
- Include important keywords and technical terms
- Keep it under 200 words
- Write in a way that helps match user search queries
- Be specific and informative, not generic

Webpage Content:
{content}

Generate a retrieval-optimized summary:`;

export class AIService {
  private static instance: AIService;
  private settingsService: SettingsService;

  private constructor() {
    this.settingsService = SettingsService.getInstance();
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async generateSummary(bookmarkId: string): Promise<string> {
    const aiSettings = await this.settingsService.getAIProviderSettings();

    if (!aiSettings.enabled) {
      throw new Error('AI provider is not enabled');
    }

    if (!aiSettings.endpoint || !aiSettings.modelName) {
      throw new Error('AI provider is not properly configured');
    }

    const content = await db.content
      .where({ bookmarkId, type: 'primary' })
      .first();

    if (!content) {
      throw new Error(
        'No content found for this bookmark. Please crawl it first.'
      );
    }

    if (content.fetchError) {
      throw new Error(
        `Content crawling failed: ${content.fetchError}. Please re-crawl the bookmark.`
      );
    }

    const contentText = this.prepareContentForSummary(content);
    const prompt = SUMMARY_GENERATION_PROMPT.replace('{content}', contentText);

    const summary = await this.callAIProvider(
      aiSettings.endpoint,
      aiSettings.modelName,
      aiSettings.type,
      prompt
    );

    await db.bookmarks.update(bookmarkId, {
      aiSummary: summary,
      lastModified: new Date(),
    });

    return summary;
  }

  private prepareContentForSummary(content: Content): string {
    const parts: string[] = [];

    parts.push(`Title: ${content.title}`);

    if (content.description) {
      parts.push(`Description: ${content.description}`);
    }

    const truncatedContent =
      content.content.length > 8000
        ? `${content.content.substring(0, 8000)}...`
        : content.content;

    parts.push(`Content:\n${truncatedContent}`);

    return parts.join('\n\n');
  }

  private async callAIProvider(
    endpoint: string,
    modelName: string,
    type: ProviderType,
    prompt: string
  ): Promise<string> {
    const url = this.getAIEndpoint(endpoint, type);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI provider error: HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const summary = data.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      throw new Error('Invalid response from AI provider');
    }

    return summary;
  }

  private getAIEndpoint(baseEndpoint: string, type: ProviderType): string {
    switch (type) {
      case 'ollama':
        return `${baseEndpoint}/v1/chat/completions`;
      case 'localai':
      case 'llamacpp':
        return `${baseEndpoint}/v1/chat/completions`;
      default:
        return `${baseEndpoint}/v1/chat/completions`;
    }
  }

  async isAIEnabled(): Promise<boolean> {
    const aiSettings = await this.settingsService.getAIProviderSettings();
    return aiSettings.enabled && aiSettings.isConnected;
  }
}
