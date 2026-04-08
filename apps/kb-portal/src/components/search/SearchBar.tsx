"use client";

import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  size?: "default" | "large";
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Search for anything...",
  autoFocus = false,
  size = "default",
}: SearchBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.();
  };

  const sizeClasses =
    size === "large"
      ? "py-4 pl-14 pr-6 text-lg"
      : "py-2.5 pl-10 pr-4 text-sm";
  const iconSize = size === "large" ? "h-6 w-6" : "h-4 w-4";
  const iconPos =
    size === "large" ? "left-5 top-1/2 -translate-y-1/2" : "left-3 top-1/2 -translate-y-1/2";

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <Search
        className={`pointer-events-none absolute ${iconPos} ${iconSize} text-neutral-400`}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`w-full rounded-xl border border-neutral-200 bg-white ${sizeClasses} text-neutral-900 shadow-sm placeholder:text-neutral-400 transition-all focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-brand-500`}
      />
    </form>
  );
}
