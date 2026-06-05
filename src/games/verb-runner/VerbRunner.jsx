import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AudioManager } from '../../engine/AudioManager.js';
import { ProgressSystem } from '../../engine/ProgressSystem.js';
import { shuffle } from '../../engine/WordBank.js';
import './VerbRunner.css';

// ─── Vocab ──────────────────────────────────────────────────────────────────
const VOCAB = [
  { en: 'dog',    es: 'perro'   }, { en: 'cat',    es: 'gato'    },
  { en: 'bird',   es: 'pájaro'  }, { en: 'fish',   es: 'pez'     },
  { en: 'apple',  es: 'manzana' }, { en: 'bread',  es: 'pan'     },
  { en: 'milk',   es: 'leche'   }, { en: 'house',  es: 'casa'    },
  { en: 'book',   es: 'libro'   }, { en: 'sun',    es: 'sol'     },
  { en: 'water',  es: 'agua'    }, { en: 'moon',   es: 'luna'    },
  { en: 'red',    es: 'rojo'    }, { en: 'blue',   es: 'azul'    },
  { en: 'run',    es: 'correr'  }, { en: 'eat',    es: 'comer'   },
  { en: 'drink',  es: 'beber'   }, { en: 'read',   es: 'leer'    },
  { en: 'speak',  es: 'hablar'  }, { en: 'play',   es: 'jugar'   },
  { en: 'horse',  es: 'caballo' }, { en: 'egg',    es: 'huevo'   },
  { en: 'friend', es: 'amigo'   }, { en: 'pencil', es: 'lápiz'   },
];

const LANES     = 3;
const TILE_W    = 90;
const TILE_H    = 38;
const RUNNER_X  = 130;
const COLLECT_X = RUNNER_X + 10;
const BASE_SPD  = 2.8;

let nextId = 0;

function makeTile(x, lane, word, isTarget) {
  return { id: nextId++, x, lane, word, isTarget, passed: false, flash: 0 };
}

function spawnWave(canvasW, target, vocab) {
  const decoys = shuffle(vocab.filter(v => v.es !== target.es)).slice(0, 2);
  const laneOrder = shuffle([0, 1, 2]);
  const baseX = canvasW + 40;
  return laneOrder.map((lane, i) => {
    const word = i === 0 ? target : decoys[i - 1];
    return makeTile(baseX + i * 35, lane, word, i === 0);
  });
}

export default function VerbRunner() {
  const canvasRef  = useRef(null);
  const stateRef   = useRef(null);
  const rafRef     = useRef(null);
  const navigate   = useNavigate();

  const [phase, setPhase]     = useState('idle');
  const [score, setScore]     = useState(0);
  const [hearts, setHearts]   = useState(3);
  const [prompt, setPrompt]   = useState(null);
  const [highScore, setHighScore] = useState(
    () => ProgressSystem.getGame('verb-runner').highScore
  );

  // Canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const sync = () => {
      const p = canvas.parentElement;
      canvas.width  = Math.round(p.clientWidth  * dpr);
      canvas.height = Math.round(p.clientHeight * dpr);
      canvas.style.width  = `${p.clientWidth}px`;
      canvas.style.height = `${p.clientHeight}px`;
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, []);

  function initState(canvas) {
    const pool = shuffle([...VOCAB]);
    const target = pool[0];
    const remaining = pool.slice(1);
    const tiles = spawnWave(canvas.width / (window.devicePixelRatio||1), target, VOCAB);
    return {
      lane: 1,
      tiles,
      vocabQueue: remaining,
      currentTarget: target,
      score: 0, hearts: 3,
      speed: BASE_SPD,
      bgOffset: 0,
      frameCount: 0,
      laneChanging: false,
      flashTimer: 0, flashGood: true,
      waveClear: false,
    };
  }

  function startGame() {
    cancelAnimationFrame(rafRef.current);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const state = initState(canvas);
    stateRef.current = state;
    setScore(0); setHearts(3);
    setPrompt({ en: state.currentTarget.en });
    setPhase('playing');
    rafRef.current = requestAnimationFrame(loop);
  }

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    const state  = stateRef.current;
    if (!canvas || !state) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr, H = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    state.frameCount++;
    state.bgOffset = (state.bgOffset + state.speed * 0.5) % 60;

    const laneY = [H * 0.28, H * 0.54, H * 0.80];

    // ── Move tiles ──
    let allPassed = true;
    for (const t of state.tiles) {
      if (!t.passed) {
        t.x -= state.speed;
        if (t.flash > 0) t.flash--;

        // Collect zone
        if (t.x + TILE_W >= COLLECT_X - 8 && t.x <= COLLECT_X + 8 && !t.passed) {
          if (t.lane === state.lane) {
            t.passed = true;
            if (t.isTarget) {
              state.score++;
              state.speed = Math.min(BASE_SPD + state.score * 0.18, 7.5);
              t.flash = 18;
              AudioManager.eat(Math.min(state.score, 6));
              setScore(state.score);
              // Queue next wave
              state.waveClear = true;
            } else {
              // Wrong word
              state.hearts--;
              AudioManager.wrong();
              if (navigator.vibrate) navigator.vibrate(70);
              t.flash = -18;
              setHearts(state.hearts);
              if (state.hearts <= 0) { die(state); return; }
            }
          }
        }

        // Tile scrolled off left
        if (t.x + TILE_W < 0) t.passed = true;
        else allPassed = false;
      }
    }

    // Remove passed tiles; spawn new wave when clear
    state.tiles = state.tiles.filter(t => !t.passed || t.flash > 0);
    if (state.waveClear && state.tiles.length === 0) {
      state.waveClear = false;
      if (state.vocabQueue.length < 3) state.vocabQueue = shuffle([...VOCAB]);
      const next = state.vocabQueue.pop();
      state.currentTarget = next;
      setPrompt({ en: next.en });
      state.tiles = spawnWave(W, next, VOCAB);
    }

    // ── Draw ──
    drawBackground(ctx, W, H, state.bgOffset);
    drawLaneGuides(ctx, W, H, laneY);
    for (const t of state.tiles) drawTile(ctx, t, laneY, W);
    drawRunner(ctx, RUNNER_X, laneY[state.lane], state.frameCount, state.hearts);
    if (state.flashTimer > 0) {
      state.flashTimer--;
      ctx.save();
      ctx.globalAlpha = state.flashTimer / 12 * 0.3;
      ctx.fillStyle = state.flashGood ? '#22c55e' : '#ef4444';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  function die(state) {
    cancelAnimationFrame(rafRef.current);
    AudioManager.gameOver();
    const s = state.score;
    setHighScore(h => Math.max(h, s));
    ProgressSystem.saveGame('verb-runner', { score: s });
    setPhase('dead');
  }

  function drawBackground(ctx, W, H, bgOffset) {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0a1628'); sky.addColorStop(1, '#0d2438');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    // Ground strip
    ctx.fillStyle = '#0d2b1a';
    ctx.fillRect(0, H * 0.88, W, H * 0.12);
    ctx.fillStyle = '#1a5c2a';
    ctx.fillRect(0, H * 0.88, W, 3);

    // Scrolling grid lines on ground
    ctx.strokeStyle = 'rgba(34,197,94,0.12)'; ctx.lineWidth = 1;
    for (let x = (-bgOffset * 2) % 60; x < W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, H * 0.88); ctx.lineTo(x + 30, H); ctx.stroke();
    }

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 25; i++) {
      ctx.beginPath();
      ctx.arc(((i * 179 + bgOffset * 0.3) % W), ((i * 97) % (H * 0.82)), 1, 0, Math.PI*2);
      ctx.fill();
    }
  }

  function drawLaneGuides(ctx, W, H, laneY) {
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    for (const y of laneY) {
      ctx.beginPath(); ctx.moveTo(RUNNER_X + 60, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawTile(ctx, tile, laneY, W) {
    const { x, lane, word, isTarget, flash } = tile;
    const y = laneY[lane] - TILE_H / 2;

    let bg = isTarget ? 'rgba(34,197,94,0.18)' : 'rgba(100,116,139,0.14)';
    let border = isTarget ? 'rgba(34,197,94,0.7)' : 'rgba(100,116,139,0.4)';
    let textCol = isTarget ? '#86efac' : '#94a3b8';

    if (flash > 0) { bg = 'rgba(34,197,94,0.5)'; border = '#22c55e'; textCol = '#fff'; }
    if (flash < 0) { bg = 'rgba(239,68,68,0.4)'; border = '#ef4444'; textCol = '#fff'; }

    ctx.save();
    const alpha = Math.abs(flash) > 0 ? 1 : Math.min(1, (W - x) / 60);
    ctx.globalAlpha = alpha;

    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, TILE_W, TILE_H, 8);
    ctx.fill(); ctx.stroke();

    if (isTarget && flash === 0) {
      ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 10;
    }

    ctx.fillStyle = textCol;
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(word.es, x + TILE_W / 2, y + TILE_H / 2);
    ctx.restore();
  }

  function drawRunner(ctx, x, y, frame, heartsLeft) {
    ctx.save();
    const bob = Math.sin(frame * 0.25) * 3;

    // Body
    ctx.fillStyle = '#22c55e';
    ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.roundRect(x - 12, y - 20 + bob, 24, 28, 6);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Head
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(x, y - 26 + bob, 11, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#0a2e14';
    ctx.beginPath(); ctx.arc(x + 4, y - 27 + bob, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(x + 5, y - 28 + bob, 1.2, 0, Math.PI * 2); ctx.fill();

    // Legs (running animation)
    ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    const legPhase = frame * 0.28;
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 8 + bob);
    ctx.lineTo(x - 5 + Math.sin(legPhase) * 8, y + 20 + bob + Math.abs(Math.sin(legPhase)) * 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 8 + bob);
    ctx.lineTo(x + 5 + Math.sin(legPhase + Math.PI) * 8, y + 20 + bob + Math.abs(Math.sin(legPhase + Math.PI)) * 3);
    ctx.stroke();

    // Hearts display
    ctx.font = '14px system-ui'; ctx.textAlign = 'left';
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = i < heartsLeft ? 1 : 0.2;
      ctx.fillText('❤️', 10 + i * 20, 24);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // Input: up/down arrows to change lane
  useEffect(() => {
    const onKey = (e) => {
      const s = stateRef.current;
      if (!s || phase !== 'playing') return;
      if (e.code === 'ArrowUp'   || e.code === 'KeyW') { e.preventDefault(); s.lane = Math.max(0, s.lane - 1); }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); s.lane = Math.min(2, s.lane + 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  // Touch: tap top / middle / bottom third to select lane
  const onTouch = useCallback((e) => {
    const s = stateRef.current;
    if (!s || phase !== 'playing') return;
    const y   = e.touches[0].clientY;
    const H   = e.currentTarget.getBoundingClientRect().height;
    const pct = y / H;
    s.lane = pct < 0.38 ? 0 : pct < 0.65 ? 1 : 2;
  }, [phase]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <div className="vr-game">
      <div className="vr-canvas-wrap" onTouchMove={onTouch}>
        <canvas ref={canvasRef} className="vr-canvas" />

        {phase === 'playing' && prompt && (
          <div className="vr-prompt">
            <span className="vr-prompt__label">Find the Spanish word for:</span>
            <span className="vr-prompt__word">{prompt.en}</span>
          </div>
        )}

        {phase === 'playing' && (
          <div className="vr-score">⭐ {score}</div>
        )}
      </div>

      {/* Idle */}
      {phase === 'idle' && (
        <div className="vr-overlay">
          <div className="vr-overlay__box">
            <div className="vr-overlay__emoji">🏃</div>
            <h2 className="vr-overlay__title">Verb Runner</h2>
            <p className="vr-overlay__sub">Corredor de Verbos</p>
            <div className="vr-overlay__instructions">
              <p>An English word appears at the top.</p>
              <p>Switch lanes to <strong>run through</strong> its Spanish translation!</p>
              <p>↑ ↓ arrow keys · W S · or tap top / bottom</p>
              <p>3 hearts · speed increases with score</p>
            </div>
            {highScore > 0 && <p className="vr-overlay__best">Best: {highScore} words</p>}
            <button className="vr-overlay__btn" onClick={startGame}>▶ Start Running</button>
          </div>
        </div>
      )}

      {/* Dead */}
      {phase === 'dead' && (
        <div className="vr-overlay">
          <div className="vr-overlay__box">
            <div className="vr-overlay__emoji">💨</div>
            <h2 className="vr-overlay__title">Wiped Out!</h2>
            <div className="vr-overlay__stats">
              <div className="vr-overlay__row"><span>Words collected</span><strong>{score}</strong></div>
              {score >= highScore && score > 0 && <p className="vr-overlay__new">🏆 New Best!</p>}
            </div>
            <button className="vr-overlay__btn" onClick={startGame}>▶ Run Again</button>
            <button className="vr-overlay__btn vr-overlay__btn--sec" onClick={() => navigate('/')}>← Menu</button>
          </div>
        </div>
      )}
    </div>
  );
}
