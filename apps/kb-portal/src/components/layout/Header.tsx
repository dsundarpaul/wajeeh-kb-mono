"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Menu, Search, X } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import LanguageSwitcher from "./language-switcher";
import type { PortalMessages } from "@/lib/portal-messages";

interface HeaderProps {
  messages: PortalMessages;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export default function Header({
  messages,
  onToggleSidebar,
  sidebarOpen,
}: HeaderProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = searchValue.trim();
      if (q) {
        router.push(`/search?q=${encodeURIComponent(q)}`);
      }
    },
    [searchValue, router],
  );

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-neutral-800 dark:bg-neutral-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
        {onToggleSidebar ? (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex shrink-0 items-center justify-center rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40 lg:hidden dark:text-neutral-400 dark:hover:bg-neutral-800"
            aria-label={
              sidebarOpen ? messages.headerCloseNav : messages.headerOpenNav
            }
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        ) : (
          <span className="w-10 shrink-0 lg:hidden" aria-hidden />
        )}

        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-lg font-bold text-neutral-900 transition-colors hover:text-brand-600 dark:text-white"
        >
          <BookOpen className="h-6 w-6 shrink-0 text-brand-600" />
          <span className="hidden sm:inline">{messages.headerBrand}</span>
        </Link>

        <form
          onSubmit={handleSearch}
          className="relative mx-auto hidden min-w-0 max-w-xl flex-1 sm:block"
        >
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            ref={inputRef}
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={messages.headerSearchPlaceholder}
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2 ps-10 pe-4 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-brand-500"
          />
        </form>

        <div className="ms-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <div className="flex sm:hidden">
            <Link
              href="/search"
              className="inline-flex items-center justify-center rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
              aria-label={messages.headerSearchAria}
            >
              <Search className="h-5 w-5" />
            </Link>
          </div>
          <LanguageSwitcher messages={messages} />
        </div>
      </div>
    </header>
  );
}
