export type KnowledgeChunkType = "blog" | "video";

export type KnowledgeCategoryLocaleVariant = {
  name?: string;
  description?: string;
};

export type KnowledgeCategoryLocales = {
  ar?: KnowledgeCategoryLocaleVariant;
  ur?: KnowledgeCategoryLocaleVariant;
};

export type KnowledgeCategoryTreeNode = {
  _id: string;
  name: string;
  slug: string;
  parentId: string | null;
  order: number;
  ancestorIds?: string[];
  description?: string;
  locales?: KnowledgeCategoryLocales;
  articleCount?: number;
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

export type KnowledgeChunkLocaleVariant = {
  title?: string;
  content?: string;
  sections?: KnowledgeChunkSectionInput[];
  seo?: KnowledgeChunkSeo;
};

export type KnowledgeChunkLocales = {
  ar?: KnowledgeChunkLocaleVariant;
  ur?: KnowledgeChunkLocaleVariant;
};

export type KnowledgeChunk = {
  _id: string;
  slug?: string;
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
  locales?: KnowledgeChunkLocales;
  locale?: string;
  titleFallback?: boolean;
  contentFallback?: boolean;
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
  slug?: string;
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

export type PatchKnowledgeChunkBody = Partial<
  Omit<CreateKnowledgeChunkBody, "slug">
> & {
  slug?: string | null;
};

export type CreateCategoryBody = {
  name: string;
  slug: string;
  parentId?: string | null;
  order?: number;
  description?: string;
  locales?: KnowledgeCategoryLocales;
};

export type PatchCategoryBody = Partial<CreateCategoryBody>;
