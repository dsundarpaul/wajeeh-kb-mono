"use client";

import { renderMediaInHtml } from "@/lib/kb/article-helpers";
import type { KnowledgeChunkMediaInput } from "@/lib/kb/types";

type ArticlePreviewProps = {
  title: string;
  html: string;
  tags: string[];
  media?: KnowledgeChunkMediaInput[];
  className?: string;
};

export function ArticlePreview({
  title,
  html,
  tags,
  media,
  className = "",
}: ArticlePreviewProps) {
  const safe = renderMediaInHtml(html || "<p></p>", media ?? []);

  return (
    <article
      className={`rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
    >
      <header className="mb-6 border-b border-neutral-100 pb-4 dark:border-neutral-800">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          {title || "Untitled"}
        </h1>
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </header>
      <div
        className="article-body prose prose-sm max-w-none text-neutral-800 dark:prose-invert prose-headings:scroll-mt-4 prose-a:text-brand-600 dark:prose-a:text-brand-400 prose-blockquote:border-brand-500 prose-code:text-brand-800 dark:prose-code:text-brand-300 prose-pre:bg-neutral-900 prose-pre:text-neutral-100"
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    </article>
  );
}
