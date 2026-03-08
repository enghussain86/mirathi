from __future__ import annotations

from typing import Any, List, Literal, Optional

from pydantic import BaseModel, Field


DeceasedGenderLiteral = Literal["male", "female"]
ReferenceModeLiteral = Literal["uae_law", "fiqh"]
MadhhabLiteral = Literal["general", "hanafi", "maliki", "shafii", "hanbali"]

HeirRoleLiteral = Literal[
    "husband",
    "wife",
    "father",
    "mother",
    "grandfather_paternal",
    "grandmother_paternal",
    "grandmother_maternal",
    "son",
    "daughter",
    "sons_son",
    "sons_daughter",
    "full_brother",
    "full_sister",
    "paternal_brother",
    "paternal_sister",
    "maternal_brother",
    "maternal_sister",
    "paternal_uncle_full",
    "paternal_uncle_paternal",
]

AssetTypeLiteral = Literal[
    "financial_amounts",
    "real_estate",
    "land",
    "gold_jewelry",
    "vehicles",
    "stocks_investments",
    "other",
]

CaseAdjustmentLiteral = Literal["none", "awl", "radd"]
AssistantScopeLiteral = Literal["inheritance_uae", "out_of_scope", "needs_review"]


class EstateAssetPayload(BaseModel):
    type: AssetTypeLiteral
    value: float = 0
    description: str = ""
    custom_type: str = ""


class EstatePayload(BaseModel):
    total: float = 0
    debts: float = 0
    will: float = 0
    funeral: float = 0
    assets: List[EstateAssetPayload] = Field(default_factory=list)


class HeirPayload(BaseModel):
    id: str
    role: HeirRoleLiteral
    name: str
    dob: str = ""


class CalculationRequest(BaseModel):
    deceased_gender: DeceasedGenderLiteral
    reference_mode: ReferenceModeLiteral = "uae_law"
    madhhab: MadhhabLiteral = "general"
    estate: EstatePayload
    heirs: List[HeirPayload] = Field(default_factory=list)


class ValidationIssueResponse(BaseModel):
    code: str
    message: str
    field: Optional[str] = None
    heir_id: Optional[str] = None


class EstateResponse(BaseModel):
    gross_estate: float
    funeral: float
    debts: float
    requested_will: float
    allowed_will: float
    net_estate: float
    notes: List[str]


class ShareResponse(BaseModel):
    heir_id: str
    name: str
    role: str
    share_type: str
    fraction: str
    amount: float
    percentage: float
    reason: str


class BlockedHeirResponse(BaseModel):
    heir_id: str
    name: str
    role: str
    reason: str


class ReferenceResponse(BaseModel):
    source_type: str
    title: str
    citation: str
    note: str
    url: str


class AdjustmentResponse(BaseModel):
    type: CaseAdjustmentLiteral = "none"
    applied: bool = False
    shares_total_before: float = 0
    shares_total_after: float = 0
    net_estate: float = 0
    remaining_before: float = 0
    remaining_after: float = 0
    ratio: float = 1
    explanation: str = ""


class CalculationResponse(BaseModel):
    is_valid: bool
    validation_issues: List[ValidationIssueResponse] = Field(default_factory=list)
    estate: Optional[EstateResponse] = None
    shares: List[ShareResponse] = Field(default_factory=list)
    blocked: List[BlockedHeirResponse] = Field(default_factory=list)
    notes: List[str] = Field(default_factory=list)
    references: List[ReferenceResponse] = Field(default_factory=list)
    adjustment: AdjustmentResponse = Field(default_factory=AdjustmentResponse)


class SavedCaseMetaResponse(BaseModel):
    case_id: str
    created_at: str
    share_url: str


class SavedCaseResponse(BaseModel):
    meta: SavedCaseMetaResponse
    input: CalculationRequest
    result: CalculationResponse


class AssistantPageContext(BaseModel):
    page: Optional[str] = None
    section: Optional[str] = None
    language: str = "ar"


class AssistantHistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AssistantCitation(BaseModel):
    title: str = ""
    citation: str = ""
    url: str = ""
    excerpt: str = ""
    source_type: str = ""


class AssistantChatRequest(BaseModel):
    question: str = Field(..., min_length=1)
    page_context: Optional[AssistantPageContext] = None
    case_data: Optional[dict[str, Any]] = None
    calculation_result: Optional[dict[str, Any]] = None
    conversation_history: List[AssistantHistoryMessage] = Field(default_factory=list)


class AssistantChatResponse(BaseModel):
    answer: str
    in_scope: bool = True
    requires_human_review: bool = False
    scope: AssistantScopeLiteral = "inheritance_uae"
    citations: List[AssistantCitation] = Field(default_factory=list)