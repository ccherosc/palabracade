import React from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';
import { AudioManager } from '../engine/AudioManager.js';
import { ProgressSystem } from '../engine/ProgressSystem.js';
import './GameCard.css';

const ACCENT = {
  'snake-sentences': '#22c55e',
  'word-whack': '#f97316',
  'verb-runner': '#3b82f6',
  'memory-mercado': '#a855f7',
  'conjugation-castle': '#ec4899',
  'palabra-invaders': '#6366f1',
  'ahorcado': '#8b5cf6',
  'conexiones': '#c084fc',
  'flappy-vocab': '#06b6d4',
  'radar-relay': '#14b8a6',
};

const EMOJI = {
  'snake-sentences': '🐍',
  'word-whack': '🔨',
  'verb-runner': '🏃',
  'memory-mercado': '🛒',
  'conjugation-castle': '🏰',
  'palabra-invaders': '👾',
  'ahorcado': '🎯',
  'conexiones': '🧩',
  'flappy-vocab': '🦜',
  'radar-relay': '📡',
};

export default function GameCard({ game }) {
  const navigate = useNavigate();
  const accent = ACCENT[game.id] ?? '#a855f7';
  const emoji = EMOJI[game.id] ?? '🎮';
  const playable = game.status === 'working' || game.status === 'wip';
  const progress = ProgressSystem.getGame(game.id);

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
      onKeyDown={event => event.key === 'Enter' && handleClick()}
      aria-label={playable ? `Play ${game.title}` : `${game.title} — coming soon`}
    >
      <div className="game-card__glow" />

      <header className="game-card__header">
        <div className="game-card__headline">
          <span className="game-card__emoji">{emoji}</span>
          <div>
            <h3 className="game-card__title">{game.title}</h3>
            <p className="game-card__subtitle">{game.titleEs}</p>
          </div>
        </div>
        <StatusBadge status={game.status} />
      </header>

      <p className="game-card__description">{game.description}</p>

      <div className="game-card__meta-row">
        <span className="game-card__skill">{game.skill}</span>
        <span className="game-card__level">{game.level}</span>
      </div>

      <div className="game-card__progress-grid">
        <div className="game-card__progress-item">
          <span>Best</span>
          <strong>{progress.highScore > 0 ? progress.highScore.toLocaleString() : '—'}</strong>
        </div>
        <div className="game-card__progress-item">
          <span>Plays</span>
          <strong>{progress.totalPlays || '—'}</strong>
        </div>
        <div className="game-card__progress-item">
          <span>Accuracy</span>
          <strong>{progress.accuracy ? `${progress.accuracy}%` : '—'}</strong>
        </div>
      </div>

      <footer className="game-card__footer">
        <div className="game-card__tags">
          <span className="game-card__tag">Ages {game.ageRange}</span>
          <span className="game-card__tag">{playable ? 'Touch + keyboard' : 'Coming soon'}</span>
        </div>
        {playable && <span className="game-card__play-btn">▶ Play</span>}
      </footer>

      {game.status === 'wip' && (
        <div className="game-card__wip-warning">Prototype cabinet — fun, but still being tuned.</div>
      )}
    </article>
  );
}
