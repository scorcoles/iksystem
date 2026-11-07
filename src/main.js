// =========================================================================================
// iksystem: una carta estelar viva
// =========================================================================================
//
// Un experimento de VERTIK. Planetas, lunas, rutas y jump points sobre un manto de
// estrellas, como un mapa de navegación de otro tiempo. Cada carta sale de un número (el
// «#67» de abajo, y la dirección: #67): el mismo número, el mismo sistema.
//
//   system.js → de un número, el sistema: qué hay y dónde
//   names.js  → los nombres de los planetas
//   draw.js   → pintarlo (con el contexto 2D del lienzo de p5)
//   sound.js  → el sonido: el fondo, la telemetría, los pings y el viento
//   share.js  → compartir una foto
//   main.js   → p5, la cámara, arrastrar, el zoom, el parallax y el número (este archivo)
//
// Lo que hacemos nosotros:
//   - arrastrar mueve la carta (y al soltar sigue un poco, con inercia);
//   - la rueda, o pellizcar, acerca y aleja; manteniendo pulsado sin moverse, también se
//     acerca, hacia ese punto; doble clic o doble toque, vuelta al principio;
//   - el cursor (o, en el móvil, inclinarlo) mueve las estrellas un poco: el parallax;
//   - tocar un planeta lo «llama»: una onda sale de él, y suena;
//   - «Prev» y «Next» (o las flechas) pasan a la carta anterior o la siguiente.

import p5 from 'p5';
import { generate, WIDTH, HEIGHT } from './system.js';
import { drawSystem } from './draw.js';
import { createSound } from './sound.js';
import { setupShare } from './share.js';
import '../style.css';

// El zoom: el más cercano, y cuánto se ve del mapa al empezar (el ancho de la pantalla
// cubre esa parte de su ancho), sin pasar de unos límites para que se lea.
const ZOOM_MAX = 3;
// Cuánto cabe al alejarse del todo (1 = la carta justo entera; menos, con margen).
const ZOOM_OUT = 0.92;
const START_SHARE = 0.75;
const START_ZOOM = [0.6, 1.1];
// Manteniendo pulsado: lo que espera antes de acercarse (segundos), cuánto puede moverse
// el dedo sin que cuente como arrastrar (píxeles) y lo deprisa que se acerca (por segundo).
const HOLD_DELAY = 0.35;
const HOLD_SLOP = 6;
const HOLD_RATE = 0.9;
// La inercia al soltar: lo que tarda en frenar (por segundo, cuánto queda de la velocidad).
const GLIDE = 0.04;
// El parallax: lo que se mueven las estrellas más cercanas (píxeles, de un borde al otro
// de la pantalla, o con el móvil inclinado 30°), y lo que tardan en seguirlo (segundos).
const PARALLAX = 70;
const PARALLAX_EASE = 0.35;
// La vuelta al principio con doble toque, y el paso a otra carta: lo que tarda (segundos).
const RETURN = 0.6;
// Lo que crece la onda de un planeta tocado (unidades del mapa) y lo que dura (segundos).
const CALL_RADIUS = 160;
const CALL_LENGTH = 1.6;

const canvas = document.querySelector('[data-iksystem]');
// Su tamaño, del recuadro que lo contiene (p5 le pone al lienzo el suyo, en píxeles).
const panel = canvas.parentElement;
const size = () => ({ w: panel.clientWidth, h: panel.clientHeight });
const numberLabel = document.querySelector('[data-number]');

// La carta: su número sale de la dirección (#67) o, si no hay, al azar.
let system = null;
function open(seed, { replace = false } = {}) {
  system = generate(seed);
  if (numberLabel) numberLabel.textContent = `#${seed}`;
  // Los colores de la página (el pie), los de la paleta de esta carta.
  const style = document.documentElement.style;
  style.setProperty('--page', system.palette.page);
  style.setProperty('--ink', system.palette.light);
  style.setProperty('--accent', system.palette.accent);
  const hash = `#${seed}`;
  if (location.hash !== hash) history[replace ? 'replaceState' : 'pushState'](null, '', location.pathname + location.search + hash);
  home();
  cam.x = target.x;
  cam.y = target.y;
  cam.zoom = target.zoom;
}
const fromHash = () => {
  const n = parseInt(location.hash.slice(1), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// La cámara: el punto del mapa en el centro de la pantalla, el zoom, y su parallax.
const cam = { x: WIDTH / 2, y: HEIGHT / 2, zoom: 1, width: 1, height: 1, shiftX: 0, shiftY: 0 };
// Adónde va, cuando vuelve sola (doble toque); null si no.
let target = { x: 0, y: 0, zoom: 1 };
let returning = 0;
const startZoom = () => Math.max(START_ZOOM[0], Math.min(START_ZOOM[1], cam.width / (WIDTH * START_SHARE)));
// Lo más lejos: la carta entera en la pantalla, con algo de aire.
const minZoom = () => Math.min(startZoom(), Math.min(cam.width / WIDTH, cam.height / HEIGHT) * ZOOM_OUT);
function home() {
  target = { x: system.hub.x, y: system.hub.y - cam.height * 0.08 / startZoom(), zoom: startZoom() };
}
// Que no se salga del mapa (con un poco de margen).
function clamp() {
  cam.zoom = Math.max(minZoom(), Math.min(ZOOM_MAX, cam.zoom));
  const pad = 120;
  const hw = cam.width / 2 / cam.zoom;
  const hh = cam.height / 2 / cam.zoom;
  const fit = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)));
  cam.x = fit(cam.x, hw - pad, WIDTH - hw + pad);
  cam.y = fit(cam.y, hh - pad, HEIGHT - hh + pad);
}
// Acercar o alejar dejando quieto el punto de la pantalla (sx, sy).
function zoomAt(sx, sy, factor) {
  const before = cam.zoom;
  cam.zoom = Math.max(minZoom(), Math.min(ZOOM_MAX, cam.zoom * factor));
  const k = 1 / before - 1 / cam.zoom;
  cam.x += (sx - cam.width / 2) * k;
  cam.y += (sy - cam.height / 2) * k;
}
const toMap = (sx, sy) => ({ x: cam.x + (sx - cam.width / 2) / cam.zoom, y: cam.y + (sy - cam.height / 2) / cam.zoom });

// ---- El sonido y compartir.
const sound = createSound();
const soundButton = document.querySelector('[data-sound]');
soundButton?.addEventListener('click', () => {
  const playing = sound.toggle();
  soundButton.classList.toggle('is-on', playing);
  soundButton.setAttribute('aria-pressed', String(playing));
  soundButton.setAttribute('aria-label', playing ? 'Apagar el sonido' : 'Encender el sonido');
});

// ---- Los dedos y el ratón.
const pointers = new Map();
let velocity = { x: 0, y: 0 };
let press = null;
let pinch = null;
let lastTap = { time: 0, x: 0, y: 0 };
let pointerShift = { x: 0, y: 0 };
// Las ondas de los planetas tocados.
const calls = [];
const local = (e) => {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture?.(e.pointerId);
  const at = local(e);
  pointers.set(e.pointerId, at);
  returning = 0;
  velocity = { x: 0, y: 0 };
  if (pointers.size === 1) press = { ...at, time: performance.now(), moved: false, last: at, lastTime: performance.now() };
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y) };
    press = null;
  }
});

canvas.addEventListener('pointermove', (e) => {
  const at = local(e);
  // Sin pulsar, con ratón: el parallax sigue al cursor.
  if (e.pointerType === 'mouse') pointerShift = { x: (at.x / cam.width - 0.5) * PARALLAX, y: (at.y / cam.height - 0.5) * PARALLAX };
  if (!pointers.has(e.pointerId)) return;
  const before = pointers.get(e.pointerId);
  pointers.set(e.pointerId, at);
  if (pinch && pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, distance / pinch.distance);
    // Y mover con los dos dedos: la mitad de lo que se ha movido este.
    cam.x -= (at.x - before.x) / 2 / cam.zoom;
    cam.y -= (at.y - before.y) / 2 / cam.zoom;
    pinch.distance = distance;
    return;
  }
  if (!press) return;
  if (!press.moved && Math.hypot(at.x - press.x, at.y - press.y) > HOLD_SLOP) press.moved = true;
  if (!press.moved) return;
  cam.x -= (at.x - before.x) / cam.zoom;
  cam.y -= (at.y - before.y) / cam.zoom;
  const now = performance.now();
  const dt = Math.max(1, now - press.lastTime) / 1000;
  velocity = { x: -(at.x - press.last.x) / cam.zoom / dt, y: -(at.y - press.last.y) / cam.zoom / dt };
  press.last = at;
  press.lastTime = now;
  sound.wind(Math.hypot(at.x - before.x, at.y - before.y) / dt / 1000);
});

function release(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
  if (press && !press.moved) {
    const now = performance.now();
    const held = (now - press.time) / 1000;
    if (held < HOLD_DELAY) tap(press.x, press.y, now);
  }
  // Si hace rato que no se mueve, sin inercia.
  if (press && performance.now() - press.lastTime > 80) velocity = { x: 0, y: 0 };
  press = null;
}
for (const type of ['pointerup', 'pointercancel']) canvas.addEventListener(type, release);

function tap(sx, sy, now) {
  // Doble toque: vuelta al principio.
  if (now - lastTap.time < 300 && Math.hypot(sx - lastTap.x, sy - lastTap.y) < 30) {
    home();
    returning = RETURN;
    lastTap = { time: 0, x: 0, y: 0 };
    return;
  }
  lastTap = { time: now, x: sx, y: sy };
  // ¿Hay un planeta cerca? (en píxeles de pantalla, para el dedo).
  const at = toMap(sx, sy);
  const reach = 26 / cam.zoom;
  let best = null;
  let bestDistance = Infinity;
  for (const body of [...system.jumps, system.capital, ...system.planets]) {
    const d = Math.hypot(body.x - at.x, body.y - at.y) - body.size;
    if (d < reach && d < bestDistance) {
      best = body;
      bestDistance = d;
    }
  }
  if (!best) return;
  const kind = best === system.capital ? 'capital' : best.hub ? 'hub' : system.jumps.includes(best) ? 'jump' : 'planet';
  calls.push({ x: best.x, y: best.y, age: 0, color: best.color ?? 'accent' });
  sound.ping(kind, (sx / cam.width) * 2 - 1);
}

canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    returning = 0;
    const at = local(e);
    zoomAt(at.x, at.y, Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015)));
  },
  { passive: false },
);

// En el móvil, el parallax lo da su inclinación (desde como se sostenía al empezar, que se
// va adaptando sola). En iOS hay que pedir permiso: al primer toque.
const coarse = window.matchMedia('(pointer: coarse)');
let rest = null;
window.addEventListener('deviceorientation', (e) => {
  if (e.beta == null || e.gamma == null || !coarse.matches) return;
  if (!rest) rest = { beta: e.beta, gamma: e.gamma };
  rest.beta += (e.beta - rest.beta) * 0.01;
  rest.gamma += (e.gamma - rest.gamma) * 0.01;
  const k = (v) => Math.max(-1, Math.min(1, v / 30));
  pointerShift = { x: k(e.gamma - rest.gamma) * PARALLAX * 0.5, y: k(e.beta - rest.beta) * PARALLAX * 0.5 };
});
const askTilt = () => {
  window.removeEventListener('pointerup', askTilt);
  const ask = window.DeviceOrientationEvent?.requestPermission;
  if (typeof ask === 'function') ask.call(window.DeviceOrientationEvent).catch(() => {});
};
window.addEventListener('pointerup', askTilt);

// ---- Otra carta: la anterior o la siguiente.
const step = (by) => open(Math.max(1, system.seed + by));
document.querySelector('[data-mode-prev]')?.addEventListener('click', () => step(-1));
document.querySelector('[data-mode-next]')?.addEventListener('click', () => step(1));
window.addEventListener('keydown', (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  e.preventDefault();
  step(e.key === 'ArrowLeft' ? -1 : 1);
});
window.addEventListener('hashchange', () => {
  const n = fromHash();
  if (n && n !== system.seed) open(n, { replace: true });
});

// ---- p5: el lienzo, el tamaño y cada fotograma.
let time = 0;
const sketch = (p) => {
  p.setup = () => {
    const { w, h } = size();
    p.createCanvas(w, h, p.P2D, canvas);
    p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
    cam.width = w;
    cam.height = h;
    open(fromHash() ?? Math.floor(Math.random() * 999) + 1, { replace: true });
  };
  p.windowResized = () => {
    const { w, h } = size();
    p.resizeCanvas(w, h);
    cam.width = w;
    cam.height = h;
    clamp();
  };
  p.draw = () => {
    const dt = Math.min(p.deltaTime / 1000, 1 / 20);
    time += dt;

    // Manteniendo pulsado sin moverse: acercarse hacia ese punto.
    if (press && !press.moved && pointers.size === 1 && (performance.now() - press.time) / 1000 > HOLD_DELAY) zoomAt(press.x, press.y, Math.exp(HOLD_RATE * dt));
    // Suelto: la inercia.
    if (!press && !pinch) {
      cam.x += velocity.x * dt;
      cam.y += velocity.y * dt;
      const keep = Math.pow(GLIDE, dt);
      velocity.x *= keep;
      velocity.y *= keep;
    }
    // La vuelta al principio.
    if (returning > 0) {
      const k = Math.min(1, dt / (returning * 0.35));
      cam.x += (target.x - cam.x) * k;
      cam.y += (target.y - cam.y) * k;
      cam.zoom += (target.zoom - cam.zoom) * k;
      if (Math.abs(target.zoom - cam.zoom) < 0.002 && Math.hypot(target.x - cam.x, target.y - cam.y) < 0.5) returning = 0;
    }
    clamp();
    const ease = Math.min(1, dt / PARALLAX_EASE);
    cam.shiftX += (pointerShift.x - cam.shiftX) * ease;
    cam.shiftY += (pointerShift.y - cam.shiftY) * ease;

    const ctx = p.drawingContext;
    drawSystem(ctx, system, cam, time, p.pixelDensity());
    drawCalls(ctx, dt, p.pixelDensity());
    sound.update(dt, cam.zoom);
  };
};

// Las ondas de los planetas tocados: un círculo que crece y se apaga.
function drawCalls(ctx, dt, dpr) {
  ctx.setTransform(dpr * cam.zoom, 0, 0, dpr * cam.zoom, dpr * (cam.width / 2 - cam.x * cam.zoom), dpr * (cam.height / 2 - cam.y * cam.zoom));
  for (let i = calls.length - 1; i >= 0; i--) {
    const call = calls[i];
    call.age += dt;
    if (call.age > CALL_LENGTH) {
      calls.splice(i, 1);
      continue;
    }
    const t = call.age / CALL_LENGTH;
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = system.palette[call.color];
    ctx.lineWidth = 1.4 / cam.zoom;
    ctx.beginPath();
    ctx.arc(call.x, call.y, 12 + (1 - Math.pow(1 - t, 3)) * CALL_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

new p5(sketch);

setupShare(canvas, () => {}, () => ({ seed: system.seed, palette: system.palette }));
