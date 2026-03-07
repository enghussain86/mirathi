# backend/engine/validator.py
from __future__ import annotations

from datetime import date
from typing import Dict, List

from .models import (
    CaseInput,
    DeceasedGender,
    HeirRole,
    ValidationIssue,
    ValidationResult,
)


_SINGLE_INSTANCE_ROLES = {
    HeirRole.HUSBAND,
    HeirRole.FATHER,
    HeirRole.MOTHER,
    HeirRole.GRANDFATHER_PATERNAL,
    HeirRole.GRANDMOTHER_PATERNAL,
    HeirRole.GRANDMOTHER_MATERNAL,
}

_ALLOWED_FOR_DECEASED_GENDER = {
    HeirRole.HUSBAND: DeceasedGender.FEMALE,
    HeirRole.WIFE: DeceasedGender.MALE,
}


def _parse_iso_date(value: str) -> bool:
    if not value:
        return False
    try:
        year, month, day = map(int, value.split("-"))
        parsed = date(year, month, day)
        return parsed <= date.today()
    except Exception:
        return False


def validate_case_input(case: CaseInput) -> ValidationResult:
    issues: List[ValidationIssue] = []

    # Estate validation
    if case.estate.total < 0:
        issues.append(
            ValidationIssue(
                code="estate_total_negative",
                field="estate.total",
                message="إجمالي التركة لا يجوز أن يكون سالبًا.",
            )
        )

    if case.estate.debts < 0:
        issues.append(
            ValidationIssue(
                code="estate_debts_negative",
                field="estate.debts",
                message="الديون لا يجوز أن تكون سالبة.",
            )
        )

    if case.estate.will < 0:
        issues.append(
            ValidationIssue(
                code="estate_will_negative",
                field="estate.will",
                message="الوصية لا يجوز أن تكون سالبة.",
            )
        )

    if case.estate.funeral < 0:
        issues.append(
            ValidationIssue(
                code="estate_funeral_negative",
                field="estate.funeral",
                message="مصاريف التجهيز والدفن لا يجوز أن تكون سالبة.",
            )
        )

    # Heirs validation
    role_counts: Dict[HeirRole, int] = {}
    seen_ids = set()

    for heir in case.heirs:
        # Unique ID
        if heir.id in seen_ids:
            issues.append(
                ValidationIssue(
                    code="duplicate_heir_id",
                    heir_id=heir.id,
                    message="يوجد تكرار في معرّف أحد الورثة.",
                )
            )
        seen_ids.add(heir.id)

        # Name
        if not heir.name.strip():
            issues.append(
                ValidationIssue(
                    code="heir_name_required",
                    field="heirs.name",
                    heir_id=heir.id,
                    message="اسم الوارث مطلوب.",
                )
            )

        # DOB if present must be valid and not in future
        if heir.dob and not _parse_iso_date(heir.dob):
            issues.append(
                ValidationIssue(
                    code="heir_dob_invalid",
                    field="heirs.dob",
                    heir_id=heir.id,
                    message="تاريخ الميلاد غير صحيح أو في المستقبل.",
                )
            )

        role_counts[heir.role] = role_counts.get(heir.role, 0) + 1

        # Gender compatibility for spouse roles
        if heir.role in _ALLOWED_FOR_DECEASED_GENDER:
            expected = _ALLOWED_FOR_DECEASED_GENDER[heir.role]
            if case.deceased_gender != expected:
                msg = (
                    "لا يمكن إضافة زوج إذا كان المتوفى ذكرًا."
                    if heir.role == HeirRole.HUSBAND
                    else "لا يمكن إضافة زوجة إذا كانت المتوفاة أنثى."
                )
                issues.append(
                    ValidationIssue(
                        code="invalid_spouse_for_deceased_gender",
                        heir_id=heir.id,
                        message=msg,
                    )
                )

    # Single-instance roles
    for role in _SINGLE_INSTANCE_ROLES:
        if role_counts.get(role, 0) > 1:
            issues.append(
                ValidationIssue(
                    code="duplicate_single_role",
                    message=f"لا يجوز تكرار الوارث: {role.value}.",
                )
            )

    # Husband max 1
    if role_counts.get(HeirRole.HUSBAND, 0) > 1:
        issues.append(
            ValidationIssue(
                code="husband_more_than_one",
                message="لا يجوز وجود أكثر من زوج واحد.",
            )
        )

    # Wives max 4
    if role_counts.get(HeirRole.WIFE, 0) > 4:
        issues.append(
            ValidationIssue(
                code="wives_more_than_four",
                message="الحد الأقصى للزوجات هو أربع زوجات.",
            )
        )

    return ValidationResult(is_valid=(len(issues) == 0), issues=issues)