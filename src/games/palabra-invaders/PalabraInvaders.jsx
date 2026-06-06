import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AudioManager } from '../../engine/AudioManager.js';
import { ProgressSystem } from '../../engine/ProgressSystem.js';
import { shuffle } from '../../engine/WordBank.js';
import './PalabraInvaders.css';

const BASE_ROWS = 4;
const MARCH_BASE = 600;
const MARCH_STEP = 18;
const PLAYER_SPD = 4.5;
const BULLET_SPD = 9;
const SHIELD_MAX = 3;

const VOCAB = [
  { en: 'dog', es: 'perro' }, { en: 'cat', es: 'gato' },
  { en: 'bird', es: 'pájaro' }, { en: 'fish', es: 'pez' },
  { en: 'apple', es: 'manzana' }, { en: 'bread', es: 'pan' },
  { en: 'milk', es: 'leche' }, { en: 'house', es: 'casa' },
  { en: 'book', es: 'libro' }, { en: 'sun', es: 'sol' },
  { en: 'water', es: 'agua' }, { en: 'moon', es: 'luna' },
  { en: 'red', es: 'rojo' }, { en: 'blue', es: 'azul' },
  { en: 'run', es: 'correr' }, { en: 'eat', es: 'comer' },
  { en: 'horse', es: 'caballo' }, { en: 'egg', es: 'huevo' },
  { en: 'friend', es: 'amigo' }, { en: 'pencil', es: 'lápiz' },
  { en: 'green', es: 'verde' }, { en: 'yellow', es: 'amarillo' },
  { en: 'chair', es: 'silla' }, { en: 'table', es: 'mesa' },
];

let gid = 0;
function makeInvader(col, row, word, isTarget) {
  return { id: gid++, col, row, word, isTarget, alive: true, hitFlash: 0 };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getLayout(width, height) {
  const cols = width < 420 ? 4 : width < 760 ? 5 : 6;
  const rows = width < 420 ? 4 : BASE_ROWS;
  const sidePad = width < 420 ? 8 : width < 760 ? 12 : 16;
  const gapX = width < 420 ? 6 : width < 760 ? 8 : 10;
  const gapY = width < 420 ? 10 : width < 760 ? 12 : 14;
  const usableWidth = Math.max(220, width - sidePad * 2 - gapX * (cols - 1));
  const invW = clamp(Math.floor(usableWidth / cols), width < 420 ? 66 : 72, 82);
  const invH = clamp(Math.round(invW * (width < 420 ? 0.45 : 0.39)), 28, 34);
  const formationWidth = cols * invW + (cols - 1) * gapX;
  const formationHeight = rows * invH + (rows - 1) * gapY;
  const bottomReserve = width < 420 ? 104 : 94;
  const startY = clamp(24, 18, Math.max(18, height - formationHeight - bottomReserve));
  const fontSize = clamp(Math.round(invW / 6.6), 11, 13);

  return {
    cols,
    rows,
    sidePad,
    gapX,
    gapY,
    invW,
    invH,
    formationWidth,
    formationHeight,
    startY,
    playerY: height - (width < 420 ? 48 : 50),
    bulletStartY: height - (width < 420 ? 58 : 58),
    bottomLimit: height - bottomReserve,
    playerHalfWidth: width < 420 ? 20 : 22,
    shieldDotGap: width < 420 ? 12 : 14,
    shieldDotY: width < 420 ? 17 : 20,
    fontSize,
  };
}

function buildWave(layout, vocab) {
  const slots = layout.cols * layout.rows;
  const pool = shuffle([...vocab]);
  const target = pool[0];
  const others = pool.slice(1, slots);
  const words = shuffle([target, ...others.slice(0, slots - 1)]);
  return {
    invaders: words.map((w, i) => makeInvader(i % layout.cols, Math.floor(i / layout.cols), w, w.es === target.es)),
    target,
  };
}

function getFormationStartX(width, layout) {
  return Math.max(layout.sidePad, Math.round((width - layout.formationWidth) / 2));
}

function formationBounds(invaders, offX, offY, startX, startY, layout) {
  let minC = layout.cols;
  let maxC = -1;
  let maxR = -1;

  for (const inv of invaders) {
    if (!inv.alive) continue;
    minC = Math.min(minC, inv.col);
    maxC = Math.max(maxC, inv.col);
    maxR = Math.max(maxR, inv.row);
  }

  if (maxC < 0) {
    return { left: startX, right: startX, bottom: startY };
  }

  return {
    left: startX + offX + minC * (layout.invW + layout.gapX),
    right: startX + offX + maxC * (layout.invW + layout.gapX) + layout.invW,
    bottom: startY + offY + maxR * (layout.invH + layout.gapY) + layout.invH,
  };
}

export default function PalabraInvaders() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const marchRef = useRef(null);
  const touchRef = useRef({});
  const navigate = useNavigate();

  const [phase, setPhase] = useState('idle');
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [shields, setShields] = useState(SHIELD_MAX);
  const [wave, setWave] = useState(1);
  const [prompt, setPrompt] = useState(null);
  const [highScore, setHighScore] = useState(() => ProgressSystem.getGame('palabra-invaders').highScore);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sync = () => {
      const dpr = window.devicePixelRatio || 1;
      const parent = canvas.parentElement;
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const s = stateRef.current;
      if (!s) return;
      const layout = getLayout(width, height);
      s.W = width;
      s.H = height;
      s.layout = layout;
      s.startX = getFormationStartX(width, layout);
      s.startY = layout.startY;
      s.player.x = clamp(s.player.x, layout.playerHalfWidth + 6, width - layout.playerHalfWidth - 6);
      if (s.bullet) {
        s.bullet.x = clamp(s.bullet.x, 8, width - 8);
      }
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, []);

  function initWave(waveNum, baseScore, baseHearts, baseShields) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    const layout = getLayout(W, H);
    const { invaders, target } = buildWave(layout, VOCAB);
    const startX = getFormationStartX(W, layout);

    return {
      invaders,
      target,
      layout,
      offX: 0,
      offY: 0,
      formDir: 1,
      player: { x: W / 2 },
      bullet: null,
      score: baseScore,
      hearts: baseHearts,
      shields: baseShields,
      wave: waveNum,
      moveLeft: false,
      moveRight: false,
      startX,
      startY: layout.startY,
      W,
      H,
      flashTimer: 0,
      flashGood: true,
    };
  }

  function startMarch(waveNum) {
    clearInterval(marchRef.current);
    const alive = (stateRef.current?.invaders || []).filter(i => i.alive).length;
    const pct = Math.max(0.2, alive / Math.max(1, stateRef.current?.layout.cols * stateRef.current?.layout.rows || 1));
    const interval = Math.max(120, (MARCH_BASE - (waveNum - 1) * 80) * pct);

    marchRef.current = setInterval(() => {
      const s = stateRef.current;
      if (!s) return;
      const { layout, W } = s;
      const bounds = formationBounds(s.invaders, s.offX, s.offY, s.startX, s.startY, layout);

      if (s.formDir === 1 && bounds.right + MARCH_STEP > W - layout.sidePad) {
        s.offY += Math.max(12, layout.invH * 0.45);
        s.formDir = -1;
      } else if (s.formDir === -1 && bounds.left - MARCH_STEP < layout.sidePad) {
        s.offY += Math.max(12, layout.invH * 0.45);
        s.formDir = 1;
      } else {
        s.offX += MARCH_STEP * s.formDir;
      }

      if (bounds.bottom + Math.max(16, layout.invH * 0.55) > layout.bottomLimit) {
        s.hearts -= 1;
        s.offY = 0;
        setHearts(s.hearts);
        if (s.hearts <= 0) endGame(s);
      }

      const aliveNow = s.invaders.filter(i => i.alive).length;
      const pctNow = Math.max(0.15, aliveNow / Math.max(1, layout.cols * layout.rows));
      const newInt = Math.max(80, (MARCH_BASE - (s.wave - 1) * 80) * pctNow);
      clearInterval(marchRef.current);
      marchRef.current = setInterval(arguments.callee, newInt); // eslint-disable-line
    }, interval);
  }

  function startGame() {
    cancelAnimationFrame(rafRef.current);
    clearInterval(marchRef.current);
    const state = initWave(1, 0, 3, SHIELD_MAX);
    if (!state) return;
    stateRef.current = state;
    setScore(0);
    setHearts(3);
    setShields(SHIELD_MAX);
    setWave(1);
    setPrompt({ en: state.target.en });
    setPhase('playing');
    startMarch(1);
    rafRef.current = requestAnimationFrame(loop);
  }

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    const s = stateRef.current;
    if (!canvas || !s) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const { W, H, layout } = s;

    if (s.moveLeft) s.player.x = Math.max(layout.playerHalfWidth + 6, s.player.x - PLAYER_SPD);
    if (s.moveRight) s.player.x = Math.min(W - layout.playerHalfWidth - 6, s.player.x + PLAYER_SPD);

    if (s.bullet) {
      s.bullet.y -= BULLET_SPD;
      if (s.bullet.y < 0) s.bullet = null;
    }

    if (s.bullet) {
      for (const inv of s.invaders) {
        if (!inv.alive) continue;
        const ix = s.startX + s.offX + inv.col * (layout.invW + layout.gapX);
        const iy = s.startY + s.offY + inv.row * (layout.invH + layout.gapY);
        if (s.bullet.x > ix && s.bullet.x < ix + layout.invW && s.bullet.y > iy && s.bullet.y < iy + layout.invH) {
          inv.alive = false;
          s.bullet = null;

          if (inv.isTarget) {
            s.score += 10;
            inv.hitFlash = 20;
            AudioManager.eat(Math.min(Math.floor(s.score / 10), 6));
            setScore(s.score);
            s.flashGood = true;
            s.flashTimer = 8;

            const aliveLeft = s.invaders.filter(i => i.alive);
            if (aliveLeft.length === 0) {
              nextWave(s);
              return;
            }

            const newTarget = aliveLeft[Math.floor(Math.random() * aliveLeft.length)];
            newTarget.isTarget = true;
            s.target = { en: newTarget.word.en, es: newTarget.word.es };
            setPrompt({ en: newTarget.word.en });
          } else {
            AudioManager.wrong();
            if (navigator.vibrate) navigator.vibrate(60);
            s.shields -= 1;
            s.flashGood = false;
            s.flashTimer = 10;
            setShields(s.shields);
            if (s.shields <= 0) {
              s.hearts -= 1;
              s.shields = SHIELD_MAX;
              setHearts(s.hearts);
              setShields(SHIELD_MAX);
              if (s.hearts <= 0) {
                endGame(s);
                return;
              }
            }
          }
          break;
        }
      }
    }

    if (s.flashTimer > 0) s.flashTimer -= 1;

    drawBg(ctx, W, H);
    const nonTargets = s.invaders.filter(inv => inv.alive && !inv.isTarget);
    const targets = s.invaders.filter(inv => inv.alive && inv.isTarget);
    for (const inv of [...nonTargets, ...targets]) {
      drawInvader(ctx, inv, s.startX + s.offX + inv.col * (layout.invW + layout.gapX), s.startY + s.offY + inv.row * (layout.invH + layout.gapY), layout);
    }

    if (s.bullet) {
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 8;
      ctx.fillRect(s.bullet.x - 2, s.bullet.y, 4, 14);
      ctx.shadowBlur = 0;
    }

    drawPlayer(ctx, s.player.x, layout.playerY, s.shields, layout);

    if (s.flashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = (s.flashTimer / 10) * 0.22;
      ctx.fillStyle = s.flashGood ? '#22c55e' : '#ef4444';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  function nextWave(s) {
    clearInterval(marchRef.current);
    const newWave = s.wave + 1;
    const bonus = 30 + newWave * 10;
    s.score += bonus;
    setScore(s.score);
    setWave(newWave);
    AudioManager.levelUp();

    setTimeout(() => {
      const state = initWave(newWave, s.score, s.hearts, Math.min(SHIELD_MAX, s.shields + 1));
      if (!state) return;
      stateRef.current = state;
      setShields(state.shields);
      setPrompt({ en: state.target.en });
      startMarch(newWave);
    }, 800);
  }

  function endGame(s) {
    cancelAnimationFrame(rafRef.current);
    clearInterval(marchRef.current);
    AudioManager.gameOver();
    const finalScore = s.score;
    setHighScore(h => Math.max(h, finalScore));
    ProgressSystem.saveGame('palabra-invaders', { score: finalScore });
    setPhase('dead');
  }

  function shoot() {
    const s = stateRef.current;
    if (!s || s.bullet || phase !== 'playing') return;
    s.bullet = { x: s.player.x, y: s.layout.bulletStartY };
    AudioManager.click();
  }

  function drawBg(ctx, W, H) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#000510');
    g.addColorStop(1, '#050a1a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 40; i += 1) {
      ctx.beginPath();
      ctx.arc((i * 173) % W, (i * 97) % H, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#1a3a1a';
    ctx.fillRect(0, H - 14, W, 14);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H - 14);
    ctx.lineTo(W, H - 14);
    ctx.stroke();
  }

  function drawInvader(ctx, inv, x, y, layout) {
    const isTarget = inv.isTarget;
    const bg = isTarget ? 'rgba(34,197,94,0.2)' : 'rgba(168,85,247,0.12)';
    const border = isTarget ? '#22c55e' : 'rgba(168,85,247,0.55)';
    const txt = isTarget ? '#86efac' : '#c4b5fd';

    ctx.save();
    if (isTarget) {
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 10;
    }
    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = isTarget ? 1.75 : 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, layout.invW, layout.invH, 6);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = border;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + layout.invW * 0.3, y);
    ctx.lineTo(x + layout.invW * 0.25, y - 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + layout.invW * 0.7, y);
    ctx.lineTo(x + layout.invW * 0.75, y - 5);
    ctx.stroke();

    ctx.fillStyle = txt;
    ctx.font = `bold ${layout.fontSize}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(inv.word.es, x + layout.invW / 2, y + layout.invH / 2);
    ctx.restore();
  }

  function drawPlayer(ctx, cx, y, shieldsLeft, layout) {
    ctx.save();
    ctx.fillStyle = '#22c55e';
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(cx, y - 22);
    ctx.lineTo(cx - layout.playerHalfWidth, y + 10);
    ctx.lineTo(cx + layout.playerHalfWidth, y + 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#86efac';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(cx, y - 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    for (let i = 0; i < SHIELD_MAX; i += 1) {
      ctx.globalAlpha = i < shieldsLeft ? 1 : 0.2;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(cx - (SHIELD_MAX - 1) * (layout.shieldDotGap / 2) + i * layout.shieldDotGap, y + layout.shieldDotY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  useEffect(() => {
    const down = (e) => {
      const s = stateRef.current;
      if (!s) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') s.moveLeft = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') s.moveRight = true;
      if (e.code === 'Space') {
        e.preventDefault();
        shoot();
      }
    };
    const up = (e) => {
      const s = stateRef.current;
      if (!s) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') s.moveLeft = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') s.moveRight = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [phase]);

  function onTouchStart(e) {
    for (const t of e.changedTouches) touchRef.current[t.identifier] = t.clientX;
  }

  function onTouchEnd(e) {
    const s = stateRef.current;
    if (!s) return;
    for (const t of e.changedTouches) {
      const startX = touchRef.current[t.identifier];
      if (startX === undefined) continue;
      delete touchRef.current[t.identifier];
      const dx = t.clientX - startX;
      if (Math.abs(dx) < 12) shoot();
    }
  }

  function onTouchMove(e) {
    const s = stateRef.current;
    if (!s || !canvasRef.current) return;
    const t = e.touches[0];
    const width = canvasRef.current.parentElement.clientWidth;
    s.player.x = clamp(t.clientX, s.layout.playerHalfWidth + 6, width - s.layout.playerHalfWidth - 6);
  }

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    clearInterval(marchRef.current);
  }, []);

  return (
    <div className="pi-game">
      <div className="pi-top">
        <button className="pi-back" onClick={() => { cancelAnimationFrame(rafRef.current); clearInterval(marchRef.current); navigate('/'); }}>← Menu</button>
        <div className="pi-hud-center">
          {phase === 'playing' && prompt && <span className="pi-prompt">Shoot: <strong>{prompt.en}</strong></span>}
        </div>
        <div className="pi-hud-right">
          <span className="pi-score">⭐ {score}</span>
          <span className="pi-wave">Wave {wave}</span>
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className={`pi-heart ${i < hearts ? '' : 'pi-heart--empty'}`}>❤️</span>
          ))}
        </div>
      </div>

      <div className="pi-canvas-wrap" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchMove={onTouchMove}>
        <canvas ref={canvasRef} className="pi-canvas" />
      </div>

      {phase === 'idle' && (
        <div className="pi-overlay">
          <div className="pi-overlay__box">
            <div className="pi-overlay__emoji">👾</div>
            <h2 className="pi-overlay__title">Palabra Invaders</h2>
            <p className="pi-overlay__sub">Invasores de Palabras</p>
            <div className="pi-overlay__instructions">
              <p>A word appears at the top — find its Spanish translation on the grid!</p>
              <p>Shoot the <span className="pi-highlight">glowing invader</span>.</p>
              <p>Wrong shot = lose a shield (3 shields = 1 life).</p>
              <p>← → / A D to move · Space or tap to shoot</p>
            </div>
            {highScore > 0 && <p className="pi-overlay__best">Best: {highScore} pts</p>}
            <button className="pi-overlay__btn" onClick={startGame}>▶ Start</button>
          </div>
        </div>
      )}

      {phase === 'dead' && (
        <div className="pi-overlay">
          <div className="pi-overlay__box">
            <div className="pi-overlay__emoji">💥</div>
            <h2 className="pi-overlay__title">Base Destroyed!</h2>
            <div className="pi-overlay__stats">
              <div className="pi-overlay__row"><span>Score</span><strong>{score}</strong></div>
              <div className="pi-overlay__row"><span>Wave reached</span><strong>{wave}</strong></div>
              {score >= highScore && score > 0 && <p className="pi-overlay__new">🏆 New High Score!</p>}
            </div>
            <button className="pi-overlay__btn" onClick={startGame}>▶ Play Again</button>
            <button className="pi-overlay__btn pi-overlay__btn--sec" onClick={() => navigate('/')}>← Menu</button>
          </div>
        </div>
      )}
    </div>
  );
}
