import type {
  KnowledgeChunk,
  Paginated,
  TableOfContentsResponse,
} from "@/types/api";
import { apiFetch } from "./client";

export type ArticleLocaleParam = "en" | "ar" | "ur";

function normalizeArticleLocale(
  locale?: string | null,
): ArticleLocaleParam | undefined {
  if (locale === "en" || locale === "ar" || locale === "ur") return locale;
  return undefined;
}

export async function fetchArticles(
  page = 1,
  limit = 50,
  categoryId?: string,
  type?: string,
  locale?: string | null,
): Promise<Paginated<KnowledgeChunk>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (categoryId) params.set("categoryId", categoryId);
  if (type) params.set("type", type);
  const loc = normalizeArticleLocale(locale);
  if (loc) params.set("locale", loc);
  return apiFetch<Paginated<KnowledgeChunk>>(
    `/knowledge-chunks?${params}`,
    { next: { revalidate: 600 } },
  );
}

export async function fetchArticleBySlugOrId(
  slugOrId: string,
  locale?: string | null,
): Promise<KnowledgeChunk> {
  const loc = normalizeArticleLocale(locale);
  const q =
    loc !== undefined
      ? `?locale=${encodeURIComponent(loc)}`
      : "";
  return apiFetch<KnowledgeChunk>(
    `/knowledge-chunks/${encodeURIComponent(slugOrId)}${q}`,
    {
      next: { revalidate: 600 },
    },
  );
}

export async function fetchAllKnowledgeChunks(
  locale?: string | null,
): Promise<KnowledgeChunk[]> {
  const all: KnowledgeChunk[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const res = await fetchArticles(page, 100, undefined, undefined, locale);
    all.push(...res.data);
    totalPages = res.totalPages;
    page += 1;
  }
  return all;
}

export async function fetchArticleToc(
  id: string,
): Promise<TableOfContentsResponse> {
  return apiFetch<TableOfContentsResponse>(
    `/knowledge-chunks/${encodeURIComponent(id)}/toc`,
    {
      next: { revalidate: 600 },
    },
  );
}
