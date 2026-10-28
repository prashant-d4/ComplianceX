"""Deterministic compliance rules and cross-document verification engine."""

from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
from app.models.document import (
    DocumentCategory,
    DocumentExtractionResult,
    ExtractedField,
    FacultyRecord,
)
from app.models.audit import (
    DeclaredInstitutionData,
    AuditFinding,
    AuditEvidenceReference,
    FindingReviewStatus,
    FindingCategory,
    FindingSeverity,
    AuditSummary,
)
from app.services.rules.quality import (
    calculate_field_quality_score,
    AUTOMATED_COMPARISON_QUALITY_THRESHOLD,
)
from app.services.rules.unit_converter import compare_areas, standardize_area_unit
from app.services.normalizer import normalize_date


class AuditEvaluator:
    """Deterministic evaluation engine comparing applicant declarations with supporting PDFs."""

    def __init__(
        self,
        declared_data: DeclaredInstitutionData,
        documents: List[DocumentExtractionResult],
        evaluation_date: Optional[str] = None,
    ):
        self.declared = declared_data
        self.documents = documents
        self.evaluation_date = evaluation_date or datetime.now().strftime("%Y-%m-%d")

        # Index documents by category
        self.docs_by_cat: Dict[DocumentCategory, DocumentExtractionResult] = {}
        for doc in documents:
            if doc.document_type != DocumentCategory.UNKNOWN:
                self.docs_by_cat[doc.document_type] = doc

        self.findings: List[AuditFinding] = []

    def evaluate_all(self) -> Tuple[List[AuditFinding], AuditSummary]:
        """Execute all deterministic audit checks and return findings and summary."""
        self.findings = []

        # 1. Check Required Documents Presence
        self._check_required_documents()

        # 2. Check Faculty Count (Declared vs Faculty Register)
        self._check_faculty_count()

        # 3. Check Land Area (Declared vs Land & Infrastructure Report)
        self._check_land_area()

        # 4. Check Built-up Area (Declared vs Land & Infrastructure Report)
        self._check_built_up_area()

        # 5. Check Fire Safety Certificate Number
        self._check_fire_safety_cert_number()

        # 6. Check Fire Safety Expiry Date (Declared vs Primary Certificate)
        self._check_fire_safety_expiry_match()

        # 7. Check Fire Safety Certificate Validity against Evaluation Date
        self._check_fire_safety_validity()

        # 8. Check Student-to-Faculty Ratio (Statutory Impact Analysis)
        self._check_sfr_impact()

        # Compile summary
        summary = self._compile_summary()
        return self.findings, summary

    # --------------------------------------------------------------------------
    # Helper lookups
    # --------------------------------------------------------------------------

    def _get_field(self, cat: DocumentCategory, field_key: str) -> Optional[ExtractedField]:
        """Lookup an extracted field from a document category."""
        doc = self.docs_by_cat.get(cat)
        if not doc:
            return None
        for f in doc.fields:
            if f.field_key == field_key:
                return f
        return None

    def _build_declared_evidence(self, label: str, field_key: str, text: str) -> AuditEvidenceReference:
        """Create evidence reference for an applicant's intake declaration."""
        return AuditEvidenceReference(
            source_file="user_declaration",
            document_category="declared_form",
            page_number=None,
            matched_text=f"{label}: {text}",
            bounding_box=None,
            field_key=field_key,
        )

    def _build_doc_evidence(
        self, doc: DocumentExtractionResult, field: ExtractedField
    ) -> AuditEvidenceReference:
        """Create evidence reference from an extracted document field."""
        page_num = field.source.page if field.source else 1
        bbox = field.source.bbox if field.source else None
        matched_text = field.source.matched_text if field.source else field.original_value

        return AuditEvidenceReference(
            source_file=doc.filename,
            document_category=doc.document_type.value,
            page_number=page_num,
            matched_text=matched_text,
            bounding_box=bbox,
            field_key=field.field_key,
        )

    # --------------------------------------------------------------------------
    # Rule Checks
    # --------------------------------------------------------------------------

    def _check_required_documents(self):
        """Rule: Verify presence of all 4 expected primary document categories."""
        expected = [
            (
                DocumentCategory.INSTITUTION_APPLICATION,
                "Institutional Application Dossier",
                "DOC 01",
            ),
            (
                DocumentCategory.FACULTY_REGISTER,
                "Certified Faculty Register",
                "DOC 02",
            ),
            (
                DocumentCategory.LAND_INFRASTRUCTURE_REPORT,
                "Land & Infrastructure Survey Report",
                "DOC 03",
            ),
            (
                DocumentCategory.FIRE_SAFETY_CERTIFICATE,
                "Fire Safety Clearance Certificate",
                "DOC 04",
            ),
        ]

        for cat, title, code in expected:
            if cat not in self.docs_by_cat:
                self.findings.append(
                    AuditFinding(
                        finding_id=f"FINDING-DOC-{cat.name}",
                        rule_id="RULE-REQUIRED-DOCS",
                        category=FindingCategory.MISSING_DOCUMENT,
                        title=f"Missing Document: {title} ({code})",
                        description=f"Required supporting document category '{cat.value}' was not detected among uploaded files.",
                        severity=FindingSeverity.HIGH,
                        review_status=FindingReviewStatus.INSUFFICIENT_EVIDENCE,
                        declared_value=None,
                        source_value=None,
                        extraction_quality_score=None,
                        review_required=True,
                        source_evidence=[],
                        explanation=f"The application cannot be audited for this statutory section because the required evidentiary PDF for {title} is missing.",
                    )
                )

    def _check_faculty_count(self):
        """Rule: Compare declared active faculty count with certified faculty register."""
        faculty_doc = self.docs_by_cat.get(DocumentCategory.FACULTY_REGISTER)
        app_doc = self.docs_by_cat.get(DocumentCategory.INSTITUTION_APPLICATION)

        # 1. Determine declared value: prefer form, fallback to application PDF
        declared_count = self.declared.faculty_count
        app_field = self._get_field(DocumentCategory.INSTITUTION_APPLICATION, "declared_active_faculty_count")
        if declared_count is None and app_field and app_field.normalized_value is not None:
            try:
                declared_count = int(app_field.normalized_value)
            except (ValueError, TypeError):
                pass

        # 2. Determine evidentiary value from register
        source_count: Optional[int] = None
        source_field = self._get_field(DocumentCategory.FACULTY_REGISTER, "total_active_faculty_count")
        quality_res = calculate_field_quality_score(
            source_field, faculty_doc.warnings if faculty_doc else None
        )

        evidence_list: List[AuditEvidenceReference] = []

        # Add declared evidence
        if declared_count is not None:
            if app_field and app_doc:
                evidence_list.append(self._build_doc_evidence(app_doc, app_field))
            else:
                evidence_list.append(
                    self._build_declared_evidence("Declared Faculty Count", "faculty_count", str(declared_count))
                )

        if not faculty_doc:
            # Document missing - handled by required documents check, but record insufficient evidence here too
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-FACULTY-COUNT",
                    rule_id="RULE-FACULTY-COUNT",
                    category=FindingCategory.MISSING_VALUE,
                    title="Faculty Count: Missing Evidentiary Register",
                    description="Certified faculty register is not available to verify declared faculty headcount.",
                    severity=FindingSeverity.HIGH,
                    review_status=FindingReviewStatus.INSUFFICIENT_EVIDENCE,
                    declared_value=declared_count,
                    source_value=None,
                    extraction_quality_score=None,
                    review_required=True,
                    source_evidence=evidence_list,
                    explanation="Declared faculty headcount cannot be verified because no certified faculty register was supplied.",
                )
            )
            return

        # Prefer distinct active faculty records parsed from tabular roster
        if faculty_doc.faculty_records and len(faculty_doc.faculty_records) > 0:
            distinct_active_ids = set()
            for r in faculty_doc.faculty_records:
                status_str = (r.status or "").strip().lower()
                if status_str in ("active", "regular", "confirmed", "joined", ""):
                    distinct_active_ids.add(r.faculty_id)
            source_count = len(distinct_active_ids)
        elif source_field and source_field.normalized_value is not None:
            try:
                source_count = int(source_field.normalized_value)
            except (ValueError, TypeError):
                pass

        if source_field:
            evidence_list.append(self._build_doc_evidence(faculty_doc, source_field))

        if declared_count is None or source_count is None:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-FACULTY-COUNT",
                    rule_id="RULE-FACULTY-COUNT",
                    category=FindingCategory.MISSING_VALUE,
                    title="Faculty Count: Incomplete Data",
                    description="Either declared count or faculty register count could not be extracted.",
                    severity=FindingSeverity.HIGH,
                    review_status=FindingReviewStatus.INSUFFICIENT_EVIDENCE,
                    declared_value=declared_count,
                    source_value=source_count,
                    extraction_quality_score=quality_res.score,
                    review_required=True,
                    source_evidence=evidence_list,
                    explanation="Unable to cross-verify faculty count due to missing values.",
                )
            )
            return

        # Quality check: if quality is low, require manual review
        if quality_res.review_required:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-FACULTY-COUNT",
                    rule_id="RULE-FACULTY-COUNT",
                    category=FindingCategory.AMBIGUOUS_EXTRACTION,
                    title="Faculty Count: Quality Below Threshold",
                    description="Extracted faculty count requires manual verification due to ambiguous extraction signals.",
                    severity=FindingSeverity.MEDIUM,
                    review_status=FindingReviewStatus.NEEDS_MANUAL_REVIEW,
                    declared_value=declared_count,
                    source_value=source_count,
                    normalized_declared_value=declared_count,
                    normalized_source_value=source_count,
                    extraction_quality_score=quality_res.score,
                    review_required=True,
                    source_evidence=evidence_list,
                    explanation=f"Heuristic extraction-quality score {quality_res.score} is below the 0.80 automation threshold: {quality_res.rationale}",
                )
            )
            return

        # Deterministic comparison
        if declared_count == source_count:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-FACULTY-COUNT",
                    rule_id="RULE-FACULTY-COUNT",
                    category=FindingCategory.CROSS_DOCUMENT_MISMATCH,
                    title="Faculty Headcount Verified",
                    description="Declared active faculty count exactly matches certified faculty register.",
                    severity=FindingSeverity.INFO,
                    review_status=FindingReviewStatus.NO_DISCREPANCY_DETECTED,
                    declared_value=declared_count,
                    source_value=source_count,
                    normalized_declared_value=declared_count,
                    normalized_source_value=source_count,
                    extraction_quality_score=quality_res.score,
                    review_required=False,
                    source_evidence=evidence_list,
                    explanation=f"Declared active faculty count of {declared_count} matches {source_count} active records verified in certified register.",
                )
            )
        else:
            diff = source_count - declared_count
            pct = (diff / declared_count) * 100 if declared_count else 0
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-FACULTY-COUNT",
                    rule_id="RULE-FACULTY-COUNT",
                    category=FindingCategory.CROSS_DOCUMENT_MISMATCH,
                    title="Faculty Headcount Discrepancy",
                    description="Declared faculty count differs from certified faculty register roster.",
                    severity=FindingSeverity.HIGH,
                    review_status=FindingReviewStatus.DISCREPANCY_FOUND,
                    declared_value=declared_count,
                    source_value=source_count,
                    normalized_declared_value=declared_count,
                    normalized_source_value=source_count,
                    extraction_quality_score=quality_res.score,
                    review_required=False,
                    source_evidence=evidence_list,
                    explanation=(
                        f"Institutional declaration claimed {declared_count} active faculty, but the certified Faculty Register "
                        f"contains {source_count} distinct active faculty records (discrepancy of {diff:+d} faculty members / {pct:+.1f}%). "
                        f"This shortfall directly affects statutory Student-to-Faculty Ratio compliance."
                    ),
                )
            )

    def _check_land_area(self):
        """Rule: Compare declared land area with certified land survey report."""
        land_doc = self.docs_by_cat.get(DocumentCategory.LAND_INFRASTRUCTURE_REPORT)
        app_doc = self.docs_by_cat.get(DocumentCategory.INSTITUTION_APPLICATION)

        # 1. Declared land area
        decl_area = self.declared.land_area_acres
        decl_unit = "acres"
        app_field = self._get_field(DocumentCategory.INSTITUTION_APPLICATION, "declared_land_area")
        if decl_area is None and app_field and app_field.normalized_value is not None:
            try:
                decl_area = float(app_field.normalized_value)
                decl_unit = app_field.unit or "acres"
            except (ValueError, TypeError):
                pass

        # 2. Source land area
        source_field = self._get_field(DocumentCategory.LAND_INFRASTRUCTURE_REPORT, "recorded_land_area")
        quality_res = calculate_field_quality_score(
            source_field, land_doc.warnings if land_doc else None
        )

        evidence_list: List[AuditEvidenceReference] = []
        if decl_area is not None:
            if app_field and app_doc:
                evidence_list.append(self._build_doc_evidence(app_doc, app_field))
            else:
                evidence_list.append(
                    self._build_declared_evidence("Declared Land Area", "land_area_acres", f"{decl_area} {decl_unit}")
                )

        if not land_doc or not source_field:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-LAND-AREA",
                    rule_id="RULE-LAND-AREA",
                    category=FindingCategory.MISSING_VALUE,
                    title="Land Area: Missing Evidentiary Survey",
                    description="Certified land and infrastructure survey report area is unavailable.",
                    severity=FindingSeverity.HIGH,
                    review_status=FindingReviewStatus.INSUFFICIENT_EVIDENCE,
                    declared_value=f"{decl_area} {decl_unit}" if decl_area is not None else None,
                    source_value=None,
                    extraction_quality_score=None,
                    review_required=True,
                    source_evidence=evidence_list,
                    explanation="Cannot cross-verify land area because land survey report value is missing.",
                )
            )
            return

        evidence_list.append(self._build_doc_evidence(land_doc, source_field))

        src_area = source_field.normalized_value
        src_unit = source_field.unit or "acres"

        try:
            val_decl = float(decl_area) if decl_area is not None else None
            val_src = float(src_area) if src_area is not None else None
        except (ValueError, TypeError):
            val_decl, val_src = None, None

        if val_decl is None or val_src is None:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-LAND-AREA",
                    rule_id="RULE-LAND-AREA",
                    category=FindingCategory.MISSING_VALUE,
                    title="Land Area: Unparseable Measurement",
                    description="Land area measurement could not be parsed to a numeric value.",
                    severity=FindingSeverity.HIGH,
                    review_status=FindingReviewStatus.INSUFFICIENT_EVIDENCE,
                    declared_value=str(decl_area),
                    source_value=str(src_area),
                    extraction_quality_score=quality_res.score,
                    review_required=True,
                    source_evidence=evidence_list,
                    explanation="Numeric land area could not be determined for comparison.",
                )
            )
            return

        if quality_res.review_required:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-LAND-AREA",
                    rule_id="RULE-LAND-AREA",
                    category=FindingCategory.AMBIGUOUS_EXTRACTION,
                    title="Land Area: Quality Below Threshold",
                    description="Extracted land area requires manual review due to low extraction confidence.",
                    severity=FindingSeverity.MEDIUM,
                    review_status=FindingReviewStatus.NEEDS_MANUAL_REVIEW,
                    declared_value=f"{val_decl} {decl_unit}",
                    source_value=f"{val_src} {src_unit}",
                    extraction_quality_score=quality_res.score,
                    review_required=True,
                    source_evidence=evidence_list,
                    explanation=f"Extraction quality score {quality_res.score} below threshold: {quality_res.rationale}",
                )
            )
            return

        is_match, norm_decl, norm_src, comp_unit = compare_areas(val_decl, decl_unit, val_src, src_unit)

        if is_match:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-LAND-AREA",
                    rule_id="RULE-LAND-AREA",
                    category=FindingCategory.CROSS_DOCUMENT_MISMATCH,
                    title="Land Area Verified",
                    description="Declared land area matches certified survey report.",
                    severity=FindingSeverity.INFO,
                    review_status=FindingReviewStatus.NO_DISCREPANCY_DETECTED,
                    declared_value=f"{val_decl} {decl_unit}",
                    source_value=f"{val_src} {src_unit}",
                    normalized_declared_value=norm_decl,
                    normalized_source_value=norm_src,
                    unit=comp_unit,
                    extraction_quality_score=quality_res.score,
                    review_required=False,
                    source_evidence=evidence_list,
                    explanation=f"Declared land area ({val_decl} {decl_unit}) matches certified survey ({val_src} {src_unit}).",
                )
            )
        else:
            diff = norm_src - norm_decl
            pct = (diff / norm_decl) * 100 if norm_decl else 0
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-LAND-AREA",
                    rule_id="RULE-LAND-AREA",
                    category=FindingCategory.CROSS_DOCUMENT_MISMATCH,
                    title="Land Area Survey Discrepancy",
                    description="Declared land area differs from certified survey report.",
                    severity=FindingSeverity.HIGH,
                    review_status=FindingReviewStatus.DISCREPANCY_FOUND,
                    declared_value=f"{val_decl} {decl_unit}",
                    source_value=f"{val_src} {src_unit}",
                    normalized_declared_value=norm_decl,
                    normalized_source_value=norm_src,
                    unit=comp_unit,
                    extraction_quality_score=quality_res.score,
                    review_required=False,
                    source_evidence=evidence_list,
                    explanation=(
                        f"Applicant declared {val_decl} {decl_unit}, but the certified Land & Infrastructure Report records "
                        f"{val_src} {src_unit} (normalized: {norm_decl} {comp_unit} vs {norm_src} {comp_unit}, "
                        f"discrepancy of {diff:+.2f} {comp_unit} / {pct:+.1f}% deficit)."
                    ),
                )
            )

    def _check_built_up_area(self):
        """Rule: Compare declared built-up area with certified survey report."""
        land_doc = self.docs_by_cat.get(DocumentCategory.LAND_INFRASTRUCTURE_REPORT)
        app_doc = self.docs_by_cat.get(DocumentCategory.INSTITUTION_APPLICATION)

        # 1. Declared built-up area
        decl_area = self.declared.built_up_area_sq_m
        decl_unit = "square metres"
        app_field = self._get_field(DocumentCategory.INSTITUTION_APPLICATION, "declared_built_up_area")
        if decl_area is None and app_field and app_field.normalized_value is not None:
            try:
                decl_area = float(app_field.normalized_value)
                decl_unit = app_field.unit or "square metres"
            except (ValueError, TypeError):
                pass

        # 2. Source built-up area
        source_field = self._get_field(DocumentCategory.LAND_INFRASTRUCTURE_REPORT, "recorded_built_up_area")
        quality_res = calculate_field_quality_score(
            source_field, land_doc.warnings if land_doc else None
        )

        evidence_list: List[AuditEvidenceReference] = []
        if decl_area is not None:
            if app_field and app_doc:
                evidence_list.append(self._build_doc_evidence(app_doc, app_field))
            else:
                evidence_list.append(
                    self._build_declared_evidence("Declared Built-up Area", "built_up_area_sq_m", f"{decl_area} {decl_unit}")
                )

        if not land_doc or not source_field:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-BUILTUP-AREA",
                    rule_id="RULE-BUILTUP-AREA",
                    category=FindingCategory.MISSING_VALUE,
                    title="Built-up Area: Missing Survey Data",
                    description="Certified built-up area is unavailable in supporting documents.",
                    severity=FindingSeverity.HIGH,
                    review_status=FindingReviewStatus.INSUFFICIENT_EVIDENCE,
                    declared_value=f"{decl_area} {decl_unit}" if decl_area is not None else None,
                    source_value=None,
                    extraction_quality_score=None,
                    review_required=True,
                    source_evidence=evidence_list,
                    explanation="Built-up area cannot be cross-verified because survey report value is missing.",
                )
            )
            return

        evidence_list.append(self._build_doc_evidence(land_doc, source_field))

        src_area = source_field.normalized_value
        src_unit = source_field.unit or "square metres"

        try:
            val_decl = float(decl_area) if decl_area is not None else None
            val_src = float(src_area) if src_area is not None else None
        except (ValueError, TypeError):
            val_decl, val_src = None, None

        if val_decl is None or val_src is None:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-BUILTUP-AREA",
                    rule_id="RULE-BUILTUP-AREA",
                    category=FindingCategory.MISSING_VALUE,
                    title="Built-up Area: Unparseable Measurement",
                    description="Built-up area could not be parsed to numeric value.",
                    severity=FindingSeverity.MEDIUM,
                    review_status=FindingReviewStatus.INSUFFICIENT_EVIDENCE,
                    declared_value=str(decl_area),
                    source_value=str(src_area),
                    extraction_quality_score=quality_res.score,
                    review_required=True,
                    source_evidence=evidence_list,
                    explanation="Unable to parse numeric built-up area for verification.",
                )
            )
            return

        if quality_res.review_required:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-BUILTUP-AREA",
                    rule_id="RULE-BUILTUP-AREA",
                    category=FindingCategory.AMBIGUOUS_EXTRACTION,
                    title="Built-up Area: Low Quality Extraction",
                    description="Extracted built-up area requires manual review.",
                    severity=FindingSeverity.MEDIUM,
                    review_status=FindingReviewStatus.NEEDS_MANUAL_REVIEW,
                    declared_value=f"{val_decl} {decl_unit}",
                    source_value=f"{val_src} {src_unit}",
                    extraction_quality_score=quality_res.score,
                    review_required=True,
                    source_evidence=evidence_list,
                    explanation=f"Quality score {quality_res.score} below threshold: {quality_res.rationale}",
                )
            )
            return

        is_match, norm_decl, norm_src, comp_unit = compare_areas(val_decl, decl_unit, val_src, src_unit)

        if is_match:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-BUILTUP-AREA",
                    rule_id="RULE-BUILTUP-AREA",
                    category=FindingCategory.CROSS_DOCUMENT_MISMATCH,
                    title="Built-up Area Verified",
                    description="Declared built-up area matches certified survey report.",
                    severity=FindingSeverity.INFO,
                    review_status=FindingReviewStatus.NO_DISCREPANCY_DETECTED,
                    declared_value=f"{val_decl} {decl_unit}",
                    source_value=f"{val_src} {src_unit}",
                    normalized_declared_value=norm_decl,
                    normalized_source_value=norm_src,
                    unit=comp_unit,
                    extraction_quality_score=quality_res.score,
                    review_required=False,
                    source_evidence=evidence_list,
                    explanation=f"Declared built-up area ({val_decl} {decl_unit}) matches certified survey ({val_src} {src_unit}).",
                )
            )
        else:
            diff = norm_src - norm_decl
            pct = (diff / norm_decl) * 100 if norm_decl else 0
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-BUILTUP-AREA",
                    rule_id="RULE-BUILTUP-AREA",
                    category=FindingCategory.CROSS_DOCUMENT_MISMATCH,
                    title="Built-up Area Discrepancy",
                    description="Declared built-up area differs from certified survey report.",
                    severity=FindingSeverity.MEDIUM,
                    review_status=FindingReviewStatus.DISCREPANCY_FOUND,
                    declared_value=f"{val_decl} {decl_unit}",
                    source_value=f"{val_src} {src_unit}",
                    normalized_declared_value=norm_decl,
                    normalized_source_value=norm_src,
                    unit=comp_unit,
                    extraction_quality_score=quality_res.score,
                    review_required=False,
                    source_evidence=evidence_list,
                    explanation=(
                        f"Applicant declared {val_decl} {decl_unit}, but the certified Land & Infrastructure Report records "
                        f"{val_src} {src_unit} (normalized: {norm_decl} {comp_unit} vs {norm_src} {comp_unit}, "
                        f"discrepancy of {diff:+.1f} {comp_unit} / {pct:+.1f}%)."
                    ),
                )
            )

    def _check_fire_safety_cert_number(self):
        """Rule: Compare declared certificate number with fire safety certificate."""
        fire_doc = self.docs_by_cat.get(DocumentCategory.FIRE_SAFETY_CERTIFICATE)
        app_doc = self.docs_by_cat.get(DocumentCategory.INSTITUTION_APPLICATION)

        # 1. Declared cert number
        decl_cert = (self.declared.fire_safety_cert_number or "").strip()
        app_field = self._get_field(DocumentCategory.INSTITUTION_APPLICATION, "fire_safety_cert_number")
        if not decl_cert and app_field and app_field.original_value:
            decl_cert = app_field.original_value.strip()

        # 2. Source cert number
        source_field = self._get_field(DocumentCategory.FIRE_SAFETY_CERTIFICATE, "certificate_number")
        quality_res = calculate_field_quality_score(
            source_field, fire_doc.warnings if fire_doc else None
        )

        evidence_list: List[AuditEvidenceReference] = []
        if decl_cert:
            if app_field and app_doc:
                evidence_list.append(self._build_doc_evidence(app_doc, app_field))
            else:
                evidence_list.append(
                    self._build_declared_evidence("Declared Fire NOC Number", "fire_safety_cert_number", decl_cert)
                )

        if not fire_doc or not source_field:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-FIRE-CERT-NUM",
                    rule_id="RULE-FIRE-CERT-NUM",
                    category=FindingCategory.MISSING_VALUE,
                    title="Fire Safety Certificate: Number Missing",
                    description="Primary fire safety certificate number could not be retrieved.",
                    severity=FindingSeverity.HIGH,
                    review_status=FindingReviewStatus.INSUFFICIENT_EVIDENCE,
                    declared_value=decl_cert or None,
                    source_value=None,
                    extraction_quality_score=None,
                    review_required=True,
                    source_evidence=evidence_list,
                    explanation="Unable to cross-verify certificate number because primary certificate is absent.",
                )
            )
            return

        evidence_list.append(self._build_doc_evidence(fire_doc, source_field))
        src_cert = source_field.original_value.strip()

        # Harmless normalization: trim and uppercase
        norm_decl = " ".join(decl_cert.upper().split())
        norm_src = " ".join(src_cert.upper().split())

        if not norm_decl or not norm_src:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-FIRE-CERT-NUM",
                    rule_id="RULE-FIRE-CERT-NUM",
                    category=FindingCategory.MISSING_VALUE,
                    title="Fire Safety Certificate: Incomplete Number",
                    description="Certificate number missing in declaration or document.",
                    severity=FindingSeverity.HIGH,
                    review_status=FindingReviewStatus.INSUFFICIENT_EVIDENCE,
                    declared_value=decl_cert or None,
                    source_value=src_cert or None,
                    extraction_quality_score=quality_res.score,
                    review_required=True,
                    source_evidence=evidence_list,
                    explanation="Certificate number missing for comparison.",
                )
            )
            return

        if quality_res.review_required:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-FIRE-CERT-NUM",
                    rule_id="RULE-FIRE-CERT-NUM",
                    category=FindingCategory.AMBIGUOUS_EXTRACTION,
                    title="Fire Safety Certificate: Number Requires Review",
                    description="Certificate number extraction confidence is low.",
                    severity=FindingSeverity.MEDIUM,
                    review_status=FindingReviewStatus.NEEDS_MANUAL_REVIEW,
                    declared_value=decl_cert,
                    source_value=src_cert,
                    normalized_declared_value=norm_decl,
                    normalized_source_value=norm_src,
                    extraction_quality_score=quality_res.score,
                    review_required=True,
                    source_evidence=evidence_list,
                    explanation=f"Quality score {quality_res.score} below threshold: {quality_res.rationale}",
                )
            )
            return

        if norm_decl == norm_src:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-FIRE-CERT-NUM",
                    rule_id="RULE-FIRE-CERT-NUM",
                    category=FindingCategory.CROSS_DOCUMENT_MISMATCH,
                    title="Fire Safety Certificate Number Verified",
                    description="Declared Fire Safety NOC number exactly matches the primary certificate.",
                    severity=FindingSeverity.INFO,
                    review_status=FindingReviewStatus.NO_DISCREPANCY_DETECTED,
                    declared_value=decl_cert,
                    source_value=src_cert,
                    normalized_declared_value=norm_decl,
                    normalized_source_value=norm_src,
                    extraction_quality_score=quality_res.score,
                    review_required=False,
                    source_evidence=evidence_list,
                    explanation=f"Declared certificate number '{decl_cert}' matches certified NOC '{src_cert}'.",
                )
            )
        else:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-FIRE-CERT-NUM",
                    rule_id="RULE-FIRE-CERT-NUM",
                    category=FindingCategory.CROSS_DOCUMENT_MISMATCH,
                    title="Fire Safety Certificate Number Mismatch",
                    description="Declared certificate number does not match primary certificate.",
                    severity=FindingSeverity.HIGH,
                    review_status=FindingReviewStatus.DISCREPANCY_FOUND,
                    declared_value=decl_cert,
                    source_value=src_cert,
                    normalized_declared_value=norm_decl,
                    normalized_source_value=norm_src,
                    extraction_quality_score=quality_res.score,
                    review_required=False,
                    source_evidence=evidence_list,
                    explanation=f"Applicant declared certificate number '{decl_cert}', but the supporting Fire Safety Certificate bears '{src_cert}'.",
                )
            )

    def _check_fire_safety_expiry_match(self):
        """Rule: Compare declared expiry date with actual certificate expiry date."""
        fire_doc = self.docs_by_cat.get(DocumentCategory.FIRE_SAFETY_CERTIFICATE)
        app_doc = self.docs_by_cat.get(DocumentCategory.INSTITUTION_APPLICATION)

        # 1. Declared expiry date
        decl_raw = self.declared.fire_safety_expiry_date
        app_field = self._get_field(DocumentCategory.INSTITUTION_APPLICATION, "declared_fire_safety_expiry_date")
        if not decl_raw and app_field and app_field.original_value:
            decl_raw = app_field.original_value

        norm_decl = normalize_date(decl_raw) if decl_raw else None

        # 2. Source expiry date
        source_field = self._get_field(DocumentCategory.FIRE_SAFETY_CERTIFICATE, "expiry_date")
        quality_res = calculate_field_quality_score(
            source_field, fire_doc.warnings if fire_doc else None
        )

        evidence_list: List[AuditEvidenceReference] = []
        if decl_raw:
            if app_field and app_doc:
                evidence_list.append(self._build_doc_evidence(app_doc, app_field))
            else:
                evidence_list.append(
                    self._build_declared_evidence("Declared Expiry Date", "fire_safety_expiry_date", str(decl_raw))
                )

        if not fire_doc or not source_field:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-FIRE-EXPIRY-MATCH",
                    rule_id="RULE-FIRE-EXPIRY-MATCH",
                    category=FindingCategory.MISSING_VALUE,
                    title="Fire Safety Expiry: Missing Certificate Date",
                    description="Primary certificate expiry date is unavailable.",
                    severity=FindingSeverity.HIGH,
                    review_status=FindingReviewStatus.INSUFFICIENT_EVIDENCE,
                    declared_value=decl_raw,
                    source_value=None,
                    extraction_quality_score=None,
                    review_required=True,
                    source_evidence=evidence_list,
                    explanation="Cannot verify expiry date match because certificate date is missing.",
                )
            )
            return

        evidence_list.append(self._build_doc_evidence(fire_doc, source_field))
        norm_src = source_field.normalized_value or normalize_date(source_field.original_value)

        if not norm_decl or not norm_src:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-FIRE-EXPIRY-MATCH",
                    rule_id="RULE-FIRE-EXPIRY-MATCH",
                    category=FindingCategory.MISSING_VALUE,
                    title="Fire Safety Expiry: Unparseable Date",
                    description="Expiry date string could not be parsed to standard ISO format.",
                    severity=FindingSeverity.MEDIUM,
                    review_status=FindingReviewStatus.INSUFFICIENT_EVIDENCE,
                    declared_value=decl_raw,
                    source_value=source_field.original_value,
                    extraction_quality_score=quality_res.score,
                    review_required=True,
                    source_evidence=evidence_list,
                    explanation="Unable to parse ISO dates for declared or certificate expiry.",
                )
            )
            return

        if quality_res.review_required:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-FIRE-EXPIRY-MATCH",
                    rule_id="RULE-FIRE-EXPIRY-MATCH",
                    category=FindingCategory.AMBIGUOUS_EXTRACTION,
                    title="Fire Safety Expiry: Quality Below Threshold",
                    description="Extracted certificate expiry requires manual review.",
                    severity=FindingSeverity.MEDIUM,
                    review_status=FindingReviewStatus.NEEDS_MANUAL_REVIEW,
                    declared_value=decl_raw,
                    source_value=source_field.original_value,
                    normalized_declared_value=norm_decl,
                    normalized_source_value=norm_src,
                    extraction_quality_score=quality_res.score,
                    review_required=True,
                    source_evidence=evidence_list,
                    explanation=f"Quality score {quality_res.score} below threshold: {quality_res.rationale}",
                )
            )
            return

        if norm_decl == norm_src:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-FIRE-EXPIRY-MATCH",
                    rule_id="RULE-FIRE-EXPIRY-MATCH",
                    category=FindingCategory.CROSS_DOCUMENT_MISMATCH,
                    title="Fire Safety Expiry Date Match Verified",
                    description="Declared certificate expiry date matches the primary certificate date.",
                    severity=FindingSeverity.INFO,
                    review_status=FindingReviewStatus.NO_DISCREPANCY_DETECTED,
                    declared_value=decl_raw,
                    source_value=source_field.original_value,
                    normalized_declared_value=norm_decl,
                    normalized_source_value=norm_src,
                    extraction_quality_score=quality_res.score,
                    review_required=False,
                    source_evidence=evidence_list,
                    explanation=f"Declared expiry date ({norm_decl}) matches certificate expiry date ({norm_src}).",
                )
            )
        else:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-FIRE-EXPIRY-MATCH",
                    rule_id="RULE-FIRE-EXPIRY-MATCH",
                    category=FindingCategory.CROSS_DOCUMENT_MISMATCH,
                    title="Fire Safety Expiry Date Declaration Mismatch",
                    description="Declared expiry date differs significantly from primary certificate expiry date.",
                    severity=FindingSeverity.HIGH,
                    review_status=FindingReviewStatus.DISCREPANCY_FOUND,
                    declared_value=decl_raw,
                    source_value=source_field.original_value,
                    normalized_declared_value=norm_decl,
                    normalized_source_value=norm_src,
                    extraction_quality_score=quality_res.score,
                    review_required=False,
                    source_evidence=evidence_list,
                    explanation=(
                        f"Institutional declaration claimed certificate validity until {norm_decl}, "
                        f"but the primary Fire Safety Certificate specifies an expiry date of {norm_src}. "
                        f"The declared validity exceeds primary evidence by over a year."
                    ),
                )
            )

    def _check_fire_safety_validity(self):
        """Rule: Verify fire safety certificate validity against evaluation date."""
        fire_doc = self.docs_by_cat.get(DocumentCategory.FIRE_SAFETY_CERTIFICATE)
        if not fire_doc:
            return  # Handled by missing document check

        source_field = self._get_field(DocumentCategory.FIRE_SAFETY_CERTIFICATE, "expiry_date")
        status_field = self._get_field(DocumentCategory.FIRE_SAFETY_CERTIFICATE, "certificate_status")
        quality_res = calculate_field_quality_score(source_field, fire_doc.warnings)

        if not source_field or not source_field.normalized_value:
            return

        norm_expiry = source_field.normalized_value
        printed_status = (status_field.original_value if status_field else "").upper()

        evidence_list: List[AuditEvidenceReference] = [
            self._build_doc_evidence(fire_doc, source_field)
        ]
        if status_field:
            evidence_list.append(self._build_doc_evidence(fire_doc, status_field))

        try:
            exp_date = datetime.strptime(str(norm_expiry), "%Y-%m-%d")
            eval_date = datetime.strptime(self.evaluation_date, "%Y-%m-%d")
            is_expired = exp_date < eval_date or "EXPIRED" in printed_status
        except ValueError:
            return

        if is_expired:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-FIRE-VALIDITY",
                    rule_id="RULE-FIRE-VALIDITY",
                    category=FindingCategory.EXPIRED_CERTIFICATE,
                    title="Fire Safety Clearance Certificate Expired",
                    description="Primary fire safety certificate has lapsed relative to the evaluation date.",
                    severity=FindingSeverity.HIGH,
                    review_status=FindingReviewStatus.RULE_VIOLATION,
                    declared_value=f"Evaluation Date: {self.evaluation_date}",
                    source_value=f"Expiry Date: {norm_expiry} (Status: {printed_status or 'EXPIRED'})",
                    normalized_declared_value=self.evaluation_date,
                    normalized_source_value=norm_expiry,
                    extraction_quality_score=quality_res.score,
                    review_required=False,
                    source_evidence=evidence_list,
                    explanation=(
                        f"The Fire Safety Clearance Certificate expired on {norm_expiry}, which is prior to the "
                        f"audit evaluation date ({self.evaluation_date}). The document explicitly records status: "
                        f"'{printed_status or 'EXPIRED'}'. Valid fire safety clearance is a mandatory statutory prerequisite."
                    ),
                )
            )
        else:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-FIRE-VALIDITY",
                    rule_id="RULE-FIRE-VALIDITY",
                    category=FindingCategory.RULE_VIOLATION,
                    title="Fire Safety Certificate Current",
                    description="Fire safety clearance is active as of evaluation date.",
                    severity=FindingSeverity.INFO,
                    review_status=FindingReviewStatus.NO_DISCREPANCY_DETECTED,
                    declared_value=f"Evaluation Date: {self.evaluation_date}",
                    source_value=f"Expiry Date: {norm_expiry}",
                    normalized_declared_value=self.evaluation_date,
                    normalized_source_value=norm_expiry,
                    extraction_quality_score=quality_res.score,
                    review_required=False,
                    source_evidence=evidence_list,
                    explanation=f"Certificate expiry date ({norm_expiry}) is valid relative to evaluation date ({self.evaluation_date}).",
                )
            )

    def _check_sfr_impact(self):
        """Rule: Analyze statutory Student-to-Faculty Ratio (SFR) impact of faculty count."""
        students = self.declared.student_count
        app_field = self._get_field(DocumentCategory.INSTITUTION_APPLICATION, "declared_student_count")
        if students is None and app_field and app_field.normalized_value:
            try:
                students = int(app_field.normalized_value)
            except (ValueError, TypeError):
                pass

        if students is None or students <= 0:
            return

        # Find faculty finding
        faculty_finding = next((f for f in self.findings if f.rule_id == "RULE-FACULTY-COUNT"), None)
        if not faculty_finding or faculty_finding.declared_value is None or faculty_finding.source_value is None:
            return

        try:
            decl_fac = int(faculty_finding.declared_value)
            src_fac = int(faculty_finding.source_value)
        except (ValueError, TypeError):
            return

        decl_sfr = round(students / decl_fac, 1) if decl_fac > 0 else 0
        verified_sfr = round(students / src_fac, 1) if src_fac > 0 else 0

        # AICTE technical norm is typically 1:15 or 1:20
        evidence_list = list(faculty_finding.source_evidence)
        if app_field and self.docs_by_cat.get(DocumentCategory.INSTITUTION_APPLICATION):
            app_doc = self.docs_by_cat[DocumentCategory.INSTITUTION_APPLICATION]
            evidence_list.append(self._build_doc_evidence(app_doc, app_field))

        if decl_fac != src_fac:
            self.findings.append(
                AuditFinding(
                    finding_id="FINDING-SFR-IMPACT",
                    rule_id="RULE-SFR-NORMS",
                    category=FindingCategory.CROSS_DOCUMENT_MISMATCH,
                    title="Student-to-Faculty Ratio Impact",
                    description="Discrepancy in faculty headcount worsens the institutional Student-to-Faculty Ratio.",
                    severity=FindingSeverity.MEDIUM,
                    review_status=FindingReviewStatus.DISCREPANCY_FOUND,
                    declared_value=f"1 : {decl_sfr} ({students} students / {decl_fac} declared faculty)",
                    source_value=f"1 : {verified_sfr} ({students} students / {src_fac} verified faculty)",
                    normalized_declared_value=decl_sfr,
                    normalized_source_value=verified_sfr,
                    extraction_quality_score=faculty_finding.extraction_quality_score,
                    review_required=False,
                    source_evidence=evidence_list,
                    explanation=(
                        f"Based on {students} enrolled students, the declared faculty of {decl_fac} yielded an SFR of 1:{decl_sfr}. "
                        f"However, with only {src_fac} active faculty verified in the register, the actual SFR worsens to 1:{verified_sfr}."
                    ),
                )
            )

    def _compile_summary(self) -> AuditSummary:
        """Calculate counts of each review status across generated findings."""
        summary = AuditSummary(total_rules_evaluated=len(self.findings))
        for f in self.findings:
            if f.review_status == FindingReviewStatus.NO_DISCREPANCY_DETECTED:
                summary.matched_count += 1
            elif f.review_status == FindingReviewStatus.DISCREPANCY_FOUND:
                summary.discrepancy_count += 1
            elif f.review_status == FindingReviewStatus.NEEDS_MANUAL_REVIEW:
                summary.needs_manual_review_count += 1
            elif f.review_status == FindingReviewStatus.INSUFFICIENT_EVIDENCE:
                summary.insufficient_evidence_count += 1
            elif f.review_status == FindingReviewStatus.RULE_VIOLATION:
                summary.rule_violation_count += 1
        return summary
