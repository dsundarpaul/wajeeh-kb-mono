import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString } from "class-validator";

export class VideoManualCreateDto {
  @ApiProperty()
  @IsString()
  youtube_url: string;

  @ApiProperty()
  @IsString()
  transcript_raw: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];
}
