import {
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { UploadsService } from "./uploads.service";
import { GetSignedUrlQueryDto } from "./dto/get-signed-url-query.dto";

const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];
const MAX_SIZE = 10 * 1024 * 1024;

@Controller("uploads")
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get("signed-url")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Presigned PUT URL for browser uploads (S3/MinIO)",
  })
  @ApiResponse({
    status: 200,
    description: "{ putUrl, publicUrl, key }",
  })
  async signedUrl(@Query() query: GetSignedUrlQueryDto) {
    return this.uploadsService.getSignedPut(query);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Upload an image file" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @ApiResponse({ status: 201 })
  @UseInterceptors(FileInterceptor("file"))
  async upload(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME.join(", ")}`,
      );
    }
    if (file.size > MAX_SIZE) {
      throw new BadRequestException("File exceeds 10 MB limit");
    }
    return this.uploadsService.saveFile(
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }
}
