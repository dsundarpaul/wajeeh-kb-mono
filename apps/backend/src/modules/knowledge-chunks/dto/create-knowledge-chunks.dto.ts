import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from "class-validator";
import {
  KnowledgeChunksType,
} from "../../database/models/knowledge-chunks.entity";
import { CreateKnowledgeChunkSectionDto } from "./create-knowledge-chunk-section.dto";
import { KnowledgeChunkMediaDto } from "./knowledge-chunk-media.dto";
import { KnowledgeChunkSeoDto } from "./knowledge-chunk-seo.dto";

export class CreateKnowledgeChunksDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsEnum(KnowledgeChunksType)
  @IsNotEmpty()
  type: KnowledgeChunksType;

  @IsOptional()
  @IsMongoId()
  categoryId?: string | null;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  categoryIds?: string[];

  @IsOptional()
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
