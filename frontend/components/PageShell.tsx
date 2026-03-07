// frontend/components/PageShell.tsx
"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useCaseStore } from "@/lib/case-store";

export default function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const reset = useCaseStore((s) => s.reset);
  const router = useRouter();

  const [showClearModal, setShowClearModal] = useState(false);

  function openClearModal() {
    setShowClearModal(true);
  }

  function closeClearModal() {
    setShowClearModal(false);
  }

  function confirmClearAll() {
    reset();
    sessionStorage.removeItem("mirathi-latest-result");
    setShowClearModal(false);
    router.push("/");
  }

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div className="mb-4 flex justify-start">
            <button
              type="button"
              onClick={openClearModal}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 shadow-sm hover:bg-red-100"
            >
              امسح المدخلات
            </button>
          </div>

          <header className="mb-6 text-center">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mx-auto mt-2 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
                {subtitle}
              </p>
            ) : null}
          </header>

          {children}
        </div>
      </main>

      {showClearModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl">
                🗑️
              </div>

              <h2 className="mt-4 text-xl font-black text-slate-900">
                تأكيد مسح البيانات
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                هل أنت متأكد من مسح جميع المدخلات والنتائج الحالية؟
                <br />
                لا يمكن التراجع عن هذه الخطوة.
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={closeClearModal}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={confirmClearAll}
                className="rounded-2xl border border-red-200 bg-red-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-red-700"
              >
                نعم، امسح الكل
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}