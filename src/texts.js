// =========================================================================================
// Las historias del bloque de texto
// =========================================================================================
//
// Cada carta lleva una, elegida por su semilla. En inglés, como el resto de la carta: un
// título en negrita y, tras «//», el cuerpo en cursiva.

const TEXTS = [
  {
    title: 'CARTOGRAPHERS',
    body: 'Nobody remembers who drew the first chart. Every jump point on it was paid for by a crew that did not come back, and every number beside it is the distance they were sure of at the time. We still trust them. We have no choice.',
  },
  {
    title: 'BEACONS',
    body: 'A jump point is only a promise: a small machine, left alone in the dark, that keeps repeating where it is. Some have been repeating it for three hundred years. Some are no longer where they say they are.',
  },
  {
    title: 'DRIFT',
    body: 'Orbits are slower out here, and the moons keep their own time. Pilots learn to read the chart twice: once for where things are, and once for where they will be by the time you arrive.',
  },
  {
    title: 'THE HEXAGON',
    body: 'The capital sits inside a fence of light, six sides wide. Nobody remembers who built it or what it keeps out. Ships slow down when they cross it, out of respect, or fear, which out here are the same thing.',
  },
  {
    title: 'SURVEYORS',
    body: 'They travel in pairs and never jump blind. One measures, the other writes the number down. When only one ship comes back, the chart gets a new point and a name nobody says out loud.',
  },
  {
    title: 'STATIC',
    body: 'Between two jump points there is nothing but static and the long green current that carries everything south. Listen long enough and the static starts to sound like voices. Every crew is told not to answer.',
  },
];

export const pick = (r) => r.pick(TEXTS);
