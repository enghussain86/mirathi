from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
from sentence_transformers import SentenceTransformer


BASE_DIR = Path(__file__).resolve().parent.parent
KNOWLEDGE_PATH = BASE_DIR / "data" / "assistant_knowledge.json"

ARABIC_DIACRITICS_RE = re.compile(r"[\u0617-\u061A\u064B-\u0652]")
NON_WORD_RE = re.compile(r"[^\w\u0600-\u06FF]+")

STOP_WORDS = {
    "في",
    "من",
    "على",
    "الى",
    "إلى",
    "عن",
    "ما",
    "ماذا",
    "هل",
    "هو",
    "هي",
    "هذا",
    "هذه",
    "ذلك",
    "تلك",
    "ثم",
    "او",
    "أو",
    "مع",
    "بعد",
    "قبل",
    "اذا",
    "إذا",
    "كان",
    "كانت",
    "كيف",
    "شرح",
    "اشرح",
    "لي",
    "داخل",
    "المعنى",
    "معنى",
    "الذي",
    "التي",
    "اي",
    "أي",
}

SEMANTIC_MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"


def _normalize_arabic(text: str) -> str:
    text = text or ""
    text = ARABIC_DIACRITICS_RE.sub("", text)
    text = (
        text.replace("أ", "ا")
        .replace("إ", "ا")
        .replace("آ", "ا")
        .replace("ى", "ي")
        .replace("ة", "ه")
        .replace("ؤ", "و")
        .replace("ئ", "ي")
    )
    text = NON_WORD_RE.sub(" ", text)
    return " ".join(text.lower().split())


def _tokenize(text: str) -> list[str]:
    normalized = _normalize_arabic(text)
    return [token for token in normalized.split() if token and token not in STOP_WORDS]


@lru_cache(maxsize=1)
def load_knowledge() -> list[dict[str, Any]]:
    if not KNOWLEDGE_PATH.exists():
        return []

    with KNOWLEDGE_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        return []

    cleaned: list[dict[str, Any]] = []
    for item in data:
        if isinstance(item, dict):
            cleaned.append(item)

    return cleaned


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    return SentenceTransformer(SEMANTIC_MODEL_NAME)


def _compose_entry_text(entry: dict[str, Any]) -> str:
    title = str(entry.get("title", "") or "").strip()
    tags = entry.get("tags") or []
    content = str(entry.get("content", "") or "").strip()
    citation = str(entry.get("citation", "") or "").strip()

    parts = []
    if title:
        parts.append(f"العنوان: {title}")
    if tags:
        parts.append("الكلمات المفتاحية: " + "، ".join(str(tag) for tag in tags))
    if content:
        parts.append(f"النص: {content}")
    if citation:
        parts.append(f"المرجع: {citation}")

    return "\n".join(parts).strip()


@lru_cache(maxsize=1)
def get_knowledge_index() -> dict[str, Any]:
    entries = load_knowledge()
    model = get_embedding_model()

    if not entries:
        return {"entries": [], "matrix": np.array([])}

    texts = [_compose_entry_text(entry) for entry in entries]
    embeddings = model.encode(
        texts,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )

    return {"entries": entries, "matrix": embeddings}


def _cosine_search(question: str, top_k: int = 5) -> list[tuple[float, dict[str, Any]]]:
    index = get_knowledge_index()
    entries = index["entries"]
    matrix = index["matrix"]

    if not entries or matrix.size == 0:
        return []

    model = get_embedding_model()
    question_embedding = model.encode(
        [question],
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )[0]

    scores = np.dot(matrix, question_embedding)
    ranked_indices = np.argsort(scores)[::-1][:top_k]

    results: list[tuple[float, dict[str, Any]]] = []
    for idx in ranked_indices:
        results.append((float(scores[idx]), entries[int(idx)]))

    return results


def _lexical_bonus(question: str, entry: dict[str, Any]) -> float:
    question_norm = _normalize_arabic(question)
    tokens = set(_tokenize(question))

    title = _normalize_arabic(str(entry.get("title", "") or ""))
    content = _normalize_arabic(str(entry.get("content", "") or ""))
    tags = [_normalize_arabic(str(tag)) for tag in (entry.get("tags") or [])]

    score = 0.0

    if title and title in question_norm:
        score += 0.20

    for tag in tags:
        if tag and tag in question_norm:
            score += 0.12

    for token in tokens:
        if token in title:
            score += 0.06
        if any(token == tag or token in tag for tag in tags):
            score += 0.05
        if token in content:
            score += 0.02

    if entry.get("authority") == "primary":
        score += 0.03

    return score


def _hybrid_search(question: str, top_k: int = 5) -> list[tuple[float, dict[str, Any]]]:
    semantic_results = _cosine_search(question, top_k=max(top_k, 5))
    merged: list[tuple[float, dict[str, Any]]] = []

    for semantic_score, entry in semantic_results:
        final_score = semantic_score + _lexical_bonus(question, entry)
        merged.append((final_score, entry))

    merged.sort(key=lambda item: item[0], reverse=True)
    return merged[:top_k]


def _is_definition_question(question: str) -> bool:
    normalized = _normalize_arabic(question)
    return (
        "معني" in normalized
        or "تعريف" in normalized
        or normalized.startswith("ما هو")
        or normalized.startswith("ما هي")
        or normalized.startswith("ما معنى")
        or normalized.startswith("عرف")
        or normalized.startswith("يعني ايه")
        or normalized.startswith("يعني")
        or normalized.startswith("مقصود")
    )


def _is_comparison_question(question: str) -> bool:
    normalized = _normalize_arabic(question)
    markers = [
        "الفرق",
        "ما الفرق",
        "ايه الفرق",
        "قارن",
        "مقارنه",
        "مقارنة",
        "الفرق بين",
        "ما الفرق بين",
    ]
    return any(_normalize_arabic(marker) in normalized for marker in markers)


def _is_order_question(question: str) -> bool:
    normalized = _normalize_arabic(question)
    markers = [
        "ترتيب",
        "يقدم",
        "يقدم على",
        "اولا",
        "أولا",
        "اولا ثم",
        "ما الذي يسبق",
        "ما الذي يقدم",
        "ما الاول",
        "ما الأول",
    ]
    return any(_normalize_arabic(marker) in normalized for marker in markers)


def _is_list_question(question: str) -> bool:
    normalized = _normalize_arabic(question)
    markers = [
        "من هم",
        "ما هم",
        "اذكر",
        "عدد",
        "ما هي",
        "ما هي انواع",
        "ما هي أنواع",
        "ما انواع",
        "ما أنواع",
    ]
    return any(_normalize_arabic(marker) in normalized for marker in markers)


def _is_blocking_question(question: str) -> bool:
    normalized = _normalize_arabic(question)
    markers = [
        "حجب",
        "محجوب",
        "لماذا حجب",
        "سبب الحجب",
        "اتحجب",
        "انحجب",
        "من المحجوب",
        "مين المحجوب",
    ]
    return any(_normalize_arabic(marker) in normalized for marker in markers)


def _is_shares_question(question: str) -> bool:
    normalized = _normalize_arabic(question)
    markers = [
        "نصيب",
        "كم نصيب",
        "انصبه",
        "أنصبة",
        "حصه",
        "حصة",
        "تقسيم",
        "قسمه",
        "قسمة",
        "اخذ",
        "أخذ",
        "نسبه",
        "نسبة",
        "كم نسبة",
        "النسبة",
        "percent",
        "percentage",
    ]
    return any(_normalize_arabic(marker) in normalized for marker in markers)


def _is_estate_question(question: str) -> bool:
    normalized = _normalize_arabic(question)
    markers = [
        "تركه",
        "صافي",
        "صافي التركه",
        "اجمالي التركه",
        "إجمالي التركة",
        "ديون",
        "وصيه",
        "وصية",
        "تجهيز",
        "دفن",
        "net estate",
        "gross estate",
    ]
    return any(_normalize_arabic(marker) in normalized for marker in markers)


def _is_adjustment_question(question: str) -> bool:
    normalized = _normalize_arabic(question)
    markers = [
        "عول",
        "رد",
        "الرَد",
        "العَول",
        "العول",
        "الرَّد",
        "المعالجة النهائية",
        "لماذا ظهر العول",
        "لماذا تم تطبيق الرد",
    ]
    return any(_normalize_arabic(marker) in normalized for marker in markers)


def _infer_scope(question: str, results: list[tuple[float, dict[str, Any]]]) -> bool:
    normalized = _normalize_arabic(question)

    broad_keywords = [
        "تركه",
        "ميراث",
        "مواريث",
        "فرائض",
        "حجب",
        "محجوب",
        "عول",
        "رد",
        "عصبه",
        "عصبة",
        "وارث",
        "ورثه",
        "ورثة",
        "ارث",
        "نصيب",
        "انصبه",
        "فرض",
        "تعصيب",
        "وصيه",
        "وصية",
        "ديون",
        "قسمه",
        "قسمة",
    ]

    has_broad_keyword = any(keyword in normalized for keyword in broad_keywords)

    if not results:
        return has_broad_keyword

    best_score = results[0][0]

    if best_score >= 0.42:
        return True

    if has_broad_keyword and best_score >= 0.28:
        return True

    return False


def _select_best_matches(
    question: str, results: list[tuple[float, dict[str, Any]]]
) -> list[dict[str, Any]]:
    if not results:
        return []

    matches = [entry for _, entry in results]
    primary_matches = [m for m in matches if m.get("authority") == "primary"]
    candidates = primary_matches if primary_matches else matches

    best = candidates[0]

    if _is_definition_question(question):
        return [best]

    if _is_comparison_question(question):
        selected = [best]
        best_title = _normalize_arabic(str(best.get("title", "") or ""))

        for candidate in candidates[1:]:
            title = _normalize_arabic(str(candidate.get("title", "") or ""))
            if not title or title == best_title:
                continue
            selected.append(candidate)
            if len(selected) >= 2:
                break

        return selected

    selected = [best]
    best_title = _normalize_arabic(str(best.get("title", "") or ""))

    for candidate in candidates[1:]:
        title = _normalize_arabic(str(candidate.get("title", "") or ""))
        if not title or title == best_title:
            continue
        selected.append(candidate)
        if len(selected) >= 2:
            break

    return selected


def _split_list_like_content(content: str) -> list[str]:
    parts = re.split(r"[،؛]| ثم | و ", content)
    cleaned = [part.strip(" -\n\t") for part in parts if part.strip(" -\n\t")]
    unique: list[str] = []
    seen = set()

    for item in cleaned:
        if item not in seen:
            seen.add(item)
            unique.append(item)

    return unique[:6]


def _build_citations(matches: list[dict[str, Any]]) -> list[dict[str, str]]:
    citations = []
    for match in matches[:2]:
        citations.append(
            {
                "title": str(match.get("title", "") or ""),
                "citation": str(match.get("citation", "") or ""),
                "url": str(match.get("url", "") or ""),
                "excerpt": str(match.get("content", "") or ""),
                "source_type": str(match.get("source_type", "") or ""),
            }
        )
    return citations


def _format_theoretical_answer(question: str, matches: list[dict[str, Any]]) -> str:
    if _is_definition_question(question):
        match = matches[0]
        title = str(match.get("title", "") or "").strip()
        content = str(match.get("content", "") or "").strip()
        if title:
            return f"بحسب النصوص المعتمدة الحالية:\n- {title}: {content}"
        return f"بحسب النصوص المعتمدة الحالية:\n- {content}"

    if _is_list_question(question):
        match = matches[0]
        title = str(match.get("title", "") or "").strip()
        content = str(match.get("content", "") or "").strip()
        items = _split_list_like_content(content)

        lines = ["بحسب النصوص المعتمدة الحالية:"]
        if title:
            lines.append(f"- {title}:")
        if len(items) >= 2:
            for item in items:
                lines.append(f"  • {item}")
        else:
            lines.append(f"- {content}")
        return "\n".join(lines)

    lines = ["بحسب النصوص المعتمدة الحالية:"]
    for match in matches[:1]:
        title = str(match.get("title", "") or "").strip()
        content = str(match.get("content", "") or "").strip()
        if title:
            lines.append(f"- {title}: {content}")
        else:
            lines.append(f"- {content}")
    return "\n".join(lines)


def _role_label_ar(role: str) -> str:
    labels = {
        "husband": "الزوج",
        "wife": "الزوجة",
        "father": "الأب",
        "mother": "الأم",
        "grandfather_paternal": "الجد لأب",
        "grandmother_paternal": "الجدة لأب",
        "grandmother_maternal": "الجدة لأم",
        "son": "الابن",
        "daughter": "البنت",
        "sons_son": "ابن الابن",
        "sons_daughter": "بنت الابن",
        "full_brother": "الأخ الشقيق",
        "full_sister": "الأخت الشقيقة",
        "paternal_brother": "الأخ لأب",
        "paternal_sister": "الأخت لأب",
        "maternal_brother": "الأخ لأم",
        "maternal_sister": "الأخت لأم",
        "paternal_uncle_full": "العم الشقيق",
        "paternal_uncle_paternal": "العم لأب",
    }
    return labels.get(role, role or "الوارث")


def _match_name_in_question(
    question: str,
    items: list[dict[str, Any]],
    fields: list[str],
) -> dict[str, Any] | None:
    question_norm = _normalize_arabic(question)

    role_aliases = {
        "husband": ["زوج", "الزوج"],
        "wife": ["زوجة", "الزوجة"],
        "father": ["اب", "الأب", "الاب"],
        "mother": ["ام", "الأم", "الام"],
        "son": ["ابن", "الابن", "ولد"],
        "daughter": ["بنت", "البنت"],
        "full_brother": ["اخ شقيق", "الأخ الشقيق", "الاخ الشقيق", "اخ"],
        "full_sister": ["اخت شقيقة", "الأخت الشقيقة", "الاخت الشقيقة", "اخت"],
        "paternal_brother": ["اخ لاب", "الأخ لأب", "الاخ لاب"],
        "paternal_sister": ["اخت لاب", "الأخت لأب", "الاخت لاب"],
        "maternal_brother": ["اخ لام", "الأخ لأم", "الاخ لام"],
        "maternal_sister": ["اخت لام", "الأخت لأم", "الاخت لام"],
        "grandfather_paternal": ["جد", "الجد", "الجد لاب"],
        "grandmother_paternal": ["جده", "الجدة", "الجدة لاب"],
        "grandmother_maternal": ["جده لام", "الجدة لام", "الجدة من جهة الام"],
    }

    for item in items:
        for field in fields:
            value = str(item.get(field, "") or "").strip()
            if not value:
                continue

            value_norm = _normalize_arabic(value)
            if value_norm and value_norm in question_norm:
                return item

            if field == "role":
                aliases = role_aliases.get(value, [])
                for alias in aliases:
                    if _normalize_arabic(alias) in question_norm:
                        return item

    return None


def _blocked_role_intro(name: str, role: str) -> str:
    role_label = _role_label_ar(role)
    if name:
        return name
    return role_label


def _build_blocked_answer(
    question: str,
    calculation_result: dict[str, Any],
    matches: list[dict[str, Any]],
) -> str | None:
    blocked = calculation_result.get("blocked") or []
    if not blocked:
        return None

    target = _match_name_in_question(question, blocked, ["name", "role"]) or blocked[0]
    name = str(target.get("name", "") or "").strip()
    role = str(target.get("role", "") or "").strip()
    reason = str(target.get("reason", "") or "").strip()

    display_name = _blocked_role_intro(name, role)
    role_label = _role_label_ar(role)

    lines = ["بحسب نتيجة المسألة الحالية:"]
    lines.append(f"- {display_name} محجوب في هذه المسألة.")

    if role:
        lines.append(f"- صفته: {role_label}.")

    if reason:
        lines.append(f"- سبب الحجب المسجل: {reason}.")

    if matches:
        rule_title = str(matches[0].get("title", "") or "").strip()
        rule_content = str(matches[0].get("content", "") or "").strip()
        if rule_title:
            lines.append(f"- المرجع العام المرتبط: {rule_title}: {rule_content}")

    return "\n".join(lines)


def _build_shares_answer(
    question: str,
    calculation_result: dict[str, Any],
    matches: list[dict[str, Any]],
) -> str | None:
    shares = calculation_result.get("shares") or []
    if not shares:
        return None

    target = _match_name_in_question(question, shares, ["name", "role"]) or shares[0]
    name = str(target.get("name", "") or "").strip()
    role = str(target.get("role", "") or "").strip()
    role_label = _role_label_ar(role)

    fraction = str(target.get("fraction", "") or "").strip()
    percentage = target.get("percentage", 0)
    amount = target.get("amount", 0)
    reason = str(target.get("reason", "") or "").strip()

    display_name = name if name else role_label

    lines = ["بحسب نتيجة المسألة الحالية:"]
    lines.append(f"- {display_name} يستحق في هذه المسألة نسبة {percentage}% من صافي التركة.")

    if fraction:
        lines.append(f"- الكسر أو وصف النصيب: {fraction}.")
    lines.append(f"- القيمة المستحقة: {amount}.")

    if reason:
        lines.append(f"- السبب المسجل: {reason}.")

    if matches:
        rule_title = str(matches[0].get("title", "") or "").strip()
        rule_content = str(matches[0].get("content", "") or "").strip()
        if rule_title:
            lines.append(f"- المرجع العام المرتبط: {rule_title}: {rule_content}")

    return "\n".join(lines)


def _build_estate_answer(
    calculation_result: dict[str, Any],
    matches: list[dict[str, Any]],
) -> str | None:
    estate = calculation_result.get("estate") or {}
    if not estate:
        return None

    gross_estate = estate.get("gross_estate", 0)
    funeral = estate.get("funeral", 0)
    debts = estate.get("debts", 0)
    requested_will = estate.get("requested_will", 0)
    allowed_will = estate.get("allowed_will", 0)
    net_estate = estate.get("net_estate", 0)

    lines = ["بحسب نتيجة المسألة الحالية:"]
    lines.append(f"- إجمالي التركة: {gross_estate}.")
    lines.append(f"- مصاريف التجهيز أو الدفن: {funeral}.")
    lines.append(f"- الديون: {debts}.")
    lines.append(f"- الوصية المطلوبة: {requested_will}.")
    lines.append(f"- الوصية المسموح بها: {allowed_will}.")
    lines.append(f"- صافي التركة بعد المعالجة: {net_estate}.")

    if matches:
        rule_title = str(matches[0].get("title", "") or "").strip()
        rule_content = str(matches[0].get("content", "") or "").strip()
        if rule_title:
            lines.append(f"- المرجع العام المرتبط: {rule_title}: {rule_content}")

    return "\n".join(lines)


def _build_adjustment_answer(
    calculation_result: dict[str, Any],
    matches: list[dict[str, Any]],
) -> str | None:
    adjustment = calculation_result.get("adjustment") or {}
    adjustment_type = str(adjustment.get("type", "") or "").strip()
    applied = bool(adjustment.get("applied", False))
    explanation = str(adjustment.get("explanation", "") or "").strip()

    lines = ["بحسب نتيجة المسألة الحالية:"]

    if not adjustment_type or adjustment_type == "none":
        lines.append("- لم يظهر في هذه المسألة تطبيق للعَول أو الرَّد.")
        lines.append("- نوع المعالجة الحالية: لا يوجد.")
        if explanation:
            lines.append(f"- التفسير المسجل: {explanation}.")
        return "\n".join(lines)

    lines.append(f"- نوع المعالجة الظاهرة في النتيجة الحالية: {adjustment_type}.")
    lines.append(f"- هل طُبقت فعليًا؟ {'نعم' if applied else 'لا'}.")

    if explanation:
        lines.append(f"- التفسير المسجل: {explanation}.")

    if matches:
        rule_title = str(matches[0].get("title", "") or "").strip()
        rule_content = str(matches[0].get("content", "") or "").strip()
        if rule_title:
            lines.append(f"- المرجع العام المرتبط: {rule_title}: {rule_content}")

    return "\n".join(lines)


def _build_case_linked_answer(
    question: str,
    calculation_result: dict[str, Any] | None,
    matches: list[dict[str, Any]],
) -> str | None:
    if not calculation_result:
        return None

    if _is_estate_question(question):
        return _build_estate_answer(calculation_result, matches)

    if _is_adjustment_question(question):
        return _build_adjustment_answer(calculation_result, matches)

    if _is_blocking_question(question):
        return _build_blocked_answer(question, calculation_result, matches)

    if _is_shares_question(question):
        return _build_shares_answer(question, calculation_result, matches)

    return None


def build_answer_from_retrieval(
    question: str,
    case_data: dict[str, Any] | None = None,
    calculation_result: dict[str, Any] | None = None,
) -> dict[str, Any]:
    _ = case_data
    results = _hybrid_search(question, top_k=5)

    if not _infer_scope(question, results):
        return {
            "answer": "أنا مختص فقط بأسئلة التركات والمواريث وعلم الفرائض والقانون الإماراتي في هذا الباب.",
            "in_scope": False,
            "requires_human_review": False,
            "scope": "out_of_scope",
            "citations": [],
        }

    if not results:
        return {
            "answer": "لا أجد جوابًا واضحًا لهذا السؤال في النصوص المعتمدة الحالية. أضف نصًا أو مادة مرتبطة بالسؤال ثم أعد المحاولة.",
            "in_scope": True,
            "requires_human_review": False,
            "scope": "inheritance_uae",
            "citations": [],
        }

    chosen_matches = _select_best_matches(question, results)

    case_linked_answer = _build_case_linked_answer(
        question,
        calculation_result,
        chosen_matches,
    )

    if case_linked_answer:
        answer = case_linked_answer
        citations = _build_citations(chosen_matches)
    else:
        answer = _format_theoretical_answer(question, chosen_matches)
        citations = _build_citations(chosen_matches)

    return {
        "answer": answer,
        "in_scope": True,
        "requires_human_review": False,
        "scope": "inheritance_uae",
        "citations": citations,
    }