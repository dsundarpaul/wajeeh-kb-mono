"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Globe } from "lucide-react";
import {
  KB_PORTAL_LOCALE_COOKIE,
  normalizeKbPortalLocale,
  readKbPortalLocaleFromDocument,
  type KbPortalLocale,
} from "@/lib/kb-locale";
import type { PortalMessages } from "@/lib/portal-messages";

const OPTIONS: { value: KbPortalLocale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
  { value: "ur", label: "اردو" },
];

function persistLocale(locale: KbPortalLocale) {
  document.cookie = `${KB_PORTAL_LOCALE_COOKIE}=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export default function LanguageSwitcher({
  messages,
}: {
  messages: PortalMessages;
}) {
  const router = useRouter();
  const [locale, setLocale] = useState<KbPortalLocale>("en");

  useEffect(() => {
    setLocale(readKbPortalLocaleFromDocument());
  }, []);

  const onChange = useCallback(
    (next: KbPortalLocale) => {
      setLocale(next);
      persistLocale(next);
      router.refresh();
    },
    [router],
  );

  return (
    <div
      className="flex shrink-0 items-center gap-2 border-neutral-200 ps-3 sm:border-s dark:border-neutral-700"
      title={messages.languageHint}
    >
      <Globe
        className="hidden h-4 w-4 shrink-0 text-brand-600 sm:block"
        aria-hidden
      />
      <select
        value={locale}
        onChange={(e) => onChange(normalizeKbPortalLocale(e.target.value))}
        className="max-w-[9.5rem] cursor-pointer rounded-lg border border-neutral-200 bg-white py-2 pe-8 ps-3 text-sm font-medium text-neutral-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
        aria-label={messages.languageAria}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
