import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { EmbeddingsService } from '../../embeddings/embeddings.service';
import {
  CategoryPlacementMeta,
  VectorStoreService,
} from '../../vector-store/vector-store.service';

function mergePlacements(
  a: CategoryPlacementMeta[] | null | undefined,
  b: CategoryPlacementMeta[] | null | undefined,
): CategoryPlacementMeta[] {
  const map = new Map<string, CategoryPlacementMeta>();
  for (const p of [...(a ?? []), ...(b ?? [])]) {
    map.set(p.category_id, p);
  }
  return Array.from(map.values());
}

@Injectable()
export class ChatService implements OnModuleInit {
  private genAI: GoogleGenerativeAI;
  private geminiModel: string;
  private topK: number;

  private readonly PROMPT_TEMPLATE = `You are a helpful assistant that answers questions based on blog articles and YouTube videos.

Use ONLY the information provided in the context below to answer the question.
If the answer is not in the context, say exactly: "I don't have enough information in the available content to answer this."
Do NOT make up information. Do NOT use external knowledge.

Context from relevant blog articles and videos:
---
{context}
---

Previous conversation:
{chat_history_text}

User question: {query}

Answer in a clear, helpful way. Do not list sources in your answer — they will be shown separately.
`;

  constructor(
    private configService: ConfigService,
    private embeddingsService: EmbeddingsService,
    private vectorStoreService: VectorStoreService,
  ) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey ?? '');
    this.geminiModel = this.configService.get<string>('GEMINI_MODEL', 'gemini-2.5-flash');
    this.topK = parseInt(this.configService.get<string>('TOP_K_RESULTS', '5'));
  }

  async answerQuery(query: string, chatHistory: { role: string; content: string }[]): Promise<any> {
    const queryEmbedding = await this.embeddingsService.embedQuery(query);
    const results = await this.vectorStoreService.search(queryEmbedding, this.topK);

    const uniqueSources = new Map<
      string,
      {
        title: string;
        url: string;
        source_type: string;
        thumbnail_url?: string;
        video_id?: string;
        channel?: string;
        category_id?: string | null;
        category_breadcrumb?: string | null;
        category_ids?: string[];
        category_breadcrumbs?: (string | null)[];
        category_placements?: CategoryPlacementMeta[];
      }
    >();

    results.forEach((r) => {
      if (!uniqueSources.has(r.url)) {
        const placements = r.category_placements ?? undefined;
        uniqueSources.set(r.url, {
          title: r.title,
          url: r.url,
          source_type: r.source_type,
          thumbnail_url: r.thumbnail_url,
          video_id: r.video_id,
          channel: r.channel,
          category_id: r.category_id,
          category_breadcrumb: r.category_breadcrumb,
          category_ids: r.category_ids ?? undefined,
          category_breadcrumbs: r.category_breadcrumbs ?? undefined,
          category_placements: placements,
        });
      } else {
        const prev = uniqueSources.get(r.url)!;
        const merged = mergePlacements(prev.category_placements, r.category_placements);
        uniqueSources.set(r.url, {
          ...prev,
          category_placements: merged.length ? merged : prev.category_placements,
          category_ids: merged.length
            ? merged.map((p) => p.category_id)
            : prev.category_ids,
          category_breadcrumbs: merged.length
            ? merged.map((p) => p.category_breadcrumb)
            : prev.category_breadcrumbs,
          category_id: prev.category_id ?? r.category_id,
          category_breadcrumb: prev.category_breadcrumb ?? r.category_breadcrumb,
        });
      }
    });

    const sources = Array.from(uniqueSources.values());
    const context = results.map((r) => r.chunk_text).join('\n---\n');

    const chatHistoryText = chatHistory
      .map((msg) => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    const prompt = this.PROMPT_TEMPLATE
      .replace('{context}', context || 'No relevant context found.')
      .replace('{chat_history_text}', chatHistoryText || 'No previous conversation.')
      .replace('{query}', query);

    const model = this.genAI.getGenerativeModel({ model: this.geminiModel });
    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    return {
      answer,
      sources,
      chunks_used: results.length,
    };
  }
}
