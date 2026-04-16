import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional } from "class-validator";

export class CategoryTreeQueryDto {
  @IsOptional()
  @IsIn(["en", "ar", "ur"])
  locale?: "en" | "ar" | "ur";

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true" || value === "1")
  @IsBoolean()
  articleCounts?: boolean;
}
