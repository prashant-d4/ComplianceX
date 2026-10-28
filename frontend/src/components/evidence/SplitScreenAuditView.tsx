import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  FileText,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  ChevronRight,
  Info,
  Layers,
} from 'lucide-react';
import {
  EvaluationAuditResponse,
  AuditFinding,
  FindingReviewStatus,
  FindingSeverity,
  UploadedDocuments,
  AuditEvidenceReference,
} from '../../types/evaluation';
import { PdfViewer } from '../pdf/PdfViewer';

export interface SplitScreenAuditViewProps {
  auditResult: EvaluationAuditResponse;
  uploadedDocs: UploadedDocuments;
  onBackToOverview: () => void;
  onUpdateFindingDecision?: (
    findingId: string,
    decision: 'approved' | 'rejected' | 'escalated',
    notes: string
  ) => void;
}

export const SplitScreenAuditView: React.FC<SplitScreenAuditViewProps> = ({
  auditResult,
  uploadedDocs,
  onBackToOverview,
  onUpdateFindingDecision,
}) => {
  // Local mutable copy of findings to reflect immediate review status updates
  const [findings, setFindings] = useState<AuditFinding[]>(auditResult.findings);
  const [selectedFindingId, setSelectedFindingId] = useState<string>(
    auditResult.findings[0]?.finding_id || ''
  );
  const [selectedCitationIndex, setSelectedCitationIndex] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_review' | 'discrepancy' | 'reviewed'>('all');
  const [evaluatorNotes, setEvaluatorNotes] = useState<string>('');

  // Active finding
  const activeFinding = useMemo(() => {
    return findings.find((f) => f.finding_id === selectedFindingId) || findings[0];
  }, [findings, selectedFindingId]);

  // Synchronize evaluator notes when switching active finding
  React.useEffect(() => {
    if (activeFinding) {
      setEvaluatorNotes(activeFinding.evaluator_notes || '');
      setSelectedCitationIndex(0);
    }
  }, [activeFinding?.finding_id]);

  // Filtered findings list for Left Panel
  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'needs_review')
        return (
          !f.evaluator_decision &&
          (f.review_status === 'needs_manual_review' ||
            f.review_status === 'insufficient_evidence' ||
            f.review_required)
        );
      if (statusFilter === 'discrepancy')
        return (
          f.review_status === 'discrepancy_found' || f.review_status === 'rule_violation'
        );
      if (statusFilter === 'reviewed')
        return Boolean(f.evaluator_decision);
      return true;
    });
  }, [findings, statusFilter]);

  // Summary counts
  const summaryCounts = useMemo(() => {
    const total = findings.length;
    const reviewed = findings.filter((f) => Boolean(f.evaluator_decision)).length;
    const discrepancies = findings.filter(
      (f) => f.review_status === 'discrepancy_found' || f.review_status === 'rule_violation'
    ).length;
    const needsReview = findings.filter(
      (f) =>
        !f.evaluator_decision &&
        (f.review_status === 'needs_manual_review' ||
          f.review_status === 'insufficient_evidence' ||
          f.review_required)
    ).length;
    const matched = findings.filter(
      (f) => f.review_status === 'no_discrepancy_detected'
    ).length;

    return { total, reviewed, discrepancies, needsReview, matched };
  }, [findings]);

  // Resolve active evidence citation for middle panel
  const activeCitations = activeFinding?.source_evidence || [];
  const currentCitation: AuditEvidenceReference | undefined =
    activeCitations[selectedCitationIndex] || activeCitations[0];

  // Helper to find matching File from uploadedDocs in memory if available
  const activeFile = useMemo(() => {
    if (!currentCitation) return null;
    const targetFilename = currentCitation.source_file.toLowerCase();

    for (const doc of Object.values(uploadedDocs)) {
      if (doc && doc.name.toLowerCase() === targetFilename) {
        return doc.file;
      }
    }
    return null;
  }, [currentCitation, uploadedDocs]);

  // Decision Handler
  const handleDecision = (decision: 'approved' | 'rejected' | 'escalated') => {
    if (!activeFinding) return;

    const now = new Date().toISOString();
    let updatedStatus: FindingReviewStatus = activeFinding.review_status;

    if (decision === 'approved') {
      updatedStatus = 'no_discrepancy_detected';
    } else if (decision === 'rejected') {
      updatedStatus = 'discrepancy_found';
    } else if (decision === 'escalated') {
      updatedStatus = 'needs_manual_review';
    }

    const updated = findings.map((f) => {
      if (f.finding_id === activeFinding.finding_id) {
        return {
          ...f,
          evaluator_decision: decision,
          evaluator_notes: evaluatorNotes,
          decided_at: now,
          review_status: updatedStatus,
        };
      }
      return f;
    });

    setFindings(updated);

    if (onUpdateFindingDecision) {
      onUpdateFindingDecision(activeFinding.finding_id, decision, evaluatorNotes);
    }
  };

  // Navigate to next unreviewed finding
  const handleNextUnreviewed = () => {
    const unreviewed = findings.find(
      (f) => !f.evaluator_decision && f.finding_id !== activeFinding?.finding_id
    );
    if (unreviewed) {
      setSelectedFindingId(unreviewed.finding_id);
    }
  };

  const getStatusBadge = (status: FindingReviewStatus, decision?: string | null) => {
    if (decision === 'approved') {
      return {
        label: 'Evaluator Verified',
        bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
        icon: <CheckCircle2 className="w-3 h-3 text-emerald-700" />,
      };
    }
    if (decision === 'rejected') {
      return {
        label: 'Evaluator Rejected',
        bg: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
        icon: <XCircle className="w-3 h-3 text-rose-700" />,
      };
    }
    if (decision === 'escalated') {
      return {
        label: 'Escalated for Review',
        bg: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
        icon: <Clock className="w-3 h-3 text-amber-700" />,
      };
    }

    switch (status) {
      case 'discrepancy_found':
        return {
          label: 'Discrepancy',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: <AlertTriangle className="w-3 h-3 text-rose-600" />,
        };
      case 'rule_violation':
        return {
          label: 'Rule Violation',
          bg: 'bg-red-50 text-red-800 border-red-200',
          icon: <XCircle className="w-3 h-3 text-red-600" />,
        };
      case 'no_discrepancy_detected':
        return {
          label: 'Matched',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" />,
        };
      case 'needs_manual_review':
        return {
          label: 'Needs Review',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <Clock className="w-3 h-3 text-amber-600" />,
        };
      case 'insufficient_evidence':
        return {
          label: 'No Evidence',
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          icon: <HelpCircle className="w-3 h-3 text-slate-500" />,
        };
    }
  };

  const getSeverityBadge = (severity: FindingSeverity) => {
    switch (severity) {
      case 'high':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'info':
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[700px] space-y-3 animate-in fade-in duration-200">
      {/* 1. Top Audit Controls Header Bar */}
      <div className="bg-white rounded-2xl border border-cream-border px-5 py-3 shadow-panel flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToOverview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cream-border hover:bg-cream-100 text-xs font-semibold text-charcoal-800 transition-colors shadow-soft"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Summary</span>
          </button>

          <div className="h-4 w-px bg-cream-border hidden sm:block" />

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-base font-bold text-charcoal-900 tracking-tight truncate max-w-[280px] sm:max-w-md">
                {auditResult.institution_name}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cream-100 text-charcoal-muted border border-cream-border">
                {auditResult.application_id}
              </span>
            </div>
          </div>
        </div>

        {/* Progress & Quick Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-charcoal-muted">
            <span className="font-semibold text-charcoal-900">{summaryCounts.reviewed}</span> of{' '}
            <span className="font-semibold text-charcoal-900">{summaryCounts.total}</span> findings decided
          </div>

          <div className="w-24 bg-cream-200 rounded-full h-2 overflow-hidden border border-cream-border">
            <div
              className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
              style={{
                width: `${(summaryCounts.reviewed / (summaryCounts.total || 1)) * 100}%`,
              }}
            />
          </div>

          {summaryCounts.reviewed < summaryCounts.total && (
            <button
              type="button"
              onClick={handleNextUnreviewed}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gold-400 hover:bg-gold-500 text-charcoal-900 text-xs font-bold transition-all shadow-soft"
            >
              <span>Next Unreviewed</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Main 3-Column Split-Screen Audit Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* =========================================================================
            PANEL 1 (LEFT): FINDINGS LIST (3 Cols on Desktop)
           ========================================================================= */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-cream-border shadow-panel flex flex-col min-h-0 overflow-hidden">
          {/* Panel Header & Filter Tabs */}
          <div className="p-3.5 border-b border-cream-border space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-gold-500" />
                <span>Audit Findings ({findings.length})</span>
              </h3>
              <span className="text-[10px] font-semibold text-charcoal-muted">
                {summaryCounts.discrepancies} Flagged
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors shrink-0 ${
                  statusFilter === 'all'
                    ? 'bg-charcoal-900 text-white'
                    : 'bg-cream-100 text-charcoal-muted hover:bg-cream-200'
                }`}
              >
                All ({findings.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('discrepancy')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors shrink-0 ${
                  statusFilter === 'discrepancy'
                    ? 'bg-rose-700 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                Discrepant ({summaryCounts.discrepancies})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('reviewed')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors shrink-0 ${
                  statusFilter === 'reviewed'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Decided ({summaryCounts.reviewed})
              </button>
            </div>
          </div>

          {/* Scrollable Findings Cards */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-cream-border/40">
            {filteredFindings.length === 0 ? (
              <div className="text-center p-6 text-xs text-charcoal-muted">
                No findings match the selected filter.
              </div>
            ) : (
              filteredFindings.map((finding) => {
                const isSelected = finding.finding_id === selectedFindingId;
                const statusBadge = getStatusBadge(
                  finding.review_status,
                  finding.evaluator_decision
                );
                const severityClass = getSeverityBadge(finding.severity);

                return (
                  <div
                    key={finding.finding_id}
                    onClick={() => setSelectedFindingId(finding.finding_id)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-gold-50/70 border-gold-400 shadow-soft ring-1 ring-gold-400/40'
                        : 'bg-white border-transparent hover:bg-cream-50/80 hover:border-cream-border'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cream-200/70 text-charcoal-800">
                        {finding.finding_id}
                      </span>
                      <span
                        className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge.bg} flex items-center gap-1`}
                      >
                        {statusBadge.icon}
                        <span>{statusBadge.label}</span>
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-charcoal-900 leading-snug line-clamp-1">
                      {finding.title}
                    </h4>

                    <div className="flex items-center justify-between text-[10px] text-charcoal-muted mt-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${severityClass}`}
                      >
                        {finding.severity}
                      </span>

                      {finding.source_evidence && finding.source_evidence[0] && (
                        <span className="truncate max-w-[140px] text-charcoal-light font-mono">
                          Pg {finding.source_evidence[0].page_number || '1'} • {finding.source_evidence[0].source_file}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* =========================================================================
            PANEL 2 (MIDDLE): PDF VIEWER WITH ACTIVE HIGHLIGHT (5.5 Cols on Desktop)
           ========================================================================= */}
        <div className="lg:col-span-5 flex flex-col min-h-0 bg-white rounded-2xl border border-cream-border shadow-panel overflow-hidden">
          {/* Multiple Citation Switcher Bar (if finding has >1 evidence references) */}
          {activeCitations.length > 1 && (
            <div className="bg-[#FAF7F2] px-3 py-2 border-b border-cream-border flex items-center gap-1.5 overflow-x-auto shrink-0">
              <span className="text-[10px] font-bold text-charcoal-muted uppercase tracking-wider mr-1 shrink-0">
                Evidence Source:
              </span>
              {activeCitations.map((citation, idx) => {
                const isSelected = idx === selectedCitationIndex;
                const isForm = citation.source_file === 'user_declaration';

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedCitationIndex(idx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-charcoal-900 text-white shadow-soft'
                        : 'bg-white text-charcoal-800 border border-cream-border hover:bg-cream-100'
                    }`}
                  >
                    <FileText className="w-3 h-3 text-gold-400" />
                    <span>
                      {isForm ? 'Intake Form Declaration' : `${citation.source_file} (Pg ${citation.page_number || 1})`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* PDF Viewer or Intake Form Placeholder */}
          {currentCitation && currentCitation.source_file === 'user_declaration' ? (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-[#FAF7F2] space-y-3">
              <div className="w-12 h-12 rounded-full bg-cream-200 flex items-center justify-center">
                <Info className="w-6 h-6 text-charcoal-900" />
              </div>
              <div className="max-w-md space-y-1">
                <h4 className="text-sm font-bold text-charcoal-900">
                  Applicant Form Declaration
                </h4>
                <p className="text-xs text-charcoal-muted leading-relaxed">
                  This value was declared directly in the intake dossier form:
                </p>
                <div className="bg-white p-3 rounded-xl border border-cream-border font-mono text-xs text-charcoal-900 font-bold shadow-soft">
                  "{currentCitation.matched_text}"
                </div>
                {activeCitations.length > 1 && (
                  <p className="text-[11px] text-gold-700 font-semibold pt-2">
                    Click the other evidence tab above to view and highlight the primary evidentiary PDF.
                  </p>
                )}
              </div>
            </div>
          ) : currentCitation ? (
            <PdfViewer
              file={activeFile}
              filename={currentCitation.source_file}
              targetPage={currentCitation.page_number || 1}
              highlightPage={currentCitation.page_number || 1}
              highlightBbox={currentCitation.bounding_box || null}
              highlightText={currentCitation.matched_text}
              className="flex-1 h-full rounded-none border-none"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-charcoal-muted">
              Select a finding on the left to inspect its evidentiary document.
            </div>
          )}
        </div>

        {/* =========================================================================
            PANEL 3 (RIGHT): FINDING DETAILS & EVALUATOR DECISION (3.5 Cols on Desktop)
           ========================================================================= */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-cream-border shadow-panel flex flex-col min-h-0 overflow-y-auto p-4 space-y-4">
          {activeFinding ? (
            <>
              {/* Finding Title & Badges */}
              <div className="space-y-1.5 pb-3 border-b border-cream-border/70">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cream-100 text-charcoal-800 border border-cream-border">
                    {activeFinding.finding_id}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getSeverityBadge(
                      activeFinding.severity
                    )}`}
                  >
                    {activeFinding.severity} Severity
                  </span>
                </div>
                <h3 className="text-sm md:text-base font-bold text-charcoal-900 leading-snug">
                  {activeFinding.title}
                </h3>
                <p className="text-xs text-charcoal-muted leading-relaxed">
                  {activeFinding.description}
                </p>
              </div>

              {/* Declared vs Evidentiary Values Box */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted block">
                  Cross-Verification Comparison
                </span>

                <div className="space-y-2">
                  <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-cream-border text-xs">
                    <span className="text-[10px] font-semibold text-charcoal-muted uppercase block">
                      Applicant Declaration
                    </span>
                    <div className="text-sm font-bold text-charcoal-900 mt-0.5">
                      {activeFinding.declared_value !== null && activeFinding.declared_value !== undefined
                        ? String(activeFinding.declared_value)
                        : '— Not Declared —'}
                    </div>
                  </div>

                  <div
                    className={`p-2.5 rounded-xl border text-xs ${
                      activeFinding.review_status === 'discrepancy_found' ||
                      activeFinding.review_status === 'rule_violation'
                        ? 'bg-rose-50/60 border-rose-200'
                        : 'bg-[#FAF7F2] border-cream-border'
                    }`}
                  >
                    <span className="text-[10px] font-semibold text-charcoal-muted uppercase block">
                      Certified Evidentiary Value
                    </span>
                    <div
                      className={`text-sm font-bold mt-0.5 ${
                        activeFinding.review_status === 'discrepancy_found' ||
                        activeFinding.review_status === 'rule_violation'
                          ? 'text-rose-700'
                          : 'text-charcoal-900'
                      }`}
                    >
                      {activeFinding.source_value !== null && activeFinding.source_value !== undefined
                        ? String(activeFinding.source_value)
                        : '— Missing in Document —'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Analysis Explanation */}
              <div className="bg-cream-50/70 p-3 rounded-xl border border-cream-border text-xs text-charcoal-800 leading-relaxed space-y-1">
                <span className="font-bold text-charcoal-900 block">Regulatory Analysis:</span>
                <p>{activeFinding.explanation}</p>
              </div>

              {/* Extraction Quality Score */}
              {activeFinding.extraction_quality_score !== null &&
                activeFinding.extraction_quality_score !== undefined && (
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-cream-border text-xs">
                    <div>
                      <span className="text-[10px] font-semibold text-charcoal-muted block">
                        Extraction Quality Score
                      </span>
                      <span className="font-bold text-charcoal-900">
                        {(activeFinding.extraction_quality_score * 100).toFixed(0)}% Certainty
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        activeFinding.extraction_quality_score >= 0.8
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {activeFinding.extraction_quality_score >= 0.8 ? 'High Confidence' : 'Manual Review Rec.'}
                    </span>
                  </div>
                )}

              {/* Evaluator Review Decision Card */}
              <div className="p-3.5 bg-white rounded-xl border-2 border-gold-300 shadow-soft space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-charcoal-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-gold-500" />
                    <span>Evaluator Decision</span>
                  </span>
                  {activeFinding.evaluator_decision && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-charcoal-900 text-white">
                      {activeFinding.evaluator_decision}
                    </span>
                  )}
                </div>

                {/* Notes Input Field */}
                <div>
                  <label className="text-[10px] font-semibold text-charcoal-muted uppercase tracking-wider block mb-1">
                    Evaluator Notes & Justification:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter audit notes or rationale for record..."
                    value={evaluatorNotes}
                    onChange={(e) => setEvaluatorNotes(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-cream-border focus:border-gold-400 focus:outline-none placeholder:text-charcoal-light bg-[#FAF7F2]"
                  />
                </div>

                {/* 3 Decision Actions */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleDecision('approved')}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all shadow-soft ${
                      activeFinding.evaluator_decision === 'approved'
                        ? 'bg-emerald-700 text-white ring-2 ring-emerald-500'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Claim</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDecision('rejected')}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all shadow-soft ${
                      activeFinding.evaluator_decision === 'rejected'
                        ? 'bg-rose-700 text-white ring-2 ring-rose-500'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject / Flag</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDecision('escalated')}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all shadow-soft ${
                      activeFinding.evaluator_decision === 'escalated'
                        ? 'bg-amber-700 text-white ring-2 ring-amber-500'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Escalate</span>
                  </button>
                </div>

                {/* Decision Stamp if already decided */}
                {activeFinding.decided_at && (
                  <div className="text-[10px] text-charcoal-muted pt-1 border-t border-cream-border/60 flex items-center justify-between">
                    <span>Decided at: {new Date(activeFinding.decided_at).toLocaleTimeString()}</span>
                    <span className="font-semibold text-charcoal-700">Audit Trail Signed</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="m-auto text-center p-6 text-xs text-charcoal-muted">
              Select a finding from the left panel to inspect its details and record an evaluator decision.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
