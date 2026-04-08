import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type VideoDocument = HydratedDocument<Video>;

@Schema({ timestamps: { createdAt: "created_at", updatedAt: false } })
export class Video {
  @Prop({ required: true })
  youtube_url: string;

  @Prop({ required: true, unique: true })
  video_id: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  channel: string;

  @Prop({ required: true })
  thumbnail_url: string;

  @Prop({ required: true })
  transcript_raw: string;

  @Prop({ required: true })
  transcript_word_count: number;

  @Prop({ required: true })
  summary: string;

  @Prop({ required: true })
  was_summarized: boolean;

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const VideoSchema = SchemaFactory.createForClass(Video);

VideoSchema.virtual("id").get(function () {
  return (this._id as Types.ObjectId).toHexString();
});

VideoSchema.set("toJSON", { virtuals: true });
VideoSchema.set("toObject", { virtuals: true });
