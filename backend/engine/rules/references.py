from __future__ import annotations

from typing import List

from ..models import CaseInput, ReferenceItem


def get_basic_references(case: CaseInput) -> List[ReferenceItem]:
    references: List[ReferenceItem] = []

    references.append(
        ReferenceItem(
            source_type="quran",
            title="القرآن الكريم",
            citation="سورة النساء — الآيات 11 و12 و176",
            note="الآيات المؤسسة لأحكام المواريث في الإسلام.",
            url="https://quran.com/4/11",
        )
    )

    references.append(
        ReferenceItem(
            source_type="hadith",
            title="السنة النبوية",
            citation='حديث: "ألحقوا الفرائض بأهلها، فما بقي فلأولى رجلٍ ذكر."',
            note="رواه البخاري ومسلم، وهو أصل في باب الفرائض والعصبات.",
            url="https://sunnah.com/bukhari:6732",
        )
    )

    references.append(
        ReferenceItem(
            source_type="law",
            title="قانون الأحوال الشخصية الإماراتي",
            citation="مرسوم بقانون اتحادي رقم (41) لسنة 2024",
            note="المرجع القانوني المنظم لمسائل التركة والإرث في دولة الإمارات العربية المتحدة.",
            url="https://uaelegislation.gov.ae/ar/legislations/2770",
        )
    )

    madhhab_value = getattr(case.madhhab, "value", "default")

    madhhab_title = {
        "default": "ملاحظة فقهية عامة",
        "general": "ملاحظة فقهية عامة",
        "hanafi": "المذهب الحنفي",
        "maliki": "المذهب المالكي",
        "shafii": "المذهب الشافعي",
        "hanbali": "المذهب الحنبلي",
    }

    madhhab_note = {
        "default": "تم عرض النتيجة وفق الأحكام الشرعية العامة المعتمدة مع الاستناد إلى القانون الإماراتي.",
        "general": "تم عرض النتيجة وفق الأحكام الشرعية العامة المعتمدة مع الاستناد إلى القانون الإماراتي.",
        "hanafi": "عند وجود خلاف فقهي ظاهر، تُذكر الإشارة إلى المذهب الحنفي ضمن الشرح.",
        "maliki": "عند وجود خلاف فقهي ظاهر، تُذكر الإشارة إلى المذهب المالكي ضمن الشرح.",
        "shafii": "عند وجود خلاف فقهي ظاهر، تُذكر الإشارة إلى المذهب الشافعي ضمن الشرح.",
        "hanbali": "عند وجود خلاف فقهي ظاهر، تُذكر الإشارة إلى المذهب الحنبلي ضمن الشرح.",
    }

    references.append(
        ReferenceItem(
            source_type="fiqh",
            title=madhhab_title.get(madhhab_value, "ملاحظة فقهية عامة"),
            citation="أبواب الفرائض في كتب الفقه المعتمدة",
            note=madhhab_note.get(
                madhhab_value,
                "تم عرض النتيجة وفق الأحكام الشرعية العامة المعتمدة مع الاستناد إلى القانون الإماراتي.",
            ),
            url="",
        )
    )

    return references