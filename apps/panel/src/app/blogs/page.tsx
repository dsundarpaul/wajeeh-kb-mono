"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  categoryLabelMapFromTree,
  deleteKnowledgeChunk,
  fetchCategoryTree,
  fetchKnowledgeChunksPage,
} from "@/lib/kb/kb-api";
import type { KnowledgeCategoryTreeNode } from "@/lib/kb/types";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import toast from "react-hot-toast";

type BlogRow = {
  _id: string;
  title: string;
  tags?: string[];
  categoryIds?: string[];
  primaryCategoryId?: string | null;
  categoryId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

function placementLabels(row: BlogRow, nameById: Map<string, string>): string[] {
  const ids = row.categoryIds?.length
    ? row.categoryIds
    : row.categoryId
      ? [String(row.categoryId)]
      : [];
  return ids.map((id) => nameById.get(String(id)) ?? id.slice(-6));
}

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<BlogRow[]>([]);
  const [categoryTree, setCategoryTree] = useState<KnowledgeCategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  const nameById = useMemo(
    () => categoryLabelMapFromTree(categoryTree),
    [categoryTree],
  );

  const fetchBlogs = async () => {
    try {
      const [page, tree] = await Promise.all([
        fetchKnowledgeChunksPage(1, 100, undefined, "blog"),
        fetchCategoryTree().catch(() => [] as KnowledgeCategoryTreeNode[]),
      ]);
      setBlogs(page.data as BlogRow[]);
      setCategoryTree(tree);
    } catch {
      toast.error("Failed to load articles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this article?")) return;
    try {
      await deleteKnowledgeChunk(id);
      toast.success("Deleted");
      fetchBlogs();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Articles
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Blog-type knowledge chunks — assign categories on the editor screen
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/categories" className="btn-secondary">
            Categories
          </Link>
          <Link href="/blogs/new" className="btn-primary">
            <Plus size={16} />
            New article
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : blogs.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <FileText
            size={48}
            className="mb-4 text-neutral-300 dark:text-neutral-600"
          />
          <p className="text-lg font-medium text-neutral-700 dark:text-neutral-200">
            No articles yet
          </p>
          <p className="mt-1 mb-4 text-sm text-neutral-500 dark:text-neutral-400">
            Create an article with rich text, media, and category placement
          </p>
          <Link href="/blogs/new" className="btn-primary">
            <Plus size={16} />
            New article
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/80">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Categories
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {blogs.map((blog) => {
                  const cats = placementLabels(blog, nameById);
                  const primary = blog.primaryCategoryId
                    ? String(blog.primaryCategoryId)
                    : null;
                  return (
                    <tr
                      key={blog._id}
                      className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {blog.title}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {cats.length === 0 ? (
                            <span className="text-xs text-neutral-400 dark:text-neutral-500">
                              —
                            </span>
                          ) : (
                            cats.map((label, i) => {
                              const idList = blog.categoryIds?.length
                                ? blog.categoryIds
                                : blog.categoryId
                                  ? [String(blog.categoryId)]
                                  : [];
                              const id = idList[i];
                              const isPrimary = primary && id === primary;
                              return (
                                <span
                                  key={`${blog._id}-cat-${id ?? i}`}
                                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                    isPrimary
                                      ? "bg-brand-100 text-brand-800 dark:bg-brand-950/70 dark:text-brand-300"
                                      : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                                  }`}
                                  title={isPrimary ? "Primary category" : undefined}
                                >
                                  {label}
                                  {isPrimary ? " · primary" : ""}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {blog.tags?.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400">
                        {blog.updatedAt
                          ? new Date(blog.updatedAt).toLocaleDateString()
                          : blog.createdAt
                            ? new Date(blog.createdAt).toLocaleDateString()
                            : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/blogs/new?id=${blog._id}`}
                            className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-brand-600 dark:hover:bg-neutral-800 dark:hover:text-brand-400"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(blog._id)}
                            className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
