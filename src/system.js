// =========================================================================================
// El sistema: de un número, una carta estelar entera
// =========================================================================================
//
// Todo sale de una semilla (el «#67» de abajo, y de la dirección): el mismo número da
// siempre el mismo mapa. Aquí solo se decide QUÉ hay y DÓNDE (en coordenadas del mapa, un
// rectángulo de WIDTH × HEIGHT); cómo se pinta está en draw.js.
//
// Lo que hay, de abajo arriba:
//   - el MANTO DE ESTRELLAS, en tres capas a distinta profundidad (para el parallax): puntos
//     verdes, blancos, lima y azul marino, sólidos o solo borde; cruces azules y chevrones;
//   - la CORRIENTE, una gran curva verde que cruza todo el mapa, y algún arco suelto;
//   - el HUB, el planeta central, con sus círculos concéntricos de puntos verdes;
//   - la CAPITAL, un planeta lima dentro de un hexágono, con otro interior en discontinua;
//   - los JUMP POINTS, una cadena de arriba abajo: cada uno con su anillo, su etiqueta
//     («Jump point 33.825»: la distancia acumulada por la ruta) y rutas blancas entre ellos;
//   - los PLANETAS MENORES, verdes, blancos o lima, con su código girado («E.57»); algunos
//     con una órbita amplia, una luna que la recorre y su nombre (names.js);
//   - y abajo a la derecha, el número de la carta.

import { nameOf } from './names.js';

// El mapa, en sus unidades (a zoom 1, un píxel cada una).
export const WIDTH = 1600;
export const HEIGHT = 2400;

// Cuánto se alarga el manto por cada lado (para que al moverse con el parallax no se vea
// su borde) y su densidad (estrellas por millón de unidades cuadradas).
const STAR_MARGIN = 900;
const STAR_DENSITY = 260;
// Las capas: lo que se mueven (1 = como los planetas) y qué parte de las estrellas lleva
// cada una.
export const LAYERS = [
  { depth: 0.55, share: 0.45 },
  { depth: 0.75, share: 0.35 },
  { depth: 0.9, share: 0.2 },
];

// Un generador de números al azar con semilla (mulberry32): siempre la misma secuencia.
export function random(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r = {
    next,
    range: (lo, hi) => lo + next() * (hi - lo),
    int: (lo, hi) => Math.floor(lo + next() * (hi - lo + 1)),
    chance: (p) => next() < p,
    pick: (list) => list[Math.floor(next() * list.length)],
    // Uno de una lista con pesos: [[valor, peso], ...].
    weighted: (list) => {
      const total = list.reduce((s, [, w]) => s + w, 0);
      let x = next() * total;
      for (const [value, w] of list) if ((x -= w) < 0) return value;
      return list[list.length - 1][0];
    },
  };
  return r;
}

// Los códigos de los planetas menores: una letra y un número («E.57»).
const LETTERS = 'ABCDEFGHKLMNPRSTVX';
const codeOf = (r) => `${r.pick(LETTERS)}.${r.int(1, 99)}`;

export function generate(seed) {
  const r = random(seed * 2654435761);
  const system = { seed, stars: [], crosses: [], chevrons: [], arcs: [], routes: [], jumps: [], planets: [] };

  // ---- La cadena de jump points, de arriba abajo, serpenteando alrededor del centro.
  const count = r.int(7, 9);
  const top = 160;
  const bottom = HEIGHT - 260;
  let x = WIDTH * r.range(0.3, 0.5);
  const hubIndex = Math.floor(count / 2) + r.int(-1, 0);
  for (let i = 0; i < count; i++) {
    const y = top + ((bottom - top) * i) / (count - 1) + r.range(-60, 60);
    x = Math.max(WIDTH * 0.2, Math.min(WIDTH * 0.62, x + r.range(-240, 240)));
    const hub = i === hubIndex;
    system.jumps.push({
      x: hub ? WIDTH * r.range(0.36, 0.46) : x,
      y,
      hub,
      color: hub ? 'white' : r.chance(0.35) ? 'lime' : 'white',
      size: hub ? 11 : r.range(7, 10),
    });
  }
  // Las distancias: lo que se lleva recorrido por la ruta (en miles de unidades, con tres
  // decimales, como en una carta de navegación), empezando en algo al azar.
  let distance = r.range(8, 14);
  system.jumps.forEach((jump, i) => {
    if (i > 0) distance += Math.hypot(jump.x - system.jumps[i - 1].x, jump.y - system.jumps[i - 1].y) / 40;
    jump.distance = distance.toFixed(3);
    // La etiqueta, a un lado u otro (hacia donde haya más sitio), con su línea.
    jump.side = jump.x > WIDTH * 0.45 ? (r.chance(0.7) ? 1 : -1) : r.chance(0.7) ? -1 : 1;
    jump.reach = r.range(150, 300);
  });
  system.hub = system.jumps[hubIndex];
  // Los círculos concéntricos del hub.
  system.hub.rings = [];
  for (let k = 0, radius = r.range(80, 100); k < r.int(4, 6); k++, radius += r.range(70, 110)) system.hub.rings.push(radius);

  // Las rutas: la cadena, y algún atajo de uno a otro saltándose alguno.
  for (let i = 1; i < count; i++) system.routes.push({ from: system.jumps[i - 1], to: system.jumps[i], color: 'white' });
  for (let k = 0; k < r.int(2, 4); k++) {
    const a = r.int(0, count - 3);
    const b = Math.min(count - 1, a + r.int(2, 3));
    system.routes.push({ from: system.jumps[a], to: system.jumps[b], color: 'white' });
  }
  // Y una ruta lima, larga, casi de punta a punta.
  const longFrom = system.jumps[r.int(0, 1)];
  const longTo = system.jumps[count - 1 - r.int(0, 1)];
  system.routes.push({ from: longFrom, to: longTo, color: 'lime', long: true });

  // ---- La capital: un planeta lima en un hexágono, a un lado del hub, unida a él.
  const capitalSide = system.hub.x < WIDTH / 2 ? 1 : -1;
  system.capital = {
    x: system.hub.x + capitalSide * r.range(330, 430),
    y: system.hub.y - r.range(280, 420),
    size: 10,
    hexagon: r.range(100, 125),
    turn: r.range(-0.25, 0.25),
    // Su círculo grande de puntos, un poco desplazado hacia fuera.
    halo: { dx: capitalSide * r.range(60, 120), dy: r.range(20, 80), radius: r.range(170, 220) },
    name: nameOf(r).toUpperCase(),
    code: r.range(10, 99).toFixed(5),
    side: capitalSide,
  };
  system.routes.push({ from: system.hub, to: system.capital, color: 'white' });
  system.routes.push({ from: system.jumps[Math.max(0, hubIndex - 2)], to: system.capital, color: 'white' });

  // ---- El número de la carta, abajo a la derecha (su esquina queda libre).
  system.number = { x: WIDTH - 90, y: HEIGHT - 90 };

  // ---- Los planetas menores, por todo el mapa, sin pisar a los grandes, ni las etiquetas
  // de los jump points (su franja, de punta a punta), ni el número. Primero se decide cómo
  // es cada uno (con su órbita, ocupa más) y luego se le busca sitio.
  const taken = [...system.jumps, system.capital].map((o) => ({ x: o.x, y: o.y, reach: 40 }));
  const n = system.number;
  const labels = system.jumps.map((j) => ({ left: Math.min(j.x, j.x + j.side * (j.reach + 40)), right: Math.max(j.x, j.x + j.side * (j.reach + 40)), y: j.y }));
  const capitalEnd = system.capital.x + system.capital.side * (system.capital.hexagon + 270);
  labels.push({ left: Math.min(system.capital.x, capitalEnd), right: Math.max(system.capital.x, capitalEnd), y: system.capital.y });
  const free = (px, py, reach) =>
    taken.every((o) => Math.hypot(o.x - px, o.y - py) > reach + o.reach + 30) &&
    labels.every((l) => px < l.left - reach || px > l.right + reach || Math.abs(py - l.y) > reach + 24) &&
    !(px > n.x - 160 - reach && py > n.y - 80 - reach);
  for (let k = 0, tries = 0; k < 26 && tries < 600; tries++) {
    const planet = {
      size: r.range(4.5, 9),
      color: r.weighted([['green', 5], ['white', 3], ['lime', 3]]),
      code: r.chance(0.45) ? codeOf(r) : null,
    };
    // Algunos, con una órbita amplia y una luna que la recorre (y alguno, dos).
    if (r.chance(0.35)) {
      planet.orbit = {
        radius: r.range(45, 120),
        dotted: r.chance(0.6),
        color: r.weighted([['green', 3], ['white', 2], ['lime', 1]]),
        moons: Array.from({ length: r.chance(0.25) ? 2 : 1 }, () => ({
          phase: r.range(0, Math.PI * 2),
          // Radianes por segundo.
          speed: (r.chance(0.5) ? 1 : -1) * r.range(0.08, 0.2),
          size: r.range(2.5, 4),
        })),
      };
      // Y a veces, una rayita que sale de la órbita, como una marca.
      if (r.chance(0.5)) planet.orbit.tick = r.range(0, Math.PI * 2);
      // Los que tienen órbita, tienen nombre.
      planet.name = nameOf(r);
    }
    const reach = planet.orbit ? planet.orbit.radius + 22 : planet.size + 12;
    planet.x = r.range(80, WIDTH - 80);
    planet.y = r.range(80, HEIGHT - 80);
    if (!free(planet.x, planet.y, reach)) continue;
    k++;
    taken.push({ x: planet.x, y: planet.y, reach });
    system.planets.push(planet);
  }
  // Lunas también en los círculos del hub: puntitos que van dando la vuelta.
  system.hub.moons = system.hub.rings
    .filter(() => r.chance(0.6))
    .map((radius) => ({ radius, phase: r.range(0, Math.PI * 2), speed: (r.chance(0.5) ? 1 : -1) * (6 / radius), size: r.range(2.5, 4), color: r.pick(['green', 'white', 'lime']) }));

  // ---- La corriente: una gran curva verde de arriba abajo (sus puntos de paso; draw.js
  // la suaviza), y uno o dos arcos sueltos alrededor de algún jump point.
  const flow = [];
  const flowStart = r.range(0.2, 0.8);
  for (let k = 0; k <= 6; k++) {
    const t = k / 6;
    flow.push({ x: WIDTH * (flowStart + Math.sin(t * Math.PI * r.range(1.2, 2) + r.range(-0.4, 0.4)) * 0.35), y: -100 + t * (HEIGHT + 200) });
  }
  system.flow = flow;
  for (let k = 0; k < r.int(1, 2); k++) {
    const around = r.pick(system.jumps);
    const start = r.range(0, Math.PI * 2);
    system.arcs.push({ x: around.x + r.range(-60, 60), y: around.y + r.range(-60, 60), radius: r.range(110, 180), start, end: start + r.range(1, 2.2), color: 'green' });
  }

  // ---- El manto de estrellas, capa a capa. Cada capa ocupa lo que recorre su parallax:
  // el mapa encogido a su profundidad, más un margen alrededor.
  for (const [layer, { depth, share }] of LAYERS.entries()) {
    const w = WIDTH * depth + STAR_MARGIN * 2;
    const h = HEIGHT * depth + STAR_MARGIN * 2;
    const total = Math.round((w * h * STAR_DENSITY * share) / 1e6);
    for (let k = 0; k < total; k++) {
      system.stars.push({
        layer,
        x: r.range(-STAR_MARGIN, WIDTH * depth + STAR_MARGIN),
        y: r.range(-STAR_MARGIN, HEIGHT * depth + STAR_MARGIN),
        color: r.weighted([['green', 3], ['white', 3], ['lime', 1.6], ['navy', 2.6]]),
        ring: r.chance(0.35),
        size: r.range(0.9, 2.1) * (0.7 + depth * 0.5),
        // Algunas titilan: con qué ritmo y desde cuándo.
        twinkle: r.chance(0.18) ? r.range(0.6, 2.2) : 0,
        phase: r.range(0, Math.PI * 2),
      });
    }
    // Cruces y chevrones, en la capa más cercana del manto.
    if (layer === LAYERS.length - 1) {
      for (let k = 0; k < Math.round(total * 0.08); k++) system.crosses.push({ layer, x: r.range(-STAR_MARGIN, w - STAR_MARGIN), y: r.range(-STAR_MARGIN, h - STAR_MARGIN), size: r.range(4, 6) });
      for (let k = 0; k < Math.round(total * 0.025); k++) {
        system.chevrons.push({
          layer,
          x: r.range(-STAR_MARGIN, w - STAR_MARGIN),
          y: r.range(-STAR_MARGIN, h - STAR_MARGIN),
          // Un par hacia los lados («< >»), uno hacia arriba y abajo, o los cuatro.
          kind: r.weighted([['across', 2], ['updown', 1.2], ['all', 1]]),
          color: r.chance(0.6) ? 'green' : 'navy',
          gap: r.range(8, 14),
        });
      }
    }
  }
  return system;
}
