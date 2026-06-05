import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HUD from '../../components/HUD.jsx';
import { AudioManager } from '../../engine/AudioManager.js';
import { ProgressSystem } from '../../engine/ProgressSystem.js';
import { SaveSystem } from '../../engine/SaveSystem.js';
import { createInputHandler } from '../../engine/InputManager.js';
import sentencesData from '../../data/sentences.json';
import { shuffle } from '../../engine/WordBank.js';
import './SnakeSentences.css';

// ─── Difficulty config ────────────────────────────────────────────────────────
const DIFFICULTIES = {
  easy: {
    id: 'easy', label: 'Easy', icon: '🌟', color: '#22c55e',
    description: 'Next Spanish word glows on the board. Full sentence visible.',
    highlightTarget: true, panelHint: 'spanish',
    showFutureWords: true, sentenceLevels: ['easy'], decoys: 0,
  },
  challenger1: {
    id: 'challenger1', label: 'Challenger 1', icon: '⚡', color: '#fbbf24',
    description: 'English hint only — you find the Spanish word yourself.',
    highlightTarget: false, panelHint: 'english',
    showFutureWords: true, sentenceLevels: ['easy', 'medium'], decoys: 0,
  },
  challenger2: {
    id: 'challenger2', label: 'Challenger 2', icon: '🔥', color: '#f97316',
    description: 'English sentence only. No hints. Unvisited words hidden.',
    highlightTarget: false, panelHint: 'none',
    showFutureWords: false, sentenceLevels: ['medium', 'hard'], decoys: 0,
  },
  challenger3: {
    id: 'challenger3', label: 'Challenger 3', icon: '💀', color: '#ef4444',
    description: 'No hints + decoy words on the board. ¡Buena suerte!',
    highlightTarget: false, panelHint: 'none',
    showFutureWords: false, sentenceLevels: ['hard', 'challenge'], decoys: 3,
  },
};

// ─── Speed config ─────────────────────────────────────────────────────────────
const SPEED_NAMES = [
  { min:  1, max:  9, name: 'Glacial',               flavor: 'Plenty of time to think about your life choices.',    color: '#22c55e' },
  { min: 10, max: 19, name: 'Sunday Stroll',          flavor: 'The snake is wearing sandals.',                       color: '#4ade80' },
  { min: 20, max: 29, name: 'Warming Up',             flavor: 'Light stretching. Very responsible.',                 color: '#86efac' },
  { min: 30, max: 39, name: 'Jogging Pace',           flavor: "You could do this. You're an athlete now.",           color: '#fbbf24' },
  { min: 40, max: 49, name: 'Getting Spicy 🌶',       flavor: 'The snake smells blood.',                             color: '#f59e0b' },
  { min: 50, max: 59, name: 'Half Loco',              flavor: 'Your palms are getting sweaty.',                      color: '#f97316' },
  { min: 60, max: 69, name: 'Zoom Zoom 🏎',           flavor: 'The words are beginning to blur together.',           color: '#ea580c' },
  { min: 70, max: 79, name: 'Hold Onto Your Hat',     flavor: 'This is fine. Everything is fine.',                   color: '#ef4444' },
  { min: 80, max: 89, name: 'Absolutely Unhinged',    flavor: 'Your Spanish teacher is watching in horror.',         color: '#dc2626' },
  { min: 90, max: 98, name: 'What Is Wrong With You', flavor: 'The snake has become the words.',                     color: '#a855f7' },
  { min: 99, max: 99, name: 'LUDICROUS SPEED 🚀',     flavor: "You have gone plaid. Chapó. We can't help you now.", color: '#ec4899' },
];

function getSpeedData(n) { return SPEED_NAMES.find(d => n >= d.min && n <= d.max) || SPEED_NAMES[0]; }
function calcTickMs(speed) { return Math.round(220 - (speed - 1) * (160 / 98)); }

// ─── Constants ────────────────────────────────────────────────────────────────
const COLS = 20;
const ROWS = 16;
const MAX_HEARTS = 3;
const POINTS_PER_WORD = 10;
const POINTS_SENTENCE = 50;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function rnd(max) { return Math.floor(Math.random() * max); }
function normalize(str) { return str.replace(/[¿?¡!.,]/g, '').toLowerCase(); }

function freeCell(snake, words) {
  const occ = new Set([...snake.map(s => `${s.x},${s.y}`), ...words.map(w => `${w.x},${w.y}`)]);
  let x, y, t = 0;
  do { x = rnd(COLS); y = rnd(ROWS); t++; } while (occ.has(`${x},${y}`) && t < 300);
  return { x, y };
}

function placeSentenceWords(snake, words) {
  const placed = [];
  for (const text of words) {
    const pos = freeCell(snake, placed);
    placed.push({ text, x: pos.x, y: pos.y, isDecoy: false });
  }
  return placed;
}

function placeDecoys(snake, words, count, sentence) {
  const set = new Set(sentence.spanish.map(normalize));
  const pool = sentencesData.flatMap(s => s.spanish).filter(w => !set.has(normalize(w)));
  const picks = shuffle(pool).slice(0, count);
  const placed = [...words];
  for (const text of picks) {
    const pos = freeCell(snake, placed);
    placed.push({ text, x: pos.x, y: pos.y, isDecoy: true });
  }
  return placed;
}

function pickSentence(diff) {
  const pool = sentencesData.filter(s => diff.sentenceLevels.includes(s.level));
  const src = pool.length > 0 ? pool : sentencesData;
  return src[rnd(src.length)];
}

const START_SNAKE = [{ x: 10, y: 8 }, { x: 9, y: 8 }, { x: 8, y: 8 }];

function makeGameState(diff) {
  const snake = START_SNAKE.map(s => ({ ...s }));
  const sentence = pickSentence(diff);
  let words = placeSentenceWords(snake, sentence.spanish);
  if (diff.decoys > 0) words = placeDecoys(snake, words, diff.decoys, sentence);
  return {
    snake,
    dir: { x: 1, y: 0 }, nextDir: { x: 1, y: 0 },
    words, sentence, targetIndex: 0,
    hearts: MAX_HEARTS, score: 0, streak: 0, sentenceCount: 0,
    flashMsg: null,
  };
}

// ─── Word type classification ─────────────────────────────────────────────────
const VERBS = new Set([
  'como','come','comemos','comer','bebo','bebe','bebemos','beber',
  'tengo','tiene','tenemos','tener','soy','es','somos','ser',
  'estoy','está','estamos','estar','voy','va','vamos','ir',
  'quiero','quiere','queremos','querer','leo','lee','leemos','leer',
  'sé','sabe','sabemos','saber','corro','corre','corremos','correr',
  'hablo','habla','hablamos','hablar','dijo','decir','venir','vengo','viene',
  'llevo','estudiando','quería','venir','tienen','quieres',
]);
const PRONOUNS = new Set([
  'yo','tú','él','ella','nosotros','ellos','ellas','usted','ustedes','me','te','le','nos',
]);
const HELPERS = new Set([
  'el','la','los','las','un','una','unos','unas',
  'a','de','en','con','por','para','que','y','o','pero','si',
  'del','al','todos','todo','bien','muy','también',
  '¿adónde','¿cuántas','cómo','qué',
]);

function getWordType(word) {
  const w = word.replace(/[¿?¡!.,]/g, '').toLowerCase();
  if (PRONOUNS.has(w)) return 'pronoun';
  if (VERBS.has(w))    return 'verb';
  if (HELPERS.has(w))  return 'helper';
  return 'noun';
}

// ─── Speed glow style (board border: red → orange → amber → white) ───────────
function speedGlowStyle(speed) {
  const t = Math.min(1, Math.max(0, (speed - 1) / 98));
  // Color ramp stops: [position, [r,g,b]]
  const stops = [
    [0.00, [155, 22, 22]],
    [0.28, [220, 38, 38]],
    [0.50, [249, 115, 22]],
    [0.68, [251, 191, 36]],
    [0.85, [253, 224, 71]],
    [1.00, [255, 255, 255]],
  ];
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) { lo = stops[i]; hi = stops[i + 1]; break; }
  }
  const st = lo[0] === hi[0] ? 0 : (t - lo[0]) / (hi[0] - lo[0]);
  const r  = Math.round(lo[1][0] + (hi[1][0] - lo[1][0]) * st);
  const g  = Math.round(lo[1][1] + (hi[1][1] - lo[1][1]) * st);
  const b  = Math.round(lo[1][2] + (hi[1][2] - lo[1][2]) * st);
  const mainAlpha = (0.40 + t * 0.55).toFixed(2);
  const dimAlpha  = (0.07 + t * 0.22).toFixed(2);
  const blur      = Math.round(12 + t * 50);
  return {
    '--sgc':     `rgba(${r},${g},${b},${mainAlpha})`,
    '--sgc-dim': `rgba(${r},${g},${b},${dimAlpha})`,
    '--sgb':     `${blur}px`,
  };
}

// ─── Canvas snake renderer ────────────────────────────────────────────────────
// Called every RAF frame — draws a smooth interpolated snake on canvas.
function drawSnake(canvas, curr, prev, t, dir, ts, streak, targetPos, isEasy, ghosts = [], speed = 1) {
  if (!canvas || !curr.length) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  if (!W || !H) return;

  const cellW = W / COLS;
  const cellH = H / ROWS;

  ctx.clearRect(0, 0, W, H);

  // Interpolate each segment position (handles wrap-around)
  const pts = curr.map((seg, i) => {
    const ps = prev[i] || prev[prev.length - 1] || seg;
    let px = ps.x, py = ps.y, cx = seg.x, cy = seg.y;
    if (Math.abs(cx - px) > COLS / 2) { if (cx > px) px += COLS; else cx += COLS; }
    if (Math.abs(cy - py) > ROWS / 2) { if (cy > py) py += ROWS; else cy += ROWS; }
    return {
      x: (px + (cx - px) * t + 0.5) * cellW,
      y: (py + (cy - py) * t + 0.5) * cellH,
    };
  });

  const lw = Math.min(cellW, cellH) * 0.74; // body stroke width

  // ── Ghost trail (motion blur at speed ≥ 50) ──
  if (ghosts.length > 0) {
    const speedFactor = Math.min(1, Math.max(0, (speed - 50) / 49));
    for (let gi = ghosts.length - 1; gi >= 0; gi--) {
      const ghost = ghosts[gi];
      if (!ghost || ghost.length < 2) continue;
      const age     = gi / ghosts.length;
      const opacity = (1 - age) * speedFactor * 0.22;
      if (opacity < 0.01) continue;
      const gpts = ghost.map(seg => ({ x: (seg.x + 0.5) * cellW, y: (seg.y + 0.5) * cellH }));
      const gGrad = ctx.createLinearGradient(
        gpts[gpts.length - 1].x, gpts[gpts.length - 1].y, gpts[0].x, gpts[0].y
      );
      gGrad.addColorStop(0, 'rgba(34,197,94,0)');
      gGrad.addColorStop(1, '#22c55e');
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      ctx.moveTo(gpts[gpts.length - 1].x, gpts[gpts.length - 1].y);
      for (let i = gpts.length - 2; i >= 0; i--) ctx.lineTo(gpts[i].x, gpts[i].y);
      ctx.lineWidth   = lw * (0.9 - age * 0.18);
      ctx.strokeStyle = gGrad;
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── Body (tail → head) as a single round-capped path ──
  if (pts.length >= 2) {
    ctx.save();
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    // Gradient runs from tail (dark) to head (bright green)
    const tail = pts[pts.length - 1];
    const head = pts[0];
    const grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
    grad.addColorStop(0,    'rgba(10, 70, 35, 0.35)');
    grad.addColorStop(0.4,  'rgba(18, 120, 55, 0.75)');
    grad.addColorStop(0.85, '#1a9e50');
    grad.addColorStop(1,    '#22c55e');

    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    for (let i = pts.length - 2; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y);

    ctx.lineWidth   = lw;
    ctx.strokeStyle = grad;
    ctx.shadowColor = 'rgba(34,197,94,0.25)';
    ctx.shadowBlur  = 10;
    ctx.stroke();
    ctx.restore();
  }

  // ── Scale texture overlay ──
  // Draw two opposing arc-crescents per body segment, oriented toward the tail,
  // mimicking the overlapping shingle pattern of reptile scales.
  if (pts.length >= 4) {
    ctx.save();
    for (let i = pts.length - 2; i >= 2; i--) {
      const p   = pts[i];
      const fwd = pts[i - 1]; // toward head
      const bwd = pts[i + 1]; // toward tail

      const fx   = fwd.x - bwd.x;
      const fy   = fwd.y - bwd.y;
      const fLen = Math.sqrt(fx * fx + fy * fy);
      if (fLen < 0.5) continue;
      const fnx = fx / fLen, fny = fy / fLen;

      // Fade in quickly from tail, fade fully near head (last 2 segs)
      const segPct = 1 - i / pts.length;
      const alpha  = Math.min(1, segPct * 5) * (0.10 + segPct * 0.20);
      if (alpha < 0.02) continue;

      const sr        = lw * 0.36;
      const rearAngle = Math.atan2(fny, fnx) + Math.PI; // arc faces toward tail

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth   = Math.max(0.5, lw * 0.06);
      ctx.lineCap     = 'butt';

      // Left and right scale arcs, each offset laterally from centerline
      for (const sign of [-1, 1]) {
        const scx = p.x + (-fny) * sign * sr * 0.38;
        const scy = p.y + ( fnx) * sign * sr * 0.38;
        ctx.beginPath();
        ctx.arc(scx, scy, sr * 0.70, rearAngle - 2.1, rearAngle + 2.1);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ── Streak fire (orbiting embers around head) ──
  const head = pts[0];
  const hr   = lw / 2 + 1.5;

  if ((streak ?? 0) >= 3) {
    const lvl      = Math.min(streak, 12);
    const nEmbers  = Math.min(8, 3 + Math.floor(lvl / 2));
    const speed    = 0.0016 + lvl * 0.00016;
    const orbitR   = hr * (1.6 + 0.2 * Math.sin(ts * 0.008));
    const palette  = ['#fbbf24', '#fb923c', '#f97316', '#ef4444', '#fde68a'];

    // Outer fire glow
    ctx.save();
    const fireGrad = ctx.createRadialGradient(head.x, head.y, hr * 0.85, head.x, head.y, hr * 2.6);
    fireGrad.addColorStop(0, `rgba(251,146,60,${0.22 + 0.1 * Math.sin(ts * 0.011)})`);
    fireGrad.addColorStop(1, 'rgba(251,146,60,0)');
    ctx.fillStyle = fireGrad;
    ctx.beginPath();
    ctx.arc(head.x, head.y, hr * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Embers
    for (let i = 0; i < nEmbers; i++) {
      const angle   = (i / nEmbers) * Math.PI * 2 + ts * speed;
      const wobble  = 1 + 0.22 * Math.sin(ts * 0.013 + i * 1.73);
      const ex      = head.x + Math.cos(angle) * orbitR * wobble;
      const ey      = head.y + Math.sin(angle) * orbitR * wobble;
      const eSize   = hr * (0.19 + 0.1 * Math.sin(ts * 0.017 + i * 2.09));
      const alpha   = 0.6 + 0.4 * Math.sin(ts * 0.021 + i * 1.41);
      const color   = palette[i % palette.length];
      ctx.save();
      ctx.globalAlpha  = alpha;
      ctx.fillStyle    = color;
      ctx.shadowColor  = color;
      ctx.shadowBlur   = 7;
      ctx.beginPath();
      ctx.arc(ex, ey, eSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Easy-mode sonar ping on target word + compass arrow ──
  if (isEasy && targetPos) {
    const tx = (targetPos.x + 0.5) * cellW;
    const ty = (targetPos.y + 0.5) * cellH;

    // Two staggered expanding rings
    for (let p = 0; p < 2; p++) {
      const phase = ((ts + p * 600) % 1200) / 1200;
      const pingR = cellW * 0.55 + cellW * 1.3 * phase;
      ctx.save();
      ctx.strokeStyle = `rgba(34,197,94,${(1 - phase) * 0.55})`;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(tx, ty, pingR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

  }

  // ── Head (circle, slightly larger, bright glow) ──
  ctx.save();
  ctx.fillStyle  = '#22c55e';
  ctx.shadowColor= '#22c55e';
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.arc(head.x, head.y, hr, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Eyes (direction-aware) ──
  const er      = hr * 0.20;
  const eyeDist = hr * 0.46;
  const fwd     = hr * 0.18;

  // perpendicular to movement direction
  const perpX = -dir.y * eyeDist;
  const perpY =  dir.x * eyeDist;
  const fwdX  =  dir.x * fwd;
  const fwdY  =  dir.y * fwd;

  const eyes = [
    { x: head.x + fwdX + perpX, y: head.y + fwdY + perpY },
    { x: head.x + fwdX - perpX, y: head.y + fwdY - perpY },
  ];

  ctx.save();
  ctx.fillStyle = '#0a2e14';
  for (const e of eyes) {
    ctx.beginPath(); ctx.arc(e.x, e.y, er, 0, Math.PI * 2); ctx.fill();
  }
  // Shine highlights
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  for (const e of eyes) {
    ctx.beginPath(); ctx.arc(e.x + er * 0.28, e.y - er * 0.28, er * 0.42, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // ── Tongue (darts out, forks, retracts) ──
  const cycle = (ts ?? 0) % 700;
  const tongueLen = cycle < 250
    ? cellW * 0.58 * (cycle < 125 ? cycle / 125 : (250 - cycle) / 125)
    : 0;

  if (tongueLen > 1) {
    const snoutX = head.x + dir.x * hr;
    const snoutY = head.y + dir.y * hr;
    const tipX   = snoutX + dir.x * tongueLen;
    const tipY   = snoutY + dir.y * tongueLen;
    const forkLen = tongueLen * 0.38;
    // Perpendicular forks
    const f1x = tipX + (-dir.y) * forkLen, f1y = tipY + ( dir.x) * forkLen;
    const f2x = tipX + ( dir.y) * forkLen, f2y = tipY + (-dir.x) * forkLen;

    ctx.save();
    ctx.strokeStyle = '#ff3a5c';
    ctx.lineWidth   = Math.max(1, cellW * 0.055);
    ctx.lineCap     = 'round';

    ctx.beginPath();
    ctx.moveTo(snoutX, snoutY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tipX, tipY); ctx.lineTo(f1x, f1y);
    ctx.moveTo(tipX, tipY); ctx.lineTo(f2x, f2y);
    ctx.stroke();
    ctx.restore();
  }
}

// ─── Lobby ────────────────────────────────────────────────────────────────────
function LobbyScreen({ onStart }) {
  const navigate = useNavigate();
  const [diffId, setDiffId] = useState(() => SaveSystem.get('snake-difficulty', 'easy'));
  const [speed, setSpeed]   = useState(() => SaveSystem.get('snake-speed', 5));
  const holdTimer    = useRef(null);
  const holdInterval = useRef(null);
  const progress = ProgressSystem.getGame('snake-sentences');
  const speedData = getSpeedData(speed);

  function clamp(n) { return Math.min(99, Math.max(1, n)); }

  function startHold(delta) {
    setSpeed(s => clamp(s + delta));
    holdTimer.current = setTimeout(() => {
      holdInterval.current = setInterval(() => setSpeed(s => clamp(s + delta)), 60);
    }, 400);
  }
  function stopHold() { clearTimeout(holdTimer.current); clearInterval(holdInterval.current); }

  function handleStart() {
    SaveSystem.set('snake-difficulty', diffId);
    SaveSystem.set('snake-speed', speed);
    onStart(DIFFICULTIES[diffId], speed);
  }

  return (
    <div className="snake-lobby">
      <div className="lobby-card">
        <div className="lobby-header">
          <span className="lobby-icon">🐍</span>
          <div>
            <div className="lobby-title">Sentence Snake</div>
            <div className="lobby-sub">Serpiente de Sentencias</div>
          </div>
          <button className="lobby-back" onClick={() => navigate('/')}>← Menu</button>
        </div>

        <div className="lobby-body">
          <div className="lobby-section">
            <div className="lobby-lbl">Difficulty — hints &amp; board highlights</div>
            <div className="lobby-bands">
              {Object.values(DIFFICULTIES).map(d => (
                <button key={d.id}
                  className={`lobby-band ${diffId === d.id ? 'lobby-band--on' : ''}`}
                  style={{ '--bc': d.color }}
                  onClick={() => setDiffId(d.id)}
                >
                  <span className="lobby-band__icon">{d.icon}</span>
                  <span className="lobby-band__text">
                    <span className="lobby-band__name">{d.label}</span>
                    <span className="lobby-band__desc">{d.description}</span>
                  </span>
                  <span className="lobby-band__radio" />
                </button>
              ))}
            </div>
          </div>

          <div className="lobby-divider" />

          <div className="lobby-section">
            <div className="lobby-lbl">Speed — independent of difficulty</div>
            <div className="lobby-speed-row">
              <div className="lobby-counter">
                <button className="lobby-counter__btn"
                  onMouseDown={() => startHold(1)} onMouseUp={stopHold} onMouseLeave={stopHold}
                  onTouchStart={e => { e.preventDefault(); startHold(1); }} onTouchEnd={stopHold}>▲</button>
                <div className="lobby-counter__val" style={{ color: speedData.color }}>
                  {String(speed).padStart(2, ' ')}
                </div>
                <button className="lobby-counter__btn"
                  onMouseDown={() => startHold(-1)} onMouseUp={stopHold} onMouseLeave={stopHold}
                  onTouchStart={e => { e.preventDefault(); startHold(-1); }} onTouchEnd={stopHold}>▼</button>
              </div>
              <div className="lobby-speed-info">
                <div className="lobby-speed-name" style={{ color: speedData.color }}>{speedData.name}</div>
                <div className="lobby-speed-flavor">{speedData.flavor}</div>
                <div className="lobby-speed-range">1 – 99 &nbsp;·&nbsp; hold to ramp</div>
              </div>
            </div>
          </div>

          <div className="lobby-divider" />

          <div className="lobby-section">
            <button className="lobby-start" onClick={handleStart}>▶ Start Game</button>
            <div className="lobby-best">
              {progress.highScore > 0
                ? `Your best: ${progress.highScore.toLocaleString()} pts · ${progress.totalPlays} plays`
                : 'No plays yet — be the first!'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Translation strip ────────────────────────────────────────────────────────
function TranslationStrip({ lastEaten, isActive, sentenceReveal }) {
  return (
    <div className={`translation-strip ${sentenceReveal ? 'translation-strip--reveal' : isActive ? 'translation-strip--active' : ''}`}>
      <div className="mascot-placeholder">
        <span className="mascot-emoji">🐍</span>
        <span className="mascot-label">mascot</span>
      </div>
      <div className="talk-bubble-wrap">
        <div className={`talk-bubble ${sentenceReveal ? 'talk-bubble--reveal' : ''}`}>
          {sentenceReveal ? (
            <div className="reveal-content">
              <div className="reveal-spanish">
                {sentenceReveal.spanish.map((w, i) => (
                  <span key={i} className="reveal-chip">{w}</span>
                ))}
              </div>
              <div className="reveal-english">{sentenceReveal.english}</div>
            </div>
          ) : lastEaten ? (
            <div className={`bubble-content ${isActive ? 'bubble-content--bright' : 'bubble-content--dim'}`}>
              <span className="bubble-es">{lastEaten.spanish}</span>
              <span className="bubble-eq">=</span>
              <span className="bubble-en">{lastEaten.english}</span>
              {lastEaten.streak >= 3 && <span className="bubble-streak">🔥 ×{lastEaten.streak}</span>}
            </div>
          ) : (
            <span className="bubble-idle">Eat the next word to see its meaning…</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SnakeSentences() {
  const phaseRef = useRef('lobby');
  const [phase, _setPhase] = useState('lobby');
  function setPhase(p) { phaseRef.current = p; _setPhase(p); }

  const stateRef  = useRef(null);
  const diffRef   = useRef(DIFFICULTIES.easy);
  const speedRef  = useRef(5);

  // Smooth animation refs
  const canvasRef       = useRef(null);
  const boardRef        = useRef(null);
  const prevSnakeRef    = useRef(START_SNAKE.map(s => ({ ...s })));
  const lastTickTimeRef = useRef(0);
  const rafRef          = useRef(null);

  // Timers
  const tickRef    = useRef(null);
  const flashRef   = useRef(null);
  const stripTimer = useRef(null);

  const [, setRender]           = useState(0);
  const [lastEaten, setLastEaten]   = useState(null);
  const [stripActive, setStripActive] = useState(false);
  const [consumingWords, setConsumingWords] = useState([]);
  const [sentenceReveal, setSentenceReveal] = useState(null); // { spanish[], english }
  const [floatingPts, setFloatingPts] = useState([]);
  const revealTimer    = useRef(null);
  const shakeTimerRef  = useRef(null);
  const particlesRef   = useRef([]);
  const ghostTrailRef  = useRef([]);
  const heartbeatRef   = useRef(null);
  const countdownRef   = useRef(null);
  const lobbySpeedRef  = useRef(5); // speed chosen in lobby; never auto-ramped

  const [countdown, setCountdown] = useState(null);

  const forceRender = useCallback(() => setRender(r => r + 1), []);

  function stopHeartbeat() {
    clearInterval(heartbeatRef.current);
    heartbeatRef.current = null;
  }

  function shakeBoard() {
    const el = boardRef.current;
    if (!el) return;
    // Remove then re-add so the animation restarts even on rapid collisions
    el.classList.remove('snake-board--shake');
    void el.offsetWidth;
    el.classList.add('snake-board--shake');
    clearTimeout(shakeTimerRef.current);
    shakeTimerRef.current = setTimeout(() => el.classList.remove('snake-board--shake'), 450);
  }

  function spawnBurst() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const palette = ['#fbbf24','#22c55e','#a855f7','#22d3ee','#fb923c','#ec4899','#fff','#86efac'];
    const burst = [];
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 5.5;
      const life  = 38 + Math.floor(Math.random() * 28);
      burst.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.8,
        life, maxLife: life,
        size: 2.5 + Math.random() * 3.5,
        color: palette[i % palette.length],
      });
    }
    particlesRef.current = [...particlesRef.current, ...burst];
  }

  function addFloatingPts(text, gx, gy, isStreak) {
    const id = performance.now() + Math.random();
    setFloatingPts(prev => [...prev, { id, text, gx, gy, isStreak }]);
    setTimeout(() => setFloatingPts(prev => prev.filter(p => p.id !== id)), 900);
  }

  // ── RAF render loop (always reads from refs, no stale closure issues) ──
  const rafLoopRef = useRef(null);
  rafLoopRef.current = function renderLoop(ts) {
    rafRef.current = requestAnimationFrame(rafLoopRef.current);

    const canvas = canvasRef.current;
    const state  = stateRef.current;
    if (!canvas || !state) return;

    const tickMs = calcTickMs(speedRef.current);
    const paused = phaseRef.current === 'paused' || phaseRef.current === 'dead' || phaseRef.current === 'countdown';
    const t = paused ? 1 : Math.min(1, (ts - lastTickTimeRef.current) / tickMs);

    const tWord = state.words.find(
      w => !w.isDecoy && normalize(w.text) === normalize(state.sentence?.spanish[state.targetIndex] ?? '')
    );
    drawSnake(
      canvas, state.snake, prevSnakeRef.current, t, state.dir, ts,
      state.streak,
      tWord ? { x: tWord.x, y: tWord.y } : null,
      diffRef.current.id === 'easy',
      ghostTrailRef.current,
      speedRef.current
    );

    // ── Particle system ──
    if (particlesRef.current.length > 0) {
      const ctx2 = canvas.getContext('2d');
      const alive = [];
      for (const p of particlesRef.current) {
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += 0.2;   // gravity
        p.vx *= 0.975; // drag
        p.life--;
        if (p.life <= 0) continue;
        alive.push(p);
        const alpha = Math.min(1, p.life / (p.maxLife * 0.35));
        ctx2.save();
        ctx2.globalAlpha  = alpha;
        ctx2.fillStyle    = p.color;
        ctx2.shadowColor  = p.color;
        ctx2.shadowBlur   = 5;
        ctx2.beginPath();
        ctx2.arc(p.x, p.y, p.size * (0.4 + 0.6 * alpha), 0, Math.PI * 2);
        ctx2.fill();
        ctx2.restore();
      }
      particlesRef.current = alive;
    }
  };

  // ── Canvas sizing — sync to board container on mount / resize ──
  useEffect(() => {
    if (phase === 'lobby') return;
    const board  = boardRef.current;
    const canvas = canvasRef.current;
    if (!board || !canvas) return;

    function sync() {
      const dpr     = window.devicePixelRatio || 1;
      canvas.width  = Math.round(board.clientWidth  * dpr);
      canvas.height = Math.round(board.clientHeight * dpr);
    }
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(board);
    return () => ro.disconnect();
  }, [phase]);

  // ── Helpers ──
  function showEaten(spanish, english, streak) {
    setLastEaten({ spanish, english, streak });
    setStripActive(true);
    clearTimeout(stripTimer.current);
    stripTimer.current = setTimeout(() => setStripActive(false), 2000);
  }

  function doFlash(text, type = 'good') {
    clearTimeout(flashRef.current);
    stateRef.current.flashMsg = { text, type };
    forceRender();
    flashRef.current = setTimeout(() => {
      if (stateRef.current) { stateRef.current.flashMsg = null; forceRender(); }
    }, 900);
  }

  function loadNext(state, diff) {
    const next = pickSentence(diff);
    state.sentence    = next;
    state.targetIndex = 0;
    let words = placeSentenceWords(state.snake, next.spanish);
    if (diff.decoys > 0) words = placeDecoys(state.snake, words, diff.decoys, next);
    state.words = words;
  }

  function endGame(state) {
    clearInterval(tickRef.current);
    stopHeartbeat();
    setPhase('dead');
    AudioManager.gameOver();
    ProgressSystem.saveGame('snake-sentences', { score: state.score, streak: state.streak });
    forceRender();
  }

  // ── Tick: save prevSnake FIRST so interpolation always has a correct baseline ──
  function tick() {
    if (phaseRef.current !== 'playing') return;
    const state = stateRef.current;
    if (!state) return;

    prevSnakeRef.current    = state.snake.map(s => ({ ...s }));
    lastTickTimeRef.current = performance.now();

    // Ghost trail for high-speed motion blur
    const spd = speedRef.current;
    if (spd >= 50) {
      const maxSnaps = spd >= 80 ? 3 : spd >= 65 ? 2 : 1;
      ghostTrailRef.current = [
        state.snake.map(s => ({ ...s })),
        ...ghostTrailRef.current.slice(0, maxSnaps - 1),
      ];
    } else {
      ghostTrailRef.current = [];
    }

    const d = state.nextDir;
    state.dir = d;
    const head = state.snake[0];
    const nx = head.x + d.x;
    const ny = head.y + d.y;

    // Kill wall collision
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
      state.hearts--;
      if (state.hearts === 1 && !heartbeatRef.current) heartbeatRef.current = setInterval(() => AudioManager.heartbeat(), 900);
      AudioManager.wrong();
      if (navigator.vibrate) navigator.vibrate(80);
      shakeBoard();
      if (state.hearts <= 0) { endGame(state); return; }
      doFlash('💥 Wall!', 'bad');
      state.snake   = START_SNAKE.map(s => ({ ...s }));
      state.dir     = { x: 1, y: 0 };
      state.nextDir = { x: 1, y: 0 };
      prevSnakeRef.current = START_SNAKE.map(s => ({ ...s }));
      forceRender();
      return;
    }

    // Self-collision
    if (state.snake.some(s => s.x === nx && s.y === ny)) {
      state.hearts--;
      if (state.hearts === 1 && !heartbeatRef.current) heartbeatRef.current = setInterval(() => AudioManager.heartbeat(), 900);
      AudioManager.wrong();
      if (navigator.vibrate) navigator.vibrate(80);
      shakeBoard();
      if (state.hearts <= 0) { endGame(state); return; }
      doFlash('Ouch! Watch the tail!', 'bad');
      state.snake   = START_SNAKE.map(s => ({ ...s }));
      state.dir     = { x: 1, y: 0 };
      state.nextDir = { x: 1, y: 0 };
      prevSnakeRef.current = START_SNAKE.map(s => ({ ...s }));
      forceRender();
      return;
    }

    const wordIdx = state.words.findIndex(w => w.x === nx && w.y === ny);
    let grew = false;

    if (wordIdx !== -1) {
      const eaten = state.words[wordIdx];
      const diff  = diffRef.current;

      if (eaten.isDecoy) {
        AudioManager.wrong();
        state.hearts--;
        if (state.hearts === 1 && !heartbeatRef.current) heartbeatRef.current = setInterval(() => AudioManager.heartbeat(), 900);
        if (navigator.vibrate) navigator.vibrate(80);
        state.streak = 0;
        // Animate the decoy being consumed then remove
        const id = Date.now();
        setConsumingWords(p => [...p, { ...eaten, eatId: id }]);
        setTimeout(() => setConsumingWords(p => p.filter(w => w.eatId !== id)),
          calcTickMs(speedRef.current) * 0.9);
        state.words.splice(wordIdx, 1);
        doFlash(`✗ Decoy! "${eaten.text}" isn't part of this sentence`, 'bad');
        if (state.hearts <= 0) { endGame(state); return; }
      } else {
        const target = state.sentence.spanish[state.targetIndex];
        if (normalize(eaten.text) === normalize(target)) {
          state.score  += POINTS_PER_WORD;
          state.streak++;
          AudioManager.eat(state.streak);
          showEaten(eaten.text, state.sentence.englishWords?.[state.targetIndex] ?? '', state.streak);
          addFloatingPts(
            state.streak > 2 ? `+${POINTS_PER_WORD} 🔥` : `+${POINTS_PER_WORD}`,
            eaten.x, eaten.y, state.streak > 2
          );
          state.targetIndex++;

          // Animate eaten word out, then remove from state
          const id = Date.now();
          setConsumingWords(p => [...p, { ...eaten, eatId: id }]);
          setTimeout(() => setConsumingWords(p => p.filter(w => w.eatId !== id)),
            calcTickMs(speedRef.current) * 0.9);
          state.words.splice(wordIdx, 1);
          grew = true;

          if (state.targetIndex >= state.sentence.spanish.length) {
            AudioManager.levelUp();
            const bonus = POINTS_SENTENCE + state.streak * 5;
            state.score += bonus;
            state.sentenceCount++;

            // Auto-ramp speed; restart interval so it uses the new tickMs immediately
            if (speedRef.current < 99) {
              speedRef.current = speedRef.current + 1;
              clearInterval(tickRef.current);
              tickRef.current = setInterval(() => tickFnRef.current(), calcTickMs(speedRef.current));
            }
            const speedMsg = speedRef.current < 99 ? ` ⚡${speedRef.current}` : ' MAX';
            doFlash(`¡Perfecto! +${bonus}${speedMsg}`, 'great');
            spawnBurst();

            // Show the completed sentence bilingually in the strip for 2.4 s
            clearTimeout(revealTimer.current);
            setSentenceReveal({
              spanish: state.sentence.spanish,
              english: state.sentence.english,
            });
            revealTimer.current = setTimeout(() => setSentenceReveal(null), 2400);

            setTimeout(() => {
              if (stateRef.current && phaseRef.current === 'playing') {
                loadNext(stateRef.current, diffRef.current);
                forceRender();
              }
            }, 200);
          } else {
            doFlash(`✓ ${eaten.text}`, 'good');
          }
        } else {
          // Wrong sentence word — stays on board
          AudioManager.wrong();
          state.hearts--;
          if (state.hearts === 1 && !heartbeatRef.current) heartbeatRef.current = setInterval(() => AudioManager.heartbeat(), 900);
          if (navigator.vibrate) navigator.vibrate(80);
          state.streak = 0;
          doFlash('✗ Wrong! Keep looking…', 'bad');
          if (state.hearts <= 0) { endGame(state); return; }
        }
      }
    }

    state.snake = [{ x: nx, y: ny }, ...state.snake.slice(0, grew ? state.snake.length : state.snake.length - 1)];
    forceRender();
  }

  // Keep tick closure fresh
  const tickFnRef = useRef(tick);
  useEffect(() => { tickFnRef.current = tick; });

  // ── Game control ──
  function startGame(diff, speed) {
    clearInterval(tickRef.current);
    clearTimeout(countdownRef.current);
    cancelAnimationFrame(rafRef.current);
    stopHeartbeat();

    diffRef.current      = diff;
    speedRef.current     = speed;
    lobbySpeedRef.current = speed; // freeze lobby value; auto-ramp only touches speedRef

    const initialSnake = START_SNAKE.map(s => ({ ...s }));
    prevSnakeRef.current    = initialSnake;
    lastTickTimeRef.current = performance.now();
    ghostTrailRef.current   = [];

    stateRef.current = makeGameState(diff);
    setLastEaten(null);
    setStripActive(false);
    setConsumingWords([]);
    setSentenceReveal(null);
    clearTimeout(revealTimer.current);
    particlesRef.current = [];
    setPhase('countdown');
    forceRender();

    rafRef.current = requestAnimationFrame(rafLoopRef.current);
    startCountdown(speed);
  }

  function startCountdown(speed) {
    let n = 3;
    setCountdown(n);
    function step() {
      n--;
      if (n > 0) {
        setCountdown(n);
        countdownRef.current = setTimeout(step, 1000);
      } else {
        setCountdown('¡Vamos!');
        countdownRef.current = setTimeout(() => {
          if (phaseRef.current === 'countdown') {
            setCountdown(null);
            lastTickTimeRef.current = performance.now();
            setPhase('playing');
            tickRef.current = setInterval(() => tickFnRef.current(), calcTickMs(speed));
          }
        }, 700);
      }
    }
    countdownRef.current = setTimeout(step, 1000);
  }

  function togglePause() {
    if (phaseRef.current === 'playing') {
      clearInterval(tickRef.current);
      stopHeartbeat();
      setPhase('paused');
    } else if (phaseRef.current === 'paused') {
      prevSnakeRef.current    = stateRef.current.snake.map(s => ({ ...s }));
      lastTickTimeRef.current = performance.now();
      tickRef.current = setInterval(() => tickFnRef.current(), calcTickMs(speedRef.current));
      if (stateRef.current?.hearts === 1) heartbeatRef.current = setInterval(() => AudioManager.heartbeat(), 900);
      setPhase('playing');
    }
  }

  function goLobby() {
    clearInterval(tickRef.current);
    clearTimeout(countdownRef.current);
    cancelAnimationFrame(rafRef.current);
    stopHeartbeat();
    setCountdown(null);
    setPhase('lobby');
  }

  // Cleanup on unmount
  useEffect(() => () => {
    clearInterval(tickRef.current);
    clearTimeout(countdownRef.current);
    clearInterval(heartbeatRef.current);
    cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Responsive turning: fire the tick immediately on direction change ──
  // This makes turns feel instant rather than waiting up to one full tick interval.
  function turnNow(newDir) {
    const state = stateRef.current;
    if (!state || phaseRef.current !== 'playing') return;
    // Block 180° reversal and same-direction repeats
    if (newDir.x === -state.dir.x && newDir.y === -state.dir.y) return;
    if (newDir.x === state.dir.x  && newDir.y === state.dir.y)  return;
    state.nextDir = newDir;
    // setInterval picks up the new direction on its next natural fire — no manipulation needed
  }

  // ── Keyboard ──
  useEffect(() => {
    const handler = createInputHandler({
      up:    () => turnNow({ x:  0, y: -1 }),
      down:  () => turnNow({ x:  0, y:  1 }),
      left:  () => turnNow({ x: -1, y:  0 }),
      right: () => turnNow({ x:  1, y:  0 }),
      pause: togglePause,
    });
    handler.attach();
    return () => handler.detach();
  }, []);

  // ── Touch swipe ──
  const touchStart = useRef(null);
  function onTouchStart(e) { touchStart.current = e.touches[0]; }
  function onTouchEnd(e) {
    if (!touchStart.current || !stateRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.clientX;
    const dy = e.changedTouches[0].clientY - touchStart.current.clientY;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx >  20) turnNow({ x:  1, y: 0 });
      if (dx < -20) turnNow({ x: -1, y: 0 });
    } else {
      if (dy >  20) turnNow({ x: 0, y:  1 });
      if (dy < -20) turnNow({ x: 0, y: -1 });
    }
    touchStart.current = null;
  }

  if (phase === 'lobby') return <LobbyScreen onStart={startGame} />;

  const s    = stateRef.current;
  const diff = diffRef.current;
  if (!s) return null;

  const targetWord    = s.sentence?.spanish[s.targetIndex] ?? '';
  const targetEnglish = s.sentence?.englishWords?.[s.targetIndex] ?? '';

  return (
    <div className="snake-game" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <HUD
        title="Sentence Snake"
        score={s.score} streak={s.streak} hearts={s.hearts} maxHearts={MAX_HEARTS}
        onPause={phase === 'playing' || phase === 'paused' ? togglePause : undefined}
        speed={speedRef.current}
        speedColor={getSpeedData(speedRef.current).color}
      />

      <div className="snake-layout">
        {/* Side panel */}
        <aside className="snake-panel">
          <div className="snake-panel__section">
            <span className="snake-panel__label">Translate</span>
            <p className="snake-panel__english">{s.sentence?.english ?? '...'}</p>
          </div>

          {diff.panelHint === 'spanish' && (
            <div className="snake-panel__section">
              <span className="snake-panel__label">Eat next</span>
              <div className="snake-panel__target snake-panel__target--es">{targetWord}</div>
            </div>
          )}
          {diff.panelHint === 'english' && (
            <div className="snake-panel__section">
              <span className="snake-panel__label">Hint</span>
              <div className="snake-panel__target snake-panel__target--en">{targetEnglish}</div>
            </div>
          )}
          {diff.panelHint === 'none' && (
            <div className="snake-panel__section">
              <div className="snake-panel__target snake-panel__target--none">You know this — build it!</div>
            </div>
          )}

          <div className="snake-panel__section">
            <span className="snake-panel__label">Building</span>
            <div className="snake-panel__build">
              {s.sentence?.spanish.map((word, i) => {
                const eaten  = i < s.targetIndex;
                const active = i === s.targetIndex;
                const show   = eaten || diff.showFutureWords;
                return (
                  <span key={i} className={`build-word ${eaten ? 'build-word--eaten' : ''} ${active ? 'build-word--active' : ''} ${!eaten && !active ? 'build-word--future' : ''}`}>
                    {show ? word : '???'}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="snake-panel__section snake-panel__section--band">
            <span className="snake-panel__diff" style={{ color: diff.color }}>{diff.icon} {diff.label}</span>
            <button className="snake-panel__settings" onClick={goLobby} title="Back to settings">⚙</button>
          </div>
        </aside>

        {/* Board column */}
        <div className="snake-board-col">
          <div
            className={`snake-board${s.hearts === 1 && phase === 'playing' ? ' snake-board--danger' : ''}`}
            ref={boardRef}
            style={{ '--cols': COLS, '--rows': ROWS, ...speedGlowStyle(speedRef.current) }}
          >
            {/* DOM words */}
            {s.words.map((word, i) => {
              const isTarget = !word.isDecoy && normalize(word.text) === normalize(s.sentence?.spanish[s.targetIndex] ?? '');
              const cls = word.isDecoy
                ? 'snake-word--decoy'
                : isTarget && diff.highlightTarget
                  ? 'snake-word--target'
                  : `snake-word--${getWordType(word.text)}`;
              return (
                <div key={`${word.text}-${i}`} className={`snake-word ${cls}`}
                  style={{ '--gx': word.x, '--gy': word.y }}>
                  {word.text}
                </div>
              );
            })}

            {/* Words being consumed (fade-out animation) */}
            {consumingWords.map(w => (
              <div key={w.eatId} className="snake-word snake-word--consuming"
                style={{ '--gx': w.x, '--gy': w.y }}>
                {w.text}
              </div>
            ))}

            {/* Floating +points */}
            {floatingPts.map(fp => (
              <div key={fp.id}
                className={`float-pts ${fp.isStreak ? 'float-pts--streak' : ''}`}
                style={{ '--gx': fp.gx, '--gy': fp.gy }}>
                {fp.text}
              </div>
            ))}

            {/* Canvas — smooth snake drawn here by RAF loop */}
            <canvas ref={canvasRef} className="snake-canvas" />

            {/* Flash */}
            {s.flashMsg && (
              <div className={`snake-flash snake-flash--${s.flashMsg.type}`}>{s.flashMsg.text}</div>
            )}

            {/* Countdown overlay */}
            {phase === 'countdown' && countdown !== null && (
              <div className="snake-overlay snake-overlay--countdown">
                <div key={String(countdown)} className={`countdown-number${countdown === '¡Vamos!' ? ' countdown-go' : ''}`}>
                  {countdown}
                </div>
              </div>
            )}

            {/* Pause overlay */}
            {phase === 'paused' && (
              <div className="snake-overlay">
                <div className="snake-overlay__box">
                  <div className="snake-overlay__emoji">⏸</div>
                  <h2 className="snake-overlay__title">Paused</h2>
                  <div className="snake-overlay__sentence-review">
                    <div className="snake-overlay__sentence-en">{s.sentence?.english}</div>
                    <div className="snake-overlay__chips">
                      {s.sentence?.spanish.map((w, i) => (
                        <span key={i} className={`snake-overlay__chip${i < s.targetIndex ? ' snake-overlay__chip--done' : i === s.targetIndex ? ' snake-overlay__chip--next' : ''}`}>
                          {diff.showFutureWords || i <= s.targetIndex ? w : '???'}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button className="snake-overlay__btn" onClick={togglePause}>▶ Resume</button>
                  <button className="snake-overlay__btn snake-overlay__btn--secondary" onClick={goLobby}>⚙ Change Settings</button>
                </div>
              </div>
            )}

            {/* Dead overlay */}
            {phase === 'dead' && (
              <div className="snake-overlay">
                <div className="snake-overlay__box">
                  <div className="snake-overlay__emoji">💀</div>
                  <h2 className="snake-overlay__title">Game Over</h2>
                  <div className="snake-overlay__score"><span>Score</span><span className="snake-overlay__score-val">{s.score}</span></div>
                  <div className="snake-overlay__score"><span>Sentences</span><span className="snake-overlay__score-val">{s.sentenceCount}</span></div>
                  <button className="snake-overlay__btn" onClick={() => startGame(diffRef.current, lobbySpeedRef.current)}>▶ Play Again</button>
                  <button className="snake-overlay__btn snake-overlay__btn--secondary" onClick={goLobby}>⚙ Change Settings</button>
                </div>
              </div>
            )}
          </div>

          <TranslationStrip lastEaten={lastEaten} isActive={stripActive} sentenceReveal={sentenceReveal} />

          {/* Mobile d-pad */}
          <div className="snake-dpad">
            <button className="snake-dpad__btn" onClick={() => turnNow({ x: 0, y: -1 })}>▲</button>
            <div className="snake-dpad__row">
              <button className="snake-dpad__btn" onClick={() => turnNow({ x: -1, y: 0 })}>◀</button>
              <div className="snake-dpad__center" />
              <button className="snake-dpad__btn" onClick={() => turnNow({ x: 1, y: 0 })}>▶</button>
            </div>
            <button className="snake-dpad__btn" onClick={() => turnNow({ x: 0, y: 1 })}>▼</button>
          </div>
        </div>
      </div>
    </div>
  );
}
