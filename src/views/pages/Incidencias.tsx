import React, { useState } from 'react';
import { 
  Calendar, 
  Filter, 
  BarChart3, 
  TrendingUp, 
  AlertOctagon, 
  FileSpreadsheet, 
  Building2, 
  ShieldAlert 
} from 'lucide-react';

interface IncidenteHistorico {
  id: string;
  fecha: string;
  hora: string;
  ambiente: string;
  camara: string;
  tipo: string;
  gravedad: 'Grave' | 'Moderada' | 'Leve';
  estado: 'Atendido' | 'En Revisión' | 'Pendiente';
}

const MOCK_HISTORIAL: IncidenteHistorico[] = [
  { id: 'INC-1001', fecha: '2026-09-15', hora: '10:14', ambiente: 'Taller de Soldadura', camara: 'CAM-01', tipo: 'Sin Casco', gravedad: 'Grave', estado: 'Atendido' },
  { id: 'INC-1002', fecha: '2026-09-15', hora: '11:30', ambiente: 'Laboratorio de Química', camara: 'CAM-02', tipo: 'Sin Guantes', gravedad: 'Leve', estado: 'Atendido' },
  { id: 'INC-1003', fecha: '2026-09-14', hora: '08:45', ambiente: 'Taller de Soldadura', camara: 'CAM-03', tipo: 'Sin Chaleco', gravedad: 'Moderada', estado: 'En Revisión' },
  { id: 'INC-1004', fecha: '2026-09-12', hora: '16:20', ambiente: 'Almacén Central', camara: 'CAM-04', tipo: 'Sin Botas', gravedad: 'Moderada', estado: 'Atendido' },
  { id: 'INC-1005', fecha: '2026-09-10', hora: '14:05', ambiente: 'Taller de Soldadura', camara: 'CAM-01', tipo: 'Sin Arnés', gravedad: 'Grave', estado: 'Pendiente' },
  { id: 'INC-1006', fecha: '2026-09-08', hora: '09:12', ambiente: 'Laboratorio de Química', camara: 'CAM-02', tipo: 'Sin Lentes', gravedad: 'Moderada', estado: 'Atendido' },
];

export function IncidenciasPage() {
  const [fechaInicio, setFechaInicio] = useState('2026-09-01');
  const [fechaFin, setFechaFin] = useState('2026-09-17');
  const [ambienteFiltro, setAmbienteFiltro] = useState('TODOS');

  const datosFiltrados = MOCK_HISTORIAL.filter((item) => {
    const cumpleAmbiente = ambienteFiltro === 'TODOS' || item.ambiente === ambienteFiltro;
    const cumpleFecha = item.fecha >= fechaInicio && item.fecha <= fechaFin;
    return cumpleAmbiente && cumpleFecha;
  });

  const totalIncidentes = datosFiltrados.length;
  const totalGraves = datosFiltrados.filter((i) => i.gravedad === 'Grave').length;
  const totalModerados = datosFiltrados.filter((i) => i.gravedad === 'Moderada').length;
  const totalLeves = datosFiltrados.filter((i) => i.gravedad === 'Leve').length;

  return (
    <div className="flex flex-1 flex-col h-full bg-[#0d0e12] text-white p-6 overflow-y-auto space-y-6">
      
      {/* Encabezado y Filtros Globales */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wide text-white">
            Historial de Incidencias
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Registro acumulado de inobservancias de EPP para auditoría y toma de decisiones SST.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-[#16181e] p-2.5 rounded-lg border border-gray-800 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <input 
              type="date" 
              value={fechaInicio} 
              onChange={(e) => setFechaInicio(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-gray-200 px-2 py-1 rounded focus:outline-none"
            />
            <span className="text-gray-500">a</span>
            <input 
              type="date" 
              value={fechaFin} 
              onChange={(e) => setFechaFin(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-gray-200 px-2 py-1 rounded focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 border-l border-gray-700 pl-3">
            <Filter className="w-4 h-4 text-indigo-400" />
            <select 
              value={ambienteFiltro} 
              onChange={(e) => setAmbienteFiltro(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-gray-200 px-2 py-1 rounded focus:outline-none"
            >
              <option value="TODOS">Todos los Ambientes</option>
              <option value="Taller de Soldadura">Taller de Soldadura</option>
              <option value="Laboratorio de Química">Laboratorio de Química</option>
              <option value="Almacén Central">Almacén Central</option>
            </select>
          </div>

          <button className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1 rounded ml-auto transition-colors">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exportar Reporte</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#16181e] p-4 rounded-lg border border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase font-bold">Total Registros</p>
            <p className="text-2xl font-mono font-bold text-white mt-1">{totalIncidentes}</p>
          </div>
          <BarChart3 className="w-8 h-8 text-indigo-400 opacity-80" />
        </div>

        <div className="bg-[#16181e] p-4 rounded-lg border border-red-500/30 bg-red-950/10 flex items-center justify-between">
          <div>
            <p className="text-xs text-red-400 uppercase font-bold">Infracciones Graves</p>
            <p className="text-2xl font-mono font-bold text-red-400 mt-1">{totalGraves}</p>
          </div>
          <AlertOctagon className="w-8 h-8 text-red-500 opacity-80" />
        </div>

        <div className="bg-[#16181e] p-4 rounded-lg border border-amber-500/30 bg-amber-950/10 flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-400 uppercase font-bold">Infracciones Moderadas</p>
            <p className="text-2xl font-mono font-bold text-amber-400 mt-1">{totalModerados}</p>
          </div>
          <ShieldAlert className="w-8 h-8 text-amber-500 opacity-80" />
        </div>

        <div className="bg-[#16181e] p-4 rounded-lg border border-yellow-500/30 bg-yellow-950/10 flex items-center justify-between">
          <div>
            <p className="text-xs text-yellow-400 uppercase font-bold">Infracciones Leves</p>
            <p className="text-2xl font-mono font-bold text-yellow-400 mt-1">{totalLeves}</p>
          </div>
          <TrendingUp className="w-8 h-8 text-yellow-500 opacity-80" />
        </div>
      </div>

      {/* Reportes por Área y Tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#16181e] p-4 rounded-lg border border-gray-800 space-y-3">
          <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
              Acumulado por Ambiente
            </h3>
          </div>
          
          <div className="space-y-2.5 text-xs">
            <div>
              <div className="flex justify-between text-gray-300 mb-1">
                <span>Taller de Soldadura</span>
                <span className="font-mono text-emerald-400 font-bold">3 Incidentes (50%)</span>
              </div>
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[50%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-gray-300 mb-1">
                <span>Laboratorio de Química</span>
                <span className="font-mono text-emerald-400 font-bold">2 Incidentes (33%)</span>
              </div>
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[33%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-gray-300 mb-1">
                <span>Almacén Central</span>
                <span className="font-mono text-emerald-400 font-bold">1 Incidente (17%)</span>
              </div>
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[17%]" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#16181e] p-4 rounded-lg border border-gray-800 space-y-3">
          <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
              Tipos de Infracción Más Frecuentes
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-gray-900/80 rounded border border-gray-800 flex justify-between items-center">
              <span className="text-gray-300">Sin Casco</span>
              <span className="bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded border border-red-500/30">1</span>
            </div>
            <div className="p-2.5 bg-gray-900/80 rounded border border-gray-800 flex justify-between items-center">
              <span className="text-gray-300">Sin Arnés</span>
              <span className="bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded border border-red-500/30">1</span>
            </div>
            <div className="p-2.5 bg-gray-900/80 rounded border border-gray-800 flex justify-between items-center">
              <span className="text-gray-300">Sin Chaleco</span>
              <span className="bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded border border-amber-500/30">1</span>
            </div>
            <div className="p-2.5 bg-gray-900/80 rounded border border-gray-800 flex justify-between items-center">
              <span className="text-gray-300">Sin Guantes</span>
              <span className="bg-yellow-500/20 text-yellow-400 font-bold px-2 py-0.5 rounded border border-yellow-500/30">1</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla del Historial Registrado */}
      <div className="bg-[#16181e] rounded-lg border border-gray-800 overflow-hidden flex-1">
        <div className="p-3 bg-gray-900/60 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            Detalle de Infracciones Registradas ({datosFiltrados.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-gray-900/90 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Fecha / Hora</th>
                <th className="p-3">Ambiente / Cámara</th>
                <th className="p-3">Infracción Detectada</th>
                <th className="p-3">Nivel Gravedad</th>
                <th className="p-3">Estado SST</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {datosFiltrados.map((row) => (
                <tr key={row.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="p-3 font-mono text-indigo-400 font-semibold">{row.id}</td>
                  <td className="p-3 text-gray-300">{row.fecha} <span className="text-gray-500">({row.hora})</span></td>
                  <td className="p-3">
                    <p className="font-semibold text-gray-200">{row.ambiente}</p>
                    <p className="text-[10px] text-gray-500">{row.camara}</p>
                  </td>
                  <td className="p-3 font-medium text-white">{row.tipo}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      row.gravedad === 'Grave' 
                        ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                        : row.gravedad === 'Moderada'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    }`}>
                      {row.gravedad}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      row.estado === 'Atendido' 
                        ? 'bg-emerald-500/10 text-emerald-400' 
                        : row.estado === 'En Revisión'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-gray-800 text-gray-400'
                    }`}>
                      {row.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}