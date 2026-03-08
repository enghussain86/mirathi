"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Home } from "lucide-react";

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isHome = pathname === "/";
  if (isHome) return null;

  return (
    <div className="print:hidden sticky top-0 z-50 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowRight className="h-4 w-4" />
          رجوع
        </button>

        <div className="flex items-center gap-2">
          <Link
            href="/references"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            <BookOpen className="h-4 w-4" />
            المرجعية
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
          >
            <Home className="h-4 w-4" />
            الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}