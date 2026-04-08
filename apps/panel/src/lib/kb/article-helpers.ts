import type { KnowledgeChunkMediaInput, KnowledgeChunkSectionInput } from "./types";

export function slugifySegment(input: string): string {
  const s = input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s.length > 0 ? s : "section";
}

export function draftArticleUrl(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `https://kb.internal/article/draft/${crypto.randomUUID()}`;
  }
  return `https://kb.internal/article/draft/${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function sectionsFromHeadingsHtml(html: string): KnowledgeChunkSectionInput[] {
  if (typeof document === "undefined") {
    return [];
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  const headings = doc.querySelectorAll("h2, h3");
  const used = new Map<string, number>();
  const out: KnowledgeChunkSectionInput[] = [];
  let order = 0;
  headings.forEach((el) => {
    const title = el.textContent?.trim() ?? "";
    if (!title) return;
    const base = slugifySegment(title);
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    const slug = n === 1 ? base : `${base}-${n}`;
    const level = el.tagName === "H2" ? 2 : 3;
    out.push({ slug, title, order: order++, level });
  });
  return out;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function extractMediaFromHtml(html: string): {
  images: { src: string; alt: string }[];
  youtubeIds: string[];
} {
  if (typeof document === "undefined") return { images: [], youtubeIds: [] };
  const doc = new DOMParser().parseFromString(html, "text/html");

  const images: { src: string; alt: string }[] = [];
  doc.querySelectorAll("img[src]").forEach((el) => {
    const src = el.getAttribute("src") ?? "";
    if (src) images.push({ src, alt: el.getAttribute("alt") ?? "" });
  });

  const youtubeIds: string[] = [];
  doc.querySelectorAll("[data-youtube-video-id]").forEach((el) => {
    const id = el.getAttribute("data-youtube-video-id");
    if (id) youtubeIds.push(id);
  });

  return { images, youtubeIds };
}

export function buildMediaArray(
  imageUrls: { url: string; alt: string }[],
  youtubeIds: string[],
): KnowledgeChunkMediaInput[] {
  const media: KnowledgeChunkMediaInput[] = [];
  let order = 0;
  for (const img of imageUrls) {
    media.push({ type: "image", url: img.url, alt: img.alt, order: order++ });
  }
  for (const videoId of youtubeIds) {
    media.push({
      type: "youtube",
      url: `https://www.youtube.com/watch?v=${videoId}`,
      videoId,
      order: order++,
    });
  }
  return media;
}

export function replaceImageSrcsInHtml(
  html: string,
  srcMap: Map<string, string>,
): string {
  let out = html;
  for (const [oldSrc, newSrc] of srcMap) {
    out = out.split(oldSrc).join(newSrc);
  }
  return out;
}

export function renderMediaInHtml(
  html: string,
  media: KnowledgeChunkMediaInput[],
): string {
  let out = html;
  out = out.replace(
    /<div[^>]*data-youtube-video-id="([^"]+)"[^>]*>\s*<\/div>/gi,
    (_full, videoId: string) =>
      `<div class="aspect-video w-full max-w-3xl overflow-hidden rounded-lg bg-neutral-900 my-4"><iframe class="h-full w-full min-h-[220px]" src="https://www.youtube-nocookie.com/embed/${escapeAttr(videoId)}" title="YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`,
  );

  const unusedYoutube = media.filter(
    (m) => m.type === "youtube" && m.videoId && !out.includes(m.videoId),
  );
  for (const yt of unusedYoutube) {
    out += `<div class="aspect-video w-full max-w-3xl overflow-hidden rounded-lg bg-neutral-900 my-4"><iframe class="h-full w-full min-h-[220px]" src="https://www.youtube-nocookie.com/embed/${escapeAttr(yt.videoId!)}" title="YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
  }

  return out;
}

export function extractYoutubeIdFromUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id || null;
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") {
        return u.searchParams.get("v");
      }
      const m = u.pathname.match(/^\/embed\/([^/?]+)/);
      if (m) return m[1];
      const shorts = u.pathname.match(/^\/shorts\/([^/?]+)/);
      if (shorts) return shorts[1];
    }
  } catch {
    return null;
  }
  return null;
}
