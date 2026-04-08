import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { MediaType } from "../../database/models/knowledge-chunks.entity";

export class KnowledgeChunkMediaDto {
  @IsEnum(MediaType)
  @IsNotEmpty()
  type: MediaType;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsOptional()
  @IsString()
  alt?: string;

  @IsOptional()
  @IsString()
  videoId?: string;

  @IsOptional()
  @IsNumber()
  order?: number;
}
