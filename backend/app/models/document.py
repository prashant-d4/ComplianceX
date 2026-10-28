"""Data models for document extraction, fields, and source evidence."""

from enum import Enum
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class DocumentCategory(str, Enum):
    INSTITUTION_APPLICATION = "institution_application"
    FACULTY_REGISTER = "faculty_register"
    LAND_INFRASTRUCTURE_REPORT = "land_infrastructure_report"
    FIRE_SAFETY_CERTIFICATE = "fire_safety_certificate"
    UNKNOWN = "unknown"


class SourceEvidence(BaseModel):
    filename: str
    page: int = Field(..., description="One-based page number")
    matched_text: str = Field(..., description="Original text excerpt from document")
    bbox: Optional[List[float]] = Field(
        None, description="Bounding box [x0, y0, x1, y1] in PyMuPDF points"
    )


class ExtractedField(BaseModel):
    field_key: str
    label: str
    original_value: str
    normalized_value: Optional[Any] = None
    unit: Optional[str] = None
    source: Optional[SourceEvidence] = None
    extraction_method: str = "text_pattern"
    confidence_note: Optional[str] = None


class FacultyRecord(BaseModel):
    s_no: Optional[int] = None
    faculty_id: str
    name: str
    department: Optional[str] = None
    designation: Optional[str] = None
    status: Optional[str] = "Active"
    joining_date: Optional[str] = None
    page: int = 1
    bbox: Optional[List[float]] = None


class DocumentMetadata(BaseModel):
    page_count: int
    title: Optional[str] = None
    author: Optional[str] = None
    creator: Optional[str] = None
    producer: Optional[str] = None
    creation_date: Optional[str] = None
    has_text: bool = True
    file_size_bytes: int = 0


class DocumentExtractionResult(BaseModel):
    filename: str
    document_type: DocumentCategory
    page_count: int
    has_text: bool
    status: str = "success"  # "success" | "warning" | "error"
    warnings: List[str] = Field(default_factory=list)
    metadata: DocumentMetadata
    fields: List[ExtractedField] = Field(default_factory=list)
    faculty_records: Optional[List[FacultyRecord]] = None
    raw_text_summary: Optional[str] = None


class BatchExtractionResponse(BaseModel):
    total_documents: int
    successful_extractions: int
    failed_extractions: int
    documents: List[DocumentExtractionResult]
