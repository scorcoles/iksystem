// =========================================================================================
// Los nombres de los planetas
// =========================================================================================
//
// Se forman con tres listas, todo inventado: NAMES, nombres enteros; y FRONTS y BACKS,
// medios nombres que se juntan («Vel» + «thara» = «Velthara»). Y a veces, detrás, un número
// romano («Aregon IV») o una letra griega («Cassen Tau»), como los astros de un catálogo.

const NAMES = [
  'Aregon', 'Vesper', 'Calyx', 'Orrin', 'Tamsin', 'Isolde', 'Corvane', 'Merrow', 'Halcyon', 'Ostra',
  'Brannoc', 'Sabeline', 'Ithar', 'Kestrel', 'Lomond', 'Nyssa', 'Pallas', 'Quillon', 'Rhoswen', 'Sorrel',
  'Thessaly', 'Umbrel', 'Valdris', 'Wrenna', 'Yarrow', 'Zephine', 'Ancora', 'Belmor', 'Cendra', 'Dunmere',
  'Elowen', 'Fennic', 'Galdor', 'Hesper', 'Ivara', 'Joriel', 'Kaldra', 'Lirien', 'Morvain', 'Nerith',
];
const FRONTS = ['Vel', 'Ash', 'Cor', 'Dra', 'Eld', 'Fal', 'Gor', 'Hal', 'Ir', 'Kal', 'Lys', 'Mar', 'Nor', 'Os', 'Pyr', 'Quen', 'Ren', 'Sar', 'Tal', 'Ul', 'Var', 'Wyn', 'Xan', 'Zar', 'Cass', 'Bren', 'Thal', 'Mir', 'Sol', 'Aer'];
const BACKS = ['thara', 'mos', 'vane', 'dris', 'en', 'ion', 'ora', 'ith', 'akar', 'una', 'eth', 'oris', 'ane', 'ex', 'ira', 'ond', 'yra', 'avel', 'ost', 'imar', 'aris', 'el', 'onde', 'ul', 'essa', 'orn', 'ix', 'adra', 'iel', 'umbra'];
const NUMERALS = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'IX', 'XI', 'XII'];
const GREEK = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Tau', 'Sigma', 'Omicron', 'Kappa'];

// «r»: el generador con semilla de system.js.
export function nameOf(r) {
  const base = r.chance(0.45) ? r.pick(NAMES) : r.pick(FRONTS) + r.pick(BACKS);
  const tail = r.weighted([['', 4], ['numeral', 3], ['greek', 1]]);
  if (tail === 'numeral') return `${base} ${r.pick(NUMERALS)}`;
  if (tail === 'greek') return `${base} ${r.pick(GREEK)}`;
  return base;
}
