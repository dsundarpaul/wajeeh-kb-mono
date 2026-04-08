import { api } from "@/lib/api";
import type {
  CreateCategoryBody,
  CreateKnowledgeChunkBody,
  KnowledgeCategoryTreeNode,
  KnowledgeChunk,
  KnowledgeChunkType,
  Paginated,
  PatchCategoryBody,
  PatchKnowledgeChunkBody,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003";

const SIGNED_UPLOAD_MIME = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const;

function mimeForSignedUpload(file: File): string {
  const t = file.type?.trim();
  if (t && (SIGNED_UPLOAD_MIME as readonly string[]).includes(t)) {
    return t;
  }
  const n = file.name.toLowerCase();
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".gif")) return "image/gif";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".svg")) return "image/svg+xml";
  return "image/png";
}

export function resolveMediaPublicUrl(result: { url: string }): string {
  if (result.url.startsWith("http://") || result.url.startsWith("https://")) {
    return result.url;
  }
  return result.url.startsWith("/")
    ? `${API_URL}${result.url}`
    : `${API_URL}/${result.url}`;
}

export function isImageAlreadyHosted(src: string): boolean {
  if (src.startsWith("blob:") || src.startsWith("data:")) return false;
  if (src.startsWith(`${API_URL}/uploads/`) || src.startsWith("/uploads/")) {
    return true;
  }
  const base = process.env.NEXT_PUBLIC_MEDIA_PUBLIC_BASE_URL?.replace(
    /\/+$/,
    "",
  );
  if (base && (src === base || src.startsWith(`${base}/`))) {
    return true;
  }
  return false;
}

async function uploadImageMultipart(
  file: File,
): Promise<{ filename: string; url: string }> {
  const form = new FormData();
  form.append("file", file);
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/uploads`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body.message === "string" ? body.message : "Upload failed",
    );
  }
  const data = (await res.json()) as { filename: string; url: string };
  return {
    filename: data.filename,
    url: resolveMediaPublicUrl(data),
  };
}

export async function fetchCategoryTree(): Promise<KnowledgeCategoryTreeNode[]> {
  return api.get<KnowledgeCategoryTreeNode[]>("/categories/tree");
}

export type KnowledgeCategoryRow = {
  _id: string;
  name: string;
  slug: string;
  parentId: string | null;
  order: number;
  ancestorIds?: string[];
  description?: string;
};

export async function fetchCategoriesFlat(): Promise<KnowledgeCategoryRow[]> {
  return api.get<KnowledgeCategoryRow[]>("/categories");
}

export async function createCategory(body: CreateCategoryBody) {
  return api.post<unknown>("/categories", body);
}

export async function patchCategory(id: string, body: PatchCategoryBody) {
  return api.patch<unknown>(`/categories/${id}`, body);
}

export async function deleteCategory(id: string) {
  return api.delete<{ deleted: boolean }>(`/categories/${id}`);
}

export async function fetchKnowledgeChunk(id: string): Promise<KnowledgeChunk> {
  return api.get<KnowledgeChunk>(`/knowledge-chunks/${id}`);
}

export async function createKnowledgeChunk(body: CreateKnowledgeChunkBody) {
  return api.post<KnowledgeChunk>("/knowledge-chunks", body);
}

export async function patchKnowledgeChunk(id: string, body: PatchKnowledgeChunkBody) {
  return api.patch<KnowledgeChunk>(`/knowledge-chunks/${id}`, body);
}

export async function deleteKnowledgeChunk(id: string) {
  return api.delete<{ deleted: boolean }>(`/knowledge-chunks/${id}`);
}

export async function fetchKnowledgeChunksPage(
  page = 1,
  limit = 100,
  categoryId?: string,
  type?: KnowledgeChunkType,
): Promise<Paginated<KnowledgeChunk>> {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (categoryId) q.set("categoryId", categoryId);
  if (type) q.set("type", type);
  return api.get<Paginated<KnowledgeChunk>>(`/knowledge-chunks?${q.toString()}`);
}

export function flattenCategoryTree(
  nodes: KnowledgeCategoryTreeNode[],
  depth = 0,
): { id: string; name: string; depth: number }[] {
  const rows: { id: string; name: string; depth: number }[] = [];
  for (const n of nodes) {
    rows.push({ id: n._id, name: n.name, depth });
    if (n.children?.length) {
      rows.push(...flattenCategoryTree(n.children, depth + 1));
    }
  }
  return rows;
}

export async function uploadImage(
  file: File,
  namespace = "kb",
): Promise<{ filename: string; url: string }> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const fileType = mimeForSignedUpload(file);
  const params = new URLSearchParams({
    fileName: file.name || "upload.png",
    fileType,
    namespace,
  });

  const signedRes = await fetch(
    `${API_URL}/uploads/signed-url?${params.toString()}`,
    { headers },
  );

  if (signedRes.ok) {
    const body = (await signedRes.json()) as {
      putUrl: string;
      publicUrl: string;
      key?: string;
    };
    const buf = await file.arrayBuffer();
    const putHeaders: Record<string, string> = {
      "Content-Type": fileType,
    };
    if (process.env.NEXT_PUBLIC_S3_PUT_ACL === "public-read") {
      putHeaders["x-amz-acl"] = "public-read";
    }
    const putRes = await fetch(body.putUrl, {
      method: "PUT",
      body: buf,
      headers: putHeaders,
    });
    if (!putRes.ok) {
      throw new Error("Object storage upload failed");
    }
    const keyName = body.key?.split("/").pop();
    const fromPublic = body.publicUrl.split("/").filter(Boolean).pop()?.split("?")[0];
    return {
      filename:
        keyName && keyName.length > 0
          ? keyName
          : fromPublic && fromPublic.length > 0
            ? fromPublic
            : file.name || "upload",
      url: body.publicUrl,
    };
  }

  if (signedRes.status === 401) {
    const body = await signedRes.json().catch(() => ({}));
    throw new Error(
      typeof body.message === "string" ? body.message : "Unauthorized",
    );
  }

  return uploadImageMultipart(file);
}

export async function uploadImageFromUrl(
  srcUrl: string,
  namespace = "kb",
): Promise<{ filename: string; url: string }> {
  const res = await fetch(srcUrl);
  if (!res.ok) throw new Error("Failed to fetch image from URL");
  const blob = await res.blob();
  const ext = srcUrl.split("?")[0].split(".").pop() ?? "png";
  const file = new File([blob], `image.${ext}`, { type: blob.type });
  return uploadImage(file, namespace);
}

export function categoryLabelMapFromTree(
  nodes: KnowledgeCategoryTreeNode[],
): Map<string, string> {
  const map = new Map<string, string>();
  const walk = (list: KnowledgeCategoryTreeNode[]) => {
    for (const n of list) {
      map.set(n._id, n.name);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return map;
}
