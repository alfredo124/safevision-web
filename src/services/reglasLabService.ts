import { authService } from './authService';

import { API_BASE } from './apiConfig';

const API_URL = `${API_BASE}/modules/reglas_lab`;

export type LaboratoryType = 'QUIMICA' | 'FISICA';
export type Severity = 'CRÍTICO' | 'ALTO' | 'MEDIO';
export type IncidentStatus = 'PENDIENTE' | 'EN_REVISION' | 'CONFIRMADA' | 'DESCARTADA' | 'ATENDIDO';
export type ManualStatus = 'PENDIENTE' | 'EN_REVISION' | 'ATENDIDO';
export type ReviewAction = 'CORREGIDO' | 'RETIRADO_DE_PRACTICA';

export interface CameraSummary {
  id: number;
  name: string;
  laboratory_type: LaboratoryType;
  status: string;
}

export interface SafetyEquipment {
  id: string;
  name: string;
  slot: string;
  icon: string;
  missing_code: string;
  missing_description: string;
  impact: Severity;
  model_class: string | null;
  is_active: boolean;
}

export interface Workshop {
  id: number;
  name: string;
  laboratory_type: LaboratoryType;
  description: string | null;
  campus_id?: number | null;
  campus_name?: string | null;
  cameras: CameraSummary[];
  required_equipment_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface RulesConfiguration {
  workshops: Workshop[];
  catalog: SafetyEquipment[];
  available_cameras: CameraSummary[];
}

export interface IncidentFault {
  id: number | null;
  equipment_id: string | null;
  equipment_name: string | null;
  rule_code: string | null;
  severity: Severity;
  has_capture: boolean;
  detected_at: string;
  /** BATA_ABIERTA: el EPP está, pero mal puesto (falta leve). */
  detail?: string | null;
}

export interface Incident {
  id: number;
  code: string;
  workshop_id: number;
  workshop_name: string;
  camera_id: number;
  camera_name: string;
  equipment_id: string | null;
  equipment_name: string | null;
  title: string;
  description: string;
  severity: Severity;
  status: IncidentStatus;
  detected_class: string | null;
  confidence: number | null;
  bounding_box: [number, number, number, number] | null;
  frame_width: number | null;
  frame_height: number | null;
  occurred_at: string;
  rule_code: string | null;
  has_capture: boolean;
  created_by_system: boolean;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_reason: string | null;
  action_taken: ReviewAction | null;
  faults: IncidentFault[];
  pending_seconds: number | null;
  /** Pendiente más tiempo del permitido: se avisa al administrador. */
  escalated: boolean;
  /** Práctica en la que ocurrió; null en incidencias anteriores a las sesiones o fuera de una práctica. */
  session_id?: number | null;
  session_code?: string | null;
}

/** Una práctica guardada: desde "Iniciar práctica" hasta "Finalizar práctica". */
export interface PracticeSession {
  id: number;
  code: string;
  workshop_id: number;
  workshop_name: string;
  campus_name: string | null;
  laboratory_type: LaboratoryType | null;
  started_at: string;
  ended_at: string | null;
  active: boolean;
  /** FINALIZADA: la cerró un usuario. INTERRUMPIDA: el servidor se apagó con la práctica en curso. */
  end_reason: 'FINALIZADA' | 'INTERRUMPIDA' | null;
  duration_seconds: number;
  started_by_name: string | null;
  ended_by_name: string | null;
  alerts: number;
  confirmed: number;
  discarded: number;
  pending: number;
}

export interface CameraMonitoringStatus {
  camera_id: number;
  running: boolean;
  workshop_id?: number | null;
  error?: string | null;
  analyses?: number;
  events?: number;
  viewers?: number;
  started_at?: number;
  started?: boolean;
  stopped?: boolean;
  detail?: string;
}

export interface MonitoringResponse {
  workshop_id: number;
  /** La práctica está en curso (aunque todavía no tenga cámaras analizándose). */
  active?: boolean;
  cameras: CameraMonitoringStatus[];
  /** Sesión abierta del laboratorio (al iniciar, la creada; al finalizar, la cerrada). */
  session?: PracticeSession | null;
}

export interface IncidentDraft {
  workshop_id: number;
  camera_id: number;
  equipment_id?: string | null;
  title: string;
  description: string;
  severity: Severity;
  detected_class?: string | null;
  confidence?: number | null;
  bounding_box?: [number, number, number, number] | null;
  frame_width?: number | null;
  frame_height?: number | null;
  occurred_at?: string;
}

/** Reporte SST de un periodo (GET /report), calculado con las incidencias guardadas. */
export interface ReportCounts {
  alerts: number;
  confirmed: number;
  discarded: number;
  pending: number;
}

export interface ReportSummary extends ReportCounts {
  faults: number;
  /** Faltas leves: el EPP está, pero mal puesto (bata abierta, lentes fuera de los ojos). */
  minor_faults: number;
  faults_by_severity: Record<Severity, number>;
  /** Confirmadas / (confirmadas + descartadas); null si no se revisó ninguna. */
  precision: number | null;
  avg_response_seconds: number | null;
  actions: Record<ReviewAction, number>;
  sessions: number;
  /** Tiempo de práctica supervisada dentro del periodo. */
  supervised_seconds: number;
  /** Alertas registradas fuera de una sesión (datos anteriores o incidencias manuales). */
  alerts_outside_sessions: number;
}

export interface ReportSession {
  id: number;
  code: string;
  workshop_id: number;
  workshop_name: string;
  started_at: string;
  ended_at: string | null;
  end_reason: PracticeSession['end_reason'];
  supervised_seconds: number;
  alerts: number;
}

export interface ReportWorkshop extends ReportCounts {
  workshop_id: number;
  name: string;
  laboratory_type: LaboratoryType;
  campus_name: string | null;
  required_equipment: string[];
  faults: number;
  avg_response_seconds: number | null;
  sessions: number;
  supervised_seconds: number;
}

export interface ReportEquipment {
  equipment_id: string;
  name: string;
  faults: number;
  confirmed_faults: number;
}

export interface ReportIncident {
  id: number;
  code: string;
  occurred_at: string;
  workshop_id: number;
  workshop_name: string;
  camera_name: string;
  severity: Severity;
  status: IncidentStatus;
  action_taken: ReviewAction | null;
  reviewed_by_name: string | null;
  response_seconds: number | null;
  session_id: number | null;
  session_code: string | null;
  faults: { equipment_name: string | null; rule_code: string | null; severity: Severity; detail: string | null }[];
}

export interface IncidentReport {
  report_id: string;
  generated_at: string;
  generated_by: string;
  fingerprint: string;
  start: string;
  end: string;
  filters: { workshop_id: number | null; workshop_name: string | null; campus_id: number | null; campus_name: string | null };
  summary: ReportSummary;
  workshops: ReportWorkshop[];
  equipment: ReportEquipment[];
  sessions: ReportSession[];
  incidents: ReportIncident[];
  incidents_truncated: boolean;
}

function authHeaders(): HeadersInit {
  const token = authService.getCurrentUser()?.token;
  if (!token) throw new Error('Inicia sesión para usar la configuración del laboratorio.');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init.headers },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || `Error de API (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const reglasLabService = {
  getConfiguration: () => request<RulesConfiguration>('/configuration'),
  createWorkshop: (payload: { name: string; laboratory_type: LaboratoryType; description?: string; campus_id?: number | null }) =>
    request<Workshop>('/workshops', { method: 'POST', body: JSON.stringify(payload) }),
  saveWorkshopConfiguration: (workshopId: number, payload: { camera_ids: number[]; required_equipment_ids: string[] }) =>
    request<Workshop>(`/workshops/${workshopId}/configuration`, { method: 'PUT', body: JSON.stringify(payload) }),
  createEquipment: (payload: Omit<SafetyEquipment, 'is_active'>) =>
    request<SafetyEquipment>('/equipment', { method: 'POST', body: JSON.stringify(payload) }),
  getSessions: (filters: { workshop_id?: number; start?: string; end?: string } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    });
    return request<PracticeSession[]>(`/sessions${params.size ? `?${params}` : ''}`);
  },
  getIncidents: (filters: { workshop_id?: number; camera_id?: number; session_id?: number; active_session?: boolean; date_from?: string; date_to?: string; status?: IncidentStatus } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    });
    return request<Incident[]>(`/incidents${params.size ? `?${params}` : ''}`);
  },
  /** `start` y `end` con zona horaria (inicio del primer día y fin del último, en hora local). */
  getReport: (filters: { start: string; end: string; workshop_id?: number; campus_id?: number }) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    });
    return request<IncidentReport>(`/report?${params}`);
  },
  createIncident: (payload: IncidentDraft) =>
    request<Incident>('/incidents', { method: 'POST', body: JSON.stringify(payload) }),
  /** Confirmar (con la acción tomada) o descartar una alerta. El revisor sale de la sesión. */
  reviewIncident: (incidentId: number, payload: { decision: 'CONFIRMADA'; action: ReviewAction } | { decision: 'DESCARTADA'; reason?: string }) =>
    request<Incident>(`/incidents/${incidentId}/review`, { method: 'POST', body: JSON.stringify(payload) }),
  updateIncidentStatus: (incidentId: number, status: ManualStatus) =>
    request<Incident>(`/incidents/${incidentId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getMonitoring: (workshopId: number) => request<MonitoringResponse>(`/workshops/${workshopId}/monitoring`),
  startMonitoring: (workshopId: number) =>
    request<MonitoringResponse>(`/workshops/${workshopId}/monitoring/start`, { method: 'POST' }),
  stopMonitoring: (workshopId: number) =>
    request<MonitoringResponse>(`/workshops/${workshopId}/monitoring/stop`, { method: 'POST' }),
  /** Descarga la captura con el token en la cabecera (no en la URL) y devuelve una URL local. */
  getIncidentCaptureUrl: async (incidentId: number, faultId?: number | null): Promise<string> => {
    const path = faultId ? `/incidents/${incidentId}/faults/${faultId}/capture` : `/incidents/${incidentId}/capture`;
    const response = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
    if (!response.ok) throw new Error(`No se pudo cargar la captura (${response.status}).`);
    return URL.createObjectURL(await response.blob());
  },
};
