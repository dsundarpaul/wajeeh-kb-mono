import type {
  KnowledgeChunk,
  Paginated,
  TableOfContentsResponse,
} from "@/types/api";
import { apiFetch } from "./client";

export async function fetchArticles(
  page = 1,
  limit = 50,
  categoryId?: string,
  type?: string,
): Promise<Paginated<KnowledgeChunk>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (categoryId) params.set("categoryId", categoryId);
  if (type) params.set("type", type);
  return apiFetch<Paginated<KnowledgeChunk>>(
    `/knowledge-chunks?${params}`,
    { next: { revalidate: 600 } },
  );
}

export async function fetchArticleById(
  id: string,
): Promise<KnowledgeChunk> {
  return apiFetch<KnowledgeChunk>(`/knowledge-chunks/${id}`, {
    next: { revalidate: 600 },
  });
}

export async function fetchArticleToc(
  id: string,
): Promise<TableOfContentsResponse> {
  return apiFetch<TableOfContentsResponse>(`/knowledge-chunks/${id}/toc`, {
    next: { revalidate: 600 },
  });
}
