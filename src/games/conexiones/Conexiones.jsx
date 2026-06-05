import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AudioManager } from '../../engine/AudioManager.js';
import { ProgressSystem } from '../../engine/ProgressSystem.js';
import { shuffle } from '../../engine/WordBank.js';
import './Conexiones.css';

// ─── Category pool ────────────────────────────────────────────────────────────
const CATEGORY_POOL = [
  {
    id: 'animals', label: 'Animals', labelEs: 'Animales', color: '#22c55e',
    words: [
      { es: 'perro',    en: 'dog',    emoji: '🐶' },
      { es: 'gato',     en: 'cat',    emoji: '🐱' },
      { es: 'pájaro',   en: 'bird',   emoji: '🐦' },
      { es: 'pez',      en: 'fish',   emoji: '🐟' },
      { es: 'caballo',  en: 'horse',  emoji: '🐴' },
      { es: 'conejo',   en: 'rabbit', emoji: '🐰' },
    ],
  },
  {
    id: 'food', label: 'Food', labelEs: 'Comida', color: '#f97316',
    words: [
      { es: 'manzana', en: 'apple',   emoji: '🍎' },
      { es: 'pan',     en: 'bread',   emoji: '🍞' },
      { es: 'leche',   en: 'milk',    emoji: '🥛' },
      { es: 'huevo',   en: 'egg',     emoji: '🥚' },
      { es: 'pollo',   en: 'chicken', emoji: '🍗' },
      { es: 'arroz',   en: 'rice',    emoji: '🍚' },
    ],
  },
  {
    id: 'colors', label: 'Colors', labelEs: 'Colores', color: '#a855f7',
    words: [
      { es: 'rojo',     en: 'red',    emoji: '🔴' },
      { es: 'azul',     en: 'blue',   emoji: '🔵' },
      { es: 'verde',    en: 'green',  emoji: '🟢' },
      { es: 'amarillo', en: 'yellow', emoji: '🟡' },
      { es: 'blanco',   en: 'white',  emoji: '⚪' },
      { es: 'negro',    en: 'black',  emoji: '⚫' },
    ],
  },
  {
    id: 'numbers', label: 'Numbers', labelEs: 'Números', color: '#22d3ee',
    words: [
      { es: 'uno',    en: 'one',   emoji: '1️⃣' },
      { es: 'dos',    en: 'two',   emoji: '2️⃣' },
      { es: 'tres',   en: 'three', emoji: '3️⃣' },
      { es: 'cuatro', en: 'four',  emoji: '4️⃣' },
      { es: 'cinco',  en: 'five',  emoji: '5️⃣' },
      { es: 'seis',   en: 'six',   emoji: '6️⃣' },
    ],
  },
  {
    id: 'body', label: 'Body Parts', labelEs: 'Cuerpo', color: '#ec4899',
    words: [
      { es: 'cabeza', en: 'head',   emoji: '🗣️' },
      { es: 'mano',   en: 'hand',   emoji: '✋' },
      { es: 'pie',    en: 'foot',   emoji: '🦶' },
      { es: 'ojo',    en: 'eye',    emoji: '👁️' },
      { es: 'boca',   en: 'mouth',  emoji: '👄' },
      { es: 'nariz',  en: 'nose',   emoji: '👃' },
    ],
  },
  {
    id: 'school', label: 'School', labelEs: 'Escuela', color: '#fbbf24',
    words: [
      { es: 'libro',   en: 'book',       emoji: '📚' },
      { es: 'lápiz',   en: 'pencil',     emoji: '✏️' },
      { es: 'mesa',    en: 'desk',       emoji: '🪑' },
      { es: 'silla',   en: 'chair',      emoji: '💺' },
      { es: 'mochila', en: 'backpack',   emoji: '🎒' },
      { es: 'pizarra', en: 'chalkboard', emoji: '📋' },
    ],
  },
  {
    id: 'actions', label: 'Actions', labelEs: 'Acciones', color: '#f43f5e',
    words: [
      { es: 'correr', en: 'run',   emoji: '🏃' },
      { es: 'comer',  en: 'eat',   emoji: '🍽️' },
      { es: 'beber',  en: 'drink', emoji: '🥤' },
      { es: 'leer',   en: 'read',  emoji: '📖' },
      { es: 'hablar', en: 'speak', emoji: '💬' },
      { es: 'jugar',  en: 'play',  emoji: '⚽' },
    ],
  },
  {
    id: 'family', label: 'Family', labelEs: 'Familia', color: '#84cc16',
    words: [
      { es: 'mamá',    en: 'mom',         emoji: '👩' },
      { es: 'papá',    en: 'dad',         emoji: '👨' },
      { es: 'hermano', en: 'brother',     emoji: '👦' },
      { es: 'hermana', en: 'sister',      emoji: '👧' },
      { es: 'abuelo',  en: 'grandfather', emoji: '👴' },
      { es: 'abuela',  en: 'grandmother', emoji: '👵' },
    ],
  },
];

// ─── Tier config ──────────────────────────────────────────────────────────────
const TIERS = [
  {
    id: 1, name: 'Pollitos', icon: '🐣', numCats: 2, catSize: 4,
    showEmoji: true, maxAttempts: Infinity, ageRange: 'Ages 5–6',
    desc: 'Pictures + words · No wrong-answer penalty',
    color: '#22c55e',
  },
  {
    id: 2, name: 'Exploradores', icon: '🧭', numCats: 3, catSize: 4,
    showEmoji: true, maxAttempts: 4, ageRange: 'Ages 6–8',
    desc: 'Words with emoji hints · 4 attempts',
    color: '#fbbf24',
  },
  {
    id: 3, name: 'Campeones', icon: '⚡', numCats: 4, catSize: 4,
    showEmoji: false, maxAttempts: 4, ageRange: 'Ages 8–11',
    desc: 'Spanish words only · 4 attempts',
    color: '#f97316',
  },
];

// ─── Board builder ────────────────────────────────────────────────────────────
function buildBoard(tier) {
  const cats = shuffle(CATEGORY_POOL).slice(0, tier.numCats);
  const tiles = [];
  cats.forEach(cat => {
    const words = shuffle(cat.words).slice(0, tier.catSize);
    words.forEach(w => {
      tiles.push({
        id:         `${cat.id}-${w.es}`,
        es:         w.es,
        en:         w.en,
        emoji:      w.emoji,
        categoryId: cat.id,
        catLabel:   cat.label,
        catColor:   cat.color,
      });
    });
  });
  return { tiles: shuffle(tiles), cats };
}

// ─── Lobby ────────────────────────────────────────────────────────────────────
function Lobby({ onStart }) {
  const navigate = useNavigate();
  const progress = ProgressSystem.getGame('conexiones');

  return (
    <div className="con-lobby">
      <div className="con-lobby__card">
        <div className="con-lobby__header">
          <span className="con-lobby__icon">🔗</span>
          <div>
            <div className="con-lobby__title">Conexiones</div>
            <div className="con-lobby__sub">Group words that belong together</div>
          </div>
          <button className="con-lobby__back" onClick={() => navigate('/')}>← Menu</button>
        </div>

        <div className="con-lobby__tiers">
          {TIERS.map(tier => (
            <button key={tier.id} className="con-tier-btn" style={{ '--tc': tier.color }} onClick={() => onStart(tier)}>
              <span className="con-tier-btn__icon">{tier.icon}</span>
              <div className="con-tier-btn__body">
                <span className="con-tier-btn__name">{tier.name}</span>
                <span className="con-tier-btn__age">{tier.ageRange}</span>
                <span className="con-tier-btn__desc">{tier.desc}</span>
              </div>
              <span className="con-tier-btn__arrow">▶</span>
            </button>
          ))}
        </div>

        {progress.totalPlays > 0 && (
          <div className="con-lobby__stats">
            Best: {progress.highScore} pts · {progress.totalPlays} plays
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Attempt pips ─────────────────────────────────────────────────────────────
function AttemptPips({ max, left }) {
  if (!isFinite(max)) return null;
  return (
    <div className="con-attempts">
      <span className="con-attempts__label">Attempts left:</span>
      <div className="con-attempts__pips">
        {Array.from({ length: max }).map((_, i) => (
          <span key={i} className={`con-pip ${i < left ? 'con-pip--on' : 'con-pip--off'}`} />
        ))}
      </div>
    </div>
  );
}

// ─── Main game ────────────────────────────────────────────────────────────────
export default function Conexiones() {
  const [tier, setTier]           = useState(null);
  const [tiles, setTiles]         = useState([]);
  const [cats, setCats]           = useState([]);
  const [selected, setSelected]   = useState([]);
  const [solved, setSolved]       = useState([]);   // [{cat, words[]}]
  const [attemptsLeft, setAttempts] = useState(4);
  const [shaking, setShaking]     = useState(false);
  const [oneAway, setOneAway]     = useState(false);
  const [phase, setPhase]         = useState('lobby'); // lobby|playing|won|lost
  const [score, setScore]         = useState(0);
  const navigate = useNavigate();

  const startGame = useCallback((t) => {
    const { tiles: newTiles, cats: newCats } = buildBoard(t);
    setTier(t);
    setTiles(newTiles);
    setCats(newCats);
    setSelected([]);
    setSolved([]);
    setAttempts(isFinite(t.maxAttempts) ? t.maxAttempts : Infinity);
    setShaking(false);
    setOneAway(false);
    setScore(0);
    setPhase('playing');
  }, []);

  function toggleTile(id) {
    if (shaking || phase !== 'playing') return;
    setSelected(prev => {
      const already = prev.includes(id);
      if (already) return prev.filter(x => x !== id);
      if (prev.length >= tier.catSize) return prev; // full
      const next = [...prev, id];
      if (next.length === tier.catSize) {
        setTimeout(() => checkSelection(next), 50);
      }
      return next;
    });
  }

  function checkSelection(sel) {
    const selTiles = tiles.filter(t => sel.includes(t.id));
    const catIds   = selTiles.map(t => t.categoryId);
    const allSame  = catIds.every(c => c === catIds[0]);

    if (allSame) {
      // Correct!
      AudioManager.levelUp();
      const cat = cats.find(c => c.id === catIds[0]);
      const pts = isFinite(tier.maxAttempts)
        ? 100 + (attemptsLeft >= tier.maxAttempts ? 50 : 0)
        : 50;
      setScore(s => s + pts);
      setSolved(prev => [...prev, { cat, words: selTiles }]);
      setTiles(prev => prev.filter(t => !sel.includes(t.id)));
      setSelected([]);

      // Check win
      const remainingAfter = tiles.length - tier.catSize;
      if (remainingAfter === 0) {
        setTimeout(() => {
          setPhase('won');
          ProgressSystem.saveGame('conexiones', { score: score + pts });
          AudioManager.levelUp();
        }, 400);
      }
    } else {
      // Wrong
      AudioManager.wrong();

      // One-away hint: 3 of 4 tiles from same category
      const counts = {};
      catIds.forEach(c => { counts[c] = (counts[c] || 0) + 1; });
      const maxCount = Math.max(...Object.values(counts));
      if (maxCount === tier.catSize - 1) {
        setOneAway(true);
        setTimeout(() => setOneAway(false), 2000);
      }

      if (isFinite(tier.maxAttempts)) {
        const next = attemptsLeft - 1;
        setAttempts(next);
        if (next <= 0) {
          setShaking(true);
          setTimeout(() => {
            setShaking(false);
            setSelected([]);
            setPhase('lost');
            ProgressSystem.saveGame('conexiones', { score });
          }, 500);
          return;
        }
      }

      setShaking(true);
      setTimeout(() => {
        setShaking(false);
        setSelected([]);
      }, 500);
    }
  }

  if (phase === 'lobby') return <Lobby onStart={startGame} />;

  const activeTiles = tiles;
  const cols = tier.numCats === 2 ? 4 : tier.numCats === 3 ? 4 : 4;

  return (
    <div className="con-game">
      {/* Header */}
      <div className="con-header">
        <button className="con-header__back" onClick={() => setPhase('lobby')}>← Menu</button>
        <span className="con-header__title">Conexiones</span>
        <span className="con-header__tier" style={{ color: tier.color }}>{tier.icon} {tier.name}</span>
      </div>

      {/* Solved category banners */}
      <div className="con-solved-rows">
        {solved.map(({ cat, words }) => (
          <div key={cat.id} className="con-solved-row" style={{ '--cc': cat.color }}>
            <span className="con-solved-row__label">{cat.label}</span>
            <span className="con-solved-row__words">{words.map(w => w.es).join('  ·  ')}</span>
          </div>
        ))}
      </div>

      {/* Active board */}
      <div className={`con-board con-board--${tier.numCats}cat`} style={{ '--cols': cols }}>
        {activeTiles.map(tile => {
          const isSel = selected.includes(tile.id);
          return (
            <button
              key={tile.id}
              className={`con-tile ${isSel ? 'con-tile--selected' : ''} ${shaking && isSel ? 'con-tile--shake' : ''}`}
              onClick={() => toggleTile(tile.id)}
              disabled={phase !== 'playing'}
            >
              {tier.showEmoji && <span className="con-tile__emoji">{tile.emoji}</span>}
              <span className="con-tile__es">{tile.es}</span>
              <span className="con-tile__en">{tile.en}</span>
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      <div className="con-feedback">
        {oneAway && <div className="con-feedback__oneaway">🔥 One away!</div>}
        <AttemptPips max={tier.maxAttempts} left={attemptsLeft} />
      </div>

      {/* Win overlay */}
      {phase === 'won' && (
        <div className="con-overlay">
          <div className="con-overlay__box">
            <div className="con-overlay__emoji">🏆</div>
            <h2 className="con-overlay__title">¡Perfecto!</h2>
            <p className="con-overlay__sub">All groups found!</p>
            <div className="con-overlay__score">{score} points</div>
            <button className="con-overlay__btn" onClick={() => startGame(tier)}>▶ Play Again</button>
            <button className="con-overlay__btn con-overlay__btn--sec" onClick={() => setPhase('lobby')}>Change Tier</button>
          </div>
        </div>
      )}

      {/* Lost overlay */}
      {phase === 'lost' && (
        <div className="con-overlay">
          <div className="con-overlay__box">
            <div className="con-overlay__emoji">💭</div>
            <h2 className="con-overlay__title">Out of tries</h2>
            <p className="con-overlay__sub">The categories were:</p>
            <div className="con-overlay__reveals">
              {cats.map(cat => (
                <div key={cat.id} className="con-overlay__reveal" style={{ '--cc': cat.color }}>
                  <span>{cat.label}:</span>
                  <span>{cat.words.slice(0, tier.catSize).map(w => w.es).join(', ')}</span>
                </div>
              ))}
            </div>
            <button className="con-overlay__btn" onClick={() => startGame(tier)}>▶ Try Again</button>
            <button className="con-overlay__btn con-overlay__btn--sec" onClick={() => setPhase('lobby')}>Change Tier</button>
          </div>
        </div>
      )}
    </div>
  );
}
