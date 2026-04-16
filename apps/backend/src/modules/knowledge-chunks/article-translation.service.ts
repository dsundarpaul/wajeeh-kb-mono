import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { KnowledgeChunkSeo } from "../database/models/knowledge-chunks.entity";

const LANG_NAMES: Record<"ar" | "ur", string> = {
  ar: "Arabic",
  ur: "Urdu",
};

@Injectable()
export class ArticleTranslationService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor(private readonly configService: ConfigService) {
    this.genAI = new GoogleGenerativeAI(
      this.configService.get<string>("GEMINI_API_KEY") ?? "",
    );
    this.modelName =
      this.configService.get<string>("GEMINI_MODEL") ?? "gemini-2.5-flash";
  }

  private model() {
    return this.genAI.getGenerativeModel({ model: this.modelName });
  }

  async translatePlain(text: string, target: "ar" | "ur"): Promise<string> {
    const t = text.trim();
    if (!t) return "";
    const lang = LANG_NAMES[target];
    const result = await this.model().generateContent(
      `Translate the following text to ${lang}. Output ONLY the translation, no quotes or explanation.\n\n${t}`,
    );
    return result.response.text().trim();
  }

  async translateHtml(html: string, target: "ar" | "ur"): Promise<string> {
    const h = html.trim();
    if (!h) return "";
    const lang = LANG_NAMES[target];
    const result = await this.model().generateContent(
      `You are a professional translator. Translate the following HTML article body to ${lang}.
Rules:
- Preserve ALL HTML tags, attributes, classes, and structure exactly. Do not remove or add tags except where necessary for valid HTML.
- Translate only human-readable text. Do NOT translate URLs in href/src, image URLs, YouTube embed IDs, or technical identifiers.
- Keep the same document structure (headings, lists, paragraphs, blockquotes).
- Output ONLY the raw HTML fragment, no markdown code fences or preamble.\n\n${h}`,
    );
    let out = result.response.text().trim();
    if (out.startsWith("```")) {
      out = out
        .replace(/^```[a-z]*\n?/i, "")
        .replace(/\n?```\s*$/i, "")
        .trim();
    }
    return out;
  }

  async translateSeo(
    seo: KnowledgeChunkSeo | undefined,
    target: "ar" | "ur",
  ): Promise<KnowledgeChunkSeo | undefined> {
    if (!seo) return undefined;
    const out: KnowledgeChunkSeo = {};
    if (seo.metaTitle?.trim()) {
      out.metaTitle = await this.translatePlain(seo.metaTitle, target);
    }
    if (seo.metaDescription?.trim()) {
      out.metaDescription = await this.translatePlain(seo.metaDescription, target);
    }
    if (seo.ogImageUrl?.trim()) {
      out.ogImageUrl = seo.ogImageUrl;
    }
    if (seo.keywords?.trim()) {
      out.keywords = await this.translatePlain(seo.keywords, target);
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
}
