"""Comprehensive tests for Stage 3 deterministic audit rules and cross-document comparison."""

import unittest
from typing import List, Optional
from datetime import datetime

from app.models.document import (
    DocumentCategory,
    DocumentMetadata,
    DocumentExtractionResult,
    ExtractedField,
    SourceEvidence,
    FacultyRecord,
)
from app.models.audit import (
    DeclaredInstitutionData,
    FindingReviewStatus,
    FindingCategory,
    FindingSeverity,
)
from app.services.rules.quality import (
    calculate_field_quality_score,
    AUTOMATED_COMPARISON_QUALITY_THRESHOLD,
)
from app.services.rules.unit_converter import compare_areas, SQM_PER_ACRE
from app.services.rules.evaluator import AuditEvaluator
from app.services.audit_service import AuditService


def make_field(
    key: str,
    raw_val: str,
    norm_val=None,
    unit: Optional[str] = None,
    filename: str = "doc.pdf",
    page: int = 1,
    bbox: Optional[List[float]] = None,
    method: str = "text_pattern",
    note: Optional[str] = None,
) -> ExtractedField:
    """Helper to build an ExtractedField with full source evidence."""
    return ExtractedField(
        field_key=key,
        label=key.replace("_", " ").title(),
        original_value=raw_val,
        normalized_value=norm_val if norm_val is not None else raw_val,
        unit=unit,
        source=SourceEvidence(
            filename=filename,
            page=page,
            matched_text=f"{key}: {raw_val}",
            bbox=bbox if bbox is not None else [10.0, 20.0, 100.0, 40.0],
        ),
        extraction_method=method,
        confidence_note=note,
    )


def make_doc(
    filename: str,
    cat: DocumentCategory,
    fields: List[ExtractedField],
    records: Optional[List[FacultyRecord]] = None,
    warnings: Optional[List[str]] = None,
) -> DocumentExtractionResult:
    """Helper to construct a DocumentExtractionResult."""
    return DocumentExtractionResult(
        filename=filename,
        document_type=cat,
        page_count=2,
        has_text=True,
        status="warning" if warnings else "success",
        warnings=warnings or [],
        metadata=DocumentMetadata(page_count=2, has_text=True, file_size_bytes=1024),
        fields=fields,
        faculty_records=records,
    )


class TestDeterministicAuditRules(unittest.TestCase):
    FIXED_EVAL_DATE = "2026-10-28"

    def setUp(self):
        self.base_declared = DeclaredInstitutionData(
            institution_name="Meridian Institute of Technology",
            application_id="CX-DEMO-2026-001",
            faculty_count=24,
            student_count=720,
            land_area_acres=5.0,
            built_up_area_sq_m=4200.0,
            fire_safety_cert_number="FSC-DEMO-2025-0148",
            fire_safety_expiry_date="2027-06-30",
        )

    # --------------------------------------------------------------------------
    # 1. Matching faculty counts
    # --------------------------------------------------------------------------
    def test_01_matching_faculty_counts(self):
        decl = DeclaredInstitutionData(
            institution_name="Test College",
            application_id="APP-001",
            faculty_count=20,
            student_count=300,
        )
        faculty_records = [
            FacultyRecord(faculty_id=f"FAC-{i}", name=f"Prof {i}", page=1)
            for i in range(1, 21)
        ]
        doc = make_doc(
            "faculty.pdf",
            DocumentCategory.FACULTY_REGISTER,
            fields=[make_field("total_active_faculty_count", "20", norm_val=20)],
            records=faculty_records,
        )
        evaluator = AuditEvaluator(decl, [doc], evaluation_date=self.FIXED_EVAL_DATE)
        findings, summary = evaluator.evaluate_all()

        faculty_finding = next(f for f in findings if f.rule_id == "RULE-FACULTY-COUNT")
        self.assertEqual(faculty_finding.review_status, FindingReviewStatus.NO_DISCREPANCY_DETECTED)
        self.assertEqual(faculty_finding.declared_value, 20)
        self.assertEqual(faculty_finding.source_value, 20)
        self.assertFalse(faculty_finding.review_required)

    # --------------------------------------------------------------------------
    # 2. Mismatched faculty counts
    # --------------------------------------------------------------------------
    def test_02_mismatched_faculty_counts(self):
        decl = DeclaredInstitutionData(
            institution_name="Test College",
            application_id="APP-001",
            faculty_count=24,
            student_count=720,
        )
        faculty_records = [
            FacultyRecord(faculty_id=f"FAC-{i}", name=f"Prof {i}", page=1)
            for i in range(1, 22)
        ]  # Exactly 21
        doc = make_doc(
            "faculty.pdf",
            DocumentCategory.FACULTY_REGISTER,
            fields=[make_field("total_active_faculty_count", "21", norm_val=21)],
            records=faculty_records,
        )
        evaluator = AuditEvaluator(decl, [doc], evaluation_date=self.FIXED_EVAL_DATE)
        findings, summary = evaluator.evaluate_all()

        faculty_finding = next(f for f in findings if f.rule_id == "RULE-FACULTY-COUNT")
        self.assertEqual(faculty_finding.review_status, FindingReviewStatus.DISCREPANCY_FOUND)
        self.assertEqual(faculty_finding.declared_value, 24)
        self.assertEqual(faculty_finding.source_value, 21)
        self.assertEqual(faculty_finding.severity, FindingSeverity.HIGH)
        self.assertIn("discrepancy of -3", faculty_finding.explanation)

    # --------------------------------------------------------------------------
    # 3. Matching land area with equivalent supported units (acres vs sq.m)
    # --------------------------------------------------------------------------
    def test_03_matching_land_area_unit_conversion(self):
        # 5.0 acres is approximately 20234.28 sq.m
        sqm_value = 5.0 * SQM_PER_ACRE
        decl = DeclaredInstitutionData(
            institution_name="Test College",
            application_id="APP-001",
            land_area_acres=5.0,
        )
        doc = make_doc(
            "land.pdf",
            DocumentCategory.LAND_INFRASTRUCTURE_REPORT,
            fields=[make_field("recorded_land_area", f"{sqm_value:.1f} sq.m", norm_val=sqm_value, unit="square metres")],
        )
        evaluator = AuditEvaluator(decl, [doc], evaluation_date=self.FIXED_EVAL_DATE)
        findings, summary = evaluator.evaluate_all()

        land_finding = next(f for f in findings if f.rule_id == "RULE-LAND-AREA")
        self.assertEqual(land_finding.review_status, FindingReviewStatus.NO_DISCREPANCY_DETECTED)
        self.assertEqual(land_finding.normalized_declared_value, 5.0)
        self.assertAlmostEqual(float(land_finding.normalized_source_value), 5.0, places=2)

    # --------------------------------------------------------------------------
    # 4. Mismatched land area
    # --------------------------------------------------------------------------
    def test_04_mismatched_land_area(self):
        decl = DeclaredInstitutionData(
            institution_name="Test College",
            application_id="APP-001",
            land_area_acres=5.0,
        )
        doc = make_doc(
            "land.pdf",
            DocumentCategory.LAND_INFRASTRUCTURE_REPORT,
            fields=[make_field("recorded_land_area", "4.2 acres", norm_val=4.2, unit="acres")],
        )
        evaluator = AuditEvaluator(decl, [doc], evaluation_date=self.FIXED_EVAL_DATE)
        findings, summary = evaluator.evaluate_all()

        land_finding = next(f for f in findings if f.rule_id == "RULE-LAND-AREA")
        self.assertEqual(land_finding.review_status, FindingReviewStatus.DISCREPANCY_FOUND)
        self.assertEqual(land_finding.normalized_declared_value, 5.0)
        self.assertEqual(land_finding.normalized_source_value, 4.2)
        self.assertEqual(land_finding.severity, FindingSeverity.HIGH)
        self.assertIn("0.80 acres", land_finding.explanation)

    # --------------------------------------------------------------------------
    # 5. Matching built-up area
    # --------------------------------------------------------------------------
    def test_05_matching_built_up_area(self):
        decl = DeclaredInstitutionData(
            institution_name="Test College",
            application_id="APP-001",
            built_up_area_sq_m=4200.0,
        )
        doc = make_doc(
            "land.pdf",
            DocumentCategory.LAND_INFRASTRUCTURE_REPORT,
            fields=[make_field("recorded_built_up_area", "4,200 sq.m", norm_val=4200.0, unit="square metres")],
        )
        evaluator = AuditEvaluator(decl, [doc], evaluation_date=self.FIXED_EVAL_DATE)
        findings, summary = evaluator.evaluate_all()

        built_finding = next(f for f in findings if f.rule_id == "RULE-BUILTUP-AREA")
        self.assertEqual(built_finding.review_status, FindingReviewStatus.NO_DISCREPANCY_DETECTED)
        self.assertEqual(built_finding.normalized_declared_value, 4200.0)
        self.assertEqual(built_finding.normalized_source_value, 4200.0)

    # --------------------------------------------------------------------------
    # 6. Mismatched built-up area
    # --------------------------------------------------------------------------
    def test_06_mismatched_built_up_area(self):
        decl = DeclaredInstitutionData(
            institution_name="Test College",
            application_id="APP-001",
            built_up_area_sq_m=4200.0,
        )
        doc = make_doc(
            "land.pdf",
            DocumentCategory.LAND_INFRASTRUCTURE_REPORT,
            fields=[make_field("recorded_built_up_area", "3,850 sq.m", norm_val=3850.0, unit="square metres")],
        )
        evaluator = AuditEvaluator(decl, [doc], evaluation_date=self.FIXED_EVAL_DATE)
        findings, summary = evaluator.evaluate_all()

        built_finding = next(f for f in findings if f.rule_id == "RULE-BUILTUP-AREA")
        self.assertEqual(built_finding.review_status, FindingReviewStatus.DISCREPANCY_FOUND)
        self.assertEqual(built_finding.normalized_declared_value, 4200.0)
        self.assertEqual(built_finding.normalized_source_value, 3850.0)
        self.assertIn("350.0", built_finding.explanation)

    # --------------------------------------------------------------------------
    # 7. Matching certificate numbers despite harmless formatting differences
    # --------------------------------------------------------------------------
    def test_07_matching_cert_numbers_formatting(self):
        decl = DeclaredInstitutionData(
            institution_name="Test College",
            application_id="APP-001",
            fire_safety_cert_number="  fsc-demo-2025-0148  ",
        )
        doc = make_doc(
            "fire.pdf",
            DocumentCategory.FIRE_SAFETY_CERTIFICATE,
            fields=[make_field("certificate_number", "FSC-DEMO-2025-0148")],
        )
        evaluator = AuditEvaluator(decl, [doc], evaluation_date=self.FIXED_EVAL_DATE)
        findings, summary = evaluator.evaluate_all()

        cert_finding = next(f for f in findings if f.rule_id == "RULE-FIRE-CERT-NUM")
        self.assertEqual(cert_finding.review_status, FindingReviewStatus.NO_DISCREPANCY_DETECTED)
        self.assertEqual(cert_finding.normalized_declared_value, "FSC-DEMO-2025-0148")
        self.assertEqual(cert_finding.normalized_source_value, "FSC-DEMO-2025-0148")

    # --------------------------------------------------------------------------
    # 8. Mismatched certificate numbers
    # --------------------------------------------------------------------------
    def test_08_mismatched_cert_numbers(self):
        decl = DeclaredInstitutionData(
            institution_name="Test College",
            application_id="APP-001",
            fire_safety_cert_number="FSC-DECLARED-9999",
        )
        doc = make_doc(
            "fire.pdf",
            DocumentCategory.FIRE_SAFETY_CERTIFICATE,
            fields=[make_field("certificate_number", "FS-ACTUAL-1111")],
        )
        evaluator = AuditEvaluator(decl, [doc], evaluation_date=self.FIXED_EVAL_DATE)
        findings, summary = evaluator.evaluate_all()

        cert_finding = next(f for f in findings if f.rule_id == "RULE-FIRE-CERT-NUM")
        self.assertEqual(cert_finding.review_status, FindingReviewStatus.DISCREPANCY_FOUND)
        self.assertEqual(cert_finding.severity, FindingSeverity.HIGH)

    # --------------------------------------------------------------------------
    # 9. Valid certificate expiry date
    # --------------------------------------------------------------------------
    def test_09_valid_certificate_expiry(self):
        doc = make_doc(
            "fire.pdf",
            DocumentCategory.FIRE_SAFETY_CERTIFICATE,
            fields=[
                make_field("expiry_date", "30 June 2028", norm_val="2028-06-30"),
                make_field("certificate_status", "VALID", norm_val="VALID"),
            ],
        )
        evaluator = AuditEvaluator(self.base_declared, [doc], evaluation_date=self.FIXED_EVAL_DATE)
        findings, summary = evaluator.evaluate_all()

        validity_finding = next(f for f in findings if f.rule_id == "RULE-FIRE-VALIDITY")
        self.assertEqual(validity_finding.review_status, FindingReviewStatus.NO_DISCREPANCY_DETECTED)
        self.assertEqual(validity_finding.severity, FindingSeverity.INFO)

    # --------------------------------------------------------------------------
    # 10. Expired certificate relative to fixed evaluation date
    # --------------------------------------------------------------------------
    def test_10_expired_certificate(self):
        doc = make_doc(
            "fire.pdf",
            DocumentCategory.FIRE_SAFETY_CERTIFICATE,
            fields=[
                make_field("expiry_date", "30 June 2026", norm_val="2026-06-30"),
                make_field("certificate_status", "EXPIRED", norm_val="EXPIRED"),
            ],
        )
        evaluator = AuditEvaluator(self.base_declared, [doc], evaluation_date="2026-10-28")
        findings, summary = evaluator.evaluate_all()

        validity_finding = next(f for f in findings if f.rule_id == "RULE-FIRE-VALIDITY")
        self.assertEqual(validity_finding.review_status, FindingReviewStatus.RULE_VIOLATION)
        self.assertEqual(validity_finding.category, FindingCategory.EXPIRED_CERTIFICATE)
        self.assertEqual(validity_finding.severity, FindingSeverity.HIGH)
        self.assertIn("EXPIRED", validity_finding.explanation)

    # --------------------------------------------------------------------------
    # 11. Mismatch between declared and source expiry dates
    # --------------------------------------------------------------------------
    def test_11_declared_vs_source_expiry_mismatch(self):
        decl = DeclaredInstitutionData(
            institution_name="Test College",
            application_id="APP-001",
            fire_safety_expiry_date="2027-06-30",
        )
        doc = make_doc(
            "fire.pdf",
            DocumentCategory.FIRE_SAFETY_CERTIFICATE,
            fields=[make_field("expiry_date", "30 June 2026", norm_val="2026-06-30")],
        )
        evaluator = AuditEvaluator(decl, [doc], evaluation_date=self.FIXED_EVAL_DATE)
        findings, summary = evaluator.evaluate_all()

        match_finding = next(f for f in findings if f.rule_id == "RULE-FIRE-EXPIRY-MATCH")
        self.assertEqual(match_finding.review_status, FindingReviewStatus.DISCREPANCY_FOUND)
        self.assertEqual(match_finding.normalized_declared_value, "2027-06-30")
        self.assertEqual(match_finding.normalized_source_value, "2026-06-30")

    # --------------------------------------------------------------------------
    # 12. Missing documents
    # --------------------------------------------------------------------------
    def test_12_missing_documents(self):
        # Empty document list
        evaluator = AuditEvaluator(self.base_declared, [], evaluation_date=self.FIXED_EVAL_DATE)
        findings, summary = evaluator.evaluate_all()

        missing_doc_findings = [f for f in findings if f.category == FindingCategory.MISSING_DOCUMENT]
        self.assertEqual(len(missing_doc_findings), 4)
        for f in missing_doc_findings:
            self.assertEqual(f.review_status, FindingReviewStatus.INSUFFICIENT_EVIDENCE)
            self.assertTrue(f.review_required)

    # --------------------------------------------------------------------------
    # 13. Missing field values
    # --------------------------------------------------------------------------
    def test_13_missing_field_values(self):
        # Fire safety doc provided, but missing expiry date field
        doc = make_doc(
            "fire.pdf",
            DocumentCategory.FIRE_SAFETY_CERTIFICATE,
            fields=[make_field("certificate_number", "FSC-001")],
        )
        evaluator = AuditEvaluator(self.base_declared, [doc], evaluation_date=self.FIXED_EVAL_DATE)
        findings, summary = evaluator.evaluate_all()

        expiry_finding = next(f for f in findings if f.rule_id == "RULE-FIRE-EXPIRY-MATCH")
        self.assertEqual(expiry_finding.review_status, FindingReviewStatus.INSUFFICIENT_EVIDENCE)
        self.assertEqual(expiry_finding.category, FindingCategory.MISSING_VALUE)
        self.assertTrue(expiry_finding.review_required)

    # --------------------------------------------------------------------------
    # 14. Ambiguous extraction
    # --------------------------------------------------------------------------
    def test_14_ambiguous_extraction(self):
        field = make_field("total_active_faculty_count", "24", norm_val=24, note="ambiguous match from footer text")
        score_res = calculate_field_quality_score(field)
        self.assertTrue(score_res.indicators["has_warnings"])
        self.assertLess(score_res.score, AUTOMATED_COMPARISON_QUALITY_THRESHOLD)
        self.assertTrue(score_res.review_required)

    # --------------------------------------------------------------------------
    # 15. Low extraction-quality score requiring manual review (< 0.80)
    # --------------------------------------------------------------------------
    def test_15_low_quality_score_review_policy(self):
        # Missing bbox and has document warnings
        field = ExtractedField(
            field_key="total_active_faculty_count",
            label="Total Faculty",
            original_value="24",
            normalized_value=24,
            source=SourceEvidence(filename="test.pdf", page=1, matched_text="faculty", bbox=None),
            extraction_method="fallback_text",
        )
        score_res = calculate_field_quality_score(field, document_warnings=["Ambiguous table layout"])
        self.assertLess(score_res.score, 0.80)
        self.assertTrue(score_res.review_required)

    # --------------------------------------------------------------------------
    # 16. High-quality matching values eligible for automated comparison (>= 0.80)
    # --------------------------------------------------------------------------
    def test_16_high_quality_score_eligible(self):
        field = make_field("total_active_faculty_count", "24", norm_val=24, bbox=[10.0, 20.0, 50.0, 30.0])
        score_res = calculate_field_quality_score(field)
        self.assertGreaterEqual(score_res.score, 0.80)
        self.assertFalse(score_res.review_required)

    # --------------------------------------------------------------------------
    # 17. Evidence references retaining correct filenames and page numbers
    # --------------------------------------------------------------------------
    def test_17_evidence_references(self):
        field = make_field("recorded_land_area", "4.2 acres", norm_val=4.2, filename="03_survey.pdf", page=2)
        doc = make_doc("03_survey.pdf", DocumentCategory.LAND_INFRASTRUCTURE_REPORT, fields=[field])
        evaluator = AuditEvaluator(self.base_declared, [doc], evaluation_date=self.FIXED_EVAL_DATE)
        findings, summary = evaluator.evaluate_all()

        land_finding = next(f for f in findings if f.rule_id == "RULE-LAND-AREA")
        doc_evidence = next(e for e in land_finding.source_evidence if e.source_file == "03_survey.pdf")
        self.assertEqual(doc_evidence.page_number, 2)
        self.assertEqual(doc_evidence.document_category, "land_infrastructure_report")
        self.assertIsNotNone(doc_evidence.bounding_box)

    # --------------------------------------------------------------------------
    # 18. Malformed requests and failed document processing handling
    # --------------------------------------------------------------------------
    def test_18_malformed_document_processing(self):
        failed_doc = DocumentExtractionResult(
            filename="corrupt.pdf",
            document_type=DocumentCategory.UNKNOWN,
            page_count=0,
            has_text=False,
            status="error",
            warnings=["File signature is invalid."],
            metadata=DocumentMetadata(page_count=0, has_text=False, file_size_bytes=100),
            fields=[],
        )
        response = AuditService.run_audit(
            declared_data=self.base_declared,
            document_results=[failed_doc],
            evaluation_date=self.FIXED_EVAL_DATE,
        )
        self.assertEqual(response.processing_status, "partial")
        self.assertTrue(response.is_partial)
        self.assertIn("File signature is invalid.", response.processing_errors)


if __name__ == "__main__":
    unittest.main()
