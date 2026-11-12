import { useEffect, useRef, useState } from 'react';
import type { EquipmentInfo, OverlayMessage } from '../../hooks/useCameraOverlay';
import { SEVERITY_HEX, tagTextColor } from '../../services/severity';

/** Dibuja los recuadros del motor sobre un video mostrado con object-contain. */
export function OverlayCanvas({ message, equipment }: { message: OverlayMessage | null; equipment: EquipmentInfo }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!container) return;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0].contentRect;
      setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.width * ratio);
    canvas.height = Math.round(size.height * ratio);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, size.width, size.height);
    if (!message?.frame_size || !message.people.length) return;

    // Misma geometría que object-contain: escala uniforme y bandas centradas.
    const [frameWidth, frameHeight] = message.frame_size;
    const scale = Math.min(size.width / frameWidth, size.height / frameHeight);
    const offsetX = (size.width - frameWidth * scale) / 2;
    const offsetY = (size.height - frameHeight * scale) / 2;
    const fontSize = Math.max(10, Math.min(14, size.width / 45));
    context.font = `600 ${fontSize}px system-ui, sans-serif`;
    context.textBaseline = 'top';

    for (const person of message.people) {
      const x = offsetX + person.box[0] * scale;
      const y = offsetY + person.box[1] * scale;
      const width = (person.box[2] - person.box[0]) * scale;
      const height = (person.box[3] - person.box[1]) * scale;

      // Recuadro de cada persona presente; más grueso si hay una falta.
      context.lineWidth = person.state === 'INCUMPLE' ? 3 : 2;
      context.strokeStyle = person.color;
      context.strokeRect(x, y, width, height);

      // Etiqueta con texto, no solo color.
      const title = person.state === 'EN_RIESGO'
        ? `P${person.track_id} · ${person.label} ${Math.round(person.progress * 100)}%`
        : `P${person.track_id} · ${person.label}`;
      drawTag(context, title, x, Math.max(0, y - fontSize - 6), person.color, fontSize, tagTextColor(person.color));

      // Esquina superior derecha: icono y código de cada EPP faltante o en verificación.
      const tags = [
        // Cada falta con el color de su gravedad (una persona puede tener una grave y una leve).
        ...person.missing.map(item => ({ item, color: SEVERITY_HEX[item.severity ?? ''] ?? person.color })),
        ...person.at_risk.map(item => ({ item, color: '#38bdf8' })),
      ];
      let tagY = y + 2;
      for (const { item, color } of tags) {
        const info = equipment[item.equipment_id];
        // EPP mal puesto (falta leve): sufijo corto en la etiqueta del recuadro.
        const detail = item.detail === 'BATA_ABIERTA' ? ' abierta' : item.detail === 'LENTES_MAL_PUESTOS' ? ' fuera' : '';
        const text = `${info?.icon ?? '⚠'} ${item.rule_code ?? item.equipment_id}${detail}`;
        const tagWidth = context.measureText(text).width + 8;
        drawTag(context, text, Math.max(x, x + width - tagWidth - 2), tagY, color, fontSize, tagTextColor(color));
        tagY += fontSize + 6;
      }
    }
  }, [message, size, equipment]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}

function drawTag(context: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, fontSize: number,
  textColor = '#ffffff') {
  const width = context.measureText(text).width + 8;
  context.fillStyle = color;
  context.globalAlpha = 0.85;
  context.fillRect(x, y, width, fontSize + 4);
  context.globalAlpha = 1;
  context.fillStyle = textColor;
  context.fillText(text, x + 4, y + 2);
}
