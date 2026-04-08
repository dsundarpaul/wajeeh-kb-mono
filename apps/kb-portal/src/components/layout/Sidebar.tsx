"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import type { KnowledgeCategoryTreeNode } from "@/types/api";

interface SidebarProps {
  tree: KnowledgeCategoryTreeNode[];
  open: boolean;
  onClose: () => void;
}

function buildCategoryPath(
  nodes: KnowledgeCategoryTreeNode[],
  parentPath = "",
): { node: KnowledgeCategoryTreeNode; path: string }[] {
  const result: { node: KnowledgeCategoryTreeNode; path: string }[] = [];
  for (const n of nodes) {
    const path = parentPath ? `${parentPath}/${n.slug}` : `/${n.slug}`;
    result.push({ node: n, path });
    if (n.children.length > 0) {
      result.push(...buildCategoryPath(n.children, path));
    }
  }
  return result;
}

function SidebarItem({
  node,
  basePath,
  depth,
  currentPath,
}: {
  node: KnowledgeCategoryTreeNode;
  basePath: string;
  depth: number;
  currentPath: string;
}) {
  const fullPath = basePath ? `${basePath}/${node.slug}` : `/${node.slug}`;
  const isActive = currentPath === fullPath;
  const isParentOfActive = currentPath.startsWith(fullPath + "/");
  const [expanded, setExpanded] = useState(isActive || isParentOfActive);

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
            className="mr-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <ChevronRight
              className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
            />
          </button>
        )}
        {node.children.length === 0 && <span className="mr-0.5 w-6" />}
        <Link
          href={fullPath}
          className={`flex-1 rounded-md px-2 py-1.5 text-sm transition-colors ${
            isActive
              ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
              : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          }`}
        >
          {node.name}
        </Link>
      </div>
      {expanded && node.children.length > 0 && (
        <ul className="ml-3 mt-0.5 border-l border-neutral-200 pl-2 dark:border-neutral-700">
          {node.children.map((child) => (
            <SidebarItem
              key={child._id}
              node={child}
              basePath={fullPath}
              depth={depth + 1}
              currentPath={currentPath}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Sidebar({ tree, open, onClose }: SidebarProps) {
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
        className={`fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] w-72 overflow-y-auto border-r border-neutral-200 bg-white p-4 transition-transform duration-300 ease-in-out lg:sticky lg:translate-x-0 dark:border-neutral-800 dark:bg-neutral-950 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav aria-label="Category navigation">
          <ul className="space-y-0.5">
            {tree.map((node) => (
              <SidebarItem
                key={node._id}
                node={node}
                basePath=""
                depth={0}
                currentPath={pathname}
              />
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
