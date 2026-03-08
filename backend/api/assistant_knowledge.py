from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any


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
    "page",
    "معنى",
    "المعنى",
}


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


def _is_in_scope_question(question: str) -> bool:
    keywords = [
        "تركة",
        "تركات",
        "ميراث",
        "مواريث",
        "فرائض",
        "حجب",
        "محجوب",
        "عول",
        "رد",
        "عصبة",
        "عصبه",
        "وارث",
        "ورثة",
        "ورثه",
        "إرث",
        "ارث",
        "نصيب",
        "أنصبة",
        "انصبه",
        "فرض",
        "تعصيب",
        "وصية",
        "وصيه",
        "ديون",
        "قسمة",
        "قسمه",
        "estate",
        "inheritance",
        "heir",
        "shares",
    ]

    normalized_question = _normalize_arabic(question)
    normalized_keywords = [_normalize_arabic(keyword) for keyword in keywords]

    return any(keyword in normalized_question for keyword in normalized_keywords)


@lru_cache(maxsize=1)
def load_knowledge() -> list[dict[str, Any]]:
    if not KNOWLEDGE_PATH.exists():
        return []

    with KNOWLEDGE_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        return []

    return data


def _score_entry(question: str, entry: dict[str, Any]) -> float:
    question_norm = _normalize_arabic(question)
    question_tokens = set(_tokenize(question))

    title = str(entry.get("title", "") or "")
    content = str(entry.get("content", "") or "")
    tags = entry.get("tags") or []

    title_norm = _normalize_arabic(title)
    content_norm = _normalize_arabic(content)
    tag_norms = [_normalize_arabic(str(tag)) for tag in tags]

    score = 0.0

    # أولوية قوية للتطابق المباشر مع العنوان
    if title_norm and title_norm in question_norm:
        score += 20.0

    # أولوية قوية للتطابق المباشر مع التاج
    for tag_norm in tag_norms:
        if tag_norm and tag_norm in question_norm:
            score += 12.0

    # لو السؤال قصير جدًا وفيه كلمة محورية، نكافئ العنوان الذي يحتويها
    for token in question_tokens:
        if token in title_norm:
            score += 6.0
        if token in tag_norms:
            score += 5.0
        if token in content_norm:
            score += 2.0

    # أولوية للمصادر الأساسية
    if entry.get("authority") == "primary":
        score += 2.0

    # تحسين خاص لأسئلة التعريف: "ما معنى ..." أو "ما هو ..."
    is_definition_question = (
        "معني" in question_norm
        or "تعريف" in question_norm
        or question_norm.startswith("ما هو")
        or question_norm.startswith("ما هي")
        or question_norm.startswith("ما معنى")
    )

    if is_definition_question:
        if title_norm and any(token in title_norm for token in question_tokens):
            score += 8.0

    # تقليل وزن المواد العامة جدًا لو يوجد سؤال أدق
    generic_title_markers = [
        "الحقوق المتعلقه بالتركه",
        "اشكال الميراث",
        "الارث في الاسلام",
        "علم الفرائض",
    ]
    if title_norm in generic_title_markers:
        score -= 1.5

    return score


def search_knowledge(question: str, top_k: int = 3) -> list[dict[str, Any]]:
    entries = load_knowledge()
    scored: list[tuple[float, dict[str, Any]]] = []

    for entry in entries:
        score = _score_entry(question, entry)
        if score > 0:
            scored.append((score, entry))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [entry for _, entry in scored[:top_k]]


def _select_best_matches(question: str, matches: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not matches:
        return []

    question_norm = _normalize_arabic(question)
    question_tokens = set(_tokenize(question))

    primary_matches = [m for m in matches if m.get("authority") == "primary"]
    candidate_matches = primary_matches if primary_matches else matches

    best = candidate_matches[0]
    best_title_norm = _normalize_arabic(str(best.get("title", "") or ""))

    # في أسئلة التعريف نكتفي غالبًا بأقرب مادة واحدة
    is_definition_question = (
        "معني" in question_norm
        or "تعريف" in question_norm
        or question_norm.startswith("ما هو")
        or question_norm.startswith("ما هي")
        or question_norm.startswith("ما معنى")
    )

    if is_definition_question:
        return [best]

    # في غير ذلك نضيف مادة ثانية فقط إذا كانت مختلفة فعلًا ومفيدة
    selected = [best]

    for match in candidate_matches[1:]:
        title_norm = _normalize_arabic(str(match.get("title", "") or ""))
        if not title_norm or title_norm == best_title_norm:
            continue

        overlap = 0
        for token in question_tokens:
            if token and token in title_norm:
                overlap += 1

        if overlap >= 1:
            selected.append(match)

        if len(selected) >= 2:
            break

    return selected


def build_answer_from_knowledge(question: str) -> dict[str, Any]:
    if not _is_in_scope_question(question):
        return {
            "answer": "أنا مختص فقط بأسئلة التركات والمواريث وعلم الفرائض والقانون الإماراتي في هذا الباب.",
            "in_scope": False,
            "requires_human_review": False,
            "scope": "out_of_scope",
            "citations": [],
        }

    matches = search_knowledge(question, top_k=5)

    if not matches:
        return {
            "answer": "لا أجد جوابًا واضحًا لهذا السؤال في النصوص المعتمدة الحالية. أضف نصًا أو مادة قانونية مرتبطة بالسؤال ثم أعد المحاولة.",
            "in_scope": True,
            "requires_human_review": False,
            "scope": "inheritance_uae",
            "citations": [],
        }

    chosen_matches = _select_best_matches(question, matches)

    answer_lines = ["بحسب النصوص المعتمدة الحالية:"]

    for match in chosen_matches:
        title = str(match.get("title", "") or "").strip()
        content = str(match.get("content", "") or "").strip()

        if title:
            answer_lines.append(f"- {title}: {content}")
        else:
            answer_lines.append(f"- {content}")

    if chosen_matches:
        answer_lines.append("إذا أردت، أستطيع أيضًا إظهار المواد أو المراجع التي بُني عليها هذا الجواب.")

    citations = []
    for match in chosen_matches[:3]:
        citations.append(
            {
                "title": str(match.get("title", "") or ""),
                "citation": str(match.get("citation", "") or ""),
                "url": str(match.get("url", "") or ""),
                "excerpt": str(match.get("content", "") or ""),
                "source_type": str(match.get("source_type", "") or ""),
            }
        )

    return {
        "answer": "\n".join(answer_lines),
        "in_scope": True,
        "requires_human_review": False,
        "scope": "inheritance_uae",
        "citations": citations,
    }