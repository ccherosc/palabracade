// Lazy-loads word bank JSON files on demand.
// Each bank is an array of { en, es } objects.

const cache = {};

const BANKS = {
  beginner:  () => import('../data/wordBanks/beginner.json'),
  food:      () => import('../data/wordBanks/food.json'),
  animals:   () => import('../data/wordBanks/animals.json'),
  classroom: () => import('../data/wordBanks/classroom.json'),
  verbs:     () => import('../data/wordBanks/verbs.json'),
};

export async function loadBank(name) {
  if (cache[name]) return cache[name];
  const loader = BANKS[name];
  if (!loader) throw new Error(`Unknown word bank: ${name}`);
  const mod = await loader();
  cache[name] = mod.default;
  return cache[name];
}

export async function loadBanks(names) {
  const results = await Promise.all(names.map(loadBank));
  return results.flat();
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickRandom(arr, n = 1) {
  const shuffled = shuffle(arr);
  return n === 1 ? shuffled[0] : shuffled.slice(0, n);
}
