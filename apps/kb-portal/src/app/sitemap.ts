import type { MetadataRoute } from "next";
import {
  fetchCategoryTree,
  getAllCategorySlugPaths,
} from "@/lib/api/categories";
import { fetchArticles } from "@/lib/api/articles";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kb.example.com";

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
    const categoryPaths = getAllCategorySlugPaths(tree);

    for (const path of categoryPaths) {
      entries.push({
        url: `${BASE_URL}/${path.join("/")}`,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    const articlesResult = await fetchArticles(1, 100);
    for (const article of articlesResult.data) {
      entries.push({
        url: `${BASE_URL}/article/${article._id}`,
        lastModified: article.updatedAt ? new Date(article.updatedAt) : new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // If API is unavailable, return minimal sitemap
  }

  return entries;
}
