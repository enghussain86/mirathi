"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import Stepper from "@/components/Stepper";
import { useCaseStore } from "@/lib/case-store";
import {
  HEIR_CATEGORY_LABELS,
  HEIR_OPTIONS,
  type HeirEntry,
  type HeirRole,
} from "@/lib/case-schema";

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

function getHijriBirthString(dob: Date): string {
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(dob);
  } catch {
    return "—";
  }
}

function roleLabel(role: HeirRole) {
  return HEIR_OPTIONS.find((x) => x.key === role)?.label ?? role;
}

function HeirCard({
  heir,
  onChange,
  onRemove,
}: {
  heir: HeirEntry;
  onChange: (id: string, patch: Partial<Pick<HeirEntry, "name" | "dob">>) => void;
  onRemove: (id: string) => void;
}) {
  const dob = parseISODate(heir.dob);

  const issues = useMemo(() => {
    const x: string[] = [];
    if (!heir.name.trim()) x.push("يرجى إدخال اسم الوارث.");
    if (!heir.dob) x.push("يرجى إدخال تاريخ الميلاد.");
    if (dob && isFuture(dob)) x.push("تاريخ الميلاد لا يمكن أن يكون في المستقبل.");
    return x;
  }, [heir.name, heir.dob, dob]);

  const age = dob && !isFuture(dob) ? calcAgeYears(dob) : null;
  const hijri = dob ? getHijriBirthString(dob) : "—";
  const status = age === null ? "—" : age >= 18 ? "بالغ" : "قاصر";
  const isComplete = issues.length === 0;

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
            {isComplete ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                مكتمل
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-amber-700" />
                يحتاج مراجعة
              </>
            )}
          </div>

          <div className="mt-3 text-lg font-black text-slate-900">
            {roleLabel(heir.role)}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            أدخل بيانات الوارث كما هي متاحة لديك.
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRemove(heir.id)}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
        >
          <Trash2 className="h-4 w-4" />
          حذف
        </button>
      </div>

      {issues.length ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-black text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            بيانات تحتاج استكمال
          </div>
          <ul className="list-inside list-disc space-y-1 text-sm leading-7 text-amber-900">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block">
          <div className="mb-2 text-sm font-black text-slate-800">الاسم</div>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            value={heir.name}
            onChange={(e) => onChange(heir.id, { name: e.target.value })}
            placeholder="اكتب اسم الوارث"
          />
          <p className="mt-2 text-xs text-slate-500">
            يفضّل إدخال الاسم الحقيقي لتسهيل المراجعة لاحقًا.
          </p>
        </label>

        <label className="block">
          <div className="mb-2 text-sm font-black text-slate-800">تاريخ الميلاد</div>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pl-10 text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              value={heir.dob}
              onChange={(e) => onChange(heir.id, { dob: e.target.value })}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            يُستخدم تاريخ الميلاد لإظهار العمر والحالة العمرية.
          </p>
        </label>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-bold text-slate-500">العمر التقريبي</div>
          <div className="mt-2 text-base font-black text-slate-900">
            {age === null ? "—" : `${age} سنة`}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-bold text-slate-500">الميلاد الهجري</div>
          <div className="mt-2 text-base font-black text-slate-900">{hijri}</div>
        </div>

        <div
          className={[
            "rounded-2xl border p-4",
            status === "بالغ"
              ? "border-emerald-200 bg-emerald-50"
              : status === "قاصر"
              ? "border-amber-200 bg-amber-50"
              : "border-slate-200 bg-slate-50",
          ].join(" ")}
        >
          <div className="text-xs font-bold text-slate-500">الحالة العمرية</div>
          <div
            className={[
              "mt-2 text-base font-black",
              status === "بالغ"
                ? "text-emerald-800"
                : status === "قاصر"
                ? "text-amber-800"
                : "text-slate-900",
            ].join(" ")}
          >
            {status}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HeirsPage() {
  const router = useRouter();

  const deceasedGender = useCaseStore((s) => s.data.deceasedGender);
  const heirs = useCaseStore((s) => s.data.heirs);
  const addHeir = useCaseStore((s) => s.addHeir);
  const updateHeir = useCaseStore((s) => s.updateHeir);
  const removeHeir = useCaseStore((s) => s.removeHeir);

  const allowedOptions = HEIR_OPTIONS.filter(
    (opt) => opt.allowedFor === "both" || opt.allowedFor === deceasedGender
  );

  const grouped = {
    spouses: allowedOptions.filter((x) => x.category === "spouses"),
    ascendants: allowedOptions.filter((x) => x.category === "ascendants"),
    descendants: allowedOptions.filter((x) => x.category === "descendants"),
    siblings: allowedOptions.filter((x) => x.category === "siblings"),
    uncles: allowedOptions.filter((x) => x.category === "uncles"),
  };

  const incompleteCount = heirs.filter((heir) => {
    const dob = parseISODate(heir.dob);
    return !heir.name.trim() || !heir.dob || (dob ? isFuture(dob) : false);
  }).length;

  return (
    <PageShell
      title="الوَرَثة"
      subtitle="اختر صفة الوارث أولًا، ثم أدخل الاسم وتاريخ الميلاد لكل وارث. يتم احتساب العمر والحالة العمرية تلقائيًا."
    >
      <Stepper current={3} />

      <div className="space-y-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800">
                <Users className="h-4 w-4" />
                إدارة الورثة
              </div>

              <h2 className="mt-4 text-xl font-black text-slate-900">
                إضافة الورثة وتعبئة بياناتهم
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                اختر من الفئات بالأسفل لإضافة الورثة المناسبين، ثم أكمل اسم كل
                وارث وتاريخ ميلاده قبل الانتقال إلى المراجعة.
              </p>
            </div>

            <div className="grid min-w-[240px] gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold text-slate-500">عدد الورثة</div>
                <div className="mt-1 text-base font-black text-slate-900">
                  {heirs.length}
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
                <div className="text-xs font-bold text-slate-500">
                  بطاقات غير مكتملة
                </div>
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

          <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-white p-2">
                <UserPlus className="h-5 w-5 text-slate-700" />
              </div>

              <div>
                <div className="text-sm font-black text-slate-900">
                  طريقة الاستخدام
                </div>
                <p className="mt-1 text-sm leading-7 text-slate-600">
                  اضغط على صفة الوارث لإضافته، ثم راجع سجل الورثة المضافين في
                  الأسفل لإدخال الاسم وتاريخ الميلاد أو حذف أي عنصر لا تحتاجه.
                </p>
              </div>
            </div>
          </div>
        </section>

        {Object.entries(grouped).map(([key, options]) => (
          <section
            key={key}
            className="rounded-[28px] border border-slate-200 bg-slate-50 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {HEIR_CATEGORY_LABELS[key as keyof typeof HEIR_CATEGORY_LABELS]}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  اختر الصفة المناسبة لإضافة وارث جديد من هذه الفئة.
                </p>
              </div>

              <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700">
                {options.length} خيار
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {options.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => addHeir(opt.key)}
                  className="rounded-[24px] border border-slate-200 bg-white p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-base font-black text-slate-900">
                      {opt.label}
                    </div>

                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                      <Plus className="h-4 w-4" />
                    </span>
                  </div>

                  <div className="mt-3 text-xs leading-6 text-slate-500">
                    {opt.multiple
                      ? "يمكن إضافة أكثر من وارث من هذه الصفة."
                      : "تُستخدم عادة مرة واحدة فقط ضمن المسألة."}
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                سجلُّ الورثة المُضافين
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                راجع جميع الورثة المضافين وأكمل بياناتهم قبل المتابعة.
              </p>
            </div>

            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-700">
              العدد الحالي: {heirs.length}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {heirs.length ? (
              heirs.map((heir) => (
                <HeirCard
                  key={heir.id}
                  heir={heir}
                  onChange={updateHeir}
                  onRemove={removeHeir}
                />
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white">
                  <Users className="h-6 w-6 text-slate-500" />
                </div>

                <div className="mt-4 text-lg font-black text-slate-900">
                  لم يتم إضافة ورثة بعد
                </div>

                <p className="mt-2 text-sm leading-7 text-slate-600">
                  ابدأ باختيار صفة الوارث من الأقسام السابقة، ثم ستظهر البطاقة
                  هنا لإكمال البيانات.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          رجوع
        </button>

        <button
          type="button"
          onClick={() => router.push("/case/review")}
          className="rounded-2xl bg-emerald-700 px-6 py-3 font-bold text-white shadow-sm transition hover:bg-emerald-800"
        >
          متابعة إلى المراجعة
        </button>
      </div>
    </PageShell>
  );
}