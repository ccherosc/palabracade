import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HUD.css';

export default function HUD({ title, score = 0, streak = 0, hearts = 3, maxHearts = 3, onPause, speed, speedColor }) {
  const navigate = useNavigate();

  // ── Animated score counter ──
  const [displayScore, setDisplayScore] = useState(score);
  const fromRef  = useRef(score);
  const animRef  = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    const to   = score;
    if (from === to) return;

    cancelAnimationFrame(animRef.current);
    const startTs = performance.now();
    const dur = Math.max(120, Math.min(320, Math.abs(to - from) * 15));

    function step(ts) {
      const t      = Math.min(1, (ts - startTs) / dur);
      const eased  = 1 - (1 - t) ** 3; // cubic ease-out
      const val    = Math.round(from + (to - from) * eased);
      fromRef.current = val;
      setDisplayScore(val);
      if (t < 1) animRef.current = requestAnimationFrame(step);
      else fromRef.current = to;
    }

    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [score]);

  // ── Heart crack on loss ──
  const prevHeartsRef = useRef(hearts);
  const [crackIdx, setCrackIdx] = useState(-1);

  useEffect(() => {
    if (hearts < prevHeartsRef.current) {
      const lost = hearts;
      setCrackIdx(lost);
      const t = setTimeout(() => setCrackIdx(-1), 550);
      prevHeartsRef.current = hearts;
      return () => clearTimeout(t);
    }
    prevHeartsRef.current = hearts;
  }, [hearts]);

  return (
    <div className="hud">
      <button className="hud__back" onClick={() => navigate('/')} title="Back to menu">
        ← Menu
      </button>

      <span className="hud__title">{title}</span>

      <div className="hud__stats">
        <div className="hud__stat">
          <span className="hud__stat-label">Score</span>
          <span className={`hud__stat-value ${displayScore !== score ? 'hud__stat-value--ticking' : ''}`}>
            {displayScore}
          </span>
        </div>
        {streak > 1 && (
          <div className="hud__stat hud__stat--streak">
            <span className="hud__stat-label">Streak</span>
            <span className={`hud__stat-value ${streak >= 5 ? 'hud__streak--fire' : ''}`}>🔥 {streak}</span>
          </div>
        )}
        {speed !== undefined && (
          <div className="hud__stat">
            <span className="hud__stat-label">Speed</span>
            <span className="hud__stat-value" style={{ color: speedColor }}>⚡{speed}</span>
          </div>
        )}
        <div className="hud__hearts">
          {Array.from({ length: maxHearts }).map((_, i) => (
            <span key={i} className={[
              'hud__heart',
              i < hearts ? 'hud__heart--full' : 'hud__heart--empty',
              i === crackIdx ? 'hud__heart--crack' : '',
            ].join(' ')}>
              {i < hearts ? '❤️' : '🖤'}
            </span>
          ))}
        </div>
      </div>

      {onPause && (
        <button className="hud__pause" onClick={onPause} title="Pause (P)">⏸</button>
      )}
    </div>
  );
}
