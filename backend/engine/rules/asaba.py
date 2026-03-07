# backend/engine/rules/asaba.py
from __future__ import annotations

from typing import Dict, List, Tuple

from ..models import HeirInput, HeirRole, Madhhab, ShareResult, ShareType


def _group_heirs_by_role(heirs: List[HeirInput]) -> Dict[HeirRole, List[HeirInput]]:
    grouped: Dict[HeirRole, List[HeirInput]] = {}
    for heir in heirs:
        grouped.setdefault(heir.role, []).append(heir)
    return grouped


def _append_share(
    shares: List[ShareResult],
    *,
    heir: HeirInput,
    share_type: ShareType,
    fraction: str,
    amount: float,
    net_estate: float,
    reason: str,
) -> None:
    shares.append(
        ShareResult(
            heir_id=heir.id,
            name=heir.name,
            role=heir.role,
            share_type=share_type,
            fraction=fraction,
            amount=round(amount, 2),
            percentage=round((amount / net_estate) * 100.0, 4) if net_estate else 0.0,
            reason=reason,
        )
    )


def _update_existing_share_with_remainder(
    shares: List[ShareResult],
    *,
    heir: HeirInput,
    remainder_amount: float,
    net_estate: float,
    reason_suffix: str,
) -> bool:
    for index, share in enumerate(shares):
        if share.heir_id == heir.id:
            new_amount = round(share.amount + remainder_amount, 2)
            shares[index] = ShareResult(
                heir_id=share.heir_id,
                name=share.name,
                role=share.role,
                share_type=ShareType.FARD_AND_TAASIB,
                fraction=f"{share.fraction} + الباقي",
                amount=new_amount,
                percentage=round((new_amount / net_estate) * 100.0, 4) if net_estate else 0.0,
                reason=(share.reason + " " + reason_suffix).strip(),
            )
            return True
    return False


def _current_remaining(net_estate: float, shares: List[ShareResult]) -> float:
    total = round(sum(share.amount for share in shares), 2)
    return round(net_estate - total, 2)


def _distribute_by_units(
    shares: List[ShareResult],
    *,
    males: List[HeirInput],
    females: List[HeirInput],
    net_estate: float,
    remaining_amount: float,
    male_reason: str,
    female_reason: str,
) -> float:
    total_units = (2 * len(males)) + len(females)
    if total_units <= 0 or remaining_amount <= 0:
        return remaining_amount

    unit_amount = remaining_amount / total_units

    for heir in males:
        _append_share(
            shares,
            heir=heir,
            share_type=ShareType.TAASIB,
            fraction="الباقي",
            amount=round(unit_amount * 2, 2),
            net_estate=net_estate,
            reason=male_reason,
        )

    for heir in females:
        _append_share(
            shares,
            heir=heir,
            share_type=ShareType.TAASIB,
            fraction="الباقي",
            amount=round(unit_amount, 2),
            net_estate=net_estate,
            reason=female_reason,
        )

    return _current_remaining(net_estate, shares)


def apply_asaba(
    heirs: List[HeirInput],
    shares: List[ShareResult],
    net_estate: float,
    *,
    madhhab: Madhhab,
) -> Tuple[List[ShareResult], List[str], float]:
    notes: List[str] = []
    grouped = _group_heirs_by_role(heirs)

    fathers = grouped.get(HeirRole.FATHER, [])
    grandfathers = grouped.get(HeirRole.GRANDFATHER_PATERNAL, [])

    sons = grouped.get(HeirRole.SON, [])
    daughters = grouped.get(HeirRole.DAUGHTER, [])

    full_brothers = grouped.get(HeirRole.FULL_BROTHER, [])
    full_sisters = grouped.get(HeirRole.FULL_SISTER, [])

    paternal_brothers = grouped.get(HeirRole.PATERNAL_BROTHER, [])
    paternal_sisters = grouped.get(HeirRole.PATERNAL_SISTER, [])

    paternal_uncles_full = grouped.get(HeirRole.PATERNAL_UNCLE_FULL, [])
    paternal_uncles_paternal = grouped.get(HeirRole.PATERNAL_UNCLE_PATERNAL, [])

    has_father = len(fathers) > 0
    has_grandfather = len(grandfathers) > 0
    has_sons = len(sons) > 0
    has_daughters = len(daughters) > 0
    has_children = has_sons or has_daughters

    remaining_amount = _current_remaining(net_estate, shares)
    if remaining_amount <= 0:
        return shares, notes, 0.0

    # 1) الأولاد
    if has_sons:
        remaining_amount = _distribute_by_units(
            shares,
            males=sons,
            females=daughters,
            net_estate=net_estate,
            remaining_amount=remaining_amount,
            male_reason="الابن من العصبة بالنفس، ويأخذ الباقي، ومع البنات يكون للذكر مثل حظ الأنثيين.",
            female_reason="البنت مع الابن تصير عصبة بالغير، فيكون للذكر مثل حظ الأنثيين.",
        )
        if remaining_amount <= 0:
            notes.append("وُزّع الباقي على الأولاد تعصيبًا.")
            return shares, notes, 0.0

    # 2) الأب
    if has_father and remaining_amount > 0:
        father = fathers[0]
        updated = _update_existing_share_with_remainder(
            shares,
            heir=father,
            remainder_amount=remaining_amount,
            net_estate=net_estate,
            reason_suffix="ثم أخذ الأب ما بقي تعصيبًا لأنه أقرب عصبة.",
        )
        if not updated:
            _append_share(
                shares,
                heir=father,
                share_type=ShareType.TAASIB,
                fraction="الباقي",
                amount=remaining_amount,
                net_estate=net_estate,
                reason="الأب من العصبة بالنفس ويأخذ ما بقي عند عدم وجود الابن.",
            )
        notes.append("أُعطي الأب الباقي تعصيبًا.")
        return shares, notes, 0.0

    # 3) الجد الصحيح
    if has_grandfather and remaining_amount > 0:
        grandfather = grandfathers[0]

        has_full_siblings = len(full_brothers) > 0 or len(full_sisters) > 0
        has_paternal_siblings = len(paternal_brothers) > 0 or len(paternal_sisters) > 0
        has_relevant_siblings = has_full_siblings or has_paternal_siblings

        if madhhab == Madhhab.HANAFI or not has_relevant_siblings:
            updated = _update_existing_share_with_remainder(
                shares,
                heir=grandfather,
                remainder_amount=remaining_amount,
                net_estate=net_estate,
                reason_suffix="ثم أخذ الجد الصحيح ما بقي تعصيبًا.",
            )
            if not updated:
                _append_share(
                    shares,
                    heir=grandfather,
                    share_type=ShareType.TAASIB,
                    fraction="الباقي",
                    amount=remaining_amount,
                    net_estate=net_estate,
                    reason="الجد الصحيح يأخذ الباقي تعصيبًا في هذه المسألة.",
                )
            notes.append("أُعطي الجد الصحيح ما بقي تعصيبًا.")
            return shares, notes, 0.0

        siblings_males = full_brothers if has_full_siblings else paternal_brothers
        siblings_females = full_sisters if has_full_siblings else paternal_sisters

        sixth_amount = round(net_estate / 6.0, 2)
        third_remaining_amount = round(remaining_amount / 3.0, 2)

        total_units = 2 + (2 * len(siblings_males)) + len(siblings_females)
        muqasama_amount = round((remaining_amount * 2) / total_units, 2) if total_units > 0 else 0.0

        best_amount = max(sixth_amount, third_remaining_amount, muqasama_amount)
        best_amount = min(best_amount, remaining_amount)

        updated = _update_existing_share_with_remainder(
            shares,
            heir=grandfather,
            remainder_amount=best_amount,
            net_estate=net_estate,
            reason_suffix="ثم أُعطي الجد الصحيح الأحظ له مع الإخوة في هذه المسألة.",
        )
        if not updated:
            _append_share(
                shares,
                heir=grandfather,
                share_type=ShareType.FARD_AND_TAASIB,
                fraction="الأحظ له",
                amount=best_amount,
                net_estate=net_estate,
                reason="الجد الصحيح مع الإخوة يأخذ الأحظ له من السدس أو ثلث الباقي أو المقاسمة.",
            )

        remainder_after_grandfather = round(remaining_amount - best_amount, 2)

        if remainder_after_grandfather > 0:
            remainder_after_grandfather = _distribute_by_units(
                shares,
                males=siblings_males,
                females=siblings_females,
                net_estate=net_estate,
                remaining_amount=remainder_after_grandfather,
                male_reason="الأخ يرث مع الجد في هذه المسألة بعد إعطاء الجد الأحظ له.",
                female_reason="الأخت ترث مع الجد في هذه المسألة بعد إعطاء الجد الأحظ له.",
            )

        notes.append("حُسب نصيب الجد الصحيح مع الإخوة على الأحظ له.")
        return shares, notes, remainder_after_grandfather

    # 4) الإخوة الأشقاء
    if full_brothers and remaining_amount > 0 and not has_father and not has_grandfather and not has_sons:
        remaining_amount = _distribute_by_units(
            shares,
            males=full_brothers,
            females=full_sisters,
            net_estate=net_estate,
            remaining_amount=remaining_amount,
            male_reason="الأخ الشقيق من العصبة بالنفس، ويأخذ الباقي، ومع الأخوات يكون للذكر مثل حظ الأنثيين.",
            female_reason="الأخت الشقيقة مع الأخ الشقيق ترث تعصيبًا، فيكون للذكر مثل حظ الأنثيين.",
        )
        notes.append("وُزّع الباقي على الإخوة الأشقاء تعصيبًا.")
        if remaining_amount <= 0:
            return shares, notes, 0.0

    # 5) الإخوة لأب
    if (
        paternal_brothers
        and remaining_amount > 0
        and not full_brothers
        and not full_sisters
        and not has_father
        and not has_grandfather
        and not has_sons
    ):
        remaining_amount = _distribute_by_units(
            shares,
            males=paternal_brothers,
            females=paternal_sisters,
            net_estate=net_estate,
            remaining_amount=remaining_amount,
            male_reason="الأخ لأب من العصبة بالنفس في هذه المسألة، ويأخذ الباقي.",
            female_reason="الأخت لأب مع الأخ لأب ترث تعصيبًا، فيكون للذكر مثل حظ الأنثيين.",
        )
        notes.append("وُزّع الباقي على الإخوة لأب تعصيبًا.")
        if remaining_amount <= 0:
            return shares, notes, 0.0

    # 6) الأخوات مع البنات
    if (
        has_daughters
        and remaining_amount > 0
        and not has_father
        and not has_grandfather
        and not has_sons
        and not full_brothers
    ):
        if full_sisters:
            each_amount = round(remaining_amount / len(full_sisters), 2)
            for sister in full_sisters:
                _append_share(
                    shares,
                    heir=sister,
                    share_type=ShareType.TAASIB,
                    fraction="الباقي",
                    amount=each_amount,
                    net_estate=net_estate,
                    reason="الأخت الشقيقة مع البنت تصير عصبة مع الغير فتأخذ ما بقي.",
                )
            notes.append("صارت الأخوات الشقيقات عصبة مع الغير لوجود البنات.")
            return shares, notes, _current_remaining(net_estate, shares)

        if paternal_sisters and not full_sisters:
            each_amount = round(remaining_amount / len(paternal_sisters), 2)
            for sister in paternal_sisters:
                _append_share(
                    shares,
                    heir=sister,
                    share_type=ShareType.TAASIB,
                    fraction="الباقي",
                    amount=each_amount,
                    net_estate=net_estate,
                    reason="الأخت لأب مع البنت تصير عصبة مع الغير عند عدم المانع.",
                )
            notes.append("صارت الأخوات لأب عصبة مع الغير لوجود البنات.")
            return shares, notes, _current_remaining(net_estate, shares)

    # 7) الأعمام
    if (
        paternal_uncles_full
        and remaining_amount > 0
        and not has_father
        and not has_grandfather
        and not has_children
        and not full_brothers
        and not full_sisters
        and not paternal_brothers
        and not paternal_sisters
    ):
        each_amount = round(remaining_amount / len(paternal_uncles_full), 2)
        for uncle in paternal_uncles_full:
            _append_share(
                shares,
                heir=uncle,
                share_type=ShareType.TAASIB,
                fraction="الباقي",
                amount=each_amount,
                net_estate=net_estate,
                reason="العم الشقيق من العصبة بالنفس عند عدم الأقرب.",
            )
        notes.append("وُزّع الباقي على الأعمام الأشقاء تعصيبًا.")
        return shares, notes, _current_remaining(net_estate, shares)

    if (
        paternal_uncles_paternal
        and remaining_amount > 0
        and not paternal_uncles_full
        and not has_father
        and not has_grandfather
        and not has_children
        and not full_brothers
        and not full_sisters
        and not paternal_brothers
        and not paternal_sisters
    ):
        each_amount = round(remaining_amount / len(paternal_uncles_paternal), 2)
        for uncle in paternal_uncles_paternal:
            _append_share(
                shares,
                heir=uncle,
                share_type=ShareType.TAASIB,
                fraction="الباقي",
                amount=each_amount,
                net_estate=net_estate,
                reason="العم لأب من العصبة بالنفس عند عدم الأقرب.",
            )
        notes.append("وُزّع الباقي على الأعمام لأب تعصيبًا.")
        return shares, notes, _current_remaining(net_estate, shares)

    return shares, notes, remaining_amount