export const KB_PORTAL_LOCALE_COOKIE = "kb-portal-locale";

export type KbPortalLocale = "en" | "ar" | "ur";

export function normalizeKbPortalLocale(
  raw: string | null | undefined,
): KbPortalLocale {
  if (raw === "ar" || raw === "ur") return raw;
  return "en";
}

export function isRtlKbLocale(locale: KbPortalLocale): boolean {
  return locale === "ar" || locale === "ur";
}

export function intlLocaleForKbPortal(locale: KbPortalLocale): string {
  if (locale === "en") return "en-US";
  return locale;
}

export function readKbPortalLocaleFromDocument(): KbPortalLocale {
  if (typeof document === "undefined") return "en";
  const name = KB_PORTAL_LOCALE_COOKIE.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return normalizeKbPortalLocale(
    match?.[1] ? decodeURIComponent(match[1]) : undefined,
  );
}
