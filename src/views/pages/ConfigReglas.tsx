import React, { useState } from 'react';
import { 
  Shield, Camera, Check, AlertCircle, AlertTriangle, 
  Plus, Trash2, FileCode, PlusCircle, X 
} from 'lucide-react';

interface EPPItem {
  id: string;
  nombre: string;
  slot: 'cabeza' | 'ojos' | 'cuerpo' | 'manos' | 'pies';
  icono: string;
  codigoFalta: string;
  descripcionFalta: string;
  impacto: 'CRÍTICO' | 'ALTO' | 'MEDIO';
}

interface AmbienteConfig {
  id: string;
  nombre: string;
  camaras: string[];
  eppRequerido: Record<string, boolean>;
}

// Catálogo Global de Cámaras disponibles en el sistema
const CAMARAS_DISPONIBLES_GLOBAL = [
  'CAM-01: Soldadura Norte',
  'CAM-02: Mesada Principal',
  'CAM-03: Soldadura Sur',
  'CAM-04: Almacén de Reactivos',
  'CAM-05: Zona de Maquinaria Heavy',
  'CAM-06: Pasillo Principal Lab',
];

const EPP_CATALOGO_INICIAL: EPPItem[] = [
  { id: 'casco', nombre: 'Casco de Seguridad', slot: 'cabeza', icono: '🪖', codigoFalta: 'ERR-EPP-01', descripcionFalta: 'Ausencia de casco en zona de riesgo de caída de objetos', impacto: 'CRÍTICO' },
  { id: 'lentes', nombre: 'Lentes de Protección', slot: 'ojos', icono: '🥽', codigoFalta: 'ERR-EPP-02', descripcionFalta: 'Uso omitido o inadecuado de lentes protectores antiproyección', impacto: 'ALTO' },
  { id: 'chaleco', nombre: 'Chaleco / Mandil', slot: 'cuerpo', icono: '🦺', codigoFalta: 'ERR-EPP-03', descripcionFalta: 'Falta de indumentaria de alta visibilidad o mandil protector', impacto: 'MEDIO' },
  { id: 'arnes', nombre: 'Arnés anticaídas', slot: 'cuerpo', icono: '🪢', codigoFalta: 'ERR-EPP-04', descripcionFalta: 'Operación en altura sin línea de vida o arnés normado', impacto: 'CRÍTICO' },
  { id: 'guantes', nombre: 'Guantes Industriales', slot: 'manos', icono: '🧤', codigoFalta: 'ERR-EPP-05', descripcionFalta: 'Manipulación de insumos químicos/térmicos sin guantes', impacto: 'ALTO' },
  { id: 'botas', nombre: 'Botas de Seguridad', slot: 'pies', icono: '🥾', codigoFalta: 'ERR-EPP-06', descripcionFalta: 'Ingreso con calzado no normado o punta de acero', impacto: 'MEDIO' },
];

export function ConfigReglasPage() {
  const [eppCatalogo, setEppCatalogo] = useState<EPPItem[]>(EPP_CATALOGO_INICIAL);
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
  const [showAddCamMenu, setShowAddCamMenu] = useState<boolean>(false);
  const [showAddRuleModal, setShowAddRuleModal] = useState<boolean>(false);

  // Formulario de Nueva Regla
  const [nuevaRegla, setNuevaRegla] = useState({
    nombre: '',
    slot: 'cabeza' as EPPItem['slot'],
    codigoFalta: '',
    descripcionFalta: '',
    impacto: 'MEDIO' as EPPItem['impacto']
  });

  const activeAmbiente = ambientes.find((a) => a.id === selectedAmbienteId) || ambientes[0];

  // Obtener cámaras no asignadas a NINGÚN ambiente o al ambiente actual
  const camarasAsignadasEnTodos = ambientes.flatMap(a => a.camaras);
  const camarasSinAsignar = CAMARAS_DISPONIBLES_GLOBAL.filter(c => !camarasAsignadasEnTodos.includes(c));

  // Asignar Cámara
  const handleAddCamara = (camaraNombre: string) => {
    setAmbientes(prev => prev.map(amb => {
      if (amb.id !== selectedAmbienteId) return amb;
      return { ...amb, camaras: [...amb.camaras, camaraNombre] };
    }));
    setShowAddCamMenu(false);
  };

  // Desasignar Cámara
  const handleRemoveCamara = (camaraNombre: string) => {
    setAmbientes(prev => prev.map(amb => {
      if (amb.id !== selectedAmbienteId) return amb;
      return { ...amb, camaras: amb.camaras.filter(c => c !== camaraNombre) };
    }));
  };

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

  // Cargar Protocolo de Seguridad (Simulación de exportación a Python)
  const handleCargarProtocoloPython = () => {
    const configExport = {
      ambiente: activeAmbiente.nombre,
      camaras_rtsp: activeAmbiente.camaras,
      reglas_activas: eppCatalogo.filter(item => activeAmbiente.eppRequerido[item.id]).map(item => ({
        codigo: item.codigoFalta,
        epp: item.nombre,
        impacto: item.impacto,
        descripcion: item.descripcionFalta
      }))
    };
    
    console.log("Generando Script/Protocolo Python:", configExport);
    alert(`Protocolo de Seguridad generado con éxito para Python (${activeAmbiente.nombre}).\nCámaras vinculadas: ${activeAmbiente.camaras.length}`);
  };

  // Agregar Nueva Regla / Categoría por el Administrador
  const handleCrearNuevaRegla = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaRegla.nombre || !nuevaRegla.codigoFalta) return;

    const newId = `custom-${Date.now()}`;
    const nuevoItem: EPPItem = {
      id: newId,
      nombre: nuevaRegla.nombre,
      slot: nuevaRegla.slot,
      icono: '🛡️',
      codigoFalta: nuevaRegla.codigoFalta,
      descripcionFalta: nuevaRegla.descripcionFalta,
      impacto: nuevaRegla.impacto
    };

    setEppCatalogo(prev => [...prev, nuevoItem]);
    // Activar por defecto en el ambiente actual
    toggleEPP(newId);
    setShowAddRuleModal(false);
    setNuevaRegla({ nombre: '', slot: 'cabeza', codigoFalta: '', descripcionFalta: '', impacto: 'MEDIO' });
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
                    ? 'bg-gray-800 border-emerald-500 text-white shadow-lg'
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
                  <span className="truncate">{amb.camaras.join(', ') || 'Sin cámaras'}</span>
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
            Los cambios aplicarán a todas las cámaras asignadas a esta área.
          </p>
        </div>
      </aside>

      {/* 2. Panel Central Contenido Principal */}
      <main className="flex-1 p-6 overflow-y-auto space-y-8">
        
        {/* Encabezado del Área y Botón de Carga Python */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-800 pb-4 gap-4">
          <div>
            <h1 className="text-xl font-bold text-white uppercase tracking-wide">
              Área: <span className="text-emerald-400">{activeAmbiente.nombre}</span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Gestión de dispositivos de visión artificial y reglas normativas.
            </p>
          </div>

          <button
            onClick={handleCargarProtocoloPython}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded font-bold text-xs transition-colors shadow-lg shadow-indigo-950/40"
          >
            <FileCode className="w-4 h-4 text-indigo-200" />
            <span>Cargar Protocolo de Seguridad (Python)</span>
          </button>
        </div>

        {/* SECCIÓN 1: Gestión y Asignación de Cámaras por Área */}
        <div className="bg-[#16181e] border border-gray-800 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400" />
              Cámaras Asignadas a esta Área ({activeAmbiente.camaras.length})
            </h3>

            {/* Menú Desplegable Añadir Cámara */}
            <div className="relative">
              <button
                onClick={() => setShowAddCamMenu(!showAddCamMenu)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Cámara</span>
              </button>

              {showAddCamMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded shadow-xl z-50 p-2 space-y-1">
                  <p className="text-[10px] text-gray-400 uppercase font-bold px-2 py-1">Cámaras Disponibles:</p>
                  {camarasSinAsignar.length === 0 ? (
                    <p className="text-xs text-gray-500 p-2 italic">No hay cámaras libres</p>
                  ) : (
                    camarasSinAsignar.map(cam => (
                      <button
                        key={cam}
                        onClick={() => handleAddCamara(cam)}
                        className="w-full text-left text-xs p-2 text-gray-200 hover:bg-gray-800 rounded transition-colors flex justify-between items-center"
                      >
                        <span>{cam}</span>
                        <Plus className="w-3 h-3 text-emerald-400" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tabla de Cámaras Asignadas */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-900/80 text-gray-400 uppercase text-[10px] border-b border-gray-800">
                  <th className="p-2">Identificador / Nombre Cámara</th>
                  <th className="p-2">Estado Transmisión</th>
                  <th className="p-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {activeAmbiente.camaras.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-gray-500 text-xs italic">
                      No hay cámaras asignadas a esta área. Haga clic en "Añadir Cámara".
                    </td>
                  </tr>
                ) : (
                  activeAmbiente.camaras.map((cam) => (
                    <tr key={cam} className="hover:bg-gray-900/40">
                      <td className="p-2 font-semibold text-gray-200">{cam}</td>
                      <td className="p-2">
                        <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded font-bold">
                          ONLINE (RTSP)
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <button
                          onClick={() => handleRemoveCamara(cam)}
                          className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-950/30 transition-colors"
                          title="Desasignar Cámara"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECCIÓN 2: Avatar / Loadout de EPP */}
        <div className="flex justify-center">
          <div className="relative w-80 h-[420px] bg-[#12141c] border border-gray-800 rounded-2xl flex flex-col items-center justify-between p-4 shadow-2xl">
            <div className="w-full space-y-2 z-10">
              {eppCatalogo.map((item) => {
                const active = !!activeAmbiente.eppRequerido[item.id];
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleEPP(item.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all ${
                      active
                        ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'bg-gray-900/80 border-gray-800 text-gray-500 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{item.icono}</span>
                      <div className="text-left">
                        <p className="text-xs font-bold leading-tight">{item.nombre}</p>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wider">{item.slot}</p>
                      </div>
                    </div>

                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                        active ? 'bg-emerald-500 border-emerald-400 text-black' : 'border-gray-700 bg-gray-800'
                      }`}
                    >
                      {active && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: Tabla de Catálogo de Faltas + Botón de Añadir Regla Adicional */}
        <div className="bg-[#16181e] border border-gray-800 rounded-lg p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> 
              Catálogo de Faltas e Infracciones Configuradas
            </h3>
            
            {/* Espacio Libre Admin: Botón Agregar Regla Adicional */}
            <button
              onClick={() => setShowAddRuleModal(true)}
              className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded text-xs font-bold transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Agregar Regla / Categoría</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-900/90 text-gray-400 uppercase text-[10px] border-b border-gray-800">
                  <th className="p-2.5">Estado</th>
                  <th className="p-2.5">Código Falta</th>
                  <th className="p-2.5">Equipo (EPP)</th>
                  <th className="p-2.5">Descripción de Infracción</th>
                  <th className="p-2.5 text-center">Nivel Impacto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {eppCatalogo.map((item) => {
                  const active = !!activeAmbiente.eppRequerido[item.id];
                  return (
                    <tr 
                      key={item.codigoFalta} 
                      className={`transition-colors ${active ? 'bg-transparent text-gray-200' : 'bg-gray-950/40 text-gray-600'}`}
                    >
                      <td className="p-2.5">
                        <span className={`w-2 h-2 rounded-full inline-block ${active ? 'bg-emerald-500' : 'bg-gray-700'}`} />
                      </td>
                      <td className="p-2.5 font-mono text-indigo-400 font-bold text-[11px]">
                        {item.codigoFalta}
                      </td>
                      <td className="p-2.5 font-semibold flex items-center gap-1.5">
                        <span>{item.icono}</span>
                        <span>{item.nombre}</span>
                      </td>
                      <td className="p-2.5 text-gray-400 text-[11px]">
                        {item.descripcionFalta}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold uppercase ${
                          !active ? 'bg-gray-800 text-gray-500' :
                          item.impacto === 'CRÍTICO' ? 'bg-red-950/80 text-red-400 border border-red-500/30' :
                          item.impacto === 'ALTO' ? 'bg-amber-950/80 text-amber-400 border border-amber-500/30' :
                          'bg-blue-950/80 text-blue-400 border border-blue-500/30'
                        }`}>
                          {active ? item.impacto : 'INACTIVO'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal para Agregar Reglas Adicionales (Administrador) */}
      {showAddRuleModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-[#16181e] border border-gray-700 rounded-lg p-5 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-400" /> Crear Nueva Regla / Infracción
              </h3>
              <button onClick={() => setShowAddRuleModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCrearNuevaRegla} className="space-y-3 text-xs">
              <div>
                <label className="text-gray-400 block mb-1">Nombre del Equipo / Regla:</label>
                <input 
                  type="text" 
                  required
                  value={nuevaRegla.nombre} 
                  onChange={e => setNuevaRegla({...nuevaRegla, nombre: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                  placeholder="Ej. Protección Facial / Careta"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-400 block mb-1">Código de Falta:</label>
                  <input 
                    type="text" 
                    required
                    value={nuevaRegla.codigoFalta} 
                    onChange={e => setNuevaRegla({...nuevaRegla, codigoFalta: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono"
                    placeholder="ERR-EPP-07"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Nivel Impacto:</label>
                  <select 
                    value={nuevaRegla.impacto}
                    onChange={e => setNuevaRegla({...nuevaRegla, impacto: e.target.value as EPPItem['impacto']})}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                  >
                    <option value="CRÍTICO">CRÍTICO</option>
                    <option value="ALTO">ALTO</option>
                    <option value="MEDIO">MEDIO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Descripción de la Infracción:</label>
                <textarea 
                  value={nuevaRegla.descripcionFalta} 
                  onChange={e => setNuevaRegla({...nuevaRegla, descripcionFalta: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white h-20"
                  placeholder="Detalle de la falta detectada..."
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold p-2.5 rounded text-white transition-colors"
              >
                Guardar Regla Adicional
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}