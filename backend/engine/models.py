from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional


class DeceasedGender(str, Enum):
    MALE = "male"
    FEMALE = "female"


class ReferenceMode(str, Enum):
    UAE_LAW = "uae_law"
    FIQH = "fiqh"


class Madhhab(str, Enum):
    GENERAL = "general"
    HANAFI = "hanafi"
    MALIKI = "maliki"
    SHAFII = "shafii"
    HANBALI = "hanbali"


class HeirRole(str, Enum):
    HUSBAND = "husband"
    WIFE = "wife"

    FATHER = "father"
    MOTHER = "mother"
    GRANDFATHER_PATERNAL = "grandfather_paternal"
    GRANDMOTHER_PATERNAL = "grandmother_paternal"
    GRANDMOTHER_MATERNAL = "grandmother_maternal"

    SON = "son"
    DAUGHTER = "daughter"
    SONS_SON = "sons_son"
    SONS_DAUGHTER = "sons_daughter"

    FULL_BROTHER = "full_brother"
    FULL_SISTER = "full_sister"
    PATERNAL_BROTHER = "paternal_brother"
    PATERNAL_SISTER = "paternal_sister"
    MATERNAL_BROTHER = "maternal_brother"
    MATERNAL_SISTER = "maternal_sister"

    PATERNAL_UNCLE_FULL = "paternal_uncle_full"
    PATERNAL_UNCLE_PATERNAL = "paternal_uncle_paternal"


class ShareType(str, Enum):
    FARD = "fard"
    TAASIB = "taasib"
    FARD_AND_TAASIB = "fard_and_taasib"
    BLOCKED = "blocked"
    NONE = "none"


class CaseAdjustmentType(str, Enum):
    NONE = "none"
    AWL = "awl"
    RADD = "radd"


@dataclass
class EstateAsset:
    type: str
    value: float
    description: str = ""
    custom_type: str = ""


@dataclass
class EstateInput:
    total: float = 0.0
    debts: float = 0.0
    will: float = 0.0
    funeral: float = 0.0
    assets: List[EstateAsset] = field(default_factory=list)


@dataclass
class HeirInput:
    id: str
    role: HeirRole
    name: str
    dob: str = ""


@dataclass
class CaseInput:
    deceased_gender: DeceasedGender
    reference_mode: ReferenceMode = ReferenceMode.UAE_LAW
    madhhab: Madhhab = Madhhab.GENERAL
    estate: EstateInput = field(default_factory=EstateInput)
    heirs: List[HeirInput] = field(default_factory=list)


@dataclass
class ValidationIssue:
    code: str
    message: str
    field: Optional[str] = None
    heir_id: Optional[str] = None


@dataclass
class ValidationResult:
    is_valid: bool
    issues: List[ValidationIssue] = field(default_factory=list)


@dataclass
class EstateComputation:
    gross_estate: float
    funeral: float
    debts: float
    requested_will: float
    allowed_will: float
    net_estate: float
    notes: List[str] = field(default_factory=list)


@dataclass
class ShareResult:
    heir_id: str
    name: str
    role: HeirRole
    share_type: ShareType
    fraction: str
    amount: float
    percentage: float
    reason: str = ""


@dataclass
class BlockedHeirResult:
    heir_id: str
    name: str
    role: HeirRole
    reason: str


@dataclass
class ReferenceItem:
    source_type: str
    title: str
    citation: str
    note: str = ""
    url: str = ""


@dataclass
class AdjustmentInfo:
    type: CaseAdjustmentType = CaseAdjustmentType.NONE
    applied: bool = False
    shares_total_before: float = 0.0
    shares_total_after: float = 0.0
    net_estate: float = 0.0
    remaining_before: float = 0.0
    remaining_after: float = 0.0
    ratio: float = 1.0
    explanation: str = ""


@dataclass
class CalculationResult:
    is_valid: bool
    validation_issues: List[ValidationIssue] = field(default_factory=list)

    estate: Optional[EstateComputation] = None

    shares: List[ShareResult] = field(default_factory=list)
    blocked: List[BlockedHeirResult] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)
    references: List[ReferenceItem] = field(default_factory=list)

    adjustment: AdjustmentInfo = field(default_factory=AdjustmentInfo)