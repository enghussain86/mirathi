# backend/engine/rules/fixed_shares.py
from __future__ import annotations

from fractions import Fraction
from typing import Dict, List, Tuple

from ..models import HeirInput, HeirRole, ShareResult, ShareType


def _group_heirs_by_role(heirs: List[HeirInput]) -> Dict[HeirRole, List[HeirInput]]:
    grouped: Dict[HeirRole, List[HeirInput]] = {}
    for heir in heirs:
        grouped.setdefault(heir.role, []).append(heir)
    return grouped


def _fraction_to_str(frac: Fraction) -> str:
    return f"{frac.numerator}/{frac.denominator}"


def _percentage(frac: Fraction) -> float:
    return float(frac) * 100.0


def _append_fraction_share(
    shares: List[ShareResult],
    *,
    heir: HeirInput,
    share_type: ShareType,
    fraction: Fraction,
    amount_base_estate: float,
    reason: str,
) -> None:
    shares.append(
        ShareResult(
            heir_id=heir.id,
            name=heir.name,
            role=heir.role,
            share_type=share_type,
            fraction=_fraction_to_str(fraction),
            amount=round(float(fraction) * amount_base_estate, 2),
            percentage=round(_percentage(fraction), 4),
            reason=reason,
        )
    )


def calculate_basic_fixed_shares(
    heirs: List[HeirInput],
    net_estate: float,
) -> Tuple[List[ShareResult], Fraction, List[str], float]:
    """
    حساب أصحاب الفروض فقط.
    توزيع العصبات يتم لاحقًا في asaba.py
    """

    grouped = _group_heirs_by_role(heirs)
    notes: List[str] = []
    shares: List[ShareResult] = []

    husbands = grouped.get(HeirRole.HUSBAND, [])
    wives = grouped.get(HeirRole.WIFE, [])
    fathers = grouped.get(HeirRole.FATHER, [])
    mothers = grouped.get(HeirRole.MOTHER, [])
    grandfathers = grouped.get(HeirRole.GRANDFATHER_PATERNAL, [])
    grandmother_paternal = grouped.get(HeirRole.GRANDMOTHER_PATERNAL, [])
    grandmother_maternal = grouped.get(HeirRole.GRANDMOTHER_MATERNAL, [])

    sons = grouped.get(HeirRole.SON, [])
    daughters = grouped.get(HeirRole.DAUGHTER, [])
    sons_daughters = grouped.get(HeirRole.SONS_DAUGHTER, [])

    full_brothers = grouped.get(HeirRole.FULL_BROTHER, [])
    full_sisters = grouped.get(HeirRole.FULL_SISTER, [])
    paternal_brothers = grouped.get(HeirRole.PATERNAL_BROTHER, [])
    paternal_sisters = grouped.get(HeirRole.PATERNAL_SISTER, [])
    maternal_brothers = grouped.get(HeirRole.MATERNAL_BROTHER, [])
    maternal_sisters = grouped.get(HeirRole.MATERNAL_SISTER, [])

    has_father = len(fathers) > 0
    has_grandfather = len(grandfathers) > 0
    has_sons = len(sons) > 0
    has_daughters = len(daughters) > 0
    has_children = has_sons or has_daughters

    siblings_count_for_mother = (
        len(full_brothers)
        + len(full_sisters)
        + len(paternal_brothers)
        + len(paternal_sisters)
        + len(maternal_brothers)
        + len(maternal_sisters)
    )

    total_fraction = Fraction(0, 1)

    # الزوج
    if husbands:
        husband = husbands[0]
        husband_fraction = Fraction(1, 4) if has_children else Fraction(1, 2)
        total_fraction += husband_fraction
        _append_fraction_share(
            shares,
            heir=husband,
            share_type=ShareType.FARD,
            fraction=husband_fraction,
            amount_base_estate=net_estate,
            reason="الزوج يستحق النصف عند عدم وجود فرع وارث، ويستحق الربع عند وجود فرع وارث.",
        )

    # الزوجة / الزوجات
    if wives:
        wives_total_fraction = Fraction(1, 8) if has_children else Fraction(1, 4)
        each_wife_fraction = wives_total_fraction / len(wives)
        total_fraction += wives_total_fraction

        for wife in wives:
            _append_fraction_share(
                shares,
                heir=wife,
                share_type=ShareType.FARD,
                fraction=each_wife_fraction,
                amount_base_estate=net_estate,
                reason="الزوجة تستحق الربع عند عدم وجود فرع وارث، وتستحق الثمن عند وجود فرع وارث، وتشترك الزوجات في هذا النصيب.",
            )

    # الأم
    if mothers:
        mother = mothers[0]

        # العُمريتان:
        # زوج + أم + أب
        # زوجة + أم + أب
        has_one_spouse = bool(husbands or wives)
        no_children = not has_children
        no_multiple_siblings = siblings_count_for_mother < 2

        if has_father and has_one_spouse and no_children and no_multiple_siblings:
            spouse_fraction = Fraction(1, 2) if husbands else Fraction(1, 4)
            remaining_after_spouse = Fraction(1, 1) - spouse_fraction
            mother_fraction = remaining_after_spouse / 3
            notes.append("طُبقت إحدى العُمريتين، فكان نصيب الأم ثلث الباقي بعد نصيب أحد الزوجين.")
            mother_reason = "في العُمريتين تأخذ الأم ثلث الباقي بعد نصيب أحد الزوجين، لا ثلث جميع التركة."
        else:
            mother_fraction = Fraction(1, 6) if (has_children or siblings_count_for_mother >= 2) else Fraction(1, 3)
            mother_reason = "الأم تستحق السدس مع وجود فرع وارث أو جمع من الإخوة، وتستحق الثلث عند عدم ذلك."

        total_fraction += mother_fraction
        _append_fraction_share(
            shares,
            heir=mother,
            share_type=ShareType.FARD,
            fraction=mother_fraction,
            amount_base_estate=net_estate,
            reason=mother_reason,
        )

    # الجدات
    grandmothers: List[HeirInput] = []
    grandmothers.extend(grandmother_paternal)
    grandmothers.extend(grandmother_maternal)

    if grandmothers:
        grandmothers_total_fraction = Fraction(1, 6)
        each_grandmother_fraction = grandmothers_total_fraction / len(grandmothers)
        total_fraction += grandmothers_total_fraction

        for grandmother in grandmothers:
            _append_fraction_share(
                shares,
                heir=grandmother,
                share_type=ShareType.FARD,
                fraction=each_grandmother_fraction,
                amount_base_estate=net_estate,
                reason="الجدة الصحيحة تستحق السدس، وإذا تعددت الجدات الوارثات اشتركن في هذا السدس.",
            )

    # الأب
    if fathers:
        father = fathers[0]
        if has_children:
            father_fraction = Fraction(1, 6)
            total_fraction += father_fraction
            _append_fraction_share(
                shares,
                heir=father,
                share_type=ShareType.FARD,
                fraction=father_fraction,
                amount_base_estate=net_estate,
                reason="الأب يستحق السدس مع وجود فرع وارث، وقد يأخذ الباقي لاحقًا بحسب نوع الفرع الوارث.",
            )

    # الجد الصحيح
    if grandfathers and not has_father:
        grandfather = grandfathers[0]
        if has_children:
            grandfather_fraction = Fraction(1, 6)
            total_fraction += grandfather_fraction
            _append_fraction_share(
                shares,
                heir=grandfather,
                share_type=ShareType.FARD,
                fraction=grandfather_fraction,
                amount_base_estate=net_estate,
                reason="الجد الصحيح يأخذ السدس مع وجود فرع وارث في هذه المرحلة من الحساب.",
            )

    # البنات عند عدم الابن
    if has_daughters and not has_sons:
        daughters_total_fraction = Fraction(1, 2) if len(daughters) == 1 else Fraction(2, 3)
        each_daughter_fraction = daughters_total_fraction / len(daughters)
        total_fraction += daughters_total_fraction

        for daughter in daughters:
            _append_fraction_share(
                shares,
                heir=daughter,
                share_type=ShareType.FARD,
                fraction=each_daughter_fraction,
                amount_base_estate=net_estate,
                reason="البنت الواحدة تستحق النصف، والبنتان فأكثر يستحققن الثلثين عند عدم وجود الابن.",
            )

    # بنت الابن
    if sons_daughters and not has_sons:
        if not has_daughters:
            sons_daughters_total_fraction = Fraction(1, 2) if len(sons_daughters) == 1 else Fraction(2, 3)
            each_sons_daughter_fraction = sons_daughters_total_fraction / len(sons_daughters)
            total_fraction += sons_daughters_total_fraction

            for item in sons_daughters:
                _append_fraction_share(
                    shares,
                    heir=item,
                    share_type=ShareType.FARD,
                    fraction=each_sons_daughter_fraction,
                    amount_base_estate=net_estate,
                    reason="بنت الابن تستحق النصف إذا انفردت، وتستحق الثلثين عند التعدد إذا لم يوجد من يمنعها أو يعصبها.",
                )
        elif len(daughters) == 1:
            total_fraction += Fraction(1, 6)
            each_sons_daughter_fraction = Fraction(1, 6) / len(sons_daughters)
            for item in sons_daughters:
                _append_fraction_share(
                    shares,
                    heir=item,
                    share_type=ShareType.FARD,
                    fraction=each_sons_daughter_fraction,
                    amount_base_estate=net_estate,
                    reason="بنت الابن تستحق السدس تكملةً للثلثين مع وجود بنت واحدة وعدم المانع.",
                )

    # الإخوة لأم
    maternal_siblings = maternal_brothers + maternal_sisters
    if maternal_siblings and not has_children and not has_father and not has_grandfather:
        maternal_total_fraction = Fraction(1, 6) if len(maternal_siblings) == 1 else Fraction(1, 3)
        each_fraction = maternal_total_fraction / len(maternal_siblings)
        total_fraction += maternal_total_fraction

        for item in maternal_siblings:
            _append_fraction_share(
                shares,
                heir=item,
                share_type=ShareType.FARD,
                fraction=each_fraction,
                amount_base_estate=net_estate,
                reason="الأخ أو الأخت لأم يستحق السدس عند الانفراد، والثلث عند التعدد، بشرط عدم الفرع الوارث وعدم الأصل الوارث الذكر.",
            )

    # الأخت الشقيقة فرضًا
    if (
        full_sisters
        and not full_brothers
        and not has_children
        and not has_father
        and not has_grandfather
    ):
        sisters_total_fraction = Fraction(1, 2) if len(full_sisters) == 1 else Fraction(2, 3)
        each_fraction = sisters_total_fraction / len(full_sisters)
        total_fraction += sisters_total_fraction

        for sister in full_sisters:
            _append_fraction_share(
                shares,
                heir=sister,
                share_type=ShareType.FARD,
                fraction=each_fraction,
                amount_base_estate=net_estate,
                reason="الأخت الشقيقة تستحق النصف إذا انفردت، وتستحق الثلثين عند التعدد، إذا لم يوجد أصل وارث ذكر ولا فرع وارث.",
            )

    # الأخت لأب فرضًا عند عدم الشقيقة والمانع
    if (
        paternal_sisters
        and not full_sisters
        and not full_brothers
        and not has_children
        and not has_father
        and not has_grandfather
    ):
        sisters_total_fraction = Fraction(1, 2) if len(paternal_sisters) == 1 else Fraction(2, 3)
        each_fraction = sisters_total_fraction / len(paternal_sisters)
        total_fraction += sisters_total_fraction

        for sister in paternal_sisters:
            _append_fraction_share(
                shares,
                heir=sister,
                share_type=ShareType.FARD,
                fraction=each_fraction,
                amount_base_estate=net_estate,
                reason="الأخت لأب تستحق النصف إذا انفردت، وتستحق الثلثين عند التعدد، عند عدم الشقيقة والفرع الوارث والأصل الوارث الذكر.",
            )

    total_amount = round(sum(share.amount for share in shares), 2)
    remaining_amount = round(net_estate - total_amount, 2)

    if remaining_amount < 0:
        notes.append("مجموع الفروض تجاوز صافي التركة، وسيتم التعامل مع ذلك بالعَول.")
        remaining_amount = 0.0

    return shares, total_fraction, notes, remaining_amount