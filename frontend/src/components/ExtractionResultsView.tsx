import React, { useState } from 'react';
import {
  FileCheck2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Users,
  Info
} from 'lucide-react';
import { DocumentExtractionResult } from '../types/evaluation';

interface ExtractionResultsViewProps {
  results: DocumentExtractionResult[];
  onReset: () => void;
}

const CATEGORY_NAMES: Record<string, string> = {
  institution_application: 'Institutional Application',
  faculty_register: 'Faculty Register',
  land_infrastructure_report: 'Land & Infrastructure Report',
  fire_safety_certificate: 'Fire Safety Certificate',
  unknown: 'Unclassified Document',
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  institution_application: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  faculty_register: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  land_infrastructure_report: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  fire_safety_certificate: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  unknown: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

export const ExtractionResultsView: React.FC<ExtractionResultsViewProps> = ({ results, onReset }) => {
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>(() => {
    // Default open all
    const initial: Record<string, boolean> = {};
    results.forEach((r) => {
      initial[r.filename] = true;
    });
    return initial;
  });

  const [expandedRoster, setExpandedRoster] = useState<Record<string, boolean>>({});

  const toggleDoc = (filename: string) => {
    setExpandedDocs((prev) => ({ ...prev, [filename]: !prev[filename] }));
  };

  const toggleRoster = (filename: string) => {
    setExpandedRoster((prev) => ({ ...prev, [filename]: !prev[filename] }));
  };

  const totalFields = results.reduce((acc, r) => acc + r.fields.length, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-panel border border-cream-border p-6 shadow-panel space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-cream-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold-400 text-charcoal-900 flex items-center justify-center font-bold shadow-soft">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-charcoal-900">
                  Document Extraction Findings
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cream-200 text-charcoal-800 border border-cream-border">
                  Stage 2 Active
                </span>
              </div>
              <p className="text-xs text-charcoal-muted mt-0.5">
                Real PDF parsing via PyMuPDF: {results.length} documents processed, {totalFields} source-linked fields extracted.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="px-4 py-2 rounded-full bg-cream-200 hover:bg-cream-300 text-charcoal-900 text-xs font-semibold border border-cream-border transition-colors shadow-soft"
            >
              Upload / Re-evaluate
            </button>
          </div>
        </div>

        {/* Disclaimer / Stage 2 Guidance */}
        <div className="rounded-xl bg-cream-50 border border-cream-border p-3.5 flex items-start gap-2.5 text-xs text-charcoal-muted">
          <Info className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            <span className="font-semibold text-charcoal-900">Stage 2 Scope:</span> The fields and coordinates displayed below reflect raw, deterministic extractions and coordinate bboxes from the uploaded PDF streams. Cross-document discrepancy auditing and statutory compliance scoring will occur in Stage 3.
          </p>
        </div>
      </div>

      {/* Individual Document Extraction Cards */}
      <div className="space-y-4">
        {results.map((docResult) => {
          const isExpanded = expandedDocs[docResult.filename] ?? true;
          const color = CATEGORY_COLORS[docResult.document_type] || CATEGORY_COLORS.unknown;
          const readableName = CATEGORY_NAMES[docResult.document_type] || 'Unclassified Document';

          return (
            <div
              key={docResult.filename}
              className="bg-white rounded-panel border border-cream-border shadow-panel overflow-hidden transition-all"
            >
              {/* Document Header Accordion Bar */}
              <div
                onClick={() => toggleDoc(docResult.filename)}
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-cream-50/50 transition-colors select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${color.bg} ${color.text} ${color.border} shrink-0`}>
                    {readableName}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-charcoal-900 truncate">
                      {docResult.filename}
                    </h4>
                    <p className="text-[11px] text-charcoal-muted">
                      {docResult.page_count} {docResult.page_count === 1 ? 'page' : 'pages'} • {docResult.fields.length} fields detected
                      {docResult.faculty_records && ` • ${docResult.faculty_records.length} faculty roster records`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {docResult.warnings.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      <AlertTriangle className="w-3 h-3" />
                      {docResult.warnings.length} {docResult.warnings.length === 1 ? 'note' : 'notes'}
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      docResult.status === 'success'
                        ? 'bg-status-successBg text-status-successText border border-status-successText/20'
                        : docResult.status === 'warning'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-status-errorBg text-status-errorText border border-status-errorText/20'
                    }`}
                  >
                    {docResult.status}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-charcoal-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-charcoal-muted" />
                  )}
                </div>
              </div>

              {/* Collapsible Content */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-1 space-y-4 border-t border-cream-border/60">
                  {/* Warnings if any */}
                  {docResult.warnings.length > 0 && (
                    <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3 space-y-1">
                      <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Extraction Observation Notes:
                      </div>
                      <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5 pl-1">
                        {docResult.warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Extracted Fields Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-cream-border rounded-xl overflow-hidden">
                      <thead className="bg-cream-100/70 text-[10px] text-charcoal-muted uppercase font-bold tracking-wider border-b border-cream-border">
                        <tr>
                          <th className="py-2.5 px-3">Field Label</th>
                          <th className="py-2.5 px-3">Extracted Value</th>
                          <th className="py-2.5 px-3">Normalized Value</th>
                          <th className="py-2.5 px-3">Evidence Source (Page & Bounding Box)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cream-border/70 bg-white">
                        {docResult.fields.map((fld) => {
                          const bbox = fld.source?.bbox;
                          const page = fld.source?.page;
                          return (
                            <tr key={fld.field_key} className="hover:bg-cream-50/50 transition-colors">
                              <td className="py-2.5 px-3 font-semibold text-charcoal-900">
                                {fld.label}
                                {fld.unit && (
                                  <span className="text-[10px] text-charcoal-muted block font-normal">
                                    Unit: {fld.unit}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-charcoal-800">
                                {fld.original_value}
                              </td>
                              <td className="py-2.5 px-3">
                                {fld.normalized_value !== null && fld.normalized_value !== undefined ? (
                                  <span className="inline-block px-2 py-0.5 rounded-md bg-cream-100 font-mono text-[11px] font-semibold text-charcoal-900 border border-cream-border">
                                    {String(fld.normalized_value)}
                                    {fld.unit && ` ${fld.unit}`}
                                  </span>
                                ) : (
                                  <span className="text-charcoal-light italic text-[11px]">raw only</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 space-y-1">
                                <div className="flex items-center gap-1.5">
                                  {page && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-charcoal-900 text-white font-mono">
                                      Page {page}
                                    </span>
                                  )}
                                  {bbox && (
                                    <span
                                      className="text-[10px] font-mono text-charcoal-700 bg-cream-100 px-2 py-0.5 rounded border border-cream-border"
                                      title="PyMuPDF page points [x0, y0, x1, y1]"
                                    >
                                      [{bbox.map((v) => v.toFixed(1)).join(', ')}]
                                    </span>
                                  )}
                                </div>
                                {fld.source?.matched_text && (
                                  <div className="text-[10px] text-charcoal-muted truncate max-w-xs font-mono">
                                    Snippet: &ldquo;{fld.source.matched_text}&rdquo;
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Faculty Records Roster Table if present */}
                  {docResult.faculty_records && docResult.faculty_records.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gold-600" />
                          <h5 className="text-xs font-bold text-charcoal-900">
                            Parsed Faculty Roster Records ({docResult.faculty_records.length} Members)
                          </h5>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleRoster(docResult.filename)}
                          className="text-[11px] font-semibold text-charcoal-700 hover:text-charcoal-900 underline"
                        >
                          {expandedRoster[docResult.filename] ? 'Hide Full Roster' : 'View Full Roster'}
                        </button>
                      </div>

                      {expandedRoster[docResult.filename] && (
                        <div className="max-h-72 overflow-y-auto border border-cream-border rounded-xl">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-cream-100/80 text-[10px] text-charcoal-muted uppercase font-bold tracking-wider sticky top-0 border-b border-cream-border">
                              <tr>
                                <th className="py-2 px-3">#</th>
                                <th className="py-2 px-3">Faculty ID</th>
                                <th className="py-2 px-3">Full Name</th>
                                <th className="py-2 px-3">Department</th>
                                <th className="py-2 px-3">Designation</th>
                                <th className="py-2 px-3">Status</th>
                                <th className="py-2 px-3">Page & BBox</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-cream-border/70 bg-white">
                              {docResult.faculty_records.map((fac) => (
                                <tr key={fac.faculty_id} className="hover:bg-cream-50/50">
                                  <td className="py-2 px-3 text-charcoal-muted font-mono">{fac.s_no}</td>
                                  <td className="py-2 px-3 font-mono font-bold text-charcoal-900">{fac.faculty_id}</td>
                                  <td className="py-2 px-3 font-semibold text-charcoal-900">{fac.name}</td>
                                  <td className="py-2 px-3 text-charcoal-700">{fac.department}</td>
                                  <td className="py-2 px-3 text-charcoal-700">{fac.designation}</td>
                                  <td className="py-2 px-3">
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-status-successBg text-status-successText">
                                      {fac.status}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-[10px] font-mono text-charcoal-muted">
                                    Pg {fac.page} {fac.bbox && `[${fac.bbox[0].toFixed(0)}, ${fac.bbox[1].toFixed(0)}]`}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
