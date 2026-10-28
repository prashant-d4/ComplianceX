"""Document extraction API endpoints."""

from typing import List
import os
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from fastapi.responses import FileResponse
from app.models.document import (
    DocumentExtractionResult,
    BatchExtractionResponse,
)
from app.services.document_service import DocumentProcessingService
from app.services.pdf_parser import MAX_UPLOAD_SIZE_BYTES

router = APIRouter(prefix="/documents", tags=["Document Extraction"])

DEMO_DATA_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "demo_data")
)


@router.get("/demo-file/{filename}")
async def get_demo_file(filename: str):
    """Serve a demo PDF from demo_data directory for easy browser staging."""
    clean_name = os.path.basename(filename)
    target_path = os.path.join(DEMO_DATA_DIR, clean_name)
    if not os.path.isfile(target_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Demo file '{clean_name}' not found.",
        )
    return FileResponse(target_path, media_type="application/pdf", filename=clean_name)



@router.post("/extract", response_model=DocumentExtractionResult)
async def extract_single_document(file: UploadFile = File(...)):
    """
    Extract structured compliance fields and source evidence from an uploaded PDF.
    Validates PDF format, size, extracts text page-by-page, classifies document type,
    and returns source-linked fields with page numbers and bounding boxes.
    """
    # 1. Basic validation
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is missing.",
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type for '{file.filename}'. Only PDF documents are supported.",
        )

    # 2. Read content safely
    try:
        content = await file.read()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {str(exc)}",
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty (0 bytes).",
        )

    if len(content) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File '{file.filename}' exceeds the 15 MB size limit.",
        )

    # 3. Process document through service
    result = DocumentProcessingService.process_pdf_bytes(content, filename=file.filename)
    return result


@router.post("/extract-batch", response_model=BatchExtractionResponse)
async def extract_batch_documents(files: List[UploadFile] = File(...)):
    """
    Process multiple uploaded PDF documents in a single batch request.
    Extracts structured fields and source evidence for each valid document.
    """
    if not files or len(files) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided in the batch request.",
        )

    results: List[DocumentExtractionResult] = []
    successful = 0
    failed = 0

    for file in files:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            failed += 1
            continue

        try:
            content = await file.read()
            if len(content) == 0 or len(content) > MAX_UPLOAD_SIZE_BYTES:
                failed += 1
                continue

            result = DocumentProcessingService.process_pdf_bytes(content, filename=file.filename)
            results.append(result)
            if result.status != "error":
                successful += 1
            else:
                failed += 1
        except Exception:
            failed += 1

    return BatchExtractionResponse(
        total_documents=len(files),
        successful_extractions=successful,
        failed_extractions=failed,
        documents=results,
    )
