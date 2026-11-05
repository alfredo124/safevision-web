import { useServerChanges } from '../../services/changeEvents';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Camera, Play, Plus, Square, Smartphone } from 'lucide-react';
import { authService } from '../../services/authService';
import { API_BASE } from '../../services/apiConfig';
import { reglasLabService } from '../../services/reglasLabService';
import {
  ACTIVE_STATES, attachPreview, cambiarCamara, lastCameraId, setEstacionFps, startEstacion, stopEstacion, useEstacion,
  type EstadoEstacion, type Facing, type FuenteCamara,
} from '../../services/stationStream';
import { useCameraOverlay, type EquipmentInfo } from '../../hooks/useCameraOverlay';
import { OverlayCanvas } from '../components/CameraOverlay';

interface BrowserCamera {
  id: number;
  name: string;
  laboratory_type: 'QUIMICA' | 'FISICA';
  source_type?: 'STREAM' | 'BROWSER';
  station_connected?: boolean;
}

/** Cámara por defecto: la que usó este equipo la última vez; si no, la primera que nadie transmite. */
function defaultCamera(list: BrowserCamera[], current: number | null): number | null {
  const free = (camera: BrowserCamera) => !camera.station_connected;
  if (current && list.some(camera => camera.id === current && free(camera))) return current;
  const remembered = lastCameraId();
  if (remembered && list.some(camera => camera.id === remembered && free(camera))) return remembered;
  return list.find(free)?.id ?? null;
}

const ESTADOS: Record<EstadoEstacion, { texto: string; color: string }> = {
  detenida: { texto: 'Detenida', color: 'text-gray-400' },
  pidiendo_permiso: { texto: 'Pidiendo permiso para usar la cámara…', color: 'text-sky-300' },
  sin_permiso: { texto: 'Sin permiso: permite el acceso a la cámara en el navegador', color: 'text-red-300' },
  ocupada: { texto: 'La cámara está ocupada por otra aplicación', color: 'text-red-300' },
  conectando: { texto: 'Conectando con el servidor…', color: 'text-sky-300' },
  transmitiendo: { texto: 'Transmitiendo para el análisis', color: 'text-emerald-300' },
  reconectando: { texto: 'Sin conexión con el servidor: reconectando…', color: 'text-amber-300' },
  otra_estacion: { texto: 'Otra estación ya transmite esta cámara', color: 'text-red-300' },
  sin_acceso: { texto: 'No tienes acceso a esta cámara (o la sesión caducó)', color: 'text-red-300' },
  inseguro: { texto: 'El navegador solo permite la cámara con HTTPS (o en localhost)', color: 'text-red-300' },
  error: { texto: 'Error con la cámara', color: 'text-red-300' },
};

/**
 * Estación de cámara (Tarea 0C): el celular o la laptop usa su cámara, la muestra a 30 FPS
 * localmente y envía solo 2-5 imágenes por segundo al servidor para el análisis.
 * La transmisión vive en services/stationStream: sigue aunque se cambie de página.
 */
export function EstacionCamaraPage() {
  const session = authService.getCurrentUser();
  const token = session?.token;
  const isAdmin = session?.role === 'ADMINISTRADOR';
  const defaultArea = session?.role === 'ENCARGADO_FISICA' ? 'FISICA' : 'QUIMICA';
  const estacion = useEstacion();

  const [cameras, setCameras] = useState<BrowserCamera[]>([]);
  const [cameraId, setCameraId] = useState<number | null>(estacion.cameraId);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  // Cámara del dispositivo elegida (trasera/frontal u otra concreta). Lo que está en uso lo dice la estación.
  const [fuente, setFuente] = useState<FuenteCamara>({ facing: 'environment' });
  const [oculto, setOculto] = useState(document.hidden);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaArea, setNuevaArea] = useState<'QUIMICA' | 'FISICA'>(defaultArea);
  const [mensaje, setMensaje] = useState('');
  const [equipment, setEquipment] = useState<EquipmentInfo>({});
  // Desde Monitoreo ("Usar la cámara de este dispositivo"): ?camara=<id>&iniciar=1
  const [searchParams, setSearchParams] = useSearchParams();
  const autoStartRef = useRef<number | null>(Number(searchParams.get('camara')) || null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const transmitiendo = ACTIVE_STATES.includes(estacion.estado);
  const shownCameraId = transmitiendo ? estacion.cameraId : cameraId;
  const overlay = useCameraOverlay(shownCameraId ?? 0, estacion.estado === 'transmitiendo' ? token : undefined, false);

  // Vista previa: el mismo video que se transmite (sigue aunque se salga de esta página).
  useEffect(() => (videoRef.current ? attachPreview(videoRef.current) : undefined), []);

  const fetchBrowserCameras = useCallback(async (): Promise<BrowserCamera[]> => {
    if (!token) return [];
    const response = await fetch(`${API_BASE}/modules/ai_vision/cameras`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return [];
    return (await response.json() as BrowserCamera[]).filter(camera => camera.source_type === 'BROWSER');
  }, [token]);

  const listDevices = async () => {
    const all = await navigator.mediaDevices.enumerateDevices();
    // Antes del permiso los navegadores no dan ni nombre ni identificador: esas entradas no sirven.
    setDevices(all.filter(device => device.kind === 'videoinput' && device.deviceId));
  };

  const elegir = async (choice: FuenteCamara) => {
    setFuente(choice);
    setMensaje('');
    if (transmitiendo) {
      const error = await cambiarCamara(choice);
      if (error) setMensaje(error);
    }
  };

  const start = async (id: number | null, list: BrowserCamera[] = cameras) => {
    if (!id) { setMensaje('Elige o crea una cámara de navegador.'); return; }
    setMensaje('');
    await startEstacion({ cameraId: id, cameraName: list.find(camera => camera.id === id)?.name ?? null, fuente, fps: estacion.fps });
    void listDevices();  // con permiso, ya se ven los nombres de las cámaras
  };

  useEffect(() => {
    let active = true;
    fetchBrowserCameras()
      .then(list => {
        if (!active) return;
        setCameras(list);
        setCameraId(current => defaultCamera(list, current));
        const requested = autoStartRef.current;
        if (requested && list.some(camera => camera.id === requested)) {
          setCameraId(requested);
          if (searchParams.get('iniciar') === '1') void start(requested, list);
        }
        autoStartRef.current = null;
        if (searchParams.has('camara')) setSearchParams({}, { replace: true });
      })
      .catch(() => { /* sin cámaras */ });
    reglasLabService.getConfiguration()
      .then(configuration => {
        if (active) setEquipment(Object.fromEntries(configuration.catalog.map(item => [item.id, { icon: item.icon, name: item.name }])));
      })
      .catch(() => { /* sin catálogo: solo códigos */ });
    const onVisibility = () => setOculto(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { active = false; document.removeEventListener('visibilitychange', onVisibility); };
    // Solo al abrir la página: los parámetros se leen una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchBrowserCameras]);

  // Cámaras de navegador creadas o eliminadas desde otra pantalla.
  useServerChanges(['cameras'], () => {
    fetchBrowserCameras()
      .then(list => {
        setCameras(list);
        if (!transmitiendo) setCameraId(current => defaultCamera(list, current));
      })
      .catch(() => { /* siguiente aviso */ });
  });

  const createCamera = async () => {
    if (!token || !nuevoNombre.trim()) return;
    const response = await fetch(`${API_BASE}/modules/ai_vision/cameras/browser`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nuevoNombre.trim(), laboratory_type: nuevaArea }),
    });
    const body = await response.json();
    if (!response.ok) { setMensaje(body.detail ?? 'No se pudo crear la cámara.'); return; }
    setNuevoNombre('');
    setCameras(await fetchBrowserCameras());
    setCameraId(body.id);
    setMensaje('Cámara creada. Asígnala a un taller en Configuración de reglas para analizarla en la práctica.');
  };

  const info = ESTADOS[estacion.estado];

  return (
    <div className="flex h-full flex-1 flex-col gap-3 overflow-y-auto p-2 text-white md:gap-4 md:p-4 lg:flex-row">
      <section className="flex-1 space-y-2">
        <div className="relative aspect-[4/3] max-h-[60dvh] w-full overflow-hidden rounded-lg border border-gray-800 bg-black lg:max-h-none">
          {/* Vista local a la velocidad de la cámara: no pasa por el servidor. */}
          <video ref={videoRef} muted playsInline className="h-full w-full object-contain" />
          <OverlayCanvas message={overlay} equipment={equipment} />
          {!transmitiendo && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
              <Smartphone className="h-10 w-10" />
              <p className="text-sm">La vista previa aparece al iniciar</p>
            </div>
          )}
        </div>
        <p className={`text-sm font-semibold ${info.color}`} role="status">{info.texto}</p>
        {transmitiendo && (
          <p className="text-[11px] text-gray-400">
            {estacion.enviados} imágenes enviadas · {estacion.fps} por segundo para el análisis
            {overlay?.monitoring ? ' · práctica en curso: se dibujan los recuadros del motor' : ' · sin práctica iniciada: no se analiza'}
          </p>
        )}
        {transmitiendo && (
          <p className="text-[11px] text-gray-500">
            Puedes ir a Monitoreo u otra página: la transmisión sigue hasta que pulses «Detener».
          </p>
        )}
        {transmitiendo && overlay?.monitoring && overlay.analysis_rate !== undefined && (
          <p className={`text-[11px] ${overlay.analysis_rate < 1 ? 'text-amber-300' : 'text-gray-400'}`}>
            El servidor analiza {overlay.analysis_rate.toFixed(1)} imágenes por segundo de esta cámara.
            {overlay.analysis_rate < 1 && ' Es lento porque el PC reparte su CPU entre todas las cámaras de la práctica: quita del taller las que no uses.'}
          </p>
        )}
        {transmitiendo && oculto && (
          <p className="rounded border border-amber-700 bg-amber-950/40 p-2 text-xs text-amber-200">
            Mantén el navegador abierto y visible: en segundo plano puede dejar de enviar imágenes.
          </p>
        )}
      </section>

      <aside className="w-full space-y-4 lg:w-80">
        <div className="space-y-3 rounded-lg border border-gray-800 bg-[#16181e] p-3 md:p-4">
          <h1 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Camera className="h-4 w-4 text-emerald-400" /> Estación de cámara
          </h1>
          <p className="text-[11px] text-gray-400">
            Usa la cámara de este dispositivo como cámara del laboratorio. Mantén la pantalla encendida.
          </p>

          <label className="block space-y-1 text-xs text-gray-300">
            <span>Cámara del sistema</span>
            <select value={shownCameraId ?? ''} disabled={transmitiendo} onChange={event => setCameraId(Number(event.target.value) || null)}
              className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm">
              {cameras.length === 0 && <option value="">Crea una cámara abajo</option>}
              {cameras.map(camera => {
                const enOtroEquipo = camera.station_connected && camera.id !== estacion.cameraId;
                return (
                  <option key={camera.id} value={camera.id} disabled={enOtroEquipo}>
                    {camera.name} ({camera.laboratory_type === 'QUIMICA' ? 'Química' : 'Física'}){enOtroEquipo ? ' · en uso en otro equipo' : ''}
                  </option>
                );
              })}
            </select>
          </label>

          <div className="space-y-1 text-xs text-gray-300">
            <span>Cámara de este dispositivo{transmitiendo ? ' (se puede cambiar sin detener)' : ''}</span>
            <div className="grid grid-cols-2 gap-1 rounded border border-gray-700 bg-gray-900 p-1">
              {([['environment', 'Trasera'], ['user', 'Frontal']] as [Facing, string][]).map(([facing, label]) => {
                // Marcada: la que el navegador dice que usa (transmitiendo) o la elegida (detenida).
                const marcada = transmitiendo ? estacion.facing === facing && !('deviceId' in fuente)
                  : 'facing' in fuente && fuente.facing === facing;
                return (
                  <button key={facing} type="button" disabled={estacion.cambiando} aria-pressed={marcada}
                    onClick={() => void elegir({ facing })}
                    className={`rounded px-2 py-2 text-sm font-semibold disabled:opacity-50 ${marcada ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
                    {label}
                  </button>
                );
              })}
            </div>
            {devices.length >= 2 && (
              <select value={'deviceId' in fuente ? fuente.deviceId : ''} disabled={estacion.cambiando}
                onChange={event => event.target.value && void elegir({ deviceId: event.target.value })}
                className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm">
                <option value="">Otra cámara…</option>
                {devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Cámara ${index + 1}`}</option>)}
              </select>
            )}
            {transmitiendo && (
              <p className="text-[11px] text-gray-400">
                {estacion.cambiando ? 'Cambiando de cámara…' : `En uso: ${estacion.deviceLabel ?? (estacion.facing === 'user' ? 'frontal' : 'trasera')}`}
              </p>
            )}
          </div>

          <label className="block space-y-1 text-xs text-gray-300">
            <span>Imágenes por segundo para el análisis</span>
            <select value={estacion.fps} onChange={event => setEstacionFps(Number(event.target.value))} className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm">
              {[2, 3, 5].map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>

          {transmitiendo ? (
            <button onClick={() => stopEstacion()} className="flex w-full items-center justify-center gap-2 rounded bg-red-600 px-3 py-2 text-sm font-bold hover:bg-red-500">
              <Square className="h-4 w-4" /> Detener transmisión
            </button>
          ) : (
            <button onClick={() => void start(cameraId)} disabled={estacion.estado === 'inseguro' || !cameraId}
              className="flex w-full items-center justify-center gap-2 rounded bg-emerald-600 px-3 py-2 text-sm font-bold hover:bg-emerald-500 disabled:opacity-50">
              <Play className="h-4 w-4" /> Iniciar transmisión
            </button>
          )}
          {mensaje && <p className="text-[11px] text-amber-300">{mensaje}</p>}
        </div>

        <div className={`${transmitiendo ? 'hidden' : ''} space-y-2 rounded-lg border border-gray-800 bg-[#16181e] p-4`}>
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-300">
            <Plus className="h-4 w-4" /> Nueva cámara de navegador
          </h2>
          <input value={nuevoNombre} onChange={event => setNuevoNombre(event.target.value)} maxLength={120}
            placeholder="Ej. Celular mesa 1" className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm" />
          <select value={nuevaArea} disabled={!isAdmin} onChange={event => setNuevaArea(event.target.value as 'QUIMICA' | 'FISICA')}
            className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm disabled:opacity-70">
            <option value="QUIMICA">Química</option>
            <option value="FISICA">Física</option>
          </select>
          <button onClick={() => void createCamera()} disabled={!nuevoNombre.trim()}
            className="w-full rounded border border-emerald-700 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-950/40 disabled:opacity-50">
            Crear cámara
          </button>
        </div>
      </aside>
    </div>
  );
}
