import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchArticleById, fetchArticleToc } from "@/lib/api/articles";
import { fetchCategoryTree, buildSlugPathMap } from "@/lib/api/categories";
import ShellLayout from "@/components/layout/ShellLayout";
import Breadcrumb, { type BreadcrumbItem } from "@/components/layout/Breadcrumb";
import ArticleBody from "@/components/article/ArticleBody";
import ArticleToc from "@/components/article/ArticleToc";
import FeedbackWidget from "@/components/article/FeedbackWidget";
import { getExcerpt } from "@/lib/utils/richtext";
import { Clock } from "lucide-react";
import { ApiError } from "@/lib/api/client";

export const revalidate = 600;

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const article = await fetchArticleById(id);
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

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;
  let article;
  try {
    article = await fetchArticleById(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const tree = await fetchCategoryTree();

  const breadcrumbs: BreadcrumbItem[] = [];
  if (article.primaryCategoryId) {
    const slugMap = buildSlugPathMap(tree);
    const entry = slugMap.get(article.primaryCategoryId);
    if (entry) {
      let pathSoFar = "";
      for (const slug of entry.path) {
        pathSoFar += `/${slug}`;
        const node = entry.node;
        const current = entry.path[entry.path.length - 1] === slug ? node : null;
        breadcrumbs.push({
          label: current?.name ?? slug,
          href: pathSoFar,
        });
      }
    }
  }
  breadcrumbs.push({ label: article.title, href: `/article/${id}` });

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
