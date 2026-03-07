// frontend/app/references/page.tsx
import PageShell from "@/components/PageShell";

export default function ReferencesPage() {
  return (
    <PageShell
      title="المرجعيَّة الشَّرعيَّة والقانونيَّة"
      subtitle="هذه الصفحة تعرض الأساس الشرعي والقانوني الذي يستند إليه التطبيق في التوضيح والتنظيم."
    >
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-xl font-black text-slate-900">
            قالَ اللهُ تعالى في المواريث
          </h2>
          <p className="mt-3 text-base font-bold text-slate-800">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          <div className="mt-4 text-sm leading-8 text-slate-700 md:text-base">
            يُوصِيكُمُ اللَّهُ فِي أَوْلَادِكُمْ لِلذَّكَرِ مِثْلُ حَظِّ
            الْأُنثَيَيْنِ... إلى قوله تعالى: تِلْكَ حُدُودُ اللَّهِ وَمَن
            يُطِعِ اللَّهَ وَرَسُولَهُ يُدْخِلْهُ جَنَّاتٍ تَجْرِي مِن تَحْتِهَا
            الْأَنْهَارُ خَالِدِينَ فِيهَا وَذَٰلِكَ الْفَوْزُ الْعَظِيمُ.
          </div>
          <div className="mt-3 text-sm font-bold text-slate-500">
            سورة النساء — الآيات 11 و12 و176
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-black text-slate-900">نبذة مختصرة</h2>
          <p className="mt-3 text-sm leading-8 text-slate-700 md:text-base">
            علم المواريث أو علم الفرائض هو العلم الذي يُعرَف به نصيب كل وارث من
            التركة وفق الأحكام التي شرعها الله تعالى في كتابه الكريم وبيَّنتها
            السنة النبوية، وقد اعتنى به علماء الفقه الإسلامي عناية كبيرة لما فيه
            من حفظٍ للحقوق ومنعٍ للنزاع بين الناس.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-black text-slate-900">
            السُّنَّة النبويَّة
          </h2>
          <p className="mt-3 text-sm leading-8 text-slate-700 md:text-base">
            قال النبي ﷺ: "ألحقوا الفرائض بأهلها، فما بقي فلأولى رجلٍ ذكر."
          </p>
          <p className="mt-2 text-sm font-bold text-slate-500">
            رواه البخاري ومسلم
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-black text-slate-900">
            الكتب الفقهيَّة المعتمدة
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-8 text-slate-700 md:text-base">
            <li>مختصر خليل — للإمام خليل بن إسحاق المالكي</li>
            <li>الشرح الكبير — للإمام أحمد الدردير</li>
            <li>حاشية الدسوقي على الشرح الكبير</li>
            <li>بداية المجتهد ونهاية المقتصد — للإمام ابن رشد</li>
            <li>الرحبية في علم الفرائض — للإمام محمد بن علي الرحبي</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-black text-slate-900">
            المرجعيَّة القانونيَّة
          </h2>
          <p className="mt-3 text-sm leading-8 text-slate-700 md:text-base">
            يراعي التطبيق الإطار القانوني المنظم للأحوال الشخصية في دولة الإمارات
            العربية المتحدة، وبخاصة:
          </p>
          <p className="mt-2 text-sm font-bold leading-8 text-slate-800 md:text-base">
            مرسوم بقانون اتحادي رقم (41) لسنة 2024 في شأن إصدار قانون الأحوال
            الشخصية
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-8 text-slate-700 md:text-base">
            <li>المادة (2): اعتماد الحساب الميلادي في المدد.</li>
            <li>المادة (173): تنفيذ الوصية من التركة في حدود الثلث.</li>
            <li>المادة (200): تعريف التركة.</li>
            <li>المادة (201): ترتيب الحقوق المتعلقة بالتركة.</li>
            <li>
              المواد (202) إلى (250): أحكام الإرث والفروض والعصبات والحجب وغيرها.
            </li>
          </ul>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-xl font-black text-amber-900">تنبيه</h2>
          <p className="mt-3 text-sm leading-8 text-amber-900 md:text-base">
            هذه الحاسبة أداة مساعدة تعليمية لتوضيح طريقة حساب المواريث، وقد تختلف
            بعض الحالات الخاصة، لذلك يُنصح بمراجعة المحاكم المختصة أو أهل العلم
            في المسائل المعقدة أو عند القسمة الرسمية.
          </p>
        </section>
      </div>
    </PageShell>
  );
}