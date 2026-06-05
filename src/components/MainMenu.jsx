import React from 'react';
import { getAllGames } from '../engine/GameRegistry.js';
import { ProgressSystem } from '../engine/ProgressSystem.js';
import GameCard from './GameCard.jsx';
import './MainMenu.css';

const SECTIONS = [
  {
    key: 'working',
    title: 'Play now',
    subtitle: 'Finished-enough experiences with polished loops and real progression.',
    icon: '🕹️',
    emptyMsg: 'No games are live yet — check back soon!',
  },
  {
    key: 'wip',
    title: 'Workshop',
    subtitle: 'Playable experiments getting tuned into future headliners.',
    icon: '⚙️',
    emptyMsg: 'Nothing is on the workbench right now.',
  },
  {
    key: 'soon',
    title: 'On deck',
    subtitle: 'Concepts queued up for the next content drop.',
    icon: '🚀',
    emptyMsg: 'More games are being planned!',
  },
];

const LOOP_STEPS = [
  { title: 'Pick a game', copy: 'Vocabulary, sentence flow, memory, reflexes, or conjugations.' },
  { title: 'Build streaks', copy: 'Fast rounds, visible scores, and instant retries keep reps high.' },
  { title: 'Track progress', copy: 'High scores, total points, and recent activity prove momentum.' },
];

export default function MainMenu() {
  const games = getAllGames();
  const totalPoints = ProgressSystem.getTotalPoints();
  const totalPlays = ProgressSystem.getTotalPlays();
  const gamesPlayed = ProgressSystem.getGamesPlayed();
  const recent = ProgressSystem.getRecentlyPlayed(1)[0];
  const playable = games.filter(game => game.status !== 'soon');
  const featuredGames = playable.slice(0, 3);
  const masteryPct = playable.length
    ? Math.round((gamesPlayed.length / playable.length) * 100)
    : 0;

  const statCards = [
    { label: 'Live games', value: playable.length, note: 'Playable tonight' },
    { label: 'Total points', value: totalPoints.toLocaleString(), note: 'Lifetime score' },
    { label: 'Sessions', value: totalPlays, note: 'Across all games' },
    { label: 'Arcade explored', value: `${masteryPct}%`, note: `${gamesPlayed.length}/${playable.length || 0} games played` },
  ];

  return (
    <div className="main-menu">
      <header className="main-menu__hero">
        <div className="main-menu__hero-copy">
          <span className="main-menu__eyebrow">Learn Spanish through arcade mini-games</span>
          <div className="main-menu__logo-wrap">
            <span className="main-menu__logo-icon animate-float">🎮</span>
            <div>
              <h1 className="main-menu__logo-title">
                Palabra<span className="main-menu__logo-accent">Cade</span>
              </h1>
              <p className="main-menu__logo-sub">Commercial-feeling practice loops for vocabulary, grammar, speed, and confidence.</p>
            </div>
          </div>

          <p className="main-menu__pitch">
            Quick rounds. Bright feedback. Clean retries. PalabraCade turns Spanish reps into something that feels like a real game night instead of homework.
          </p>

          <div className="main-menu__cta-row">
            <a className="arcade-btn arcade-btn--gold" href="#play-now">▶ Start playing</a>
            <div className="main-menu__recent">
              <span className="main-menu__recent-label">Recent run</span>
              <strong>{recent ? recent.gameId.replace(/-/g, ' ') : 'Fresh profile — pick any cabinet'}</strong>
            </div>
          </div>
        </div>

        <div className="main-menu__hero-side">
          <div className="main-menu__hero-card">
            <span className="main-menu__hero-card-label">Why it works</span>
            <h2>Practice that feels fast, visual, and replayable.</h2>
            <ul>
              <li>Touch-friendly controls for phones and tablets</li>
              <li>Big-card layout and spacious desktop browsing</li>
              <li>Multiple game types so learners can switch modes without leaving the arcade</li>
            </ul>
          </div>

          <div className="main-menu__hero-card main-menu__hero-card--compact">
            <span className="main-menu__hero-card-label">Tonight’s spotlight</span>
            <div className="main-menu__featured-stack">
              {featuredGames.map(game => (
                <div key={game.id} className="main-menu__featured-item">
                  <strong>{game.title}</strong>
                  <span>{game.skill}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="main-menu__stats-grid" aria-label="Arcade progress">
        {statCards.map(card => (
          <article key={card.label} className="main-menu__stat-card">
            <span className="main-menu__stat-label">{card.label}</span>
            <strong className="main-menu__stat-value">{card.value}</strong>
            <span className="main-menu__stat-note">{card.note}</span>
          </article>
        ))}
      </section>

      <section className="main-menu__loop" aria-label="How PalabraCade works">
        <div className="main-menu__loop-copy">
          <span className="main-menu__eyebrow">Game loop</span>
          <h2>Designed for repeat play on mobile and desktop.</h2>
          <p>
            Every cabinet aims for the same rhythm: clear objective, fast feedback, satisfying score chase, then a one-tap retry.
          </p>
        </div>
        <div className="main-menu__loop-steps">
          {LOOP_STEPS.map((step, index) => (
            <article key={step.title} className="main-menu__loop-step">
              <span className="main-menu__loop-step-index">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <main className="main-menu__sections" id="play-now">
        {SECTIONS.map(section => {
          const sectionGames = games.filter(game => game.status === section.key);
          if (sectionGames.length === 0) return null;

          return (
            <section key={section.key} className={`menu-section menu-section--${section.key}`}>
              <div className="menu-section__header">
                <span className="menu-section__icon">{section.icon}</span>
                <div>
                  <h2 className="menu-section__title">{section.title}</h2>
                  <p className="menu-section__subtitle">{section.subtitle}</p>
                </div>
                <span className="menu-section__count">{sectionGames.length}</span>
              </div>

              <div className="menu-section__grid">
                {sectionGames.map((game, index) => (
                  <div key={game.id} style={{ animationDelay: `${index * 0.04}s` }}>
                    <GameCard game={game} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </main>

      <footer className="main-menu__footer">
        <p>PalabraCade v0.1 — Learn Spanish through arcade mini-games.</p>
      </footer>
    </div>
  );
}
