import type { KnowledgeChunk } from "@/types/api";
import { articlePathSegment } from "@/lib/routes/article-path";
import ArticleCard from "./ArticleCard";

interface ArticleListProps {
  articles: KnowledgeChunk[];
  basePath?: string;
  updatedLabel: string;
  dateLocale: string;
}

export default function ArticleList({
  articles,
  basePath,
  updatedLabel,
  dateLocale,
}: ArticleListProps) {
  if (articles.length === 0) return null;

  return (
    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
      {articles.map((article) => {
        const segment = articlePathSegment(article);
        const articleHref = basePath
          ? `${basePath}/${segment}`
          : `/article/${segment}`;
        return (
          <ArticleCard
            key={article._id}
            article={article}
            href={articleHref}
            updatedLabel={updatedLabel}
            dateLocale={dateLocale}
          />
        );
      })}
    </div>
  );
}
