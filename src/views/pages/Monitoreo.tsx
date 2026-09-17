import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, AlertTriangle, Maximize2, X, Camera } from 'lucide-react';

// 1. Interfaces y Tipos
interface BoundingBox {
  id: string;
  label: string;
  color: string;
  top: string;
  left: string;
  width: string;
  height: string;
  gravedad?: string;
  consecuencia?: string;
}

interface CameraData {
  id: string;
  nombre: string;
  streamUrl?: string;
  mediaStream?: MediaStream; // Soporte para cámara nativa/webcam
  boxes: BoundingBox[];
}

const INFRACCIONES_CATALOGO = [
  { tipo: 'Sin Casco', gravedad: 'Grave', consecuencia: 'Riesgo de traumatismo por caída de objetos', color: '#ef4444' },
  { tipo: 'Sin Chaleco', gravedad: 'Moderada', consecuencia: 'Baja visibilidad en área de trabajo', color: '#f59e0b' },
  { tipo: 'Sin Arnés', gravedad: 'Grave', consecuencia: 'Riesgo mortal de caída a distinto nivel', color: '#ef4444' },
  { tipo: 'Sin Guantes', gravedad: 'Leve', consecuencia: 'Riesgo de abrasión o contacto con químicos', color: '#eab308' }
];

const generateRandomBoxes = (): BoundingBox[] => {
  const getRandom = (min: number, max: number) => Math.floor(Math.random() * (max - min) + min);
  const infr = INFRACCIONES_CATALOGO[Math.floor(Math.random() * INFRACCIONES_CATALOGO.length)];

  return [
    {
      id: 'box-person',
      label: 'Persona',
      color: '#10b981',
      top: `${getRandom(10, 35)}%`,
      left: `${getRandom(10, 30)}%`,
      width: `${getRandom(15, 22)}%`,
      height: `${getRandom(45, 60)}%`
    },
    {
      id: 'box-correct',
      label: 'EPP: Correcto',
      color: '#10b981',
      top: `${getRandom(15, 40)}%`,
      left: `${getRandom(40, 60)}%`,
      width: `${getRandom(12, 20)}%`,
      height: `${getRandom(40, 55)}%`
    },
    {
      id: 'box-incorrect',
      label: `INFRACCIÓN: ${infr.tipo}`,
      color: infr.color,
      top: `${getRandom(20, 45)}%`,
      left: `${getRandom(65, 80)}%`,
      width: `${getRandom(14, 20)}%`,
      height: `${getRandom(40, 50)}%`,
      gravedad: infr.gravedad,
      consecuencia: infr.consecuencia
    }
  ];
};

const getSeverityStyles = (color: string) => {
  switch (color) {
    case '#ef4444':
      return {
        container: 'bg-red-950/30 border-red-500',
        text: 'text-red-400',
        badge: 'bg-red-500/20 border-red-500/30 text-red-400'
      };
    case '#f59e0b':
      return {
        container: 'bg-amber-950/30 border-amber-500',
        text: 'text-amber-400',
        badge: 'bg-amber-500/20 border-amber-500/30 text-amber-400'
      };
    case '#eab308':
    default:
      return {
        container: 'bg-yellow-950/30 border-yellow-500',
        text: 'text-yellow-400',
        badge: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
      };
  }
};

function CameraCard({ 
  camera, 
  onDelete,
  onExpand 
}: { 
  camera: CameraData; 
  onDelete: (id: string, e: React.MouseEvent) => void; 
  onExpand: (id: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (camera.mediaStream && videoRef.current) {
      videoRef.current.srcObject = camera.mediaStream;
    }
  }, [camera.mediaStream]);

  return (
    <div 
      onClick={() => onExpand(camera.id)}
      className="relative bg-black rounded border border-gray-800 overflow-hidden flex flex-col w-full h-full group cursor-pointer hover:border-emerald-500/50 transition-colors"
    >
      <div className="absolute top-2 left-2 z-10 bg-black/70 backdrop-blur-md text-xs px-2.5 py-1 rounded text-white font-semibold border border-gray-700 flex items-center gap-2">
        <span>{camera.nombre}</span>
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
        {camera.mediaStream ? (
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover"
          />
        ) : (
          <img 
            src={camera.streamUrl} 
            alt={camera.nombre} 
            className="w-full h-full object-cover opacity-75" 
          />
        )}
        
        {camera.boxes.map((box) => (
          <div 
            key={box.id}
            style={{
              top: box.top,
              left: box.left,
              width: box.width,
              height: box.height,
              borderColor: box.color
            }}
            className="absolute border-2 rounded-sm transition-all duration-300 pointer-events-none"
          >
            <span 
              style={{ backgroundColor: box.color }}
              className="absolute -top-5 left-0 text-black text-[9px] font-extrabold px-1 py-0.5 rounded-t whitespace-nowrap uppercase tracking-tighter"
            >
              {box.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MonitoreoPage() {
  const [cameras, setCameras] = useState<CameraData[]>([
    {
      id: 'cam-1',
      nombre: 'CAM-01: Taller de Soldadura',
      streamUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?q=80&w=1000&auto=format&fit=crop',
      boxes: generateRandomBoxes()
    },
    {
      id: 'cam-2',
      nombre: 'CAM-02: Lab. de Química',
      streamUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1000&auto=format&fit=crop',
      boxes: generateRandomBoxes()
    }
  ]);

  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [availableDevice, setAvailableDevice] = useState<MediaDeviceInfo | null>(null);
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);

  // Escanear dispositivos multimedia conectados para detectar cámara web/laptop disponible
  useEffect(() => {
    async function checkAvailableCameras() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((device) => device.kind === 'videoinput');
        
        // Verificar si alguna cámara detectada ya fue agregada
        const unaddedDevice = videoDevices.find(
          (dev) => !cameras.some((cam) => cam.id === dev.deviceId || cam.id === 'native-webcam')
        );

        setAvailableDevice(unaddedDevice || null);
      } catch (error) {
        console.error('Error al detectar dispositivos de video:', error);
      }
    }

    checkAvailableCameras();
  }, [cameras]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedCameraId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Agregar cámara simulada o remota por defecto
  const handleAddCamera = () => {
    const nextId = cameras.length + 1;
    const newCam: CameraData = {
      id: `cam-${Date.now()}`,
      nombre: `CAM-0${nextId}: Nuevo Laboratorio`,
      streamUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1000&auto=format&fit=crop',
      boxes: generateRandomBoxes()
    };
    setCameras([...cameras, newCam]);
  };

  // Agregar la cámara física/laptop detectada
  const handleAddNativeWebcam = async () => {
    try {
      const constraints: MediaStreamConstraints = availableDevice?.deviceId
        ? { video: { deviceId: { exact: availableDevice.deviceId } } }
        : { video: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const nextId = cameras.length + 1;

      const newCam: CameraData = {
        id: availableDevice?.deviceId || 'native-webcam',
        nombre: availableDevice?.label || `CAM-0${nextId}: Cámara Local/Laptop`,
        mediaStream: stream,
        boxes: generateRandomBoxes()
      };

      setCameras([...cameras, newCam]);
      setAvailableDevice(null);
    } catch (err) {
      alert('No se pudo acceder a la cámara. Por favor permite los permisos en el navegador.');
    }
  };

  const handleDeleteCamera = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const camToDelete = cameras.find((c) => c.id === id);
    if (camToDelete?.mediaStream) {
      camToDelete.mediaStream.getTracks().forEach((track) => track.stop());
    }
    setCameras(cameras.filter((cam) => cam.id !== id));
    if (selectedCameraId === id) setSelectedCameraId(null);
  };

  const selectedCamera = cameras.find((c) => c.id === selectedCameraId);
  const activeInfracciones = cameras.flatMap((c) => 
    c.boxes.filter((b) => b.gravedad).map((b) => ({ ...b, camNombre: c.nombre }))
  );

  const totalGraves = activeInfracciones.filter((i) => i.color === '#ef4444').length;
  const totalModeradas = activeInfracciones.filter((i) => i.color === '#f59e0b').length;
  const totalLeves = activeInfracciones.filter((i) => i.color === '#eab308').length;

  useEffect(() => {
    if (selectedCamera?.mediaStream && modalVideoRef.current) {
      modalVideoRef.current.srcObject = selectedCamera.mediaStream;
    }
  }, [selectedCamera]);

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
                <span className="text-gray-400">Cumplimiento Global:</span>
                <strong className="text-emerald-400 font-mono">89%</strong>
              </p>
              <p className="flex justify-between items-center border-t border-gray-800 pt-2">
                <span className="text-gray-400">Infracciones Totales:</span>
                <strong className="text-white font-mono">{activeInfracciones.length}</strong>
              </p>

              <div className="pl-2 space-y-1.5 border-l-2 border-gray-700 mt-2">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Críticas / Graves:
                  </span>
                  <strong className="text-red-400 font-mono">{totalGraves}</strong>
                </div>

                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Moderadas:
                  </span>
                  <strong className="text-amber-400 font-mono">{totalModeradas}</strong>
                </div>

                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-yellow-400">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    Leves:
                  </span>
                  <strong className="text-yellow-400 font-mono">{totalLeves}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Infracciones Detectadas</h3>
            {activeInfracciones.map((inf, idx) => {
              const styles = getSeverityStyles(inf.color);
              return (
                <div 
                  key={idx} 
                  className={`p-2.5 border-l-4 rounded text-xs space-y-1 ${styles.container}`}
                >
                  <div className={`flex items-center justify-between font-bold ${styles.text}`}>
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {inf.label}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded uppercase border ${styles.badge}`}>
                      {inf.gravedad}
                    </span>
                  </div>
                  <p className="text-gray-300 text-[11px]">
                    <strong className="text-gray-200">Ubicación:</strong> {inf.camNombre}
                  </p>
                  <p className="text-gray-400 text-[11px] italic">
                    <strong className="text-gray-300">Consecuencia:</strong> {inf.consecuencia}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Grid de Cámaras */}
      <div className="flex-1 p-3 grid grid-cols-2 auto-rows-fr gap-3 bg-[#0d0e12] w-full h-full overflow-y-auto">
        {cameras.map((camera) => (
          <CameraCard 
            key={camera.id} 
            camera={camera} 
            onDelete={handleDeleteCamera}
            onExpand={(id) => setSelectedCameraId(id)}
          />
        ))}

        {/* Tarjeta Dinámica de Opción de Agregar Cámara */}
        <div className="border-2 border-dashed border-gray-800 bg-[#12141a]/50 rounded p-4 flex flex-col items-center justify-center gap-3 min-h-[220px]">
          {availableDevice ? (
            <button
              onClick={handleAddNativeWebcam}
              className="w-full h-full flex flex-col items-center justify-center gap-2 bg-emerald-950/20 border border-emerald-500/40 hover:border-emerald-500 text-emerald-400 hover:bg-emerald-950/40 rounded transition-all p-4 group"
            >
              <div className="p-3 rounded-full bg-emerald-900/50 border border-emerald-500/50 group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-center">
                Cámara Detectada ({availableDevice.label || 'Laptop/USB'})
              </span>
              <span className="text-[10px] text-emerald-300/80">Haz clic para integrar el video en vivo</span>
            </button>
          ) : (
            <button
              onClick={handleAddCamera}
              className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-emerald-400 transition-all group"
            >
              <div className="p-3 rounded-full bg-gray-900 border border-gray-800 group-hover:border-emerald-500/40 group-hover:scale-110 transition-transform">
                <Plus className="w-8 h-8" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider">Agregar Nueva Cámara</span>
            </button>
          )}
        </div>
      </div>

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
            {selectedCamera.mediaStream ? (
              <video 
                ref={modalVideoRef}
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-contain"
              />
            ) : (
              <img 
                src={selectedCamera.streamUrl} 
                alt={selectedCamera.nombre} 
                className="w-full h-full object-contain" 
              />
            )}

            {selectedCamera.boxes.map((box) => (
              <div 
                key={box.id}
                style={{
                  top: box.top,
                  left: box.left,
                  width: box.width,
                  height: box.height,
                  borderColor: box.color
                }}
                className="absolute border-2 rounded-sm pointer-events-none"
              >
                <span 
                  style={{ backgroundColor: box.color }}
                  className="absolute -top-6 left-0 text-black text-xs font-black px-1.5 py-0.5 rounded-t uppercase tracking-wider shadow"
                >
                  {box.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}