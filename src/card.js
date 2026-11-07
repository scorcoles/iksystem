// =========================================================================================
// La ficha, en la página
// =========================================================================================
//
// Pinta en <aside data-card> la ficha que da profile.js: el nombre, qué es, sus datos en
// filas y, abajo, de qué está hecho su aire, en una barra partida por gases. Se cierra con
// la ×, con Esc o tocando en un sitio vacío de la carta (main.js).

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

export function createCard(root, onClose) {
  if (!root) return { show() {}, hide() {}, open: () => false };

  function hide() {
    root.hidden = true;
    root.replaceChildren();
  }

  // «palette»: los colores de la carta, para la barra del aire.
  function show(profile, palette) {
    root.replaceChildren();

    const head = el('header', 'card__head');
    const titles = el('div');
    titles.append(el('p', 'card__role', profile.role + (profile.distance ? ` · ${profile.distance}` : '')), el('h2', 'card__name', profile.name));
    const close = el('button', 'card__close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Cerrar la ficha');
    close.addEventListener('click', () => {
      hide();
      onClose?.();
    });
    head.append(titles, close);

    const rows = el('dl', 'card__rows');
    for (const [key, value] of profile.rows) rows.append(el('dt', null, key), el('dd', null, value));

    root.append(head, rows);

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
    root.append(air);
    root.hidden = false;
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !root.hidden) {
      hide();
      onClose?.();
    }
  });

  return { show, hide, open: () => !root.hidden };
}
