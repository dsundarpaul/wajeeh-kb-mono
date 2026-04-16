import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsIn } from "class-validator";

export class TranslateArticleDto {
  @ApiProperty({ example: ["ar", "ur"], isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(["ar", "ur"], { each: true })
  targets: ("ar" | "ur")[];
}
