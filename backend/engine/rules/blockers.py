from __future__ import annotations

from typing import Dict, List, Tuple

from ..models import BlockedHeirResult, HeirInput, HeirRole


def _group_heirs_by_role(heirs: List[HeirInput]) -> Dict[HeirRole, List[HeirInput]]:
    grouped: Dict[HeirRole, List[HeirInput]] = {}
    for heir in heirs:
        grouped.setdefault(heir.role, []).append(heir)
    return grouped


def apply_basic_blockers(
    heirs: List[HeirInput],
) -> Tuple[List[HeirInput], List[BlockedHeirResult]]:
    """
    حجب أساسي محسّن ومناسب للمرحلة الحالية من المحرك.

    القواعد الأساسية المعتمدة هنا:
    - وجود الأم يحجب الجدات.
    - وجود الأب يحجب:
      الجد لأب، والإخوة والأخوات جميعًا، والأعمام.
    - وجود الابن يحجب:
      أبناء الابن وبنات الابن، والإخوة والأخوات، والأعمام.
    - وجود أي فرع وارث مباشر (ابن أو بنت) يحجب:
      أولاد الابن وبنات الابن في هذه المرحلة.
    - مجرد وجود البنت لا يحجب الإخوة الأشقاء تلقائيًا.
      بل قد يبقى لهم الباقي تعصيبًا في بعض الصور.
    """

    grouped = _group_heirs_by_role(heirs)

    has_father = len(grouped.get(HeirRole.FATHER, [])) > 0
    has_mother = len(grouped.get(HeirRole.MOTHER, [])) > 0
    has_son = len(grouped.get(HeirRole.SON, [])) > 0
    has_daughter = len(grouped.get(HeirRole.DAUGHTER, [])) > 0
    has_children = has_son or has_daughter

    blocked_roles_with_reason: Dict[HeirRole, str] = {}

    # الأم تحجب الجدات
    if has_mother:
        blocked_roles_with_reason[HeirRole.GRANDMOTHER_PATERNAL] = "محجوبة بالأم"
        blocked_roles_with_reason[HeirRole.GRANDMOTHER_MATERNAL] = "محجوبة بالأم"

    # الأب يحجب الجد والإخوة والأعمام
    if has_father:
        blocked_roles_with_reason[HeirRole.GRANDFATHER_PATERNAL] = "محجوب بالأب"

        blocked_roles_with_reason[HeirRole.FULL_BROTHER] = "محجوب بالأب"
        blocked_roles_with_reason[HeirRole.FULL_SISTER] = "محجوبة بالأب"
        blocked_roles_with_reason[HeirRole.PATERNAL_BROTHER] = "محجوب بالأب"
        blocked_roles_with_reason[HeirRole.PATERNAL_SISTER] = "محجوبة بالأب"
        blocked_roles_with_reason[HeirRole.MATERNAL_BROTHER] = "محجوب بالأب"
        blocked_roles_with_reason[HeirRole.MATERNAL_SISTER] = "محجوبة بالأب"

        blocked_roles_with_reason[HeirRole.PATERNAL_UNCLE_FULL] = "محجوب بالأب"
        blocked_roles_with_reason[HeirRole.PATERNAL_UNCLE_PATERNAL] = "محجوب بالأب"

    # الابن يحجب أبناء الابن وبنات الابن والإخوة والأعمام
    if has_son:
        blocked_roles_with_reason[HeirRole.SONS_SON] = "محجوب بالابن"
        blocked_roles_with_reason[HeirRole.SONS_DAUGHTER] = "محجوبة بالابن"

        blocked_roles_with_reason[HeirRole.FULL_BROTHER] = "محجوب بالابن"
        blocked_roles_with_reason[HeirRole.FULL_SISTER] = "محجوبة بالابن"
        blocked_roles_with_reason[HeirRole.PATERNAL_BROTHER] = "محجوب بالابن"
        blocked_roles_with_reason[HeirRole.PATERNAL_SISTER] = "محجوبة بالابن"
        blocked_roles_with_reason[HeirRole.MATERNAL_BROTHER] = "محجوب بالابن"
        blocked_roles_with_reason[HeirRole.MATERNAL_SISTER] = "محجوبة بالابن"

        blocked_roles_with_reason[HeirRole.PATERNAL_UNCLE_FULL] = "محجوب بالابن"
        blocked_roles_with_reason[HeirRole.PATERNAL_UNCLE_PATERNAL] = "محجوب بالابن"

    # وجود أي فرع وارث مباشر يحجب أولاد الابن في هذه المرحلة
    if has_children:
        blocked_roles_with_reason.setdefault(
            HeirRole.SONS_SON, "محجوب بوجود فرع وارث أقرب"
        )
        blocked_roles_with_reason.setdefault(
            HeirRole.SONS_DAUGHTER, "محجوبة بوجود فرع وارث أقرب"
        )

    eligible: List[HeirInput] = []
    blocked: List[BlockedHeirResult] = []

    for heir in heirs:
        reason = blocked_roles_with_reason.get(heir.role)
        if reason:
            blocked.append(
                BlockedHeirResult(
                    heir_id=heir.id,
                    name=heir.name,
                    role=heir.role,
                    reason=reason,
                )
            )
        else:
            eligible.append(heir)

    return eligible, blocked