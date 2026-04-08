"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { api } from "@/lib/api";
import { Database, PlayCircle, CheckCircle2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

interface IndexResult {
  blogs: number;
  videos: number;
  total_chunks: number;
}

export default function IndexingPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<IndexResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRebuild = async () => {
    if (
      !confirm(
        "This will rebuild the entire vector index from all blogs and videos. Continue?",
      )
    )
      return;

    setRunning(true);
    setResult(null);
    setError(null);

    try {
      const data = await api.post<IndexResult>("/ingest/rebuild");
      setResult(data);
      toast.success("Indexing complete!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Indexing failed");
      toast.error("Indexing failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Indexing
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Rebuild the vector index to update the chatbot&apos;s knowledge
        </p>
      </div>

      <div className="card p-8 text-center max-w-lg mx-auto">
        <div className="flex justify-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950/50">
            <Database size={28} className="text-brand-600 dark:text-brand-400" />
          </div>
        </div>

        <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Rebuild Vector Index
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
          This process will read all blogs and videos, split them into chunks,
          generate embeddings using Gemini, and rebuild the vector search index.
          The chatbot will use the updated index for answering queries.
        </p>

        <button
          onClick={handleRebuild}
          disabled={running}
          className={running ? "btn-secondary" : "btn-primary"}
        >
          {running ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80" />
              Indexing in progress…
            </>
          ) : (
            <>
              <PlayCircle size={18} />
              Start Indexing
            </>
          )}
        </button>

        {running && (
          <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-500">
            This may take several minutes depending on the amount of content.
          </p>
        )}

        {result && (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-left dark:border-emerald-900/60 dark:bg-emerald-950/40">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2
                size={18}
                className="text-emerald-600 dark:text-emerald-400"
              />
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                Indexing Complete
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {result.blogs}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Blogs
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {result.videos}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Videos
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {result.total_chunks}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Chunks
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-left dark:border-red-900/50 dark:bg-red-950/40">
            <div className="flex items-center gap-2">
              <AlertCircle
                size={18}
                className="text-red-600 dark:text-red-400"
              />
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {error}
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
