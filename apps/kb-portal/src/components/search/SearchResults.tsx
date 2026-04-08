import type { KnowledgeChunk } from "@/types/api";
import { FileText, Video, Clock } from "lucide-react";
import Link from "next/link";
import { getExcerpt } from "@/lib/utils/richtext";

interface SearchResultsProps {
  articles: KnowledgeChunk[];
  query: string;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi",
  );
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="rounded bg-yellow-200/60 px-0.5 dark:bg-yellow-500/30">
        {part}
      </mark>
    ) : (
      part
    ),
  );
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

export default function SearchResults({
  articles,
  query,
}: SearchResultsProps) {
  if (articles.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="mb-4 text-5xl">🔍</div>
        <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">
          No results found
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Try using different keywords or check your spelling.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
        Found {articles.length} result{articles.length !== 1 ? "s" : ""}
      </p>
      <div className="space-y-2">
        {articles.map((article) => {
          const excerpt = getExcerpt(article.content, 200);
          return (
            <Link
              key={article._id}
              href={`/article/${article._id}`}
              className="group block rounded-lg border border-transparent p-4 transition-all hover:border-neutral-200 hover:bg-neutral-50 dark:hover:border-neutral-800 dark:hover:bg-neutral-900/50"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-400 group-hover:bg-brand-50 group-hover:text-brand-600 dark:bg-neutral-800">
                  {article.type === "video" ? (
                    <Video className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-medium text-neutral-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-400">
                    {highlightMatch(article.title, query)}
                  </h3>
                  {excerpt && (
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400">
                      {highlightMatch(excerpt, query)}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {article.updatedAt && (
                      <span className="flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                        <Clock className="h-3 w-3" />
                        {formatDate(article.updatedAt)}
                      </span>
                    )}
                    {article.tags.length > 0 && (
                      <div className="flex gap-1">
                        {article.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
