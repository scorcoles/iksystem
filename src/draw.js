// =========================================================================================
// Pintar la carta: cada pieza del sistema, con la cámara puesta
// =========================================================================================
//
// Todo con el contexto 2D del lienzo de p5 (drawingContext): las líneas discontinuas y
// punteadas, las curvas y el texto salen así más finos y más fáciles de controlar.
//
// La cámara: «x, y», el punto del mapa que queda en el centro de la pantalla, y «zoom». Las
// líneas no engordan con el zoom (siempre un píxel, como en un plano), y los puntos de
// las líneas punteadas tampoco se separan: lo que crece son las distancias y los planetas.
// Las estrellas van en tres capas que se mueven menos que el resto (el parallax).

import { LAYERS } from './system.js';


const FONT = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

// Cuánto crecen las estrellas con el zoom (1 = como el resto; 0 = nada).
const STAR_GROWTH = 0.5;

// Al alejarse, el manto no debe tapar la carta (en la misma pantalla caben muchas más
// estrellas). Por debajo de NEAR, tres cosas, cada vez más:
//   - quedan menos estrellas: las que hacen falta para que haya más o menos las mismas en
//     pantalla (nunca menos de FEWEST); las que se van, se apagan poco a poco;
//   - niebla: las capas del fondo se aclaran, más cuanto más lejanas (FOG);
//   - más simples: las de solo borde pasan a ser puntos, y las cruces pequeñas se van.
// Del todo así, en FAR.
const NEAR = 0.6;
const FAR = 0.25;
const FEWEST = 0.18;
const FOG = 1.3;

// Un número fijo entre 0 y 1 para cada estrella (de su sitio): el orden en que se van.
const keepOf = (o) => (o.keep ??= ((Math.sin(o.x * 12.9898 + o.y * 78.233) * 43758.5453) % 1 + 1) % 1);

// «cam»: { x, y, zoom, width, height, shiftX, shiftY } (shift: el parallax del cursor o del
// móvil, en píxeles, para lo más cercano; las capas lejanas, menos). «time», en segundos.
export function drawSystem(ctx, system, cam, time, dpr) {
  const { width, height } = cam;
  // Los colores de esta carta (system.js, PALETTES).
  const COLORS = system.palette;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = COLORS.page;
  ctx.fillRect(0, 0, width, height);

  // Lo que se ve del mapa, para no pintar lo que cae fuera.
  const view = (depth, pad) => {
    const cx = cam.x * depth - (cam.shiftX * (1 - depth)) / cam.zoom;
    const cy = cam.y * depth - (cam.shiftY * (1 - depth)) / cam.zoom;
    const hw = width / 2 / cam.zoom + pad;
    const hh = height / 2 / cam.zoom + pad;
    return { cx, cy, left: cx - hw, right: cx + hw, top: cy - hh, bottom: cy + hh };
  };
  // Pone la cámara de una capa: lo que está a «depth» se mueve esa parte del resto.
  const camera = (depth) => {
    const v = view(depth, 0);
    ctx.setTransform(dpr * cam.zoom, 0, 0, dpr * cam.zoom, dpr * (width / 2 - v.cx * cam.zoom), dpr * (height / 2 - v.cy * cam.zoom));
    return v;
  };
  // Un píxel de pantalla, en unidades del mapa.
  const px = 1 / cam.zoom;

  // ---- El manto de estrellas, de la capa más lejana a la más cercana.
  // Lo lejos que estamos (0 = cerca, 1 = del todo lejos) y qué parte de las estrellas queda.
  const out = Math.max(0, Math.min(1, (NEAR - cam.zoom) / (NEAR - FAR)));
  const share = Math.max(FEWEST, Math.min(1, (cam.zoom / NEAR) ** 2));
  // Lo que se ve una estrella según su número: las que sobran, apagándose en un margen.
  const kept = (o) => Math.max(0, Math.min(1, (share - keepOf(o)) / 0.08 + 1));
  for (const [layer, { depth }] of LAYERS.entries()) {
    const v = camera(depth);
    const grow = Math.pow(cam.zoom, STAR_GROWTH) / cam.zoom;
    const fog = Math.max(0.2, 1 - out * (1 - depth) * FOG);
    ctx.lineWidth = px;
    for (const star of system.stars) {
      if (star.layer !== layer) continue;
      if (star.x < v.left - 10 || star.x > v.right + 10 || star.y < v.top - 10 || star.y > v.bottom + 10) continue;
      const seen = kept(star) * fog;
      if (seen <= 0.01) continue;
      ctx.globalAlpha = seen * (star.twinkle ? 0.55 + 0.45 * Math.sin(time * star.twinkle + star.phase) : 1);
      // De lejos, las de solo borde se vuelven puntos.
      const ring = star.ring && out < 0.5;
      const radius = star.size * grow * (ring ? 1.5 : 1);
      ctx.beginPath();
      ctx.arc(star.x, star.y, radius, 0, Math.PI * 2);
      if (ring) {
        ctx.strokeStyle = COLORS[star.color];
        ctx.stroke();
      } else {
        ctx.fillStyle = COLORS[star.color];
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // Las cruces y los chevrones, con las estrellas de su capa.
    for (const cross of system.crosses) {
      if (cross.layer !== layer) continue;
      if (cross.x < v.left - 20 || cross.x > v.right + 20 || cross.y < v.top - 20 || cross.y > v.bottom + 20) continue;
      // De lejos, las pequeñas se van (las grandes se quedan, con la niebla).
      const small = cross.size < 8 ? 1 - Math.min(1, out * 1.6) : 1;
      const seen = small * fog * (cross.size < 8 ? kept(cross) : 1);
      if (seen <= 0.01) continue;
      ctx.globalAlpha = seen;
      const s = cross.size * grow;
      // Las grandes, con algo más de trazo.
      ctx.lineWidth = (cross.size > 8 ? 2 : 1.4) * px;
      ctx.strokeStyle = COLORS[cross.color];
      ctx.beginPath();
      ctx.moveTo(cross.x - s, cross.y);
      ctx.lineTo(cross.x + s, cross.y);
      ctx.moveTo(cross.x, cross.y - s);
      ctx.lineTo(cross.x, cross.y + s);
      ctx.stroke();
    }
    for (const chevron of system.chevrons) {
      if (chevron.layer !== layer) continue;
      ctx.globalAlpha = kept(chevron) * fog * (1 - out * 0.6);
      ctx.strokeStyle = COLORS[chevron.color];
      ctx.beginPath();
      const g = chevron.gap * grow;
      const s = 4 * grow;
      const arrow = (dx, dy) => {
        // Una «>» que apunta hacia fuera, en la dirección (dx, dy).
        const x = chevron.x + dx * g;
        const y = chevron.y + dy * g;
        ctx.moveTo(x - dx * s - dy * s, y - dy * s - dx * s);
        ctx.lineTo(x, y);
        ctx.lineTo(x - dx * s + dy * s, y - dy * s + dx * s);
      };
      if (chevron.kind !== 'updown') {
        arrow(-1, 0);
        arrow(1, 0);
      }
      if (chevron.kind !== 'across') {
        arrow(0, -1);
        arrow(0, 1);
      }
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  // ---- Todo lo demás, a la profundidad del mapa.
  camera(1);
  ctx.lineCap = 'round';

  // Líneas punteadas y discontinuas, con medidas en píxeles de pantalla.
  const dotted = () => ctx.setLineDash([0.01 * px, 4 * px]);
  const dashed = (on, off) => ctx.setLineDash([on * px, off * px]);
  const solid = () => ctx.setLineDash([]);
  const circle = (x, y, radius) => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
  };

  // La corriente: una curva suave (Catmull-Rom) por sus puntos de paso.
  ctx.strokeStyle = COLORS.primary;
  ctx.lineWidth = 1.5 * px;
  ctx.beginPath();
  const flow = system.flow;
  ctx.moveTo(flow[0].x, flow[0].y);
  for (let i = 0; i < flow.length - 1; i++) {
    const a = flow[Math.max(0, i - 1)];
    const b = flow[i];
    const c = flow[i + 1];
    const d = flow[Math.min(flow.length - 1, i + 2)];
    ctx.bezierCurveTo(b.x + (c.x - a.x) / 6, b.y + (c.y - a.y) / 6, c.x - (d.x - b.x) / 6, c.y - (d.y - b.y) / 6, c.x, c.y);
  }
  ctx.stroke();

  // Los círculos del hub, punteados en verde, que giran muy despacio (se nota en los
  // puntos).
  const hub = system.hub;
  ctx.strokeStyle = COLORS.primary;
  ctx.lineWidth = 1.6 * px;
  dotted();
  hub.rings.forEach((radius, k) => {
    ctx.lineDashOffset = (k % 2 ? 1 : -1) * time * 3 * px;
    circle(hub.x, hub.y, radius);
    ctx.stroke();
  });
  ctx.lineDashOffset = 0;

  // La capital: su círculo grande de puntos, y los dos hexágonos.
  const capital = system.capital;
  circle(capital.x + capital.halo.dx, capital.y + capital.halo.dy, capital.halo.radius);
  ctx.stroke();
  const hexagon = (radius, turn) => {
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const a = turn + (k * Math.PI) / 3;
      ctx[k ? 'lineTo' : 'moveTo'](capital.x + Math.cos(a) * radius, capital.y + Math.sin(a) * radius);
    }
    ctx.closePath();
  };
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 1.2 * px;
  solid();
  hexagon(capital.hexagon, capital.turn);
  ctx.stroke();
  // El de dentro, en discontinua, con el mismo giro (lados paralelos): lo que se mueve son
  // sus guiones, que corren despacio a lo largo del borde.
  dashed(26, 14);
  ctx.lineDashOffset = -time * 4 * px;
  hexagon(capital.hexagon * 0.86, capital.turn);
  ctx.stroke();
  ctx.lineDashOffset = 0;
  solid();

  // Las órbitas de los planetas menores.
  for (const planet of system.planets) {
    if (!planet.orbit) continue;
    const o = planet.orbit;
    ctx.strokeStyle = COLORS[o.color];
    ctx.lineWidth = (o.dotted ? 1.6 : 1) * px;
    if (o.dotted) dotted();
    circle(planet.x, planet.y, o.radius);
    ctx.stroke();
    solid();
    if (o.tick !== undefined) {
      ctx.lineWidth = px;
      ctx.beginPath();
      ctx.moveTo(planet.x + Math.cos(o.tick) * o.radius, planet.y + Math.sin(o.tick) * o.radius);
      ctx.lineTo(planet.x + Math.cos(o.tick) * (o.radius + 22), planet.y + Math.sin(o.tick) * (o.radius + 22));
      ctx.stroke();
    }
  }

  // Las rutas.
  ctx.lineWidth = px;
  for (const route of system.routes) {
    ctx.strokeStyle = COLORS[route.color];
    ctx.globalAlpha = route.long ? 0.9 : 0.85;
    ctx.beginPath();
    ctx.moveTo(route.from.x, route.from.y);
    ctx.lineTo(route.to.x, route.to.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // ---- Los cuerpos: un disco sólido; los grandes, con un anillo alrededor.
  const body = (x, y, size, color, ring) => {
    ctx.fillStyle = COLORS[color];
    circle(x, y, size);
    ctx.fill();
    if (ring) {
      ctx.strokeStyle = COLORS[color];
      ctx.lineWidth = px;
      circle(x, y, size * ring);
      ctx.stroke();
    }
  };

  // Los planetas menores, sus lunas y sus códigos (girados, leyendo de arriba abajo).
  ctx.textBaseline = 'middle';
  for (const planet of system.planets) {
    body(planet.x, planet.y, planet.size, planet.color);
    if (planet.orbit) {
      for (const moon of planet.orbit.moons) {
        const a = moon.phase + time * moon.speed;
        body(planet.x + Math.cos(a) * planet.orbit.radius, planet.y + Math.sin(a) * planet.orbit.radius, moon.size, 'light');
      }
    }
    // Su nombre, junto a la órbita, por arriba a la derecha.
    if (planet.name) {
      const a = -Math.PI / 4;
      ctx.fillStyle = COLORS.light;
      ctx.font = `12px ${FONT}`;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(planet.name, planet.x + Math.cos(a) * planet.orbit.radius + 6, planet.y + Math.sin(a) * planet.orbit.radius - 4);
      ctx.textBaseline = 'middle';
    }
    if (planet.code) {
      ctx.save();
      ctx.translate(planet.x + planet.size + 9, planet.y + planet.size + 6);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = COLORS.label;
      ctx.font = `11px ${FONT}`;
      ctx.fillText(planet.code, 0, 0);
      ctx.restore();
    }
  }
  for (const moon of hub.moons) {
    const a = moon.phase + time * moon.speed;
    body(hub.x + Math.cos(a) * moon.radius, hub.y + Math.sin(a) * moon.radius, moon.size, moon.color);
  }

  // La capital y su etiqueta: una línea hasta el nombre, en negrita.
  body(capital.x, capital.y, capital.size, 'accent', 2.1);
  {
    const s = capital.side;
    const end = capital.x + s * (capital.hexagon + 230);
    ctx.strokeStyle = COLORS.accent;
    ctx.fillStyle = COLORS.accent;
    ctx.lineWidth = 2 * px;
    ctx.beginPath();
    ctx.moveTo(capital.x + s * capital.size * 2.1, capital.y);
    ctx.lineTo(end, capital.y);
    ctx.stroke();
    ctx.font = `700 15px ${FONT}`;
    const label = `${capital.name} ${capital.code}`;
    const w = ctx.measureText(label).width;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(label, s > 0 ? end - w : end, capital.y - 6);
  }

  // Los jump points: el disco, el anillo y la etiqueta al final de su línea, subrayada.
  ctx.font = `13px ${FONT}`;
  ctx.textBaseline = 'alphabetic';
  for (const jump of system.jumps) {
    body(jump.x, jump.y, jump.size, jump.color, jump.hub ? 2.3 : 2.1);
    const color = COLORS[jump.color];
    const s = jump.side;
    const start = jump.x + s * jump.size * (jump.hub ? 2.3 : 2.1);
    const end = jump.x + s * jump.reach;
    // La etiqueta: a la izquierda, el número delante; a la derecha, detrás.
    const label = s < 0 ? `${jump.distance} ${jump.name}` : `${jump.name} ${jump.distance}`;
    const w = ctx.measureText(label).width;
    const textX = s < 0 ? end - w : end - w;
    const lineEnd = s < 0 ? end - w - 4 : end;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = px;
    ctx.beginPath();
    ctx.moveTo(start, jump.y);
    ctx.lineTo(lineEnd, jump.y);
    ctx.stroke();
    ctx.fillText(label, textX, jump.y - 5);
  }

  // ---- El número de la carta, abajo a la derecha.
  ctx.font = `400 34px ${FONT}`;
  ctx.fillStyle = COLORS.light;
  ctx.textBaseline = 'alphabetic';
  const number = `#${system.seed}`;
  ctx.fillText(number, system.number.x + 40 - ctx.measureText(number).width, system.number.y + 40);
}
