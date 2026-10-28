import React, { useState } from 'react';
import {
  UploadCloud,
  Trash2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  File,
  Loader2,
  FolderDown,
  CheckCircle2,
  ShieldCheck,
  Layers,
  Columns,
} from 'lucide-react';
import {
  DeclaredInstitutionData,
  UploadedDocuments,
  DocumentCategoryKey,
  InstitutionType,
  DocumentExtractionResult,
  SelectedDocument,
  EvaluationAuditResponse,
} from '../types/evaluation';
import { extractDocument, fetchDemoFile, runComplianceAudit } from '../lib/api';
import { ExtractionResultsView } from '../components/ExtractionResultsView';
import { AuditFindingsView } from '../components/AuditFindingsView';
import { SplitScreenAuditView } from '../components/evidence/SplitScreenAuditView';

interface NewEvaluationPageProps {
  formData: DeclaredInstitutionData;
  setFormData: React.Dispatch<React.SetStateAction<DeclaredInstitutionData>>;
  uploadedDocs: UploadedDocuments;
  setUploadedDocs: React.Dispatch<React.SetStateAction<UploadedDocuments>>;
  extractionResults: DocumentExtractionResult[] | null;
  setExtractionResults: React.Dispatch<React.SetStateAction<DocumentExtractionResult[] | null>>;
  auditResult: EvaluationAuditResponse | null;
  setAuditResult: React.Dispatch<React.SetStateAction<EvaluationAuditResponse | null>>;
}

interface DocumentSlotConfig {
  key: DocumentCategoryKey;
  title: string;
  categoryNumber: string;
  description: string;
  sampleFileName: string;
  badgeBg: string;
}

const DOCUMENT_SLOTS: DocumentSlotConfig[] = [
  {
    key: 'institutionalApplication',
    title: 'Institutional Application',
    categoryNumber: 'DOC 01',
    description: 'AICTE approval or extension dossier declaring student capacity & statutory claims.',
    sampleFileName: '01_institution_application.pdf',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    key: 'facultyRegister',
    title: 'Faculty Register',
    categoryNumber: 'DOC 02',
    description: 'Certified list of teaching faculty with designations, departments & qualifications.',
    sampleFileName: '02_faculty_register.pdf',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    key: 'landInfrastructureReport',
    title: 'Land & Infra Report',
    categoryNumber: 'DOC 03',
    description: 'PWD/Architect survey proving contiguous land area in acres & built-up square metres.',
    sampleFileName: '03_land_infastructure_report.pdf',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    key: 'fireSafetyCertificate',
    title: 'Fire Safety Certificate',
    categoryNumber: 'DOC 04',
    description: 'State Fire Service NOC indicating inspection clearance and certificate validity.',
    sampleFileName: '04_fire_safety_certificate.pdf',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
];

const INSTITUTION_TYPES: InstitutionType[] = [
  'Engineering & Technology',
  'Management Studies',
  'Pharmacy',
  'Architecture & Planning',
  'Polytechnic & Diploma',
  'Applied Arts & Crafts',
  'Other',
];

export const NewEvaluationPage: React.FC<NewEvaluationPageProps> = ({
  formData,
  setFormData,
  uploadedDocs,
  setUploadedDocs,
  extractionResults,
  setExtractionResults,
  auditResult,
  setAuditResult,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [activeResultTab, setActiveResultTab] = useState<'audit' | 'split-screen' | 'extractions'>('audit');
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [isLoadingDemoFiles, setIsLoadingDemoFiles] = useState<boolean>(false);

  // Form field change handler
  const handleInputChange = (
    field: keyof DeclaredInstitutionData,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Helper to prefill sample data for rapid testing during evaluation
  const handleLoadSampleData = () => {
    setFormData({
      institutionName: 'Meridian Institute of Technology',
      applicationId: 'CX-DEMO-2026-001',
      institutionType: 'Engineering & Technology',
      location: 'NH-53 Knowledge Corridor, Raipur, Chhattisgarh, India',
      academicYear: '2026-27',
      submissionDate: '2026-10-15',
      facultyCount: 24,
      studentCount: 720,
      landAreaAcres: 5.0,
      builtUpAreaSqM: 4200,
      fireSafetyCertNumber: 'FSC-DEMO-2025-0148',
      fireSafetyExpiryDate: '2027-06-30',
    });
    setErrors({});
  };

  // Stage all 4 demo PDF files automatically using backend demo file endpoint
  const handleStageDemoFiles = async () => {
    setIsLoadingDemoFiles(true);
    setExtractionError(null);
    try {
      const updated: UploadedDocuments = { ...uploadedDocs };
      for (const slot of DOCUMENT_SLOTS) {
        const file = await fetchDemoFile(slot.sampleFileName);
        updated[slot.key] = {
          file,
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
        };
      }
      setUploadedDocs(updated);
    } catch (err: any) {
      setExtractionError(`Could not auto-stage demo files: ${err.message}`);
    } finally {
      setIsLoadingDemoFiles(false);
    }
  };

  // Document file selection handler
  const handleFileChange = (
    category: DocumentCategoryKey,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        alert('Please select a valid PDF file.');
        return;
      }
      setUploadedDocs((prev) => ({
        ...prev,
        [category]: {
          file,
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
        },
      }));
    }
  };

  // Remove document handler
  const handleRemoveFile = (category: DocumentCategoryKey) => {
    setUploadedDocs((prev) => ({
      ...prev,
      [category]: null,
    }));
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.institutionName.trim()) {
      newErrors.institutionName = 'Institution name is required';
    }
    if (!formData.applicationId.trim()) {
      newErrors.applicationId = 'Application ID is required';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location (City, State) is required';
    }
    if (!formData.academicYear.trim()) {
      newErrors.academicYear = 'Academic year is required';
    }
    if (!formData.submissionDate) {
      newErrors.submissionDate = 'Submission date is required';
    }
    if (formData.facultyCount === '' || Number(formData.facultyCount) <= 0) {
      newErrors.facultyCount = 'Enter valid faculty count (> 0)';
    }
    if (formData.studentCount === '' || Number(formData.studentCount) <= 0) {
      newErrors.studentCount = 'Enter valid student count (> 0)';
    }
    if (formData.landAreaAcres === '' || Number(formData.landAreaAcres) <= 0) {
      newErrors.landAreaAcres = 'Enter declared land in acres (> 0)';
    }
    if (formData.builtUpAreaSqM === '' || Number(formData.builtUpAreaSqM) <= 0) {
      newErrors.builtUpAreaSqM = 'Enter built-up area in sq.m (> 0)';
    }
    if (!formData.fireSafetyCertNumber.trim()) {
      newErrors.fireSafetyCertNumber = 'Fire NOC number is required';
    }
    if (!formData.fireSafetyExpiryDate) {
      newErrors.fireSafetyExpiryDate = 'Certificate expiry date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission and real PDF extraction
  const handleEvaluateDocuments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      window.scrollTo({ top: 120, behavior: 'smooth' });
      return;
    }

    const stagedFiles = Object.values(uploadedDocs)
      .filter((doc): doc is SelectedDocument => doc !== null)
      .map((doc) => doc.file);

    if (stagedFiles.length === 0) {
      setExtractionError(
        'Please select at least one supporting PDF document from demo_data or click "Stage All 4 Demo PDFs" to proceed.'
      );
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }

    setIsExtracting(true);
    setExtractionError(null);

    try {
      const results: DocumentExtractionResult[] = [];
      for (const file of stagedFiles) {
        const res = await extractDocument(file);
        results.push(res);
      }
      setExtractionResults(results);
    } catch (err: any) {
      setExtractionError(err.message || 'Document extraction failed.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle full end-to-end compliance audit (Stage 3)
  const handleRunAudit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) {
      window.scrollTo({ top: 120, behavior: 'smooth' });
      return;
    }

    const stagedFiles = Object.values(uploadedDocs)
      .filter((doc): doc is SelectedDocument => doc !== null)
      .map((doc) => doc.file);

    if (stagedFiles.length === 0) {
      setExtractionError(
        'Please stage at least one evidentiary PDF document or click "Stage 4 Demo PDFs" to proceed.'
      );
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }

    setIsAuditing(true);
    setExtractionError(null);

    try {
      const auditRes = await runComplianceAudit(formData, stagedFiles);
      setAuditResult(auditRes);
      setExtractionResults(auditRes.document_extractions);
      setActiveResultTab('audit');
    } catch (err: any) {
      setExtractionError(err.message || 'Audit evaluation failed.');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleResetAll = () => {
    setAuditResult(null);
    setExtractionResults(null);
  };

  const selectedCount = Object.values(uploadedDocs).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-cream-border/60">
        <div>
          <h2 className="text-base font-bold text-charcoal-900 tracking-tight">
            Institutional Declaration & Evidence Dossier
          </h2>
          <p className="text-[11px] text-charcoal-muted">
            Capture self-reported figures and stage primary source PDF records for AICTE scrutiny
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleStageDemoFiles}
            disabled={isLoadingDemoFiles}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-cream-200 hover:bg-cream-300 text-charcoal-900 text-xs font-semibold border border-cream-border transition-all shadow-soft shrink-0 disabled:opacity-50"
            title="Automatically stage the four demo PDFs from demo_data"
          >
            {isLoadingDemoFiles ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-charcoal-600" />
            ) : (
              <FolderDown className="w-3.5 h-3.5 text-charcoal-700" />
            )}
            <span>Stage 4 Demo PDFs</span>
          </button>

          <button
            type="button"
            onClick={handleLoadSampleData}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gold-400 hover:bg-gold-500 text-charcoal-900 text-xs font-bold transition-all shadow-soft shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Sample AICTE Data</span>
          </button>
        </div>
      </div>

      {/* Error alert if any */}
      {extractionError && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold">Extraction Notice</div>
            <p>{extractionError}</p>
          </div>
        </div>
      )}

      {/* Processing State Banner: Extracting */}
      {isExtracting && (
        <div className="bg-white rounded-panel border border-cream-border p-8 text-center shadow-panel space-y-3">
          <div className="w-12 h-12 rounded-full bg-cream-200 mx-auto flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-charcoal-900" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-charcoal-900">
              Processing PDF Documents with PyMuPDF...
            </h4>
            <p className="text-xs text-charcoal-muted max-w-md mx-auto">
              Extracting selectable text, bounding box coordinates, faculty roster records, and regulatory parameters across all pages.
            </p>
          </div>
        </div>
      )}

      {/* Processing State Banner: Auditing */}
      {isAuditing && (
        <div className="bg-white rounded-panel border border-cream-border p-8 text-center shadow-panel space-y-3">
          <div className="w-12 h-12 rounded-full bg-cream-200 mx-auto flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-charcoal-900" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-charcoal-900">
              Running Deterministic Compliance Audit Pipeline...
            </h4>
            <p className="text-xs text-charcoal-muted max-w-md mx-auto">
              Extracting evidentiary PDF data with PyMuPDF, running deterministic cross-document checks, verifying statutory ratios, and building source-linked audit findings.
            </p>
          </div>
        </div>
      )}

      {/* Audit Findings & Verification View (Stage 3) */}
      {auditResult && !isAuditing && !isExtracting && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-cream-border/70 pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveResultTab('audit')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeResultTab === 'audit'
                  ? 'bg-charcoal-900 text-white shadow-soft'
                  : 'bg-white text-charcoal-muted border border-cream-border hover:bg-cream-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
              <span>Audit Summary ({auditResult.findings.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveResultTab('split-screen')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeResultTab === 'split-screen'
                  ? 'bg-charcoal-900 text-white shadow-soft'
                  : 'bg-white text-charcoal-muted border border-cream-border hover:bg-cream-100'
              }`}
            >
              <Columns className="w-3.5 h-3.5 text-gold-400" />
              <span>Split-Screen Evidence Audit</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveResultTab('extractions')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeResultTab === 'extractions'
                  ? 'bg-charcoal-900 text-white shadow-soft'
                  : 'bg-white text-charcoal-muted border border-cream-border hover:bg-cream-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-gold-400" />
              <span>Raw Extractions ({auditResult.document_extractions.length})</span>
            </button>
          </div>

          {activeResultTab === 'audit' && (
            <AuditFindingsView
              auditResult={auditResult}
              onReset={handleResetAll}
              onViewExtractions={() => setActiveResultTab('extractions')}
              onLaunchSplitScreen={() => setActiveResultTab('split-screen')}
            />
          )}

          {activeResultTab === 'split-screen' && (
            <SplitScreenAuditView
              auditResult={auditResult}
              uploadedDocs={uploadedDocs}
              onBackToOverview={() => setActiveResultTab('audit')}
              onUpdateFindingDecision={(findingId, decision, notes) => {
                setAuditResult((prev) => {
                  if (!prev) return null;
                  const updatedFindings = prev.findings.map((f) => {
                    if (f.finding_id === findingId) {
                      return {
                        ...f,
                        evaluator_decision: decision,
                        evaluator_notes: notes,
                        decided_at: new Date().toISOString(),
                      };
                    }
                    return f;
                  });
                  return { ...prev, findings: updatedFindings };
                });
              }}
            />
          )}

          {activeResultTab === 'extractions' && (
            <ExtractionResultsView
              results={auditResult.document_extractions}
              onReset={handleResetAll}
            />
          )}
        </div>
      )}

      {/* Real Extraction Results View when available and not auditing */}
      {!auditResult && extractionResults && !isExtracting && !isAuditing && (
        <ExtractionResultsView
          results={extractionResults}
          onReset={handleResetAll}
        />
      )}

      {/* Declaration & Staging Form (visible when no audit result or extraction results) */}
      {!auditResult && !extractionResults && !isExtracting && !isAuditing && (
        <form onSubmit={handleRunAudit} className="space-y-6">
          {/* Card 1: Declared Information */}
          <div className="bg-white rounded-panel border border-cream-border p-6 shadow-panel space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-cream-border/60">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-charcoal-900 text-gold-400 font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-bold text-charcoal-900">
                  Institution Declared Information
                </h3>
              </div>
              <span className="text-[11px] text-charcoal-muted">All 12 fields required</span>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Institution Name */}
              <div className="md:col-span-2 space-y-1">
                <label className="block text-[11px] font-semibold text-charcoal-800">
                  Institution Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Meridian Institute of Technology"
                  value={formData.institutionName}
                  onChange={(e) => handleInputChange('institutionName', e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs text-charcoal-900 placeholder:text-charcoal-light focus:outline-none transition-all ${
                    errors.institutionName
                      ? 'border-red-400 bg-red-50/50'
                      : 'border-cream-border bg-[#FDFCF9] focus:border-gold-400 focus:bg-white'
                  }`}
                />
                {errors.institutionName && (
                  <p className="text-[10px] text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.institutionName}
                  </p>
                )}
              </div>

              {/* Application ID */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-charcoal-800">
                  Application ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. CX-DEMO-2026-001"
                  value={formData.applicationId}
                  onChange={(e) => handleInputChange('applicationId', e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs text-charcoal-900 font-mono placeholder:text-charcoal-light focus:outline-none transition-all ${
                    errors.applicationId
                      ? 'border-red-400 bg-red-50/50'
                      : 'border-cream-border bg-[#FDFCF9] focus:border-gold-400 focus:bg-white'
                  }`}
                />
                {errors.applicationId && (
                  <p className="text-[10px] text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.applicationId}
                  </p>
                )}
              </div>

              {/* Institution Type */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-charcoal-800">
                  Institution Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.institutionType}
                  onChange={(e) =>
                    handleInputChange('institutionType', e.target.value as InstitutionType)
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-cream-border bg-[#FDFCF9] text-xs text-charcoal-900 focus:outline-none focus:border-gold-400 focus:bg-white transition-all"
                >
                  {INSTITUTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-charcoal-800">
                  Location (City, State) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Raipur, Chhattisgarh, India"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs text-charcoal-900 placeholder:text-charcoal-light focus:outline-none transition-all ${
                    errors.location
                      ? 'border-red-400 bg-red-50/50'
                      : 'border-cream-border bg-[#FDFCF9] focus:border-gold-400 focus:bg-white'
                  }`}
                />
                {errors.location && (
                  <p className="text-[10px] text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.location}
                  </p>
                )}
              </div>

              {/* Academic Year */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-charcoal-800">
                  Academic Year <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.academicYear}
                  onChange={(e) => handleInputChange('academicYear', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-cream-border bg-[#FDFCF9] text-xs text-charcoal-900 focus:outline-none focus:border-gold-400 focus:bg-white transition-all"
                >
                  <option value="2026-27">2026-27</option>
                  <option value="2024-25">2024-25</option>
                  <option value="2025-26">2025-26</option>
                </select>
              </div>

              {/* Submission Date */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-charcoal-800">
                  Submission Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.submissionDate}
                  onChange={(e) => handleInputChange('submissionDate', e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs text-charcoal-900 focus:outline-none transition-all ${
                    errors.submissionDate
                      ? 'border-red-400 bg-red-50/50'
                      : 'border-cream-border bg-[#FDFCF9] focus:border-gold-400 focus:bg-white'
                  }`}
                />
                {errors.submissionDate && (
                  <p className="text-[10px] text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.submissionDate}
                  </p>
                )}
              </div>

              {/* Declared Faculty Count */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-charcoal-800">
                  Declared Active Faculty Count <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 24"
                  min="1"
                  value={formData.facultyCount}
                  onChange={(e) =>
                    handleInputChange(
                      'facultyCount',
                      e.target.value === '' ? '' : Number(e.target.value)
                    )
                  }
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs text-charcoal-900 placeholder:text-charcoal-light focus:outline-none transition-all ${
                    errors.facultyCount
                      ? 'border-red-400 bg-red-50/50'
                      : 'border-cream-border bg-[#FDFCF9] focus:border-gold-400 focus:bg-white'
                  }`}
                />
                {errors.facultyCount && (
                  <p className="text-[10px] text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.facultyCount}
                  </p>
                )}
              </div>

              {/* Declared Student Count */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-charcoal-800">
                  Declared Total Students <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 720"
                  min="1"
                  value={formData.studentCount}
                  onChange={(e) =>
                    handleInputChange(
                      'studentCount',
                      e.target.value === '' ? '' : Number(e.target.value)
                    )
                  }
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs text-charcoal-900 placeholder:text-charcoal-light focus:outline-none transition-all ${
                    errors.studentCount
                      ? 'border-red-400 bg-red-50/50'
                      : 'border-cream-border bg-[#FDFCF9] focus:border-gold-400 focus:bg-white'
                  }`}
                />
                {errors.studentCount && (
                  <p className="text-[10px] text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.studentCount}
                  </p>
                )}
              </div>

              {/* Declared Land Area in Acres */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-charcoal-800">
                  Declared Land Area (Acres) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5.0"
                  min="0.1"
                  value={formData.landAreaAcres}
                  onChange={(e) =>
                    handleInputChange(
                      'landAreaAcres',
                      e.target.value === '' ? '' : Number(e.target.value)
                    )
                  }
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs text-charcoal-900 placeholder:text-charcoal-light focus:outline-none transition-all ${
                    errors.landAreaAcres
                      ? 'border-red-400 bg-red-50/50'
                      : 'border-cream-border bg-[#FDFCF9] focus:border-gold-400 focus:bg-white'
                  }`}
                />
                {errors.landAreaAcres && (
                  <p className="text-[10px] text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.landAreaAcres}
                  </p>
                )}
              </div>

              {/* Declared Built-up Area */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-charcoal-800">
                  Declared Built-up Area (sq.m) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="1"
                  placeholder="e.g. 4200"
                  min="1"
                  value={formData.builtUpAreaSqM}
                  onChange={(e) =>
                    handleInputChange(
                      'builtUpAreaSqM',
                      e.target.value === '' ? '' : Number(e.target.value)
                    )
                  }
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs text-charcoal-900 placeholder:text-charcoal-light focus:outline-none transition-all ${
                    errors.builtUpAreaSqM
                      ? 'border-red-400 bg-red-50/50'
                      : 'border-cream-border bg-[#FDFCF9] focus:border-gold-400 focus:bg-white'
                  }`}
                />
                {errors.builtUpAreaSqM && (
                  <p className="text-[10px] text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.builtUpAreaSqM}
                  </p>
                )}
              </div>

              {/* Fire Safety Certificate Number */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-charcoal-800">
                  Fire Safety Certificate NOC <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. FSC-DEMO-2025-0148"
                  value={formData.fireSafetyCertNumber}
                  onChange={(e) => handleInputChange('fireSafetyCertNumber', e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs text-charcoal-900 font-mono placeholder:text-charcoal-light focus:outline-none transition-all ${
                    errors.fireSafetyCertNumber
                      ? 'border-red-400 bg-red-50/50'
                      : 'border-cream-border bg-[#FDFCF9] focus:border-gold-400 focus:bg-white'
                  }`}
                />
                {errors.fireSafetyCertNumber && (
                  <p className="text-[10px] text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.fireSafetyCertNumber}
                  </p>
                )}
              </div>

              {/* Fire Safety Expiry Date */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-charcoal-800">
                  Declared Certificate Expiry Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.fireSafetyExpiryDate}
                  onChange={(e) => handleInputChange('fireSafetyExpiryDate', e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs text-charcoal-900 focus:outline-none transition-all ${
                    errors.fireSafetyExpiryDate
                      ? 'border-red-400 bg-red-50/50'
                      : 'border-cream-border bg-[#FDFCF9] focus:border-gold-400 focus:bg-white'
                  }`}
                />
                {errors.fireSafetyExpiryDate && (
                  <p className="text-[10px] text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.fireSafetyExpiryDate}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: PDF Document Staging */}
          <div className="bg-white rounded-panel border border-cream-border p-6 shadow-panel space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-cream-border/60">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-charcoal-900 text-gold-400 font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm font-bold text-charcoal-900">
                  Supporting PDF Evidentiary Documents
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-charcoal-700 bg-cream-200 px-2 py-0.5 rounded-full border border-cream-border">
                {selectedCount} / 4 Staged
              </span>
            </div>

            {/* Document Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {DOCUMENT_SLOTS.map((slot) => {
                const doc = uploadedDocs[slot.key];
                return (
                  <div
                    key={slot.key}
                    className={`rounded-2xl border p-3.5 transition-all flex flex-col justify-between ${
                      doc
                        ? 'border-gold-400/80 bg-cream-50 shadow-soft'
                        : 'border-cream-border bg-white hover:border-gold-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${slot.badgeBg}`}>
                          {slot.categoryNumber}
                        </span>
                        {doc ? (
                          <span className="text-[10px] font-medium text-status-successText flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Staged
                          </span>
                        ) : (
                          <span className="text-[10px] text-charcoal-muted">PDF Required</span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-charcoal-900">{slot.title}</h4>
                      <p className="text-[10px] text-charcoal-muted mt-0.5 leading-relaxed">
                        {slot.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-cream-border/60">
                      {doc ? (
                        <div className="flex items-center justify-between bg-white rounded-xl p-2 border border-cream-border">
                          <div className="flex items-center gap-2 overflow-hidden mr-1">
                            <File className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                            <div className="truncate">
                              <p className="text-[11px] font-semibold text-charcoal-900 truncate">
                                {doc.name}
                              </p>
                              <p className="text-[9px] text-charcoal-muted font-mono">
                                {formatFileSize(doc.size)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(slot.key)}
                            title="Remove file"
                            className="p-1 text-charcoal-muted hover:text-red-500 rounded transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <label className="cursor-pointer flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl border border-dashed border-cream-border hover:border-gold-400 bg-cream-50 text-[11px] font-semibold text-charcoal-800 hover:text-charcoal-900 transition-colors">
                            <UploadCloud className="w-3.5 h-3.5 text-charcoal-muted" />
                            <span>Select PDF File</span>
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              onChange={(e) => handleFileChange(slot.key, e)}
                              className="hidden"
                            />
                          </label>
                          <p className="text-[9px] text-charcoal-muted mt-1 text-center font-mono">
                            Demo: {slot.sampleFileName}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submission Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-cream-border/60">
            <span className="text-[11px] text-charcoal-muted">
              Cross-verifies declarations against supporting PDFs using deterministic regulatory rules.
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleEvaluateDocuments}
                disabled={isExtracting || isAuditing}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-cream-100 hover:bg-cream-200 border border-cream-border text-charcoal-800 text-xs font-semibold shadow-soft transition-all disabled:opacity-50"
              >
                {isExtracting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-charcoal-600" />
                ) : (
                  <Layers className="w-3.5 h-3.5 text-charcoal-600" />
                )}
                <span>Extract PDF Data Only</span>
              </button>

              <button
                type="submit"
                disabled={isAuditing || isExtracting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-charcoal-900 text-white text-xs font-bold hover:bg-charcoal-800 shadow-soft transition-all disabled:opacity-50"
              >
                {isAuditing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-gold-400" />
                    <span>Auditing Dossier...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
                    <span>Run Compliance Audit</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gold-400" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
