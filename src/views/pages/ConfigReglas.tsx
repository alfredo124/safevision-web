import React, { useState } from 'react';
import { Shield, Camera, Check, AlertCircle } from 'lucide-react';

interface EPPItem {
  id: string;
  nombre: string;
  slot: 'cabeza' | 'ojos' | 'cuerpo' | 'manos' | 'pies';
  icono: string;
}

interface AmbienteConfig {
  id: string;
  nombre: string;
  camaras: string[];
  eppRequerido: Record<string, boolean>;
}

const EPP_CATALOGO: EPPItem[] = [
  { id: 'casco', nombre: 'Casco de Seguridad', slot: 'cabeza', icono: '🪖' },
  { id: 'lentes', nombre: 'Lentes de Protección', slot: 'ojos', icono: '🥽' },
  { id: 'chaleco', nombre: 'Chaleco / Mandil', slot: 'cuerpo', icono: '🦺' },
  { id: 'arnes', nombre: 'Arnés anticaídas', slot: 'cuerpo', icono: '🪢' },
  { id: 'guantes', nombre: 'Guantes Industriales', slot: 'manos', icono: '🧤' },
  { id: 'botas', nombre: 'Botas de Seguridad', slot: 'pies', icono: '🥾' },
];

export function ConfigReglasPage() {
  const [ambientes, setAmbientes] = useState<AmbienteConfig[]>([
    {
      id: 'env-1',
      nombre: 'Taller de Soldadura',
      camaras: ['CAM-01: Soldadura Norte', 'CAM-03: Soldadura Sur'],
      eppRequerido: { casco: true, lentes: true, chaleco: true, guantes: true, botas: true, arnes: false }
    },
    {
      id: 'env-2',
      nombre: 'Laboratorio de Química',
      camaras: ['CAM-02: Mesada Principal'],
      eppRequerido: { casco: false, lentes: true, chaleco: true, guantes: true, botas: true, arnes: false }
    }
  ]);

  const [selectedAmbienteId, setSelectedAmbienteId] = useState<string>('env-1');
  const activeAmbiente = ambientes.find((a) => a.id === selectedAmbienteId) || ambientes[0];

  const toggleEPP = (eppId: string) => {
    setAmbientes((prev) =>
      prev.map((amb) => {
        if (amb.id !== selectedAmbienteId) return amb;
        return {
          ...amb,
          eppRequerido: {
            ...amb.eppRequerido,
            [eppId]: !amb.eppRequerido[eppId]
          }
        };
      })
    );
  };

  return (
    <div className="flex flex-1 h-full bg-[#0d0e12] text-white overflow-hidden">
      {/* 1. Panel Izquierdo: Selección de Ambientes */}
      <aside className="w-80 border-r border-gray-800 bg-[#16181e] p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Ambientes Configurados
            </h2>
          </div>

          <div className="space-y-2">
            {ambientes.map((amb) => (
              <button
                key={amb.id}
                onClick={() => setSelectedAmbienteId(amb.id)}
                className={`w-full text-left p-3 rounded border transition-all ${
                  amb.id === selectedAmbienteId
                    ? 'bg-gray-800 border-emerald-500 text-white'
                    : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-sm text-gray-100">{amb.nombre}</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold">
                    {amb.camaras.length} {amb.camaras.length === 1 ? 'Cámara' : 'Cámaras'}
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Camera className="w-3 h-3 text-gray-500" />
                  <span className="truncate">{amb.camaras.join(', ')}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 bg-gray-900/80 border border-gray-800 rounded text-xs text-gray-400 space-y-1">
          <p className="flex items-center gap-1 font-semibold text-gray-300">
            <AlertCircle className="w-3.5 h-3.5 text-indigo-400" /> Regla de Heredado:
          </p>
          <p className="text-[11px] text-gray-400">
            Los cambios aplicarán a todas las cámaras asociadas a este ambiente.
          </p>
        </div>
      </aside>

      {/* 2. Panel Central: Avatar / Loadout de EPP */}
      <main className="flex-1 p-6 overflow-y-auto flex flex-col items-center justify-center relative">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-white uppercase tracking-wide">
            Configuración de Reglas de EPP
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Ambiente Activo: <strong className="text-emerald-400">{activeAmbiente.nombre}</strong>
          </p>
        </div>

        {/* Estructura del Avatar estilo Loadout */}
        <div className="relative w-80 h-[460px] bg-[#12141c] border border-gray-800 rounded-2xl flex flex-col items-center justify-between p-5 shadow-2xl">
          {/* Silueta decorativa de fondo */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <svg className="w-64 h-96 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2a5 5 0 100 10 5 5 0 000-10zm0 12c-5.33 0-16 2.67-16 8v2h32v-2c0-5.33-10.67-8-16-8z" />
            </svg>
          </div>

          {/* Slots de EPP */}
          <div className="w-full space-y-2.5 z-10">
            {EPP_CATALOGO.map((item) => {
              const active = !!activeAmbiente.eppRequerido[item.id];
              return (
                <button
                  key={item.id}
                  onClick={() => toggleEPP(item.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                    active
                      ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'bg-gray-900/80 border-gray-800 text-gray-500 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.icono}</span>
                    <div className="text-left">
                      <p className="text-xs font-bold leading-tight">{item.nombre}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{item.slot}</p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                      active ? 'bg-emerald-500 border-emerald-400 text-black' : 'border-gray-700 bg-gray-800'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}