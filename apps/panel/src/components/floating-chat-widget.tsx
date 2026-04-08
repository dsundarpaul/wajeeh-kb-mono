"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";

const chatbotSrc =
  process.env.NEXT_PUBLIC_CHATBOT_URL ?? "http://localhost:3001";

export function FloatingChatWidget() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <div className="pointer-events-none fixed bottom-0 right-0 z-[100] p-4 sm:p-6">
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        {open && (
          <div
            className="flex h-[min(600px,calc(100vh-7rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl ring-1 ring-black/5 dark:border-neutral-800 dark:bg-neutral-900 dark:ring-white/10"
            role="dialog"
            aria-label="AI assistant chat"
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-950/80">
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Wajeeh Assistant
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Ask questions from your knowledge base
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>
            <iframe
              title="Wajeeh AI chat"
              src={chatbotSrc}
              className="min-h-0 flex-1 w-full border-0 bg-neutral-950"
              allow="clipboard-write; microphone"
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-950"
          aria-expanded={open}
          aria-label={open ? "Close AI chat" : "Open AI chat"}
        >
          {open ? (
            <X size={24} strokeWidth={2.25} />
          ) : (
            <MessageCircle size={26} strokeWidth={2} />
          )}
        </button>
      </div>
    </div>
  );
}
