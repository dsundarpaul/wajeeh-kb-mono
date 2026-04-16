import { Type } from "class-transformer";
import { IsOptional, ValidateNested } from "class-validator";
import { CategoryLocaleVariantDto } from "./category-locale-variant.dto";

export class CategoryLocalesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CategoryLocaleVariantDto)
  ar?: CategoryLocaleVariantDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CategoryLocaleVariantDto)
  ur?: CategoryLocaleVariantDto;
}
