# backend/engine/calculator.py
from __future__ import annotations

from .models import (
    AdjustmentInfo,
    CalculationResult,
    CaseAdjustmentType,
    CaseInput,
    HeirRole,
    ShareResult,
    ShareType,
)
from .validator import validate_case_input
from .rules.estate import compute_estate
from .rules.blockers import apply_basic_blockers
from .rules.fixed_shares import calculate_basic_fixed_shares
from .rules.asaba import apply_asaba
from .rules.references import get_basic_references


def _clone_share(
    share: ShareResult,
    *,
    amount: float,
    percentage: float,
    reason_suffix: str = "",
) -> ShareResult:
    reason = share.reason.strip()
    if reason_suffix:
        reason = f"{reason} {reason_suffix}".strip() if reason else reason_suffix

    return ShareResult(
        heir_id=share.heir_id,
        name=share.name,
        role=share.role,
        share_type=share.share_type,
        fraction=share.fraction,
        amount=round(amount, 2),
        percentage=round(percentage, 4),
        reason=reason,
    )


def _apply_awl(
    shares: list[ShareResult],
    net_estate: float,
) -> tuple[list[ShareResult], list[str], AdjustmentInfo]:
    notes: list[str] = []

    adjustment = AdjustmentInfo(
        type=CaseAdjustmentType.NONE,
        applied=False,
        shares_total_before=round(sum(share.amount for share in shares), 2),
        shares_total_after=round(sum(share.amount for share in shares), 2),
        net_estate=round(net_estate, 2),
        remaining_before=round(net_estate - sum(share.amount for share in shares), 2),
        remaining_after=round(net_estate - sum(share.amount for share in shares), 2),
        ratio=1.0,
        explanation="لم يتم تطبيق العَول.",
    )

    if net_estate <= 0 or not shares:
        return shares, notes, adjustment

    total_amount = round(sum(share.amount for share in shares), 2)
    if total_amount <= net_estate:
        return shares, notes, adjustment

    ratio = net_estate / total_amount if total_amount else 1.0
    adjusted: list[ShareResult] = []

    for share in shares:
        new_amount = round(share.amount * ratio, 2)
        new_percentage = round((new_amount / net_estate) * 100, 4) if net_estate else 0.0

        adjusted.append(
            _clone_share(
                share,
                amount=new_amount,
                percentage=new_percentage,
                reason_suffix="ثم عُدّل هذا النصيب بعد تطبيق العَول.",
            )
        )

    total_after = round(sum(share.amount for share in adjusted), 2)
    remaining_after = round(net_estate - total_after, 2)

    notes.append("حدث عَول في المسألة لأن مجموع الفروض تجاوز صافي التركة.")
    notes.append("تم تخفيض الأنصبة بنسبة عادلة حتى يساوي مجموعها صافي التركة.")

    adjustment = AdjustmentInfo(
        type=CaseAdjustmentType.AWL,
        applied=True,
        shares_total_before=total_amount,
        shares_total_after=total_after,
        net_estate=round(net_estate, 2),
        remaining_before=round(net_estate - total_amount, 2),
        remaining_after=remaining_after,
        ratio=round(ratio, 8),
        explanation="تم تطبيق العَول لأن مجموع الفروض كان أكبر من صافي التركة.",
    )

    return adjusted, notes, adjustment


def _apply_radd(
    shares: list[ShareResult],
    net_estate: float,
) -> tuple[list[ShareResult], list[str], AdjustmentInfo]:
    notes: list[str] = []

    total_before = round(sum(share.amount for share in shares), 2)
    remaining_before = round(net_estate - total_before, 2)

    adjustment = AdjustmentInfo(
        type=CaseAdjustmentType.NONE,
        applied=False,
        shares_total_before=total_before,
        shares_total_after=total_before,
        net_estate=round(net_estate, 2),
        remaining_before=remaining_before,
        remaining_after=remaining_before,
        ratio=1.0,
        explanation="لم يتم تطبيق الرَّد.",
    )

    if net_estate <= 0 or not shares:
        return shares, notes, adjustment

    if remaining_before <= 0:
        return shares, notes, adjustment

    has_taasib = any(
        share.share_type in (ShareType.TAASIB, ShareType.FARD_AND_TAASIB)
        for share in shares
    )
    if has_taasib:
        return shares, notes, adjustment

    radd_eligible = [
        share
        for share in shares
        if share.role not in (HeirRole.HUSBAND, HeirRole.WIFE)
    ]

    if not radd_eligible:
        return shares, notes, adjustment

    pool_total = round(sum(share.amount for share in radd_eligible), 2)
    if pool_total <= 0:
        return shares, notes, adjustment

    adjusted: list[ShareResult] = []
    eligible_ids = {share.heir_id for share in radd_eligible}

    for share in shares:
        if share.heir_id in eligible_ids:
            ratio = share.amount / pool_total if pool_total else 0.0
            extra = round(remaining_before * ratio, 2)
            new_amount = round(share.amount + extra, 2)
            new_percentage = round((new_amount / net_estate) * 100, 4) if net_estate else 0.0

            adjusted.append(
                _clone_share(
                    share,
                    amount=new_amount,
                    percentage=new_percentage,
                    reason_suffix="ثم زيد هذا النصيب بعد تطبيق الرَّد.",
                )
            )
        else:
            adjusted.append(
                _clone_share(
                    share,
                    amount=share.amount,
                    percentage=share.percentage,
                )
            )

    total_after = round(sum(share.amount for share in adjusted), 2)
    remaining_after = round(net_estate - total_after, 2)

    notes.append("تم تطبيق الرَّد لوجود باقي من التركة وعدم وجود عاصب يأخذه.")
    notes.append("وُزّع الباقي على أصحاب الفروض المستحقين للرَّد دون الزوجين.")

    adjustment = AdjustmentInfo(
        type=CaseAdjustmentType.RADD,
        applied=True,
        shares_total_before=total_before,
        shares_total_after=total_after,
        net_estate=round(net_estate, 2),
        remaining_before=remaining_before,
        remaining_after=remaining_after,
        ratio=round(total_after / total_before, 8) if total_before else 1.0,
        explanation="تم تطبيق الرَّد لأن جزءًا من التركة بقي بعد الفروض ولم يوجد عاصب يأخذه.",
    )

    return adjusted, notes, adjustment


def calculate_case(case: CaseInput) -> CalculationResult:
    validation = validate_case_input(case)
    if not validation.is_valid:
        return CalculationResult(
            is_valid=False,
            validation_issues=validation.issues,
            notes=["تعذر إتمام الحساب بسبب وجود أخطاء في المدخلات."],
        )

    estate_result = compute_estate(case.estate)
    eligible_heirs, blocked_heirs = apply_basic_blockers(case.heirs)

    shares, used_fraction, share_notes, remaining_amount = calculate_basic_fixed_shares(
        eligible_heirs,
        estate_result.net_estate,
    )

    notes: list[str] = []
    notes.extend(estate_result.notes)
    notes.extend(share_notes)

    adjustment = AdjustmentInfo(
        type=CaseAdjustmentType.NONE,
        applied=False,
        shares_total_before=round(sum(share.amount for share in shares), 2),
        shares_total_after=round(sum(share.amount for share in shares), 2),
        net_estate=round(estate_result.net_estate, 2),
        remaining_before=round(estate_result.net_estate - sum(share.amount for share in shares), 2),
        remaining_after=round(estate_result.net_estate - sum(share.amount for share in shares), 2),
        ratio=1.0,
        explanation="لم يتم تطبيق العَول ولا الرَّد.",
    )

    # 1) العول أولًا على الفروض
    shares, awl_notes, awl_adjustment = _apply_awl(shares, estate_result.net_estate)
    notes.extend(awl_notes)

    if awl_adjustment.applied:
        adjustment = awl_adjustment
        final_remaining_amount = round(
            estate_result.net_estate - sum(share.amount for share in shares), 2
        )
    else:
        # 2) العصبات بعد الفروض إذا لم يقع عَول
        shares, asaba_notes, _ = apply_asaba(
            eligible_heirs,
            shares,
            estate_result.net_estate,
            madhhab=case.madhhab,
        )
        notes.extend(asaba_notes)

        # 3) الرد إذا بقي شيء ولم يوجد عاصب
        shares, radd_notes, radd_adjustment = _apply_radd(shares, estate_result.net_estate)
        notes.extend(radd_notes)

        if radd_adjustment.applied:
            adjustment = radd_adjustment

        final_remaining_amount = round(
            estate_result.net_estate - sum(share.amount for share in shares), 2
        )

    adjustment.shares_total_after = round(sum(share.amount for share in shares), 2)
    adjustment.remaining_after = final_remaining_amount
    adjustment.net_estate = round(estate_result.net_estate, 2)

    if blocked_heirs:
        notes.append("تم تطبيق الحجب على بعض الورثة بحسب ترتيب الاستحقاق.")

    if final_remaining_amount > 0:
        notes.append("تبقى جزء من التركة بعد الحساب الحالي، وهذه المسألة قد تحتاج توسعة إضافية في بعض الفروع الخاصة.")

    if len(case.heirs) == 0:
        notes.append("لم يتم إدخال أي ورثة.")

    if adjustment.type == CaseAdjustmentType.NONE:
        notes.append("لم تحتج المسألة إلى عَول أو رَد في وضعها الحالي.")

    references = get_basic_references(case)

    return CalculationResult(
        is_valid=True,
        estate=estate_result,
        shares=shares,
        blocked=blocked_heirs,
        notes=notes,
        references=references,
        adjustment=adjustment,
    )