"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import SearchBar from "@/components/search/SearchBar";
import SearchResults from "@/components/search/SearchResults";
import { searchArticles } from "@/lib/api/search";
import { fetchCategoryTree, buildSlugPathMap } from "@/lib/api/categories";
import { knowledgeChunkPublicPath } from "@/lib/routes/article-path";
import type { KbPortalLocale } from "@/lib/kb-locale";
import type { PortalMessages } from "@/lib/portal-messages";
import type {
  KnowledgeCategoryTreeNode,
  KnowledgeChunk,
} from "@/types/api";

function SearchInner({
  articleLocale,
  messages,
  dateLocale,
}: {
  articleLocale: KbPortalLocale;
  messages: PortalMessages;
  dateLocale: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<KnowledgeChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [categoryTree, setCategoryTree] = useState<
    KnowledgeCategoryTreeNode[]
  >([]);

  useEffect(() => {
    fetchCategoryTree(articleLocale, { forPortal: true })
      .then(setCategoryTree)
      .catch(() => setCategoryTree([]));
  }, [articleLocale]);

  const slugPathMap = useMemo(
    () => buildSlugPathMap(categoryTree),
    [categoryTree],
  );

  const performSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setSearched(false);
        return;
      }
      setLoading(true);
      try {
        const data = await searchArticles(q, 1, 50, articleLocale);
        setResults(data.data);
        setSearched(true);
      } catch {
        setResults([]);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    },
    [articleLocale],
  );

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setQuery(q);
    if (q) performSearch(q);
  }, [searchParams, performSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const q = query.trim();
      if (q) {
        router.replace(`/search?q=${encodeURIComponent(q)}`, { scroll: false });
        performSearch(q);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, router, performSearch]);

  return (
    <>
      <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-8 dark:border-neutral-800 dark:bg-neutral-900/50">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-4 text-2xl font-bold text-neutral-900 dark:text-white">
            {messages.searchTitle}
          </h1>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder={messages.searchPlaceholder}
            autoFocus
          />
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-8">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="mb-2 h-5 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="mb-1 h-4 w-full rounded bg-neutral-100 dark:bg-neutral-800/50" />
                <div className="h-4 w-1/2 rounded bg-neutral-100 dark:bg-neutral-800/50" />
              </div>
            ))}
          </div>
        ) : searched ? (
          <SearchResults
            articles={results}
            query={query}
            articleHref={(article) =>
              knowledgeChunkPublicPath(article, slugPathMap)
            }
            messages={messages}
            dateLocale={dateLocale}
          />
        ) : (
          <div className="py-16 text-center">
            <p className="text-neutral-500 dark:text-neutral-400">
              {messages.searchEmptyPrompt}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export default function SearchPageContent({
  articleLocale,
  messages,
  dateLocale,
}: {
  articleLocale: KbPortalLocale;
  messages: PortalMessages;
  dateLocale: string;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      }
    >
      <SearchInner
        articleLocale={articleLocale}
        messages={messages}
        dateLocale={dateLocale}
      />
    </Suspense>
  );
}
