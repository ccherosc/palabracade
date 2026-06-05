import React from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';
import { AudioManager } from '../engine/AudioManager.js';
import { ProgressSystem } from '../engine/ProgressSystem.js';
import './GameCard.css';

const ACCENT = {
  'snake-sentences':     '#22c55e',
  'word-whack':          '#f97316',
  'verb-runner':         '#3b82f6',
  'memory-mercado':      '#a855f7',
  'conjugation-castle':  '#ec4899',
};

const EMOJI = {
  'snake-sentences':     '🐍',
  'word-whack':          '🔨',
  'verb-runner':         '🏃',
  'memory-mercado':      '🛒',
  'conjugation-castle':  '🏰',
};

export default function GameCard({ game }) {
  const navigate = useNavigate();
  const accent    = ACCENT[game.id] ?? '#a855f7';
  const emoji     = EMOJI[game.id]  ?? '🎮';
  const playable  = game.status === 'working' || game.status === 'wip';
  const highScore = ProgressSystem.getGame(game.id).highScore;

  function handleClick() {
    if (!playable) return;
    AudioManager.click();
    navigate(game.route);
  }

  return (
    <article
      className={`game-card game-card--${game.status} ${playable ? 'game-card--playable' : ''}`}
      style={{ '--card-accent': accent }}
      onClick={handleClick}
      role={playable ? 'button' : 'article'}
      tabIndex={playable ? 0 : -1}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
      aria-label={playable ? `Play ${game.title}` : `${game.title} — coming soon`}
    >
      <div className="game-card__glow" />

      <header className="game-card__header">
        <span className="game-card__emoji">{emoji}</span>
        <StatusBadge status={game.status} />
      </header>

      <h3 className="game-card__title">{game.title}</h3>
      <p className="game-card__description">{game.description}</p>

      {highScore > 0 && (
        <div className="game-card__record">⭐ Best: {highScore.toLocaleString()}</div>
      )}

      <footer className="game-card__footer">
        <div className="game-card__tags">
          <span className="game-card__tag">Ages {game.ageRange}</span>
          <span className="game-card__tag">{game.level}</span>
        </div>
        {playable && (
          <span className="game-card__play-btn">▶ Play</span>
        )}
      </footer>

      {game.status === 'wip' && (
        <div className="game-card__wip-warning">
          Prototype — some features may be incomplete
        </div>
      )}
    </article>
  );
}
