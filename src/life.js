// =========================================================================================
// La vida de la carta: lo que pasa aunque nadie la toque
// =========================================================================================
//
//   - NAVES en tránsito: puntitos con una estela corta que van por las rutas de un jump
//     point a otro; al llegar, un destello (el salto), esperan un poco y siguen;
//   - BALIZAS: cada pocos segundos, un jump point emite una onda doble que se abre y se
//     apaga, con su pitido de telemetría (sound.js);
//   - SUCESOS raros, uno cada mucho (y donde se vean):
//       · un COMETA cruza la pantalla, con su cola;
//       · un jump point pierde la señal: parpadea y su etiqueta dice «SIGNAL LOST» unos
//         segundos (draw.js lo mira en jump.lost), con un chisporroteo de radio;
//       · un RECONOCIMIENTO: se traza, poco a poco y en discontinua, una ruta nueva entre dos
//         cuerpos que no estaban unidos; se queda un rato y se va.
//
// Todo con Math.random (no con la semilla): lo que pasa no es parte de la carta, es el
// momento.

// Las naves: cuántas por ruta, su velocidad (unidades por segundo, entre y), lo que esperan
// en cada jump point (segundos) y lo larga que es su estela (unidades).
const SHIPS_PER_ROUTE = 0.5;
const SHIP_SPEED = [35, 80];
const SHIP_WAIT = [0.8, 4];
const TRAIL = 64;
// El destello del salto: lo que crece (unidades) y lo que dura (segundos).
const FLASH_RADIUS = 26;
const FLASH_LENGTH = 0.7;

// Las balizas: cada cuánto (segundos, entre y), lo que crece la onda y lo que dura.
const BEACON_EVERY = [3, 8];
const BEACON_RADIUS = 150;
const BEACON_LENGTH = 2.8;

// Los sucesos: cada cuánto (segundos, entre y), y lo que dura cada uno.
const EVENT_EVERY = [22, 45];
const COMET_LENGTH = [3.5, 6];
const LOST_LENGTH = 7;
const SURVEY_DRAW = 5;
const SURVEY_STAY = 9;
const SURVEY_FADE = 3;

const random = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

export function createLife(system, sound) {
  // Las rutas, como un grafo: de cada jump point, a cuáles se puede ir.
  const links = new Map();
  const link = (a, b) => {
    if (!links.has(a)) links.set(a, []);
    links.get(a).push(b);
  };
  for (const { from, to } of system.routes) {
    link(from, to);
    link(to, from);
  }
  const nodes = [...links.keys()];

  const ships = [];
  const count = Math.max(3, Math.round(system.routes.length * SHIPS_PER_ROUTE));
  for (let i = 0; i < count; i++) {
    const at = pick(nodes);
    ships.push({ from: at, to: pick(links.get(at)), t: Math.random(), speed: random(...SHIP_SPEED), wait: 0, color: Math.random() < 0.3 ? 'accent' : 'light' });
  }
  const flashes = [];
  const beacons = [];
  let beaconTimer = random(1, 3);
  let eventTimer = random(10, 20);
  let comet = null;
  let lost = null;
  let survey = null;

  // Lo que se ve del mapa ahora (para que los sucesos pasen a la vista) y dónde queda un
  // punto en la pantalla, de -1 a 1 (para el sonido).
  const viewOf = (cam) => {
    const hw = cam.width / 2 / cam.zoom;
    const hh = cam.height / 2 / cam.zoom;
    return { left: cam.x - hw, right: cam.x + hw, top: cam.y - hh, bottom: cam.y + hh };
  };
  const inView = (v, o, pad = 0) => o.x > v.left + pad && o.x < v.right - pad && o.y > v.top + pad && o.y < v.bottom - pad;
  const panOf = (cam, x) => Math.max(-1, Math.min(1, ((x - cam.x) * cam.zoom) / (cam.width / 2)));

  function startEvent(cam, kind = pick(['comet', 'lost', 'survey'])) {
    const v = viewOf(cam);
    if (kind === 'comet' && !comet) {
      // De un borde de la vista al contrario, en diagonal.
      const fromLeft = Math.random() < 0.5;
      const y0 = random(v.top, v.bottom);
      const y1 = y0 + random(-0.6, 0.6) * (v.bottom - v.top);
      const pad = 200 / cam.zoom;
      comet = { x0: fromLeft ? v.left - pad : v.right + pad, y0, x1: fromLeft ? v.right + pad : v.left - pad, y1, t: 0, length: random(...COMET_LENGTH) };
      sound.comet(fromLeft ? -1 : 1, fromLeft ? 1 : -1, comet.length);
    } else if (kind === 'lost' && !lost) {
      const seen = system.jumps.filter((j) => !j.hub && inView(v, j, 40 / cam.zoom));
      const jump = pick(seen.length ? seen : system.jumps.filter((j) => !j.hub));
      lost = { jump, t: 0 };
      sound.glitch(panOf(cam, jump.x));
    } else if (!survey) {
      // Dos cuerpos a la vista (o cerca) que no estén ya unidos.
      const bodies = [...system.jumps, system.capital, ...system.planets];
      const near = bodies.filter((b) => inView(v, b, -200 / cam.zoom));
      const pool = near.length > 2 ? near : bodies;
      for (let tries = 0; tries < 20; tries++) {
        const a = pick(pool);
        const b = pick(pool);
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (a === b || d < 200 || d > 900 || links.get(a)?.includes(b)) continue;
        survey = { a, b, t: 0 };
        break;
      }
    }
  }

  return {
    update(dt, cam) {
      // Las naves.
      for (const ship of ships) {
        if (ship.wait > 0) {
          ship.wait -= dt;
          continue;
        }
        const d = Math.hypot(ship.to.x - ship.from.x, ship.to.y - ship.from.y) || 1;
        ship.t += (ship.speed * dt) / d;
        if (ship.t >= 1) {
          // Llega: el salto, un rato quieta y a por otro (mejor no volver por donde vino).
          flashes.push({ x: ship.to.x, y: ship.to.y, age: 0, color: ship.color });
          if (inView(viewOf(cam), ship.to)) sound.jump(panOf(cam, ship.to.x));
          const options = links.get(ship.to).filter((n) => n !== ship.from);
          ship.from = ship.to;
          ship.to = pick(options.length ? options : links.get(ship.from));
          ship.t = 0;
          ship.wait = random(...SHIP_WAIT);
        }
      }
      for (let i = flashes.length - 1; i >= 0; i--) if ((flashes[i].age += dt) > FLASH_LENGTH) flashes.splice(i, 1);

      // Las balizas: mejor una que se vea, para que el pitido tenga de dónde salir.
      beaconTimer -= dt;
      if (beaconTimer <= 0) {
        beaconTimer = random(...BEACON_EVERY);
        const v = viewOf(cam);
        const ready = system.jumps.filter((j) => j !== lost?.jump);
        const seen = ready.filter((j) => inView(v, j));
        const jump = pick(seen.length ? seen : ready);
        beacons.push({ x: jump.x, y: jump.y, age: 0, color: jump.color });
        if (seen.length) sound.beacon(panOf(cam, jump.x));
      }
      for (let i = beacons.length - 1; i >= 0; i--) if ((beacons[i].age += dt) > BEACON_LENGTH) beacons.splice(i, 1);

      // Los sucesos.
      eventTimer -= dt;
      if (eventTimer <= 0) {
        eventTimer = random(...EVENT_EVERY);
        startEvent(cam);
      }
      if (comet && (comet.t += dt / comet.length) >= 1) comet = null;
      for (const jump of system.jumps) jump.lost = false;
      if (lost) {
        lost.t += dt;
        // Parpadea al perderla y al recuperarla; entre medias, apagada.
        lost.jump.lost = lost.t < LOST_LENGTH;
        lost.jump.blink = lost.t < 1.2 || lost.t > LOST_LENGTH - 1 ? Math.floor(lost.t * 8) % 2 === 0 : false;
        if (lost.t >= LOST_LENGTH) lost = null;
      }
      if (survey && (survey.t += dt) > SURVEY_DRAW + SURVEY_STAY + SURVEY_FADE) survey = null;
    },

    // Con la cámara de la carta ya puesta (unidades del mapa). «px», un píxel de pantalla.
    draw(ctx, px) {
      const colors = system.palette;
      ctx.lineCap = 'round';

      // El reconocimiento: una discontinua que avanza de un cuerpo al otro y luego se va.
      if (survey) {
        const { a, b, t } = survey;
        const grow = Math.min(1, t / SURVEY_DRAW);
        const fade = t > SURVEY_DRAW + SURVEY_STAY ? 1 - (t - SURVEY_DRAW - SURVEY_STAY) / SURVEY_FADE : 1;
        ctx.globalAlpha = fade;
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = 1.2 * px;
        ctx.setLineDash([6 * px, 5 * px]);
        ctx.lineDashOffset = -t * 12 * px;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x + (b.x - a.x) * grow, a.y + (b.y - a.y) * grow);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
        // En la punta, mientras se traza, un puntito.
        if (grow < 1) {
          ctx.fillStyle = colors.accent;
          ctx.beginPath();
          ctx.arc(a.x + (b.x - a.x) * grow, a.y + (b.y - a.y) * grow, 2.5 * px, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Las balizas: dos anillos, uno detrás del otro.
      for (const beacon of beacons) {
        ctx.strokeStyle = colors[beacon.color];
        ctx.lineWidth = px;
        for (const delay of [0, 0.35]) {
          const t = (beacon.age - delay) / (BEACON_LENGTH - delay);
          if (t <= 0 || t >= 1) continue;
          ctx.globalAlpha = (1 - t) * 0.8;
          ctx.beginPath();
          ctx.arc(beacon.x, beacon.y, 14 + (1 - (1 - t) ** 2) * BEACON_RADIUS, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Las naves: la estela (una línea que se apaga hacia atrás) y la nave.
      for (const ship of ships) {
        const dx = ship.to.x - ship.from.x;
        const dy = ship.to.y - ship.from.y;
        const d = Math.hypot(dx, dy) || 1;
        if (ship.wait > 0) continue;
        const x = ship.from.x + dx * ship.t;
        const y = ship.from.y + dy * ship.t;
        const back = Math.min(TRAIL, ship.t * d);
        const tx = x - (dx / d) * back;
        const ty = y - (dy / d) * back;
        const gradient = ctx.createLinearGradient(tx, ty, x, y);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, colors[ship.color]);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.6 * px;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = colors[ship.color];
        ctx.beginPath();
        ctx.arc(x, y, 2.8 * px, 0, Math.PI * 2);
        ctx.fill();
      }
      // Los saltos.
      for (const flash of flashes) {
        const t = flash.age / FLASH_LENGTH;
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = colors[flash.color];
        ctx.lineWidth = 1.4 * px;
        ctx.beginPath();
        ctx.arc(flash.x, flash.y, 6 + t * FLASH_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // El cometa: la cabeza y una cola que se abre hacia atrás.
      if (comet) {
        const { x0, y0, x1, y1, t } = comet;
        const x = x0 + (x1 - x0) * t;
        const y = y0 + (y1 - y0) * t;
        const d = Math.hypot(x1 - x0, y1 - y0) || 1;
        const tail = 180 * px;
        const tx = x - ((x1 - x0) / d) * tail;
        const ty = y - ((y1 - y0) / d) * tail;
        const gradient = ctx.createLinearGradient(tx, ty, x, y);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, colors.light);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2 * px;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = colors.light;
        ctx.beginPath();
        ctx.arc(x, y, 2.6 * px, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    // Para probar desde la consola: iksystem.event('comet'), 'lost' o 'survey'.
    force(kind, cam) {
      if (kind === 'comet') comet = null;
      if (kind === 'lost') lost = null;
      if (kind === 'survey') survey = null;
      startEvent(cam, kind);
    },
  };
}
