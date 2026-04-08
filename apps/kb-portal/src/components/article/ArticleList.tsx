import type { KnowledgeChunk } from "@/types/api";
import ArticleCard from "./ArticleCard";

interface ArticleListProps {
  articles: KnowledgeChunk[];
  basePath?: string;
}

export default function ArticleList({ articles, basePath }: ArticleListProps) {
  if (articles.length === 0) return null;

  return (
    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
      {articles.map((article) => {
        const articleHref = basePath
          ? `${basePath}/${article._id}`
          : `/${article._id}`;
        return (
          <ArticleCard key={article._id} article={article} href={articleHref} />
        );
      })}
    </div>
  );
}
