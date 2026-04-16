import { resolveKbPortalLocale } from "./kb-locale.server";
import { getPortalMessages, type PortalMessages } from "./portal-messages";
import type { KbPortalLocale } from "./kb-locale";

export type PortalUi = {
  locale: KbPortalLocale;
  messages: PortalMessages;
};

export async function getPortalUi(
  searchParamsLocale?: string | null,
): Promise<PortalUi> {
  const locale = await resolveKbPortalLocale(searchParamsLocale);
  return { locale, messages: getPortalMessages(locale) };
}
