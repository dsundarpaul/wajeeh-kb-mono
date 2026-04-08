import Link from "next/link";
import { FolderOpen, ChevronRight } from "lucide-react";
import type { KnowledgeCategoryTreeNode } from "@/types/api";

interface CategoryCardProps {
  category: KnowledgeCategoryTreeNode;
  href: string;
  articleCount?: number;
}

export default function CategoryCard({
  category,
  href,
  articleCount,
}: CategoryCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-neutral-200 bg-white p-6 transition-all duration-200 hover:border-brand-200 hover:shadow-md hover:shadow-brand-500/5 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-brand-800"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-400">
        <FolderOpen className="h-5 w-5" />
      </div>
      <h3 className="mb-1 text-base font-semibold text-neutral-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-400">
        {category.name}
      </h3>
      {category.description && (
        <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
          {category.description}
        </p>
      )}
      <div className="mt-auto flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500">
        {articleCount !== undefined && (
          <span>
            {articleCount} {articleCount === 1 ? "article" : "articles"}
          </span>
        )}
        {category.children.length > 0 && (
          <span>
            {category.children.length} subcategor
            {category.children.length === 1 ? "y" : "ies"}
          </span>
        )}
        <ChevronRight className="ml-auto h-4 w-4 text-neutral-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-500 dark:text-neutral-600" />
      </div>
    </Link>
  );
}
