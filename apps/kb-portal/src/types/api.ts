export type KnowledgeChunkType = "blog" | "video";

export type MediaType = "image" | "youtube";

export interface KnowledgeChunkSection {
  _id?: string;
  slug: string;
  title: string;
  order: number;
  level: number;
  content?: string;
}

export interface KnowledgeChunkMedia {
  _id?: string;
  type: MediaType;
  url: string;
  alt?: string;
  videoId?: string;
  order?: number;
}

export interface KnowledgeChunkSeo {
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
  keywords?: string;
}

export interface KnowledgeChunk {
  _id: string;
  slug?: string;
  title: string;
  locale?: string;
  titleFallback?: boolean;
  contentFallback?: boolean;
  requestedLocale?: string;
  url: string;
  content: string;
  tags: string[];
  type: KnowledgeChunkType;
  categoryId?: string | null;
  categoryIds?: string[];
  primaryCategoryId?: string | null;
  sections: KnowledgeChunkSection[];
  media: KnowledgeChunkMedia[];
  seo?: KnowledgeChunkSeo;
  isIndexed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeCategory {
  _id: string;
  name: string;
  slug: string;
  parentId: string | null;
  order: number;
  ancestorIds: string[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeCategoryTreeNode {
  _id: string;
  name: string;
  slug: string;
  parentId: string | null;
  order: number;
  ancestorIds: string[];
  description?: string;
  articleCount?: number;
  children: KnowledgeCategoryTreeNode[];
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TableOfContentsEntry {
  id: string;
  slug: string;
  title: string;
  order: number;
  level: number;
}

export interface TableOfContentsResponse {
  sections: TableOfContentsEntry[];
}
