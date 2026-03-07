"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Scale,
  Share2,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";

import PageShell from "@/components/PageShell";
import Stepper from "@/components/Stepper";
import { exportMirathiPDFByElement } from "@/lib/pdf";
import {
  HEIR_OPTIONS,
  defaultCalculationAdjustment,
  type SavedCaseResponse,
  type CalculationResponse,
  type HeirRole,
  type CalculationAdjustmentType,
  type CalculationShareType,
} from "@/lib/case-schema";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

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

function formatDate(dateString?: string) {
  if (!dateString) return "—";

  try {
    return new Date(dateString).toLocaleString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export default function ResultPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const caseId = searchParams.get("caseId");

  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const [error, setError] = useState("");
  const [savedCase, setSavedCase] = useState<SavedCaseResponse | null>(null);
  const [result, setResult] = useState<CalculationResponse | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

      try {
        if (caseId) {
          const response = await fetch(`${API_BASE}/cases/${caseId}`);
          if (!response.ok) {
            throw new Error("تعذر تحميل المسألة من رابط المشاركة.");
          }

          const json: SavedCaseResponse = await response.json();
          setSavedCase(json);
          setResult(json.result);

          sessionStorage.setItem(
            "mirathi-latest-result",
            JSON.stringify(json.result)
          );
          sessionStorage.setItem(
            "mirathi-latest-saved-case",
            JSON.stringify(json)
          );
        } else {
          const rawCase = sessionStorage.getItem("mirathi-latest-saved-case");
          const rawResult = sessionStorage.getItem("mirathi-latest-result");

          if (rawCase) {
            const parsedCase = JSON.parse(rawCase) as SavedCaseResponse;
            setSavedCase(parsedCase);
            setResult(parsedCase.result);
          } else if (rawResult) {
            const parsedResult = JSON.parse(rawResult) as CalculationResponse;
            setResult(parsedResult);
          } else {
            throw new Error("لا توجد نتيجة محفوظة لعرضها.");
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [caseId]);

  const shares = useMemo(() => result?.shares ?? [], [result]);
  const blocked = useMemo(() => result?.blocked ?? [], [result]);
  const adjustment = result?.adjustment ?? defaultCalculationAdjustment;
  const adjustmentColors = adjustmentTheme(adjustment.type);

  async function handleExportPDF() {
    if (!result) return;

    setPdfLoading(true);
    setError("");

    try {
      await exportMirathiPDFByElement(
        "mirathi-result-export",
        savedCase?.meta.case_id
          ? `mirathi-case-${savedCase.meta.case_id}.pdf`
          : "mirathi-report.pdf"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إنشاء ملف PDF.");
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleCopyLink() {
    if (!savedCase?.meta.share_url) return;

    try {
      await navigator.clipboard.writeText(savedCase.meta.share_url);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      setError("تعذر نسخ رابط المشاركة.");
    }
  }

  return (
    <PageShell
      title="النتيجة النهائية"
      subtitle="عرض توزيع التركة، مراجعة الأنصبة، مشاركة المسألة، وتصدير التقرير."
    >
      <Stepper current={5} />

      {loading ? (
        <section className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <FileText className="h-6 w-6 text-emerald-700" />
          </div>
          <div className="mt-4 text-lg font-black text-slate-900">
            جارٍ تحميل النتيجة...
          </div>
          <p className="mt-2 text-sm text-slate-600">
            يتم الآن تجهيز بيانات المسألة والأنصبة المعروضة.
          </p>
        </section>
      ) : null}

      {error ? (
        <section className="rounded-[28px] border border-red-200 bg-red-50 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-white p-2">
              <AlertTriangle className="h-5 w-5 text-red-700" />
            </div>

            <div className="flex-1">
              <div className="text-lg font-black text-red-900">
                تعذر عرض النتيجة
              </div>
              <div className="mt-2 text-sm leading-7 text-red-800">{error}</div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/case/review")}
                  className="rounded-2xl border border-red-200 bg-white px-5 py-3 font-bold text-red-900 shadow-sm hover:bg-red-50"
                >
                  العودة إلى المراجعة
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/case/start")}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-800 shadow-sm hover:bg-slate-50"
                >
                  بدء مسألة جديدة
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {!loading && result && !result.is_valid ? (
        <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-white p-2">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
            </div>

            <div className="flex-1">
              <div className="text-lg font-black text-amber-900">
                تعذر اعتماد هذه المسألة
              </div>
              <p className="mt-2 text-sm leading-7 text-amber-900">
                توجد مشكلة في بيانات المسألة الحالية أو أن النتيجة غير صالحة
                للعرض.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/case/review")}
                  className="rounded-2xl border border-amber-200 bg-white px-5 py-3 font-bold text-amber-900 shadow-sm hover:bg-amber-100"
                >
                  العودة إلى المراجعة
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/case/start")}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-800 shadow-sm hover:bg-slate-50"
                >
                  بدء مسألة جديدة
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {!loading && result?.is_valid ? (
        <div id="mirathi-result-export" className="space-y-5">
          <section className="overflow-hidden rounded-[32px] border border-emerald-200 bg-white shadow-sm">
            <div className="border-b border-emerald-100 bg-gradient-to-l from-emerald-50 to-white px-6 py-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-black text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" />
                    تم احتساب المسألة بنجاح
                  </div>

                  <h2 className="mt-4 text-2xl font-black text-slate-900">
                    ملخص المسألة
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                    هذه النتيجة تعرض توزيع التركة وفق البيانات المدخلة، مع بيان
                    الأنصبة، والمحجوبين، وأثر العَول أو الرَّد إن وُجد.
                  </p>
                </div>

                <div className="min-w-[250px] rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-bold text-slate-500">
                    رقم المسألة
                  </div>
                  <div className="mt-1 text-base font-black text-slate-900">
                    {savedCase?.meta.case_id ?? "غير محفوظة"}
                  </div>

                  <div className="mt-4 text-xs font-bold text-slate-500">
                    تاريخ الحفظ
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-800">
                    {formatDate(savedCase?.meta.created_at)}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-500">
                      حالة المسألة
                    </div>
                    <div className="mt-1 text-base font-black text-emerald-700">
                      صالحة للحساب
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <Users className="h-5 w-5 text-slate-700" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-500">
                      عدد المستحقين
                    </div>
                    <div className="mt-1 text-base font-black text-slate-900">
                      {shares.length}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <XCircle className="h-5 w-5 text-red-700" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-500">
                      عدد المحجوبين
                    </div>
                    <div className="mt-1 text-base font-black text-slate-900">
                      {blocked.length}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <Wallet className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-700">
                      صافي التركة
                    </div>
                    <div className="mt-1 text-base font-black text-emerald-800">
                      {result.estate?.net_estate ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  أدوات المشاركة والتصدير
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  يمكنك نسخ رابط المسألة لمشاركته، أو تنزيل تقرير PDF للاحتفاظ
                  به أو طباعته.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {savedCase?.meta.share_url ? (
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
                  >
                    <Copy className="h-4 w-4" />
                    {copyDone ? "تم نسخ الرابط" : "نسخ رابط المشاركة"}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleExportPDF}
                  disabled={pdfLoading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  {pdfLoading ? "جارٍ إنشاء PDF..." : "تنزيل PDF"}
                </button>
              </div>
            </div>

            {savedCase?.meta.share_url ? (
              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-800">
                  <Share2 className="h-4 w-4" />
                  رابط المشاركة
                </div>
                <div className="overflow-x-auto rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
                  {savedCase.meta.share_url}
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  جدول الأنصبة
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  يوضح الجدول الوارث، ونوع الاستحقاق، والنصيب الشرعي، والنسبة،
                  والمبلغ المستحق لكل وارث.
                </p>
              </div>

              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800">
                إجمالي المستحقين: {shares.length}
              </div>
            </div>

            <div className="mt-5 overflow-x-auto rounded-3xl border border-slate-200">
              <table className="min-w-full bg-white">
                <thead className="bg-slate-100">
                  <tr className="text-right">
                    <th className="px-4 py-4 text-sm font-black text-slate-900">
                      الوارث
                    </th>
                    <th className="px-4 py-4 text-sm font-black text-slate-900">
                      الصفة
                    </th>
                    <th className="px-4 py-4 text-sm font-black text-slate-900">
                      النوع
                    </th>
                    <th className="px-4 py-4 text-sm font-black text-slate-900">
                      النصيب
                    </th>
                    <th className="px-4 py-4 text-sm font-black text-slate-900">
                      النسبة
                    </th>
                    <th className="px-4 py-4 text-sm font-black text-slate-900">
                      المبلغ
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {shares.map((share, index) => (
                    <tr
                      key={share.heir_id}
                      className={`border-t border-slate-200 ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                      }`}
                    >
                      <td className="px-4 py-4 text-sm font-black text-slate-900">
                        {share.name}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700">
                        {roleLabel(share.role)}
                      </td>

                      <td className="px-4 py-4 text-sm">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-bold text-slate-700">
                          {shareTypeLabel(share.share_type)}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm font-bold text-slate-800">
                        {formatFraction(share.share_type, share.fraction)}
                      </td>

                      <td className="px-4 py-4 text-sm font-bold text-slate-700">
                        {share.percentage}%
                      </td>

                      <td className="px-4 py-4 text-sm font-black text-emerald-700">
                        {share.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section
            className={`rounded-[32px] border p-6 shadow-sm ${adjustmentColors.wrap}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black ${adjustmentColors.badge}`}
                >
                  <Scale className="h-4 w-4" />
                  {adjustmentTitle(adjustment.type)}
                </div>

                <h2 className={`mt-4 text-xl font-black ${adjustmentColors.title}`}>
                  العَول أو الرَّد
                </h2>

                <p className={`mt-3 text-sm leading-8 ${adjustmentColors.text}`}>
                  {adjustment.applied
                    ? adjustment.explanation
                    : "لم تحتج هذه المسألة إلى عَول أو رَد في الحساب الحالي."}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold text-slate-500">النوع</div>
                <div className="mt-2 text-base font-black text-slate-900">
                  {adjustmentTitle(adjustment.type)}
                </div>
              </div>

              <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold text-slate-500">
                  قبل المعالجة
                </div>
                <div className="mt-2 text-base font-black text-slate-900">
                  {adjustment.shares_total_before}
                </div>
              </div>

              <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold text-slate-500">
                  بعد المعالجة
                </div>
                <div className="mt-2 text-base font-black text-slate-900">
                  {adjustment.shares_total_after}
                </div>
              </div>
            </div>
          </section>

          {blocked.length ? (
            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    الورثة المحجوبون
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    يوضح هذا القسم من لم يستحق من الورثة في هذه المسألة، مع بيان
                    سبب الحجب.
                  </p>
                </div>

                <div className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-800">
                  عدد المحجوبين: {blocked.length}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {blocked.map((item) => (
                  <div
                    key={item.heir_id}
                    className="rounded-3xl border border-red-200 bg-red-50 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-black text-red-900">
                          {item.name}
                        </div>
                        <div className="mt-1 text-sm font-bold text-red-800">
                          {roleLabel(item.role)}
                        </div>
                      </div>

                      <span className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-black text-red-700">
                        محجوب
                      </span>
                    </div>

                    <div className="mt-4 rounded-2xl bg-white/70 p-4 text-sm leading-8 text-red-900">
                      {item.reason}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="rounded-[32px] border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-white p-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                </div>

                <div>
                  <h2 className="text-lg font-black text-emerald-900">
                    لا يوجد ورثة محجوبون
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-emerald-900">
                    وفق البيانات الحالية، لم يظهر في هذه المسألة وارث محجوب عن
                    الاستحقاق.
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="rounded-[32px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-white p-2">
                <AlertTriangle className="h-5 w-5 text-amber-700" />
              </div>

              <div>
                <h2 className="text-lg font-black text-amber-900">
                  تنبيه شرعي وقانوني مهم
                </h2>
                <p className="mt-2 text-sm leading-8 text-amber-900">
                  هذه النتيجة أداة مساعدة مبنية على البيانات المدخلة، ولا تُعد
                  بديلًا عن المراجعة لدى مختص شرعي أو قانوني أو الجهة القضائية
                  المختصة، خاصة في المسائل المركبة أو المختلف في توصيفها أو التي
                  تتعلق بها مستندات ووقائع خاصة.
                </p>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push("/case/start")}
              className="rounded-2xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              بدء مسألة جديدة
            </button>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/case/explanation")}
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                شرح المسألة
              </button>

              <button
                type="button"
                onClick={() => router.push("/case/review")}
                className="rounded-2xl bg-emerald-700 px-6 py-3 font-bold text-white shadow-sm transition hover:bg-emerald-800"
              >
                العودة إلى المراجعة
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}