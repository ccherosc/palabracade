import snakeMeta from '../games/snake-sentences/metadata.js';
import whackMeta from '../games/word-whack/metadata.js';
import conexMeta from '../games/conexiones/metadata.js';
import mercadoMeta from '../games/memory-mercado/metadata.js';
import flappyMeta from '../games/flappy-vocab/metadata.js';
import verbMeta from '../games/verb-runner/metadata.js';
import invadersMeta from '../games/palabra-invaders/metadata.js';
import ahorcadoMeta from '../games/ahorcado/metadata.js';
import castleMeta from '../games/conjugation-castle/metadata.js';
import radarMeta from '../games/radar-relay/metadata.js';
import phraseMeta from '../games/phrase-forge/metadata.js';

const registry = [
  snakeMeta,
  whackMeta,
  conexMeta,
  mercadoMeta,
  ahorcadoMeta,
  verbMeta,
  invadersMeta,
  flappyMeta,
  castleMeta,
  radarMeta,
  phraseMeta,
];

export function getAllGames() { return registry; }
export function getGamesByStatus(s) { return registry.filter(g => g.status === s); }
export function getGameById(id) { return registry.find(g => g.id === id) ?? null; }

export const STATUS = { WORKING: 'working', WIP: 'wip', SOON: 'soon' };
