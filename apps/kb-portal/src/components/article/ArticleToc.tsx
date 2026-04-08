"use client";

import { useScrollSpy } from "@/hooks/useScrollSpy";
import type { TableOfContentsEntry } from "@/types/api";

interface ArticleTocProps {
  sections: TableOfContentsEntry[];
}

export default function ArticleToc({ sections }: ArticleTocProps) {
  const ids = sections.map((s) => s.slug);
  const activeId = useScrollSpy(ids);

  if (sections.length === 0) return null;

  return (
    <nav
      aria-label="Table of contents"
      className="sticky top-24 hidden max-h-[calc(100vh-8rem)] overflow-y-auto xl:block"
    >
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        On this page
      </h4>
      <ul className="space-y-1 border-l border-neutral-200 dark:border-neutral-700">
        {sections.map((section) => {
          const isActive = activeId === section.slug;
          const indent = section.level >= 3 ? "pl-6" : "pl-3";
          return (
            <li key={section.id || section.slug}>
              <a
                href={`#${section.slug}`}
                className={`block border-l-2 py-1 text-sm transition-colors ${indent} ${
                  isActive
                    ? "-ml-px border-brand-500 font-medium text-brand-700 dark:text-brand-400"
                    : "-ml-px border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
              >
                {section.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
