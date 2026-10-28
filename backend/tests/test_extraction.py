"""Automated tests for document extraction API and service."""

import os
import sys
import io

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
DEMO_DIR = r"d:\btech\SIH\aicte\demo_data"


def test_health_endpoint():
    """Verify health endpoint still works."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["application"] == "ComplianceX"
    assert data["version"] == "0.1.0"


def test_reject_non_pdf():
    """Verify non-PDF uploads are rejected with 400 Bad Request."""
    file_content = b"Hello, this is a plain text file, not a PDF."
    response = client.post(
        "/api/documents/extract",
        files={"file": ("test.txt", file_content, "text/plain")},
    )
    assert response.status_code == 400
    assert "Only PDF documents are supported" in response.json()["detail"]


def test_reject_empty_file():
    """Verify empty uploads are rejected."""
    response = client.post(
        "/api/documents/extract",
        files={"file": ("empty.pdf", b"", "application/pdf")},
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_extract_institution_application():
    """Verify 01_institution_application.pdf extraction."""
    fpath = os.path.join(DEMO_DIR, "01_institution_application.pdf")
    with open(fpath, "rb") as f:
        response = client.post(
            "/api/documents/extract",
            files={"file": ("01_institution_application.pdf", f, "application/pdf")},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["document_type"] == "institution_application"
    assert data["page_count"] == 3
    assert data["has_text"] is True

    field_map = {f["field_key"]: f for f in data["fields"]}
    assert "institution_name" in field_map
    assert "Meridian Institute of Technology" in field_map["institution_name"]["original_value"]
    assert field_map["institution_name"]["source"]["bbox"] is not None

    assert "application_id" in field_map
    assert field_map["application_id"]["normalized_value"] == "CX-DEMO-2026-001"

    assert "declared_active_faculty_count" in field_map
    assert field_map["declared_active_faculty_count"]["normalized_value"] == 24

    assert "declared_student_count" in field_map
    assert field_map["declared_student_count"]["normalized_value"] == 720

    assert "declared_land_area" in field_map
    assert field_map["declared_land_area"]["normalized_value"] == 5.0

    assert "fire_safety_cert_number" in field_map
    assert "FSC-DEMO-2025-0148" in field_map["fire_safety_cert_number"]["original_value"]

    assert "declared_fire_safety_expiry_date" in field_map
    assert field_map["declared_fire_safety_expiry_date"]["normalized_value"] == "2027-06-30"


def test_extract_faculty_register():
    """Verify 02_faculty_register.pdf extraction and faculty roster records."""
    fpath = os.path.join(DEMO_DIR, "02_faculty_register.pdf")
    with open(fpath, "rb") as f:
        response = client.post(
            "/api/documents/extract",
            files={"file": ("02_faculty_register.pdf", f, "application/pdf")},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["document_type"] == "faculty_register"
    assert data["page_count"] == 2

    # Verify faculty records list
    assert data["faculty_records"] is not None
    assert len(data["faculty_records"]) == 21
    first_fac = data["faculty_records"][0]
    assert first_fac["faculty_id"] == "MIT-FAC-001"
    assert "Dr. Rajesh Kumar Sharma" in first_fac["name"]
    assert first_fac["status"] == "Active"
    assert first_fac["bbox"] is not None

    field_map = {f["field_key"]: f for f in data["fields"]}
    assert field_map["total_active_faculty_count"]["normalized_value"] == 21


def test_extract_land_report():
    """Verify 03_land_infastructure_report.pdf extraction."""
    fpath = os.path.join(DEMO_DIR, "03_land_infastructure_report.pdf")
    with open(fpath, "rb") as f:
        response = client.post(
            "/api/documents/extract",
            files={"file": ("03_land_infastructure_report.pdf", f, "application/pdf")},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["document_type"] == "land_infrastructure_report"
    assert data["page_count"] == 2

    field_map = {f["field_key"]: f for f in data["fields"]}
    assert field_map["recorded_land_area"]["normalized_value"] == 4.2
    assert field_map["recorded_built_up_area"]["normalized_value"] == 3850.0
    assert field_map["report_reference"]["normalized_value"] == "LIR-DEMO-2026-0082"


def test_extract_fire_safety_certificate():
    """Verify 04_fire_safety_certificate.pdf extraction."""
    fpath = os.path.join(DEMO_DIR, "04_fire_safety_certificate.pdf")
    with open(fpath, "rb") as f:
        response = client.post(
            "/api/documents/extract",
            files={"file": ("04_fire_safety_certificate.pdf", f, "application/pdf")},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["document_type"] == "fire_safety_certificate"
    assert data["page_count"] == 1

    field_map = {f["field_key"]: f for f in data["fields"]}
    assert field_map["certificate_number"]["normalized_value"] == "FSC-DEMO-2025-0148"
    assert field_map["expiry_date"]["normalized_value"] == "2026-06-30"
    assert field_map["issue_date"]["normalized_value"] == "2025-07-01"
    assert field_map["certificate_status"]["normalized_value"] == "EXPIRED"


def test_batch_extraction():
    """Verify batch extraction endpoint."""
    f1 = open(os.path.join(DEMO_DIR, "03_land_infastructure_report.pdf"), "rb")
    f2 = open(os.path.join(DEMO_DIR, "04_fire_safety_certificate.pdf"), "rb")
    try:
        response = client.post(
            "/api/documents/extract-batch",
            files=[
                ("files", ("03_land_infastructure_report.pdf", f1, "application/pdf")),
                ("files", ("04_fire_safety_certificate.pdf", f2, "application/pdf")),
            ],
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_documents"] == 2
        assert data["successful_extractions"] == 2
        assert len(data["documents"]) == 2
    finally:
        f1.close()
        f2.close()
