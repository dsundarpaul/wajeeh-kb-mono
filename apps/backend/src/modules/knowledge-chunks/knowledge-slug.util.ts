export function slugifyTitle(input: string): string {
  const s = input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s.length > 0 ? s : "article";
}

export function isMongoObjectIdString(value: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(value);
}
