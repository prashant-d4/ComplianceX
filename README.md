# ComplianceX — AI-Assisted Institutional Compliance & Document Verification Platform

Smart India Hackathon (SIH) Prototype — Stage 3: Cross-Document Verification, Deterministic Rules & Audit Findings.

ComplianceX is an institutional compliance and regulatory scrutiny workspace designed for statutory evaluators (such as AICTE scrutiny teams). It cross-verifies self-declared institutional metrics against primary evidentiary documents (application dossiers, certified faculty rosters, land & PWD surveys, and fire safety certificates).

---

## 1. Project Architecture

```
aicte/
├── backend/                        # FastAPI Backend Application
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app instance, CORS middleware & routes
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── document.py         # ExtractedField, SourceEvidence, FacultyRecord, DocumentExtractionResult
│   │   │   └── audit.py            # AuditFinding, AuditEvidenceReference, AuditSummary, EvaluationAuditResponse
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── health.py           # GET /api/health
│   │   │   ├── documents.py        # POST /api/documents/extract, extract-batch, GET demo-file/{filename}
│   │   │   └── evaluations.py      # POST /api/evaluations/audit, POST /api/evaluations/audit-extracted
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── pdf_parser.py       # PyMuPDF wrapper: page text, blocks, words, search_for bboxes
│   │       ├── classifier.py       # Heuristic document category classifier
│   │       ├── normalizer.py       # Date (YYYY-MM-DD), number, and area unit normalizers
│   │       ├── document_service.py # Core orchestrator coordinating parser, classifier & extractors
│   │       ├── audit_service.py    # End-to-end extraction and evaluation orchestrator
│   │       ├── extractors/         # Application, Faculty, Land, Fire Safety PDF extractors
│   │       └── rules/              # Deterministic audit engine
│   │           ├── __init__.py
│   │           ├── quality.py      # Explainable heuristic extraction-quality scoring (>= 0.80)
│   │           ├── unit_converter.py # Area unit converter (acres <-> sq.m: 4046.8564224)
│   │           └── evaluator.py    # Deterministic cross-document verification checks
│   ├── tests/
│   │   └── test_audit_rules.py     # 18 comprehensive automated unit test cases
│   └── requirements.txt            # Python dependencies (FastAPI, Uvicorn, Pydantic, PyMuPDF, python-multipart)
│
├── frontend/                       # React + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── TopNav.tsx          # Real-time backend connectivity badge & evaluator identity
│   │   │   ├── LeftDossierColumn.tsx # Dossier queue & page counter
│   │   │   ├── RightEvidenceColumn.tsx # Evidentiary dossier summary & removal actions
│   │   │   ├── ExtractionResultsView.tsx # Structured field tables, 1-based page badges, bboxes & faculty roster
│   │   │   ├── AuditFindingsView.tsx # Traceable audit cards, KPI summary, status badges & PDF coordinate citations
│   │   │   ├── pdf/
│   │   │   │   └── PdfViewer.tsx   # PDF.js canvas viewer with page navigation, zoom & native coordinate highlight
│   │   │   └── evidence/
│   │   │       └── SplitScreenAuditView.tsx # 3-panel split-screen audit workspace with human decision workflow
│   │   ├── pages/
│   │   │   ├── OverviewPage.tsx    # Workspace dashboard, 4-step workflow, metrics cards
│   │   │   ├── NewEvaluationPage.tsx # 12 declared fields + 4 PDF staging + Full Compliance Audit trigger
│   │   │   ├── EvaluationHistoryPage.tsx # Clean empty state explaining SQLite persistence
│   │   │   └── SettingsPage.tsx    # Environment metadata, API diagnostics, rule transparency
│   │   ├── types/
│   │   │   └── evaluation.ts       # Typed models for intake, status, documents, extraction & audit findings
│   │   ├── lib/
│   │   │   └── api.ts              # Resilient backend API client with runComplianceAudit & demo staging
│   │   ├── App.tsx                 # Core layout, tab router, cross-navigation state preservation
│   │   ├── main.tsx                # React DOM entry point
│   │   └── index.css               # Tailwind CSS base and typography configuration
│   ├── package.json
│   ├── vite.config.ts              # Vite dev server with proxy to backend /api
│   └── tailwind.config.js          # Custom enterprise SaaS color tokens & styles
│
├── demo_data/                      # Preserved primary source demo PDFs
│   ├── 01_institution_application.pdf
│   ├── 02_faculty_register.pdf
│   ├── 03_land_infastructure_report.pdf
│   └── 04_fire_safety_certificate.pdf
│
└── README.md                       # Setup & run documentation
```

---

## 2. Prerequisites

- **Python**: 3.10+ (tested with Python 3.14 on Windows)
- **Node.js**: v18+ (tested with Node v24 on Windows)
- **npm**: 9+

---

## 3. Quickstart (Windows PowerShell)

### Terminal 1: Backend (FastAPI + Uvicorn)

1. Open Windows PowerShell and navigate to the `backend` directory:
   ```powershell
   cd d:\btech\SIH\aicte\backend
   ```

2. (Optional) Create and activate a Python virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. Install backend dependencies:
   ```powershell
   pip install -r requirements.txt
   ```

4. Start the FastAPI development server:
   ```powershell
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

   - API Health Endpoint: `http://127.0.0.1:8000/api/health`
   - Interactive OpenAPI Swagger Docs: `http://127.0.0.1:8000/docs`

---

### Terminal 2: Frontend (Vite + React)

1. Open a second Windows PowerShell terminal and navigate to `frontend`:
   ```powershell
   cd d:\btech\SIH\aicte\frontend
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Start the Vite development server:
   ```powershell
   npm run dev
   ```

4. Open the application in your browser:
   - **Local URL**: `http://localhost:5173`

---

## 4. Features Implemented

### Stage 1: Design System & Core Shell
- **Enterprise SaaS Design System**:
  - Color palette: Warm off-white (`#FAF7F2`), deep navy text (`#17243A`), clear medium blue (`#356AE6`), mint/teal accents (`#DDF5EA` / `#17856B`), subtle cool grey borders (`#E4E8EF`), and accessible alert indicators.
  - Three-column layout matching human-designed institutional compliance workstations.
- **Real-Time Backend Health Monitoring**:
  - Header displays active health indicator querying `GET /api/health` with live ping and latency telemetry.
- **12-Field Institution Intake & PDF Staging**:
  - Pre-fill shortcuts and file staging across the 4 primary evidentiary categories.

### Stage 2: Real PDF Ingestion & Structured Field Detection
- **PyMuPDF Engine (`pymupdf`)**:
  - Validates `%PDF-` file signature and size bounds (≤15MB).
  - Page-by-page extraction preserving 1-based page boundaries, text blocks, and word coordinates.
  - Generates exact native PyMuPDF bounding boxes `[x0, y0, x1, y1]` in PDF point space for Stage 4 visual highlighting.
- **Document Categorization**:
  - Transparent heuristic classifier recognizing `institution_application`, `faculty_register`, `land_infrastructure_report`, `fire_safety_certificate`, or `unknown`.
- **Field Extractors**:
  - `Institutional Application`: Institution Name, Application ID, Type, Location, Academic Year, Submission Date, Declared Active Faculty (24), Declared Students (720), Land Area (5.0 acres), Built-up Area (4,200 sq.m), Fire Safety Cert Number (`FSC-DEMO-2025-0148`), and Expiry Date (`2027-06-30`).
  - `Faculty Register`: Summary stats + full tabular roster parser extracting all 21 faculty records (`MIT-FAC-001` through `MIT-FAC-021`), designations, departments, and individual page bounding boxes.
  - `Land & Infrastructure Report`: Institution Name, Application ID, Report Reference (`PWD-CE-SURVEY-2024-0891`), Survey Date, Land Area (4.2 acres), and Built-up Area (3,850 sq.m).
  - `Fire Safety Certificate`: Institution Name, Certificate Number (`FS-DELHI-NOC-2023-7712`), Inspection Date, Issue Date, Expiry Date (`2026-06-30`), and Status (`EXPIRED`).

### Stage 3: Cross-Document Verification, Deterministic Rules & Audit Findings
- **Deterministic Rules Engine (`backend/app/services/rules/`)**:
  - `RULE-REQUIRED-DOCS`: Verifies presence of all 4 required evidentiary document categories.
  - `RULE-FACULTY-COUNT`: Compares declared faculty (24) against distinct active roster records (21) in certified register (-12.5% discrepancy).
  - `RULE-LAND-AREA`: Compares declared land area (5.0 acres) against certified survey (4.2 acres) with deterministic unit normalization (1 acre = 4046.8564224 sq.m).
  - `RULE-BUILTUP-AREA`: Compares declared built-up area (4,200 sq.m) against certified survey (3,850 sq.m).
  - `RULE-FIRE-CERT-NUM`: Normalizes whitespace and letter casing to verify certificate number equality (`FSC-DEMO-2025-0148`).
  - `RULE-FIRE-EXPIRY-MATCH`: Cross-verifies declared validity (`2027-06-30`) against primary certificate expiry (`2026-06-30`), flagging deliberate 1-year discrepancy.
  - `RULE-FIRE-VALIDITY`: Verifies certificate validity against evaluation date (`2026-10-28`), identifying expired certificate status (`EXPIRED`) as a statutory rule violation.
  - `RULE-SFR-NORMS`: Computes practical statutory Student-to-Faculty Ratio impact (1:30.0 declared worsening to 1:34.3 verified).

### Stage 4: Split-Screen Evidence Viewer, PDF Highlighting & Human Review Workflow (Current Stage)
- **High-Fidelity PDF Viewer (`PdfViewer.tsx`)**:
  - Integrated with modern PDF.js (`pdfjs-dist`) canvas rendering.
  - Page navigation (previous, next, page jump) and zoom controls (0.6x to 2.5x, fit-to-width).
  - Native PyMuPDF coordinate bounding box overlay (`[x0, y0, x1, y1]`) rendered dynamically on canvas with pixel-accurate scaling and pulsing gold highlight.
  - Multi-citation document switcher allowing single-click toggling between conflicting evidence documents (e.g. Application Page 1 vs Faculty Register Page 2).
- **Split-Screen Evidence Audit Workspace (`SplitScreenAuditView.tsx`)**:
  - **Left Panel (Findings List)**: Filterable list of findings (All, Discrepancies, Decided) with real-time severity badges, review statuses, and finding IDs.
  - **Middle Panel (Source Document)**: Interactive PDF canvas viewer displaying the actual evidentiary PDF document with native coordinate highlight overlays and page jump helpers.
  - **Right Panel (Finding Details & Decision)**: Comparison card showing declared value vs primary evidentiary value, regulatory explanation, extraction quality score, and human reviewer decision controls.
- **Human-in-the-Loop Review Controls**:
  - Three definitive evaluator actions: **Approve Claim**, **Reject / Flag Discrepancy**, and **Escalate for Review**.
  - Evaluator notes and justification input saved to the audit trail.
  - Immediate state reflection updating finding badges and summary metric counters in real-time.

---

## 5. Verification & Testing

Run automated tests:
```powershell
# 1. Run 18 comprehensive deterministic rules unit tests
python -m unittest backend/tests/test_audit_rules.py

# 2. Run live HTTP audit integration test with 4 demo PDFs
python scratch/test_live_audit_endpoint.py

# 3. Verify demo PDF streaming for the evidence viewer
python scratch/test_demo_file_streaming.py

# 4. Verify frontend build and bundle
cd frontend; npm run build
```

---

## 6. Upcoming SIH Prototype Stages

- **Stage 5**: Evaluation persistence (SQLite), automated executive report generation, and final polish.
