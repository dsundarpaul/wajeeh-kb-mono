"use client";

import { AuthGuard } from "./auth-guard";
import { FloatingChatWidget } from "./floating-chat-widget";
import { Sidebar } from "./sidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
        <Sidebar />
        <main className="pl-64">
          <div className="p-8">{children}</div>
        </main>
        <FloatingChatWidget />
      </div>
    </AuthGuard>
  );
}
