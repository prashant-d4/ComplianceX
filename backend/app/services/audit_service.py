"""Service coordinating document extraction, cross-document comparison, and audit generation."""

import uuid
from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any
from app.models.document import DocumentExtractionResult, DocumentCategory
from app.models.audit import (
    DeclaredInstitutionData,
    EvaluationAuditResponse,
    AuditFinding,
    AuditSummary,
)
from app.services.document_service import DocumentProcessingService
from app.services.rules.evaluator import AuditEvaluator


class AuditService:
    @staticmethod
    def run_audit(
        declared_data: DeclaredInstitutionData,
        document_results: List[DocumentExtractionResult],
        evaluation_date: Optional[str] = None,
        warnings: Optional[List[str]] = None,
        errors: Optional[List[str]] = None,
    ) -> EvaluationAuditResponse:
        """Run deterministic cross-document evaluation on extracted documents."""
        eval_date = evaluation_date or datetime.now().strftime("%Y-%m-%d")
        timestamp_prefix = datetime.now().strftime("%Y%m%d")
        short_id = str(uuid.uuid4())[:8].upper()
        eval_id = f"EVAL-{timestamp_prefix}-{short_id}"

        warn_list = list(warnings or [])
        err_list = list(errors or [])

        # Check for any document-level warnings
        for doc in document_results:
            if doc.status == "error":
                err_list.extend(doc.warnings)
            elif doc.status == "warning":
                warn_list.extend(doc.warnings)

        # Run deterministic evaluation
        evaluator = AuditEvaluator(
            declared_data=declared_data,
            documents=document_results,
            evaluation_date=eval_date,
        )
        findings, summary = evaluator.evaluate_all()

        is_partial = len(err_list) > 0 or any(
            doc.document_type == DocumentCategory.UNKNOWN for doc in document_results
        )
        status = "partial" if is_partial else "completed"

        return EvaluationAuditResponse(
            evaluation_id=eval_id,
            evaluation_date=eval_date,
            institution_name=declared_data.institution_name,
            application_id=declared_data.application_id,
            processing_status=status,
            is_partial=is_partial,
            document_extractions=document_results,
            findings=findings,
            summary=summary,
            warnings=warn_list,
            processing_errors=err_list,
        )

    @classmethod
    def run_audit_from_files(
        cls,
        declared_data: DeclaredInstitutionData,
        uploaded_files: List[Tuple[str, bytes]],
        evaluation_date: Optional[str] = None,
    ) -> EvaluationAuditResponse:
        """Process raw uploaded PDF bytes through extraction pipeline, then evaluate."""
        extracted_docs: List[DocumentExtractionResult] = []
        errors: List[str] = []
        warnings: List[str] = []

        for filename, content in uploaded_files:
            try:
                res = DocumentProcessingService.process_pdf_bytes(content, filename=filename)
                extracted_docs.append(res)
            except Exception as exc:
                errors.append(f"Failed to process '{filename}': {str(exc)}")

        return cls.run_audit(
            declared_data=declared_data,
            document_results=extracted_docs,
            evaluation_date=evaluation_date,
            warnings=warnings,
            errors=errors,
        )
