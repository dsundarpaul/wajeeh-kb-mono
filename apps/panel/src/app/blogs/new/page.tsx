"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import { RichTextEditor } from "@/components/rich-text-editor";
import { ArticlePreview } from "@/components/article-preview";
import { CategoryPicker } from "@/components/category-picker";
import {
  createKnowledgeChunk,
  fetchCategoryTree,
  fetchKnowledgeChunkAdmin,
  isImageAlreadyHosted,
  patchKnowledgeChunk,
  resolveMediaPublicUrl,
  translateKnowledgeChunk,
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
import { slugify } from "@/lib/utils/slugify";
import {
  ARTICLE_LOCALES,
  type ArticleLocaleCode,
} from "@/lib/kb/locales";
import type {
  KnowledgeCategoryTreeNode,
  KnowledgeChunk,
  KnowledgeChunkLocaleVariant,
  KnowledgeChunkSeo,
} from "@/lib/kb/types";
import { ArrowLeft, Eye, FileEdit, Languages, Save } from "lucide-react";
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

type LocalFormFields = {
  title: string;
  content: string;
  seoMetaTitle: string;
  seoMetaDescription: string;
  seoOgImageUrl: string;
  seoKeywords: string;
};

function emptyLocalForm(): LocalFormFields {
  return {
    title: "",
    content: "",
    seoMetaTitle: "",
    seoMetaDescription: "",
    seoOgImageUrl: "",
    seoKeywords: "",
  };
}

function variantToLocal(v?: KnowledgeChunkLocaleVariant): LocalFormFields {
  const s = v?.seo;
  return {
    title: v?.title ?? "",
    content: v?.content ?? "",
    seoMetaTitle: s?.metaTitle ?? "",
    seoMetaDescription: s?.metaDescription ?? "",
    seoOgImageUrl: s?.ogImageUrl ?? "",
    seoKeywords: s?.keywords ?? "",
  };
}

function chunkEnglishToLocal(chunk: KnowledgeChunk): LocalFormFields {
  const s = chunk.seo;
  return {
    title: chunk.title ?? "",
    content: chunk.content ?? "",
    seoMetaTitle: s?.metaTitle ?? "",
    seoMetaDescription: s?.metaDescription ?? "",
    seoOgImageUrl: s?.ogImageUrl ?? "",
    seoKeywords: s?.keywords ?? "",
  };
}

function ArticleEditorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const isEditing = !!editId;

  const [editorLocale, setEditorLocale] = useState<ArticleLocaleCode>("en");
  const [snapshots, setSnapshots] = useState<
    Record<ArticleLocaleCode, LocalFormFields>
  >({
    en: emptyLocalForm(),
    ar: emptyLocalForm(),
    ur: emptyLocalForm(),
  });
  const snapshotsRef = useRef(snapshots);
  snapshotsRef.current = snapshots;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [categoryTree, setCategoryTree] = useState<KnowledgeCategoryTreeNode[]>(
    [],
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [primaryCategoryId, setPrimaryCategoryId] = useState<string | null>(
    null,
  );
  const [canonicalUrl, setCanonicalUrl] = useState<string | null>(null);
  const [seoMetaTitle, setSeoMetaTitle] = useState("");
  const [seoMetaDescription, setSeoMetaDescription] = useState("");
  const [seoOgImageUrl, setSeoOgImageUrl] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [loading, setLoading] = useState(!!editId);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [slugInput, setSlugInput] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const tags = useMemo(() => parseTagInput(tagsInput), [tagsInput]);

  const readForm = useCallback((): LocalFormFields => {
    return {
      title,
      content,
      seoMetaTitle,
      seoMetaDescription,
      seoOgImageUrl,
      seoKeywords,
    };
  }, [
    title,
    content,
    seoMetaTitle,
    seoMetaDescription,
    seoOgImageUrl,
    seoKeywords,
  ]);

  const applyForm = useCallback((f: LocalFormFields) => {
    setTitle(f.title);
    setContent(f.content);
    setSeoMetaTitle(f.seoMetaTitle);
    setSeoMetaDescription(f.seoMetaDescription);
    setSeoOgImageUrl(f.seoOgImageUrl);
    setSeoKeywords(f.seoKeywords);
  }, []);

  const goLocale = useCallback(
    (next: ArticleLocaleCode) => {
      if (next === editorLocale) return;
      const merged: Record<ArticleLocaleCode, LocalFormFields> = {
        ...snapshotsRef.current,
        [editorLocale]: readForm(),
      };
      snapshotsRef.current = merged;
      setSnapshots(merged);
      setEditorLocale(next);
      applyForm(merged[next]);
    },
    [editorLocale, readForm, applyForm],
  );

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
    if (editorLocale !== "en" || isEditing || slugTouched) return;
    setSlugInput(slugify(title));
  }, [title, isEditing, slugTouched, editorLocale]);

  useEffect(() => {
    if (!editId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchKnowledgeChunkAdmin(editId)
      .then((chunk) => {
        if (cancelled) return;
        const en = chunkEnglishToLocal(chunk);
        const ar = variantToLocal(chunk.locales?.ar);
        const ur = variantToLocal(chunk.locales?.ur);
        const loaded = { en, ar, ur };
        snapshotsRef.current = loaded;
        setSnapshots(loaded);
        setEditorLocale("en");
        applyForm(en);
        setTagsInput(chunk.tags?.join(", ") ?? "");
        setCanonicalUrl(chunk.url);
        const ids = resolvePlacementIds(chunk);
        setSelectedCategoryIds(ids);
        setPrimaryCategoryId(
          chunk.primaryCategoryId
            ? String(chunk.primaryCategoryId)
            : ids[0] ?? null,
        );
        setSlugInput(
          (chunk.slug && chunk.slug.trim()) || slugify(chunk.title ?? ""),
        );
        setSlugTouched(true);
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
  }, [editId, router, applyForm]);

  const runTranslate = async () => {
    if (!editId) return;
    const merged = {
      ...snapshotsRef.current,
      en: readForm(),
    };
    snapshotsRef.current = merged;
    setSnapshots(merged);
    setTranslating(true);
    try {
      const data = await translateKnowledgeChunk(editId, ["ar", "ur"]);
      const next: Record<ArticleLocaleCode, LocalFormFields> = {
        en: chunkEnglishToLocal(data),
        ar: variantToLocal(data.locales?.ar),
        ur: variantToLocal(data.locales?.ur),
      };
      snapshotsRef.current = next;
      setSnapshots(next);
      applyForm(next[editorLocale]);
      toast.success("Arabic and Urdu translations generated — review and save each tab");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setTranslating(false);
    }
  };

  const processContentMedia = async (rawHtml: string) => {
    const { images, youtubeIds } = extractMediaFromHtml(rawHtml);
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
    const finalContent = replaceImageSrcsInHtml(rawHtml, srcMap);
    const media = buildMediaArray(uploadedImages, youtubeIds);
    return { finalContent, media, srcMap };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    const rawSlug = slugInput.trim();
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (editorLocale === "en" && rawSlug && !slugPattern.test(rawSlug)) {
      toast.error(
        "URL slug must use lowercase letters, numbers, and hyphens only",
      );
      return;
    }
    const slugForCreate = rawSlug || slugify(title);

    setSaving(true);
    try {
      const { finalContent, media, srcMap } = await processContentMedia(
        content,
      );
      const sections = sectionsFromHeadingsHtml(finalContent);
      const seo = buildSeoPayload(
        seoMetaTitle,
        seoMetaDescription,
        seoOgImageUrl,
        seoKeywords,
      );

      if (isEditing && editId) {
        if (editorLocale === "en") {
          const tagList = parseTagInput(tagsInput);
          const placement =
            selectedCategoryIds.length > 0
              ? {
                  categoryIds: selectedCategoryIds,
                  primaryCategoryId:
                    primaryCategoryId ?? selectedCategoryIds[0],
                }
              : {};
          await patchKnowledgeChunk(editId, {
            title: title.trim(),
            content: finalContent,
            tags: tagList,
            type: "blog",
            sections,
            media,
            ...(seo ? { seo } : {}),
            ...placement,
            ...(slugTouched
              ? { slug: rawSlug.length > 0 ? rawSlug : null }
              : {}),
          });
          toast.success("English article updated");
        } else {
          await patchKnowledgeChunk(
            editId,
            {
              title: title.trim(),
              content: finalContent,
              sections,
              ...(seo ? { seo } : {}),
            },
            editorLocale,
          );
          toast.success(
            editorLocale === "ar"
              ? "Arabic version saved"
              : "Urdu version saved",
          );
        }
      } else {
        if (editorLocale !== "en") {
          toast.error("Create the article in English first");
          setSaving(false);
          return;
        }
        const tagList = parseTagInput(tagsInput);
        const placement =
          selectedCategoryIds.length > 0
            ? {
                categoryIds: selectedCategoryIds,
                primaryCategoryId:
                  primaryCategoryId ?? selectedCategoryIds[0],
              }
            : {};
        const created = await createKnowledgeChunk({
          title: title.trim(),
          slug: slugForCreate,
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
        if (srcMap.size > 0) setContent(finalContent);
        router.push(`/blogs/new?id=${created._id}`);
        setSaving(false);
        return;
      }

      if (srcMap.size > 0) setContent(finalContent);
      const snapAfter = {
        ...readForm(),
        content: finalContent,
      };
      const mergedAfter = {
        ...snapshotsRef.current,
        [editorLocale]: snapAfter,
      };
      snapshotsRef.current = mergedAfter;
      setSnapshots(mergedAfter);
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

  const localeMeta = ARTICLE_LOCALES.find((l) => l.code === editorLocale)!;
  const formDir = localeMeta.dir;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      dir={tab === "edit" ? formDir : "ltr"}
    >
      {canonicalUrl && editorLocale === "en" && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Canonical URL (for RAG deduplication):{" "}
          <span className="font-mono text-neutral-600 dark:text-neutral-300">
            {canonicalUrl}
          </span>
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-900/50">
          {ARTICLE_LOCALES.map((loc) => (
            <button
              key={loc.code}
              type="button"
              onClick={() => goLocale(loc.code)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                editorLocale === loc.code
                  ? "bg-white text-brand-700 shadow-sm dark:bg-neutral-950 dark:text-brand-300"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              }`}
            >
              <span className="hidden sm:inline">{loc.label}</span>
              <span className="sm:hidden">{loc.nativeLabel}</span>
              <span className="ml-1 hidden text-xs opacity-70 sm:inline">
                ({loc.nativeLabel})
              </span>
            </button>
          ))}
        </div>
        {isEditing && editorLocale === "en" && (
          <button
            type="button"
            onClick={runTranslate}
            disabled={translating || saving}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <Languages size={16} />
            {translating ? "Translating…" : "Translate to Arabic & Urdu"}
          </button>
        )}
      </div>

      {editorLocale !== "en" && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          Editing the {localeMeta.label} version. Tags, categories, slug, and
          shared media are managed on the English tab. Save this tab to store
          this translation.
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

          {editorLocale === "en" && (
            <div>
              <label htmlFor="article-slug" className="label">
                URL slug
              </label>
              <input
                id="article-slug"
                type="text"
                value={slugInput}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlugInput(e.target.value);
                }}
                placeholder="my-article"
                className="input"
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                Lowercase, hyphens; used in the public KB URL. Leave blank to
                derive from the title.
              </p>
            </div>
          )}

          <div>
            <label className="label">Content</label>
            <RichTextEditor
              key={`${editId ?? "new"}-${editorLocale}`}
              content={content}
              onChange={setContent}
              placeholder="Sections, headings, images (URL), and YouTube embeds…"
            />
          </div>

          {editorLocale === "en" && (
            <>
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
                <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                  Separate with commas
                </p>
              </div>

              <CategoryPicker
                tree={categoryTree}
                selectedIds={selectedCategoryIds}
                primaryCategoryId={primaryCategoryId}
                onSelectedChange={setSelectedCategoryIds}
                onPrimaryChange={setPrimaryCategoryId}
                disabled={saving}
              />
            </>
          )}

          <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
            <p className="label mb-1">SEO ({localeMeta.label})</p>
            <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
              Optional fields for search and social previews for this language.
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

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
        <Link href="/blogs" className="btn-secondary">
          Cancel
        </Link>
        <button type="submit" disabled={saving} className="btn-primary">
          <Save size={16} />
          {saving
            ? "Saving…"
            : isEditing
              ? editorLocale === "en"
                ? "Save English"
                : `Save ${localeMeta.label}`
              : "Publish article"}
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
          English is the primary language. Translate to Arabic and Urdu, then
          edit each locale independently.
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
