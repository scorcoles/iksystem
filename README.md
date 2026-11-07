# iksystem

Una carta estelar viva: planetas, lunas, rutas y jump points sobre un manto de estrellas. Un experimento de [VERTIK](https://www.vertik.net).

Demo: [scorcoles.github.io/iksystem](https://scorcoles.github.io/iksystem/) · En la web: [vertik.net/iksystem](https://www.vertik.net/iksystem/)

- Cada carta sale de un número (`#67`, abajo y en la dirección): el mismo número da siempre el mismo sistema. «← Prev · Next →» (o las flechas) pasan a la carta anterior o la siguiente.
- Lo que hay: un manto de estrellas en tres capas (verdes, blancas, lima y azul marino, sólidas o solo borde, con cruces y chevrones); una gran corriente verde; el hub, un planeta con círculos concéntricos de puntos; la capital, un planeta lima en un hexágono con otro interior en discontinua; una cadena de jump points con su distancia y sus rutas; planetas menores con su código («E.57»), algunos con órbitas, lunas y nombre. Los nombres se forman con listas de nombres enteros y medios nombres que se juntan, y a veces llevan un número romano o una letra griega («Aregon IV», «Cassen Tau»).
- Está viva: las lunas dan vueltas, las estrellas titilan y los círculos punteados giran despacio.
- Arrastrar mueve la carta (con inercia); la rueda o pellizcar acercan y alejan; mantener pulsado sin moverse se acerca hacia ese punto; doble toque, vuelta al principio.
- Parallax: el cursor (o, en el móvil, inclinarlo) mueve las estrellas, cada capa a su profundidad.
- Tocar un planeta lo «llama»: una onda sale de él, con un ping de sonar.
- Sonido (el altavoz de arriba): un acorde quieto de fondo que respira, telemetría al azar (pitidos como un mensaje de lejos, con eco), viento al arrastrar y los pings.

## Cómo está hecho

[p5.js](https://p5js.org) (el lienzo y el bucle; se pinta con su contexto 2D) y [Vite](https://vite.dev).

| Archivo | Qué hace |
| --- | --- |
| `index.html` · `style.css` | La página: la carta a toda pantalla, el símbolo, los botones y el pie. |
| `src/main.js` | p5, la cámara, arrastrar, el zoom, el parallax y el número. |
| `src/system.js` | De un número, el sistema: qué hay y dónde. |
| `src/draw.js` | Pintarlo. |
| `src/names.js` | Los nombres de los planetas. |
| `src/sound.js` · `src/share.js` | El sonido y compartir. |
