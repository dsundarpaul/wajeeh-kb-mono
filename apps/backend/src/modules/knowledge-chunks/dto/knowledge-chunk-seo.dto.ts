import { IsOptional, IsString, IsUrl, ValidateIf } from "class-validator";

export class KnowledgeChunkSeoDto {
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @ValidateIf((o: KnowledgeChunkSeoDto) => !!o.ogImageUrl?.trim())
  @IsUrl({ require_protocol: true })
  ogImageUrl?: string;

  @IsOptional()
  @IsString()
  keywords?: string;
}
