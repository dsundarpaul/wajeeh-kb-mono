import type { KnowledgeChunk, KnowledgeCategoryTreeNode } from "@/types/api";

export function articlePathSegment(article: KnowledgeChunk): string {
  const s = article.slug?.trim();
  if (s && s.length > 0) return s;
  return article._id;
}

export function knowledgeChunkPublicPath(
  article: KnowledgeChunk,
  slugPathMap: Map<
    string,
    { node: KnowledgeCategoryTreeNode; path: string[] }
  >,
): string {
  const segment = articlePathSegment(article);
  const primary = article.primaryCategoryId ?? null;
  if (primary) {
    const entry = slugPathMap.get(primary);
    if (entry?.path?.length) {
      return `/${[...entry.path, segment].join("/")}`;
    }
  }
  return `/article/${segment}`;
}
