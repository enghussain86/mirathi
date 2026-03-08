from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from api.assistant_retrieval import (
    build_answer_from_retrieval,
    get_embedding_model,
    get_knowledge_index,
)
from api.case_repository import get_case, init_db, save_case
from api.schemas import (
    AdjustmentResponse,
    AssistantChatRequest,
    AssistantChatResponse,
    AssistantCitation,
    BlockedHeirResponse,
    CalculationRequest,
    CalculationResponse,
    EstateResponse,
    ReferenceResponse,
    SavedCaseMetaResponse,
    SavedCaseResponse,
    ShareResponse,
    ValidationIssueResponse,
)
from engine.calculator import calculate_case
from engine.models import (
    CaseInput,
    DeceasedGender,
    EstateAsset,
    EstateInput,
    HeirInput,
    HeirRole,
    Madhhab,
    ReferenceMode,
)

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")

raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
).strip()

if raw_origins == "*":
    cors_allow_origins = ["*"]
    cors_allow_credentials = False
else:
    cors_allow_origins = [
        origin.strip() for origin in raw_origins.split(",") if origin.strip()
    ]
    cors_allow_credentials = True

app = FastAPI(
    title="Mirathi API",
    description="API for inheritance calculation engine",
    version="0.5.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allow_origins,
    allow_credentials=cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    get_embedding_model()
    get_knowledge_index()


def _map_request_to_engine(payload: CalculationRequest) -> CaseInput:
    return CaseInput(
        deceased_gender=DeceasedGender(payload.deceased_gender),
        reference_mode=ReferenceMode(payload.reference_mode),
        madhhab=Madhhab(payload.madhhab),
        estate=EstateInput(
            total=payload.estate.total,
            debts=payload.estate.debts,
            will=payload.estate.will,
            funeral=payload.estate.funeral,
            assets=[
                EstateAsset(
                    type=asset.type,
                    value=asset.value,
                    description=asset.description,
                    custom_type=asset.custom_type,
                )
                for asset in payload.estate.assets
            ],
        ),
        heirs=[
            HeirInput(
                id=heir.id,
                role=HeirRole(heir.role),
                name=heir.name,
                dob=heir.dob,
            )
            for heir in payload.heirs
        ],
    )


def _map_engine_to_response(result) -> CalculationResponse:
    return CalculationResponse(
        is_valid=result.is_valid,
        validation_issues=[
            ValidationIssueResponse(
                code=issue.code,
                message=issue.message,
                field=issue.field,
                heir_id=issue.heir_id,
            )
            for issue in result.validation_issues
        ],
        estate=(
            EstateResponse(
                gross_estate=result.estate.gross_estate,
                funeral=result.estate.funeral,
                debts=result.estate.debts,
                requested_will=result.estate.requested_will,
                allowed_will=result.estate.allowed_will,
                net_estate=result.estate.net_estate,
                notes=result.estate.notes,
            )
            if result.estate
            else None
        ),
        shares=[
            ShareResponse(
                heir_id=share.heir_id,
                name=share.name,
                role=share.role.value,
                share_type=share.share_type.value,
                fraction=share.fraction,
                amount=share.amount,
                percentage=share.percentage,
                reason=share.reason,
            )
            for share in result.shares
        ],
        blocked=[
            BlockedHeirResponse(
                heir_id=item.heir_id,
                name=item.name,
                role=item.role.value,
                reason=item.reason,
            )
            for item in result.blocked
        ],
        notes=result.notes,
        references=[
            ReferenceResponse(
                source_type=ref.source_type,
                title=ref.title,
                citation=ref.citation,
                note=ref.note,
                url=ref.url,
            )
            for ref in result.references
        ],
        adjustment=AdjustmentResponse(
            type=result.adjustment.type.value,
            applied=result.adjustment.applied,
            shares_total_before=result.adjustment.shares_total_before,
            shares_total_after=result.adjustment.shares_total_after,
            net_estate=result.adjustment.net_estate,
            remaining_before=result.adjustment.remaining_before,
            remaining_after=result.adjustment.remaining_after,
            ratio=result.adjustment.ratio,
            explanation=result.adjustment.explanation,
        ),
    )


def _build_share_url(case_id: str) -> str:
    return f"{FRONTEND_BASE_URL.rstrip('/')}/case/result?caseId={case_id}"


@app.get("/")
def root() -> dict[str, str]:
    return {
        "app": "Mirathi API",
        "status": "ok",
        "message": "Inheritance engine is running.",
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy"}


@app.post("/calculate", response_model=CalculationResponse)
def calculate(payload: CalculationRequest) -> CalculationResponse:
    case = _map_request_to_engine(payload)
    result = calculate_case(case)
    return _map_engine_to_response(result)


@app.post("/cases/compute-and-save", response_model=SavedCaseResponse)
def compute_and_save_case(payload: CalculationRequest) -> SavedCaseResponse:
    case = _map_request_to_engine(payload)
    engine_result = calculate_case(case)
    mapped_result = _map_engine_to_response(engine_result)

    saved = save_case(
        payload.model_dump(),
        mapped_result.model_dump(),
    )

    return SavedCaseResponse(
        meta=SavedCaseMetaResponse(
            case_id=saved["case_id"],
            created_at=saved["created_at"],
            share_url=_build_share_url(saved["case_id"]),
        ),
        input=payload,
        result=mapped_result,
    )


@app.get("/cases/{case_id}", response_model=SavedCaseResponse)
def get_saved_case(case_id: str) -> SavedCaseResponse:
    row = get_case(case_id)
    if not row:
        raise HTTPException(status_code=404, detail="Case not found")

    return SavedCaseResponse(
        meta=SavedCaseMetaResponse(
            case_id=row["case_id"],
            created_at=row["created_at"],
            share_url=_build_share_url(row["case_id"]),
        ),
        input=CalculationRequest(**row["payload"]),
        result=CalculationResponse(**row["result"]),
    )


@app.post("/assistant/chat", response_model=AssistantChatResponse)
def assistant_chat(payload: AssistantChatRequest) -> AssistantChatResponse:
    result = build_answer_from_retrieval(
        payload.question,
        case_data=payload.case_data,
        calculation_result=payload.calculation_result,
    )

    return AssistantChatResponse(
        answer=result["answer"],
        in_scope=result["in_scope"],
        requires_human_review=result["requires_human_review"],
        scope=result["scope"],
        citations=[
            AssistantCitation(**citation)
            for citation in result.get("citations", [])
        ],
    )