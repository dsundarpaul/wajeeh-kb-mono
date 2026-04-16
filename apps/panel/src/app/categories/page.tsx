"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  createCategory,
  deleteCategory,
  fetchCategoryTree,
  fetchCategoriesFlat,
  flattenCategoryTree,
  patchCategory,
  translateCategoryFields,
  type KnowledgeCategoryRow,
} from "@/lib/kb/kb-api";
import type {
  KnowledgeCategoryLocales,
  KnowledgeCategoryTreeNode,
} from "@/lib/kb/types";
import { slugifySegment } from "@/lib/kb/article-helpers";
import {
  ArrowLeft,
  FolderTree,
  Languages,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type FormMode = "idle" | "create" | "edit";

export default function CategoriesPage() {
  const [tree, setTree] = useState<KnowledgeCategoryTreeNode[]>([]);
  const [flat, setFlat] = useState<KnowledgeCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<FormMode>("idle");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [order, setOrder] = useState(0);
  const [description, setDescription] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [descAr, setDescAr] = useState("");
  const [nameUr, setNameUr] = useState("");
  const [descUr, setDescUr] = useState("");
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, f] = await Promise.all([fetchCategoryTree(), fetchCategoriesFlat()]);
      setTree(t);
      setFlat(f);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const indentedRows = useMemo(() => flattenCategoryTree(tree), [tree]);

  const parentOptions = useMemo(() => {
    const opts = [{ id: "", label: "— Root —", depth: -1 }];
    for (const row of indentedRows) {
      if (formMode === "edit" && editingId && isDescendant(editingId, row.id, flat)) {
        continue;
      }
      const pad = "— ".repeat(Math.max(0, row.depth)) + row.name;
      opts.push({ id: row.id, label: pad, depth: row.depth });
    }
    return opts;
  }, [indentedRows, flat, formMode, editingId]);

  const resetForm = () => {
    setFormMode("idle");
    setEditingId(null);
    setName("");
    setSlug("");
    setParentId("");
    setOrder(0);
    setDescription("");
    setNameAr("");
    setDescAr("");
    setNameUr("");
    setDescUr("");
  };

  const openCreate = () => {
    resetForm();
    setFormMode("create");
  };

  const openEdit = (row: KnowledgeCategoryRow) => {
    setFormMode("edit");
    setEditingId(row._id);
    setName(row.name);
    setSlug(row.slug);
    setParentId(row.parentId ?? "");
    setOrder(row.order ?? 0);
    setDescription(row.description ?? "");
    setNameAr(row.locales?.ar?.name ?? "");
    setDescAr(row.locales?.ar?.description ?? "");
    setNameUr(row.locales?.ur?.name ?? "");
    setDescUr(row.locales?.ur?.description ?? "");
  };

  const onNameBlur = () => {
    if (formMode === "create" && !slug.trim() && name.trim()) {
      setSlug(slugifySegment(name));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error("Name and slug are required");
      return;
    }
    setSaving(true);
    try {
      const locales = buildLocalesPayload(nameAr, descAr, nameUr, descUr);
      if (formMode === "create") {
        await createCategory({
          name: name.trim(),
          slug: slugifySegment(slug.trim()),
          parentId: parentId || null,
          order,
          description: description.trim() || undefined,
          locales,
        });
        toast.success("Category created");
      } else if (formMode === "edit" && editingId) {
        await patchCategory(editingId, {
          name: name.trim(),
          slug: slugifySegment(slug.trim()),
          parentId: parentId || null,
          order,
          description: description.trim() || undefined,
          locales,
        });
        toast.success("Category updated");
      }
      resetForm();
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleTranslateLocales = async () => {
    const n = name.trim();
    const d = description.trim();
    if (!n && !d) {
      toast.error("Enter English name or description first");
      return;
    }
    setTranslating(true);
    try {
      const { locales } = await translateCategoryFields({
        name: n || undefined,
        description: d || undefined,
        targets: ["ar", "ur"],
      });
      if (locales.ar?.name != null) setNameAr(locales.ar.name);
      if (locales.ar?.description != null) setDescAr(locales.ar.description);
      if (locales.ur?.name != null) setNameUr(locales.ur.name);
      if (locales.ur?.description != null) setDescUr(locales.ur.description);
      toast.success("Arabic and Urdu fields updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setTranslating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category? It must have no subcategories and no articles.")) return;
    try {
      await deleteCategory(id);
      toast.success("Deleted");
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Link
          href="/blogs"
          className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          <ArrowLeft size={14} />
          Back to articles
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Categories
            </h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Nested folders for organizing knowledge articles. Articles can belong to several categories.
            </p>
          </div>
          <button type="button" onClick={openCreate} className="btn-primary">
            <Plus size={16} />
            New category
          </button>
        </div>
      </div>

      <Drawer
        open={formMode !== "idle"}
        onOpenChange={(open) => {
          if (!open) resetForm();
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {formMode === "create" ? "Create category" : "Edit category"}
            </DrawerTitle>
            <DrawerDescription>
              Name, slug, parent folder, and display order.
            </DrawerDescription>
          </DrawerHeader>
          <form
            id="category-form"
            onSubmit={handleSubmit}
            className="grid max-h-[60vh] gap-4 overflow-y-auto px-4 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <label htmlFor="cat-name" className="label">
                Name
              </label>
              <input
                id="cat-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={onNameBlur}
                required
              />
            </div>
            <div>
              <label htmlFor="cat-slug" className="label">
                Slug
              </label>
              <input
                id="cat-slug"
                className="input"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="cat-order" className="label">
                Order
              </label>
              <input
                id="cat-order"
                type="number"
                className="input"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value) || 0)}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="cat-parent" className="label">
                Parent
              </label>
              <select
                id="cat-parent"
                className="input"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
              >
                {parentOptions.map((o) => (
                  <option key={o.id || "root"} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="cat-desc" className="label">
                Description
              </label>
              <textarea
                id="cat-desc"
                className="input min-h-[80px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="sm:col-span-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  KB portal translations (optional)
                </p>
                <button
                  type="button"
                  className="btn-secondary inline-flex shrink-0 items-center gap-1.5 text-sm"
                  disabled={
                    translating || (!name.trim() && !description.trim())
                  }
                  onClick={() => void handleTranslateLocales()}
                >
                  <Languages size={16} aria-hidden />
                  {translating
                    ? "Translating…"
                    : "Translate from English (AR & Urdu)"}
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="cat-name-ar" className="label">
                    Arabic name
                  </label>
                  <input
                    id="cat-name-ar"
                    className="input"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    dir="rtl"
                  />
                </div>
                <div>
                  <label htmlFor="cat-name-ur" className="label">
                    Urdu name
                  </label>
                  <input
                    id="cat-name-ur"
                    className="input"
                    value={nameUr}
                    onChange={(e) => setNameUr(e.target.value)}
                    dir="rtl"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="cat-desc-ar" className="label">
                    Arabic description
                  </label>
                  <textarea
                    id="cat-desc-ar"
                    className="input min-h-[60px]"
                    value={descAr}
                    onChange={(e) => setDescAr(e.target.value)}
                    dir="rtl"
                    rows={2}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="cat-desc-ur" className="label">
                    Urdu description
                  </label>
                  <textarea
                    id="cat-desc-ur"
                    className="input min-h-[60px]"
                    value={descUr}
                    onChange={(e) => setDescUr(e.target.value)}
                    dir="rtl"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </form>
          <DrawerFooter className="flex-row justify-end border-t-0">
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Cancel
            </button>
            <button
              type="submit"
              form="category-form"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : flat.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <FolderTree size={40} className="text-neutral-300 mb-3" />
          <p className="font-medium text-neutral-700 dark:text-neutral-200">
            No categories yet
          </p>
          <p className="mt-1 mb-4 text-sm text-neutral-500 dark:text-neutral-400">
            Create a root category to start organizing articles.
          </p>
          <button type="button" onClick={openCreate} className="btn-primary">
            <Plus size={16} />
            Create category
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/80">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Slug
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {indentedRows.map((row) => {
                const full = flat.find((c) => c._id === row.id);
                return (
                <tr key={row.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                  <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                    <span style={{ paddingLeft: `${row.depth * 16}px` }} className="inline-block">
                      {row.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400">
                    {full?.slug ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="mr-1 inline-flex rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-brand-600 dark:hover:bg-neutral-800 dark:hover:text-brand-400"
                      title="Edit"
                      onClick={() => {
                        if (full) openEdit(full);
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="inline-flex rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      title="Delete"
                      onClick={() => handleDelete(row.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}

function buildLocalesPayload(
  nameAr: string,
  descAr: string,
  nameUr: string,
  descUr: string,
): KnowledgeCategoryLocales | undefined {
  const ar: { name?: string; description?: string } = {};
  if (nameAr.trim()) ar.name = nameAr.trim();
  if (descAr.trim()) ar.description = descAr.trim();
  const ur: { name?: string; description?: string } = {};
  if (nameUr.trim()) ur.name = nameUr.trim();
  if (descUr.trim()) ur.description = descUr.trim();
  const locales: KnowledgeCategoryLocales = {};
  if (Object.keys(ar).length) locales.ar = ar;
  if (Object.keys(ur).length) locales.ur = ur;
  if (!locales.ar && !locales.ur) return undefined;
  return locales;
}

function isDescendant(
  ancestorId: string,
  candidateParentId: string,
  flat: KnowledgeCategoryRow[],
): boolean {
  if (candidateParentId === ancestorId) return true;
  const cat = flat.find((c) => c._id === candidateParentId);
  if (!cat?.parentId) return false;
  return isDescendant(ancestorId, cat.parentId, flat);
}
