import { SaveSystem } from './SaveSystem.js';

const KEY = 'progress';

function getAll() {
  return SaveSystem.get(KEY, {});
}

function getGame(gameId) {
  return getAll()[gameId] ?? {
    highScore: 0,
    bestStreak: 0,
    totalPlays: 0,
    totalPoints: 0,
    accuracy: 0,
    unlockedLevels: [0],
    lastPlayed: null,
  };
}

function saveGame(gameId, stats) {
  const all = getAll();
  const prev = getGame(gameId);
  all[gameId] = {
    highScore: Math.max(prev.highScore, stats.score ?? 0),
    bestStreak: Math.max(prev.bestStreak, stats.streak ?? 0),
    totalPlays: prev.totalPlays + 1,
    totalPoints: prev.totalPoints + (stats.score ?? 0),
    accuracy: stats.accuracy ?? prev.accuracy,
    unlockedLevels: stats.unlockedLevels ?? prev.unlockedLevels,
    lastPlayed: Date.now(),
  };
  SaveSystem.set(KEY, all);
  return all[gameId];
}

function getTotalPoints() {
  return Object.values(getAll()).reduce((sum, g) => sum + (g.totalPoints ?? 0), 0);
}

function getTotalPlays() {
  return Object.values(getAll()).reduce((sum, g) => sum + (g.totalPlays ?? 0), 0);
}

function getGamesPlayed() {
  return Object.entries(getAll())
    .filter(([, stats]) => (stats.totalPlays ?? 0) > 0)
    .map(([gameId]) => gameId);
}

function getRecentlyPlayed(limit = 3) {
  return Object.entries(getAll())
    .filter(([, stats]) => stats.lastPlayed)
    .sort((a, b) => (b[1].lastPlayed ?? 0) - (a[1].lastPlayed ?? 0))
    .slice(0, limit)
    .map(([gameId, stats]) => ({ gameId, ...stats }));
}

export const ProgressSystem = {
  getGame,
  saveGame,
  getTotalPoints,
  getTotalPlays,
  getGamesPlayed,
  getRecentlyPlayed,
  getAll,
};
