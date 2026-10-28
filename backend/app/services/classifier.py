"""Document category classifier using deterministic text heuristics."""

from typing import Tuple, List
from app.models.document import DocumentCategory
from app.services.pdf_parser import ParsedPDF


def classify_document(parsed_pdf: ParsedPDF) -> Tuple[DocumentCategory, float, List[str]]:
    """
    Classifies a parsed PDF into a known document category or UNKNOWN.
    Returns (category, confidence, matched_clues).
    """
    if not parsed_pdf.has_text:
        return DocumentCategory.UNKNOWN, 0.0, ["Document contains no selectable text"]

    # Gather first 2 pages text in lowercase for classification
    full_sample = " ".join([p.text.lower() for p in parsed_pdf.pages[:2]])

    scores: dict[DocumentCategory, int] = {
        DocumentCategory.INSTITUTION_APPLICATION: 0,
        DocumentCategory.FACULTY_REGISTER: 0,
        DocumentCategory.LAND_INFRASTRUCTURE_REPORT: 0,
        DocumentCategory.FIRE_SAFETY_CERTIFICATE: 0,
    }
    clues: dict[DocumentCategory, List[str]] = {k: [] for k in scores}

    # 1. Fire Safety Certificate keywords
    fire_keywords = [
        ("fire safety inspection", 4),
        ("fire safety certificate", 5),
        ("safety inspection & certificate", 5),
        ("fire emergency services", 3),
        ("fsc-", 3),
        ("fire extinguishers", 2),
        ("certificate issue date", 2),
    ]
    for kw, weight in fire_keywords:
        if kw in full_sample:
            scores[DocumentCategory.FIRE_SAFETY_CERTIFICATE] += weight
            clues[DocumentCategory.FIRE_SAFETY_CERTIFICATE].append(kw)

    # 2. Faculty Register keywords
    faculty_keywords = [
        ("faculty register", 5),
        ("faculty roster", 5),
        ("faculty id", 3),
        ("faculty full name", 3),
        ("active faculty", 3),
        ("active cadre", 3),
        ("assistant professor", 2),
        ("associate professor", 2),
        ("department of human resources", 2),
    ]
    for kw, weight in faculty_keywords:
        if kw in full_sample:
            scores[DocumentCategory.FACULTY_REGISTER] += weight
            clues[DocumentCategory.FACULTY_REGISTER].append(kw)

    # 3. Land & Infrastructure Report keywords
    land_keywords = [
        ("land & built-up area", 5),
        ("infrastructure evaluation", 4),
        ("physical measurement record", 4),
        ("recorded land area", 4),
        ("recorded built-up area", 4),
        ("land surveyor", 3),
        ("perimeter tape survey", 3),
        ("plinth", 2),
        ("lir-", 3),
    ]
    for kw, weight in land_keywords:
        if kw in full_sample:
            scores[DocumentCategory.LAND_INFRASTRUCTURE_REPORT] += weight
            clues[DocumentCategory.LAND_INFRASTRUCTURE_REPORT].append(kw)

    # 4. Institutional Application keywords
    app_keywords = [
        ("institutional compliance and approval application", 6),
        ("institutional application", 5),
        ("approval application", 4),
        ("campus administration & contact", 3),
        ("infrastructure & spatial declaration", 3),
        ("student enrollment & academic metrics", 3),
        ("application reference identifier", 3),
        ("total enrolled students", 2),
    ]
    for kw, weight in app_keywords:
        if kw in full_sample:
            scores[DocumentCategory.INSTITUTION_APPLICATION] += weight
            clues[DocumentCategory.INSTITUTION_APPLICATION].append(kw)

    # Find highest scoring category
    best_category = max(scores, key=lambda k: scores[k])
    best_score = scores[best_category]

    # Confidence threshold: at least 5 points to confidently classify
    if best_score >= 5:
        return best_category, min(1.0, best_score / 15.0), clues[best_category]

    return DocumentCategory.UNKNOWN, 0.0, ["Insufficient matching keywords to identify category"]
