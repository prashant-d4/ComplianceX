import React from 'react';
import { History, Database, FilePlus2 } from 'lucide-react';

interface EvaluationHistoryPageProps {
  onStartNewEvaluation: () => void;
}

export const EvaluationHistoryPage: React.FC<EvaluationHistoryPageProps> = ({
  onStartNewEvaluation,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-1 border-b border-cream-border/60">
        <h2 className="text-base font-bold text-charcoal-900 tracking-tight">
          Audit & Evaluation Records
        </h2>
        <p className="text-[11px] text-charcoal-muted">
          Historical institutional verification archives and persisted compliance audits
        </p>
      </div>

      {/* Clean Empty State */}
      <div className="bg-white rounded-panel border border-cream-border p-10 text-center shadow-panel space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-cream-100 border border-cream-border mx-auto flex items-center justify-center shadow-soft">
          <History className="w-6 h-6 text-charcoal-700" />
        </div>

        <div className="space-y-1.5 max-w-sm mx-auto">
          <h3 className="text-sm font-bold text-charcoal-900">
            No Historical Evaluations Stored
          </h3>
          <p className="text-[11px] text-charcoal-muted leading-relaxed">
            Saved institutional evaluations, document extraction diffs, and compliance verdict certificates will appear here once the backend persistence layer (SQLite) is connected in later stages.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={onStartNewEvaluation}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-charcoal-900 text-white text-xs font-bold hover:bg-charcoal-800 transition-all shadow-soft"
          >
            <FilePlus2 className="w-3.5 h-3.5 text-gold-400" />
            <span>Start New Evaluation</span>
          </button>
        </div>
      </div>

      {/* Stage Roadmap Note */}
      <div className="bg-white rounded-card border border-cream-border p-4 shadow-panel flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-gold-400/20 text-gold-600 flex items-center justify-center shrink-0 border border-gold-400/30">
          <Database className="w-4 h-4" />
        </div>
        <div className="text-xs space-y-1">
          <div className="font-bold text-charcoal-900">Stage Roadmap: SQLite Scrutiny Database</div>
          <p className="text-[11px] text-charcoal-muted leading-relaxed">
            The upcoming persistence schema will store institutional metadata, SHA-256 document hash digests, parsed faculty records, and evaluator sign-off certificates with full regulatory traceability.
          </p>
        </div>
      </div>
    </div>
  );
};
