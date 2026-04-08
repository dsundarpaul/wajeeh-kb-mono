import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString } from "class-validator";

export class VideoCreateDto {
  @ApiProperty()
  @IsString()
  youtube_url: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];
}
