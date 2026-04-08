import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as Minio from "minio";
import { Agent as HttpAgent } from "node:https";
import { basename, extname } from "path";
import { randomUUID } from "crypto";
import config from "../../configuration";

function s3EnvComplete(): boolean {
  return (
    process.env.S3_ENABLED === "true" &&
    !!process.env.S3_ENDPOINT?.trim() &&
    !!process.env.S3_ACCESS_KEY?.trim() &&
    !!process.env.S3_SECRET_KEY?.trim() &&
    !!process.env.S3_BUCKET?.trim() &&
    !!process.env.S3_PUBLIC_URL_BASE?.trim()
  );
}

@Injectable()
export class S3StorageService implements OnModuleInit {
  private readonly logger = new Logger(S3StorageService.name);
  private client: Minio.Client | null = null;

  onModuleInit() {
    if (!s3EnvComplete()) {
      if (process.env.S3_ENABLED === "true") {
        this.logger.warn(
          "S3_ENABLED is true but S3 env is incomplete; uploads will use local disk",
        );
      }
      return;
    }
    const c = config.s3;
    try {
      this.client = new Minio.Client({
        endPoint: c.endPoint,
        port: c.port,
        useSSL: c.useSSL,
        accessKey: c.accessKey,
        secretKey: c.secretKey,
        region: c.region || undefined,
        transportAgent: c.rejectUnauthorized
          ? undefined
          : new HttpAgent({ rejectUnauthorized: false }),
      });
      this.logger.log("S3/MinIO client initialized");
    } catch (e) {
      this.logger.error("Failed to init S3 client", e);
      this.client = null;
    }
  }

  isReady(): boolean {
    return this.client !== null;
  }

  buildObjectKey(namespace: string, fileName: string): string {
    const raw = basename(fileName || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = extname(raw).toLowerCase() || ".bin";
    const stem = basename(raw, ext) || "file";
    const prefix = config.s3.keyPrefix;
    return `${prefix}/${namespace}/${randomUUID()}_${stem}${ext}`;
  }

  publicUrlForKey(key: string): string {
    const base = config.s3.publicUrlBase.replace(/\/+$/, "");
    return `${base}/${key.replace(/^\/+/, "")}`;
  }

  async putBuffer(key: string, buffer: Buffer, contentType: string) {
    if (!this.client) throw new Error("S3 client not configured");
    await this.client.putObject(
      config.s3.bucket,
      key,
      buffer,
      buffer.length,
      {
        "Content-Type": contentType || "application/octet-stream",
        "x-amz-acl": "public-read",
      },
    );
  }

  async presignedPutObject(key: string, expirySeconds = 3600): Promise<string> {
    if (!this.client) throw new Error("S3 client not configured");
    return this.client.presignedPutObject(
      config.s3.bucket,
      key,
      expirySeconds,
    );
  }
}
