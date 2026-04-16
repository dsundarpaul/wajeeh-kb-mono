import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";
import {
  KB_PORTAL_LOCALE_COOKIE,
  isRtlKbLocale,
  normalizeKbPortalLocale,
} from "@/lib/kb-locale";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Knowledge Base",
    template: "%s | Knowledge Base",
  },
  description: "Find answers, guides, and documentation for all your questions.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = normalizeKbPortalLocale(
    cookieStore.get(KB_PORTAL_LOCALE_COOKIE)?.value,
  );
  const rtl = isRtlKbLocale(locale);
  const htmlLang = locale === "en" ? "en" : locale === "ar" ? "ar" : "ur";

  return (
    <html
      lang={htmlLang}
      dir={rtl ? "rtl" : "ltr"}
      suppressHydrationWarning
    >
      <body className={`${inter.variable} font-sans`}>{children}</body>
    </html>
  );
}
