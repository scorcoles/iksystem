// =========================================================================================
// La ficha de un planeta: sus características
// =========================================================================================
//
// Al tocar un planeta (o su nombre), main.js abre una ficha con lo que se sabe de él. Todo
// sale de la semilla de la carta y del sitio del planeta: el mismo planeta, la misma ficha.
// Primero se elige su TIPO (rocoso, gigante gaseoso, oceánico...), y de él sale lo demás,
// con sentido: la masa y el radio (y de ellos, la gravedad), la temperatura, la atmósfera
// (qué gases y a qué presión), si es habitable, si está habitado y por quién, sus recursos,
// la duración del día y del año, y el riesgo para la navegación. En inglés, como la carta.
//
// Los PRINCIPALES (la capital, el hub y los jump points) son siempre habitables: rocosos u
// oceánicos, templados, con una gravedad llevadera y aire con oxígeno.

import { random } from './system.js';

// Los tipos: su peso (lo a menudo que salen), su masa y su radio (en Tierras, entre y), su
// temperatura media (°C, entre y), su presión (atmósferas, entre y) y los gases de su aire,
// con su peso cada uno.
const TYPES = [
  { name: 'Rocky', weight: 4, mass: [0.3, 3], radius: [0.6, 1.5], temp: [-60, 60], pressure: [0.2, 3], gases: { N2: 6, O2: 2, CO2: 2, Ar: 1 } },
  { name: 'Ocean world', weight: 2, mass: [0.8, 5], radius: [1, 1.8], temp: [0, 45], pressure: [0.8, 4], gases: { N2: 5, O2: 3, H2O: 2, CO2: 1 } },
  { name: 'Desert', weight: 2, mass: [0.2, 2], radius: [0.5, 1.3], temp: [20, 110], pressure: [0.05, 1], gases: { CO2: 5, N2: 3, Ar: 1 } },
  { name: 'Volcanic', weight: 1.5, mass: [0.4, 2.5], radius: [0.6, 1.3], temp: [150, 460], pressure: [2, 90], gases: { CO2: 6, SO2: 3, N2: 1 } },
  { name: 'Ice world', weight: 2, mass: [0.1, 1.5], radius: [0.4, 1.2], temp: [-220, -70], pressure: [0, 1.5], gases: { N2: 5, CH4: 3, CO: 1 } },
  { name: 'Gas giant', weight: 2, mass: [40, 400], radius: [6, 13], temp: [-160, -90], pressure: [1000, 1000], gases: { H2: 8, He: 2, CH4: 0.4, NH3: 0.2 } },
  { name: 'Ice giant', weight: 1.5, mass: [10, 25], radius: [3.5, 5], temp: [-220, -180], pressure: [1000, 1000], gases: { H2: 7, He: 2, CH4: 1 } },
  { name: 'Dwarf', weight: 1.5, mass: [0.01, 0.1], radius: [0.15, 0.4], temp: [-200, 20], pressure: [0, 0.01], gases: {} },
];

const GAS_NAMES = { N2: 'N₂', O2: 'O₂', CO2: 'CO₂', Ar: 'Ar', H2O: 'H₂O', SO2: 'SO₂', CH4: 'CH₄', CO: 'CO', H2: 'H₂', He: 'He', NH3: 'NH₃' };

const RESOURCES = {
  Rocky: ['Iron', 'Nickel', 'Silicates', 'Rare earths', 'Copper', 'Water ice'],
  'Ocean world': ['Water', 'Deuterium', 'Biomass', 'Salts'],
  Desert: ['Silicon', 'Titanium', 'Rare earths', 'Glass sand'],
  Volcanic: ['Sulfur', 'Platinum', 'Geothermal', 'Obsidian'],
  'Ice world': ['Water ice', 'Methane', 'Nitrogen', 'Ammonia'],
  'Gas giant': ['Helium-3', 'Hydrogen', 'Deuterium'],
  'Ice giant': ['Methane', 'Helium-3', 'Ammonia'],
  Dwarf: ['Iron', 'Iridium', 'Water ice'],
};

// Quién vive allí (si hay alguien), de menos a más.
const OUTPOSTS = ['Survey station', 'Mining outpost', 'Relay crew', 'Research base', 'Refinery'];
const COLONIES = ['Colony', 'Settlement', 'Free port', 'Orbital city'];

const round = (v, digits) => Number(v.toFixed(digits));

// «body»: un planeta, un jump point o la capital (system.js); «system», la carta.
export function profileOf(system, body) {
  const r = random((system.seed * 7919) ^ Math.round(body.x * 73) ^ Math.round(body.y * 131));
  const kind = body === system.capital ? 'capital' : body.hub ? 'hub' : system.jumps.includes(body) ? 'jump' : 'planet';

  const main = kind !== 'planet';
  const types = main ? TYPES.filter((t) => ['Rocky', 'Ocean world'].includes(t.name)) : TYPES;
  const type = r.weighted(types.map((t) => [t, t.weight]));
  // Los principales, con una masa y un radio que dan una gravedad de entre 0,6 y 1,4 g.
  const mass = main ? r.range(0.5, 2.2) : r.range(...type.mass);
  const radius = main
    ? Math.sqrt(mass / r.range(0.6, 1.4))
    : Math.min(type.radius[1], Math.max(type.radius[0], Math.cbrt(mass) * r.range(0.9, 1.1) * (type.name.includes('giant') ? 1.6 : 1)));
  const gravity = mass / radius ** 2;
  const temp = main ? r.range(4, 28) : r.range(...type.temp);
  const pressure = main ? r.range(0.7, 1.6) : r.range(...type.pressure);

  // El aire: los gases de su tipo (los principales, aire respirable), con su parte de cada
  // uno (y en orden).
  const air = main ? { N2: 7, O2: 2.6, Ar: 0.1, CO2: 0.05 } : type.gases;
  const gases = Object.entries(air)
    .map(([gas, weight]) => [gas, weight * r.range(0.5, 1.5)])
    .filter(([, w]) => w > 0);
  const total = gases.reduce((s, [, w]) => s + w, 0);
  const atmosphere = gases
    .map(([gas, w]) => ({ gas: GAS_NAMES[gas], share: (w / total) * 100 }))
    .sort((a, b) => b.share - a.share)
    .filter((g) => g.share >= 0.5);

  // ¿Habitable? Con oxígeno, a una temperatura y gravedad llevaderas y con algo de aire.
  const oxygen = atmosphere.find((g) => g.gas === 'O₂')?.share ?? 0;
  const mild = temp > -15 && temp < 45 && gravity > 0.4 && gravity < 1.8 && pressure > 0.5 && pressure < 5;
  const habitable = main || (mild && oxygen > 12) ? 'Yes' : mild || (temp > -40 && temp < 70 && gravity < 2.5 && !type.name.includes('giant')) ? 'Marginal' : 'No';

  // ¿Habitado? La capital, mucho; el hub, una estación; los jump points, casi siempre una
  // tripulación; los demás, según lo habitables que sean.
  let inhabited;
  if (kind === 'capital') inhabited = `Capital · ${r.range(0.8, 9).toFixed(1)} B`;
  else if (kind === 'hub') inhabited = `${r.pick(COLONIES)} · ${r.range(20, 900).toFixed(0)} M`;
  else if (habitable === 'Yes' && r.chance(0.7)) inhabited = `${r.pick(COLONIES)} · ${r.range(0.1, 40).toFixed(1)} M`;
  else if (kind === 'jump' && r.chance(0.5)) inhabited = `${r.pick(COLONIES)} · ${r.range(0.1, 12).toFixed(1)} M`;
  else if (kind === 'jump' || r.chance(habitable === 'Marginal' ? 0.45 : 0.2)) inhabited = `${r.pick(OUTPOSTS)} · ${r.int(6, 900)}`;
  else inhabited = 'Uninhabited';

  const resources = [...RESOURCES[type.name]].sort(() => r.next() - 0.5).slice(0, r.int(1, 3));
  const day = type.name.includes('giant') ? r.range(8, 20) : r.range(6, 80);
  const year = r.range(40, 2400);
  const moons = body.orbit ? body.orbit.moons.length : kind === 'hub' ? (body.moons?.length ?? 0) : type.name.includes('giant') ? r.int(2, 30) : r.int(0, 2);
  const hazard = r.weighted([['Low', 4], ['Moderate', 3], ['High', 1.5], ['Extreme', 0.5]]);

  return {
    // Los que no tienen nombre ni código, el de catálogo de la carta.
    name: body.name ?? body.code ?? `IK-${system.seed}.${system.planets.indexOf(body) + 1}`,
    code: body.code ?? null,
    role: { capital: 'Capital', hub: 'Hub · Jump point', jump: 'Jump point', planet: body.orbit ? 'Planet' : 'Minor body' }[kind],
    distance: body.distance ?? null,
    color: body.color ?? 'accent',
    rows: [
      ['Type', type.name],
      ['Mass', `${round(mass, mass < 1 ? 2 : 1)} M⊕`],
      ['Radius', `${round(radius, 2)} R⊕`],
      ['Gravity', `${round(gravity, 2)} g`],
      ['Mean temp.', `${Math.round(temp)} °C`],
      ['Pressure', type.name.includes('giant') ? '— (no surface)' : pressure < 0.01 ? 'Trace' : `${round(pressure, pressure < 1 ? 2 : 1)} atm`],
      ['Day · Year', `${round(day, 1)} h · ${Math.round(year)} d`],
      ['Moons', String(moons)],
      ['Habitable', habitable],
      ['Inhabited', inhabited],
      ['Resources', resources.join(', ')],
      ['Nav. hazard', hazard],
    ],
    atmosphere,
  };
}
