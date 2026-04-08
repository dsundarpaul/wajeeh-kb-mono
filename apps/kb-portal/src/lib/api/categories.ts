import type {
  KnowledgeCategory,
  KnowledgeCategoryTreeNode,
  KnowledgeChunk,
  Paginated,
} from "@/types/api";
import { apiFetch } from "./client";

export async function fetchCategoryTree(): Promise<
  KnowledgeCategoryTreeNode[]
> {
  return apiFetch<KnowledgeCategoryTreeNode[]>("/categories/tree", {
    // next: { revalidate: 3600 },
  });
}

export async function fetchCategoriesFlat(): Promise<KnowledgeCategory[]> {
  return apiFetch<KnowledgeCategory[]>("/categories", {
    // next: { revalidate: 3600 },
  });
}

export async function fetchCategoryById(
  id: string,
): Promise<KnowledgeCategory> {
  return apiFetch<KnowledgeCategory>(`/categories/${id}`, {
    // next: { revalidate: 600 },
  });
}

export async function fetchChunksByCategory(
  categoryId: string,
  page = 1,
  limit = 20,
): Promise<Paginated<KnowledgeChunk>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return apiFetch<Paginated<KnowledgeChunk>>(
    `/categories/${categoryId}/chunks?${params}`,
    // { next: { revalidate: 600 } },
  );
}

export function findCategoryBySlugPath(
  tree: KnowledgeCategoryTreeNode[],
  slugs: string[],
): KnowledgeCategoryTreeNode | null {
  if (slugs.length === 0) return null;
  const [first, ...rest] = slugs;
  const node = tree.find((n) => n.slug === first);
  if (!node) return null;
  if (rest.length === 0) return node;
  return findCategoryBySlugPath(node.children, rest);
}

export function buildSlugPathMap(
  tree: KnowledgeCategoryTreeNode[],
  parentPath: string[] = [],
): Map<string, { node: KnowledgeCategoryTreeNode; path: string[] }> {
  const map = new Map<
    string,
    { node: KnowledgeCategoryTreeNode; path: string[] }
  >();
  for (const node of tree) {
    const currentPath = [...parentPath, node.slug];
    map.set(node._id, { node, path: currentPath });
    if (node.children.length > 0) {
      const childMap = buildSlugPathMap(node.children, currentPath);
      for (const [k, v] of childMap) {
        map.set(k, v);
      }
    }
  }
  return map;
}

export function getAllCategorySlugPaths(
  tree: KnowledgeCategoryTreeNode[],
  parentPath: string[] = [],
  maxDepth = 5,
): string[][] {
  if (maxDepth <= 0) return [];
  const paths: string[][] = [];
  for (const node of tree) {
    const currentPath = [...parentPath, node.slug];
    paths.push(currentPath);
    if (node.children.length > 0) {
      paths.push(
        ...getAllCategorySlugPaths(node.children, currentPath, maxDepth - 1),
      );
    }
  }
  return paths;
}
