import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  fetchCategoryTree,
  findCategoryBySlugPath,
  getAllCategorySlugPaths,
} from "@/lib/api/categories";
import { fetchChunksByCategory } from "@/lib/api/categories";
import ShellLayout from "@/components/layout/ShellLayout";
import Breadcrumb, { type BreadcrumbItem } from "@/components/layout/Breadcrumb";
import CategoryGrid from "@/components/category/CategoryGrid";
import ArticleList from "@/components/article/ArticleList";

export const revalidate = 600;

interface CategoryPageProps {
  params: Promise<{ categorySlug: string }>;
}

export async function generateStaticParams() {
  try {
    const tree = await fetchCategoryTree();
    return tree.map((cat) => ({ categorySlug: cat.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { categorySlug } = await params;
  const tree = await fetchCategoryTree();
  const category = findCategoryBySlugPath(tree, [categorySlug]);
  if (!category) return { title: "Category Not Found" };

  return {
    title: category.name,
    description:
      category.description || `Browse articles in ${category.name}.`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { categorySlug } = await params;
  const tree = await fetchCategoryTree();
  const category = findCategoryBySlugPath(tree, [categorySlug]);

  if (!category) notFound();

  let articles;
  try {
    const result = await fetchChunksByCategory(category._id, 1, 100);
    articles = result.data;
  } catch {
    articles = [];
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { label: category.name, href: `/${categorySlug}` },
  ];

  const hasSubcategories = category.children.length > 0;
  const hasArticles = articles.length > 0;

  return (
    <ShellLayout tree={tree}>
      <Breadcrumb items={breadcrumbs} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          {category.name}
        </h1>
        {category.description && (
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">
            {category.description}
          </p>
        )}
      </div>

      {hasSubcategories && (
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Subcategories
          </h2>
          <CategoryGrid
            categories={category.children}
            basePath={`/${categorySlug}`}
          />
        </section>
      )}

      {hasSubcategories && hasArticles && (
        <hr className="my-8 border-neutral-200 dark:border-neutral-800" />
      )}

      {hasArticles && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Articles
          </h2>
          <ArticleList
            articles={articles}
            basePath={`/${categorySlug}`}
          />
        </section>
      )}

      {!hasSubcategories && !hasArticles && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-12 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-neutral-500 dark:text-neutral-400">
            No content in this category yet.
          </p>
        </div>
      )}
    </ShellLayout>
  );
}
