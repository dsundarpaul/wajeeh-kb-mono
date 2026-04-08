"use client";

import { useState, useCallback } from "react";
import type { KnowledgeChunkMedia } from "@/types/api";
import { renderArticleHtml } from "@/lib/utils/richtext";

interface ArticleBodyProps {
  content: string;
  media: KnowledgeChunkMedia[];
}

function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        aria-label="Close lightbox"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export default function ArticleBody({ content, media }: ArticleBodyProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState("");

  const processedHtml = renderArticleHtml(content, media);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG") {
      const img = target as HTMLImageElement;
      setLightboxSrc(img.src);
      setLightboxAlt(img.alt || "");
    }
  }, []);

  const handleImageError = useCallback(
    (e: React.SyntheticEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG") {
        const img = target as HTMLImageElement;
        img.style.display = "none";
        const placeholder = document.createElement("div");
        placeholder.className =
          "flex items-center justify-center rounded-lg bg-neutral-100 p-8 text-sm text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500";
        placeholder.textContent = "Image unavailable";
        img.parentNode?.insertBefore(placeholder, img);
      }
    },
    [],
  );

  return (
    <>
      <div
        className="prose prose-neutral max-w-none dark:prose-invert prose-headings:scroll-mt-24 prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline prose-img:cursor-pointer prose-img:rounded-lg"
        dangerouslySetInnerHTML={{ __html: processedHtml }}
        onClick={handleClick}
        onError={handleImageError}
      />
      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt={lightboxAlt}
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </>
  );
}
