"use client";

import { useState, useCallback } from "react";
import type { KnowledgeCategoryTreeNode } from "@/types/api";
import type { PortalMessages } from "@/lib/portal-messages";
import Header from "./Header";
import Sidebar from "./Sidebar";

interface ShellLayoutProps {
  tree: KnowledgeCategoryTreeNode[];
  messages: PortalMessages;
  children: React.ReactNode;
  showSidebar?: boolean;
}

export default function ShellLayout({
  tree,
  messages,
  children,
  showSidebar = true,
}: ShellLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarOpen((p) => !p), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <Header
        messages={messages}
        onToggleSidebar={showSidebar ? toggleSidebar : undefined}
        sidebarOpen={sidebarOpen}
      />
      <div className="mx-auto flex max-w-7xl">
        {showSidebar && (
          <Sidebar
            tree={tree}
            messages={messages}
            open={sidebarOpen}
            onClose={closeSidebar}
          />
        )}
        <main
          className={`min-h-[calc(100vh-4rem)] flex-1 ${showSidebar ? "px-4 py-8 sm:px-6 lg:px-10" : ""}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
