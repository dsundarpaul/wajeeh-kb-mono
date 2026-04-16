"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import type { KnowledgeCategoryTreeNode } from "@/types/api";
import type { PortalMessages } from "@/lib/portal-messages";

interface SidebarProps {
  tree: KnowledgeCategoryTreeNode[];
  messages: PortalMessages;
  open: boolean;
  onClose: () => void;
}

function SidebarItem({
  node,
  basePath,
  depth,
  currentPath,
  messages,
}: {
  node: KnowledgeCategoryTreeNode;
  basePath: string;
  depth: number;
  currentPath: string;
  messages: PortalMessages;
}) {
  const fullPath = basePath ? `${basePath}/${node.slug}` : `/${node.slug}`;
  const isActive = currentPath === fullPath;
  const isParentOfActive = currentPath.startsWith(fullPath + "/");
  const [expanded, setExpanded] = useState(isActive || isParentOfActive);
  const count = node.articleCount;

  useEffect(() => {
    if (isActive || isParentOfActive) {
      setExpanded(true);
    }
  }, [isActive, isParentOfActive]);

  const toggleExpand = useCallback(
    (e: React.MouseEvent) => {
      if (node.children.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        setExpanded((prev) => !prev);
      }
    },
    [node.children.length],
  );

  return (
    <li>
      <div className="flex items-center">
        {node.children.length > 0 && (
          <button
            type="button"
            onClick={toggleExpand}
            className="me-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
            aria-label={expanded ? messages.navCollapse : messages.navExpand}
          >
            <ChevronRight
              className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
            />
          </button>
        )}
        {node.children.length === 0 && <span className="me-0.5 w-6" />}
        <Link
          href={fullPath}
          className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
            isActive
              ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
              : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          }`}
        >
          <span className="truncate">{node.name}</span>
          {count !== undefined && count > 0 && (
            <span className="shrink-0 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              {count}
            </span>
          )}
        </Link>
      </div>
      {expanded && node.children.length > 0 && (
        <ul className="ms-3 mt-0.5 border-s border-neutral-200 ps-2 dark:border-neutral-700">
          {node.children.map((child) => (
            <SidebarItem
              key={child._id}
              node={child}
              basePath={fullPath}
              depth={depth + 1}
              currentPath={currentPath}
              messages={messages}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Sidebar({ tree, messages, open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed start-0 top-16 z-30 h-[calc(100vh-4rem)] w-72 overflow-y-auto border-e border-neutral-200 bg-white p-4 transition-transform duration-300 ease-in-out lg:sticky lg:translate-x-0 dark:border-neutral-800 dark:bg-neutral-950 ${
          open
            ? "translate-x-0"
            : "-translate-x-full rtl:translate-x-full"
        }`}
      >
        <nav aria-label={messages.navCategoriesAria}>
          <ul className="space-y-0.5">
            {tree.map((node) => (
              <SidebarItem
                key={node._id}
                node={node}
                basePath=""
                depth={0}
                currentPath={pathname}
                messages={messages}
              />
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
