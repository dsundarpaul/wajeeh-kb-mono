"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { api } from "@/lib/api";
import { FileText, Youtube, Database } from "lucide-react";

interface Stats {
  blogs: number;
  videos: number;
  health: boolean;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    blogs: 0,
    videos: 0,
    health: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api
        .get<{ total: number }>("/knowledge-chunks?limit=1&type=blog")
        .catch(() => ({ total: 0 })),
      api
        .get<{ total: number }>("/knowledge-chunks?limit=1&type=video")
        .catch(() => ({ total: 0 })),
      api.get<Record<string, unknown>>("/health").catch(() => null),
    ]).then(([blogsRes, videosRes, health]) => {
      setStats({
        blogs: blogsRes?.total ?? 0,
        videos: videosRes?.total ?? 0,
        health: !!health,
      });
      setLoading(false);
    });
  }, []);

  const cards = [
    {
      label: "Total Blogs",
      value: stats.blogs,
      icon: FileText,
      color: "text-brand-600 dark:text-brand-400",
      bg: "bg-brand-50 dark:bg-brand-950/60",
    },
    {
      label: "Total Videos",
      value: stats.videos,
      icon: Youtube,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/50",
    },
    {
      label: "API Status",
      value: stats.health ? "Online" : "Offline",
      icon: Database,
      color: stats.health ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
      bg: stats.health ? "bg-emerald-50 dark:bg-emerald-950/50" : "bg-red-50 dark:bg-red-950/50",
    },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Overview of your knowledge base
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <div key={card.label} className="card p-6">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.bg}`}
                >
                  <card.icon size={22} className={card.color} />
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {card.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-sm text-neutral-500 dark:text-neutral-400">
        Use the chat button in the bottom-right corner to try the AI assistant
        against your indexed knowledge base.
      </p>
    </DashboardLayout>
  );
}
