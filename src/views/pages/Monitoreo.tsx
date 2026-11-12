import { useServerChanges } from '../../services/changeEvents';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, AlertTriangle, Maximize2, X, Camera, ChevronDown, ChevronUp, Smartphone, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useCollapsible } from '../../hooks/useCollapsible';
import { authService } from '../../services/authService';
import { reglasLabService } from '../../services/reglasLabService';
import { severityStyle } from '../../services/severity';
import { detalleFalta } from '../../services/etiquetas';
import { OverlayCanvas } from '../components/CameraOverlay';
import { EstadoCamara } from '../components/EstadoCamara';
import { SnapshotImage } from '../components/SnapshotImage';
import { useCameraOverlay, type EquipmentInfo, type OverlayMessage } from '../../hooks/useCameraOverlay';

import { API_BASE as API_URL } from '../../services/apiConfig';
const cameraFeedUrl = (cameraId: string, token: string, sync = true) =>
  `${API_URL}/modules/ai_vision/video_feed/${cameraId.replace('cam-', '')}?token=${encodeURIComponent(token)}&sync=${sync}`;

const SYNC_KEY = 'safevision_sync_video';
const readSyncPreference = () => {
  try {
    return localStorage.getItem(SYNC_KEY) !== 'false';
  } catch {
    return true;
  }
};

async function fetchAvailableCameras(token: string): Promise<AvailableCamera[]> {
  const response = await fetch(`${API_URL}/modules/ai_vision/cameras/available`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail || 'No se pudieron detectar las cámaras conectadas.');
  return result as AvailableCamera[];
}

// 1. Interfaces y Tipos
interface CameraData {
  id: string;
  nombre: string;
}

interface CameraApiResponse {
  id: number;
  name: string;
  laboratory_type: 'QUIMICA' | 'FISICA';
  stream_url: string;
}

interface AvailableCamera {
  device_index: number;
  name: string;
  stream_url: string;
  width: number;
  height: number;
}

const mapCamera = (camera: CameraApiResponse): CameraData => ({
  id: `cam-${camera.id}`,
  nombre: camera.name,
});

const numericId = (cameraId: string) => Number(cameraId.replace('cam-', ''));

// Falta confirmada: color según su gravedad (services/severity). Aún acumulando evidencia: azul.
const getSeverityStyles = (state: string, severity: string | null | undefined) => {
  if (state !== 'INCUMPLE') {
    return { container: 'bg-sky-950/30 border-sky-500', text: 'text-sky-300', badge: 'bg-sky-500/20 border-sky-500/30 text-sky-300' };
  }
  const style = severityStyle(severity);
  return { container: style.card, text: style.text, badge: style.badge };
};

function CameraCard({
  camera,
  equipment,
  sync,
  onDelete,
  onExpand,
  onOverlay,
}: {
  camera: CameraData;
  equipment: EquipmentInfo;
  sync: boolean;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onExpand: (id: string) => void;
  onOverlay: (id: string, message: OverlayMessage | null) => void;
}) {
  const token = authService.getCurrentUser()?.token;
  // Mensajes del motor (recuadros). El video llega limpio.
  const overlay = useCameraOverlay(numericId(camera.id), token, sync);
  useEffect(() => onOverlay(camera.id, overlay), [camera.id, overlay, onOverlay]);
  const videoRef = useRef<HTMLImageElement>(null);
  const people = overlay?.people ?? [];
  const status = !overlay?.monitoring
    ? 'Práctica no iniciada'
    : overlay.warming_up
      ? 'Sincronizando…'
      : `${people.length} persona(s) · ${people.filter(person => person.state === 'INCUMPLE').length} con falta`;

  return (
    <div
      onClick={() => onExpand(camera.id)}
      className="relative bg-black rounded border border-gray-800 overflow-hidden flex flex-col w-full min-h-[52vw] sm:min-h-0 short:sm:min-h-[170px] sm:h-full group cursor-pointer hover:border-emerald-500/50 transition-colors"
    >
      <div className="absolute top-2 left-2 right-20 md:right-auto z-10 bg-black/70 backdrop-blur-md text-xs px-2.5 py-1 rounded text-white font-semibold border border-gray-700 flex flex-wrap items-center gap-x-2">
        <span>{camera.nombre}</span>
        <span className="font-normal text-gray-300">{status}</span>
      </div>

      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onExpand(camera.id); }}
          className="bg-gray-800/80 hover:bg-gray-700 text-white p-1.5 md:p-1 rounded border border-gray-600"
          title="Ampliar pantalla"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => onDelete(camera.id, e)}
          className="bg-red-600/80 hover:bg-red-600 text-white p-1.5 md:p-1 rounded"
          title="Eliminar cámara"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Celular en vertical: la tarjeta lleva un alto mínimo (~16:9 del ancho). Por su overflow-hidden, la
          cuadrícula la encogía para que todas cupieran en pantalla y la miniatura quedaba en ~66 px. */}
      <div className="relative flex-1 bg-[#1a1a1a] flex items-center justify-center overflow-hidden sm:min-h-[220px] short:sm:min-h-[150px]">
        {/* Miniatura: imágenes sueltas seguidas (~6 por segundo), sin conexión de video permanente (Tarea 0B). */}
        <SnapshotImage
          ref={videoRef}
          cameraId={numericId(camera.id)}
          sync={sync}
          alt={camera.nombre}
          className="w-full h-full object-contain"
        />
        <OverlayCanvas message={overlay} equipment={equipment} />
        <EstadoCamara key={`estado-${sync}`} overlay={overlay} videoRef={videoRef} />
      </div>
    </div>
  );
}

export function MonitoreoPage() {
  const session = authService.getCurrentUser();
  const token = session?.token ?? '';
  const isAdministrator = session?.role === 'ADMINISTRADOR';
  const defaultLaboratory = session?.role === 'ENCARGADO_FISICA' ? 'FISICA' : 'QUIMICA';
  const [cameras, setCameras] = useState<CameraData[]>([]);
  const [isLoadingCameras, setIsLoadingCameras] = useState(true);
  const [isCameraFormOpen, setIsCameraFormOpen] = useState(false);
  const [isSubmittingCamera, setIsSubmittingCamera] = useState(false);
  const [cameraName, setCameraName] = useState('');
  const [laboratoryType, setLaboratoryType] = useState<'QUIMICA' | 'FISICA'>(defaultLaboratory);
  const [cameraUrl, setCameraUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [availableCameras, setAvailableCameras] = useState<AvailableCamera[]>([]);
  const [isDiscoveringCameras, setIsDiscoveringCameras] = useState(false);
  const [addingDeviceIndex, setAddingDeviceIndex] = useState<number | null>(null);
  const [isCreatingBrowserCamera, setIsCreatingBrowserCamera] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);  // celular en vertical: acordeón sobre las cámaras
  // Pantallas anchas (PC, celular en horizontal): panel lateral plegable a una franja.
  const [panelCollapsed, togglePanel] = useCollapsible('panel_monitoreo');
  const navigate = useNavigate();

  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const expandedVideoRef = useRef<HTMLImageElement>(null);
  const [overlays, setOverlays] = useState<Record<string, OverlayMessage | null>>({});
  const [equipment, setEquipment] = useState<EquipmentInfo>({});
  // Sincronizado: recuadros exactos, video con el retraso del análisis. En vivo: sin retraso, recuadros atrasados.
  const [syncVideo, setSyncVideo] = useState(readSyncPreference);
  const toggleSync = () => setSyncVideo(current => {
    try { localStorage.setItem(SYNC_KEY, String(!current)); } catch { /* sin almacenamiento local */ }
    return !current;
  });

  const handleOverlay = useCallback((id: string, message: OverlayMessage | null) => {
    setOverlays(current => (current[id] === message ? current : { ...current, [id]: message }));
  }, []);

  useEffect(() => {
    if (!token) return;
    reglasLabService.getConfiguration()
      .then(configuration => setEquipment(Object.fromEntries(
        configuration.catalog.map(item => [item.id, { icon: item.icon, name: item.name }]),
      )))
      .catch(() => { /* sin catálogo se muestran solo los códigos */ });
  }, [token]);

  // Otra pantalla (u otro equipo) agregó o quitó una cámara: se recarga la lista sin salir de la vista.
  useServerChanges(['cameras'], () => {
    if (!token) return;
    fetch(`${API_URL}/modules/ai_vision/cameras`, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => (response.ok ? response.json() as Promise<CameraApiResponse[]> : null))
      .then(data => {
        if (!data) return;
        setCameras(data.map(mapCamera));
        setSelectedCameraId(current => (current && data.some(camera => `cam-${camera.id}` === current) ? current : null));
      })
      .catch(() => { /* se reintenta con el siguiente aviso */ });
  });

  useEffect(() => {
    if (!token) {
      setIsLoadingCameras(false);
      setCameraError('Inicia sesión para consultar las cámaras.');
      return;
    }

    const loadCameras = async () => {
      try {
        const response = await fetch(`${API_URL}/modules/ai_vision/cameras`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('No se pudieron cargar las cámaras.');
        const data = await response.json() as CameraApiResponse[];
        setCameras(data.map(mapCamera));
        setCameraError('');
        // Ya no se buscan cámaras del servidor al cargar (lento y repetido por cada cliente):
        // solo con el botón "Detectar cámaras conectadas".
      } catch (error) {
        setCameraError(error instanceof Error ? error.message : 'Error al conectar con el backend.');
      } finally {
        setIsLoadingCameras(false);
      }
    };

    void loadCameras();
  }, [token]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedCameraId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmitCamera = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCameraError('');
    if (!cameraName.trim()) {
      setCameraError('Escribe un nombre para la cámara.');
      return;
    }
    if (Boolean(cameraUrl.trim()) === Boolean(videoFile)) {
      setCameraError('Indica una URL de cámara o selecciona un video.');
      return;
    }

    const formData = new FormData();
    formData.append('name', cameraName.trim());
    formData.append('laboratory_type', laboratoryType);
    if (videoFile) formData.append('video', videoFile);
    else formData.append('stream_url', cameraUrl.trim());

    setIsSubmittingCamera(true);
    try {
      const response = await fetch(`${API_URL}/modules/ai_vision/cameras/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'No se pudo registrar la cámara.');

      setCameras((current) => [...current, mapCamera(result as CameraApiResponse)]);
      setCameraName('');
      setCameraUrl('');
      setVideoFile(null);
      setIsCameraFormOpen(false);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : 'Error al conectar con el backend.');
    } finally {
      setIsSubmittingCamera(false);
    }
  };

  const discoverLocalCameras = async () => {
    setCameraError('');
    setIsDiscoveringCameras(true);
    try {
      setAvailableCameras(await fetchAvailableCameras(token));
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : 'Error al detectar cámaras conectadas.');
    } finally {
      setIsDiscoveringCameras(false);
    }
  };

  const addDetectedCamera = async (device: AvailableCamera) => {
    setCameraError('');
    setAddingDeviceIndex(device.device_index);
    try {
      const response = await fetch(`${API_URL}/modules/ai_vision/cameras`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: device.name,
          laboratory_type: defaultLaboratory,
          stream_url: device.stream_url,
          confidence_threshold: 0.25,
          processing_fps: 30,
          is_active: true,
          overlay_enabled: true,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'No se pudo registrar la cámara.');
      setCameras(current => [...current, mapCamera(result as CameraApiResponse)]);
      setAvailableCameras(current => current.filter(camera => camera.device_index !== device.device_index));
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : 'Error al agregar la cámara.');
    } finally {
      setAddingDeviceIndex(null);
    }
  };

  // Cámara de este dispositivo (celular o laptop): se registra y se abre la estación transmitiendo.
  const startDeviceCamera = async () => {
    setCameraError('');
    setIsCreatingBrowserCamera(true);
    try {
      const agent = navigator.userAgent;
      const kind = /iPhone|iPad/.test(agent) ? 'iPhone' : /Android/.test(agent) ? 'Celular Android' : 'Navegador';
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const response = await fetch(`${API_URL}/modules/ai_vision/cameras/browser`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${kind} ${time}`, laboratory_type: defaultLaboratory }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'No se pudo registrar la cámara.');
      navigate(`/estacion?camara=${result.id}&iniciar=1`);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : 'Error al registrar la cámara.');
      setIsCreatingBrowserCamera(false);
    }
  };

  const handleDeleteCamera = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (/^cam-\d+$/.test(id)) {
      try {
        const response = await fetch(`${API_URL}/modules/ai_vision/cameras/${id.replace('cam-', '')}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.detail || 'No se pudo eliminar la cámara.');
        }
      } catch (error) {
        setCameraError(error instanceof Error ? error.message : 'Error al eliminar la cámara.');
        return;
      }
    }

    setCameras(cameras.filter((cam) => cam.id !== id));
    if (selectedCameraId === id) setSelectedCameraId(null);
  };

  const selectedCamera = cameras.find((c) => c.id === selectedCameraId);
  const visiblePeople = cameras.flatMap((c) =>
    (overlays[c.id]?.people ?? []).map((person) => ({ ...person, camNombre: c.nombre, camId: c.id }))
  );
  // Detecciones del motor en este momento (no son incidencias validadas).
  const activeInfracciones = visiblePeople.filter((person) => person.state === 'INCUMPLE' || person.state === 'EN_RIESGO');
  const monitoredCameras = cameras.filter((c) => overlays[c.id]?.monitoring).length;
  const totalGraves = visiblePeople.filter((person) => person.state === 'INCUMPLE').length;
  const totalModeradas = visiblePeople.filter((person) => person.state === 'EN_RIESGO').length;
  const totalLeves = visiblePeople.filter((person) => person.state === 'CUMPLE').length;
  const equipmentLabel = (id: string, code: string | null) => `${equipment[id]?.icon ?? ''} ${equipment[id]?.name ?? id}${code ? ` (${code})` : ''}`;

  return (
    <div className="relative flex flex-1 flex-col md:flex-row h-full overflow-hidden">
      {/* Estadísticas. Celular en vertical: acordeón sobre las cámaras. Pantallas anchas: panel lateral plegable. */}
      <aside className={`w-full shrink-0 bg-[#16181e] border-b md:border-b-0 md:border-r border-gray-800 flex flex-col p-0 max-h-[45dvh] md:max-h-none overflow-y-auto ${panelCollapsed ? 'md:w-12 md:items-center md:py-2' : 'md:w-72 md:p-4 short:md:p-3'}`}>
        {panelCollapsed && (
          // Franja plegada: botón para abrir y resumen de faltas, sin quitar espacio a las cámaras.
          <div className="hidden md:flex flex-col items-center gap-3">
            <button onClick={togglePanel} title="Mostrar el panel" aria-label="Mostrar el panel" aria-expanded={false}
              className="rounded-md p-2 text-gray-400 hover:bg-gray-800/50 hover:text-white">
              <PanelLeftOpen className="h-4 w-4" />
            </button>
            <span title="Personas con falta" className={`rounded px-1.5 py-0.5 font-mono text-xs font-bold ${totalGraves ? 'bg-red-500/20 text-red-300' : 'text-gray-500'}`}>{totalGraves}</span>
            <span title="En práctica" className="font-mono text-[10px] text-emerald-400">{monitoredCameras}/{cameras.length}</span>
          </div>
        )}
        <button
          onClick={() => setStatsOpen(open => !open)}
          aria-expanded={statsOpen}
          className="flex md:hidden w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] text-gray-300"
        >
          <span>
            <strong className="text-white">{monitoredCameras}</strong> de {cameras.length} en práctica ·{' '}
            <strong className="text-white">{visiblePeople.length}</strong> persona(s) ·{' '}
            <strong className={totalGraves ? 'text-red-400' : 'text-white'}>{totalGraves}</strong> con falta
          </span>
          <span className="flex items-center gap-1 text-[10px] text-gray-400">
            {statsOpen ? 'Ocultar' : 'Detalle'}
            {statsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>
        <div className={`${statsOpen ? 'block' : 'hidden'} ${panelCollapsed ? 'md:hidden' : 'md:block'} space-y-6 short:md:space-y-4 px-3 pb-3 md:p-0`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Estadísticas del Ambiente Activo
              </h3>
              <button onClick={togglePanel} title="Plegar el panel" aria-label="Plegar el panel" aria-expanded
                className="hidden md:block shrink-0 rounded-md p-1 text-gray-500 hover:bg-gray-800/50 hover:text-white">
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>

            <div className="text-xs space-y-2 text-gray-300 bg-gray-900/60 p-3 rounded border border-gray-800">
              <p className="flex justify-between items-center">
                <span className="text-gray-400">Cámaras Activas:</span>
                <strong className="text-white font-mono">{cameras.length}</strong>
              </p>
              <p className="flex justify-between items-center">
                <span className="text-gray-400">En práctica (analizando):</span>
                <strong className="text-emerald-400 font-mono">{monitoredCameras}</strong>
              </p>
              <p className="flex justify-between items-center border-t border-gray-800 pt-2">
                <span className="text-gray-400">Personas visibles:</span>
                <strong className="text-white font-mono">{visiblePeople.length}</strong>
              </p>

              <div className="pl-2 space-y-1.5 border-l-2 border-gray-700 mt-2">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Con falta detectada:
                  </span>
                  <strong className="text-red-400 font-mono">{totalGraves}</strong>
                </div>

                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-sky-400">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    Verificando:
                  </span>
                  <strong className="text-sky-400 font-mono">{totalModeradas}</strong>
                </div>

                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Cumplen lo verificable:
                  </span>
                  <strong className="text-emerald-400 font-mono">{totalLeves}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Video</h3>
            <div className="grid grid-cols-2 gap-1 rounded border border-gray-800 bg-gray-900/60 p-1 text-[11px]">
              <button onClick={() => !syncVideo && toggleSync()} className={`rounded px-2 py-1 font-semibold ${syncVideo ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                Sincronizado
              </button>
              <button onClick={() => syncVideo && toggleSync()} className={`rounded px-2 py-1 font-semibold ${!syncVideo ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                En vivo
              </button>
            </div>
            <p className="text-[10px] text-gray-500">
              {syncVideo
                ? 'Los recuadros coinciden con el video; el video va con el retraso del análisis.'
                : 'Video sin retraso; los recuadros pueden ir un poco atrasados.'}
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Detecciones en curso</h3>
            <p className="text-[10px] text-gray-500">Avisos del motor: el encargado debe confirmarlos. Toca uno para ver su cámara.</p>
            {activeInfracciones.map((inf) => {
              const styles = getSeverityStyles(inf.state, inf.severity);
              const items = inf.state === 'INCUMPLE' ? inf.missing : inf.at_risk;
              return (
                // Al tocarla se amplía la cámara donde ocurre (y en el celular se pliega el panel).
                <button
                  type="button"
                  key={`${inf.camNombre}-${inf.track_id}`}
                  onClick={() => { setSelectedCameraId(inf.camId); setStatsOpen(false); }}
                  title={`Ver la cámara ${inf.camNombre}`}
                  className={`block w-full text-left p-2.5 border-l-4 rounded text-xs space-y-1 cursor-pointer transition hover:brightness-125 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${styles.container}`}
                >
                  <div className={`flex items-center justify-between font-bold ${styles.text}`}>
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {inf.label}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded uppercase border ${styles.badge}`}>
                      {inf.severity ? severityStyle(inf.severity).label : `${Math.round(inf.progress * 100)}%`}
                    </span>
                  </div>
                  <p className="text-gray-300 text-[11px]">
                    <strong className="text-gray-200">Ubicación:</strong> {inf.camNombre} · persona {inf.track_id}
                  </p>
                  {items.map((item) => (
                    <p key={item.equipment_id} className="text-gray-300 text-[11px]">
                      {equipmentLabel(item.equipment_id, item.rule_code)}{'detail' in item && item.detail ? ` · ${detalleFalta(item.detail)}` : ''}
                    </p>
                  ))}
                </button>
              );
            })}
            {activeInfracciones.length === 0 && <p className="text-[11px] text-gray-500">Sin detecciones en este momento.</p>}
            {visiblePeople.some((person) => person.manual.length > 0) && (
              <div className="rounded border border-gray-800 bg-gray-900/60 p-2 text-[11px] text-gray-400">
                <strong className="text-gray-300">Verificación manual (sin detector):</strong>
                {Array.from(new Map(visiblePeople.flatMap((person) => person.manual).map((item) => [item.equipment_id, item])).values()).map((item) => (
                  <p key={item.equipment_id}>{equipmentLabel(item.equipment_id, item.rule_code)}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Grid de Cámaras */}
      <div className="flex-1 min-h-0 p-2 md:p-3 grid grid-cols-1 sm:grid-cols-2 content-start sm:content-stretch sm:auto-rows-fr short:sm:content-start short:sm:auto-rows-auto gap-2 md:gap-3 bg-[#0d0e12] w-full overflow-y-auto">
        {isLoadingCameras && (
          <div className="col-span-full text-sm text-gray-400">Cargando cámaras...</div>
        )}
        {cameraError && (
          <div role="alert" className="col-span-full rounded border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {cameraError}
          </div>
        )}
        {cameras.map((camera) => (
          <CameraCard
            key={camera.id}
            camera={camera}
            equipment={equipment}
            sync={syncVideo}
            onDelete={handleDeleteCamera}
            onExpand={(id) => setSelectedCameraId(id)}
            onOverlay={handleOverlay}
          />
        ))}

        {/* Tarjeta Dinámica de Opción de Agregar Cámara */}
        <div className="border-2 border-dashed border-gray-800 bg-[#12141a]/50 rounded p-4 flex flex-col items-center justify-center gap-3 min-h-[220px] short:min-h-0">
          <div className="w-full space-y-1">
            <button
              onClick={() => void startDeviceCamera()}
              disabled={isCreatingBrowserCamera || !window.isSecureContext}
              className="flex w-full items-center justify-center gap-2 rounded bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <Smartphone className="h-4 w-4" />
              {isCreatingBrowserCamera ? 'Preparando la cámara…' : 'Usar la cámara de este dispositivo'}
            </button>
            <p className="text-center text-[10px] text-gray-500">
              {window.isSecureContext
                ? 'Celular o laptop: transmite desde el navegador mientras la pantalla esté abierta.'
                : 'Requiere abrir SafeVision con https:// (ver README, sección 4b).'}
            </p>
          </div>
          <div className="w-full space-y-2 border-t border-gray-800 pt-3">
            <button
              onClick={() => void discoverLocalCameras()}
              disabled={isDiscoveringCameras}
              className="flex w-full items-center justify-center gap-2 rounded border border-emerald-500/40 bg-emerald-950/20 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-950/40 disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
              {isDiscoveringCameras ? 'Buscando cámaras del servidor...' : 'Detectar cámaras del PC servidor'}
            </button>
            {availableCameras.length > 0 && (
              <div className="max-h-36 w-full space-y-1 overflow-y-auto">
                {availableCameras.map(device => (
                  <div key={device.device_index} className="flex items-center justify-between gap-2 rounded border border-gray-800 bg-gray-900/80 px-2 py-1.5 text-[10px]">
                    <span className="min-w-0 truncate text-gray-300">{device.name} · {device.width}×{device.height}</span>
                    <button
                      onClick={() => void addDetectedCamera(device)}
                      disabled={addingDeviceIndex !== null}
                      className="shrink-0 rounded bg-emerald-600 px-2 py-1 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {addingDeviceIndex === device.device_index ? 'Agregando...' : 'Agregar'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {!isDiscoveringCameras && availableCameras.length === 0 && (
              <p className="text-center text-[10px] text-gray-500">Cámaras USB o integradas del PC donde corre el backend (la opción más rápida en ese PC).</p>
            )}
          </div>
          <button
            onClick={() => { setCameraError(''); setIsCameraFormOpen(true); }}
            className="w-full flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-emerald-400 transition-all group"
          >
            <div className="p-3 rounded-full bg-gray-900 border border-gray-800 group-hover:border-emerald-500/40 group-hover:scale-110 transition-transform">
              <Plus className="w-8 h-8" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider">Agregar Nueva Cámara</span>
          </button>
        </div>
      </div>

      {isCameraFormOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-2 md:p-4">
          <form onSubmit={handleSubmitCamera} className="w-full max-w-lg max-h-full overflow-y-auto space-y-4 rounded border border-gray-700 bg-[#16181e] p-4 md:p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">Registrar cámara</h2>
              <button type="button" onClick={() => setIsCameraFormOpen(false)} className="text-gray-400 hover:text-white" aria-label="Cerrar formulario">
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="block space-y-1.5 text-xs text-gray-300">
              <span>Nombre</span>
              <input
                required
                maxLength={120}
                value={cameraName}
                onChange={(event) => setCameraName(event.target.value)}
                className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                placeholder="Ej. Cámara laboratorio de química"
              />
            </label>

            <label className="block space-y-1.5 text-xs text-gray-300">
              <span>Área de laboratorio</span>
              <select
                value={laboratoryType}
                disabled={!isAdministrator}
                onChange={(event) => setLaboratoryType(event.target.value as 'QUIMICA' | 'FISICA')}
                className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 disabled:opacity-70"
              >
                <option value="QUIMICA">Química</option>
                <option value="FISICA">Física</option>
              </select>
            </label>

            <label className="block space-y-1.5 text-xs text-gray-300">
              <span>URL de cámara (RTSP/HTTP)</span>
              <input
                value={cameraUrl}
                onChange={(event) => { setCameraUrl(event.target.value); if (event.target.value) setVideoFile(null); }}
                className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                placeholder="rtsp://usuario:clave@servidor:554/stream"
              />
            </label>

            <label className="block space-y-1.5 text-xs text-gray-300">
              <span>O carga un video para reproducirlo como cámara (máximo 500 MB)</span>
              <input
                type="file"
                accept="video/mp4,video/avi,video/quicktime,video/x-matroska,video/webm,.avi,.mkv"
                onChange={(event) => { const file = event.target.files?.[0] ?? null; setVideoFile(file); if (file) setCameraUrl(''); }}
                className="block w-full text-xs text-gray-400 file:mr-3 file:rounded file:border-0 file:bg-gray-800 file:px-3 file:py-2 file:text-xs file:text-gray-200 hover:file:bg-gray-700"
              />
              {videoFile && <span className="block text-emerald-400">{videoFile.name}</span>}
            </label>

            {cameraError && <p role="alert" className="text-sm text-red-300">{cameraError}</p>}

            <div className="flex justify-end gap-2 border-t border-gray-800 pt-3">
              <button type="button" onClick={() => setIsCameraFormOpen(false)} className="rounded border border-gray-700 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800">
                Cancelar
              </button>
              <button type="submit" disabled={isSubmittingCamera} className="rounded bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60">
                {isSubmittingCamera ? 'Guardando...' : 'Guardar cámara'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL / PANTALLA COMPLETA */}
      {selectedCamera && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md p-2 md:p-4 flex flex-col justify-between animate-in fade-in duration-200">
          <div className="flex items-center justify-between bg-[#16181e] p-3 rounded border border-gray-800 mb-3">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">{selectedCamera.nombre}</h2>
            </div>
            <button
              onClick={() => setSelectedCameraId(null)}
              className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-1.5 rounded border border-gray-700 text-xs font-semibold transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Cerrar<span className="hidden md:inline"> (Esc)</span></span>
            </button>
          </div>

                    <div className="relative flex-1 bg-black rounded border border-gray-800 overflow-hidden flex items-center justify-center">
            <img
              key={`ampliada-${selectedCamera.id}-${syncVideo}`}
              ref={expandedVideoRef}
              src={cameraFeedUrl(selectedCamera.id, token, syncVideo)}
              alt={selectedCamera.nombre}
              className="w-full h-full object-contain"
            />
            <OverlayCanvas message={overlays[selectedCamera.id] ?? null} equipment={equipment} />
            <EstadoCamara key={`estado-ampliada-${selectedCamera.id}-${syncVideo}`} overlay={overlays[selectedCamera.id] ?? null} videoRef={expandedVideoRef} />
          </div>
        </div>
      )}
    </div>
  );
}