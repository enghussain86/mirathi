"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  FileText,
  Gavel,
  Info,
  Printer,
  Scale,
} from "lucide-react";

import PageShell from "@/components/PageShell";
import Stepper from "@/components/Stepper";
import {
  HEIR_OPTIONS,
  defaultCalculationAdjustment,
  type CalculationResponse,
  type CalculationAdjustmentType,
  type CalculationShareType,
  type HeirRole,
} from "@/lib/case-schema";

type ReferenceMode = "uae_law" | "fiqh";
type Madhhab = "general" | "hanafi" | "maliki" | "shafii" | "hanbali";

type StoredCaseMeta = {
  reference_mode?: ReferenceMode;
  madhhab?: Madhhab;
  [key: string]: unknown;
};

type StoredCase = {
  meta?: StoredCaseMeta;
  [key: string]: unknown;
};

const LEGAL_REFERENCES = [
  {
    article: "200",
    title: "تعريف التركة",
    summary:
      "التركة هي ما يخلّفه الميت من أموال وحقوق مالية تدخل في التقسيم بعد استيفاء ما يتعلق بها من حقوق.",
    note: "يفيد هذا التعريف في فهم ما يدخل أصلًا ضمن محل القسمة.",
    url: "https://uaelegislation.gov.ae/ar/legislations/2770",
  },
  {
    article: "201",
    title: "ترتيب الحقوق المتعلقة بالتركة",
    summary:
      "يبدأ النظر في الحقوق المتعلقة بالتركة قبل التوزيع، ثم يُقسم الباقي على الورثة بعد استيفاء ما يسبق الإرث.",
    note: "ولهذا يعرض النظام صافي التركة بعد الديون والوصية والمصاريف.",
    url: "https://uaelegislation.gov.ae/ar/legislations/2770",
  },
  {
    article: "205",
    title: "حالات لا توارث فيها",
    summary:
      "لا توارث مع اختلاف الدين، ولا توارث بين من ماتوا في وقت واحد إذا لم يُعلم السابق وفاةً.",
    note: "هذه من الحالات التي تمنع التوارث قانونًا.",
    url: "https://uaelegislation.gov.ae/ar/legislations/2770",
  },
  {
    article: "206",
    title: "أشكال الميراث",
    summary:
      "الإرث يكون بالفرض أو بالتعصيب أو بهما معًا أو بالرحم، والفرض نصيب مقدر، والتعصيب نصيب غير مقدر.",
    note: "هذا يفسر ظهور ألفاظ مثل: فرض، تعصيب، فرض + تعصيب داخل النتيجة.",
    url: "https://uaelegislation.gov.ae/ar/legislations/2770",
  },
  {
    article: "209",
    title: "الفروض",
    summary:
      "الفروض المذكورة في القانون هي: النصف، الربع، الثمن، الثلثان، الثلث، السدس.",
    note: "وهي الكسور الأساسية التي يظهر بها نصيب عدد من الورثة.",
    url: "https://uaelegislation.gov.ae/ar/legislations/2770",
  },
  {
    article: "210",
    title: "أصحاب الفروض",
    summary:
      "حدد القانون أصحاب الفروض، ومنهم الزوج والزوجة والأب والأم والبنت وبنت الابن والأخ أو الأخت لأم وغيرهم.",
    note: "هذا القسم مهم لفهم من له نصيب مقدر أصلًا.",
    url: "https://uaelegislation.gov.ae/ar/legislations/2770",
  },
  {
    article: "211",
    title: "إرث الزوج",
    summary:
      "يرث الزوج النصف عند عدم وجود فرع وارث للزوجة، ويرث الربع عند وجوده.",
    note: "ولهذا يتغير نصيبه تلقائيًا بحسب وجود الأبناء أو عدمهم.",
    url: "https://uaelegislation.gov.ae/ar/legislations/2770",
  },
  {
    article: "212",
    title: "إرث الزوجة",
    summary:
      "ترث الزوجة الربع عند عدم وجود فرع وارث للزوج، وترث الثمن عند وجوده، وتشترك الزوجات عند التعدد.",
    note: "وهذا يفسر انتقال النصيب بين الربع والثمن في المسائل الزوجية.",
    url: "https://uaelegislation.gov.ae/ar/legislations/2770",
  },
  {
    article: "213",
    title: "إرث الأب",
    summary:
      "قد يرث الأب السدس فرضًا، أو السدس مع الباقي تعصيبًا، أو يأخذ التركة تعصيبًا بحسب تركيبة الورثة.",
    note: "لذلك يظهر أحيانًا للأب: فرض، أو فرض + تعصيب.",
    url: "https://uaelegislation.gov.ae/ar/legislations/2770",
  },
  {
    article: "215",
    title: "إرث الأم",
    summary:
      "ترث الأم السدس مع وجود فرع وارث أو جمع من الإخوة، وترث الثلث عند عدم ذلك، وقد ترث ثلث الباقي في بعض الصور.",
    note: "هذه المادة تفسر تغير نصيب الأم بين السدس والثلث.",
    url: "https://uaelegislation.gov.ae/ar/legislations/2770",
  },
  {
    article: "217",
    title: "إرث البنت",
    summary:
      "ترث البنت الواحدة النصف، والبنتان فأكثر الثلثين إذا لم يوجد ابن، وتكون مع الابن عصبة للذكر مثل حظ الأنثيين.",
    note: "هذه من أكثر المواد حضورًا في المسائل العملية.",
    url: "https://uaelegislation.gov.ae/ar/legislations/2770",
  },
  {
    article: "223-224",
    title: "الحجب من الميراث",
    summary:
      "بيّن القانون معنى الحجب وبعض حالاته، ولذلك قد يظهر بعض الورثة في النتيجة على أنهم محجوبون.",
    note: "قسم المحجوبين في التطبيق يعتمد على هذا الأصل.",
    url: "https://uaelegislation.gov.ae/ar/legislations/2770",
  },
] as const;

const QURAN_REFERENCES = [
  {
    verse: "النساء 4:11",
    title: "أنصبة الأولاد والأبوين",
    summary:
      "هذه الآية أصل مركزي في بيان نصيب الأولاد، ونصيب الأبوين، وتقديم أحكام مفصلية في باب المواريث.",
    hint: "من أشهر ما يستفاد منها: للذكر مثل حظ الأنثيين في الأولاد عند الاجتماع.",
    url: "https://quran.com/4?startingVerse=11",
  },
  {
    verse: "النساء 4:12",
    title: "أنصبة الزوجين والإخوة لأم",
    summary:
      "هذه الآية أصل في بيان ميراث الزوج والزوجة، وبعض صور الكلالة، وميراث الإخوة لأم.",
    hint: "هي من أهم النصوص التي تُبنى عليها مسائل الزوجين والكلالة.",
    url: "https://quran.com/4?startingVerse=12",
  },
  {
    verse: "النساء 4:176",
    title: "الكلالة والإخوة",
    summary:
      "هذه الآية تتعلق بمسائل الكلالة، وتفصيل بعض أحكام الإخوة والأخوات عند عدم وجود الأصول والفروع المباشرين.",
    hint: "تظهر أهميتها في مسائل الأخوات والإخوة مع عدم الولد والأب.",
    url: "https://quran.com/4?startingVerse=176",
  },
] as const;

const FIQH_NOTES = [
  {
    title: "تعريف علم الفرائض",
    body: "هو العلم الذي يُعرف به من يرث، ومن لا يرث، ومقدار ما لكل وارث.",
  },
  {
    title: "الترتيب قبل القسمة",
    body: "الأصل أن ينظر أولًا في الحقوق المتعلقة بالتركة، ثم يُقسم الباقي على المستحقين.",
  },
  {
    title: "الحجب",
    body: "قد يحجب بعض الورثة بعضًا حجب حرمان أو نقصان بحسب درجة القرابة وترتيبها.",
  },
  {
    title: "التعصيب",
    body: "التعصيب يعني أخذ الباقي بعد أصحاب الفروض، أو المشاركة على وجه مخصوص في بعض الصور.",
  },
  {
    title: "اختلاف المذاهب",
    body: "بعض التفاصيل الفقهية قد تختلف بين المذاهب، لذلك فهذه الصفحة تعرض أصولًا عامة لا جميع التفريعات المقارنة.",
  },
] as const;

const SUNNAH_NOTE = {
  title: "بخصوص السنة النبوية في هذه الصفحة",
  body:
    "في هذه النسخة من التطبيق لا نثبت أحاديث تفصيلية داخل الشرح إلا بعد اعتمادها تحريرًا ومراجعةً، ولذلك يقتصر العرض هنا على القانون الرسمي والآيات القرآنية والشرح الفقهي العام.",
};

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

function normalizeReason(reason: string) {
  const text = (reason || "").trim();
  if (!text) return "استحق هذا النصيب وفق قواعد المواريث المعتمدة في المحرك.";
  return text;
}

function humanExplanation(
  role: HeirRole,
  shareType: CalculationShareType,
  fraction: string,
  reason: string
) {
  const cleanReason = normalizeReason(reason);

  const presets: Partial<Record<HeirRole, string>> = {
    husband:
      fraction === "1/2"
        ? "الزوج أخذ النصف لأنه لا يوجد فرع وارث للمتوفاة."
        : fraction === "1/4"
        ? "الزوج أخذ الربع لوجود فرع وارث للمتوفاة."
        : cleanReason,

    wife:
      fraction === "1/4"
        ? "الزوجة أخذت الربع لأنه لا يوجد فرع وارث للمتوفى."
        : fraction === "1/8"
        ? "الزوجة أخذت الثمن لوجود فرع وارث للمتوفى."
        : cleanReason,

    mother:
      fraction === "1/3"
        ? "الأم أخذت الثلث لعدم وجود فرع وارث، وعدم وجود جمع من الإخوة المؤثرين على نصيبها."
        : fraction === "1/6"
        ? "الأم أخذت السدس لوجود فرع وارث أو لوجود جمع من الإخوة."
        : cleanReason,

    father:
      shareType === "fard"
        ? "الأب أخذ السدس فرضًا لوجود فرع وارث بحسب الحالة المعتمدة في المحرك."
        : shareType === "taasib"
        ? "الأب أخذ الباقي تعصيبًا بعد إعطاء أصحاب الفروض أنصبتهم."
        : shareType === "fard_and_taasib"
        ? "الأب جمع بين السدس فرضًا والباقي تعصيبًا بحسب تركيب الورثة."
        : cleanReason,

    daughter:
      fraction === "1/2"
        ? "البنت الواحدة أخذت النصف لأنها منفردة ولا يوجد ابن يعصبها."
        : fraction === "2/3"
        ? "البنات اشتركن في الثلثين لكونهن اثنتين فأكثر ولا يوجد ابن معهن."
        : shareType === "taasib"
        ? "البنت صارت مع الابن من العصبة، فيكون للذكر مثل حظ الأنثيين."
        : cleanReason,

    son:
      shareType === "taasib"
        ? "الابن من العصبة، ويأخذ ما بقي بعد أصحاب الفروض، أو يقتسم مع البنات للذكر مثل حظ الأنثيين."
        : cleanReason,
  };

  return presets[role] ?? cleanReason;
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

function madhhabLabel(madhhab?: Madhhab) {
  switch (madhhab) {
    case "hanafi":
      return "الحنفي";
    case "maliki":
      return "المالكي";
    case "shafii":
      return "الشافعي";
    case "hanbali":
      return "الحنبلي";
    default:
      return "عام";
  }
}

export default function ExplanationPage() {
  const [result, setResult] = useState<CalculationResponse | null>(null);
  const [referenceMode, setReferenceMode] = useState<ReferenceMode>("uae_law");
  const [madhhab, setMadhhab] = useState<Madhhab>("general");

  useEffect(() => {
    const raw = sessionStorage.getItem("mirathi-latest-result");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as CalculationResponse;
      setResult(parsed);
    } catch {
      setResult(null);
    }

    const rawCase = sessionStorage.getItem("mirathi-latest-saved-case");
    if (rawCase) {
      try {
        const parsedCase = JSON.parse(rawCase) as StoredCase;
        setReferenceMode(
          (parsedCase.meta?.reference_mode as ReferenceMode) || "uae_law"
        );
        setMadhhab((parsedCase.meta?.madhhab as Madhhab) || "general");
      } catch {
        setReferenceMode("uae_law");
        setMadhhab("general");
      }
    }
  }, []);

  const validShares = useMemo(() => result?.shares ?? [], [result]);
  const blockedHeirs = useMemo(() => result?.blocked ?? [], [result]);
  const adjustment = result?.adjustment ?? defaultCalculationAdjustment;
  const adjustmentColors = adjustmentTheme(adjustment.type);

  return (
    <PageShell
      title="شرح المسألة"
      subtitle="شرح استحقاق كل وارث، وبيان الحجب، مع مرجعية قانونية وقرآنية وفق المسار المختار."
    >
      <Stepper current={5} />

      {!result ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h2 className="text-lg font-black text-amber-900">لا توجد نتيجة محفوظة</h2>
          <div className="mt-3 space-y-2 text-sm leading-8 text-amber-900">
            <div>يبدو أنك لم تنفذ حسبة بعد، أو تم مسح الجلسة الحالية.</div>
            <div>ارجع إلى صفحة المراجعة، ثم احسب المسألة أولًا، وبعدها افتح صفحة الشرح.</div>
          </div>

          <div className="mt-5">
            <Link
              href="/case/review"
              className="rounded-2xl border border-amber-300 bg-white px-5 py-3 font-bold text-amber-900 shadow-sm hover:bg-amber-100"
            >
              العودة إلى المراجعة
            </Link>
          </div>
        </section>
      ) : null}

      {result && !result.is_valid ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h2 className="text-lg font-black text-amber-900">المسألة غير صالحة للحساب</h2>
          <div className="mt-3 space-y-2 text-sm leading-8 text-amber-900">
            {result.validation_issues.map((issue, index) => (
              <div key={index}>- {issue.message}</div>
            ))}
          </div>

          <div className="mt-5">
            <Link
              href="/case/review"
              className="rounded-2xl border border-amber-300 bg-white px-5 py-3 font-bold text-amber-900 shadow-sm hover:bg-amber-100"
            >
              العودة لتصحيح البيانات
            </Link>
          </div>
        </section>
      ) : null}

      {result?.is_valid ? (
        <div className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">فهم النتيجة</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  هذه الصفحة تجمع بين شرح المسألة الحالية وبين المرجعية العامة
                  التي تساعد على فهم سبب الاستحقاق أو الحجب.
                </p>
              </div>

              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-700">
                المرجع الحالي:{" "}
                {referenceMode === "uae_law"
                  ? "القانون الإماراتي"
                  : `الفقه الإسلامي${madhhab !== "general" ? ` — ${madhhabLabel(madhhab)}` : ""}`}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold text-slate-500">حالة المسألة</div>
                <div className="mt-1 text-base font-black text-emerald-700">صالحة للحساب</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold text-slate-500">أصحاب الأنصبة</div>
                <div className="mt-1 text-base font-black text-slate-900">
                  {validShares.length}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold text-slate-500">الورثة المحجوبون</div>
                <div className="mt-1 text-base font-black text-slate-900">
                  {blockedHeirs.length}
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
            className={`rounded-3xl border p-5 shadow-sm ${adjustmentColors.wrap}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className={`text-lg font-black ${adjustmentColors.title}`}>
                شرح العَول أو الرَّد
              </h2>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-black ${adjustmentColors.badge}`}
              >
                {adjustmentTitle(adjustment.type)}
              </span>
            </div>

            <div className={`mt-3 text-sm leading-8 ${adjustmentColors.text}`}>
              {adjustment.applied
                ? adjustment.explanation || "تم تطبيق معالجة نهائية على المسألة."
                : "لم تحتج هذه المسألة إلى عَول أو رَد، لأن مجموع الأنصبة كان مناسبًا لصافي التركة في الحساب الحالي."}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                <div className="text-xs font-bold text-slate-500">نوع المعالجة</div>
                <div className="mt-1 font-black text-slate-900">
                  {adjustmentTitle(adjustment.type)}
                </div>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                <div className="text-xs font-bold text-slate-500">مجموع الأنصبة قبل المعالجة</div>
                <div className="mt-1 font-black text-slate-900">
                  {adjustment.shares_total_before}
                </div>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                <div className="text-xs font-bold text-slate-500">مجموع الأنصبة بعد المعالجة</div>
                <div className="mt-1 font-black text-slate-900">
                  {adjustment.shares_total_after}
                </div>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                <div className="text-xs font-bold text-slate-500">الباقي قبل المعالجة</div>
                <div className="mt-1 font-black text-slate-900">
                  {adjustment.remaining_before}
                </div>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                <div className="text-xs font-bold text-slate-500">الباقي بعد المعالجة</div>
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

          {validShares.length ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">سبب استحقاق كل وارث</h2>

              <div className="mt-4 space-y-4">
                {validShares.map((share) => (
                  <div
                    key={share.heir_id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-base font-black text-slate-900">
                          {share.name}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {roleLabel(share.role)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                          {shareTypeLabel(share.share_type)}
                        </span>

                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                          {formatFraction(share.share_type, share.fraction)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl bg-white p-3">
                        <div className="text-xs font-bold text-slate-500">النسبة</div>
                        <div className="mt-1 font-black text-slate-900">
                          {share.percentage}%
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white p-3">
                        <div className="text-xs font-bold text-slate-500">المبلغ</div>
                        <div className="mt-1 font-black text-emerald-700">
                          {share.amount}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white p-3">
                        <div className="text-xs font-bold text-slate-500">نوع الاستحقاق</div>
                        <div className="mt-1 font-black text-slate-900">
                          {shareTypeLabel(share.share_type)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                        <div className="text-sm font-black text-blue-900">
                          لماذا أخذ هذا النصيب؟
                        </div>
                        <div className="mt-2 text-sm leading-8 text-blue-900">
                          {humanExplanation(
                            share.role,
                            share.share_type,
                            share.fraction,
                            share.reason
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-sm font-black text-slate-900">
                          السبب الفني من المحرك
                        </div>
                        <div className="mt-2 text-sm leading-8 text-slate-700">
                          {normalizeReason(share.reason)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {blockedHeirs.length ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">أسباب حجب بعض الورثة</h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {blockedHeirs.map((item) => (
                  <div
                    key={item.heir_id}
                    className="rounded-2xl border border-red-200 bg-red-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-base font-black text-red-900">
                          {item.name}
                        </div>
                        <div className="mt-1 text-sm text-red-800">
                          {roleLabel(item.role)}
                        </div>
                      </div>

                      <span className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-bold text-red-700">
                        محجوب
                      </span>
                    </div>

                    <div className="mt-4 rounded-2xl border border-red-200 bg-white p-4">
                      <div className="text-sm font-black text-red-900">سبب الحجب</div>
                      <div className="mt-2 text-sm leading-8 text-red-900">
                        {item.reason || "تم حجب هذا الوارث وفق قواعد الحجب المعتمدة في المحرك."}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {result.estate ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">شرح تصفية التركة</h2>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">إجمالي التركة</div>
                  <div className="mt-1 text-base font-black text-slate-900">
                    {result.estate.gross_estate}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">الديون</div>
                  <div className="mt-1 text-base font-black text-slate-900">
                    {result.estate.debts}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">الوصية المسموح بها</div>
                  <div className="mt-1 text-base font-black text-slate-900">
                    {result.estate.allowed_will}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-xs font-bold text-emerald-700">صافي التركة</div>
                  <div className="mt-1 text-base font-black text-emerald-800">
                    {result.estate.net_estate}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-8 text-slate-700">
                يتم أولًا النظر إلى إجمالي التركة، ثم خصم ما يتعلق بها من الحقوق،
                وبعد ذلك يوزع صافي التركة على الورثة المستحقين بحسب أنصبتهم.
              </div>

              {result.estate.notes.length ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-black text-slate-900">ملاحظات على تصفية التركة</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    {result.estate.notes.map((note, index) => (
                      <div key={index}>- {note}</div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  المرجعية القانونية والشرعية
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  هذا القسم لا يكرر نتيجة المحرك، بل يشرح الأصول العامة التي
                  تُقرأ المسألة في ضوئها.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={[
                    "rounded-full border px-4 py-2 text-sm font-black",
                    referenceMode === "uae_law"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-slate-50 text-slate-700",
                  ].join(" ")}
                >
                  {referenceMode === "uae_law" ? "المسار القانوني مفعّل" : "المسار الفقهي مفعّل"}
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-3">
              <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 xl:col-span-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800">
                  <Gavel className="h-4 w-4" />
                  الأساس القانوني الإماراتي
                </div>

                <div className="mt-4 space-y-3">
                  {LEGAL_REFERENCES.map((item) => (
                    <div
                      key={item.article}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="text-sm font-black text-slate-900">
                        المادة ({item.article}) — {item.title}
                      </div>
                      <div className="mt-2 text-sm leading-7 text-slate-700">
                        {item.summary}
                      </div>
                      <div className="mt-2 text-xs leading-6 text-slate-500">
                        {item.note}
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-sm font-bold text-emerald-700 hover:text-emerald-800"
                      >
                        فتح المرجع الرسمي
                      </a>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 xl:col-span-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800">
                  <BookOpen className="h-4 w-4" />
                  الآيات المؤسسة في سورة النساء
                </div>

                <div className="mt-4 space-y-3">
                  {QURAN_REFERENCES.map((item) => (
                    <div
                      key={item.verse}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="text-sm font-black text-slate-900">
                        {item.verse} — {item.title}
                      </div>
                      <div className="mt-2 text-sm leading-7 text-slate-700">
                        {item.summary}
                      </div>
                      <div className="mt-2 text-xs leading-6 text-slate-500">
                        {item.hint}
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-sm font-bold text-emerald-700 hover:text-emerald-800"
                      >
                        فتح الآية
                      </a>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 xl:col-span-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800">
                  <Scale className="h-4 w-4" />
                  لمحات فقهية عامة
                </div>

                <div className="mt-4 space-y-3">
                  {FIQH_NOTES.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="text-sm font-black text-slate-900">{item.title}</div>
                      <div className="mt-2 text-sm leading-7 text-slate-700">
                        {item.body}
                      </div>
                    </div>
                  ))}

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-white p-2">
                        <Info className="h-4 w-4 text-amber-700" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-amber-900">
                          المذهب الحالي في هذه الجلسة
                        </div>
                        <div className="mt-2 text-sm leading-7 text-amber-900">
                          {referenceMode === "uae_law"
                            ? "المسألة مضبوطة على المسار القانوني الإماراتي، لذلك لا يُعرض هنا تفريع مذهبي ملزم."
                            : `المسار الحالي هو الفقه الإسلامي${
                                madhhab !== "general"
                                  ? ` وفق اختيار: ${madhhabLabel(madhhab)}`
                                  : " بصيغة عامة غير مقيدة بمذهب تفصيلي"
                              }.`}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-black text-slate-900">
                      {SUNNAH_NOTE.title}
                    </div>
                    <div className="mt-2 text-sm leading-7 text-slate-700">
                      {SUNNAH_NOTE.body}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </section>

          {result.notes.length ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">ملاحظات إضافية من المحرك</h2>

              <div className="mt-4 space-y-3">
                {result.notes.map((note, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-8 text-slate-700"
                  >
                    {note}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {result.references.length ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">المراجع المرفقة مع النتيجة</h2>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-8 text-slate-700">
                هذه المراجع هي ما أرفقه النظام مع النتيجة الحالية، وهي منفصلة عن قسم
                الشرح العام بالأعلى.
              </div>

              <div className="mt-4 space-y-3">
                {result.references.map((ref, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="font-black text-slate-900">{ref.title}</div>
                    <div className="mt-2 text-sm text-slate-700">
                      <span className="font-black text-slate-900">الاستشهاد:</span>{" "}
                      {ref.citation}
                    </div>
                    {ref.note ? (
                      <div className="mt-2 text-sm text-slate-700">
                        <span className="font-black text-slate-900">ملاحظة:</span>{" "}
                        {ref.note}
                      </div>
                    ) : null}
                    {ref.url ? (
                      <div className="mt-3">
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-emerald-700 hover:text-emerald-800"
                        >
                          فتح المرجع
                        </a>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-white p-2">
                <AlertTriangle className="h-5 w-5 text-amber-700" />
              </div>

              <div>
                <h2 className="text-lg font-black text-amber-900">
                  تنبيه قانوني وشرعي
                </h2>
                <div className="mt-2 text-sm leading-8 text-amber-900">
                  هذه الصفحة لشرح النتيجة وتقريب فهمها، لكنها لا تُغني عن مراجعة
                  مختص شرعي أو قانوني أو جهة قضائية مختصة، خاصة في المسائل المركبة
                  أو محل النزاع أو التي تتعلق بها مستندات ووقائع خاصة.
                </div>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href="/case/review"
              className="rounded-2xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              العودة إلى المراجعة
            </Link>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              طباعة الشرح
            </button>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}