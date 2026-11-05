import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, AlertTriangle, Maximize2, X, Camera } from 'lucide-react';
import { authService } from '../../services/authService';
import { reglasLabService } from '../../services/reglasLabService';
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

const getSeverityStyles = (state: string) => state === 'INCUMPLE'
  ? { container: 'bg-red-950/30 border-red-500', text: 'text-red-400', badge: 'bg-red-500/20 border-red-500/30 text-red-400' }
  : { container: 'bg-amber-950/30 border-amber-500', text: 'text-amber-400', badge: 'bg-amber-500/20 border-amber-500/30 text-amber-400' };

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
      className="relative bg-black rounded border border-gray-800 overflow-hidden flex flex-col w-full h-full group cursor-pointer hover:border-emerald-500/50 transition-colors"
    >
      <div className="absolute top-2 left-2 z-10 bg-black/70 backdrop-blur-md text-xs px-2.5 py-1 rounded text-white font-semibold border border-gray-700 flex items-center gap-2">
        <span>{camera.nombre}</span>
        <span className="font-normal text-gray-300">{status}</span>
      </div>

      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onExpand(camera.id); }}
          className="bg-gray-800/80 hover:bg-gray-700 text-white p-1 rounded border border-gray-600"
          title="Ampliar pantalla"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => onDelete(camera.id, e)}
          className="bg-red-600/80 hover:bg-red-600 text-white p-1 rounded"
          title="Eliminar cámara"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="relative flex-1 bg-[#1a1a1a] flex items-center justify-center overflow-hidden min-h-[220px]">
        {/* Miniatura: una imagen por segundo, sin conexión de video permanente (Tarea 0B). */}
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
    (overlays[c.id]?.people ?? []).map((person) => ({ ...person, camNombre: c.nombre }))
  );
  // Detecciones del motor en este momento (no son incidencias validadas).
  const activeInfracciones = visiblePeople.filter((person) => person.state === 'INCUMPLE' || person.state === 'EN_RIESGO');
  const monitoredCameras = cameras.filter((c) => overlays[c.id]?.monitoring).length;
  const totalGraves = visiblePeople.filter((person) => person.state === 'INCUMPLE').length;
  const totalModeradas = visiblePeople.filter((person) => person.state === 'EN_RIESGO').length;
  const totalLeves = visiblePeople.filter((person) => person.state === 'CUMPLE').length;
  const equipmentLabel = (id: string, code: string | null) => `${equipment[id]?.icon ?? ''} ${equipment[id]?.name ?? id}${code ? ` (${code})` : ''}`;

  return (
    <div className="relative flex flex-1 h-full overflow-hidden">
      {/* Sidebar Estadísticas */}
      <aside className="w-72 shrink-0 bg-[#16181e] border-r border-gray-800 flex flex-col justify-between p-4 overflow-y-auto">
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Estadísticas del Ambiente Activo
            </h3>

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
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Verificando:
                  </span>
                  <strong className="text-amber-400 font-mono">{totalModeradas}</strong>
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
            <p className="text-[10px] text-gray-500">Avisos del motor: el encargado debe confirmarlos.</p>
            {activeInfracciones.map((inf) => {
              const styles = getSeverityStyles(inf.state);
              const items = inf.state === 'INCUMPLE' ? inf.missing : inf.at_risk;
              return (
                <div
                  key={`${inf.camNombre}-${inf.track_id}`}
                  className={`p-2.5 border-l-4 rounded text-xs space-y-1 ${styles.container}`}
                >
                  <div className={`flex items-center justify-between font-bold ${styles.text}`}>
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {inf.label}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded uppercase border ${styles.badge}`}>
                      {inf.severity ?? `${Math.round(inf.progress * 100)}%`}
                    </span>
                  </div>
                  <p className="text-gray-300 text-[11px]">
                    <strong className="text-gray-200">Ubicación:</strong> {inf.camNombre} · persona {inf.track_id}
                  </p>
                  {items.map((item) => (
                    <p key={item.equipment_id} className="text-gray-300 text-[11px]">{equipmentLabel(item.equipment_id, item.rule_code)}</p>
                  ))}
                </div>
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
      <div className="flex-1 p-3 grid grid-cols-2 auto-rows-fr gap-3 bg-[#0d0e12] w-full h-full overflow-y-auto">
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
        <div className="border-2 border-dashed border-gray-800 bg-[#12141a]/50 rounded p-4 flex flex-col items-center justify-center gap-3 min-h-[220px]">
          <div className="w-full space-y-2">
            <button
              onClick={() => void discoverLocalCameras()}
              disabled={isDiscoveringCameras}
              className="flex w-full items-center justify-center gap-2 rounded border border-emerald-500/40 bg-emerald-950/20 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-950/40 disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
              {isDiscoveringCameras ? 'Buscando cámaras del equipo...' : 'Detectar cámaras conectadas'}
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
              <p className="text-center text-[10px] text-gray-500">Detecta los dispositivos conectados al equipo del backend.</p>
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
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
          <form onSubmit={handleSubmitCamera} className="w-full max-w-lg space-y-4 rounded border border-gray-700 bg-[#16181e] p-5 shadow-2xl">
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
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md p-4 flex flex-col justify-between animate-in fade-in duration-200">
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
              <span>Cerrar (Esc)</span>
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