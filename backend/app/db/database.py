"""SQLite database connection and schema management for ComplianceX prototype."""

import os
import sqlite3
from typing import Optional
from contextlib import contextmanager

# Base data paths
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
DEFAULT_DB_PATH = os.path.join(DATA_DIR, "compliancex.db")
STORAGE_DIR = os.path.join(DATA_DIR, "storage")


def get_data_dir() -> str:
    """Return and ensure local data directory exists."""
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(STORAGE_DIR, exist_ok=True)
    return DATA_DIR


def get_storage_dir(evaluation_id: Optional[str] = None) -> str:
    """Return and ensure local storage directory exists for an evaluation."""
    base = STORAGE_DIR
    if evaluation_id:
        # Sanitize evaluation_id to prevent path traversal
        safe_id = "".join(c for c in evaluation_id if c.isalnum() or c in ("-", "_"))
        target = os.path.join(base, safe_id)
        os.makedirs(target, exist_ok=True)
        return target
    os.makedirs(base, exist_ok=True)
    return base


@contextmanager
def get_db_connection(db_path: Optional[str] = None):
    """Context manager providing thread-safe SQLite connection with Row factory."""
    path = db_path or DEFAULT_DB_PATH
    os.makedirs(os.path.dirname(path), exist_ok=True)
    conn = sqlite3.connect(path, timeout=10.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # Enable WAL mode for concurrent read/write performance
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db(db_path: Optional[str] = None):
    """Initialize database tables and indexes."""
    get_data_dir()
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()

        # 1. Evaluations Table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS evaluations (
                id TEXT PRIMARY KEY,
                institution_name TEXT NOT NULL,
                application_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                evaluation_date TEXT NOT NULL,
                processing_status TEXT NOT NULL,
                is_partial INTEGER NOT NULL DEFAULT 0,
                declared_data_json TEXT NOT NULL,
                summary_json TEXT NOT NULL,
                warnings_json TEXT,
                processing_errors_json TEXT
            );
            """
        )

        # 2. Documents Table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                evaluation_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                document_type TEXT NOT NULL,
                page_count INTEGER NOT NULL,
                has_text INTEGER NOT NULL,
                status TEXT NOT NULL,
                storage_path TEXT NOT NULL,
                metadata_json TEXT,
                fields_json TEXT,
                faculty_records_json TEXT,
                raw_text_summary TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE
            );
            """
        )

        # 3. Findings Table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS findings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                finding_id TEXT NOT NULL,
                evaluation_id TEXT NOT NULL,
                rule_id TEXT NOT NULL,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                severity TEXT NOT NULL,
                original_review_status TEXT NOT NULL,
                current_review_status TEXT NOT NULL,
                declared_value TEXT,
                source_value TEXT,
                normalized_declared_value TEXT,
                normalized_source_value TEXT,
                unit TEXT,
                extraction_quality_score REAL,
                review_required INTEGER NOT NULL DEFAULT 0,
                explanation TEXT NOT NULL,
                source_evidence_json TEXT NOT NULL,
                evaluator_decision TEXT,
                evaluator_notes TEXT,
                decided_at TEXT,
                FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE,
                UNIQUE (evaluation_id, finding_id)
            );
            """
        )

        # Indices for optimal query performance
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_evaluations_created ON evaluations(created_at DESC);"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_documents_eval_id ON documents(evaluation_id);"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_findings_eval_id ON findings(evaluation_id);"
        )
