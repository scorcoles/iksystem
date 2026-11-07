// =========================================================================================
// Compartir: una foto de la carta como está ahora
// =========================================================================================
//
// Como en los otros experimentos: el botón de arriba a la derecha abre el menú de compartir
// del sistema con una foto del momento. Lo que se ve, tal cual, con un marco del color del
// fondo y, abajo, «IKSYSTEM #67 · VERTIK.NET». Donde no se puede compartir una imagen
// (Firefox de escritorio, por ejemplo), el botón no aparece.
//
// «info()» da el número de la carta que se ve.

import { COLORS } from './draw.js';

export function setupShare(canvas, render, info) {
  const button = document.querySelector('[data-share]');
  if (!button) return;

  const canShareImages = (() => {
    try {
      const probe = new File([new Uint8Array(1)], 'probe.png', { type: 'image/png' });
      return !!navigator.canShare?.({ files: [probe] });
    } catch {
      return false;
    }
  })();
  button.hidden = !canShareImages;
  if (!canShareImages) return;

  function snapshot() {
    render();
    const { seed } = info();
    const side = Math.min(canvas.width, canvas.height);
    const frame = Math.round(side * 0.05);
    const band = Math.round(side * 0.09);
    const out = document.createElement('canvas');
    out.width = canvas.width + frame * 2;
    out.height = canvas.height + frame + band;
    const o = out.getContext('2d');
    o.fillStyle = COLORS.page;
    o.fillRect(0, 0, out.width, out.height);
    o.drawImage(canvas, frame, frame);

    const size = Math.round(side * 0.022);
    o.strokeStyle = COLORS.lime;
    o.lineWidth = Math.max(1, Math.round(side * 0.0015));
    const lineY = canvas.height + frame + Math.round(band * 0.3);
    o.beginPath();
    o.moveTo(frame, lineY);
    o.lineTo(out.width - frame, lineY);
    o.stroke();
    o.font = `${size}px ui-monospace, Menlo, Consolas, monospace`;
    o.textBaseline = 'middle';
    o.fillStyle = COLORS.white;
    o.fillText(`IKSYSTEM #${seed} · VERTIK.NET`, frame, lineY + (out.height - lineY) / 2);

    const bin = atob(out.toDataURL('image/png').split(',')[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], `iksystem-${seed}.png`, { type: 'image/png' });
  }

  button.addEventListener('click', async () => {
    try {
      await navigator.share({ files: [snapshot()] });
    } catch (err) {
      if (err?.name !== 'AbortError') button.hidden = true;
    }
  });

  // Para probarlo desde la consola: iksystem.snapshot() da la foto sin compartirla.
  window.iksystem = { ...window.iksystem, snapshot };
}
