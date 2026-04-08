import { BadRequestException, Injectable } from "@nestjs/common";
import { join, extname, basename } from "path";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { S3StorageService } from "../storage/s3-storage.service";

const UPLOAD_DIR = join(process.cwd(), "uploads");
const DEFAULT_S3_NAMESPACE = "kb-blog";

const SIGNED_URL_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const;

@Injectable()
export class UploadsService {
  private readonly baseDir = UPLOAD_DIR;

  constructor(private readonly s3: S3StorageService) {}

  async ensureDir(): Promise<void> {
    await mkdir(this.baseDir, { recursive: true });
  }

  async saveFile(
    buffer: Buffer,
    originalName: string,
    contentType: string,
  ): Promise<{ filename: string; url: string }> {
    if (this.s3.isReady()) {
      const key = this.s3.buildObjectKey(DEFAULT_S3_NAMESPACE, originalName);
      await this.s3.putBuffer(key, buffer, contentType);
      const url = this.s3.publicUrlForKey(key);
      return { filename: basename(key), url };
    }
    await this.ensureDir();
    const ext = extname(originalName).toLowerCase() || ".bin";
    const filename = `${randomUUID()}${ext}`;
    const dest = join(this.baseDir, filename);
    await writeFile(dest, buffer);
    return { filename, url: `/uploads/${filename}` };
  }

  async getSignedPut(dto: {
    fileName: string;
    fileType: string;
    namespace: string;
  }): Promise<{ putUrl: string; publicUrl: string; key: string }> {
    if (!this.s3.isReady()) {
      throw new BadRequestException(
        "Direct S3 upload is not configured. Set S3_ENABLED=true and S3_* env vars, or use POST /uploads.",
      );
    }
    if (!SIGNED_URL_ALLOWED_MIME.includes(dto.fileType as (typeof SIGNED_URL_ALLOWED_MIME)[number])) {
      throw new BadRequestException(
        `Unsupported file type for signed upload. Allowed: ${SIGNED_URL_ALLOWED_MIME.join(", ")}`,
      );
    }
    const key = this.s3.buildObjectKey(dto.namespace, dto.fileName);
    const putUrl = await this.s3.presignedPutObject(key);
    const publicUrl = this.s3.publicUrlForKey(key);
    return { putUrl, publicUrl, key };
  }
}
