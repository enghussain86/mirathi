// frontend/app/case/start/page.tsx
"use client";

import { useRouter } from "next/navigation";
import PageShell from "@/components/PageShell";
import Stepper from "@/components/Stepper";
import { useCaseStore } from "@/lib/case-store";

export default function StartPage() {
  const router = useRouter();

  const deceasedGender = useCaseStore((s) => s.data.deceasedGender);
  const setDeceasedGender = useCaseStore((s) => s.setDeceasedGender);
  const reset = useCaseStore((s) => s.reset);

  return (
    <PageShell
      title="البداية"
      subtitle="ابدأ بإدخال البيانات الأساسية، ثم انتقل إلى صفحة التركة والورثة."
    >
      <Stepper current={1} />

      <div className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setDeceasedGender("male")}
          className={[
            "rounded-3xl border p-6 text-center shadow-sm transition",
            deceasedGender === "male"
              ? "border-emerald-300 bg-emerald-50"
              : "border-slate-200 bg-white hover:bg-slate-50",
          ].join(" ")}
        >
          <div className="text-2xl font-black text-slate-900">المتوفَّى ذَكَر</div>
        </button>

        <button
          type="button"
          onClick={() => setDeceasedGender("female")}
          className={[
            "rounded-3xl border p-6 text-center shadow-sm transition",
            deceasedGender === "female"
              ? "border-emerald-300 bg-emerald-50"
              : "border-slate-200 bg-white hover:bg-slate-50",
          ].join(" ")}
        >
          <div className="text-2xl font-black text-slate-900">المتوفَّاة أُنثى</div>
        </button>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-800 shadow-sm hover:bg-slate-50"
        >
          مسح البيانات
        </button>

        <button
          type="button"
          onClick={() => router.push("/case/estate")}
          className="rounded-2xl bg-emerald-700 px-6 py-3 font-bold text-white shadow-sm hover:bg-emerald-800"
        >
          متابعة
        </button>
      </div>
    </PageShell>
  );
}