import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DossierItem {
  id: string;
  name: string;
  category: string;
  applicationId: string;
  avatarBg: string;
  avatarText: string;
  goldPct: number;
  darkPct: number;
  greyPct: number;
  isActive?: boolean;
}

interface LeftDossierColumnProps {
  activeInstitutionName: string;
  onSelectDossier?: (dossier: DossierItem) => void;
}

const DOSSIERS: DossierItem[] = [
  {
    id: '1',
    name: 'Apex Institute of Tech & Mgmt',
    category: 'Engineering & Tech (UG/PG)',
    applicationId: 'AICTE-WR-2024-998241',
    avatarBg: 'bg-gold-400 text-charcoal-900',
    avatarText: 'AI',
    goldPct: 65,
    darkPct: 25,
    greyPct: 10,
    isActive: true,
  },
  {
    id: '2',
    name: 'Govt Polytechnic Pune',
    category: 'Diploma & Polytechnic',
    applicationId: 'AICTE-WR-2024-554102',
    avatarBg: 'bg-charcoal-900 text-gold-400',
    avatarText: 'GP',
    goldPct: 40,
    darkPct: 35,
    greyPct: 25,
  },
  {
    id: '3',
    name: 'Maharashtra College of Arch',
    category: 'Architecture & Planning',
    applicationId: 'AICTE-WR-2024-220194',
    avatarBg: 'bg-cream-300 text-charcoal-800',
    avatarText: 'MA',
    goldPct: 75,
    darkPct: 15,
    greyPct: 10,
  },
  {
    id: '4',
    name: 'Shivaji School of Pharmacy',
    category: 'Pharmacy (B.Pharm/M.Pharm)',
    applicationId: 'AICTE-WR-2024-773199',
    avatarBg: 'bg-gold-200 text-charcoal-900',
    avatarText: 'SP',
    goldPct: 30,
    darkPct: 50,
    greyPct: 20,
  },
  {
    id: '5',
    name: 'Sahyadri Institute of Mgmt',
    category: 'Management Studies (MBA)',
    applicationId: 'AICTE-WR-2024-118493',
    avatarBg: 'bg-charcoal-800 text-white',
    avatarText: 'SI',
    goldPct: 50,
    darkPct: 20,
    greyPct: 30,
  },
];

export const LeftDossierColumn: React.FC<LeftDossierColumnProps> = ({
  activeInstitutionName,
  onSelectDossier,
}) => {
  return (
    <div className="w-full lg:w-72 shrink-0 space-y-3 flex flex-col justify-between">
      {/* Dossier Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-charcoal-muted uppercase tracking-wider">
          Scrutiny Dossiers
        </span>
        <span className="text-[11px] font-medium text-charcoal-700 bg-cream-200 px-2 py-0.5 rounded-full border border-cream-border">
          {DOSSIERS.length} Active
        </span>
      </div>

      {/* List of Dossier Cards (Styled exactly as left column in reference image) */}
      <div className="space-y-2.5">
        {DOSSIERS.map((item) => {
          const isSelected =
            activeInstitutionName &&
            (activeInstitutionName.toLowerCase().includes('apex') && item.id === '1');

          return (
            <div
              key={item.id}
              onClick={() => onSelectDossier && onSelectDossier(item)}
              className={`rounded-card p-3.5 bg-white border transition-all cursor-pointer shadow-panel ${
                isSelected
                  ? 'border-gold-400 ring-2 ring-gold-400/20'
                  : 'border-cream-border hover:border-gold-300'
              }`}
            >
              {/* Card Header: Avatar + Name + Subtitle */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full ${item.avatarBg} flex items-center justify-center text-xs font-bold shrink-0 shadow-soft`}
                >
                  {item.avatarText}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-charcoal-900 truncate leading-snug">
                    {item.name}
                  </h4>
                  <p className="text-[10px] text-charcoal-muted truncate">
                    {item.category}
                  </p>
                </div>
              </div>

              {/* Segmented Progress Bar (Matching reference image: Gold, Dark, Grey segments) */}
              <div className="mt-3.5 pt-2 border-t border-cream-border/60">
                <div className="flex items-center justify-between text-[10px] text-charcoal-muted mb-1.5 font-mono">
                  <span>{item.applicationId.slice(-6)}</span>
                  <span>{item.goldPct}% Verified</span>
                </div>
                <div className="h-1.5 w-full bg-cream-200 rounded-full overflow-hidden flex">
                  {/* Gold segment */}
                  <div
                    style={{ width: `${item.goldPct}%` }}
                    className="h-full bg-gold-400 rounded-l-full"
                  />
                  {/* Dark charcoal segment */}
                  <div
                    style={{ width: `${item.darkPct}%` }}
                    className="h-full bg-charcoal-900"
                  />
                  {/* Soft grey segment */}
                  <div
                    style={{ width: `${item.greyPct}%` }}
                    className="h-full bg-slate-200"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Bar (Matching the bottom circular pill in reference image) */}
      <div className="pt-2 flex items-center justify-center gap-1.5 select-none">
        <button
          className="w-7 h-7 rounded-full bg-white border border-cream-border text-charcoal-700 flex items-center justify-center hover:bg-cream-100 transition-colors shadow-soft text-xs"
          title="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button className="w-7 h-7 rounded-full bg-charcoal-900 text-white font-medium text-xs flex items-center justify-center shadow-soft">
          1
        </button>
        <button className="w-7 h-7 rounded-full bg-white border border-cream-border text-charcoal-700 font-medium text-xs flex items-center justify-center hover:bg-cream-100 transition-colors shadow-soft">
          2
        </button>
        <span className="text-xs text-charcoal-light px-0.5">...</span>
        <button className="w-7 h-7 rounded-full bg-white border border-cream-border text-charcoal-700 font-medium text-xs flex items-center justify-center hover:bg-cream-100 transition-colors shadow-soft">
          5
        </button>
        <button
          className="w-7 h-7 rounded-full bg-white border border-cream-border text-charcoal-700 flex items-center justify-center hover:bg-cream-100 transition-colors shadow-soft text-xs"
          title="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
