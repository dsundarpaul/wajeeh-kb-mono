export default function CategoryLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-72 border-r border-neutral-200 p-4 lg:block dark:border-neutral-800">
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-7 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800/50"
                style={{ width: `${60 + Math.random() * 40}%` }}
              />
            ))}
          </div>
        </aside>
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <div className="mb-4 flex gap-2">
            <div className="h-5 w-12 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-5 w-4 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800/50" />
            <div className="h-5 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          </div>
          <div className="mb-2 h-8 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="mb-8 h-5 w-96 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800/50" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
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
        </main>
      </div>
    </div>
  );
}
