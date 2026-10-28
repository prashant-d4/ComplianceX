"""Base extractor interface and coordinate-matching helpers."""

from typing import List, Optional, Tuple, Any
import re
from app.models.document import ExtractedField, SourceEvidence
from app.services.pdf_parser import ParsedPDF, ParsedPage


class BaseExtractor:
    def __init__(self, parsed_pdf: ParsedPDF):
        self.pdf = parsed_pdf
        self.filename = parsed_pdf.filename

    def search_evidence(self, phrase: str, preferred_page: Optional[int] = None) -> Optional[SourceEvidence]:
        """Search for phrase across pages and return SourceEvidence with 1-based page & bbox."""
        if not phrase or not phrase.strip():
            return None

        # Check preferred page first if provided
        if preferred_page is not None and 1 <= preferred_page <= len(self.pdf.pages):
            p = self.pdf.pages[preferred_page - 1]
            bboxes = p.search_for(phrase)
            if bboxes:
                return SourceEvidence(
                    filename=self.filename,
                    page=p.page_number,
                    matched_text=phrase.strip(),
                    bbox=bboxes[0],
                )

        # Search all pages
        for p in self.pdf.pages:
            bboxes = p.search_for(phrase)
            if bboxes:
                return SourceEvidence(
                    filename=self.filename,
                    page=p.page_number,
                    matched_text=phrase.strip(),
                    bbox=bboxes[0],
                )

        return None

    def create_field(
        self,
        field_key: str,
        label: str,
        original_value: str,
        normalized_value: Optional[Any] = None,
        unit: Optional[str] = None,
        search_phrase: Optional[str] = None,
        page_number: int = 1,
        extraction_method: str = "text_pattern",
        confidence_note: Optional[str] = None,
    ) -> ExtractedField:
        """Construct an ExtractedField and locate source coordinates."""
        phrase_to_search = search_phrase if search_phrase else original_value
        source = self.search_evidence(phrase_to_search, preferred_page=page_number)

        # Fallback to search original value if search phrase didn't return bbox
        if source is None and search_phrase != original_value and original_value:
            source = self.search_evidence(original_value, preferred_page=page_number)

        # If still None, at least record page and text
        if source is None:
            source = SourceEvidence(
                filename=self.filename,
                page=page_number,
                matched_text=original_value,
                bbox=None,
            )

        return ExtractedField(
            field_key=field_key,
            label=label,
            original_value=original_value,
            normalized_value=normalized_value,
            unit=unit,
            source=source,
            extraction_method=extraction_method,
            confidence_note=confidence_note,
        )
