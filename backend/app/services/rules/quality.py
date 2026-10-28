"""Deterministic extraction-quality scoring and review eligibility policy."""

from typing import Optional, List, Dict, Any, Tuple
from app.models.document import ExtractedField, SourceEvidence


# Policy threshold
AUTOMATED_COMPARISON_QUALITY_THRESHOLD = 0.80


class QualityScoreResult:
    """Detailed score result with transparent breakdown of indicators."""
    def __init__(
        self,
        score: Optional[float],
        review_required: bool,
        indicators: Dict[str, Any],
        rationale: str,
    ):
        self.score = score
        self.review_required = review_required
        self.indicators = indicators
        self.rationale = rationale


def calculate_field_quality_score(
    field: Optional[ExtractedField],
    document_warnings: Optional[List[str]] = None,
) -> QualityScoreResult:
    """
    Calculate an explainable, deterministic heuristic extraction-quality score.
    
    Observable quality indicators:
    1. Value presence: Is the field value present and non-empty?
    2. Parsing success: Did raw string parse into normalized_value? (+0.25)
    3. Label pattern certainty: Was the field matched via structured label regex? (+0.25)
    4. Source evidence anchor: Is source page valid (>= 1) and matched text non-empty? (+0.25)
    5. Native coordinate bounding box: Was an exact PDF point bbox located? (+0.25)
    6. Extraction warnings / ambiguity penalty: -0.20 if field/document has warnings.
    
    Review Policy:
    - Score >= 0.80 with valid source: Eligible for automated comparison.
    - Score < 0.80 or missing evidence: Review required (review_required = True).
    - Missing value: Returns score = None, review_required = True.
    """
    if field is None or not field.original_value or field.original_value.strip() == "":
        return QualityScoreResult(
            score=None,
            review_required=True,
            indicators={
                "value_present": False,
                "parsed_normalized": False,
                "label_matched": False,
                "source_text_present": False,
                "bbox_present": False,
                "has_warnings": False,
            },
            rationale="Field value is missing or was not detected in document.",
        )

    score = 0.0
    indicators: Dict[str, Any] = {}

    # Indicator 1: Label match
    is_pattern = field.extraction_method in ("text_pattern", "table_row", "regex")
    if is_pattern:
        score += 0.25
        indicators["label_matched"] = True
    else:
        indicators["label_matched"] = False

    # Indicator 2: Normalization success
    if field.normalized_value is not None:
        score += 0.25
        indicators["parsed_normalized"] = True
    else:
        indicators["parsed_normalized"] = False

    # Indicator 3: Source text & page anchor
    has_source = (
        field.source is not None
        and field.source.page >= 1
        and bool(field.source.matched_text.strip())
    )
    if has_source:
        score += 0.25
        indicators["source_text_present"] = True
    else:
        indicators["source_text_present"] = False

    # Indicator 4: Coordinate bounding box
    has_bbox = (
        field.source is not None
        and field.source.bbox is not None
        and len(field.source.bbox) == 4
    )
    if has_bbox:
        score += 0.25
        indicators["bbox_present"] = True
    else:
        indicators["bbox_present"] = False

    # Indicator 5: Ambiguity or warning penalties
    has_warnings = False
    if field.confidence_note and "ambiguous" in field.confidence_note.lower():
        has_warnings = True
        score -= 0.25

    if document_warnings and len(document_warnings) > 0:
        has_warnings = True
        score -= 0.15

    indicators["has_warnings"] = has_warnings

    final_score = max(0.0, min(1.0, round(score, 2)))
    review_required = final_score < AUTOMATED_COMPARISON_QUALITY_THRESHOLD or not has_source

    reasons: List[str] = []
    if indicators["parsed_normalized"]:
        reasons.append("normalized value parsed")
    if indicators["source_text_present"]:
        reasons.append(f"source text anchored on page {field.source.page if field.source else '?'}")
    if indicators["bbox_present"]:
        reasons.append("exact PDF bounding box located")
    if indicators["has_warnings"]:
        reasons.append("extraction warnings noted")

    rationale = f"Quality score {final_score:.2f} ({', '.join(reasons) if reasons else 'partial signals'})."
    if review_required:
        rationale += " Requires manual review (< 0.80 threshold or missing evidence)."

    return QualityScoreResult(
        score=final_score,
        review_required=review_required,
        indicators=indicators,
        rationale=rationale,
    )
