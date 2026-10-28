import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  FileText,
  HelpCircle,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Columns,
  ExternalLink,
} from 'lucide-react';
import {
  EvaluationAuditResponse,
  FindingReviewStatus,
  FindingSeverity,
} from '../types/evaluation';

interface AuditFindingsViewProps {
  auditResult: EvaluationAuditResponse;
  onReset?: () => void;
  onViewExtractions?: () => void;
  onLaunchSplitScreen?: (findingId?: string) => void;
}

export const AuditFindingsView: React.FC<AuditFindingsViewProps> = ({
  auditResult,
  onReset,
  onViewExtractions,
  onLaunchSplitScreen,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'discrepancy' | 'matched' | 'review'>('all');
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(
    auditResult.findings[0]?.finding_id || null
  );

  const { summary, findings } = auditResult;

  const filteredFindings = findings.filter((f) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'discrepancy')
      return f.review_status === 'discrepancy_found' || f.review_status === 'rule_violation';
    if (statusFilter === 'matched')
      return f.review_status === 'no_discrepancy_detected';
    if (statusFilter === 'review')
      return f.review_status === 'needs_manual_review' || f.review_status === 'insufficient_evidence';
    return true;
  });

  const getStatusBadge = (status: FindingReviewStatus) => {
    switch (status) {
      case 'discrepancy_found':
        return {
          label: 'Discrepancy Found',
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
          label: 'Verified Match',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" />,
        };
      case 'needs_manual_review':
        return {
          label: 'Manual Review Required',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <Clock className="w-3 h-3 text-amber-600" />,
        };
      case 'insufficient_evidence':
        return {
          label: 'Insufficient Evidence',
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
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* 1. Header Evaluation Card */}
      <div className="bg-white rounded-panel border border-cream-border p-5 shadow-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cream-border/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-charcoal-900 text-white">
                AUDIT DOSSIER
              </span>
              <span className="text-xs font-mono font-medium text-charcoal-muted">
                {auditResult.evaluation_id}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  auditResult.processing_status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {auditResult.processing_status.toUpperCase()}
              </span>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-charcoal-900 mt-1">
              {auditResult.institution_name}
            </h3>
            <p className="text-xs text-charcoal-muted mt-0.5">
              Application ID: <span className="font-mono text-charcoal-800">{auditResult.application_id}</span> • Evaluation Date: {auditResult.evaluation_date}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {onLaunchSplitScreen && (
              <button
                type="button"
                onClick={() => onLaunchSplitScreen()}
                className="px-3 py-1.5 rounded-xl bg-gold-400 hover:bg-gold-500 text-xs font-bold text-charcoal-900 transition-colors flex items-center gap-1.5 shadow-soft"
                title="Open 3-panel split screen evidence viewer with PDF highlighting"
              >
                <Columns className="w-3.5 h-3.5 text-charcoal-900" />
                <span>Split-Screen Evidence Audit</span>
              </button>
            )}
            {onViewExtractions && (
              <button
                type="button"
                onClick={onViewExtractions}
                className="px-3 py-1.5 rounded-xl border border-cream-border text-xs font-medium text-charcoal-800 hover:bg-cream-100 transition-colors flex items-center gap-1.5 shadow-soft"
              >
                <Layers className="w-3.5 h-3.5 text-charcoal-muted" />
                Raw Extractions ({auditResult.document_extractions.length})
              </button>
            )}
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="px-3 py-1.5 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 text-xs font-medium text-white transition-colors shadow-soft"
              >
                New Audit Intake
              </button>
            )}
          </div>
        </div>

        {/* 2. Key Findings Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-4">
          <div className="rounded-xl p-3 bg-white border border-cream-border shadow-soft">
            <span className="text-[10px] font-semibold text-charcoal-muted uppercase tracking-wider block">
              Verified Matches
            </span>
            <div className="text-xl font-bold text-status-successText mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              {summary.matched_count}
            </div>
          </div>

          <div className="rounded-xl p-3 bg-rose-50/50 border border-rose-200/60 shadow-soft">
            <span className="text-[10px] font-semibold text-rose-700 uppercase tracking-wider block">
              Discrepancies
            </span>
            <div className="text-xl font-bold text-rose-700 mt-0.5 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              {summary.discrepancy_count}
            </div>
          </div>

          <div className="rounded-xl p-3 bg-red-50/60 border border-red-200/80 shadow-soft">
            <span className="text-[10px] font-semibold text-red-800 uppercase tracking-wider block">
              Rule Violations
            </span>
            <div className="text-xl font-bold text-red-800 mt-0.5 flex items-center gap-1">
              <XCircle className="w-4 h-4 text-red-600" />
              {summary.rule_violation_count}
            </div>
          </div>

          <div className="rounded-xl p-3 bg-amber-50/50 border border-amber-200/60 shadow-soft">
            <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider block">
              Manual Review
            </span>
            <div className="text-xl font-bold text-amber-800 mt-0.5 flex items-center gap-1">
              <Clock className="w-4 h-4 text-amber-600" />
              {summary.needs_manual_review_count}
            </div>
          </div>

          <div className="rounded-xl p-3 bg-slate-50 border border-slate-200 shadow-soft col-span-2 sm:col-span-1">
            <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block">
              Evidence Lacking
            </span>
            <div className="text-xl font-bold text-slate-700 mt-0.5 flex items-center gap-1">
              <HelpCircle className="w-4 h-4 text-slate-500" />
              {summary.insufficient_evidence_count}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Findings Filter Pills */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-charcoal-muted mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-charcoal-900 text-white shadow-soft'
                : 'bg-white text-charcoal-muted border border-cream-border hover:bg-cream-100'
            }`}
          >
            All Findings ({findings.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('discrepancy')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === 'discrepancy'
                ? 'bg-rose-700 text-white shadow-soft'
                : 'bg-white text-charcoal-muted border border-cream-border hover:bg-cream-100'
            }`}
          >
            Discrepancies & Violations ({summary.discrepancy_count + summary.rule_violation_count})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('matched')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === 'matched'
                ? 'bg-emerald-700 text-white shadow-soft'
                : 'bg-white text-charcoal-muted border border-cream-border hover:bg-cream-100'
            }`}
          >
            Verified Matched ({summary.matched_count})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('review')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === 'review'
                ? 'bg-amber-700 text-white shadow-soft'
                : 'bg-white text-charcoal-muted border border-cream-border hover:bg-cream-100'
            }`}
          >
            Review / Missing ({summary.needs_manual_review_count + summary.insufficient_evidence_count})
          </button>
        </div>
      </div>

      {/* 4. Audit Findings Detailed List */}
      <div className="space-y-3">
        {filteredFindings.length === 0 ? (
          <div className="bg-white rounded-panel border border-cream-border p-8 text-center">
            <ShieldCheck className="w-8 h-8 text-charcoal-light mx-auto mb-2" />
            <h4 className="text-sm font-bold text-charcoal-900">No findings match this filter</h4>
            <p className="text-xs text-charcoal-muted mt-0.5">
              Select another status pill above to inspect the audit results.
            </p>
          </div>
        ) : (
          filteredFindings.map((finding) => {
            const statusBadge = getStatusBadge(finding.review_status);
            const severityClass = getSeverityBadge(finding.severity);
            const isSelected = selectedFindingId === finding.finding_id;

            return (
              <div
                key={finding.finding_id}
                onClick={() => setSelectedFindingId(finding.finding_id)}
                className={`bg-white rounded-panel border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-gold-400 ring-2 ring-gold-400/20 shadow-panel'
                    : 'border-cream-border hover:border-gold-300 shadow-soft'
                } p-5 space-y-4`}
              >
                {/* Top Badge Row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cream-100 text-charcoal-800 border border-cream-border">
                      {finding.finding_id}
                    </span>
                    <span className="text-[10px] font-mono text-charcoal-muted">
                      {finding.rule_id}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${severityClass}`}
                    >
                      {finding.severity} Severity
                    </span>
                    {finding.extraction_quality_score !== null && finding.extraction_quality_score !== undefined && (
                      <span
                        className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${
                          finding.extraction_quality_score >= 0.8
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                        title="Deterministic heuristic extraction-quality score based on observable signals"
                      >
                        Quality: {(finding.extraction_quality_score * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusBadge.bg}`}
                  >
                    {statusBadge.icon}
                    {statusBadge.label}
                  </span>
                </div>

                {/* Finding Title & Core Description */}
                <div>
                  <h4 className="text-sm md:text-base font-bold text-charcoal-900">
                    {finding.title}
                  </h4>
                  <p className="text-xs text-charcoal-muted mt-0.5">
                    {finding.description}
                  </p>
                </div>

                {/* Comparison Values Box (Declared vs Evidentiary) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Declared Value Box */}
                  <div className="bg-[#FAF7F2] rounded-xl p-3 border border-cream-border/80">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-charcoal-muted uppercase tracking-wider">
                        Applicant Declaration
                      </span>
                      <span className="text-[9px] font-mono text-charcoal-light">Form / Dossier</span>
                    </div>
                    <div className="text-sm font-bold text-charcoal-900 mt-1">
                      {finding.declared_value !== null && finding.declared_value !== undefined
                        ? String(finding.declared_value)
                        : '— Not Declared —'}
                    </div>
                  </div>

                  {/* Evidentiary Value Box */}
                  <div
                    className={`rounded-xl p-3 border ${
                      finding.review_status === 'discrepancy_found' || finding.review_status === 'rule_violation'
                        ? 'bg-rose-50/40 border-rose-200'
                        : 'bg-[#FAF7F2] border-cream-border/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-charcoal-muted uppercase tracking-wider">
                        Evidentiary Primary Source
                      </span>
                      <span className="text-[9px] font-mono text-charcoal-light">Certified PDF</span>
                    </div>
                    <div
                      className={`text-sm font-bold mt-1 ${
                        finding.review_status === 'discrepancy_found' || finding.review_status === 'rule_violation'
                          ? 'text-rose-700'
                          : 'text-charcoal-900'
                      }`}
                    >
                      {finding.source_value !== null && finding.source_value !== undefined
                        ? String(finding.source_value)
                        : '— Missing from Evidence —'}
                    </div>
                  </div>
                </div>

                {/* Detailed Plain-English Explanation */}
                <div className="bg-white rounded-xl p-3 border border-cream-border/70 text-xs text-charcoal-800 leading-relaxed">
                  <span className="font-semibold text-charcoal-900">Analysis & Basis: </span>
                  {finding.explanation}
                </div>

                {/* Traceable Evidence Citations */}
                {finding.source_evidence && finding.source_evidence.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-cream-border/60">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-muted block">
                        Evidentiary Trail & PDF Coordinates:
                      </span>
                      {onLaunchSplitScreen && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLaunchSplitScreen(finding.finding_id);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-gold-700 hover:text-gold-900 transition-colors"
                        >
                          <span>Open in Split-Screen Viewer</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {finding.source_evidence.map((ev, i) => (
                        <div
                          key={i}
                          className="rounded-lg bg-cream-50/60 p-2.5 border border-cream-border text-[11px] space-y-1"
                        >
                          <div className="flex items-center justify-between text-charcoal-muted">
                            <span className="font-semibold text-charcoal-800 flex items-center gap-1 truncate mr-1">
                              <FileText className="w-3 h-3 text-gold-500 shrink-0" />
                              {ev.source_file}
                            </span>
                            {ev.page_number && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white border border-cream-border text-charcoal-700 shrink-0">
                                Page {ev.page_number}
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[10px] text-charcoal-700 bg-white/80 p-1.5 rounded border border-cream-border/50 truncate">
                            "{ev.matched_text}"
                          </div>
                          {ev.bounding_box && (
                            <div className="text-[9px] font-mono text-charcoal-muted">
                              Native BBox: [{ev.bounding_box.map((n) => n.toFixed(1)).join(', ')}]
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
