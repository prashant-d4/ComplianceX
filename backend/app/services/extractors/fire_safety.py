"""Extractor for Fire Safety Certificate PDFs."""

import re
from typing import List, Tuple
from app.models.document import ExtractedField
from app.services.extractors.base import BaseExtractor
from app.services.normalizer import normalize_date


class FireSafetyExtractor(BaseExtractor):
    def extract_all(self) -> Tuple[List[ExtractedField], List[str]]:
        fields: List[ExtractedField] = []
        warnings: List[str] = []

        full_text = "\n".join([f"--- PAGE {p.page_number} ---\n" + p.text for p in self.pdf.pages])

        # 1. Certificate Number
        m_cert = (
            re.search(r"PROMINENT CERTIFICATE NUMBER\s*\n\s*([A-Z0-9\-]+)", full_text, re.IGNORECASE)
            or re.search(r"Certificate Number[:\s\n]+([A-Z0-9\-]+)", full_text, re.IGNORECASE)
            or re.search(r"Certificate Ref[:\s\n]+([A-Z0-9\-]+)", full_text, re.IGNORECASE)
            or re.search(r"(FSC-[A-Z0-9\-]+)", full_text)
        )
        if m_cert:
            val = m_cert.group(1).strip()
            fields.append(self.create_field(
                field_key="certificate_number",
                label="Fire Safety Certificate Number",
                original_value=val,
                normalized_value=val,
                page_number=1,
            ))
        else:
            warnings.append("Certificate number could not be found.")

        # 2. Target Institution Name
        m_inst = (
            re.search(r"Target Institution\s*\n\s*([^\n\r]+)", full_text, re.IGNORECASE)
            or re.search(r"premises of\s*\n\s*([^\n\r,]+)", full_text, re.IGNORECASE)
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

        # 3. Associated Application ID
        m_app = (
            re.search(r"Associated Application ID\s*\n\s*([A-Z0-9\-]+)", full_text, re.IGNORECASE)
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

        # 4. Inspection Date
        m_insp = (
            re.search(r"(?:Fictional\s+)?Inspection Date\s*\n\s*([^\n\r]+)", full_text, re.IGNORECASE)
            or re.search(r"inspection was executed on\s+([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})", full_text, re.IGNORECASE)
        )
        if m_insp:
            val = m_insp.group(1).strip()
            norm = normalize_date(val)
            fields.append(self.create_field(
                field_key="inspection_date",
                label="Inspection Date",
                original_value=val,
                normalized_value=norm,
                page_number=1,
            ))

        # 5. Issue Date
        m_issue = (
            re.search(r"Certificate Issue Date\s*\n\s*([^\n\r]+)", full_text, re.IGNORECASE)
            or re.search(r"Issue Date[:\s\n]+([^\n\r]+)", full_text, re.IGNORECASE)
        )
        if m_issue:
            val = m_issue.group(1).strip()
            norm = normalize_date(val)
            fields.append(self.create_field(
                field_key="issue_date",
                label="Certificate Issue Date",
                original_value=val,
                normalized_value=norm,
                page_number=1,
            ))

        # 6. Expiry Date
        m_exp = (
            re.search(r"Declared Expiry Date\s*\n\s*([^\n\r]+)", full_text, re.IGNORECASE)
            or re.search(r"validity period terminating on\s+([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})", full_text, re.IGNORECASE)
            or re.search(r"Expiry Date[:\s\n]+([^\n\r]+)", full_text, re.IGNORECASE)
        )
        if m_exp:
            val = m_exp.group(1).strip()
            norm = normalize_date(val)
            fields.append(self.create_field(
                field_key="expiry_date",
                label="Certificate Expiry Date",
                original_value=val,
                normalized_value=norm,
                page_number=1,
            ))
        else:
            warnings.append("Certificate expiry date could not be found.")

        # 7. Certificate Status
        m_status = (
            re.search(r"Current Status[^\n]*\s*\n\s*([A-Z]+)", full_text)
            or re.search(r"officially marked as\s+([A-Z]+)", full_text)
        )
        if m_status:
            val = m_status.group(1).strip()
            fields.append(self.create_field(
                field_key="certificate_status",
                label="Certificate Status",
                original_value=val,
                normalized_value=val,
                page_number=1,
            ))

        return fields, warnings
