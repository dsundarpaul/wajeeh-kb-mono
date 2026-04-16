import { Type } from "class-transformer";
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { CategoryLocalesDto } from "./category-locales.dto";

export class CreateKnowledgeCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, {
    message: "slug must be URL-safe (letters, numbers, hyphens)",
  })
  slug: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CategoryLocalesDto)
  locales?: CategoryLocalesDto;
}
