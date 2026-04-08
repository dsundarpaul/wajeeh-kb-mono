"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import { RichTextEditor } from "@/components/rich-text-editor";
import { ArticlePreview } from "@/components/article-preview";
import { CategoryPicker } from "@/components/category-picker";
import {
  createKnowledgeChunk,
  fetchCategoryTree,
  fetchKnowledgeChunk,
  isImageAlreadyHosted,
  patchKnowledgeChunk,
  resolveMediaPublicUrl,
  uploadImage,
  uploadImageFromUrl,
} from "@/lib/kb/kb-api";
import {
  buildMediaArray,
  draftArticleUrl,
  extractMediaFromHtml,
  replaceImageSrcsInHtml,
  sectionsFromHeadingsHtml,
} from "@/lib/kb/article-helpers";
import type {
  KnowledgeCategoryTreeNode,
  KnowledgeChunkSeo,
} from "@/lib/kb/types";
import { ArrowLeft, Eye, FileEdit, Save } from "lucide-react";
import toast from "react-hot-toast";

function parseTagInput(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function resolvePlacementIds(chunk: {
  categoryIds?: string[];
  categoryId?: string | null;
}): string[] {
  const fromMulti = chunk.categoryIds?.filter(Boolean) ?? [];
  if (fromMulti.length > 0) return fromMulti;
  if (chunk.categoryId) return [String(chunk.categoryId)];
  return [];
}

function buildSeoPayload(
  metaTitle: string,
  metaDescription: string,
  ogImageUrl: string,
  keywords: string,
): KnowledgeChunkSeo | undefined {
  const t = metaTitle.trim();
  const d = metaDescription.trim();
  const o = ogImageUrl.trim();
  const k = keywords.trim();
  if (!t && !d && !o && !k) {
    return undefined;
  }
  return {
    metaTitle: t || undefined,
    metaDescription: d || undefined,
    ogImageUrl: o || undefined,
    keywords: k || undefined,
  };
}

function ArticleEditorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const isEditing = !!editId;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [categoryTree, setCategoryTree] = useState<KnowledgeCategoryTreeNode[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [primaryCategoryId, setPrimaryCategoryId] = useState<string | null>(null);
  const [canonicalUrl, setCanonicalUrl] = useState<string | null>(null);
  const [seoMetaTitle, setSeoMetaTitle] = useState("");
  const [seoMetaDescription, setSeoMetaDescription] = useState("");
  const [seoOgImageUrl, setSeoOgImageUrl] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  const tags = useMemo(() => parseTagInput(tagsInput), [tagsInput]);

  const loadCategories = useCallback(async () => {
    try {
      const tree = await fetchCategoryTree();
      setCategoryTree(tree);
    } catch {
      toast.error("Failed to load categories");
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (!editId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchKnowledgeChunk(editId)
      .then((chunk) => {
        if (cancelled) return;
        setTitle(chunk.title);
        setContent(chunk.content ?? "");
        setTagsInput(chunk.tags?.join(", ") ?? "");
        setCanonicalUrl(chunk.url);
        const ids = resolvePlacementIds(chunk);
        setSelectedCategoryIds(ids);
        setPrimaryCategoryId(
          chunk.primaryCategoryId
            ? String(chunk.primaryCategoryId)
            : ids[0] ?? null,
        );
        const s = chunk.seo;
        setSeoMetaTitle(s?.metaTitle ?? "");
        setSeoMetaDescription(s?.metaDescription ?? "");
        setSeoOgImageUrl(s?.ogImageUrl ?? "");
        setSeoKeywords(s?.keywords ?? "");
      })
      .catch(() => {
        toast.error("Failed to load article");
        router.push("/blogs");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setSaving(true);
    try {
      const { images, youtubeIds } = extractMediaFromHtml(content);

      const srcMap = new Map<string, string>();
      const uploadedImages: { url: string; alt: string }[] = [];

      for (const img of images) {
        if (isImageAlreadyHosted(img.src)) {
          uploadedImages.push({ url: img.src, alt: img.alt });
          continue;
        }
        try {
          let result: { url: string };
          if (img.src.startsWith("blob:")) {
            const res = await fetch(img.src);
            const blob = await res.blob();
            const file = new File([blob], "upload.png", { type: blob.type });
            result = await uploadImage(file);
          } else {
            result = await uploadImageFromUrl(img.src);
          }
          const hostedUrl = resolveMediaPublicUrl(result);
          srcMap.set(img.src, hostedUrl);
          uploadedImages.push({ url: hostedUrl, alt: img.alt });
        } catch {
          uploadedImages.push({ url: img.src, alt: img.alt });
        }
      }

      const finalContent = replaceImageSrcsInHtml(content, srcMap);
      const media = buildMediaArray(uploadedImages, youtubeIds);

      const sections = sectionsFromHeadingsHtml(finalContent);
      const tagList = parseTagInput(tagsInput);
      const placement =
        selectedCategoryIds.length > 0
          ? {
              categoryIds: selectedCategoryIds,
              primaryCategoryId:
                primaryCategoryId ?? selectedCategoryIds[0],
            }
          : {};

      const seo = buildSeoPayload(
        seoMetaTitle,
        seoMetaDescription,
        seoOgImageUrl,
        seoKeywords,
      );

      if (isEditing && editId) {
        await patchKnowledgeChunk(editId, {
          title: title.trim(),
          content: finalContent,
          tags: tagList,
          type: "blog",
          sections,
          media,
          ...(seo ? { seo } : {}),
          ...placement,
        });
        toast.success("Article updated");
      } else {
        await createKnowledgeChunk({
          title: title.trim(),
          url: draftArticleUrl(),
          content: finalContent,
          tags: tagList,
          type: "blog",
          sections,
          media,
          ...(seo ? { seo } : {}),
          ...placement,
        });
        toast.success("Article created");
      }

      if (srcMap.size > 0) setContent(finalContent);
      router.push("/blogs");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {canonicalUrl && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Canonical URL (for RAG deduplication):{" "}
          <span className="font-mono text-neutral-600 dark:text-neutral-300">
            {canonicalUrl}
          </span>
        </p>
      )}

      <div className="flex gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-900/50">
        <button
          type="button"
          onClick={() => setTab("edit")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${
            tab === "edit"
              ? "bg-white text-brand-700 shadow-sm dark:bg-neutral-950 dark:text-brand-300"
              : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          }`}
        >
          <FileEdit size={16} />
          Write
        </button>
        <button
          type="button"
          onClick={() => setTab("preview")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${
            tab === "preview"
              ? "bg-white text-brand-700 shadow-sm dark:bg-neutral-950 dark:text-brand-300"
              : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          }`}
        >
          <Eye size={16} />
          Reader preview
        </button>
      </div>

      {tab === "edit" ? (
        <>
          <div>
            <label htmlFor="title" className="label">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title"
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">Content</label>
            <RichTextEditor
              key={editId ?? "new"}
              content={content}
              onChange={setContent}
              placeholder="Sections, headings, images (URL), and YouTube embeds…"
            />
          </div>

          <div>
            <label htmlFor="tags" className="label">
              Tags
            </label>
            <input
              id="tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="billing, faq, onboarding"
              className="input"
            />
            <p className="mt-1 text-xs text-neutral-400">Separate with commas</p>
          </div>

          <CategoryPicker
            tree={categoryTree}
            selectedIds={selectedCategoryIds}
            primaryCategoryId={primaryCategoryId}
            onSelectedChange={setSelectedCategoryIds}
            onPrimaryChange={setPrimaryCategoryId}
            disabled={saving}
          />

          <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
            <p className="label mb-1">SEO</p>
            <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
              Optional fields for search and social previews. Canonical URL is
              set automatically for new articles.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="seo-title" className="label">
                  Meta title
                </label>
                <input
                  id="seo-title"
                  type="text"
                  value={seoMetaTitle}
                  onChange={(e) => setSeoMetaTitle(e.target.value)}
                  placeholder="Shown in browser tab and search results when set"
                  className="input"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="seo-desc" className="label">
                  Meta description
                </label>
                <textarea
                  id="seo-desc"
                  value={seoMetaDescription}
                  onChange={(e) => setSeoMetaDescription(e.target.value)}
                  placeholder="Short summary for search results"
                  rows={3}
                  className="input resize-y"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="seo-og" className="label">
                  Open Graph image URL
                </label>
                <input
                  id="seo-og"
                  type="url"
                  value={seoOgImageUrl}
                  onChange={(e) => setSeoOgImageUrl(e.target.value)}
                  placeholder="https://…"
                  className="input"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="seo-kw" className="label">
                  Keywords
                </label>
                <input
                  id="seo-kw"
                  type="text"
                  value={seoKeywords}
                  onChange={(e) => setSeoKeywords(e.target.value)}
                  placeholder="Comma-separated"
                  className="input"
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        <ArticlePreview title={title} html={content} tags={tags} />
      )}

      <div className="flex items-center justify-end gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
        <Link href="/blogs" className="btn-secondary">
          Cancel
        </Link>
        <button type="submit" disabled={saving} className="btn-primary">
          <Save size={16} />
          {saving ? "Saving…" : isEditing ? "Update article" : "Publish article"}
        </button>
      </div>
    </form>
  );
}

export default function NewBlogPage() {
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
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Article editor
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Rich content, categories, and tags — stored as knowledge chunks for the KB and RAG.
        </p>
      </div>

      <div className="card p-6">
        <Suspense
          fallback={
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
            </div>
          }
        >
          <ArticleEditorForm />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
