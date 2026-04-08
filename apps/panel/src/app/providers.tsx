"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          className:
            "!bg-white !text-neutral-900 !border !border-neutral-200 !shadow-lg dark:!bg-neutral-900 dark:!text-neutral-100 dark:!border-neutral-700",
        }}
      />
    </ThemeProvider>
  );
}
