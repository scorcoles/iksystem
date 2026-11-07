// =========================================================================================
// La ficha, en la página
// =========================================================================================
//
// Pinta en <aside data-card> la ficha que da profile.js: el nombre, qué es, sus datos en
// filas y, abajo, de qué está hecho su aire, en una barra partida por gases. Se cierra con
// la ×, con Esc o tocando en un sitio vacío de la carta (main.js).
//
// En el escritorio, una ventanita que se ARRASTRA por su cabecera y se queda donde la
// dejes (también para las siguientes fichas). En el móvil, un CAJÓN que sube desde abajo:
// con su tirador, arrastrándolo hacia arriba se abre entero, hacia abajo se queda solo con
// el nombre a la vista («plegado») y, más abajo, se cierra; tocar la cabecera lo abre o lo
// pliega.

// Cuándo es un cajón: lo mismo que en style.css.
const DRAWER = window.matchMedia('(max-width: 47.99rem)');
// Lo que se ve del cajón plegado (píxeles) y cuánto hay que arrastrarlo para que cambie.
const PEEK = 84;
const SNAP = 60;

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

export function createCard(root, onClose) {
  if (!root) return { show() {}, hide() {}, open: () => false, area: () => null };

  // Dónde se dejó la ventanita en el escritorio (null: en su sitio de siempre).
  let placed = null;
  // El cajón: abierto del todo o plegado.
  let folded = false;

  function close() {
    hide();
    onClose?.();
  }

  function hide() {
    root.hidden = true;
    root.classList.remove('is-folded', 'is-dragging');
    root.style.transform = '';
    root.replaceChildren();
  }

  function fold(value) {
    folded = value;
    root.classList.toggle('is-folded', folded);
  }

  // «palette»: los colores de la carta, para la barra del aire.
  function show(profile, palette) {
    root.replaceChildren();

    // El tirador (solo se ve en el cajón).
    const grip = el('div', 'card__grip');
    grip.setAttribute('aria-hidden', 'true');

    const head = el('header', 'card__head');
    const titles = el('div');
    titles.append(el('p', 'card__role', profile.role + (profile.distance ? ` · ${profile.distance}` : '')), el('h2', 'card__name', profile.name));
    const closeButton = el('button', 'card__close', '×');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Cerrar la ficha');
    closeButton.addEventListener('click', close);
    head.append(titles, closeButton);

    const body = el('div', 'card__body');
    const rows = el('dl', 'card__rows');
    for (const [key, value] of profile.rows) rows.append(el('dt', null, key), el('dd', null, value));
    body.append(rows);

    // El aire: una barra con un trozo por gas, y debajo, la leyenda.
    const air = el('section', 'card__air');
    air.append(el('h3', null, 'Atmosphere'));
    if (profile.atmosphere.length) {
      const bar = el('div', 'card__bar');
      const legend = el('ul', 'card__legend');
      const tones = [palette.primary, palette.accent, palette.light, palette.label, palette.faint];
      profile.atmosphere.forEach((gas, i) => {
        const piece = el('span');
        piece.style.width = `${gas.share}%`;
        piece.style.background = tones[i % tones.length];
        bar.append(piece);
        const item = el('li', null, `${gas.gas} ${gas.share < 10 ? gas.share.toFixed(1) : Math.round(gas.share)}%`);
        item.style.setProperty('--tone', tones[i % tones.length]);
        legend.append(item);
      });
      air.append(bar, legend);
    } else {
      air.append(el('p', 'card__none', 'None to speak of'));
    }
    body.append(air);

    root.append(grip, head, body);
    root.hidden = false;
    // Cada ficha nueva, el cajón abierto del todo (y entrando desde abajo).
    fold(false);
    if (DRAWER.matches) {
      root.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('is-entering')));
    }
    applyPlace();
    drag(head, grip);
  }

  // En el escritorio, la ventanita donde se dejó (sin salirse de la pantalla).
  function applyPlace() {
    if (DRAWER.matches || !placed) {
      root.style.left = '';
      root.style.top = '';
      return;
    }
    const w = root.offsetWidth;
    const h = root.offsetHeight;
    const x = Math.max(8, Math.min(window.innerWidth - w - 8, placed.x));
    const y = Math.max(8, Math.min(window.innerHeight - h - 8, placed.y));
    root.style.left = `${x}px`;
    root.style.top = `${y}px`;
  }

  // Arrastrar: en el escritorio, la ventanita entera; en el móvil, el cajón arriba y abajo.
  function drag(...handles) {
    for (const handle of handles) {
      handle.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button') || !e.isPrimary) return;
        e.preventDefault();
        handle.setPointerCapture?.(e.pointerId);
        const box = root.getBoundingClientRect();
        const start = { x: e.clientX, y: e.clientY, left: box.left, top: box.top };
        let moved = false;
        root.classList.add('is-dragging');
        const move = (ev) => {
          const dx = ev.clientX - start.x;
          const dy = ev.clientY - start.y;
          if (!moved && Math.hypot(dx, dy) > 4) moved = true;
          if (!moved) return;
          if (DRAWER.matches) {
            // Desde donde esté (abierto o plegado), sin subir de más.
            const base = folded ? root.offsetHeight - PEEK : 0;
            root.style.transform = `translateY(${Math.max(0, base + dy)}px)`;
          } else {
            placed = { x: start.left + dx, y: start.top + dy };
            applyPlace();
          }
        };
        const up = (ev) => {
          handle.removeEventListener('pointermove', move);
          handle.removeEventListener('pointerup', up);
          handle.removeEventListener('pointercancel', up);
          root.classList.remove('is-dragging');
          if (!DRAWER.matches) return;
          root.style.transform = '';
          const dy = ev.clientY - start.y;
          // Un toque, sin arrastrar: abrir o plegar.
          if (!moved) fold(!folded);
          else if (dy < -SNAP) fold(false);
          else if (dy > SNAP) {
            // Hacia abajo: si ya estaba plegado (o se arrastra mucho), se cierra.
            if (folded || dy > root.offsetHeight * 0.6) close();
            else fold(true);
          }
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', up);
        handle.addEventListener('pointercancel', up);
      });
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !root.hidden) close();
  });
  window.addEventListener('resize', () => {
    if (!root.hidden) applyPlace();
  });

  return {
    show,
    hide,
    open: () => !root.hidden,
    // Lo que tapará la ficha cuando acabe de abrirse (para que main.js aparte el planeta).
    area() {
      if (root.hidden) return null;
      if (!DRAWER.matches) return root.getBoundingClientRect();
      const top = window.innerHeight - root.offsetHeight;
      return { left: 0, right: window.innerWidth, top, bottom: window.innerHeight };
    },
  };
}
