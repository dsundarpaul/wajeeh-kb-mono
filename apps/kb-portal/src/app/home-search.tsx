"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import SearchBar from "@/components/search/SearchBar";

export default function HomeSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    const q = value.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <SearchBar
      value={value}
      onChange={setValue}
      onSubmit={handleSubmit}
      size="large"
      placeholder="Search for anything..."
      autoFocus
    />
  );
}
