import React, { useState } from 'react';
import { FileText, Calendar, Building2, Eye, Download, ShieldCheck } from 'lucide-react';
import { ReportePDFModal } from '../components/ReportePDFModal'; // Ajusta la ruta del modal según tu estructura

export function ReportesPage() {
  // Estados para la parametrización del reporte
  const [fechaInicio, setFechaInicio] = useState('2026-09-01');
  const [fechaFin, setFechaFin] = useState('2026-09-06');
  const [ambientes, setAmbientes] = useState('Lab. Química 1 y 2 / Lab. Física 1');
  const [campus, setCampus] = useState('Arequipa (Av. Parra)');
  const [responsable, setResponsable] = useState('Comité de Seguridad y Salud en el Trabajo');
  
  // Estado para controlar la visibilidad del modal de vista previa en PDF
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Generador de ID y fecha actual para el reporte
  const datosReporteConfigurados = {
    reporteId: 'RPT-2026-SST-089',
    fechaEmision: '06/09/2026',
    horaEmision: '22:15 hrs',
    periodoInicio: fechaInicio.split('-').reverse().join('/'),
    periodoFin: fechaFin.split('-').reverse().join('/'),
    ambientesClave: ambientes,
    responsable: responsable,
    campus: campus
  };

  return (
    <div className="flex flex-1 flex-col h-full bg-[#0d0e12] text-white p-6 overflow-y-auto space-y-6">
      {/* Encabezado Principal */}
      <div className="border-b border-gray-800 pb-4">
        <h1 className="text-2xl font-bold uppercase tracking-wide text-white flex items-center gap-2">
          <FileText className="w-7 h-7 text-red-500" /> Generador de Reportes SST
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Parametrice las fechas y ambientes clave para generar y previsualizar el informe oficial con estándar UTP y sellado Blockchain.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Configuración del Reporte */}
        <div className="lg:col-span-1 bg-[#16181e] p-5 rounded-lg border border-gray-800 space-y-4">
          <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider border-b border-gray-800 pb-2">
            Parámetros del Encabezado
          </h2>

          {/* Rango de Fechas */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Rango de Evaluado:
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-gray-500">Desde:</span>
                <input 
                  type="date" 
                  value={fechaInicio} 
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-gray-200 p-2 rounded focus:border-red-500 focus:outline-none"
                />
              </div>
              <div>
                <span className="text-[10px] text-gray-500">Hasta:</span>
                <input 
                  type="date" 
                  value={fechaFin} 
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-gray-200 p-2 rounded focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Ambientes Clave */}
          <div className="space-y-1">
            <label className="text-xs text-gray-400 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Ambientes Clave:
            </label>
            <input 
              type="text" 
              value={ambientes} 
              onChange={(e) => setAmbientes(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-gray-200 p-2 rounded text-xs focus:border-red-500 focus:outline-none"
              placeholder="Ej: Lab. Química 1 y 2"
            />
          </div>

          {/* Sede / Campus */}
          <div className="space-y-1">
            <label className="text-xs text-gray-400">Campus / Sede:</label>
            <input 
              type="text" 
              value={campus} 
              onChange={(e) => setCampus(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-gray-200 p-2 rounded text-xs focus:border-red-500 focus:outline-none"
            />
          </div>

          {/* Responsable SST */}
          <div className="space-y-1">
            <label className="text-xs text-gray-400">Responsable SST:</label>
            <input 
              type="text" 
              value={responsable} 
              onChange={(e) => setResponsable(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-gray-200 p-2 rounded text-xs focus:border-red-500 focus:outline-none"
            />
          </div>

          {/* Botones de Acción */}
          <div className="pt-3 space-y-2">
            <button 
              onClick={() => setShowPreviewModal(true)}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold p-2.5 rounded text-xs transition-colors shadow-lg shadow-red-950/40"
            >
              <Eye className="w-4 h-4" />
              <span>Previsualizar PDF (Formato UTP)</span>
            </button>
          </div>
        </div>

        {/* Tarjeta Informativa de Estándar Documental */}
        <div className="lg:col-span-2 bg-[#16181e] p-6 rounded-lg border border-gray-800 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wide">
                Vista Previa del Documento Oficial UTP
              </h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              El informe generado incorporará automáticamente los encabezados institucionales de la <strong className="text-white">Universidad Tecnológica del Perú</strong>, métricas de cumplimiento acumulado del rango seleccionado, la bitácora criptográfica de incidencias y el sello digital inmutable registrado en Blockchain.
            </p>

            <div className="bg-gray-900/80 p-4 rounded border border-gray-800 text-xs space-y-2">
              <div className="flex justify-between border-b border-gray-800 pb-1.5">
                <span className="text-gray-400">ID del Reporte:</span>
                <span className="font-mono text-indigo-400 font-bold">{datosReporteConfigurados.reporteId}</span>
              </div>
              <div className="flex justify-between border-b border-gray-800 pb-1.5">
                <span className="text-gray-400">Rango de Evaluación:</span>
                <span className="text-gray-200">{datosReporteConfigurados.periodoInicio} al {datosReporteConfigurados.periodoFin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Ambientes Evaluados:</span>
                <span className="text-emerald-400 font-semibold">{datosReporteConfigurados.ambientesClave}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setShowPreviewModal(true)}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 font-semibold px-4 py-2 rounded text-xs transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Abrir para Imprimir / Guardar PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal / PDF Preview Viewer */}
      <ReportePDFModal 
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        datosReporte={datosReporteConfigurados}
      />
    </div>
  );
}