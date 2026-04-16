import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeLabel: string;
}

export default function Breadcrumb({ items, homeLabel }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
        <li>
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <Home className="h-3.5 w-3.5" />
            <span>{homeLabel}</span>
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={item.href} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-neutral-300 rtl:rotate-180 dark:text-neutral-600" />
            {i === items.length - 1 ? (
              <span className="rounded px-1.5 py-0.5 font-medium text-neutral-900 dark:text-white">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="rounded px-1.5 py-0.5 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
