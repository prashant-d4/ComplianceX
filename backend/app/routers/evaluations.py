"""Evaluation and audit API endpoints."""

import json
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from app.models.audit import (
    DeclaredInstitutionData,
    EvaluationAuditResponse,
    AuditExtractedRequest,
)
from app.services.audit_service import AuditService
from app.services.pdf_parser import MAX_UPLOAD_SIZE_BYTES

router = APIRouter(prefix="/evaluations", tags=["Compliance Audit"])


@router.post("/audit", response_model=EvaluationAuditResponse)
async def audit_evaluation(
    declared_data: str = Form(..., description="JSON-encoded DeclaredInstitutionData string"),
    files: List[UploadFile] = File(..., description="Uploaded supporting PDF documents"),
    evaluation_date: Optional[str] = Form(None, description="Optional evaluation date (YYYY-MM-DD)"),
):
    """
    Run end-to-end document extraction and deterministic compliance cross-audit.
    Accepts applicant's declared form values alongside uploaded evidentiary PDFs.
    """
    # 1. Parse declared data JSON
    try:
        decl_dict = json.loads(declared_data)
        parsed_declared = DeclaredInstitutionData(**decl_dict)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid declared data payload: {str(exc)}",
        )

    # 2. Validate uploaded files
    if not files or len(files) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one evidentiary PDF document must be uploaded.",
        )

    uploaded_buffers = []
    for f in files:
        if not f.filename or not f.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{f.filename}' is not a valid PDF document.",
            )
        try:
            content = await f.read()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to read file '{f.filename}': {str(exc)}",
            )
        if len(content) > MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File '{f.filename}' exceeds 15 MB limit.",
            )
        uploaded_buffers.append((f.filename, content))

    # 3. Execute extraction and audit pipeline
    response = AuditService.run_audit_from_files(
        declared_data=parsed_declared,
        uploaded_files=uploaded_buffers,
        evaluation_date=evaluation_date,
    )
    return response


@router.post("/audit-extracted", response_model=EvaluationAuditResponse)
async def audit_extracted_data(request: AuditExtractedRequest):
    """
    Evaluate already-extracted document data against declared form values.
    Useful for testing or when documents have been pre-extracted.
    """
    return AuditService.run_audit(
        declared_data=request.declared_data,
        document_results=request.documents,
        evaluation_date=request.evaluation_date,
    )
