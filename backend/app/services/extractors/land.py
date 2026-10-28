"""Extractor for Land & Infrastructure Report PDFs."""

import re
from typing import List, Tuple
from app.models.document import ExtractedField
from app.services.extractors.base import BaseExtractor
from app.services.normalizer import normalize_date, normalize_area


class LandExtractor(BaseExtractor):
    def extract_all(self) -> Tuple[List[ExtractedField], List[str]]:
        fields: List[ExtractedField] = []
        warnings: List[str] = []

        full_text = "\n".join([f"--- PAGE {p.page_number} ---\n" + p.text for p in self.pdf.pages])

        # 1. Institution Name
        m_inst = (
            re.search(r"TARGET INSTITUTION NAME\s*\n\s*([^\n\r]+)", full_text, re.IGNORECASE)
            or re.search(r"registered to\s*\n\s*([^\n\.,]+)", full_text, re.IGNORECASE)
            or re.search(r"Institution Name[:\s\n]+([^\n\r]+)", full_text, re.IGNORECASE)
        )
        if m_inst:
            val = m_inst.group(1).strip()
            fields.append(self.create_field(
                field_key="institution_name",
                label="Target Institution Name",
                original_value=val,
                normalized_value=val,
                page_number=1,
            ))
        else:
            warnings.append("Target institution name could not be identified.")

        # 2. Associated Application ID
        m_app = (
            re.search(r"ASSOCIATED APPLICATION ID\s*\n\s*([A-Z0-9\-]+)", full_text, re.IGNORECASE)
            or re.search(r"Application ID[:\s\n]+([A-Z0-9\-]+)", full_text, re.IGNORECASE)
            or re.search(r"Application Ref[:\s\n]+([A-Z0-9\-]+)", full_text, re.IGNORECASE)
        )
        if m_app:
            val = m_app.group(1).strip()
            fields.append(self.create_field(
                field_key="application_id",
                label="Associated Application ID",
                original_value=val,
                normalized_value=val,
                page_number=1,
            ))

        # 3. Report Reference
        m_ref = (
            re.search(r"REPORT REFERENCE IDENTIFIER\s*\n\s*([A-Z0-9\-]+)", full_text, re.IGNORECASE)
            or re.search(r"Report Ref[:\s\n]+([A-Z0-9\-]+)", full_text, re.IGNORECASE)
            or re.search(r"Survey Reference[:\s\n]+([A-Z0-9\-]+)", full_text, re.IGNORECASE)
        )
        if m_ref:
            val = m_ref.group(1).strip()
            fields.append(self.create_field(
                field_key="report_reference",
                label="Report Reference Identifier",
                original_value=val,
                normalized_value=val,
                page_number=1,
            ))

        # 4. Report / Inspection Date
        m_date = (
            re.search(r"FIELD INSPECTION DATE\s*\n\s*([^\n\r]+)", full_text, re.IGNORECASE)
            or re.search(r"Inspection Date[:\s\n]+([^\n\r]+)", full_text, re.IGNORECASE)
            or re.search(r"Report Date[:\s\n]+([^\n\r]+)", full_text, re.IGNORECASE)
            or re.search(r"Date:\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})", full_text, re.IGNORECASE)
        )
        if m_date:
            val = m_date.group(1).strip()
            norm = normalize_date(val)
            fields.append(self.create_field(
                field_key="report_date",
                label="Report / Field Inspection Date",
                original_value=val,
                normalized_value=norm,
                page_number=1,
            ))

        # 5. Recorded Land Area
        m_land = (
            re.search(r"Total Recorded Land Area\s*\n\s*([^\n\r]+)", full_text, re.IGNORECASE)
            or re.search(r"measuring exactly\s*([0-9\.]+\s*acres)", full_text, re.IGNORECASE)
            or re.search(r"Total Land Area[:\s\n]+([0-9\.]+\s*acres)", full_text, re.IGNORECASE)
        )
        if m_land:
            orig = m_land.group(1).strip()
            num_val, unit_val = normalize_area(orig)
            fields.append(self.create_field(
                field_key="recorded_land_area",
                label="Independently Recorded Land Area",
                original_value=orig,
                normalized_value=num_val,
                unit=unit_val or "acres",
                page_number=1,
            ))
        else:
            warnings.append("Recorded land area could not be extracted from the report.")

        # 6. Recorded Built-Up Area
        m_built = (
            re.search(r"Total Recorded Built-Up Area\s*\n\s*([^\n\r]+)", full_text, re.IGNORECASE)
            or re.search(r"Total Physical Built-Up Space Verified\s*\n\s*([^\n\r]+)", full_text, re.IGNORECASE)
            or re.search(r"total built-up area of\s*([0-9,]+\s*square metres|[0-9,]+\s*sq\.m)", full_text, re.IGNORECASE)
        )
        if m_built:
            orig = m_built.group(1).strip()
            num_val, unit_val = normalize_area(orig)
            fields.append(self.create_field(
                field_key="recorded_built_up_area",
                label="Independently Recorded Built-Up Area",
                original_value=orig,
                normalized_value=num_val,
                unit=unit_val or "square metres",
                page_number=1 if "Total Recorded Built-Up Area" in m_built.group(0) else 2,
            ))
        else:
            warnings.append("Recorded built-up area could not be extracted from the report.")

        return fields, warnings
