import {
  BackendHealthResponse,
  DocumentExtractionResult,
  BatchExtractionResponse,
  DeclaredInstitutionData,
  EvaluationAuditResponse,
} from '../types/evaluation';

// Determine API base URL - works seamlessly with Vite proxy or direct backend URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface HealthCheckResult {
  ok: boolean;
  data?: BackendHealthResponse;
  error?: string;
  latencyMs?: number;
}

/**
 * Checks the real health endpoint of the backend API.
 * Calls GET /api/health with a timeout to detect offline status quickly.
 */
export async function checkBackendHealth(): Promise<HealthCheckResult> {
  const startTime = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      return {
        ok: false,
        error: `Server responded with status ${response.status}`,
        latencyMs,
      };
    }

    const data: BackendHealthResponse = await response.json();
    return {
      ok: true,
      data,
      latencyMs,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);
    const errorMessage =
      err instanceof Error
        ? err.name === 'AbortError'
          ? 'Request timed out'
          : err.message
        : 'Network request failed';

    return {
      ok: false,
      error: errorMessage,
      latencyMs,
    };
  }
}

/**
 * Uploads a single PDF file to the real backend extraction endpoint:
 * POST /api/documents/extract
 */
export async function extractDocument(file: File): Promise<DocumentExtractionResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/documents/extract`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = `Extraction failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = errJson.detail;
      }
    } catch {
      // Keep default
    }
    throw new Error(errorDetail);
  }

  return await response.json();
}

/**
 * Uploads multiple PDF files to the batch extraction endpoint:
 * POST /api/documents/extract-batch
 */
export async function extractBatchDocuments(files: File[]): Promise<BatchExtractionResponse> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }

  const response = await fetch(`${API_BASE_URL}/documents/extract-batch`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = `Batch extraction failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = errJson.detail;
      }
    } catch {
      // Keep default
    }
    throw new Error(errorDetail);
  }

  return await response.json();
}

/**
 * Loads a demo PDF file from demo_data through the backend helper,
 * returning a real browser File object ready for upload.
 */
export async function fetchDemoFile(filename: string): Promise<File> {
  const response = await fetch(`${API_BASE_URL}/documents/demo-file/${encodeURIComponent(filename)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch demo file ${filename} (${response.status})`);
  }
  const blob = await response.blob();
  return new File([blob], filename, { type: 'application/pdf', lastModified: Date.now() });
}

/**
 * Runs end-to-end extraction and deterministic compliance audit:
 * POST /api/evaluations/audit
 */
export async function runComplianceAudit(
  declaredData: DeclaredInstitutionData,
  files: File[],
  evaluationDate?: string
): Promise<EvaluationAuditResponse> {
  const formPayload = new FormData();

  // Convert DeclaredInstitutionData to backend snake_case format
  const snakeData = {
    institution_name: declaredData.institutionName,
    application_id: declaredData.applicationId,
    institution_type: declaredData.institutionType,
    location: declaredData.location,
    academic_year: declaredData.academicYear,
    submission_date: declaredData.submissionDate,
    faculty_count: declaredData.facultyCount !== '' ? Number(declaredData.facultyCount) : null,
    student_count: declaredData.studentCount !== '' ? Number(declaredData.studentCount) : null,
    land_area_acres: declaredData.landAreaAcres !== '' ? Number(declaredData.landAreaAcres) : null,
    built_up_area_sq_m: declaredData.builtUpAreaSqM !== '' ? Number(declaredData.builtUpAreaSqM) : null,
    fire_safety_cert_number: declaredData.fireSafetyCertNumber,
    fire_safety_expiry_date: declaredData.fireSafetyExpiryDate,
  };

  formPayload.append('declared_data', JSON.stringify(snakeData));

  for (const file of files) {
    formPayload.append('files', file);
  }

  if (evaluationDate) {
    formPayload.append('evaluation_date', evaluationDate);
  }

  const response = await fetch(`${API_BASE_URL}/evaluations/audit`, {
    method: 'POST',
    body: formPayload,
  });

  if (!response.ok) {
    let errorDetail = `Audit evaluation failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = errJson.detail;
      }
    } catch {
      // Keep default
    }
    throw new Error(errorDetail);
  }

  return await response.json();
}



