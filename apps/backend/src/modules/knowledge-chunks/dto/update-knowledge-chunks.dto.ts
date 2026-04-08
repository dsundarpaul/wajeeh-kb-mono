import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { KnowledgeChunksType } from "../../database/models/knowledge-chunks.entity";
import { CreateKnowledgeChunkSectionDto } from "./create-knowledge-chunk-section.dto";
import { KnowledgeChunkMediaDto } from "./knowledge-chunk-media.dto";
import { KnowledgeChunkSeoDto } from "./knowledge-chunk-seo.dto";

export class UpdateKnowledgeChunksDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsEnum(KnowledgeChunksType)
  type?: KnowledgeChunksType;

  @IsOptional()
  @ValidateIf((o) => o.categoryId != null)
  @IsMongoId()
  categoryId?: string | null;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  categoryIds?: string[];

  @IsOptional()
  @ValidateIf((o) => o.primaryCategoryId != null)
  @IsMongoId()
  primaryCategoryId?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateKnowledgeChunkSectionDto)
  sections?: CreateKnowledgeChunkSectionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KnowledgeChunkMediaDto)
  media?: KnowledgeChunkMediaDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => KnowledgeChunkSeoDto)
  seo?: KnowledgeChunkSeoDto;
}
