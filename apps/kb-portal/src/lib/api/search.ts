import type { KnowledgeChunk, Paginated } from "@/types/api";
import { apiFetch } from "./client";

export async function searchArticles(
  query: string,
  page = 1,
  limit = 20,
  locale?: string | null,
): Promise<Paginated<KnowledgeChunk>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (locale === "en" || locale === "ar" || locale === "ur") {
    params.set("locale", locale);
  }
  if (query.trim()) {
    params.set("search", query.trim());
  }
  return apiFetch<Paginated<KnowledgeChunk>>(
    `/knowledge-chunks?${params}`,
    { cache: "no-store" },
  );
}
