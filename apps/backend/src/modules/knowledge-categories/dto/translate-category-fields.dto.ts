import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsIn, IsOptional, IsString } from "class-validator";

export class TranslateCategoryFieldsDto {
  @ApiProperty({ required: false, description: "English category name" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, description: "English category description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: ["ar", "ur"], isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(["ar", "ur"], { each: true })
  targets: ("ar" | "ur")[];
}
