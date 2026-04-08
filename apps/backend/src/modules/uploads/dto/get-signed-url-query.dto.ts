import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsString, Matches } from "class-validator";

const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const;

export class GetSignedUrlQueryDto {
  @ApiProperty({ example: "diagram.png" })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: "image/png", enum: ALLOWED_IMAGE_MIME })
  @IsString()
  @IsNotEmpty()
  @IsIn([...ALLOWED_IMAGE_MIME])
  fileType: string;

  @ApiProperty({
    example: "kb",
    description: "Folder segment under the configured key prefix",
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9][a-z0-9-]*$/i, {
    message: "namespace must be alphanumeric with hyphens",
  })
  namespace: string;
}
