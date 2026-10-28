"""Extractor for Institutional Application PDFs."""

import re
from typing import List, Tuple
from app.models.document import ExtractedField
from app.services.extractors.base import BaseExtractor
from app.services.normalizer import normalize_date, normalize_number, normalize_area


class ApplicationExtractor(BaseExtractor):
    def extract_all(self) -> Tuple[List[ExtractedField], List[str]]:
        fields: List[ExtractedField] = []
        warnings: List[str] = []

        full_text = "\n".join([f"--- PAGE {p.page_number} ---\n" + p.text for p in self.pdf.pages])

        # 1. Institution Name
        m_name = (
            re.search(r"Name of Institution\s*\n\s*([^\n\r]+)", full_text, re.IGNORECASE)
            or re.search(r"(?:^|\n)\s*(?:MERIDIAN\s+INSTITUTE\s+OF\s+TECHNOLOGY|[A-Z][A-Za-z\s&]{4,60}\s+(?:INSTITUTE|COLLEGE|UNIVERSITY)\s+(?:OF\s+[A-Za-z\s]+)?)\s*\n\s*INSTITUTIONAL", full_text)
        )
        if m_name:
            val = m_name.group(1).strip() if m_name.groups() else m_name.group(0).split("\n")[0].strip()
            fields.append(self.create_field(
                field_key="institution_name",
                label="Institution Name",
                original_value=val,
                normalized_value=val,
                page_number=1,
            ))
        else:
            warnings.append("Institution Name could not be identified with confidence.")

        # 2. Application ID
        m_app_id = (
            re.search(r"APPLICATION REFERENCE IDENTIFIER\s*\n\s*([A-Z0-9\-]+)", full_text, re.IGNORECASE)
            or re.search(r"Application ID[:\s\n]+([A-Z0-9\-]+)", full_text, re.IGNORECASE)
            or re.search(r"Application Ref[:\s\n]+([A-Z0-9\-]+)", full_text, re.IGNORECASE)
        )
        if m_app_id:
            val = m_app_id.group(1).strip()
            fields.append(self.create_field(
                field_key="application_id",
                label="Application ID",
                original_value=val,
                normalized_value=val,
                page_number=1,
            ))
        else:
            warnings.append("Application Reference Identifier was not found.")

        # 3. Institution Type / Category
        m_type = (
            re.search(r"INSTITUTION CATEGORY\s*\n\s*([^\n\r]+)", full_text, re.IGNORECASE)
            or re.search(r"Institutional Status\s*\n\s*([^\n\r]+)", full_text, re.IGNORECASE)
            or re.search(r"Institution Type[:\s\n]+([^\n\r]+)", full_text, re.IGNORECASE)
        )
        if m_type:
            val = m_type.group(1).strip()
            fields.append(self.create_field(
                field_key="institution_type",
                label="Institution Type",
                original_value=val,
                normalized_value=val,
                page_number=1,
            ))

        # 4. Premises Location
        m_loc = (
            re.search(r"Premises Location\s*\n\s*([^\n\r]+)", full_text, re.IGNORECASE)
            or re.search(r"Campus Location[:\s\n]+([^\n\r]+)", full_text, re.IGNORECASE)
            or re.search(r"Address[:\s\n]+([^\n\r]+)", full_text, re.IGNORECASE)
        )
        if m_loc:
            val = m_loc.group(1).strip()
            fields.append(self.create_field(
                field_key="location",
                label="Location",
                original_value=val,
                normalized_value=val,
                page_number=1,
            ))

        # 5. Academic Year
        m_ay = (
            re.search(r"Academic Year\s*(\d{4}[–\-]\d{2,4})", full_text, re.IGNORECASE)
            or re.search(r"Academic Cycle\s*(\d{4}[–\-]\d{2,4})", full_text, re.IGNORECASE)
        )
        if m_ay:
            orig = m_ay.group(1).strip()
            norm = orig.replace("–", "-")
            fields.append(self.create_field(
                field_key="academic_year",
                label="Academic Year",
                original_value=orig,
                normalized_value=norm,
                page_number=1,
            ))

        # 6. Submission Date
        m_sub = (
            re.search(r"SUBMISSION DATE\s*\n\s*([^\n\r]+)", full_text, re.IGNORECASE)
            or re.search(r"Date of Submission[:\s\n]+([^\n\r]+)", full_text, re.IGNORECASE)
        )
        if m_sub:
            orig = m_sub.group(1).strip()
            norm = normalize_date(orig)
            fields.append(self.create_field(
                field_key="submission_date",
                label="Submission Date",
                original_value=orig,
                normalized_value=norm,
                page_number=1,
            ))

        # 7. Declared Active Faculty Count
        m_fac = (
            re.search(r"(\d+)\s*\n\s*ACTIVE FACULTY", full_text, re.IGNORECASE)
            or re.search(r"Total Active Faculty Cadre\s*\n\s*(\d+)", full_text, re.IGNORECASE)
            or re.search(r"active faculty strength\s*\((\d+)\)", full_text, re.IGNORECASE)
        )
        if m_fac:
            orig = m_fac.group(1).strip()
            fields.append(self.create_field(
                field_key="declared_active_faculty_count",
                label="Declared Active Faculty Count",
                original_value=orig,
                normalized_value=int(orig),
                unit="members",
                search_phrase=orig + "\nACTIVE FACULTY" if "\n" in m_fac.group(0) else orig,
                page_number=1,
            ))

        # 8. Declared Total Students
        m_stu = (
            re.search(r"(\d+)\s*\n\s*TOTAL ENROLLED", full_text, re.IGNORECASE)
            or re.search(r"Total Institutional Footprint\s*\n\s*\d+\s*\n\s*(\d+)", full_text, re.IGNORECASE)
            or re.search(r"student headcount\s*\((\d+)\)", full_text, re.IGNORECASE)
        )
        if m_stu:
            orig = m_stu.group(1).strip()
            fields.append(self.create_field(
                field_key="declared_student_count",
                label="Declared Student Count",
                original_value=orig,
                normalized_value=int(orig),
                unit="students",
                search_phrase=orig + "\nTOTAL ENROLLED" if "\n" in m_stu.group(0) else orig,
                page_number=1,
            ))

        # 9. Declared Land Area
        m_land = (
            re.search(r"Total Land Area\s*\n\s*([^\n\r]+)", full_text, re.IGNORECASE)
            or re.search(r"(\d+\.?\d*)\s*\n\s*LAND AREA\s*\([A-Z]+\)", full_text, re.IGNORECASE)
            or re.search(r"land dimensions\s*\(([^)]+)\)", full_text, re.IGNORECASE)
        )
        if m_land:
            orig = m_land.group(1).strip()
            num_val, unit_val = normalize_area(orig)
            fields.append(self.create_field(
                field_key="declared_land_area",
                label="Declared Land Area",
                original_value=orig,
                normalized_value=num_val,
                unit=unit_val or "acres",
                page_number=2 if "Total Land Area" in m_land.group(0) else 1,
            ))

        # 10. Declared Built-Up Area
        m_built = (
            re.search(r"Total Built-Up Area\s*\n\s*([^\n\r]+)", full_text, re.IGNORECASE)
            or re.search(r"([\d,]+)\s*\n\s*BUILT-UP AREA\s*\([A-Z\.]+\)", full_text, re.IGNORECASE)
            or re.search(r"built-up space\s*\(([^)]+)\)", full_text, re.IGNORECASE)
        )
        if m_built:
            orig = m_built.group(1).strip()
            num_val, unit_val = normalize_area(orig)
            fields.append(self.create_field(
                field_key="declared_built_up_area",
                label="Declared Built-Up Area",
                original_value=orig,
                normalized_value=num_val,
                unit=unit_val or "square metres",
                page_number=2 if "Total Built-Up Area" in m_built.group(0) else 1,
            ))

        # 11. Fire Safety Certificate Number
        m_fsc = (
            re.search(r"Fire Safety Certificate Number\s*\n\s*([A-Z0-9\-]+)", full_text, re.IGNORECASE)
            or re.search(r"Fire Safety Certificate status\s*\(([A-Z0-9\-]+)", full_text, re.IGNORECASE)
        )
        if m_fsc:
            orig = m_fsc.group(1).strip()
            fields.append(self.create_field(
                field_key="fire_safety_cert_number",
                label="Declared Fire Safety Certificate Number",
                original_value=orig,
                normalized_value=orig,
                page_number=3,
            ))

        # 12. Declared Certificate Expiry Date
        m_exp = (
            re.search(r"Declared Validity Expiry Date\s*\n\s*([^\n\r]+)", full_text, re.IGNORECASE)
            or re.search(r"valid until\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})", full_text, re.IGNORECASE)
        )
        if m_exp:
            orig = m_exp.group(1).strip()
            norm = normalize_date(orig)
            fields.append(self.create_field(
                field_key="declared_fire_safety_expiry_date",
                label="Declared Fire Safety Certificate Expiry Date",
                original_value=orig,
                normalized_value=norm,
                page_number=3,
            ))

        return fields, warnings
