export default function Loading() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="border-b border-neutral-100 bg-gradient-to-b from-neutral-50 to-white px-4 py-20 dark:border-neutral-800 dark:from-neutral-900 dark:to-neutral-950">
        <div className="mx-auto max-w-3xl">
          <div className="mx-auto mb-4 h-10 w-64 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
          <div className="mx-auto mb-8 h-5 w-80 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800/50" />
          <div className="mx-auto h-14 w-full max-w-xl animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800/50" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 h-6 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-neutral-200 p-6 dark:border-neutral-800"
            >
              <div className="mb-3 h-10 w-10 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
              <div className="mb-2 h-5 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-4 w-full rounded bg-neutral-100 dark:bg-neutral-800/50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
