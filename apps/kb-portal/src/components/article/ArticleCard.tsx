import Link from "next/link";
import { FileText, Clock, Video } from "lucide-react";
import type { KnowledgeChunk } from "@/types/api";
import { getExcerpt } from "@/lib/utils/richtext";

interface ArticleCardProps {
  article: KnowledgeChunk;
  href: string;
}

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return "";
  }
}

export default function ArticleCard({ article, href }: ArticleCardProps) {
  const excerpt = getExcerpt(article.content, 120);

  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-lg border border-transparent px-4 py-3 transition-all duration-200 hover:border-neutral-200 hover:bg-neutral-50 dark:hover:border-neutral-800 dark:hover:bg-neutral-900/50"
    >
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-400 transition-colors group-hover:bg-brand-50 group-hover:text-brand-600 dark:bg-neutral-800 dark:text-neutral-500">
        {article.type === "video" ? (
          <Video className="h-4 w-4" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-medium text-neutral-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-400">
          {article.title}
        </h3>
        {excerpt && (
          <p className="mt-0.5 line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400">
            {excerpt}
          </p>
        )}
        {article.updatedAt && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
            <Clock className="h-3 w-3" />
            <span>Updated {formatDate(article.updatedAt)}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
