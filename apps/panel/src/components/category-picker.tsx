"use client";

import { useCallback, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { KnowledgeCategoryTreeNode } from "@/lib/kb/types";

type CategoryPickerProps = {
  tree: KnowledgeCategoryTreeNode[];
  selectedIds: string[];
  primaryCategoryId: string | null;
  onSelectedChange: (ids: string[]) => void;
  onPrimaryChange: (id: string | null) => void;
  disabled?: boolean;
};

function CategoryTreeRows({
  nodes,
  depth,
  expanded,
  toggleExpand,
  selectedIds,
  toggleSelect,
  disabled,
}: {
  nodes: KnowledgeCategoryTreeNode[];
  depth: number;
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  selectedIds: string[];
  toggleSelect: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      {nodes.map((node) => {
        const children = node.children ?? [];
        const hasChildren = children.length > 0;
        const isExpanded = expanded.has(node._id);
        return (
          <div key={node._id}>
            <div
              className="flex items-center gap-1 rounded-md py-0.5 pr-2 hover:bg-white dark:hover:bg-neutral-800/80"
              style={{ paddingLeft: `${8 + depth * 16}px` }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleExpand(node._id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-neutral-500 hover:bg-neutral-200/80 dark:text-neutral-400 dark:hover:bg-neutral-700"
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  <ChevronRight
                    size={16}
                    className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  />
                </button>
              ) : (
                <span className="inline-block w-7 shrink-0" />
              )}
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500 dark:border-neutral-600"
                  checked={selectedIds.includes(node._id)}
                  onChange={() => toggleSelect(node._id)}
                  disabled={disabled}
                />
                <span className="truncate text-neutral-800 dark:text-neutral-200">
                  {node.name}
                </span>
              </label>
            </div>
            {hasChildren && isExpanded ? (
              <CategoryTreeRows
                nodes={children}
                depth={depth + 1}
                expanded={expanded}
                toggleExpand={toggleExpand}
                selectedIds={selectedIds}
                toggleSelect={toggleSelect}
                disabled={disabled}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function CategoryPicker({
  tree,
  selectedIds,
  primaryCategoryId,
  onSelectedChange,
  onPrimaryChange,
  disabled,
}: CategoryPickerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelect = useCallback(
    (id: string) => {
      if (disabled) return;
      const set = new Set(selectedIds);
      if (set.has(id)) {
        set.delete(id);
        const next = [...set];
        onSelectedChange(next);
        if (primaryCategoryId === id) {
          onPrimaryChange(next[0] ?? null);
        }
      } else {
        const next = [...selectedIds, id];
        onSelectedChange(next);
        if (!primaryCategoryId || !next.includes(primaryCategoryId)) {
          onPrimaryChange(next[0] ?? null);
        }
      }
    },
    [
      disabled,
      selectedIds,
      primaryCategoryId,
      onSelectedChange,
      onPrimaryChange,
    ],
  );

  const rowsForPrimary = useCallback(
    (nodes: KnowledgeCategoryTreeNode[]): { id: string; name: string }[] => {
      const out: { id: string; name: string }[] = [];
      for (const n of nodes) {
        out.push({ id: n._id, name: n.name });
        if (n.children?.length) {
          out.push(...rowsForPrimary(n.children));
        }
      }
      return out;
    },
    [],
  );

  const labelById = new Map(rowsForPrimary(tree).map((r) => [r.id, r.name]));

  return (
    <div className="space-y-4">
      <div>
        <p className="label mb-2">Categories</p>
        <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
          Expand folders to choose categories. One primary category drives
          breadcrumbs.
        </p>
        <div className="max-h-60 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-neutral-900/50">
          {tree.length === 0 ? (
            <p className="p-2 text-sm text-neutral-500 dark:text-neutral-400">
              No categories yet. Create some under Categories.
            </p>
          ) : (
            <CategoryTreeRows
              nodes={tree}
              depth={0}
              expanded={expanded}
              toggleExpand={toggleExpand}
              selectedIds={selectedIds}
              toggleSelect={toggleSelect}
              disabled={disabled}
            />
          )}
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div>
          <label htmlFor="primary-category" className="label">
            Primary category
          </label>
          <select
            id="primary-category"
            className="input"
            value={primaryCategoryId ?? ""}
            onChange={(e) => onPrimaryChange(e.target.value || null)}
            disabled={disabled}
          >
            {selectedIds.map((id) => (
              <option key={id} value={id}>
                {labelById.get(id) ?? id}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
