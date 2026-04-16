import type { MetadataRoute } from "next";
import {
  fetchCategoryTree,
  getAllCategorySlugPaths,
  buildSlugPathMap,
} from "@/lib/api/categories";
import { fetchAllKnowledgeChunks } from "@/lib/api/articles";
import { knowledgeChunkPublicPath } from "@/lib/routes/article-path";

const BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kb.example.com"
).replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];

  try {
    const tree = await fetchCategoryTree();
    const slugMap = buildSlugPathMap(tree);
    const categoryPaths = getAllCategorySlugPaths(tree);

    for (const path of categoryPaths) {
      entries.push({
        url: `${BASE_URL}/${path.join("/")}`,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    const articles = await fetchAllKnowledgeChunks();
    for (const article of articles) {
      const path = knowledgeChunkPublicPath(article, slugMap);
      entries.push({
        url: `${BASE_URL}${path}`,
        lastModified: article.updatedAt
          ? new Date(article.updatedAt)
          : new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // If API is unavailable, return minimal sitemap
  }

  return entries;
}
