"""High-level document processing service integrating parsing, classification, and extraction."""

from typing import List, Optional
from app.models.document import (
    DocumentCategory,
    DocumentMetadata,
    DocumentExtractionResult,
    ExtractedField,
    FacultyRecord,
)
from app.services.pdf_parser import parse_pdf_from_bytes, PDFValidationError, ParsedPDF
from app.services.classifier import classify_document
from app.services.extractors import (
    ApplicationExtractor,
    FacultyExtractor,
    LandExtractor,
    FireSafetyExtractor,
)


class DocumentProcessingService:
    @staticmethod
    def process_pdf_bytes(content: bytes, filename: str) -> DocumentExtractionResult:
        """Process PDF bytes and return structured, source-linked field extraction results."""
        # 1. Parse and validate PDF structure
        try:
            parsed_pdf: ParsedPDF = parse_pdf_from_bytes(content, filename=filename)
        except PDFValidationError as exc:
            return DocumentExtractionResult(
                filename=filename,
                document_type=DocumentCategory.UNKNOWN,
                page_count=0,
                has_text=False,
                status="error",
                warnings=[f"Validation error: {str(exc)}"],
                metadata=DocumentMetadata(page_count=0, has_text=False, file_size_bytes=len(content)),
                fields=[],
            )
        except Exception as exc:
            return DocumentExtractionResult(
                filename=filename,
                document_type=DocumentCategory.UNKNOWN,
                page_count=0,
                has_text=False,
                status="error",
                warnings=[f"Failed to parse PDF document: {str(exc)}"],
                metadata=DocumentMetadata(page_count=0, has_text=False, file_size_bytes=len(content)),
                fields=[],
            )

        try:
            metadata = DocumentMetadata(
                page_count=parsed_pdf.page_count,
                title=parsed_pdf.metadata.get("title") or None,
                author=parsed_pdf.metadata.get("author") or None,
                creator=parsed_pdf.metadata.get("creator") or None,
                producer=parsed_pdf.metadata.get("producer") or None,
                creation_date=parsed_pdf.metadata.get("creation_date") or None,
                has_text=parsed_pdf.has_text,
                file_size_bytes=parsed_pdf.file_size_bytes,
            )

            # 2. Check if text is present
            if not parsed_pdf.has_text:
                return DocumentExtractionResult(
                    filename=filename,
                    document_type=DocumentCategory.UNKNOWN,
                    page_count=parsed_pdf.page_count,
                    has_text=False,
                    status="warning",
                    warnings=["The document contains no selectable text or OCR layer."],
                    metadata=metadata,
                    fields=[],
                )

            # 3. Classify document category
            category, confidence, clues = classify_document(parsed_pdf)
            warnings: List[str] = []

            if category == DocumentCategory.UNKNOWN:
                return DocumentExtractionResult(
                    filename=filename,
                    document_type=DocumentCategory.UNKNOWN,
                    page_count=parsed_pdf.page_count,
                    has_text=True,
                    status="warning",
                    warnings=["Document category could not be identified with sufficient confidence."],
                    metadata=metadata,
                    fields=[],
                )

            # 4. Run appropriate extractor based on detected category
            fields: List[ExtractedField] = []
            faculty_records: Optional[List[FacultyRecord]] = None

            try:
                if category == DocumentCategory.INSTITUTION_APPLICATION:
                    extractor = ApplicationExtractor(parsed_pdf)
                    fields, ext_warnings = extractor.extract_all()
                    warnings.extend(ext_warnings)

                elif category == DocumentCategory.FACULTY_REGISTER:
                    extractor = FacultyExtractor(parsed_pdf)
                    fields, faculty_records, ext_warnings = extractor.extract_all()
                    warnings.extend(ext_warnings)

                elif category == DocumentCategory.LAND_INFRASTRUCTURE_REPORT:
                    extractor = LandExtractor(parsed_pdf)
                    fields, ext_warnings = extractor.extract_all()
                    warnings.extend(ext_warnings)

                elif category == DocumentCategory.FIRE_SAFETY_CERTIFICATE:
                    extractor = FireSafetyExtractor(parsed_pdf)
                    fields, ext_warnings = extractor.extract_all()
                    warnings.extend(ext_warnings)

            except Exception as exc:
                warnings.append(f"Extraction error during field detection: {str(exc)}")

            status = "warning" if len(warnings) > 0 else "success"

            # Provide a short text preview summary (first 300 chars of page 1)
            raw_summary = parsed_pdf.pages[0].text[:300].strip() if parsed_pdf.pages else None

            return DocumentExtractionResult(
                filename=filename,
                document_type=category,
                page_count=parsed_pdf.page_count,
                has_text=True,
                status=status,
                warnings=warnings,
                metadata=metadata,
                fields=fields,
                faculty_records=faculty_records,
                raw_text_summary=raw_summary,
            )
        finally:
            parsed_pdf.close()
