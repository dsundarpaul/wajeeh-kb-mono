import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export enum KnowledgeChunksType {
  BLOG = "blog",
  VIDEO = "video",
}

export type KnowledgeChunksDocument = HydratedDocument<KnowledgeChunksEntity>;

@Schema({ _id: true })
export class KnowledgeChunkSection {
  @Prop({ required: true })
  slug: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  order: number;

  @Prop({ default: 2 })
  level: number;

  @Prop({ type: String })
  content?: string;
}

export const KnowledgeChunkSectionSchema = SchemaFactory.createForClass(
  KnowledgeChunkSection,
);

export enum MediaType {
  IMAGE = "image",
  YOUTUBE = "youtube",
}

@Schema({ _id: true })
export class KnowledgeChunkMedia {
  @Prop({ required: true, type: String, enum: MediaType })
  type: MediaType;

  @Prop({ required: true })
  url: string;

  @Prop({ type: String })
  alt?: string;

  @Prop({ type: String })
  videoId?: string;

  @Prop({ type: Number })
  order?: number;
}

export const KnowledgeChunkMediaSchema =
  SchemaFactory.createForClass(KnowledgeChunkMedia);

@Schema({ _id: false })
export class KnowledgeChunkSeo {
  @Prop({ type: String })
  metaTitle?: string;

  @Prop({ type: String })
  metaDescription?: string;

  @Prop({ type: String })
  ogImageUrl?: string;

  @Prop({ type: String })
  keywords?: string;
}

export const KnowledgeChunkSeoSchema =
  SchemaFactory.createForClass(KnowledgeChunkSeo);

@Schema({ timestamps: true })
export class KnowledgeChunksEntity {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, type: String })
  url: string;

  @Prop({ required: true, type: String })
  content: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ required: true, type: String, enum: KnowledgeChunksType })
  type: KnowledgeChunksType;

  @Prop({ type: Types.ObjectId, ref: "KnowledgeCategory", default: null })
  categoryId: Types.ObjectId | null;

  @Prop({ type: [Types.ObjectId], ref: "KnowledgeCategory", default: [] })
  categoryIds: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: "KnowledgeCategory", default: null })
  primaryCategoryId: Types.ObjectId | null;

  @Prop({ type: [KnowledgeChunkSectionSchema], default: [] })
  sections: KnowledgeChunkSection[];

  @Prop({ type: [KnowledgeChunkMediaSchema], default: [] })
  media: KnowledgeChunkMedia[];

  @Prop({ type: KnowledgeChunkSeoSchema, required: false })
  seo?: KnowledgeChunkSeo;

  @Prop({ type: Boolean, default: false })
  isIndexed: boolean;
}

export const KnowledgeChunksSchema =
  SchemaFactory.createForClass(KnowledgeChunksEntity);

KnowledgeChunksSchema.index({ categoryId: 1, type: 1, createdAt: -1 });
KnowledgeChunksSchema.index({ categoryIds: 1, type: 1, createdAt: -1 });
KnowledgeChunksSchema.index({ primaryCategoryId: 1 });

export function resolveCategoryIds(doc: {
  categoryIds?: Types.ObjectId[] | null;
  categoryId?: Types.ObjectId | null;
}): Types.ObjectId[] {
  const raw = doc.categoryIds?.filter(Boolean) ?? [];
  const seen = new Set<string>();
  const out: Types.ObjectId[] = [];
  for (const id of raw) {
    const k = id.toHexString();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(id);
    }
  }
  if (out.length > 0) {
    return out;
  }
  if (doc.categoryId) {
    return [doc.categoryId];
  }
  return [];
}

export function resolvePrimaryCategoryId(doc: {
  categoryIds?: Types.ObjectId[] | null;
  categoryId?: Types.ObjectId | null;
  primaryCategoryId?: Types.ObjectId | null;
}): Types.ObjectId | null {
  const ids = resolveCategoryIds(doc);
  if (ids.length === 0) {
    return null;
  }
  const primary = doc.primaryCategoryId;
  if (primary && ids.some((id) => id.equals(primary))) {
    return primary;
  }
  return ids[0];
}
