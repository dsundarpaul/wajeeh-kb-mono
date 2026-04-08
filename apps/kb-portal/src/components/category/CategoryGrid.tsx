import type { KnowledgeCategoryTreeNode } from "@/types/api";
import CategoryCard from "./CategoryCard";

interface CategoryGridProps {
  categories: KnowledgeCategoryTreeNode[];
  basePath?: string;
}

export default function CategoryGrid({
  categories,
  basePath = "",
}: CategoryGridProps) {
  if (categories.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((cat) => (
        <CategoryCard
          key={cat._id}
          category={cat}
          href={basePath ? `${basePath}/${cat.slug}` : `/${cat.slug}`}
        />
      ))}
    </div>
  );
}
