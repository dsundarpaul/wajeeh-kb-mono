import { config as loadEnv } from 'dotenv';

const envPath = process.env.NODE_ENV
  ? `.env.${process.env.NODE_ENV}`
  : '.env.local';

loadEnv({ path: envPath });

const s3KeyPrefix = (process.env.S3_KEY_PREFIX ?? "kb").replace(/^\/+|\/+$/g, "");

const config = {
  name: process.env.NODE_ENV,
  jwtSecret: process.env.JWT_SECRET,
  databases: {
    main: {
      uri: process.env.MONGO_URI,
      name: "main",
      replicaSet: process.env.MONGO_REPLICA_SET,
    },
  },
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },
  s3: {
    enabled: process.env.S3_ENABLED === "true",
    endPoint: process.env.S3_ENDPOINT ?? "",
    port: Number(process.env.S3_PORT ?? 443) || 443,
    useSSL: process.env.S3_USE_SSL !== "false",
    accessKey: process.env.S3_ACCESS_KEY ?? "",
    secretKey: process.env.S3_SECRET_KEY ?? "",
    bucket: process.env.S3_BUCKET ?? "",
    region: process.env.S3_REGION ?? "",
    keyPrefix: s3KeyPrefix,
    publicUrlBase: (process.env.S3_PUBLIC_URL_BASE ?? "").replace(/\/+$/, ""),
    rejectUnauthorized: process.env.S3_REJECT_UNAUTHORIZED !== "false",
  },
} as const;

export default config;
