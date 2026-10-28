import React from 'react';
import {
  FilePlus2,
  FileText,
  UploadCloud,
  Scale,
  SearchCheck,
  ClipboardList
} from 'lucide-react';

interface OverviewPageProps {
  onStartNewEvaluation: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  onStartNewEvaluation,
}) => {
  const workflowSteps = [
    {
      step: '01',
      title: "Declared Information",
      description: 'Capture self-reported figures (faculty headcount, student enrollment, campus acreage, fire NOC).',
      icon: FileText,
      badge: 'Step 1 Active',
      badgeColor: 'bg-gold-400/20 text-gold-600 border-gold-400/30',
    },
    {
      step: '02',
      title: 'PDF Evidence Dossier',
      description: 'Ingest source records: Application, Faculty Register, Land & PWD Survey, and Fire Safety Certificate.',
      icon: UploadCloud,
      badge: 'PyMuPDF Ready',
      badgeColor: 'bg-cream-200 text-charcoal-700 border-cream-border',
    },
    {
      step: '03',
      title: 'Cross-Check & Norms',
      description: 'Verify declared values against document text extracts and AICTE Approval Handbook thresholds (SFR, Land).',
      icon: Scale,
      badge: 'Stage 3 Engine',
      badgeColor: 'bg-cream-200 text-charcoal-700 border-cream-border',
    },
    {
      step: '04',
      title: 'Audit Trail & Traces',
      description: 'Examine flagged discrepancies with side-by-side bounding boxes and page-level source citations.',
      icon: SearchCheck,
      badge: 'Stage 4 Active',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
  ];

  // Calendar dates matrix matching the reference image layout
  const calendarDays = [
    { num: 29, isPrev: true, hatched: true },
    { num: 30, isPrev: true, hatched: true },
    { num: 1, event: { label: 'Doc 01: Application', span: 3, type: 'dark' } },
    { num: 2 },
    { num: 3 },
    { num: 4, hatched: true },
    { num: 5, hatched: true },

    { num: 6 },
    { num: 7 },
    { num: 8 },
    { num: 9 },
    { num: 10 },
    { num: 11, highlight: 'gold', highlightLabel: 'Fire NOC Verified' },
    { num: 12, hatched: true },

    { num: 13, event: { label: 'Faculty Register Cross-Check', span: 4, type: 'gold' } },
    { num: 14 },
    { num: 15 },
    { num: 16 },
    { num: 17 },
    { num: 18, hatched: true },
    { num: 19, hatched: true },

    { num: 20 },
    { num: 21 },
    { num: 22, event: { label: 'AICTE Land Norm Audit', span: 3, type: 'dark' } },
    { num: 23 },
    { num: 24 },
    { num: 25, hatched: true },
    { num: 26, hatched: true },

    { num: 27 },
    { num: 28 },
    { num: 29 },
    { num: 30 },
    { num: 31 },
    { num: 1, isNext: true, hatched: true },
    { num: 2, isNext: true, hatched: true },
  ];

  return (
    <div className="space-y-6">
      {/* Calendar / Verification Matrix Card (Exact visual replica of center card in image) */}
      <div className="bg-white rounded-panel border border-cream-border p-5 shadow-panel space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-cream-border/60">
          <div>
            <h3 className="text-sm font-bold text-charcoal-900 tracking-tight">
              Scrutiny Schedule & Verification Calendar
            </h3>
            <p className="text-[11px] text-charcoal-muted">
              Scheduled document cross-checks, statutory audit milestones, and dossier reviews
            </p>
          </div>
          <button
            onClick={onStartNewEvaluation}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-charcoal-900 text-white text-xs font-semibold hover:bg-charcoal-800 transition-colors shadow-soft"
          >
            <FilePlus2 className="w-3.5 h-3.5 text-gold-400" />
            <span>Launch Evaluation</span>
          </button>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold text-charcoal-muted pt-1">
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div className="text-charcoal-400">Sat</div>
          <div className="text-charcoal-400">Sun</div>
        </div>

        {/* Calendar Grid with hatched cells, events, and highlights */}
        <div className="grid grid-cols-7 gap-1.5 text-xs">
          {calendarDays.map((cell, idx) => {
            return (
              <div
                key={idx}
                className={`min-h-[58px] p-1.5 rounded-xl border relative flex flex-col justify-between transition-all ${
                  cell.highlight === 'gold'
                    ? 'bg-gold-400 border-gold-500 shadow-soft text-charcoal-900'
                    : cell.hatched
                    ? 'bg-[#F9F7F2] border-cream-border/70 bg-hatched text-charcoal-400'
                    : 'bg-[#FDFCF9] border-cream-border text-charcoal-800'
                }`}
              >
                {/* Day number */}
                <span
                  className={`text-[10px] font-semibold ${
                    cell.highlight === 'gold'
                      ? 'text-charcoal-900 font-bold'
                      : cell.isPrev || cell.isNext
                      ? 'text-charcoal-light'
                      : 'text-charcoal-700'
                  }`}
                >
                  {cell.num}
                </span>

                {/* Event Pill spanning */}
                {cell.event && (
                  <div
                    className={`text-[9px] font-medium py-1 px-2 rounded-lg truncate shadow-soft ${
                      cell.event.type === 'gold'
                        ? 'bg-gold-400 text-charcoal-900 font-bold'
                        : 'bg-charcoal-900 text-white'
                    }`}
                  >
                    ● {cell.event.label}
                  </div>
                )}

                {/* Highlight Label */}
                {cell.highlightLabel && (
                  <div className="text-[9px] font-bold text-charcoal-900 leading-tight">
                    {cell.highlightLabel}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4-Step Verification Workflow (Laid out in warm cream cards) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-xs font-semibold text-charcoal-muted uppercase tracking-wider">
              AICTE Compliance Scrutiny Workflow
            </h3>
          </div>
          <span className="text-[11px] text-charcoal-muted">4-Stage Pipeline</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {workflowSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.step}
                className="bg-white rounded-card border border-cream-border p-4 shadow-panel hover:border-gold-400 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-charcoal-700 bg-cream-200 px-2 py-0.5 rounded-full border border-cream-border">
                      {step.step}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${step.badgeColor}`}>
                      {step.badge}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 mt-2">
                    <div className="w-8 h-8 rounded-xl bg-cream-200 text-charcoal-900 flex items-center justify-center shrink-0 border border-cream-border shadow-soft">
                      <Icon className="w-4 h-4 text-charcoal-900" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-charcoal-900 leading-snug">
                        {step.title}
                      </h4>
                      <p className="text-[11px] text-charcoal-muted leading-relaxed mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Evaluations Genuine Empty State */}
      <div className="bg-white rounded-panel border border-cream-border p-8 text-center shadow-panel space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-cream-100 border border-cream-border mx-auto flex items-center justify-center shadow-soft">
          <ClipboardList className="w-5 h-5 text-charcoal-700" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-charcoal-900">
            No Historical Scrutiny Cases Stored
          </h4>
          <p className="text-[11px] text-charcoal-muted max-w-sm mx-auto leading-relaxed">
            Evaluations initiated in this workspace will be persisted and listed here with extracted audit traces and compliance certificates once Stage 2-5 are active.
          </p>
        </div>
        <div className="pt-1">
          <button
            onClick={onStartNewEvaluation}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-cream-200 hover:bg-cream-300 text-charcoal-900 text-xs font-semibold border border-cream-border transition-colors shadow-soft"
          >
            <FilePlus2 className="w-3.5 h-3.5 text-gold-600" />
            <span>Create First Evaluation</span>
          </button>
        </div>
      </div>
    </div>
  );
};
