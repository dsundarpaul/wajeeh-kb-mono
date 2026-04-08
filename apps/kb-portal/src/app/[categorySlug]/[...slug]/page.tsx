import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  fetchCategoryTree,
  findCategoryBySlugPath,
  getAllCategorySlugPaths,
  fetchChunksByCategory,
} from "@/lib/api/categories";
import { fetchArticleById, fetchArticleToc } from "@/lib/api/articles";
import ShellLayout from "@/components/layout/ShellLayout";
import Breadcrumb, { type BreadcrumbItem } from "@/components/layout/Breadcrumb";
import CategoryGrid from "@/components/category/CategoryGrid";
import ArticleList from "@/components/article/ArticleList";
import ArticleBody from "@/components/article/ArticleBody";
import ArticleToc from "@/components/article/ArticleToc";
import FeedbackWidget from "@/components/article/FeedbackWidget";
import { getExcerpt } from "@/lib/utils/richtext";
import { Clock } from "lucide-react";
import type { KnowledgeChunk, KnowledgeCategoryTreeNode } from "@/types/api";
import { ApiError } from "@/lib/api/client";

export const revalidate = 600;

interface NestedPageProps {
  params: Promise<{ categorySlug: string; slug: string[] }>;
}

function isMongoId(s: string): boolean {
  return /^[0-9a-f]{24}$/i.test(s);
}

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return "";
  }
}

function buildBreadcrumbs(
  categorySlugs: string[],
  tree: KnowledgeCategoryTreeNode[],
  articleTitle?: string,
): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [];
  let currentLevel = tree;
  let pathSoFar = "";

  for (const slug of categorySlugs) {
    const node = currentLevel.find((n) => n.slug === slug);
    if (!node) break;
    pathSoFar += `/${slug}`;
    crumbs.push({ label: node.name, href: pathSoFar });
    currentLevel = node.children;
  }

  if (articleTitle) {
    crumbs.push({
      label: articleTitle,
      href: `${pathSoFar}`,
    });
  }

  return crumbs;
}

export async function generateStaticParams() {
  try {
    const tree = await fetchCategoryTree();
    const paths = getAllCategorySlugPaths(tree);
    return paths
      .filter((p) => p.length >= 2)
      .map((p) => ({
        categorySlug: p[0],
        slug: p.slice(1),
      }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: NestedPageProps): Promise<Metadata> {
  const { categorySlug, slug } = await params;
  const lastSegment = slug[slug.length - 1];

  if (isMongoId(lastSegment)) {
    try {
      const article = await fetchArticleById(lastSegment);
      const description = getExcerpt(article.content, 160);
      return {
        title: article.title,
        description,
        openGraph: {
          title: article.title,
          description,
          type: "article",
          modifiedTime: article.updatedAt,
        },
      };
    } catch {
      return { title: "Article Not Found" };
    }
  }

  const tree = await fetchCategoryTree();
  const fullPath = [categorySlug, ...slug];
  const category = findCategoryBySlugPath(tree, fullPath);
  if (!category) return { title: "Not Found" };
  return {
    title: category.name,
    description: category.description || `Browse articles in ${category.name}.`,
  };
}

async function tryFetchArticle(
  id: string,
): Promise<KnowledgeChunk | null> {
  try {
    return await fetchArticleById(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    return null;
  }
}

export default async function NestedCategoryOrArticlePage({
  params,
}: NestedPageProps) {
  const { categorySlug, slug } = await params;
  const tree = await fetchCategoryTree();
  const lastSegment = slug[slug.length - 1];

  if (isMongoId(lastSegment)) {
    const article = await tryFetchArticle(lastSegment);
    if (!article) notFound();

    const categorySlugs = [categorySlug, ...slug.slice(0, -1)];
    const breadcrumbs = buildBreadcrumbs(categorySlugs, tree, article.title);

    let tocData;
    try {
      tocData = await fetchArticleToc(article._id);
    } catch {
      tocData = { sections: [] };
    }

    return (
      <ShellLayout tree={tree}>
        <Breadcrumb items={breadcrumbs} />
        <div className="flex gap-10">
          <article className="min-w-0 flex-1">
            <header className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                {article.title}
              </h1>
              {article.updatedAt && (
                <div className="mt-3 flex items-center gap-1.5 text-sm text-neutral-400 dark:text-neutral-500">
                  <Clock className="h-4 w-4" />
                  <span>Last updated {formatDate(article.updatedAt)}</span>
                </div>
              )}
              {article.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </header>

            <ArticleBody
              content={article.content}
              media={article.media}
            />

            <FeedbackWidget />
          </article>

          {tocData.sections.length > 0 && (
            <div className="hidden w-56 flex-shrink-0 xl:block">
              <ArticleToc sections={tocData.sections} />
            </div>
          )}
        </div>
      </ShellLayout>
    );
  }

  const fullPath = [categorySlug, ...slug];
  const category = findCategoryBySlugPath(tree, fullPath);
  if (!category) notFound();

  let articles;
  try {
    const result = await fetchChunksByCategory(category._id, 1, 100);
    articles = result.data;
  } catch {
    articles = [];
  }

  const breadcrumbs = buildBreadcrumbs(fullPath, tree);
  const pathStr = `/${fullPath.join("/")}`;
  const hasSubcategories = category.children.length > 0;
  const hasArticles = articles.length > 0;

  return (
    <ShellLayout tree={tree}>
      <Breadcrumb items={breadcrumbs} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          {category.name}
        </h1>
        {category.description && (
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">
            {category.description}
          </p>
        )}
      </div>

      {hasSubcategories && (
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Subcategories
          </h2>
          <CategoryGrid
            categories={category.children}
            basePath={pathStr}
          />
        </section>
      )}

      {hasSubcategories && hasArticles && (
        <hr className="my-8 border-neutral-200 dark:border-neutral-800" />
      )}

      {hasArticles && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Articles
          </h2>
          <ArticleList articles={articles} basePath={pathStr} />
        </section>
      )}

      {!hasSubcategories && !hasArticles && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-12 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-neutral-500 dark:text-neutral-400">
            No content in this category yet.
          </p>
        </div>
      )}
    </ShellLayout>
  );
}
