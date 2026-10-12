import React, { useEffect, useState } from 'react';
import { 
  Shield, Camera, Check, AlertCircle, AlertTriangle, 
  Plus, Trash2, FileCode, PlusCircle, X 
} from 'lucide-react';
import { authService } from '../../services/authService';
import { reglasLabService, type CameraSummary, type LaboratoryType, type RulesConfiguration, type SafetyEquipment, type Workshop } from '../../services/reglasLabService';

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
  id: number;
  nombre: string;
  laboratoryType: LaboratoryType;
  camaras: CameraSummary[];
  eppRequerido: Record<string, boolean>;
}

const mapEquipment = (item: SafetyEquipment): EPPItem => ({
  id: item.id,
  nombre: item.name,
  slot: item.slot as EPPItem['slot'],
  icono: item.icon,
  codigoFalta: item.missing_code,
  descripcionFalta: item.missing_description,
  impacto: item.impact,
});

const mapWorkshop = (workshop: Workshop): AmbienteConfig => ({
  id: workshop.id,
  nombre: workshop.name,
  laboratoryType: workshop.laboratory_type,
  camaras: workshop.cameras,
  eppRequerido: Object.fromEntries(workshop.required_equipment_ids.map((id) => [id, true])),
});

const mapConfiguration = (configuration: RulesConfiguration) => ({
  workshops: configuration.workshops.map(mapWorkshop),
  catalog: configuration.catalog.map(mapEquipment),
});

export function ConfigReglasPage() {
  const [eppCatalogo, setEppCatalogo] = useState<EPPItem[]>([]);
  const [ambientes, setAmbientes] = useState<AmbienteConfig[]>([]);
  const [availableCameras, setAvailableCameras] = useState<CameraSummary[]>([]);
  const [selectedAmbienteId, setSelectedAmbienteId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showAddCamMenu, setShowAddCamMenu] = useState<boolean>(false);
  const [showAddRuleModal, setShowAddRuleModal] = useState<boolean>(false);
  const [showAddWorkshopModal, setShowAddWorkshopModal] = useState(false);
  const [newWorkshopName, setNewWorkshopName] = useState('');
  const [newWorkshopArea, setNewWorkshopArea] = useState<LaboratoryType>('QUIMICA');

  // Formulario de Nueva Regla
  const [nuevaRegla, setNuevaRegla] = useState({
    nombre: '',
    slot: 'cabeza' as EPPItem['slot'],
    codigoFalta: '',
    descripcionFalta: '',
    impacto: 'MEDIO' as EPPItem['impacto']
  });

  const activeAmbiente = ambientes.find((a) => a.id === selectedAmbienteId) ?? ambientes[0];
  const currentUser = authService.getCurrentUser();
  const canCreateWorkshops = currentUser?.role === 'ADMINISTRADOR';
  const camarasSinAsignar = activeAmbiente
    ? availableCameras.filter(camera => camera.laboratory_type === activeAmbiente.laboratoryType)
    : [];

  const loadConfiguration = async () => {
    const configuration = await reglasLabService.getConfiguration();
    const mapped = mapConfiguration(configuration);
    setAmbientes(mapped.workshops);
    setEppCatalogo(mapped.catalog);
    setAvailableCameras(configuration.available_cameras);
    setSelectedAmbienteId(current => mapped.workshops.some(workshop => workshop.id === current)
      ? current
      : mapped.workshops[0]?.id ?? null);
  };

  useEffect(() => {
    let isCurrent = true;
    const load = async () => {
      try {
        const configuration = await reglasLabService.getConfiguration();
        if (!isCurrent) return;
        const mapped = mapConfiguration(configuration);
        setAmbientes(mapped.workshops);
        setEppCatalogo(mapped.catalog);
        setAvailableCameras(configuration.available_cameras);
        setSelectedAmbienteId(mapped.workshops[0]?.id ?? null);
      } catch (reason) {
        if (isCurrent) setError(reason instanceof Error ? reason.message : 'No se pudo cargar la configuración.');
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };
    void load();
    return () => { isCurrent = false; };
  }, []);

  const saveWorkshopConfiguration = async (cameraIds: number[], requiredEquipmentIds: string[]) => {
    if (!activeAmbiente) return;
    setIsSaving(true);
    setError('');
    try {
      await reglasLabService.saveWorkshopConfiguration(activeAmbiente.id, {
        camera_ids: cameraIds,
        required_equipment_ids: requiredEquipmentIds,
      });
      await loadConfiguration();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar la configuración.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCamara = (cameraId: number) => {
    if (!activeAmbiente) return;
    void saveWorkshopConfiguration(
      [...activeAmbiente.camaras.map(camera => camera.id), cameraId],
      Object.keys(activeAmbiente.eppRequerido).filter(id => activeAmbiente.eppRequerido[id]),
    );
    setShowAddCamMenu(false);
  };

  const handleRemoveCamara = (cameraId: number) => {
    if (!activeAmbiente) return;
    void saveWorkshopConfiguration(
      activeAmbiente.camaras.filter(camera => camera.id !== cameraId).map(camera => camera.id),
      Object.keys(activeAmbiente.eppRequerido).filter(id => activeAmbiente.eppRequerido[id]),
    );
  };

  const toggleEPP = (eppId: string) => {
    if (!activeAmbiente) return;
    const required = Object.keys(activeAmbiente.eppRequerido)
      .filter(id => activeAmbiente.eppRequerido[id] && id !== eppId);
    if (!activeAmbiente.eppRequerido[eppId]) required.push(eppId);
    void saveWorkshopConfiguration(activeAmbiente.camaras.map(camera => camera.id), required);
  };

  const handleCreateWorkshop = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    try {
      const workshop = await reglasLabService.createWorkshop({ name: newWorkshopName.trim(), laboratory_type: newWorkshopArea });
      await loadConfiguration();
      setSelectedAmbienteId(workshop.id);
      setNewWorkshopName('');
      setShowAddWorkshopModal(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo crear el taller.');
    }
  };

  const handleCargarProtocoloPython = () => {
    if (!activeAmbiente) return;
    const configExport = {
      ambiente: activeAmbiente.nombre,
      laboratorio: activeAmbiente.laboratoryType,
      camaras: activeAmbiente.camaras.map(camera => ({ id: camera.id, nombre: camera.name })),
      reglas_activas: eppCatalogo.filter(item => activeAmbiente.eppRequerido[item.id]).map(item => ({
        codigo: item.codigoFalta,
        epp: item.nombre,
        impacto: item.impacto,
        descripcion: item.descripcionFalta
      }))
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(configExport, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `protocolo-${activeAmbiente.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCrearNuevaRegla = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nuevaRegla.nombre.trim() || !nuevaRegla.codigoFalta.trim()) return;
    const newId = `custom-${Date.now()}`;
    setError('');
    try {
      const equipment = await reglasLabService.createEquipment({
        id: newId,
        name: nuevaRegla.nombre.trim(),
        slot: nuevaRegla.slot,
        icon: '🛡️',
        missing_code: nuevaRegla.codigoFalta.trim(),
        missing_description: nuevaRegla.descripcionFalta.trim() || nuevaRegla.nombre.trim(),
        impact: nuevaRegla.impacto,
        model_class: null,
      });
      setEppCatalogo(current => [...current, mapEquipment(equipment)]);
      if (activeAmbiente) {
        await saveWorkshopConfiguration(
          activeAmbiente.camaras.map(camera => camera.id),
          [...Object.keys(activeAmbiente.eppRequerido).filter(id => activeAmbiente.eppRequerido[id]), newId],
        );
      }
      setShowAddRuleModal(false);
      setNuevaRegla({ nombre: '', slot: 'cabeza', codigoFalta: '', descripcionFalta: '', impacto: 'MEDIO' });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo crear el equipo de seguridad.');
    }
  };

  if (isLoading) {
    return <div className="flex flex-1 items-center justify-center bg-[#0d0e12] text-sm text-gray-400">Cargando reglas del laboratorio...</div>;
  }

  if (!activeAmbiente) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-[#0d0e12] p-6 text-white">
        <Shield className="h-8 w-8 text-emerald-400" />
        <h1 className="text-lg font-bold">No hay talleres configurados</h1>
        <p className="text-sm text-gray-400">Crea un taller para asignar cámaras reales y definir el EPP obligatorio.</p>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {canCreateWorkshops && (
          <form onSubmit={handleCreateWorkshop} className="flex flex-wrap items-center justify-center gap-2">
            <input required value={newWorkshopName} onChange={event => setNewWorkshopName(event.target.value)} className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm" placeholder="Nombre del taller" />
            <select value={newWorkshopArea} onChange={event => setNewWorkshopArea(event.target.value as LaboratoryType)} className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm">
              <option value="QUIMICA">Química</option>
              <option value="FISICA">Física</option>
            </select>
            <button disabled={isSaving} className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold disabled:opacity-50">Crear taller</button>
          </form>
        )}
      </main>
    );
  }

  return (
    <div className="flex flex-1 h-full bg-[#0d0e12] text-white overflow-hidden">
      {/* 1. Panel Izquierdo: Selección de Ambientes */}
      <aside className="w-80 border-r border-gray-800 bg-[#16181e] p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Talleres Configurados
            </h2>
            </div>
            {canCreateWorkshops && <button onClick={() => setShowAddWorkshopModal(true)} className="rounded border border-gray-700 p-1.5 text-emerald-400 hover:bg-gray-800" title="Crear taller"><Plus className="h-4 w-4" /></button>}
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
                  <span className="truncate">{amb.camaras.map(camera => camera.name).join(', ') || 'Sin cámaras'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1 rounded border border-gray-800 bg-gray-900/80 p-3 text-xs text-gray-400">
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
              Taller: <span className="text-emerald-400">{activeAmbiente.nombre}</span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {activeAmbiente.laboratoryType === 'QUIMICA' ? 'Química' : 'Física'} · Gestión de cámaras y EPP obligatorio.
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

        {error && <p role="alert" className="rounded border border-red-900 bg-red-950/30 px-3 py-2 text-sm text-red-300">{error}</p>}
        {isSaving && <p className="text-xs text-emerald-400">Guardando cambios...</p>}

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
                disabled={isSaving}
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
                        key={cam.id}
                        onClick={() => handleAddCamara(cam.id)}
                        className="w-full text-left text-xs p-2 text-gray-200 hover:bg-gray-800 rounded transition-colors flex justify-between items-center"
                      >
                        <span>{cam.name}</span>
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
                    <tr key={cam.id} className="hover:bg-gray-900/40">
                      <td className="p-2 font-semibold text-gray-200">{cam.name}</td>
                      <td className="p-2">
                        <span className={`rounded border px-2 py-0.5 text-[9px] font-bold ${cam.status === 'online' ? 'border-emerald-500/30 bg-emerald-950/80 text-emerald-400' : 'border-gray-700 bg-gray-900 text-gray-400'}`}>
                          {cam.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <button
                          onClick={() => handleRemoveCamara(cam.id)}
                          disabled={isSaving}
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
            {canCreateWorkshops && <button
              onClick={() => setShowAddRuleModal(true)}
              className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded text-xs font-bold transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Agregar Regla / Categoría</span>
            </button>}
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
      {showAddWorkshopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form onSubmit={handleCreateWorkshop} className="w-full max-w-md space-y-4 rounded-lg border border-gray-700 bg-[#16181e] p-5">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <h3 className="text-sm font-bold text-white">Crear taller</h3>
              <button type="button" onClick={() => setShowAddWorkshopModal(false)} className="text-gray-400 hover:text-white" aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </div>
            <label className="block space-y-1 text-xs text-gray-400">
              <span>Nombre</span>
              <input required maxLength={120} value={newWorkshopName} onChange={event => setNewWorkshopName(event.target.value)} className="w-full rounded border border-gray-700 bg-gray-900 p-2 text-white" placeholder="Ej. Taller de Soldadura" />
            </label>
            <label className="block space-y-1 text-xs text-gray-400">
              <span>Área</span>
              <select value={newWorkshopArea} onChange={event => setNewWorkshopArea(event.target.value as LaboratoryType)} className="w-full rounded border border-gray-700 bg-gray-900 p-2 text-white">
                <option value="QUIMICA">Química</option>
                <option value="FISICA">Física</option>
              </select>
            </label>
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            <button disabled={isSaving} className="w-full rounded bg-emerald-600 p-2 text-xs font-bold text-white disabled:opacity-50">Crear y configurar</button>
          </form>
        </div>
      )}
    </div>
  );
}