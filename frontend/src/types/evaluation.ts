export type NavPage = 'overview' | 'new-evaluation' | 'history' | 'settings';

export type InstitutionType =
  | 'Engineering & Technology'
  | 'Management Studies'
  | 'Pharmacy'
  | 'Architecture & Planning'
  | 'Polytechnic & Diploma'
  | 'Applied Arts & Crafts'
  | 'Other';

export interface DeclaredInstitutionData {
  institutionName: string;
  applicationId: string;
  institutionType: InstitutionType;
  location: string;
  academicYear: string;
  submissionDate: string;
  facultyCount: number | '';
  studentCount: number | '';
  landAreaAcres: number | '';
  builtUpAreaSqM: number | '';
  fireSafetyCertNumber: string;
  fireSafetyExpiryDate: string;
}

export type DocumentCategoryKey =
  | 'institutionalApplication'
  | 'facultyRegister'
  | 'landInfrastructureReport'
  | 'fireSafetyCertificate';

export interface SelectedDocument {
  file: File;
  name: string;
  size: number;
  lastModified: number;
}

export interface UploadedDocuments {
  institutionalApplication: SelectedDocument | null;
  facultyRegister: SelectedDocument | null;
  landInfrastructureReport: SelectedDocument | null;
  fireSafetyCertificate: SelectedDocument | null;
}

export interface BackendHealthResponse {
  status: string;
  application: string;
  version: string;
}

export type BackendConnectionStatus = 'checking' | 'online' | 'offline';

export interface SourceEvidence {
  filename: string;
  page: number;
  matched_text: string;
  bbox: [number, number, number, number] | null;
}

export interface ExtractedField {
  field_key: string;
  label: string;
  original_value: string;
  normalized_value?: string | number | null;
  unit?: string | null;
  source?: SourceEvidence | null;
  extraction_method?: string;
  confidence_note?: string | null;
}

export interface FacultyRecord {
  s_no?: number | null;
  faculty_id: string;
  name: string;
  department?: string | null;
  designation?: string | null;
  status?: string | null;
  joining_date?: string | null;
  page: number;
  bbox?: [number, number, number, number] | null;
}

export interface DocumentMetadata {
  page_count: number;
  title?: string | null;
  author?: string | null;
  creator?: string | null;
  producer?: string | null;
  creation_date?: string | null;
  has_text: boolean;
  file_size_bytes: number;
}

export interface DocumentExtractionResult {
  filename: string;
  document_type: string;
  page_count: number;
  has_text: boolean;
  status: string;
  warnings: string[];
  metadata: DocumentMetadata;
  fields: ExtractedField[];
  faculty_records?: FacultyRecord[] | null;
  raw_text_summary?: string | null;
}

export interface BatchExtractionResponse {
  total_documents: number;
  successful_extractions: number;
  failed_extractions: number;
  documents: DocumentExtractionResult[];
}

export type FindingReviewStatus =
  | 'needs_manual_review'
  | 'discrepancy_found'
  | 'no_discrepancy_detected'
  | 'insufficient_evidence'
  | 'rule_violation';

export type FindingCategory =
  | 'cross_document_mismatch'
  | 'expired_certificate'
  | 'missing_document'
  | 'missing_value'
  | 'ambiguous_extraction'
  | 'rule_violation';

export type FindingSeverity = 'high' | 'medium' | 'low' | 'info';

export interface AuditEvidenceReference {
  source_file: string;
  document_category: string;
  page_number?: number | null;
  matched_text: string;
  bounding_box?: [number, number, number, number] | null;
  field_key?: string | null;
}

export interface AuditFinding {
  finding_id: string;
  rule_id: string;
  category: FindingCategory;
  title: string;
  description: string;
  severity: FindingSeverity;
  review_status: FindingReviewStatus;
  declared_value?: any;
  source_value?: any;
  normalized_declared_value?: any;
  normalized_source_value?: any;
  unit?: string | null;
  extraction_quality_score?: number | null;
  review_required: boolean;
  source_evidence: AuditEvidenceReference[];
  explanation: string;
  evaluator_decision?: 'approved' | 'rejected' | 'escalated' | null;
  evaluator_notes?: string | null;
  decided_at?: string | null;
}

export interface AuditSummary {
  total_rules_evaluated: number;
  matched_count: number;
  discrepancy_count: number;
  needs_manual_review_count: number;
  insufficient_evidence_count: number;
  rule_violation_count: number;
}

export interface EvaluationAuditResponse {
  evaluation_id: string;
  evaluation_date: string;
  institution_name: string;
  application_id: string;
  processing_status: 'completed' | 'partial' | 'failed';
  is_partial: boolean;
  document_extractions: DocumentExtractionResult[];
  findings: AuditFinding[];
  summary: AuditSummary;
  warnings: string[];
  processing_errors: string[];
}


