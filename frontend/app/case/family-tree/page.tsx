"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, GitBranch, Printer } from "lucide-react";

import PageShell from "@/components/PageShell";
import Stepper from "@/components/Stepper";
import { useCaseStore } from "@/lib/case-store";
import { HEIR_OPTIONS, type HeirEntry, type HeirRole } from "@/lib/case-schema";

function roleLabel(role: HeirRole) {
  return HEIR_OPTIONS.find((x) => x.key === role)?.label ?? role;
}

function parseISODate(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  return Number.isFinite(d.getTime()) ? d : null;
}

function isFuture(d: Date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return x.getTime() > today.getTime();
}

function calcAgeYears(dob: Date, ref = new Date()): number {
  let age = ref.getFullYear() - dob.getFullYear();
  const m = ref.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age--;
  return age;
}

function displayName(heir: HeirEntry) {
  return heir.name.trim() || roleLabel(heir.role);
}

function getAge(heir: HeirEntry) {
  const dob = parseISODate(heir.dob);
  return dob && !isFuture(dob) ? calcAgeYears(dob) : null;
}

function isIncomplete(heir: HeirEntry) {
  const age = getAge(heir);
  return !heir.name.trim() || !heir.dob || age === null;
}

function cardTone(heir: HeirEntry) {
  if (isIncomplete(heir)) {
    return {
      wrap: "border-amber-200 bg-amber-50",
      name: "text-amber-900",
      meta: "text-amber-800",
      badge: "border-amber-200 bg-white text-amber-800",
    };
  }

  return {
    wrap: "border-emerald-200 bg-emerald-50",
    name: "text-emerald-900",
    meta: "text-emerald-800",
    badge: "border-emerald-200 bg-white text-emerald-800",
  };
}

function ScreenNode({
  heir,
  compact = false,
}: {
  heir: HeirEntry;
  compact?: boolean;
}) {
  const tone = cardTone(heir);
  const age = getAge(heir);

  return (
    <div
      className={[
        "rounded-[22px] border px-4 py-4 text-center shadow-sm",
        compact ? "min-w-[165px]" : "min-w-[180px]",
        tone.wrap,
      ].join(" ")}
    >
      <div className="flex justify-center">
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-black ${tone.badge}`}
        >
          {roleLabel(heir.role)}
        </span>
      </div>

      <div className={`mt-3 text-base font-black ${tone.name}`}>
        {displayName(heir)}
      </div>

      <div className={`mt-2 text-sm font-bold ${tone.meta}`}>
        السن: {age === null ? "—" : `${age} سنة`}
      </div>
    </div>
  );
}

function ScreenEmpty({ label }: { label: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-5 py-4 text-center text-sm font-bold text-slate-400">
      {label}
    </div>
  );
}

function PrintPersonRow({ heir }: { heir: HeirEntry }) {
  const age = getAge(heir);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-base font-black text-slate-900">{displayName(heir)}</div>
      <div className="mt-1 text-sm text-slate-700">{roleLabel(heir.role)}</div>
      <div className="mt-2 text-sm font-bold text-slate-600">
        السن: {age === null ? "—" : `${age} سنة`}
      </div>
    </div>
  );
}

function PrintSection({
  title,
  items,
}: {
  title: string;
  items: HeirEntry[];
}) {
  if (!items.length) return null;

  return (
    <section className="hidden print:block print:break-inside-avoid">
      <div className="mb-3 inline-flex rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-black text-slate-800">
        {title}
      </div>

      <div className="grid gap-3 print:grid-cols-2">
        {items.map((heir) => (
          <PrintPersonRow key={heir.id} heir={heir} />
        ))}
      </div>
    </section>
  );
}

export default function FamilyTreePage() {
  const router = useRouter();

  const deceasedGender = useCaseStore((s) => s.data.deceasedGender);
  const heirs = useCaseStore((s) => s.data.heirs);

  const grouped = useMemo(() => {
    const byRole = (roles: HeirRole[]) => heirs.filter((h) => roles.includes(h.role));

    return {
      spouse: byRole(["husband", "wife"]),
      parents: byRole(["father", "mother"]),
      grandparents: byRole([
        "grandfather_paternal",
        "grandmother_paternal",
        "grandmother_maternal",
      ]),
      children: byRole(["son", "daughter", "sons_son", "sons_daughter"]),
      siblings: byRole([
        "full_brother",
        "full_sister",
        "paternal_brother",
        "paternal_sister",
        "maternal_brother",
        "maternal_sister",
      ]),
      uncles: byRole(["paternal_uncle_full", "paternal_uncle_paternal"]),
    };
  }, [heirs]);

  const totalShown =
    grouped.spouse.length +
    grouped.parents.length +
    grouped.grandparents.length +
    grouped.children.length +
    grouped.siblings.length +
    grouped.uncles.length;

  const incompleteCount = heirs.filter((heir) => isIncomplete(heir)).length;
  const hasAnyHeirs = totalShown > 0;

  return (
    <PageShell
      title="شجرة العائلة"
      subtitle="عرض بصري للعلاقات العائلية، مع وضع طباعة مخصص وواضح."
    >
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          html,
          body {
            background: #ffffff !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .print-hide {
            display: none !important;
          }

          .screen-tree {
            display: none !important;
          }

          .print-report {
            display: block !important;
          }
        }
      `}</style>

      <div className="print-hide">
        <Stepper current={3} />
      </div>

      <div className="space-y-6">
        <section className="print-hide rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800">
                <GitBranch className="h-4 w-4" />
                شجرة عائلة تفاعلية
              </div>

              <h2 className="mt-4 text-xl font-black text-slate-900">
                شجرة عائلة {deceasedGender === "male" ? "المتوفى" : "المتوفاة"}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                داخل الشاشة تظهر الشجرة بشكل بصري مبسط، أما عند الطباعة فيتم
                تحويلها تلقائيًا إلى تقرير عائلي مرتب وواضح.
              </p>
            </div>

            <div className="grid min-w-[250px] gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold text-slate-500">عدد العناصر</div>
                <div className="mt-1 text-base font-black text-slate-900">
                  {totalShown}
                </div>
              </div>

              <div
                className={[
                  "rounded-3xl border p-4",
                  incompleteCount
                    ? "border-amber-200 bg-amber-50"
                    : "border-emerald-200 bg-emerald-50",
                ].join(" ")}
              >
                <div className="text-xs font-bold text-slate-500">يحتاج مراجعة</div>
                <div
                  className={[
                    "mt-1 text-base font-black",
                    incompleteCount ? "text-amber-900" : "text-emerald-800",
                  ].join(" ")}
                >
                  {incompleteCount}
                </div>
              </div>
            </div>
          </div>

          {!hasAnyHeirs ? (
            <div className="mt-5 rounded-[28px] border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-white p-2">
                  <AlertTriangle className="h-5 w-5 text-amber-700" />
                </div>

                <div>
                  <div className="text-lg font-black text-amber-900">
                    لا توجد بيانات لعرض الشجرة
                  </div>
                  <p className="mt-2 text-sm leading-8 text-amber-900">
                    أضف الورثة أولًا من صفحة الورثة، ثم ارجع هنا.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <div className="screen-tree print:hidden rounded-[36px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex justify-center">
            <div className="rounded-[28px] border border-emerald-300 bg-emerald-50 px-10 py-7 text-center shadow-sm">
              <div className="text-xs font-black text-emerald-700">مركز الشجرة</div>
              <div className="mt-2 text-3xl font-black text-emerald-900">
                {deceasedGender === "male" ? "المتوفى" : "المتوفاة"}
              </div>
            </div>
          </div>

          {hasAnyHeirs ? (
            <div className="mt-8 space-y-8">
              <div className="grid gap-6 xl:grid-cols-[1fr_auto_1fr]">
                <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-4 text-center">
                    <span className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800">
                      الأصول
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {grouped.parents.length ? (
                      grouped.parents.map((heir) => <ScreenNode key={heir.id} heir={heir} />)
                    ) : (
                      <ScreenEmpty label="لا يوجد أب أو أم" />
                    )}

                    {grouped.grandparents.length ? (
                      grouped.grandparents.map((heir) => (
                        <ScreenNode key={heir.id} heir={heir} compact />
                      ))
                    ) : (
                      <ScreenEmpty label="لا يوجد أجداد أو جدات" />
                    )}
                  </div>
                </section>

                <div className="hidden xl:flex items-center justify-center">
                  <div className="h-full min-h-[220px] border-r-2 border-slate-300" />
                </div>

                <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-4 text-center">
                    <span className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800">
                      الزوجية
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-4">
                    {grouped.spouse.length ? (
                      grouped.spouse.map((heir) => <ScreenNode key={heir.id} heir={heir} />)
                    ) : (
                      <ScreenEmpty label="لا توجد زوجية مضافة" />
                    )}
                  </div>
                </section>
              </div>

              <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 text-center">
                  <span className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800">
                    الفروع
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4">
                  {grouped.children.length ? (
                    grouped.children.map((heir) => <ScreenNode key={heir.id} heir={heir} />)
                  ) : (
                    <ScreenEmpty label="لا يوجد أبناء أو فروع" />
                  )}
                </div>
              </section>

              <div className="grid gap-6 xl:grid-cols-2">
                <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-4 text-center">
                    <span className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800">
                      الإخوة والأخوات
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-4">
                    {grouped.siblings.length ? (
                      grouped.siblings.map((heir) => (
                        <ScreenNode key={heir.id} heir={heir} compact />
                      ))
                    ) : (
                      <ScreenEmpty label="لا يوجد إخوة أو أخوات" />
                    )}
                  </div>
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-4 text-center">
                    <span className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800">
                      الأعمام
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-4">
                    {grouped.uncles.length ? (
                      grouped.uncles.map((heir) => (
                        <ScreenNode key={heir.id} heir={heir} compact />
                      ))
                    ) : (
                      <ScreenEmpty label="لا يوجد أعمام" />
                    )}
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
              لا توجد عناصر لعرضها داخل الشجرة.
            </div>
          )}
        </div>

        <div className="print-report hidden">
          <div className="mb-6 text-center">
            <div className="text-2xl font-black text-slate-900">
              شجرة عائلة {deceasedGender === "male" ? "المتوفى" : "المتوفاة"}
            </div>
            <div className="mt-3 inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-6 py-3 text-base font-black text-emerald-900">
              {deceasedGender === "male" ? "المتوفى" : "المتوفاة"}
            </div>
          </div>

          {hasAnyHeirs ? (
            <div className="space-y-5">
              <PrintSection title="الزوجية" items={grouped.spouse} />
              <PrintSection title="الأبوان" items={grouped.parents} />
              <PrintSection title="الأجداد والجدات" items={grouped.grandparents} />
              <PrintSection title="الفروع" items={grouped.children} />
              <PrintSection title="الإخوة والأخوات" items={grouped.siblings} />
              <PrintSection title="الأعمام" items={grouped.uncles} />
            </div>
          ) : (
            <div className="rounded-[28px] border border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
              لا توجد بيانات لعرض التقرير العائلي.
            </div>
          )}
        </div>
      </div>

      <div className="print-hide mt-8 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/case/heirs")}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          العودة إلى الورثة
        </button>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            طباعة الشجرة
          </button>

          <button
            type="button"
            onClick={() => router.push("/case/review")}
            className="rounded-2xl bg-emerald-700 px-6 py-3 font-bold text-white shadow-sm transition hover:bg-emerald-800"
          >
            متابعة إلى المراجعة
          </button>
        </div>
      </div>
    </PageShell>
  );
}