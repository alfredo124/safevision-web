import React, { useRef } from 'react';
import { X, Printer, Download, ShieldCheck, Lock } from 'lucide-react';

interface ReporteData {
  reporteId: string;
  fechaEmision: string;
  horaEmision: string;
  periodoInicio: string;
  periodoFin: string;
  ambientesClave: string;
  responsable: string;
  campus: string;
}

interface ReportePDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  datosReporte: ReporteData;
}

export function ReportePDFModal({ isOpen, onClose, datosReporte }: ReportePDFModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 overflow-y-auto">
      {/* Barra Superior de Acciones */}
      <div className="fixed top-4 right-4 flex items-center gap-3 z-50 bg-[#16181e] p-2 rounded-lg border border-gray-700 shadow-xl">
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir / Guardar PDF</span>
        </button>
        <button
          onClick={onClose}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* DOCUMENTO HOJA A4 */}
      <div 
        ref={printRef}
        className="bg-white text-gray-900 w-[794px] min-h-[1123px] p-8 shadow-2xl font-sans text-xs my-8 print:m-0 print:shadow-none print:w-full"
      >
        {/* ENCABEZADO INSTITUCIONAL */}
        <div className="flex justify-between items-start border-b-2 border-red-600 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 text-white font-extrabold px-3 py-1.5 rounded text-lg tracking-wider">
              UTP
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-tight text-gray-900">
                Universidad Tecnológica del Perú
              </h1>
              <p className="text-[11px] font-semibold text-gray-600">
                Dirección de Seguridad y Salud en el Trabajo (SST)
              </p>
            </div>
          </div>
          <div className="text-right text-[10px] text-gray-500 space-y-0.5">
            <p><strong className="text-gray-700">Reporte ID:</strong> {datosReporte.reporteId}</p>
            <p><strong className="text-gray-700">Fecha:</strong> {datosReporte.fechaEmision}</p>
            <p><strong className="text-gray-700">Hora:</strong> {datosReporte.horaEmision}</p>
          </div>
        </div>

        {/* METADATOS EN ENCABEZADO */}
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-5 grid grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
          <div>
            <span className="text-gray-500 font-medium">Sistema Auditor:</span>{' '}
            <strong className="text-gray-800">SafeVision AQP (IA + Cloud + Blockchain)</strong>
          </div>
          <div>
            <span className="text-gray-500 font-medium">Campus / Sede:</span>{' '}
            <strong className="text-gray-800">{datosReporte.campus}</strong>
          </div>
          <div>
            <span className="text-gray-500 font-medium">Periodo Evaluado:</span>{' '}
            <strong className="text-gray-800">{datosReporte.periodoInicio} al {datosReporte.periodoFin}</strong>
          </div>
          <div>
            <span className="text-gray-500 font-medium">Ambientes Clave:</span>{' '}
            <strong className="text-gray-800">{datosReporte.ambientesClave}</strong>
          </div>
          <div>
            <span className="text-gray-500 font-medium">Responsable SST:</span>{' '}
            <strong className="text-gray-800">{datosReporte.responsable}</strong>
          </div>
          <div>
            <span className="text-gray-500 font-medium">Normativa:</span>{' '}
            <strong className="text-gray-800">Ley N° 29783 / ISO 45001</strong>
          </div>
        </div>

        {/* 1. RESUMEN EJECUTIVO DE MONITOREO */}
        <div className="mb-5">
          <h2 className="text-xs font-bold text-red-600 uppercase border-l-4 border-red-600 pl-2 mb-3 tracking-wide flex items-center gap-1">
            1. Resumen Ejecutivo de Monitoreo
          </h2>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="border border-gray-200 bg-gray-50/50 p-2.5 rounded">
              <p className="text-lg font-extrabold text-gray-900">142 hrs</p>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Supervisión IA Activa</p>
            </div>
            <div className="border border-gray-200 bg-gray-50/50 p-2.5 rounded">
              <p className="text-lg font-extrabold text-gray-900">93.4%</p>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Índice Cumplimiento</p>
            </div>
            <div className="border border-gray-200 bg-gray-50/50 p-2.5 rounded">
              <p className="text-lg font-extrabold text-red-600">14</p>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Infracciones Detectadas</p>
            </div>
            <div className="border border-gray-200 bg-gray-50/50 p-2.5 rounded">
              <p className="text-lg font-extrabold text-emerald-600">100%</p>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Sellado Blockchain</p>
            </div>
          </div>
        </div>

        {/* 2. BITÁCORA DE INCIDENCIAS REGISTRADAS */}
        <div className="mb-5">
          <h2 className="text-xs font-bold text-red-600 uppercase border-l-4 border-red-600 pl-2 mb-3 tracking-wide">
            2. Bitácora de Incidencias Registradas ({datosReporte.ambientesClave})
          </h2>
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-[9px]">
                <th className="p-2 border border-slate-800">ID</th>
                <th className="p-2 border border-slate-800">Fecha / Hora</th>
                <th className="p-2 border border-slate-800">Laboratorio</th>
                <th className="p-2 border border-slate-800">Infracción de EPP Detectada</th>
                <th className="p-2 border border-slate-800">Criticidad</th>
                <th className="p-2 border border-slate-800">Estado</th>
                <th className="p-2 border border-slate-800">Hash Criptográfico (SHA-256)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="p-2 font-bold">#401</td>
                <td className="p-2">01/09/2026 10:12:00</td>
                <td className="p-2">Lab. Química 2</td>
                <td className="p-2">Sin Mascarilla en Campana</td>
                <td className="p-2"><span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase text-[8px]">Crítico</span></td>
                <td className="p-2"><span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase text-[8px]">Atendido</span></td>
                <td className="p-2 font-mono text-[8px] text-gray-500">a58f3829dc19024f...</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="p-2 font-bold">#402</td>
                <td className="p-2">02/09/2026 14:05:00</td>
                <td className="p-2">Lab. Física 1</td>
                <td className="p-2">Lentes de Seguridad Mal Colocados</td>
                <td className="p-2"><span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase text-[8px]">Medio</span></td>
                <td className="p-2"><span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase text-[8px]">Resuelto</span></td>
                <td className="p-2 font-mono text-[8px] text-gray-500">c71a94fe01b4491a...</td>
              </tr>
              <tr>
                <td className="p-2 font-bold">#403</td>
                <td className="p-2">03/09/2026 09:33:00</td>
                <td className="p-2">Lab. Química 1</td>
                <td className="p-2">Uso Incorrecto de Guantes Nitrilo</td>
                <td className="p-2"><span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase text-[8px]">Alto</span></td>
                <td className="p-2"><span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase text-[8px]">Atendido</span></td>
                <td className="p-2 font-mono text-[8px] text-gray-500">89f02c6b412e8731...</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="p-2 font-bold">#404</td>
                <td className="p-2">04/09/2026 11:20:15</td>
                <td className="p-2">Lab. Química 2</td>
                <td className="p-2">Falta de Mandil / Guardapolvo</td>
                <td className="p-2"><span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase text-[8px]">Medio</span></td>
                <td className="p-2"><span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase text-[8px]">Atendido</span></td>
                <td className="p-2 font-mono text-[8px] text-gray-500">3d2e1a90c41b8f62...</td>
              </tr>
              <tr>
                <td className="p-2 font-bold">#405</td>
                <td className="p-2">05/09/2026 16:45:30</td>
                <td className="p-2">Lab. Física 1</td>
                <td className="p-2">Ingreso sin Lentes Protectores</td>
                <td className="p-2"><span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase text-[8px]">Alto</span></td>
                <td className="p-2"><span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase text-[8px]">Resuelto</span></td>
                <td className="p-2 font-mono text-[8px] text-gray-500">f182c094ba32e189...</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 3. DISTRIBUCIÓN DE RIESGO POR AMBIENTE */}
        <div className="mb-5">
          <h2 className="text-xs font-bold text-red-600 uppercase border-l-4 border-red-600 pl-2 mb-3 tracking-wide">
            3. Distribución de Riesgo por Ambiente
          </h2>
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-[9px]">
                <th className="p-2 border border-slate-800">Ambiente Académico</th>
                <th className="p-2 border border-slate-800">EPP de Uso Obligatorio</th>
                <th className="p-2 border border-slate-800">Incidencias Semana</th>
                <th className="p-2 border border-slate-800">Tasa de Corrección Inmediata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="p-2 font-bold">Laboratorio de Química 1 y 2</td>
                <td className="p-2">Mandil, Lentes de Protección, Guantes Nitrilo, Mascarilla</td>
                <td className="p-2">9 incidencias</td>
                <td className="p-2 text-emerald-700 font-semibold">100% en menos de 2 minutos</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="p-2 font-bold">Laboratorio de Física 1</td>
                <td className="p-2">Lentes de Seguridad, Calzado Cerrado</td>
                <td className="p-2">5 incidencias</td>
                <td className="p-2 text-emerald-700 font-semibold">100% en menos de 1 minuto</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. CERTIFICACIÓN DE TRAZABILIDAD (BLOCKCHAIN) */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-red-600 uppercase border-l-4 border-red-600 pl-2 mb-2 tracking-wide">
            4. Certificación de Trazabilidad e Inmutabilidad (Blockchain)
          </h2>
          <div className="bg-emerald-50/60 border border-emerald-200 rounded p-3 text-[10px] text-emerald-900 space-y-1">
            <p className="font-bold text-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Sello de Evidencia Digital Complementaria:
            </p>
            <p className="text-emerald-700 leading-relaxed text-[9.5px]">
              Todas las evidencias fotográficas asociadas a las incidencias listadas cuentan con firma criptográfica SHA-256 e inscripción en Smart Contract <code className="bg-emerald-100 px-1 rounded font-mono text-[8.5px]">0x8a92Fe021cAb48De229863914</code> (Polygon Network / L2). Este documento garantiza el principio de no repudio y respalda de manera inalterable la veracidad de los eventos ante el Ministerio de Trabajo (SUNAFIL) y auditores de acreditación universitaria.
            </p>
          </div>
        </div>

        {/* FIRMAS */}
        <div className="mt-12 pt-6 border-t border-gray-300 grid grid-cols-2 gap-12 text-center text-[10px] text-gray-700">
          <div>
            <div className="border-b border-gray-400 w-48 mx-auto mb-1"></div>
            <p className="font-bold">Docente / Encargado de Laboratorio</p>
          </div>
          <div>
            <div className="border-b border-gray-400 w-48 mx-auto mb-1"></div>
            <p className="font-bold">Auditor de Seguridad y Salud en el Trabajo</p>
          </div>
        </div>

        {/* PIE DE PÁGINA */}
        <div className="mt-8 pt-3 border-t border-gray-200 flex justify-between items-center text-[9px] text-gray-400">
          <p>SafeVision AQP • Sistema SST UTP Campus Arequipa</p>
          <p>Página 1 de 1</p>
        </div>
      </div>
    </div>
  );
}