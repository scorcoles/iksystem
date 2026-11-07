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
//   - la CORRIENTE, una gran curva que cruza todo el mapa;
//   - el HUB, el planeta central, con sus círculos concéntricos de puntos verdes;
//   - la CAPITAL, un planeta lima dentro de un hexágono, con otro interior en discontinua;
//   - los JUMP POINTS, una cadena de arriba abajo: cada uno con su anillo, su etiqueta
//     (su nombre y la distancia acumulada por la ruta: «Aregon IV 33.825») y rutas blancas
//     entre ellos;
//   - los PLANETAS MENORES, verdes, blancos o lima, con su código girado («E.57»); algunos
//     con una órbita amplia, una luna que la recorre y su nombre (names.js);
//   - y abajo a la derecha, el número de la carta.

import { nameOf } from './names.js';

// Las paletas: cada carta lleva una, elegida por su semilla. «page», el fondo; «primary», la
// corriente, los círculos del hub y la mayoría de los planetas; «accent», la capital y lo
// que destaca; «light», las rutas y los jump points; «faint», lo más apagado del fondo (las
// cruces, algunas estrellas); y «label», los códigos. Todas salen igual de a menudo.
export const PALETTES = [
  { name: 'amber', weight: 1, page: '#13151d', primary: '#e0892b', accent: '#f2d16b', light: '#efe8dc', faint: '#43306a', label: '#8f8a99' },
  { name: 'ice', weight: 1, page: '#0b1317', primary: '#3fb8d6', accent: '#ff6b5a', light: '#eef3f4', faint: '#1f3c57', label: '#8aa0a8' },
  { name: 'rose', weight: 1, page: '#1b1317', primary: '#e05a86', accent: '#ffb35c', light: '#f6ece6', faint: '#4b2442', label: '#a08f96' },
  { name: 'violet', weight: 1, page: '#14111e', primary: '#8f6bf0', accent: '#5fe0b0', light: '#f0eef8', faint: '#2b3070', label: '#948fa6' },
  { name: 'signal', weight: 1, page: '#111111', primary: '#d8412f', accent: '#ece6d6', light: '#bdbdbd', faint: '#3a3a3a', label: '#858585' },
];

// El mapa, en sus unidades (a zoom 1, un píxel cada una): vertical (para el móvil) o, en
// pantallas apaisadas, a lo ancho, con lo mismo girado: la cadena de izquierda a derecha.
export const TALL = { width: 1600, height: 2400 };
export const WIDE = { width: 2400, height: 1600 };

// Cuánto se alarga el manto por cada lado (draw.js lo repite sin fin: este es el tamaño de
// cada repetición) y su densidad (estrellas por millón de unidades cuadradas).
export const STAR_MARGIN = 1800;
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

// «wide»: a lo ancho. El mismo número da el mismo sistema (paleta, nombres, planetas...),
// colocado de otra manera.
export function generate(seed, wide = false) {
  const { width: WIDTH, height: HEIGHT } = wide ? WIDE : TALL;
  const r = random(seed * 2654435761);
  const names = random(seed * 2654435761 + 1);
  // La paleta y cuántos planetas menores, de otro más (así no cambian dónde cae lo demás).
  const extra = random(seed * 2654435761 + 2);
  const palette = extra.weighted(PALETTES.map((p) => [p, p.weight]));
  const planetCount = extra.int(15, 35);
  const system = { seed, wide, width: WIDTH, height: HEIGHT, palette, stars: [], crosses: [], chevrons: [], routes: [], jumps: [], planets: [] };

  // ---- La cadena de jump points, de arriba abajo (o de izquierda a derecha, a lo ancho),
  // serpenteando alrededor del centro. «along» es la dirección de la cadena y «across» la
  // otra; al final se pasan a x e y.
  const count = r.int(7, 9);
  const length = wide ? WIDTH : HEIGHT;
  const breadth = wide ? HEIGHT : WIDTH;
  const start = wide ? 200 : 160;
  const end = length - 260;
  let across = breadth * r.range(0.3, 0.5);
  const hubIndex = Math.floor(count / 2) + r.int(-1, 0);
  for (let i = 0; i < count; i++) {
    const along = start + ((end - start) * i) / (count - 1) + r.range(-60, 60);
    across = Math.max(breadth * 0.2, Math.min(breadth * 0.62, across + r.range(-240, 240) * (wide ? 0.7 : 1)));
    const hub = i === hubIndex;
    const a = hub ? breadth * r.range(0.36, 0.46) : across;
    system.jumps.push({
      x: wide ? along : a,
      y: wide ? a : along,
      hub,
      color: hub ? 'light' : r.chance(0.35) ? 'accent' : 'light',
      size: hub ? 11 : r.range(7, 10),
    });
  }
  // Las distancias: lo que se lleva recorrido por la ruta (en miles de unidades, con tres
  // decimales, como en una carta de navegación), empezando en algo al azar.
  let distance = r.range(8, 14);
  system.jumps.forEach((jump, i) => {
    if (i > 0) distance += Math.hypot(jump.x - system.jumps[i - 1].x, jump.y - system.jumps[i - 1].y) / 40;
    jump.distance = distance.toFixed(3);
    // La etiqueta, a un lado u otro (hacia donde haya más sitio), con su línea: en vertical,
    // la línea va de lado; a lo ancho, hacia arriba o hacia abajo (alternando, para que no
    // choquen las de al lado), y la etiqueta, subrayada, al final.
    if (wide) {
      jump.drop = true;
      jump.side = (i % 2 ? 1 : -1) * (r.chance(0.8) ? 1 : -1);
      jump.reach = r.range(110, 210);
    } else {
      jump.side = jump.x > WIDTH * 0.45 ? (r.chance(0.7) ? 1 : -1) : r.chance(0.7) ? -1 : 1;
      jump.reach = r.range(150, 300);
    }
    // Su nombre, de otro generador (con la misma semilla): así los nombres no cambian dónde
    // cae lo demás.
    jump.name = nameOf(names);
  });
  // Lo que ocupa la etiqueta de cada jump point (un rectángulo), para no poner nada encima.
  const labelBox = (j) => {
    const text = (j.name.length + j.distance.length + 1) * 8 + 10;
    if (j.drop) {
      const tip = j.y + j.side * j.reach;
      return { left: j.x - 10, right: j.x + text, top: Math.min(j.y, tip - 20), bottom: Math.max(j.y, tip + 4) };
    }
    return { left: Math.min(j.x, j.x + j.side * (j.reach + 40)), right: Math.max(j.x, j.x + j.side * (j.reach + 40)), top: j.y - 16, bottom: j.y + 4 };
  };
  system.hub = system.jumps[hubIndex];
  // Los círculos concéntricos del hub.
  system.hub.rings = [];
  for (let k = 0, radius = r.range(80, 100); k < r.int(4, 6); k++, radius += r.range(70, 110)) system.hub.rings.push(radius);

  // Las rutas: la cadena, y algún atajo de uno a otro saltándose alguno.
  for (let i = 1; i < count; i++) system.routes.push({ from: system.jumps[i - 1], to: system.jumps[i], color: 'light' });
  for (let k = 0; k < r.int(2, 4); k++) {
    const a = r.int(0, count - 3);
    const b = Math.min(count - 1, a + r.int(2, 3));
    system.routes.push({ from: system.jumps[a], to: system.jumps[b], color: 'light' });
  }
  // Y una ruta lima, larga, casi de punta a punta.
  const longFrom = system.jumps[r.int(0, 1)];
  const longTo = system.jumps[count - 1 - r.int(0, 1)];
  system.routes.push({ from: longFrom, to: longTo, color: 'accent', long: true });

  // ---- La capital: un planeta lima en un hexágono, a un lado del hub, unida a él.
  const capitalSide = (wide ? system.hub.y < HEIGHT / 2 : system.hub.x < WIDTH / 2) ? 1 : -1;
  // Su sitio: a un lado del hub, lejos de los otros jump points y de sus etiquetas. Prueba
  // unas cuantas veces y se queda con el primero que esté libre o, si no hay ninguno, con
  // el más despejado (de los dos lados).
  const clearance = (x, y) =>
    Math.min(
      ...system.jumps.map((j) => {
        const b = labelBox(j);
        // Lo lejos que queda de su etiqueta (en partes de 150).
        const dx = Math.max(b.left - 140 - x, 0, x - b.right - 140);
        const dy = Math.max(b.top - y, 0, y - b.bottom);
        const label = dx > 0 ? Infinity : dy / 150;
        return Math.min(Math.hypot(j.x - x, j.y - y) / 220, label);
      }),
    );
  let spot = null;
  let best = -Infinity;
  for (let tries = 0; tries < 40 && best < 1; tries++) {
    const side = tries < 20 ? capitalSide : -capitalSide;
    const off = side * r.range(300, 520);
    const slide = r.range(-700, 500);
    const x = Math.max(140, Math.min(WIDTH - 420, system.hub.x + (wide ? slide : off)));
    const y = Math.max(200, Math.min(HEIGHT - 300, system.hub.y + (wide ? off : slide)));
    const c = clearance(x, y);
    if (c > best) {
      best = c;
      spot = { x, y, side };
    }
  }
  system.capital = {
    x: spot.x,
    y: spot.y,
    size: 10,
    hexagon: r.range(100, 125),
    turn: r.range(-0.25, 0.25),
    // Su círculo grande de puntos, un poco desplazado hacia fuera.
    halo: wide ? { dx: r.range(20, 80), dy: spot.side * r.range(60, 120), radius: r.range(170, 220) } : { dx: spot.side * r.range(60, 120), dy: r.range(20, 80), radius: r.range(170, 220) },
    name: nameOf(r).toUpperCase(),
    code: r.range(10, 99).toFixed(5),
    // La etiqueta, hacia fuera del hub, salvo que no quepa en el mapa (a lo ancho, hacia
    // la derecha, si cabe).
    side: spot.x > WIDTH - 380 ? -1 : spot.x < 380 ? 1 : wide ? 1 : spot.side,
  };
  system.routes.push({ from: system.hub, to: system.capital, color: 'light' });
  system.routes.push({ from: system.jumps[Math.max(0, hubIndex - 2)], to: system.capital, color: 'light' });

  // ---- El número de la carta, abajo a la derecha (su esquina queda libre).
  system.number = { x: WIDTH - 90, y: HEIGHT - 90 };

  // ---- Los planetas menores, por todo el mapa, sin pisar a los grandes, ni las etiquetas
  // de los jump points (su franja, de punta a punta), ni el número. Primero se decide cómo
  // es cada uno (con su órbita, ocupa más) y luego se le busca sitio.
  const taken = [...system.jumps.map((o) => ({ x: o.x, y: o.y, reach: 40 })), { x: system.capital.x, y: system.capital.y, reach: system.capital.hexagon + 10 }];
  const n = system.number;
  const labels = system.jumps.map(labelBox);
  const capitalEnd = system.capital.x + system.capital.side * (system.capital.hexagon + 270);
  labels.push({ left: Math.min(system.capital.x, capitalEnd), right: Math.max(system.capital.x, capitalEnd), top: system.capital.y - 20, bottom: system.capital.y + 4 });
  const free = (px, py, reach) =>
    taken.every((o) => Math.hypot(o.x - px, o.y - py) > reach + o.reach + 30) &&
    labels.every((l) => px < l.left - reach || px > l.right + reach || py < l.top - reach - 20 || py > l.bottom + reach + 20) &&
    !(px > n.x - 160 - reach && py > n.y - 80 - reach);
  for (let k = 0, tries = 0; k < planetCount && tries < 600; tries++) {
    const planet = {
      size: r.range(4.5, 9),
      color: r.weighted([['primary', 5], ['light', 3], ['accent', 3]]),
      code: r.chance(0.45) ? codeOf(r) : null,
    };
    // Algunos, con una órbita amplia y una luna que la recorre (y alguno, dos).
    if (r.chance(0.35)) {
      planet.orbit = {
        radius: r.range(45, 120),
        dotted: r.chance(0.6),
        color: r.weighted([['primary', 3], ['light', 2], ['accent', 1]]),
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
    .map((radius) => ({ radius, phase: r.range(0, Math.PI * 2), speed: (r.chance(0.5) ? 1 : -1) * (6 / radius), size: r.range(2.5, 4), color: r.pick(['primary', 'light', 'accent']) }));

  // ---- La corriente: una gran curva de punta a punta, como la cadena (sus puntos de paso; draw.js la
  // suaviza).
  const flow = [];
  const flowStart = r.range(0.2, 0.8);
  for (let k = 0; k <= 8; k++) {
    const t = k / 8;
    const a = breadth * (flowStart + Math.sin(t * Math.PI * r.range(1.2, 2) + r.range(-0.4, 0.4)) * 0.35);
    const b = -900 + t * (length + 1800);
    flow.push(wide ? { x: b, y: a } : { x: a, y: b });
  }
  system.flow = flow;

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
        color: r.weighted([['primary', 3], ['light', 3], ['accent', 1.6], ['faint', 2.6]]),
        ring: r.chance(0.35),
        size: r.range(0.9, 2.1) * (0.7 + depth * 0.5),
        // Algunas titilan: con qué ritmo y desde cuándo.
        twinkle: r.chance(0.18) ? r.range(0.6, 2.2) : 0,
        phase: r.range(0, Math.PI * 2),
      });
    }
    // Cruces, en todas las capas, de tamaños muy distintos: casi todas pequeñas, algunas
    // medianas y pocas grandes (y las grandes, en las capas cercanas); casi todas del color
    // más apagado, alguna del principal.
    for (let k = 0; k < Math.round(total * 0.07); k++) {
      const size = r.weighted([[r.range(2, 4), 6], [r.range(5, 8), 3], [r.range(9, 14) * depth, 1]]);
      system.crosses.push({ layer, x: r.range(-STAR_MARGIN, w - STAR_MARGIN), y: r.range(-STAR_MARGIN, h - STAR_MARGIN), size, color: r.chance(0.15) ? 'primary' : 'faint' });
    }
    // Y chevrones, en la capa más cercana del manto.
    if (layer === LAYERS.length - 1) {
      for (let k = 0; k < Math.round(total * 0.025); k++) {
        system.chevrons.push({
          layer,
          x: r.range(-STAR_MARGIN, w - STAR_MARGIN),
          y: r.range(-STAR_MARGIN, h - STAR_MARGIN),
          // Un par hacia los lados («< >»), uno hacia arriba y abajo, o los cuatro.
          kind: r.weighted([['across', 2], ['updown', 1.2], ['all', 1]]),
          color: r.chance(0.6) ? 'primary' : 'faint',
          gap: r.range(8, 14),
        });
      }
    }
  }
  return system;
}
