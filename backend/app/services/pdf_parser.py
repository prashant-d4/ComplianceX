"""PyMuPDF wrapper for low-level PDF validation, text extraction, and bounding-box search."""

from typing import List, Optional, Tuple, Dict, Any
import pymupdf

MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB


class PDFValidationError(Exception):
    """Raised when PDF bytes fail validation checks."""
    pass


class ParsedPage:
    def __init__(self, page_number: int, page: pymupdf.Page):
        self.page_number = page_number  # 1-based
        self.rect = (page.rect.x0, page.rect.y0, page.rect.x1, page.rect.y1)
        self.text = page.get_text() or ""
        self.blocks = page.get_text("blocks") or []
        try:
            self.words = page.get_text("words") or []
        except Exception:
            self.words = []
        self._raw_page = page

    def search_for(self, phrase: str) -> List[List[float]]:
        """Search for a phrase on this page and return bounding boxes in PyMuPDF points [x0, y0, x1, y1]."""
        if not phrase or not phrase.strip():
            return []
        try:
            clean = phrase.strip()
            # If multi-line, take the most distinct single line for bounding box
            if "\n" in clean:
                clean = clean.split("\n")[-1].strip()
            rects = self._raw_page.search_for(clean)
            results = []
            for r in rects:
                results.append([round(r.x0, 2), round(r.y0, 2), round(r.x1, 2), round(r.y1, 2)])
            return results
        except Exception:
            return []


class ParsedPDF:
    def __init__(self, filename: str, doc: pymupdf.Document, raw_bytes_len: int):
        self.filename = filename
        self._doc = doc
        self.page_count = doc.page_count
        self.metadata = {
            "format": doc.metadata.get("format", ""),
            "title": doc.metadata.get("title", ""),
            "author": doc.metadata.get("author", ""),
            "creator": doc.metadata.get("creator", ""),
            "producer": doc.metadata.get("producer", ""),
            "creation_date": doc.metadata.get("creationDate", ""),
        }
        self.pages: List[ParsedPage] = []
        self.has_text = False
        self.file_size_bytes = raw_bytes_len

        total_text = ""
        for i in range(self.page_count):
            p = ParsedPage(page_number=i + 1, page=doc[i])
            self.pages.append(p)
            total_text += p.text

        if len(total_text.strip()) > 20:
            self.has_text = True

    def close(self):
        """Release underlying PyMuPDF document handle."""
        if self._doc and not self._doc.is_closed:
            self._doc.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def find_phrase_across_pages(self, phrase: str) -> Optional[Tuple[int, List[float]]]:
        """Find the first occurrence of phrase across pages, returning (1-based page, [x0, y0, x1, y1])."""
        for p in self.pages:
            bboxes = p.search_for(phrase)
            if bboxes:
                return (p.page_number, bboxes[0])
        return None


def validate_pdf_bytes(content: bytes) -> None:
    """Validate PDF bytes for length, signature, and integrity."""
    if not content or len(content) == 0:
        raise PDFValidationError("The uploaded file is empty (0 bytes).")

    if len(content) > MAX_UPLOAD_SIZE_BYTES:
        raise PDFValidationError(
            f"File size exceeds the 15 MB limit ({round(len(content) / (1024*1024), 2)} MB uploaded)."
        )

    # Check PDF magic bytes (%PDF-)
    if not content.startswith(b"%PDF-"):
        if b"%PDF-" not in content[:1024]:
            raise PDFValidationError("The uploaded file is not a valid PDF document (missing %PDF- header).")


def parse_pdf_from_bytes(content: bytes, filename: str = "document.pdf") -> ParsedPDF:
    """Open and parse a PDF from memory bytes using PyMuPDF."""
    validate_pdf_bytes(content)

    try:
        doc = pymupdf.open(stream=content, filetype="pdf")
    except Exception as exc:
        raise PDFValidationError(f"Unable to read PDF file structure: {str(exc)}")

    if doc.is_encrypted:
        doc.close()
        raise PDFValidationError("Password-protected or encrypted PDFs are not supported.")

    if doc.page_count == 0:
        doc.close()
        raise PDFValidationError("PDF document has 0 pages.")

    return ParsedPDF(filename=filename, doc=doc, raw_bytes_len=len(content))
