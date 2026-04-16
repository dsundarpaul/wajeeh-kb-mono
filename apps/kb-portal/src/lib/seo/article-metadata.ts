import type { Metadata } from "next";
import type { KnowledgeChunk } from "@/types/api";
import { getExcerpt } from "@/lib/utils/richtext";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kb.example.com";

export function buildArticleMetadata(
  article: KnowledgeChunk,
  canonicalPath: string,
): Metadata {
  const path = canonicalPath.startsWith("/")
    ? canonicalPath
    : `/${canonicalPath}`;
  const canonical = `${SITE_URL.replace(/\/$/, "")}${path}`;

  const metaTitle =
    article.seo?.metaTitle?.trim() && article.seo.metaTitle.trim().length > 0
      ? article.seo.metaTitle.trim()
      : article.title;

  const fromSeo = article.seo?.metaDescription?.trim();
  const description =
    fromSeo && fromSeo.length > 0
      ? fromSeo
      : getExcerpt(article.content, 160);

  const ogImage = article.seo?.ogImageUrl?.trim();
  const keywordsRaw = article.seo?.keywords?.trim();

  const openGraph: Metadata["openGraph"] = {
    title: metaTitle,
    description,
    type: "article",
    url: canonical,
    ...(article.updatedAt
      ? { modifiedTime: article.updatedAt }
      : {}),
    ...(ogImage && ogImage.length > 0
      ? { images: [{ url: ogImage }] }
      : {}),
  };

  const meta: Metadata = {
    title: metaTitle,
    description,
    alternates: { canonical },
    openGraph,
  };

  if (keywordsRaw && keywordsRaw.length > 0) {
    const keywords = keywordsRaw
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (keywords.length > 0) {
      meta.keywords = keywords;
    }
  }

  return meta;
}
