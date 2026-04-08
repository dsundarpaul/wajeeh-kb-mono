export type KnowledgeChunkType = "blog" | "video";

export type KnowledgeCategoryTreeNode = {
  _id: string;
  name: string;
  slug: string;
  parentId: string | null;
  order: number;
  ancestorIds?: string[];
  description?: string;
  children: KnowledgeCategoryTreeNode[];
};

export type KnowledgeChunkSectionInput = {
  slug: string;
  title: string;
  order: number;
  level?: number;
  content?: string;
};

export type MediaType = "image" | "youtube";

export type KnowledgeChunkMediaInput = {
  type: MediaType;
  url: string;
  alt?: string;
  videoId?: string;
  order?: number;
};

export type KnowledgeChunkSeo = {
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
  keywords?: string;
};

export type KnowledgeChunk = {
  _id: string;
  title: string;
  url: string;
  content: string;
  tags: string[];
  type: KnowledgeChunkType;
  categoryId?: string | null;
  categoryIds?: string[];
  primaryCategoryId?: string | null;
  sections?: KnowledgeChunkSectionInput[];
  media?: KnowledgeChunkMediaInput[];
  seo?: KnowledgeChunkSeo;
  createdAt?: string;
  updatedAt?: string;
};

export type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type CreateKnowledgeChunkBody = {
  title: string;
  url: string;
  content: string;
  tags?: string[];
  type: KnowledgeChunkType;
  categoryId?: string | null;
  categoryIds?: string[];
  primaryCategoryId?: string | null;
  sections?: KnowledgeChunkSectionInput[];
  media?: KnowledgeChunkMediaInput[];
  seo?: KnowledgeChunkSeo;
};

export type PatchKnowledgeChunkBody = Partial<CreateKnowledgeChunkBody>;

export type CreateCategoryBody = {
  name: string;
  slug: string;
  parentId?: string | null;
  order?: number;
  description?: string;
};

export type PatchCategoryBody = Partial<CreateCategoryBody>;
