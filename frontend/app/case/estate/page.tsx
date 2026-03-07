"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Coins,
  Info,
  Plus,
  ReceiptText,
  Trash2,
  Wallet,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import Stepper from "@/components/Stepper";
import { useCaseStore } from "@/lib/case-store";

function toNumber(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const assetTypeLabels = {
  financial_amounts: "المبالغ المالية",
  real_estate: "العقارات",
  land: "الأراضي",
  gold_jewelry: "الذهب والمجوهرات",
  vehicles: "السيارات والمركبات",
  stocks_investments: "الأسهم والاستثمارات",
  other: "أخرى",
};

export default function EstatePage() {
  const router = useRouter();

  const estate = useCaseStore((s) => s.data.estate);
  const setEstateField = useCaseStore((s) => s.setEstateField);
  const addAsset = useCaseStore((s) => s.addAsset);
  const updateAsset = useCaseStore((s) => s.updateAsset);
  const removeAsset = useCaseStore((s) => s.removeAsset);
  const syncTotalFromAssets = useCaseStore((s) => s.syncTotalFromAssets);

  useEffect(() => {
    syncTotalFromAssets();
  }, [estate.assets, syncTotalFromAssets]);

  const net =
    (estate.total || 0) -
    (estate.debts || 0) -
    (estate.will || 0) -
    (estate.funeral || 0);

  const hasAssets = estate.assets.length > 0;
  const hasNegativeNet = net < 0;

  return (
    <PageShell
      title="بياناتُ التَّرِكة"
      subtitle="أدخل إجمالي التركة، وبيانات الممتلكات، والديون، والوصية، ومصاريف التجهيز والدفن قبل الانتقال إلى الورثة."
    >
      <Stepper current={2} />

      <div className="space-y-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800">
                <Wallet className="h-4 w-4" />
                بيانات أساسية
              </div>

              <h2 className="mt-4 text-xl font-black text-slate-900">
                إجمالي التركة
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                هذا هو إجمالي قيمة التركة قبل خصم الديون والوصية ومصاريف التجهيز
                والدفن. ويمكن تحديثه تلقائيًا من تفصيل الممتلكات بالأسفل.
              </p>
            </div>

            <div className="min-w-[220px] rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold text-slate-500">
                عدد الممتلكات المضافة
              </div>
              <div className="mt-1 text-base font-black text-slate-900">
                {estate.assets.length}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <label className="block">
              <div className="mb-2 text-sm font-black text-slate-800">
                قيمة التركة الإجمالية
              </div>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                value={estate.total ?? 0}
                onChange={(e) => setEstateField("total", toNumber(e.target.value))}
                placeholder="أدخل إجمالي قيمة التركة"
              />
            </label>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-white p-2">
                  <Info className="h-4 w-4 text-slate-700" />
                </div>

                <div className="text-sm leading-7 text-slate-700">
                  يتم تحديث هذا الحقل تلقائيًا عند إدخال الممتلكات في القسم
                  التالي. ويمكنك أيضًا تعديله يدويًا عند الحاجة.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-slate-50 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800">
                <Coins className="h-4 w-4" />
                تفصيل الممتلكات
              </div>

              <h2 className="mt-4 text-xl font-black text-slate-900">
                الممتلكات الداخلة في التركة
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                هذا القسم اختياري، لكنه يساعد على وصف التركة بدقة أعلى، ويجعل
                الحساب أوضح وأقرب للواقع.
              </p>
            </div>

            <button
              type="button"
              onClick={addAsset}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
            >
              <Plus className="h-4 w-4" />
              إضافة ممتلك
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {hasAssets ? (
              estate.assets.map((asset, index) => (
                <div
                  key={asset.id}
                  className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-black text-slate-900">
                        ممتلك رقم {index + 1}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        أدخل نوع الممتلك وقيمته ووصفًا مختصرًا له.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeAsset(asset.id)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <div className="mb-2 text-sm font-black text-slate-800">
                        نوع الممتلك
                      </div>
                      <select
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                        value={asset.type}
                        onChange={(e) =>
                          updateAsset(asset.id, {
                            type: e.target.value as typeof asset.type,
                          })
                        }
                      >
                        {Object.entries(assetTypeLabels).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <div className="mb-2 text-sm font-black text-slate-800">
                        القيمة
                      </div>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                        value={asset.value ?? 0}
                        onChange={(e) =>
                          updateAsset(asset.id, { value: toNumber(e.target.value) })
                        }
                        placeholder="أدخل قيمة الممتلك"
                      />
                    </label>

                    {asset.type === "other" ? (
                      <label className="block md:col-span-2">
                        <div className="mb-2 text-sm font-black text-slate-800">
                          اذكر نوع الممتلك
                        </div>
                        <input
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                          value={asset.customType}
                          onChange={(e) =>
                            updateAsset(asset.id, { customType: e.target.value })
                          }
                          placeholder="مثال: حقوق مالية، مقتنيات خاصة..."
                        />
                      </label>
                    ) : null}

                    <label className="block md:col-span-2">
                      <div className="mb-2 text-sm font-black text-slate-800">
                        وصف مختصر
                      </div>
                      <input
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                        value={asset.description}
                        onChange={(e) =>
                          updateAsset(asset.id, { description: e.target.value })
                        }
                        placeholder="مثال: حساب بنكي، أرض سكنية، سيارة، أسهم..."
                      />
                    </label>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <Coins className="h-6 w-6 text-slate-500" />
                </div>
                <div className="mt-4 text-lg font-black text-slate-900">
                  لم يتم إضافة ممتلكات بعد
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  يمكنك الاكتفاء بإجمالي التركة، أو إضافة الممتلكات بالتفصيل
                  للحصول على صورة أوضح للمسألة.
                </p>
                <button
                  type="button"
                  onClick={addAsset}
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
                >
                  <Plus className="h-4 w-4" />
                  إضافة أول ممتلك
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-800">
            <ReceiptText className="h-4 w-4" />
            الاستقطاعات قبل التوزيع
          </div>

          <h2 className="mt-4 text-xl font-black text-slate-900">
            الديون والوصية ومصاريف التجهيز
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            تُخصم هذه القيم من إجمالي التركة للوصول إلى صافي التركة القابل
            للتوزيع.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <label className="block rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-2 text-sm font-black text-slate-800">
                الدُّيون
              </div>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                value={estate.debts ?? 0}
                onChange={(e) => setEstateField("debts", toNumber(e.target.value))}
                placeholder="أدخل قيمة الديون"
              />
              <p className="mt-2 text-xs leading-6 text-slate-500">
                تشمل ما ثبت على التركة من التزامات مالية.
              </p>
            </label>

            <label className="block rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-2 text-sm font-black text-slate-800">
                الوصيَّة
              </div>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                value={estate.will ?? 0}
                onChange={(e) => setEstateField("will", toNumber(e.target.value))}
                placeholder="أدخل قيمة الوصية"
              />
              <p className="mt-2 text-xs leading-6 text-slate-500">
                أدخل ما يُراد خصمه وصيةً حسب ما تعتمد عليه في المسألة.
              </p>
            </label>

            <label className="block rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-2 text-sm font-black text-slate-800">
                التَّجهيز والدَّفن
              </div>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                value={estate.funeral ?? 0}
                onChange={(e) => setEstateField("funeral", toNumber(e.target.value))}
                placeholder="أدخل قيمة المصاريف"
              />
              <p className="mt-2 text-xs leading-6 text-slate-500">
                مثل مصاريف التجهيز والدفن وما يتصل بها.
              </p>
            </label>
          </div>
        </section>

        <section
          className={[
            "rounded-[32px] border p-6 shadow-sm",
            hasNegativeNet
              ? "border-red-200 bg-red-50"
              : "border-emerald-200 bg-emerald-50",
          ].join(" ")}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-white p-5 text-center shadow-sm">
              <div className="text-sm font-bold text-slate-600">
                إجمالي التركة
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {estate.total ?? 0}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 text-center shadow-sm">
              <div
                className={[
                  "text-sm font-bold",
                  hasNegativeNet ? "text-red-700" : "text-emerald-700",
                ].join(" ")}
              >
                صافي التركة التقريبي
              </div>
              <div
                className={[
                  "mt-2 text-2xl font-black",
                  hasNegativeNet ? "text-red-800" : "text-emerald-800",
                ].join(" ")}
              >
                {net}
              </div>
            </div>
          </div>

          {hasNegativeNet ? (
            <div className="mt-4 rounded-3xl border border-red-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-red-50 p-2">
                  <AlertTriangle className="h-5 w-5 text-red-700" />
                </div>

                <div>
                  <div className="text-sm font-black text-red-900">
                    صافي التركة أقل من الصفر
                  </div>
                  <p className="mt-1 text-sm leading-7 text-red-800">
                    راجع قيم الديون والوصية ومصاريف التجهيز، لأن مجموع
                    الاستقطاعات أكبر من إجمالي التركة الحالي.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-3xl border border-emerald-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-emerald-50 p-2">
                  <Info className="h-5 w-5 text-emerald-700" />
                </div>

                <div>
                  <div className="text-sm font-black text-emerald-900">
                    صافي التركة جاهز مبدئيًا
                  </div>
                  <p className="mt-1 text-sm leading-7 text-emerald-900">
                    يمكنك الآن الانتقال إلى خطوة الورثة لإكمال إدخال المسألة
                    ومتابعة الحساب.
                  </p>
                </div>
              </div>
            </div>
          )}
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
          onClick={() => router.push("/case/heirs")}
          className="rounded-2xl bg-emerald-700 px-6 py-3 font-bold text-white shadow-sm transition hover:bg-emerald-800"
        >
          متابعة إلى الورثة
        </button>
      </div>
    </PageShell>
  );
}