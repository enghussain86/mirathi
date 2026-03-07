"use client";

import Link from "next/link";
import { Check } from "lucide-react";

const steps = [
  {
    id: 1,
    label: "البداية",
    description: "مقدمة المسألة",
    href: "/",
  },
  {
    id: 2,
    label: "التَّرِكة",
    description: "بيانات المال",
    href: "/case/estate",
  },
  {
    id: 3,
    label: "الوَرَثة",
    description: "إدخال الورثة",
    href: "/case/heirs",
  },
  {
    id: 4,
    label: "المراجعة",
    description: "التحقق النهائي",
    href: "/case/review",
  },
  {
    id: 5,
    label: "النتيجة",
    description: "عرض الأنصبة",
    href: "/case/result",
  },
] as const;

type StepId = (typeof steps)[number]["id"];

function isStepClickable(stepId: StepId, current: StepId) {
  if (stepId === 5 && current < 5) return false;
  return true;
}

export default function Stepper({ current }: { current: 1 | 2 | 3 | 4 | 5 }) {
  const currentStep = steps.find((step) => step.id === current);
  const progress = Math.round((current / steps.length) * 100);

  return (
    <section className="mb-8 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-black tracking-wide text-emerald-700">
            مسار احتساب الميراث
          </div>
          <h2 className="mt-1 text-lg font-black text-slate-900">
            {currentStep?.label ?? "الخطوات"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {currentStep?.description ?? "تابع الخطوات حتى الوصول إلى النتيجة النهائية."}
          </p>
        </div>

        <div className="min-w-[180px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
          <div className="text-xs font-bold text-slate-500">نسبة التقدم</div>
          <div className="mt-1 text-base font-black text-slate-900">
            {progress}%
          </div>
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-emerald-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-6 hidden items-start md:flex">
        {steps.map((step, index) => {
          const active = step.id === current;
          const done = step.id < current;
          const isLast = index === steps.length - 1;
          const clickable = isStepClickable(step.id, current);

          const wrapperClass = [
            "group flex min-w-[132px] flex-col items-center text-center transition",
            clickable ? "" : "cursor-not-allowed",
          ].join(" ");

          const circleClass = [
            "flex h-14 w-14 items-center justify-center rounded-full border-2 text-sm font-black shadow-sm transition",
            active
              ? "border-emerald-600 bg-emerald-600 text-white"
              : done
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : clickable
              ? "border-slate-300 bg-white text-slate-500 group-hover:border-slate-400 group-hover:text-slate-700"
              : "border-slate-200 bg-slate-100 text-slate-400",
          ].join(" ");

          const labelClass = [
            "mt-3 text-sm font-black transition",
            active
              ? "text-emerald-700"
              : done
              ? "text-slate-900"
              : clickable
              ? "text-slate-500 group-hover:text-slate-700"
              : "text-slate-400",
          ].join(" ");

          const descriptionClass = [
            "mt-1 text-xs transition",
            active
              ? "text-emerald-700"
              : done
              ? "text-slate-500"
              : clickable
              ? "text-slate-400 group-hover:text-slate-500"
              : "text-slate-300",
          ].join(" ");

          const stepNode = (
            <div className={wrapperClass}>
              <div className={circleClass}>
                {done ? <Check className="h-5 w-5" /> : step.id}
              </div>
              <div className={labelClass}>{step.label}</div>
              <div className={descriptionClass}>{step.description}</div>
            </div>
          );

          return (
            <div key={step.id} className="flex flex-1 items-start">
              {clickable ? <Link href={step.href}>{stepNode}</Link> : stepNode}

              {!isLast ? (
                <div className="mx-3 mt-6 h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={[
                      "h-full rounded-full bg-emerald-500 transition-all duration-300",
                      step.id < current ? "w-full" : "w-0",
                    ].join(" ")}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
        {steps.map((step) => {
          const active = step.id === current;
          const done = step.id < current;
          const clickable = isStepClickable(step.id, current);

          const cardClass = [
            "rounded-2xl border px-4 py-4 shadow-sm transition",
            active
              ? "border-emerald-300 bg-emerald-50"
              : done
              ? "border-slate-200 bg-slate-50 hover:bg-slate-100"
              : clickable
              ? "border-slate-200 bg-white hover:bg-slate-50"
              : "cursor-not-allowed border-slate-200 bg-slate-100 shadow-none",
          ].join(" ");

          const content = (
            <div className="flex items-center gap-3 text-right">
              <div
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-black",
                  active
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : done
                    ? "border-emerald-200 bg-white text-emerald-700"
                    : clickable
                    ? "border-slate-300 bg-white text-slate-500"
                    : "border-slate-200 bg-white text-slate-400",
                ].join(" ")}
              >
                {done ? <Check className="h-4 w-4" /> : step.id}
              </div>

              <div className="flex-1">
                <div
                  className={[
                    "text-sm font-black",
                    active
                      ? "text-emerald-800"
                      : done
                      ? "text-slate-900"
                      : clickable
                      ? "text-slate-700"
                      : "text-slate-400",
                  ].join(" ")}
                >
                  {step.label}
                </div>
                <div
                  className={[
                    "mt-1 text-xs",
                    active
                      ? "text-emerald-700"
                      : done
                      ? "text-slate-500"
                      : clickable
                      ? "text-slate-500"
                      : "text-slate-400",
                  ].join(" ")}
                >
                  {step.description}
                </div>
              </div>
            </div>
          );

          if (!clickable) {
            return (
              <div key={step.id} className={cardClass}>
                {content}
              </div>
            );
          }

          return (
            <Link key={step.id} href={step.href} className={cardClass}>
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}