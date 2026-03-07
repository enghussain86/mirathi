"use client";

import Link from "next/link";
import { BookOpen, ChevronLeft, Scale, Landmark } from "lucide-react";
import { useCaseStore } from "@/lib/case-store";

export default function HomePage() {
  const referenceMode = useCaseStore((s) => s.data.referenceMode);
  const madhhab = useCaseStore((s) => s.data.madhhab);
  const setReferenceMode = useCaseStore((s) => s.setReferenceMode);
  const setMadhhab = useCaseStore((s) => s.setMadhhab);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl rounded-[32px] border border-emerald-100 bg-white p-8 text-center shadow-sm md:p-12">
        <div className="mx-auto inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-6 py-3 text-3xl font-black text-emerald-800 md:text-4xl">
          ميراثي
        </div>

        <h1 className="mt-6 text-2xl font-black leading-relaxed text-slate-900 md:text-3xl">
          قالَ اللهُ تعالى في المواريث
        </h1>

        <p className="mt-4 text-lg font-bold text-slate-700 md:text-xl">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>

        <div className="mx-auto mt-6 max-w-3xl rounded-[28px] border border-slate-200 bg-slate-50 p-6 text-base leading-8 text-slate-800 md:text-lg">
          ﴿يُوصِيكُمُ اللَّهُ فِي أَوْلَادِكُمْ لِلذَّكَرِ مِثْلُ حَظِّ
          الْأُنثَيَيْنِ...﴾
          <div className="mt-3 text-sm font-bold text-slate-500">
            سورة النساء — الآية 11
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-4xl rounded-[28px] border border-slate-200 bg-white p-6 text-right shadow-sm">
          <h2 className="text-xl font-black text-slate-900">نبذة عن ميراثي</h2>

          <p className="mt-3 text-sm leading-8 text-slate-700 md:text-base">
            ميراثي هو تطبيق يساعد على حساب وتوضيح أنصبة الميراث بطريقة سهلة وفق
            أحكام الشريعة الإسلامية، مع دعم الإطار القانوني المنظم للأحوال
            الشخصية في دولة الإمارات العربية المتحدة.
          </p>

          <p className="mt-3 text-sm leading-8 text-slate-700 md:text-base">
            يتيح لك التطبيق اختيار المرجع الذي تريد العمل عليه، سواءً كان
            القانون الإماراتي أو الفقه الإسلامي، مع إمكانية اختيار المذهب
            الفقهي في وضع الفقه الإسلامي.
          </p>
        </div>

        <section className="mx-auto mt-8 max-w-4xl rounded-[28px] border border-slate-200 bg-slate-50 p-6 text-right">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-black text-emerald-800">
              <Landmark className="h-4 w-4" />
              المرجع المعتمد
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setReferenceMode("uae_law")}
              className={[
                "rounded-[24px] border p-5 text-right shadow-sm transition",
                referenceMode === "uae_law"
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-white hover:bg-slate-50",
              ].join(" ")}
            >
              <div className="flex items-center gap-2 text-slate-900">
                <Scale className="h-5 w-5 text-emerald-700" />
                <span className="text-lg font-black">القانون الإماراتي</span>
              </div>
              <div className="mt-2 text-sm leading-7 text-slate-600">
                يتم عرض النتيجة وفق الإطار القانوني الإماراتي المنظم للميراث،
                مع الاستناد إلى أحكام قانون الأحوال الشخصية.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setReferenceMode("fiqh")}
              className={[
                "rounded-[24px] border p-5 text-right shadow-sm transition",
                referenceMode === "fiqh"
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-white hover:bg-slate-50",
              ].join(" ")}
            >
              <div className="flex items-center gap-2 text-slate-900">
                <BookOpen className="h-5 w-5 text-emerald-700" />
                <span className="text-lg font-black">الفقه الإسلامي</span>
              </div>
              <div className="mt-2 text-sm leading-7 text-slate-600">
                يتم عرض النتيجة وفق الأحكام الفقهية، مع إمكانية اختيار المذهب
                الفقهي المعتمد في الحسبة.
              </div>
            </button>
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-black text-slate-800">
              المذهب الفقهي
            </label>

            <select
              value={madhhab}
              onChange={(e) =>
                setMadhhab(
                  e.target.value as
                    | "general"
                    | "hanafi"
                    | "maliki"
                    | "shafii"
                    | "hanbali"
                )
              }
              disabled={referenceMode === "uae_law"}
              className={[
                "w-full rounded-2xl border px-4 py-3 text-slate-900 outline-none",
                "focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100",
                referenceMode === "uae_law"
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                  : "border-slate-200 bg-white",
              ].join(" ")}
            >
              <option value="general">عام</option>
              <option value="hanafi">الحنفي</option>
              <option value="maliki">المالكي</option>
              <option value="shafii">الشافعي</option>
              <option value="hanbali">الحنبلي</option>
            </select>

            <p className="mt-2 text-xs leading-6 text-slate-500">
              عند اختيار القانون الإماراتي سيتم اعتماد الوضع العام، وتُعطَّل
              خيارات المذهب الفقهي في هذه المرحلة.
            </p>
          </div>
        </section>

        <section className="mx-auto mt-8 max-w-4xl rounded-[28px] border border-slate-200 bg-white p-6 text-right shadow-sm">
          <h2 className="text-xl font-black text-slate-900">
            المرجعية المعروضة
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-black text-slate-900">
                الوضع الحالي
              </div>
              <div className="mt-2 text-base font-black text-emerald-700">
                {referenceMode === "uae_law"
                  ? "القانون الإماراتي"
                  : "الفقه الإسلامي"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-black text-slate-900">
                المذهب الحالي
              </div>
              <div className="mt-2 text-base font-black text-emerald-700">
                {referenceMode === "uae_law"
                  ? "عام"
                  : madhhab === "general"
                  ? "عام"
                  : madhhab === "hanafi"
                  ? "الحنفي"
                  : madhhab === "maliki"
                  ? "المالكي"
                  : madhhab === "shafii"
                  ? "الشافعي"
                  : "الحنبلي"}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/case/start"
            className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-4 text-lg font-extrabold text-white shadow-sm transition hover:bg-emerald-800"
          >
            ابدأ الحساب
            <ChevronLeft className="h-5 w-5" />
          </Link>

          <Link
            href="/references"
            className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-lg font-extrabold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            المرجعية
            <BookOpen className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </main>
  );
}