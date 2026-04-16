import { fetchCategoryTree } from "@/lib/api/categories";
import CategoryGrid from "@/components/category/CategoryGrid";
import ShellLayout from "@/components/layout/ShellLayout";
import HomeSearch from "./home-search";
import { getPortalUi } from "@/lib/get-portal-ui";
import type { KnowledgeCategoryTreeNode } from "@/types/api";

export const revalidate = 3600;

export default async function HomePage() {
  const { locale, messages } = await getPortalUi();
  let tree: KnowledgeCategoryTreeNode[];
  try {
    tree = await fetchCategoryTree(locale, { forPortal: true });
  } catch {
    tree = [];
  }

  return (
    <ShellLayout tree={tree} messages={messages} showSidebar={false}>
      <section className="relative overflow-hidden border-b border-neutral-100 bg-gradient-to-b from-brand-50/50 to-white px-4 py-20 sm:py-28 dark:border-neutral-800 dark:from-brand-950/20 dark:to-neutral-950">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl dark:text-white">
            {messages.homeHeroTitle}
          </h1>
          <p className="mb-8 text-lg text-neutral-500 dark:text-neutral-400">
            {messages.homeHeroSubtitle}
          </p>
          <div className="mx-auto max-w-xl">
            <HomeSearch placeholder={messages.homeHeroSearchPlaceholder} />
          </div>
        </div>
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-brand-500/5 blur-3xl dark:bg-brand-500/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-brand-500/5 blur-3xl dark:bg-brand-500/10" />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-xl font-semibold text-neutral-900 dark:text-white">
          {messages.homeBrowseTitle}
        </h2>
        {tree.length > 0 ? (
          <CategoryGrid categories={tree} messages={messages} />
        ) : (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-12 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-neutral-500 dark:text-neutral-400">
              {messages.homeEmptyCategories}
            </p>
          </div>
        )}
      </section>
    </ShellLayout>
  );
}
