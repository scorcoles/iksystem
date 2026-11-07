# iksystem

Una carta estelar viva: planetas, lunas, rutas y jump points sobre un manto de estrellas. Un experimento de [VERTIK](https://www.vertik.net).

Demo: [scorcoles.github.io/iksystem](https://scorcoles.github.io/iksystem/) · En la web: [vertik.net/iksystem](https://www.vertik.net/iksystem/)

- En pantallas apaisadas (escritorio), la carta va a lo ancho: la cadena de jump points de izquierda a derecha, con sus etiquetas en codo hacia arriba o hacia abajo; en vertical (móvil), de arriba abajo. Si la pantalla gira, la misma carta se recoloca.
- Cada carta sale de un número (`#67`, abajo y en la dirección): el mismo número da siempre el mismo sistema. «← Prev · Next →» (o las flechas) pasan a la carta anterior o la siguiente.
- Cada carta lleva su paleta (cinco, elegidas por la semilla: ámbar, hielo, rosa, violeta y señal) y entre 15 y 35 planetas menores.
- Lo que hay: un manto de estrellas en tres capas (sólidas o solo borde, con cruces de tamaños muy distintos y chevrones); una gran corriente; el hub, un planeta con círculos concéntricos de puntos; la capital, un planeta lima en un hexágono con otro interior en discontinua; una cadena de jump points con su nombre, su distancia y sus rutas; planetas menores con su código («E.57»), algunos con órbitas, lunas y nombre. Los nombres se forman con listas de nombres enteros y medios nombres que se juntan, y a veces llevan un número romano o una letra griega («Aregon IV», «Cassen Tau»).
- Está viva: las lunas dan vueltas, las estrellas titilan y los círculos punteados giran despacio.
- Arrastrar mueve la carta (con inercia); la rueda o pellizcar acercan y alejan; mantener pulsado sin moverse se acerca hacia ese punto; doble toque, vuelta al principio.
- Parallax: el cursor (o, en el móvil, inclinarlo) mueve las estrellas, cada capa a su profundidad. Y el manto está muy lejos: el zoom apenas le afecta (y se repite sin fin, sin borde), así que al alejarse la carta se lee por encima.
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
