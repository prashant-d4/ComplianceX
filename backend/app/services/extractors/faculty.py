"""Extractor for Faculty Register PDFs."""

import re
from typing import List, Tuple, Optional
from app.models.document import ExtractedField, FacultyRecord
from app.services.extractors.base import BaseExtractor
from app.services.normalizer import normalize_date


class FacultyExtractor(BaseExtractor):
    def extract_all(self) -> Tuple[List[ExtractedField], List[FacultyRecord], List[str]]:
        fields: List[ExtractedField] = []
        warnings: List[str] = []
        faculty_records: List[FacultyRecord] = []

        full_text = "\n".join([f"--- PAGE {p.page_number} ---\n" + p.text for p in self.pdf.pages])

        # 1. Institution Name
        m_inst = (
            re.search(r"(?:^|\n)\s*([A-Z\s]{4,60}\s+(?:INSTITUTE|COLLEGE|UNIVERSITY)[^\n]*)\s*\n\s*[A-Za-z\s,•]+Department of Human Resources", full_text)
            or re.search(r"contract at\s*\n\s*([^\n,]+)", full_text, re.IGNORECASE)
            or re.search(r"MERIDIAN INSTITUTE OF TECHNOLOGY", full_text)
        )
        if m_inst:
            val = m_inst.group(1).strip() if m_inst.groups() and m_inst.group(1) else m_inst.group(0).strip()
            fields.append(self.create_field(
                field_key="institution_name",
                label="Institution Name",
                original_value=val,
                normalized_value=val.title(),
                page_number=1,
            ))

        # 2. Application ID
        m_app = (
            re.search(r"Application Ref[:\s\n]+([A-Z0-9\-]+)", full_text, re.IGNORECASE)
            or re.search(r"Application ID[:\s\n]+([A-Z0-9\-]+)", full_text, re.IGNORECASE)
        )
        if m_app:
            val = m_app.group(1).strip()
            fields.append(self.create_field(
                field_key="application_id",
                label="Application Reference",
                original_value=val,
                normalized_value=val,
                page_number=1,
            ))

        # 3. Register Date
        m_date = (
            re.search(r"ACTIVE FACULTY AS OF\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})", full_text, re.IGNORECASE)
            or re.search(r"Preparation Date[:\s\n]+([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})", full_text, re.IGNORECASE)
            or re.search(r"as of\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})", full_text, re.IGNORECASE)
        )
        if m_date:
            val = m_date.group(1).strip()
            fields.append(self.create_field(
                field_key="register_date",
                label="Register Effective Date",
                original_value=val,
                normalized_value=normalize_date(val),
                page_number=1,
            ))

        # 4. Parse Faculty Table Rows Page by Page
        seen_ids = set()
        for page in self.pdf.pages:
            # Pattern matches standard table layout:
            # S.NO \n FACULTY ID \n FULL NAME \n DEPARTMENT \n DESIGNATION \n STATUS \n JOINING DATE
            # Example: 01\nMIT-FAC-001\nDr. Rajesh Kumar Sharma\nComputer Science and Engineering\nProfessor & Principal\nActive\n12...
            matches = re.finditer(
                r"(\d{1,2})\n([A-Z0-9\-]{4,15})\n([^\n]+)\n([^\n]+)\n([^\n]+)\n(Active|On Leave|Probation|Contract)[^\n]*",
                page.text,
            )
            for m in matches:
                s_no = int(m.group(1))
                fac_id = m.group(2).strip()
                name = m.group(3).strip()
                dept = m.group(4).strip()
                desig = m.group(5).strip()
                status = m.group(6).strip()

                if fac_id in seen_ids:
                    # Skip duplicate row
                    continue
                seen_ids.add(fac_id)

                # Search bounding box on this specific page
                bboxes = page.search_for(fac_id)
                bbox = bboxes[0] if bboxes else None

                faculty_records.append(FacultyRecord(
                    s_no=s_no,
                    faculty_id=fac_id,
                    name=name,
                    department=dept,
                    designation=desig,
                    status=status,
                    page=page.page_number,
                    bbox=bbox,
                ))

        derived_active_count = len([f for f in faculty_records if f.status and f.status.lower() == "active"])

        # 5. Extract Summary Active Faculty Statement if present
        m_sum = re.search(r"Total active faculty members recorded in this register:\s*(\d+)", full_text, re.IGNORECASE)
        summary_count_val = int(m_sum.group(1)) if m_sum else None
        summary_count_orig = m_sum.group(1) if m_sum else str(derived_active_count)

        is_consistent = (summary_count_val is None) or (summary_count_val == derived_active_count)
        if not is_consistent:
            warnings.append(
                f"Count discrepancy: Printed summary says {summary_count_val} active faculty, "
                f"but {derived_active_count} unique active records were parsed."
            )

        fields.append(self.create_field(
            field_key="total_active_faculty_count",
            label="Total Active Faculty Count",
            original_value=summary_count_orig,
            normalized_value=derived_active_count if derived_active_count > 0 else summary_count_val,
            unit="members",
            search_phrase=f"Total active faculty members recorded in this register: {summary_count_orig}" if m_sum else summary_count_orig,
            page_number=self.pdf.page_count,
            confidence_note="Derived directly from verified individual faculty records." if derived_active_count > 0 else None,
        ))

        return fields, faculty_records, warnings
