import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import {
  fetchArticleBySlugOrId,
  fetchArticleToc,
  fetchAllKnowledgeChunks,
} from "@/lib/api/articles";
import { fetchCategoryTree, buildSlugPathMap } from "@/lib/api/categories";
import ShellLayout from "@/components/layout/ShellLayout";
import Breadcrumb, { type BreadcrumbItem } from "@/components/layout/Breadcrumb";
import ArticleBody from "@/components/article/ArticleBody";
import ArticleToc from "@/components/article/ArticleToc";
import FeedbackWidget from "@/components/article/FeedbackWidget";
import { Clock } from "lucide-react";
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
import type { KnowledgeCategoryTreeNode } from "@/types/api";

export const revalidate = 600;

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locale?: string }>;
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

export async function generateStaticParams() {
  try {
    const articles = await fetchAllKnowledgeChunks();
    return articles.map((a) => ({
      slug: a.slug?.trim() || a._id,
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: ArticlePageProps): Promise<Metadata> {
  const { slug: slugParam } = await params;
  const { locale: localeParam } = await searchParams;
  const locale = await resolveKbPortalLocale(localeParam);
  try {
    const article = await fetchArticleBySlugOrId(slugParam, locale);
    const tree = await fetchCategoryTree(locale, { forPortal: true });
    const slugMap = buildSlugPathMap(tree);
    const canonicalPath = knowledgeChunkPublicPath(article, slugMap);
    return buildArticleMetadata(article, canonicalPath);
  } catch {
    return { title: "Article Not Found" };
  }
}

export default async function ArticlePage({
  params,
  searchParams,
}: ArticlePageProps) {
  const { slug: slugParam } = await params;
  const { locale: localeParam } = await searchParams;
  const { locale, messages } = await getPortalUi(localeParam);
  const dateLocale = intlLocaleForKbPortal(locale);

  let article;
  try {
    article = await fetchArticleBySlugOrId(slugParam, locale);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const tree = await fetchCategoryTree(locale, { forPortal: true });
  const slugMap = buildSlugPathMap(tree);
  const canonicalPath = knowledgeChunkPublicPath(article, slugMap);
  const shortArticlePath = `/article/${slugParam}`;
  if (canonicalPath !== shortArticlePath) {
    permanentRedirect(canonicalPath);
  }

  const breadcrumbs: BreadcrumbItem[] = [];
  if (article.primaryCategoryId) {
    const entry = slugMap.get(article.primaryCategoryId);
    if (entry) {
      let pathSoFar = "";
      let level: KnowledgeCategoryTreeNode[] = tree;
      for (const slug of entry.path) {
        pathSoFar += `/${slug}`;
        const node = level.find((n) => n.slug === slug);
        breadcrumbs.push({
          label: node?.name ?? slug,
          href: pathSoFar,
        });
        level = node?.children ?? [];
      }
    }
  }
  breadcrumbs.push({
    label: article.title,
    href: canonicalPath,
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
