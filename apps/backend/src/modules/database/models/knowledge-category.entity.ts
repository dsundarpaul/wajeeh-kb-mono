import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type KnowledgeCategoryDocument = HydratedDocument<KnowledgeCategory>;

@Schema({ timestamps: true })
export class KnowledgeCategory {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  slug: string;

  @Prop({ type: Types.ObjectId, ref: "KnowledgeCategory", default: null })
  parentId: Types.ObjectId | null;

  @Prop({ type: Number, default: 0 })
  order: number;

  @Prop({ type: [Types.ObjectId], default: [] })
  ancestorIds: Types.ObjectId[];

  @Prop({ type: String })
  description?: string;

  @Prop({
    type: {
      ar: {
        name: { type: String },
        description: { type: String },
      },
      ur: {
        name: { type: String },
        description: { type: String },
      },
    },
    _id: false,
  })
  locales?: {
    ar?: { name?: string; description?: string };
    ur?: { name?: string; description?: string };
  };
}

export const KnowledgeCategorySchema =
  SchemaFactory.createForClass(KnowledgeCategory);

KnowledgeCategorySchema.index({ parentId: 1, slug: 1 }, { unique: true });
KnowledgeCategorySchema.index({ parentId: 1, order: 1 });
KnowledgeCategorySchema.index({ ancestorIds: 1 });
