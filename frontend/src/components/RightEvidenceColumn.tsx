import React from 'react';
import { Trash2 } from 'lucide-react';
import {
  DeclaredInstitutionData,
  UploadedDocuments,
  DocumentCategoryKey,
} from '../types/evaluation';

interface RightEvidenceColumnProps {
  formData: DeclaredInstitutionData;
  uploadedDocs: UploadedDocuments;
  onRemoveDoc: (category: DocumentCategoryKey) => void;
}

export const RightEvidenceColumn: React.FC<RightEvidenceColumnProps> = ({
  formData,
  uploadedDocs,
  onRemoveDoc,
}) => {
  // Compute ratio if both present
  const faculty = Number(formData.facultyCount);
  const students = Number(formData.studentCount);
  const sfrRatio = faculty > 0 && students > 0 ? (students / faculty).toFixed(1) : null;

  const docSlots: Array<{
    key: DocumentCategoryKey;
    label: string;
    demoName: string;
    badgeBg: string;
    badgeText: string;
    iconColor: string;
  }> = [
    {
      key: 'institutionalApplication',
      label: 'Institutional Application',
      demoName: '01_institution_application.pdf',
      badgeBg: 'bg-blue-50 border-blue-200 text-blue-700',
      badgeText: 'DOC 01',
      iconColor: 'text-blue-600',
    },
    {
      key: 'facultyRegister',
      label: 'Faculty Register',
      demoName: '02_faculty_register.pdf',
      badgeBg: 'bg-rose-50 border-rose-200 text-rose-700',
      badgeText: 'DOC 02',
      iconColor: 'text-rose-600',
    },
    {
      key: 'landInfrastructureReport',
      label: 'Land & Infra Report',
      demoName: '03_land_infastructure_report.pdf',
      badgeBg: 'bg-amber-50 border-amber-200 text-amber-700',
      badgeText: 'DOC 03',
      iconColor: 'text-amber-600',
    },
    {
      key: 'fireSafetyCertificate',
      label: 'Fire Safety Certificate',
      demoName: '04_fire_safety_certificate.pdf',
      badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      badgeText: 'DOC 04',
      iconColor: 'text-emerald-600',
    },
  ];

  return (
    <div className="w-full lg:w-80 shrink-0 space-y-4">
      <div className="bg-white rounded-panel border border-cream-border p-5 shadow-panel space-y-5">
        {/* Top Artistic Header with golden swirls banner and centered seal */}
        <div className="relative rounded-2xl overflow-hidden -mx-1 -mt-1 pt-12 pb-5 px-4 text-center bg-gradient-to-br from-charcoal-900 via-charcoal-850 to-charcoal-900">
          {/* Golden swirling light effects using SVG */}
          <div className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none">
            <svg
              className="w-full h-full"
              viewBox="0 0 300 120"
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                d="M-20,60 C50,10 120,110 180,40 C240,-30 310,80 340,50"
                stroke="#F5C842"
                strokeWidth="18"
                strokeOpacity="0.4"
                strokeLinecap="round"
              />
              <path
                d="M-40,80 C40,120 140,-10 220,70 C270,120 320,20 350,90"
                stroke="#EAB326"
                strokeWidth="10"
                strokeOpacity="0.5"
                strokeLinecap="round"
              />
              <path
                d="M20,10 C90,80 180,20 280,100"
                stroke="#FFFBEB"
                strokeWidth="4"
                strokeOpacity="0.7"
              />
            </svg>
          </div>

          {/* Centered Seal Avatar with Golden Ring */}
          <div className="relative inline-block mx-auto mb-2.5">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-charcoal-900 to-charcoal-800 p-1 ring-4 ring-gold-400 shadow-glow-gold flex items-center justify-center">
              <span className="text-xl font-bold text-gold-400 tracking-wider">
                {formData.institutionName ? formData.institutionName.slice(0, 2).toUpperCase() : 'AI'}
              </span>
            </div>
          </div>

          <h3 className="text-sm font-bold text-white tracking-tight truncate px-2">
            {formData.institutionName || 'Apex Institute of Tech'}
          </h3>
          <p className="text-[11px] text-gold-300 font-medium mt-0.5">
            {formData.institutionType || 'Engineering & Technology'}
          </p>
        </div>

        {/* Basic Information / Declared Parameters with dotted leaders */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between pb-1 border-b border-cream-border/60">
            <span className="text-xs font-semibold text-charcoal-900">
              Basic Information
            </span>
            <span className="text-[10px] text-charcoal-muted uppercase tracking-wider font-mono">
              AICTE Desk
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Dotted leader item */}
            <div className="flex items-baseline justify-between text-charcoal-700">
              <span className="text-charcoal-muted shrink-0 text-[11px]">Application ID</span>
              <span className="mx-2 flex-1 border-b border-dotted border-charcoal-300/40 min-w-[20px]"></span>
              <span className="font-mono text-[11px] font-semibold text-charcoal-900 truncate max-w-[130px]">
                {formData.applicationId || 'AICTE-2024-9982'}
              </span>
            </div>

            <div className="flex items-baseline justify-between text-charcoal-700">
              <span className="text-charcoal-muted shrink-0 text-[11px]">Location</span>
              <span className="mx-2 flex-1 border-b border-dotted border-charcoal-300/40 min-w-[20px]"></span>
              <span className="text-[11px] font-medium text-charcoal-900 truncate max-w-[130px]">
                {formData.location || 'Pune, Maharashtra'}
              </span>
            </div>

            <div className="flex items-baseline justify-between text-charcoal-700">
              <span className="text-charcoal-muted shrink-0 text-[11px]">Academic Year</span>
              <span className="mx-2 flex-1 border-b border-dotted border-charcoal-300/40 min-w-[20px]"></span>
              <span className="font-mono text-[11px] font-medium text-charcoal-900">
                {formData.academicYear || '2024-25'}
              </span>
            </div>

            <div className="flex items-baseline justify-between text-charcoal-700">
              <span className="text-charcoal-muted shrink-0 text-[11px]">Land Area</span>
              <span className="mx-2 flex-1 border-b border-dotted border-charcoal-300/40 min-w-[20px]"></span>
              <span className="text-[11px] font-semibold text-charcoal-900">
                {formData.landAreaAcres ? `${formData.landAreaAcres} Acres` : '7.50 Acres'}
              </span>
            </div>

            <div className="flex items-baseline justify-between text-charcoal-700">
              <span className="text-charcoal-muted shrink-0 text-[11px]">Built-up Area</span>
              <span className="mx-2 flex-1 border-b border-dotted border-charcoal-300/40 min-w-[20px]"></span>
              <span className="text-[11px] font-semibold text-charcoal-900">
                {formData.builtUpAreaSqM ? `${formData.builtUpAreaSqM} sq.m` : '22,500 sq.m'}
              </span>
            </div>

            <div className="flex items-baseline justify-between text-charcoal-700">
              <span className="text-charcoal-muted shrink-0 text-[11px]">Fire NOC Expiry</span>
              <span className="mx-2 flex-1 border-b border-dotted border-charcoal-300/40 min-w-[20px]"></span>
              <span className="text-[11px] font-mono text-charcoal-900">
                {formData.fireSafetyExpiryDate || '2025-06-30'}
              </span>
            </div>
          </div>
        </div>

        {/* Documents Section (Styled exactly like Contract / Resume pills in image) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between pb-1 border-b border-cream-border/60">
            <span className="text-xs font-semibold text-charcoal-900">Documents</span>
            <span className="text-[10px] text-charcoal-muted">
              {Object.values(uploadedDocs).filter(Boolean).length}/4 Staged
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {docSlots.map((slot) => {
              const fileObj = uploadedDocs[slot.key];
              return (
                <div
                  key={slot.key}
                  className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                    fileObj
                      ? 'bg-cream-50 border-gold-400/50 shadow-soft'
                      : 'bg-white border-cream-border hover:border-gold-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${slot.badgeBg}`}>
                      {slot.badgeText}
                    </span>
                    {fileObj && (
                      <button
                        onClick={() => onRemoveDoc(slot.key)}
                        title="Remove document"
                        className="text-charcoal-muted hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] font-semibold text-charcoal-900 truncate leading-snug">
                    {fileObj ? fileObj.name : slot.label}
                  </p>

                  <div className="flex items-center justify-between mt-1 text-[10px] text-charcoal-muted font-mono">
                    <span>
                      {fileObj
                        ? `${(fileObj.size / 1024).toFixed(0)} KB`
                        : 'Required'}
                    </span>
                    {fileObj ? (
                      <span className="text-status-successText font-semibold">✓</span>
                    ) : (
                      <span className="text-gold-500">Demo</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Statistics Section (Matching bottom right bars in image) */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between pb-1 border-b border-cream-border/60">
            <span className="text-xs font-semibold text-charcoal-900">
              Statutory Ratios
            </span>
            <span className="text-[10px] text-gold-600 font-semibold">Norm Active</span>
          </div>

          {/* Stat 1: SFR */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-charcoal-muted">Student-Faculty Ratio (SFR)</span>
              <span className="font-mono font-semibold text-charcoal-900">
                {sfrRatio ? `1 : ${sfrRatio}` : '1 : 15.0'}
              </span>
            </div>
            <div className="h-1.5 w-full bg-cream-200 rounded-full overflow-hidden">
              <div className="h-full bg-gold-400 rounded-full" style={{ width: '80%' }} />
            </div>
          </div>

          {/* Stat 2: Land Norm */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-charcoal-muted">Minimum Land Norm</span>
              <span className="font-mono font-semibold text-charcoal-900">
                {formData.landAreaAcres ? `${formData.landAreaAcres} / 5.0 Ac` : '7.5 / 5.0 Ac'}
              </span>
            </div>
            <div className="h-1.5 w-full bg-cream-200 rounded-full overflow-hidden">
              <div className="h-full bg-charcoal-900 rounded-full" style={{ width: '92%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
