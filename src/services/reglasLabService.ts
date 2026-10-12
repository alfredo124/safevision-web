import { authService } from './authService';

const API_URL = 'http://localhost:8000/modules/reglas_lab';

export type LaboratoryType = 'QUIMICA' | 'FISICA';
export type Severity = 'CRÍTICO' | 'ALTO' | 'MEDIO';
export type IncidentStatus = 'PENDIENTE' | 'EN_REVISION' | 'ATENDIDO';

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
  createWorkshop: (payload: { name: string; laboratory_type: LaboratoryType; description?: string }) =>
    request<Workshop>('/workshops', { method: 'POST', body: JSON.stringify(payload) }),
  saveWorkshopConfiguration: (workshopId: number, payload: { camera_ids: number[]; required_equipment_ids: string[] }) =>
    request<Workshop>(`/workshops/${workshopId}/configuration`, { method: 'PUT', body: JSON.stringify(payload) }),
  createEquipment: (payload: Omit<SafetyEquipment, 'is_active'>) =>
    request<SafetyEquipment>('/equipment', { method: 'POST', body: JSON.stringify(payload) }),
  getIncidents: (filters: { workshop_id?: number; camera_id?: number; date_from?: string; date_to?: string; status?: IncidentStatus } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    });
    return request<Incident[]>(`/incidents${params.size ? `?${params}` : ''}`);
  },
  createIncident: (payload: IncidentDraft) =>
    request<Incident>('/incidents', { method: 'POST', body: JSON.stringify(payload) }),
  updateIncidentStatus: (incidentId: number, status: IncidentStatus) =>
    request<Incident>(`/incidents/${incidentId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};
