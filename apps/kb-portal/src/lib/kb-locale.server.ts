import { cookies } from "next/headers";
import {
  KB_PORTAL_LOCALE_COOKIE,
  normalizeKbPortalLocale,
  type KbPortalLocale,
} from "./kb-locale";

export async function resolveKbPortalLocale(
  searchParamsLocale?: string | null,
): Promise<KbPortalLocale> {
  if (searchParamsLocale === "en") {
    return "en";
  }
  if (searchParamsLocale === "ar" || searchParamsLocale === "ur") {
    return searchParamsLocale;
  }
  const stored = (await cookies()).get(KB_PORTAL_LOCALE_COOKIE)?.value;
  return normalizeKbPortalLocale(stored);
}
