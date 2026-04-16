import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import {
  fetchCategoryTree,
  findCategoryBySlugPath,
  getAllCategorySlugPaths,
  fetchChunksByCategory,
  buildSlugPathMap,
} from "@/lib/api/categories";
import {
  fetchArticleBySlugOrId,
  fetchArticleToc,
  fetchAllKnowledgeChunks,
} from "@/lib/api/articles";
import ShellLayout from "@/components/layout/ShellLayout";
import Breadcrumb, { type BreadcrumbItem } from "@/components/layout/Breadcrumb";
import CategoryGrid from "@/components/category/CategoryGrid";
import ArticleList from "@/components/article/ArticleList";
import ArticleBody from "@/components/article/ArticleBody";
import ArticleToc from "@/components/article/ArticleToc";
import FeedbackWidget from "@/components/article/FeedbackWidget";
import { Clock } from "lucide-react";
import type {
  KnowledgeCategoryTreeNode,
  KnowledgeChunk,
} from "@/types/api";
import { ApiError } from "@/lib/api/client";
import { knowledgeChunkPublicPath } from "@/lib/routes/article-path";
import { buildArticleMetadata } from "@/lib/seo/article-metadata";
import {
  intlLocaleForKbPortal,
  isRtlKbLocale,
  normalizeKbPortalLocale,
} from "@/lib/kb-locale";
import { resolveKbPortalLocale } from "@/lib/kb-locale.server";
import { getPortalUi } from "@/lib/get-portal-ui";

export const revalidate = 600;

interface NestedPageProps {
  params: Promise<{ categorySlug: string; slug: string[] }>;
  searchParams: Promise<{ locale?: string }>;
}

function isMongoId(s: string): boolean {
  return /^[0-9a-f]{24}$/i.test(s);
}

function formatDate(dateStr: string, dateLocale: string): string {
  try {
    return new Intl.DateTimeFormat(dateLocale, {
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
  article?: { title: string; href: string },
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
  if (article) {
    crumbs.push({ label: article.title, href: article.href });
  }
  return crumbs;
}

export async function generateStaticParams() {
  try {
    const tree = await fetchCategoryTree();
    const articles = await fetchAllKnowledgeChunks();
    const slugMap = buildSlugPathMap(tree);
    const categoryPaths = getAllCategorySlugPaths(tree).filter(
      (p) => p.length >= 2,
    );
    const fromCategories = categoryPaths.map((p) => ({
      categorySlug: p[0],
      slug: p.slice(1),
    }));
    const fromArticles: { categorySlug: string; slug: string[] }[] = [];
    for (const a of articles) {
      const href = knowledgeChunkPublicPath(a, slugMap);
      if (href.startsWith("/article/")) continue;
      const segments = href.split("/").filter(Boolean);
      if (segments.length < 2) continue;
      fromArticles.push({
        categorySlug: segments[0],
        slug: segments.slice(1),
      });
    }
    return [...fromCategories, ...fromArticles];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: NestedPageProps): Promise<Metadata> {
  const { categorySlug, slug } = await params;
  const { locale: localeParam } = await searchParams;
  const locale = await resolveKbPortalLocale(localeParam);
  const fullPath = [categorySlug, ...slug];
  const tree = await fetchCategoryTree(locale, { forPortal: true });
  const slugMap = buildSlugPathMap(tree);

  const categoryExact = findCategoryBySlugPath(tree, fullPath);
  if (categoryExact) {
    return {
      title: categoryExact.name,
      description:
        categoryExact.description ||
        `Browse articles in ${categoryExact.name}.`,
    };
  }

  if (fullPath.length < 2) {
    return { title: "Not Found" };
  }

  const articleSlug = fullPath[fullPath.length - 1];
  const parentPath = fullPath.slice(0, -1);
  const parentCat = findCategoryBySlugPath(tree, parentPath);
  if (!parentCat) {
    return { title: "Not Found" };
  }

  try {
    const article = await fetchArticleBySlugOrId(articleSlug, locale);
    const inCategory =
      article.primaryCategoryId === parentCat._id ||
      (article.categoryIds ?? []).includes(parentCat._id);
    const canonicalPath = inCategory
      ? `/${fullPath.join("/")}`
      : knowledgeChunkPublicPath(article, slugMap);
    return buildArticleMetadata(article, canonicalPath);
  } catch {
    return { title: "Article Not Found" };
  }
}

export default async function NestedCategoryOrArticlePage({
  params,
  searchParams,
}: NestedPageProps) {
  const { categorySlug, slug } = await params;
  const { locale: localeParam } = await searchParams;
  const { locale, messages } = await getPortalUi(localeParam);
  const dateLocale = intlLocaleForKbPortal(locale);
  const tree = await fetchCategoryTree(locale, { forPortal: true });
  const slugMap = buildSlugPathMap(tree);
  const fullPath = [categorySlug, ...slug];

  const categoryExact = findCategoryBySlugPath(tree, fullPath);
  if (categoryExact) {
    let articles: KnowledgeChunk[] = [];
    try {
      const result = await fetchChunksByCategory(
        categoryExact._id,
        1,
        100,
        locale,
      );
      articles = result.data;
    } catch {
      articles = [];
    }

    const breadcrumbs = buildBreadcrumbs(fullPath, tree);
    const pathStr = `/${fullPath.join("/")}`;
    const hasSubcategories = categoryExact.children.length > 0;
    const hasArticles = articles.length > 0;

    return (
      <ShellLayout tree={tree} messages={messages}>
        <Breadcrumb items={breadcrumbs} homeLabel={messages.breadcrumbHome} />

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {categoryExact.name}
          </h1>
          {categoryExact.description && (
            <p className="mt-2 text-neutral-500 dark:text-neutral-400">
              {categoryExact.description}
            </p>
          )}
        </div>

        {hasSubcategories && (
          <section className="mb-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {messages.categorySubcategories}
            </h2>
            <CategoryGrid
              categories={categoryExact.children}
              messages={messages}
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
              {messages.categoryArticles}
            </h2>
            <ArticleList
              articles={articles}
              basePath={pathStr}
              updatedLabel={messages.articleCardUpdated}
              dateLocale={dateLocale}
            />
          </section>
        )}

        {!hasSubcategories && !hasArticles && (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-12 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-neutral-500 dark:text-neutral-400">
              {messages.categoryEmpty}
            </p>
          </div>
        )}
      </ShellLayout>
    );
  }

  if (fullPath.length < 2) notFound();

  const articleSlug = fullPath[fullPath.length - 1];
  const parentPath = fullPath.slice(0, -1);
  const parentCat = findCategoryBySlugPath(tree, parentPath);
  if (!parentCat) notFound();

  if (isMongoId(articleSlug)) {
    let article;
    try {
      article = await fetchArticleBySlugOrId(articleSlug, locale);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) notFound();
      throw err;
    }
    permanentRedirect(knowledgeChunkPublicPath(article, slugMap));
  }

  let article;
  try {
    article = await fetchArticleBySlugOrId(articleSlug, locale);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const inCategory =
    article.primaryCategoryId === parentCat._id ||
    (article.categoryIds ?? []).includes(parentCat._id);
  if (!inCategory) {
    permanentRedirect(knowledgeChunkPublicPath(article, slugMap));
  }

  const articleHref = `/${fullPath.join("/")}`;
  const breadcrumbs = buildBreadcrumbs(parentPath, tree, {
    title: article.title,
    href: articleHref,
  });

  let tocData;
  try {
    tocData = await fetchArticleToc(article._id);
  } catch {
    tocData = { sections: [] };
  }

  return (
    <ShellLayout tree={tree} messages={messages}>
      <Breadcrumb items={breadcrumbs} homeLabel={messages.breadcrumbHome} />
      <div className="flex gap-10">
        <article
          className="min-w-0 flex-1"
          dir={
            isRtlKbLocale(normalizeKbPortalLocale(article.locale))
              ? "rtl"
              : "ltr"
          }
        >
          <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {article.title}
            </h1>
            {article.updatedAt && (
              <div className="mt-3 flex items-center gap-1.5 text-sm text-neutral-400 dark:text-neutral-500">
                <Clock className="h-4 w-4" />
                <span>
                  {messages.articleLastUpdated}{" "}
                  {formatDate(article.updatedAt, dateLocale)}
                </span>
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

          <FeedbackWidget messages={messages} />
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
