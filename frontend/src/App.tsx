import React, { useState, useEffect, useCallback } from 'react';
import { TopNav } from './components/TopNav';
import { LeftDossierColumn } from './components/LeftDossierColumn';
import { RightEvidenceColumn } from './components/RightEvidenceColumn';
import { OverviewPage } from './pages/OverviewPage';
import { NewEvaluationPage } from './pages/NewEvaluationPage';
import { EvaluationHistoryPage } from './pages/EvaluationHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import {
  NavPage,
  DeclaredInstitutionData,
  UploadedDocuments,
  BackendConnectionStatus,
  BackendHealthResponse,
  DocumentCategoryKey,
  DocumentExtractionResult,
  EvaluationAuditResponse,
} from './types/evaluation';
import { checkBackendHealth } from './lib/api';
import { Search, SlidersHorizontal, Plus, MapPin, BarChart3, ChevronDown } from 'lucide-react';

const initialFormData: DeclaredInstitutionData = {
  institutionName: 'Apex Institute of Technology & Management',
  applicationId: 'AICTE-WR-2024-998241',
  institutionType: 'Engineering & Technology',
  location: 'Pune, Maharashtra',
  academicYear: '2024-25',
  submissionDate: new Date().toISOString().split('T')[0],
  facultyCount: 120,
  studentCount: 1800,
  landAreaAcres: 7.5,
  builtUpAreaSqM: 22500,
  fireSafetyCertNumber: 'MH-PUN-FIRE-NOC-2024-081',
  fireSafetyExpiryDate: '2025-06-30',
};

const initialUploadedDocs: UploadedDocuments = {
  institutionalApplication: null,
  facultyRegister: null,
  landInfrastructureReport: null,
  fireSafetyCertificate: null,
};

const PAGE_TITLES: Record<NavPage, { title: string; subtitle: string }> = {
  overview: {
    title: 'Compliance Workspace',
    subtitle: 'Institutional scrutiny dossiers, statutory norms, and verification schedule',
  },
  'new-evaluation': {
    title: 'New Evaluation Intake',
    subtitle: 'Capture declared institutional figures and stage evidentiary PDF documents',
  },
  history: {
    title: 'Evaluation History',
    subtitle: 'Persisted verification audits, discrepancy logs, and signed records',
  },
  settings: {
    title: 'System Settings',
    subtitle: 'API gateway diagnostics, environment metadata, and regulatory rulesets',
  },
};

export const App: React.FC = () => {
  // Navigation state
  const [currentPage, setCurrentPage] = useState<NavPage>('overview');

  // Real backend connection states
  const [connectionStatus, setConnectionStatus] = useState<BackendConnectionStatus>('checking');
  const [healthData, setHealthData] = useState<BackendHealthResponse | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Form and document states preserved across navigation
  const [formData, setFormData] = useState<DeclaredInstitutionData>(initialFormData);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocuments>(initialUploadedDocs);
  const [extractionResults, setExtractionResults] = useState<DocumentExtractionResult[] | null>(null);
  const [auditResult, setAuditResult] = useState<EvaluationAuditResponse | null>(null);

  // Search filter query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Health check query
  const runHealthCheck = useCallback(async () => {
    setIsRefreshing(true);
    const result = await checkBackendHealth();
    if (result.ok && result.data) {
      setConnectionStatus('online');
      setHealthData(result.data);
      setLatencyMs(result.latencyMs ?? null);
    } else {
      setConnectionStatus('offline');
      setHealthData(null);
      setLatencyMs(null);
    }
    setIsRefreshing(false);
  }, []);

  // Check health on mount and poll periodically every 10 seconds
  useEffect(() => {
    runHealthCheck();
    const interval = setInterval(runHealthCheck, 10000);
    return () => clearInterval(interval);
  }, [runHealthCheck]);

  // Remove document handler
  const handleRemoveDoc = (category: DocumentCategoryKey) => {
    setUploadedDocs((prev) => ({
      ...prev,
      [category]: null,
    }));
  };

  const currentMeta = PAGE_TITLES[currentPage];

  return (
    <div className="min-h-screen bg-[#8E95A1] p-3 sm:p-5 md:p-7 flex items-center justify-center font-sans antialiased">
      {/* Floating Application Window (Matching the exact curved frame in reference image) */}
      <div className="w-full max-w-[1480px] bg-[#FAF7F2] rounded-[32px] md:rounded-[36px] shadow-window border border-white/60 p-5 md:p-8 flex flex-col relative overflow-hidden">
        {/* Subtle warm golden ambient glow in corners */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gold-400/15 rounded-full blur-3xl pointer-events-none -mb-20"></div>

        {/* Top Navigation Pill Bar & Brand */}
        <TopNav
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          connectionStatus={connectionStatus}
          healthData={healthData}
          latencyMs={latencyMs}
          onRefreshHealth={runHealthCheck}
          isRefreshing={isRefreshing}
        />

        {/* Large Elegant Title Header (e.g. "Salary" in reference image) */}
        <div className="pt-2 pb-6 px-1">
          <h1 className="text-3xl md:text-4xl font-light tracking-tight text-charcoal-900 font-sans">
            {currentMeta.title}
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            {currentMeta.subtitle}
          </p>
        </div>

        {/* Main 3-Column Content Layout (Matching reference image architecture) */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Column 1: Left Dossier List & Pagination */}
          <LeftDossierColumn
            activeInstitutionName={formData.institutionName}
            onSelectDossier={(dossier) => {
              setFormData((prev) => ({
                ...prev,
                institutionName: dossier.name,
                applicationId: dossier.applicationId,
              }));
              if (currentPage !== 'overview') {
                setCurrentPage('overview');
              }
            }}
          />

          {/* Column 2: Center Main Workspace */}
          <div className="flex-1 min-w-0 w-full space-y-5">
            {/* Top Workspace Bar: Search Pill + Filter Buttons (Matching reference image top pill) */}
            <div className="bg-white rounded-full p-1.5 pl-3 border border-cream-border shadow-panel flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <button
                  type="button"
                  title="Filter by Location"
                  className="p-1.5 rounded-full hover:bg-cream-100 text-charcoal-muted hover:text-charcoal-900 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Filter by Statutory Ratios"
                  className="p-1.5 rounded-full hover:bg-cream-100 text-charcoal-muted hover:text-charcoal-900 transition-colors"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
                <div className="h-4 w-px bg-cream-border mx-0.5"></div>
                <div className="flex items-center gap-2 flex-1">
                  <Search className="w-3.5 h-3.5 text-charcoal-muted shrink-0" />
                  <input
                    type="text"
                    placeholder="Search candidate institutions, application ID or rules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs text-charcoal-900 bg-transparent placeholder:text-charcoal-light focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 pr-1">
                <button
                  type="button"
                  title="Configure Filters"
                  className="p-1.5 rounded-full hover:bg-cream-100 text-charcoal-muted hover:text-charcoal-900 transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('new-evaluation')}
                  className="w-7 h-7 rounded-full bg-cream-100 hover:bg-cream-200 border border-cream-border text-charcoal-900 flex items-center justify-center transition-colors shadow-soft"
                  title="New Evaluation"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Metrics Highlight Banner & Segmented Status Capsules (Matching reference image) */}
            <div className="bg-white rounded-panel border border-cream-border p-5 shadow-panel space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xl md:text-2xl font-bold text-charcoal-900 font-sans tracking-tight">
                    {formData.facultyCount || 120} Faculty / {formData.studentCount ? Number(formData.studentCount).toLocaleString() : '1,800'} Students
                  </div>
                  <div className="text-[11px] text-charcoal-muted font-medium mt-0.5">
                    Declared institutional capacity vs statutory regulatory norms
                  </div>
                </div>

                {/* Academic Year Dropdown Pill */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cream-100 border border-cream-border text-xs font-semibold text-charcoal-800 shadow-soft cursor-pointer hover:bg-cream-200 transition-colors">
                  <span>AY {formData.academicYear || '2024-25'}</span>
                  <ChevronDown className="w-3 h-3 text-charcoal-muted" />
                </div>
              </div>

              {/* Segmented Status Capsules (Gold, Charcoal, Grey capsules like image) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="rounded-xl p-2.5 bg-gold-400 text-charcoal-900 shadow-soft">
                  <span className="text-[10px] font-semibold uppercase tracking-wider block opacity-80">
                    Core Faculty
                  </span>
                  <div className="text-sm font-bold mt-0.5">
                    {formData.facultyCount || 120} Active Headcount
                  </div>
                </div>

                <div className="rounded-xl p-2.5 bg-charcoal-900 text-white shadow-soft">
                  <span className="text-[10px] font-semibold uppercase tracking-wider block text-charcoal-light">
                    Student Capacity
                  </span>
                  <div className="text-sm font-bold mt-0.5">
                    {formData.studentCount ? Number(formData.studentCount).toLocaleString() : '1,800'} Enrolled
                  </div>
                </div>

                <div className="rounded-xl p-2.5 bg-[#D7D2C7] text-charcoal-900 shadow-soft">
                  <span className="text-[10px] font-semibold uppercase tracking-wider block opacity-75">
                    Statutory SFR
                  </span>
                  <div className="text-sm font-bold mt-0.5">
                    1 : {formData.facultyCount && formData.studentCount ? (Number(formData.studentCount) / Number(formData.facultyCount)).toFixed(1) : '15.0'} Norm
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Page Views */}
            {currentPage === 'overview' && (
              <OverviewPage
                onStartNewEvaluation={() => setCurrentPage('new-evaluation')}
              />
            )}

            {currentPage === 'new-evaluation' && (
              <NewEvaluationPage
                formData={formData}
                setFormData={setFormData}
                uploadedDocs={uploadedDocs}
                setUploadedDocs={setUploadedDocs}
                extractionResults={extractionResults}
                setExtractionResults={setExtractionResults}
                auditResult={auditResult}
                setAuditResult={setAuditResult}
              />
            )}

            {currentPage === 'history' && (
              <EvaluationHistoryPage
                onStartNewEvaluation={() => setCurrentPage('new-evaluation')}
              />
            )}

            {currentPage === 'settings' && (
              <SettingsPage
                connectionStatus={connectionStatus}
                healthData={healthData}
                latencyMs={latencyMs}
                onRefreshHealth={runHealthCheck}
                isRefreshing={isRefreshing}
              />
            )}
          </div>

          {/* Column 3: Right Evidentiary Dossier Column (Matching reference image right card) */}
          <RightEvidenceColumn
            formData={formData}
            uploadedDocs={uploadedDocs}
            onRemoveDoc={handleRemoveDoc}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
