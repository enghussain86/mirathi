from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "mirathi.db"
DB_PATH = Path(__import__("os").getenv("DB_PATH", str(DEFAULT_DB_PATH))).resolve()


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS saved_cases (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                result_json TEXT NOT NULL
            )
            """
        )
        conn.commit()


def save_case(payload: dict[str, Any], result: dict[str, Any]) -> dict[str, str]:
    case_id = uuid.uuid4().hex[:12]
    created_at = datetime.now(timezone.utc).isoformat()

    with _get_conn() as conn:
        conn.execute(
            """
            INSERT INTO saved_cases (id, created_at, payload_json, result_json)
            VALUES (?, ?, ?, ?)
            """,
            (
                case_id,
                created_at,
                json.dumps(payload, ensure_ascii=False),
                json.dumps(result, ensure_ascii=False),
            ),
        )
        conn.commit()

    return {
        "case_id": case_id,
        "created_at": created_at,
    }


def get_case(case_id: str) -> dict[str, Any] | None:
    with _get_conn() as conn:
        row = conn.execute(
            """
            SELECT id, created_at, payload_json, result_json
            FROM saved_cases
            WHERE id = ?
            """,
            (case_id,),
        ).fetchone()

    if not row:
        return None

    return {
        "case_id": row["id"],
        "created_at": row["created_at"],
        "payload": json.loads(row["payload_json"]),
        "result": json.loads(row["result_json"]),
    }