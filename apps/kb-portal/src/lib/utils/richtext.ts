import type { KnowledgeChunkMedia } from "@/types/api";

export function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id || null;
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const embed = u.pathname.match(/^\/embed\/([^/?]+)/);
      if (embed) return embed[1];
      const shorts = u.pathname.match(/^\/shorts\/([^/?]+)/);
      if (shorts) return shorts[1];
    }
  } catch {
    return null;
  }
  return null;
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

export function renderArticleHtml(
  html: string,
  media: KnowledgeChunkMedia[],
): string {
  let out = html;

  out = out.replace(
    /<div[^>]*data-youtube-video-id="([^"]+)"[^>]*>\s*<\/div>/gi,
    (_full, videoId: string) =>
      `<div class="aspect-video w-full max-w-3xl overflow-hidden rounded-lg bg-neutral-900 my-4"><iframe class="h-full w-full min-h-[220px]" src="https://www.youtube-nocookie.com/embed/${escapeAttr(videoId)}" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`,
  );

  const unusedYoutube = media.filter(
    (m) => m.type === "youtube" && m.videoId && !out.includes(m.videoId),
  );
  for (const yt of unusedYoutube) {
    out += `<div class="aspect-video w-full max-w-3xl overflow-hidden rounded-lg bg-neutral-900 my-4"><iframe class="h-full w-full min-h-[220px]" src="https://www.youtube-nocookie.com/embed/${escapeAttr(yt.videoId!)}" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  }

  return out;
}

export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export function getExcerpt(html: string, maxLength = 160): string {
  const text = stripHtmlTags(html);
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, "") + "…";
}
