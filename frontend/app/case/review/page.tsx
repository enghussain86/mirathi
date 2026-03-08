"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  FileDown,
  FileText,
  Printer,
  RefreshCcw,
  Scale,
  Wallet,
} from "lucide-react";

import PageShell from "@/components/PageShell";
import Stepper from "@/components/Stepper";
import { useCaseStore } from "@/lib/case-store";
import { exportMirathiPDFByElement } from "@/lib/pdf";
import {
  HEIR_OPTIONS,
  defaultCalculationAdjustment,
  type CalculationAdjustmentType,
  type CalculationResponse,
  type CalculationShareType,
  type HeirRole,
  type SavedCaseResponse,
} from "@/lib/case-schema";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

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

function roleLabel(role: HeirRole) {
  return HEIR_OPTIONS.find((x) => x.key === role)?.label ?? role;
}

function shareTypeLabel(type: CalculationShareType) {
  switch (type) {
    case "fard":
      return "فرض";
    case "taasib":
      return "تعصيب";
    case "fard_and_taasib":
      return "فرض + تعصيب";
    case "blocked":
      return "محجوب";
    default:
      return type;
  }
}

function formatFraction(shareType: CalculationShareType, fraction: string) {
  if (shareType === "taasib" && fraction.includes("/")) {
    return "الباقي تعصيبًا";
  }
  return fraction;
}

function assetTypeLabel(type: string, customType?: string) {
  if (type === "other" && customType) return customType;

  switch (type) {
    case "financial_amounts":
      return "المبالغ المالية";
    case "real_estate":
      return "العقارات";
    case "land":
      return "الأراضي";
    case "gold_jewelry":
      return "الذهب والمجوهرات";
    case "vehicles":
      return "السيارات والمركبات";
    case "stocks_investments":
      return "الأسهم والاستثمارات";
    default:
      return "أخرى";
  }
}

function adjustmentTitle(type: CalculationAdjustmentType) {
  switch (type) {
    case "awl":
      return "عَول";
    case "radd":
      return "رَد";
    default:
      return "لا يوجد";
  }
}

function adjustmentTheme(type: CalculationAdjustmentType) {
  switch (type) {
    case "awl":
      return {
        wrap: "border-amber-200 bg-amber-50",
        title: "text-amber-900",
        text: "text-amber-900",
        badge: "border-amber-200 bg-white text-amber-800",
      };
    case "radd":
      return {
        wrap: "border-sky-200 bg-sky-50",
        title: "text-sky-900",
        text: "text-sky-900",
        badge: "border-sky-200 bg-white text-sky-800",
      };
    default:
      return {
        wrap: "border-emerald-200 bg-emerald-50",
        title: "text-emerald-900",
        text: "text-emerald-900",
        badge: "border-emerald-200 bg-white text-emerald-800",
      };
  }
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("ar-EG");
  } catch {
    return value;
  }
}

export default function ReviewPage() {
  const data = useCaseStore((s) => s.data);
  const reset = useCaseStore((s) => s.reset);
  const setCalculationResult = useCaseStore((s) => s.setCalculationResult);
  const clearCalculationResult = useCaseStore((s) => s.clearCalculationResult);

  const router = useRouter();
  const [savedCase, setSavedCase] = useState<SavedCaseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<CalculationResponse | null>(null);

  const net =
    (data.estate.total || 0) -
    (data.estate.debts || 0) -
    (data.estate.will || 0) -
    (data.estate.funeral || 0);

  const invalidHeirs = useMemo(() => {
    return data.heirs.filter((h) => {
      if (!h.name.trim() || !h.dob) return true;
      const dob = parseISODate(h.dob);
      return !dob || isFuture(dob);
    });
  }, [data.heirs]);

  const hasInvalidHeir = invalidHeirs.length > 0;
  const hasNoHeirs = data.heirs.length === 0;
  const hasNegativeNet = net < 0;

  const adjustment = result?.adjustment ?? defaultCalculationAdjustment;
  const adjustmentColors = adjustmentTheme(adjustment.type);

  async function handleCalculate() {
    setLoading(true);
    setError("");
    setResult(null);
    setSavedCase(null);
    clearCalculationResult();

    try {
      const payload = {
        deceased_gender: data.deceasedGender,
        reference_mode: data.referenceMode,
        madhhab: data.madhhab,
        estate: {
          total: data.estate.total,
          debts: data.estate.debts,
          will: data.estate.will,
          funeral: data.estate.funeral,
          assets: data.estate.assets.map((asset) => ({
            type: asset.type,
            value: asset.value,
            description: asset.description,
            custom_type: asset.customType,
          })),
        },
        heirs: data.heirs.map((h) => ({
          id: h.id,
          role: h.role,
          name: h.name,
          dob: h.dob,
        })),
      };

      const response = await fetch(`${API_BASE}/cases/compute-and-save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("تعذر الاتصال بمحرك الحساب.");
      }

      const json: SavedCaseResponse = await response.json();

      setSavedCase(json);
      setResult(json.result);
      setCalculationResult(json.result);

      sessionStorage.setItem("mirathi-latest-result", JSON.stringify(json.result));
      sessionStorage.setItem("mirathi-latest-saved-case", JSON.stringify(json));
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع.");
      clearCalculationResult();
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPDF() {
    if (!result) return;

    setPdfLoading(true);
    setError("");

    try {
      await exportMirathiPDFByElement("mirathi-result-export");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إنشاء ملف PDF.");
    } finally {
      setPdfLoading(false);
    }
  }

  function handleClearInputs() {
    reset();
    clearCalculationResult();
    setResult(null);
    setError("");
    setSavedCase(null);
    sessionStorage.removeItem("mirathi-latest-result");
    sessionStorage.removeItem("mirathi-latest-saved-case");
  }

  function handlePrint() {
    window.print();
  }

  return (
    <PageShell
      title="مراجعةُ البيانات"
      subtitle="راجع جميع البيانات قبل تنفيذ الحسبة النهائية، ثم انتقل إلى النتيجة أو قم بتصدير التقرير."
    >
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 14mm;
          }

          body {
            background: #ffffff !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .print-hide {
            display: none !important;
          }

          .print-only-result {
            box-shadow: none !important;
            border: none !important;
          }

          .print-only-result section {
            break-inside: avoid;
            page-break-inside: avoid;
            box-shadow: none !important;
          }

          table {
            width: 100% !important;
            min-width: 100% !important;
          }

          th,
          td {
            font-size: 12px !important;
          }
        }
      `}</style>

      <div className="print-hide">
        <Stepper current={4} />
      </div>

      <div className="space-y-5 print-hide">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                خطوة المراجعة النهائية
              </div>

              <h2 className="mt-4 text-xl font-black text-slate-900">
                نظرة عامة قبل الحساب
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                تأكد من صحة بيانات التركة والورثة والمرجعية المختارة قبل تشغيل
                محرك الحساب، لأن النتيجة ستُبنى بالكامل على هذه البيانات.
              </p>
            </div>

            <div className="grid min-w-[260px] gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold text-slate-500">عدد الورثة</div>
                <div className="mt-1 text-base font-black text-slate-900">
                  {data.heirs.length}
                </div>
              </div>

              <div
                className={[
                  "rounded-3xl border p-4",
                  hasInvalidHeir || hasNegativeNet || hasNoHeirs
                    ? "border-amber-200 bg-amber-50"
                    : "border-emerald-200 bg-emerald-50",
                ].join(" ")}
              >
                <div className="text-xs font-bold text-slate-500">حالة المراجعة</div>
                <div
                  className={[
                    "mt-1 text-base font-black",
                    hasInvalidHeir || hasNegativeNet || hasNoHeirs
                      ? "text-amber-900"
                      : "text-emerald-800",
                  ].join(" ")}
                >
                  {hasInvalidHeir || hasNegativeNet || hasNoHeirs
                    ? "تحتاج انتباه"
                    : "جاهزة للحساب"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {(hasInvalidHeir || hasNegativeNet || hasNoHeirs) && (
          <section className="rounded-[32px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-white p-2">
                <AlertTriangle className="h-5 w-5 text-amber-700" />
              </div>

              <div className="flex-1">
                <h2 className="text-lg font-black text-amber-900">تنبيهات قبل الحساب</h2>

                <div className="mt-3 space-y-2 text-sm leading-8 text-amber-900">
                  {hasNoHeirs ? <div>لم يتم إضافة أي وارث حتى الآن.</div> : null}
                  {hasInvalidHeir ? (
                    <div>
                      يوجد بعض الورثة ببيانات ناقصة أو تاريخ ميلاد غير صحيح.
                    </div>
                  ) : null}
                  {hasNegativeNet ? (
                    <div>
                      صافي التركة أقل من صفر، راجع الديون والوصية والمصاريف.
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/case/heirs")}
                    className="rounded-2xl border border-amber-200 bg-white px-5 py-3 font-bold text-amber-900 shadow-sm hover:bg-amber-100"
                  >
                    تعديل الورثة
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/case/estate")}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-800 shadow-sm hover:bg-slate-50"
                  >
                    تعديل التركة
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-800">
              <Scale className="h-4 w-4" />
              بيانات أساسية
            </div>

            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
              <div>
                <span className="font-black text-slate-900">جنس المتوفى:</span>{" "}
                {data.deceasedGender === "male" ? "ذَكَر" : "أُنثى"}
              </div>
              <div>
                <span className="font-black text-slate-900">المرجع:</span>{" "}
                {data.referenceMode === "uae_law"
                  ? "القانون الإماراتي"
                  : "الفقه الإسلامي"}
              </div>
              <div>
                <span className="font-black text-slate-900">المذهب:</span>{" "}
                {data.referenceMode === "uae_law"
                  ? "عام"
                  : data.madhhab === "general"
                  ? "عام"
                  : data.madhhab === "hanafi"
                  ? "الحنفي"
                  : data.madhhab === "maliki"
                  ? "المالكي"
                  : data.madhhab === "shafii"
                  ? "الشافعي"
                  : "الحنبلي"}
              </div>
              <div>
                <span className="font-black text-slate-900">عدد الورثة:</span>{" "}
                {data.heirs.length}
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800">
              <Wallet className="h-4 w-4" />
              التركة
            </div>

            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
              <div>
                <span className="font-black text-slate-900">الإجمالي:</span>{" "}
                {data.estate.total}
              </div>
              <div>
                <span className="font-black text-slate-900">الديون:</span>{" "}
                {data.estate.debts}
              </div>
              <div>
                <span className="font-black text-slate-900">الوصية:</span>{" "}
                {data.estate.will}
              </div>
              <div>
                <span className="font-black text-slate-900">التجهيز والدفن:</span>{" "}
                {data.estate.funeral}
              </div>

              <div
                className={[
                  "mt-4 rounded-2xl p-4 font-black",
                  hasNegativeNet
                    ? "bg-red-50 text-red-800"
                    : "bg-emerald-50 text-emerald-800",
                ].join(" ")}
              >
                صافي التركة التقريبي: {net}
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
            <h2 className="text-xl font-black text-slate-900">تفصيل الممتلكات</h2>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {data.estate.assets.length ? (
                data.estate.assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
                  >
                    <div className="font-black text-slate-900">
                      {assetTypeLabel(asset.type, asset.customType)}
                    </div>
                    <div className="mt-1">{asset.description || "بدون وصف"}</div>
                    <div className="mt-2 font-bold">القيمة: {asset.value}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500 md:col-span-2">
                  لم يتم إدخال ممتلكات تفصيلية.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900">الوَرَثة</h2>
                <p className="mt-1 text-sm text-slate-600">
                  راجع بيانات جميع الورثة قبل تنفيذ الحسبة.
                </p>
              </div>

              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-700">
                العدد الحالي: {data.heirs.length}
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {data.heirs.length ? (
                data.heirs.map((h) => {
                  const dob = parseISODate(h.dob);
                  const age = dob && !isFuture(dob) ? calcAgeYears(dob) : null;
                  const status =
                    age === null ? "غير مكتمل" : age >= 18 ? "بالغ" : "قاصر";
                  const invalid =
                    !h.name.trim() || !h.dob || !dob || isFuture(dob);

                  return (
                    <div
                      key={h.id}
                      className={[
                        "rounded-2xl border p-4",
                        invalid
                          ? "border-amber-200 bg-amber-50"
                          : "border-slate-200 bg-slate-50",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-black text-slate-900">
                          {h.name.trim() || "بدون اسم"}
                        </div>

                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                          {roleLabel(h.role)}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1 text-sm text-slate-700">
                        <div>
                          <span className="font-black text-slate-900">الميلاد:</span>{" "}
                          {h.dob ? formatDate(h.dob) : "—"}
                        </div>
                        <div>
                          <span className="font-black text-slate-900">العمر:</span>{" "}
                          {age === null ? "—" : `${age} سنة`}
                        </div>
                        <div>
                          <span className="font-black text-slate-900">الحالة:</span>{" "}
                          {status}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500 md:col-span-2">
                  لم يتم إدخال ورثة.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
            <h2 className="text-xl font-black text-slate-900">ملاحظات قبل الحساب</h2>

            <div className="mt-4 space-y-2 text-sm leading-8 text-slate-700">
              <div>راجع جميع البيانات جيدًا قبل تنفيذ الحسبة النهائية.</div>
              <div>تأكد من إدخال الورثة المستحقين وعدم ترك بيانات ناقصة.</div>
              <div>يفضّل مراجعة الحالات الخاصة والمعقدة قبل اعتماد النتيجة.</div>
            </div>
          </section>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            رجوع
          </button>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCalculate}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-6 py-3 font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Calculator className="h-4 w-4" />
              {loading ? "جاري الحساب..." : "احسب الأنصبة"}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <section className="mt-6 rounded-[28px] border border-red-200 bg-red-50 p-5">
          <h2 className="text-lg font-black text-red-900">خطأ</h2>
          <p className="mt-2 text-sm text-red-800">{error}</p>
        </section>
      ) : null}

      {result ? (
        <div
          id="mirathi-result-export"
          className="print-only-result mt-6 space-y-4 rounded-[32px] bg-white p-2"
        >
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                  Mirathi Report
                </div>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  تقرير توزيع التركة
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                  هذا التقرير يوضح نتيجة احتساب الأنصبة الشرعية بناءً على
                  البيانات المدخلة، مع بيان حالة المسألة والورثة المستحقين وأي
                  معالجة نهائية مثل العَول أو الرَّد.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 md:min-w-[320px]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">تاريخ التقرير</div>
                  <div className="mt-1 text-sm font-black text-slate-900">
                    {new Date().toLocaleDateString("ar-EG")}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">نوع المتوفى</div>
                  <div className="mt-1 text-sm font-black text-slate-900">
                    {data.deceasedGender === "male" ? "ذَكَر" : "أُنثى"}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">المرجع</div>
                  <div className="mt-1 text-sm font-black text-slate-900">
                    {data.referenceMode === "uae_law"
                      ? "القانون الإماراتي"
                      : "الفقه الإسلامي"}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">المذهب</div>
                  <div className="mt-1 text-sm font-black text-slate-900">
                    {data.referenceMode === "uae_law"
                      ? "عام"
                      : data.madhhab === "general"
                      ? "عام"
                      : data.madhhab === "hanafi"
                      ? "الحنفي"
                      : data.madhhab === "maliki"
                      ? "المالكي"
                      : data.madhhab === "shafii"
                      ? "الشافعي"
                      : "الحنبلي"}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">عدد الورثة</div>
                  <div className="mt-1 text-sm font-black text-slate-900">
                    {result.shares.length + result.blocked.length}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">صافي التركة</div>
                  <div className="mt-1 text-sm font-black text-emerald-700">
                    {result.estate?.net_estate ?? 0}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {result.is_valid ? (
            <>
              <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black text-slate-900">ملخص النتيجة</h2>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-bold text-slate-500">حالة النتيجة</div>
                    <div className="mt-1 text-base font-black text-emerald-700">
                      صالحة للحساب
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-bold text-slate-500">أصحاب الأنصبة</div>
                    <div className="mt-1 text-base font-black text-slate-900">
                      {result.shares.length}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-bold text-slate-500">
                      الورثة المحجوبون
                    </div>
                    <div className="mt-1 text-base font-black text-slate-900">
                      {result.blocked.length}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="text-xs font-bold text-emerald-700">صافي التركة</div>
                    <div className="mt-1 text-base font-black text-emerald-800">
                      {result.estate?.net_estate ?? 0}
                    </div>
                  </div>
                </div>
              </section>

              <section
                className={`rounded-[32px] border p-5 shadow-sm ${adjustmentColors.wrap}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className={`text-lg font-black ${adjustmentColors.title}`}>
                    المعالجة النهائية للمسألة
                  </h2>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black ${adjustmentColors.badge}`}
                  >
                    {adjustmentTitle(adjustment.type)}
                  </span>
                </div>

                <div className={`mt-3 text-sm leading-8 ${adjustmentColors.text}`}>
                  {adjustment.applied
                    ? adjustment.explanation ||
                      "تم تطبيق معالجة على المسألة بعد الحساب الأساسي."
                    : "لم تحتج هذه المسألة إلى عَول أو رَد، وتم توزيع الأنصبة مباشرة بحسب القواعد المطبقة."}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                    <div className="text-xs font-bold text-slate-500">نوع المعالجة</div>
                    <div className="mt-1 font-black text-slate-900">
                      {adjustmentTitle(adjustment.type)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                    <div className="text-xs font-bold text-slate-500">
                      مجموع الأنصبة قبل المعالجة
                    </div>
                    <div className="mt-1 font-black text-slate-900">
                      {adjustment.shares_total_before}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                    <div className="text-xs font-bold text-slate-500">
                      مجموع الأنصبة بعد المعالجة
                    </div>
                    <div className="mt-1 font-black text-slate-900">
                      {adjustment.shares_total_after}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                    <div className="text-xs font-bold text-slate-500">
                      الباقي قبل المعالجة
                    </div>
                    <div className="mt-1 font-black text-slate-900">
                      {adjustment.remaining_before}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                    <div className="text-xs font-bold text-slate-500">
                      الباقي بعد المعالجة
                    </div>
                    <div className="mt-1 font-black text-slate-900">
                      {adjustment.remaining_after}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                    <div className="text-xs font-bold text-slate-500">معامل التعديل</div>
                    <div className="mt-1 font-black text-slate-900">
                      {adjustment.ratio}
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : null}

          {!result.is_valid ? (
            <section className="rounded-[32px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <h2 className="text-lg font-black text-amber-900">مشكلات في الإدخال</h2>
              <div className="mt-3 space-y-2 text-sm text-amber-900">
                {result.validation_issues.map((issue, index) => (
                  <div key={index}>- {issue.message}</div>
                ))}
              </div>
            </section>
          ) : null}

          {result.estate ? (
            <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">نتيجة تصفية التركة</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">إجمالي التركة</div>
                  <div className="mt-1 text-xl font-black text-slate-900">
                    {result.estate.gross_estate}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">الوصية المسموح بها</div>
                  <div className="mt-1 text-xl font-black text-slate-900">
                    {result.estate.allowed_will}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-xs font-bold text-emerald-700">صافي التركة</div>
                  <div className="mt-1 text-xl font-black text-emerald-800">
                    {result.estate.net_estate}
                  </div>
                </div>
              </div>

              {result.estate.notes.length ? (
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  {result.estate.notes.map((note, index) => (
                    <div key={index}>- {note}</div>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {result.shares.length ? (
            <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">الأنصبة الشرعية</h2>

              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[820px] border-collapse text-sm md:text-base">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800">
                      <th className="whitespace-nowrap p-4 text-right font-black">الوارث</th>
                      <th className="whitespace-nowrap p-4 text-right font-black">الصفة</th>
                      <th className="whitespace-nowrap p-4 text-right font-black">
                        نوع النصيب
                      </th>
                      <th className="whitespace-nowrap p-4 text-right font-black">الكسر</th>
                      <th className="whitespace-nowrap p-4 text-right font-black">النسبة</th>
                      <th className="whitespace-nowrap p-4 text-right font-black">المبلغ</th>
                      <th className="whitespace-nowrap p-4 text-right font-black">السبب</th>
                    </tr>
                  </thead>

                  <tbody>
                    {result.shares.map((share) => (
                      <tr
                        key={share.heir_id}
                        className="border-t border-slate-200 align-top hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap p-4 font-black text-slate-900">
                          {share.name}
                        </td>

                        <td className="whitespace-nowrap p-4">
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 md:text-sm">
                            {roleLabel(share.role)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap p-4">
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 md:text-sm">
                            {shareTypeLabel(share.share_type)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap p-4 font-black text-slate-900">
                          {formatFraction(share.share_type, share.fraction)}
                        </td>

                        <td className="whitespace-nowrap p-4 font-bold text-slate-800">
                          {share.percentage}%
                        </td>

                        <td className="whitespace-nowrap p-4 font-black text-emerald-700">
                          {share.amount}
                        </td>

                        <td className="min-w-[260px] p-4 leading-7 text-slate-600">
                          {share.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {result.blocked.length ? (
            <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">الورثة المحجوبون</h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {result.blocked.map((item) => (
                  <div
                    key={item.heir_id}
                    className="rounded-2xl border border-red-200 bg-red-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-base font-black text-red-900">{item.name}</div>

                      <span className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-bold text-red-700">
                        محجوب
                      </span>
                    </div>

                    <div className="mt-3 space-y-1 text-sm text-red-900">
                      <div>
                        <span className="font-black">الصفة:</span>{" "}
                        {roleLabel(item.role)}
                      </div>

                      <div>
                        <span className="font-black">سبب الحجب:</span>{" "}
                        {item.reason}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {result.notes.length ? (
            <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">ملاحظات المحرك</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {result.notes.map((note, index) => (
                  <div key={index}>- {note}</div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {result?.is_valid ? (
        <div className="mt-8 flex flex-wrap items-center justify-end gap-3 print-hide">
          <button
            type="button"
            onClick={() =>
              router.push(
                savedCase?.meta.case_id
                  ? `/case/result?caseId=${savedCase.meta.case_id}`
                  : "/case/result"
              )
            }
            className="rounded-2xl bg-emerald-700 px-6 py-3 font-bold text-white shadow-sm transition hover:bg-emerald-800"
          >
            فتح صفحة النتيجة
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={pdfLoading}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileDown className="h-4 w-4" />
            {pdfLoading ? "جاري تجهيز PDF..." : "تحميل التقرير PDF"}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            طباعة الحسبة
          </button>

          <button
            type="button"
            onClick={handleClearInputs}
            className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-6 py-3 font-bold text-red-700 shadow-sm transition hover:bg-red-100"
          >
            <RefreshCcw className="h-4 w-4" />
            امسح المدخلات
          </button>

          <Link
            href="/case/explanation"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            <FileText className="h-4 w-4" />
            شرح المسألة
          </Link>
        </div>
      ) : null}
    </PageShell>
  );
}