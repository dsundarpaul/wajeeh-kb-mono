import { fetchCategoryTree } from "@/lib/api/categories";
import ShellLayout from "@/components/layout/ShellLayout";
import { getPortalUi } from "@/lib/get-portal-ui";
import { intlLocaleForKbPortal } from "@/lib/kb-locale";
import type { KnowledgeCategoryTreeNode } from "@/types/api";
import SearchPageContent from "./search-page-content";

export default async function SearchPage() {
  const { locale, messages } = await getPortalUi();
  let tree: KnowledgeCategoryTreeNode[] = [];
  try {
    tree = await fetchCategoryTree(locale, { forPortal: true });
  } catch {
    tree = [];
  }
  const dateLocale = intlLocaleForKbPortal(locale);

  return (
    <ShellLayout tree={tree} messages={messages} showSidebar={false}>
      <SearchPageContent
        articleLocale={locale}
        messages={messages}
        dateLocale={dateLocale}
      />
    </ShellLayout>
  );
}
