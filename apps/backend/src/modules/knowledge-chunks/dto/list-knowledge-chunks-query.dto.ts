import { Type } from "class-transformer";
import { IsEnum, IsInt, IsMongoId, IsOptional, IsString, Max, Min } from "class-validator";
import { KnowledgeChunksType } from "../../database/models/knowledge-chunks.entity";

export class ListKnowledgeChunksQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @IsEnum(KnowledgeChunksType)
  type?: KnowledgeChunksType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
