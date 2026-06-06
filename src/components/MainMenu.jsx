import React from 'react';
import { getAllGames } from '../engine/GameRegistry.js';
import { ProgressSystem } from '../engine/ProgressSystem.js';
import GameCard from './GameCard.jsx';
import './MainMenu.css';

const SECTIONS = [
  {
    key: 'working',
    title: 'Play now',
    subtitle: 'Most-played first, with the best cabinets ready to jump into immediately.',
    icon: '🕹️',
    emptyMsg: 'No games are live yet — check back soon!',
  },
  {
    key: 'wip',
    title: 'Workshop',
    subtitle: 'Promising experiments that are close enough to preview without cluttering the main floor.',
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
  { title: 'Pick a cabinet', copy: 'Choose vocabulary, speed, memory, or sentence-building reps.' },
  { title: 'Chase another run', copy: 'Fast restarts and visible progress make replaying the default.' },
  { title: 'Build momentum', copy: 'Points, streaks, and session history show real improvement over time.' },
];

function prettifyGameId(gameId) {
  return gameId
    .replace(/-/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

export default function MainMenu() {
  const games = getAllGames();
  const totalPoints = ProgressSystem.getTotalPoints();
  const totalPlays = ProgressSystem.getTotalPlays();
  const gamesPlayed = ProgressSystem.getGamesPlayed();
  const recent = ProgressSystem.getRecentlyPlayed(1)[0];

  const gamesWithStats = games.map(game => ({
    ...game,
    progress: ProgressSystem.getGame(game.id),
  }));

  const sortByEngagement = (a, b) => {
    const playsDiff = (b.progress.totalPlays ?? 0) - (a.progress.totalPlays ?? 0);
    if (playsDiff !== 0) return playsDiff;

    const recentDiff = (b.progress.lastPlayed ?? 0) - (a.progress.lastPlayed ?? 0);
    if (recentDiff !== 0) return recentDiff;

    return a.title.localeCompare(b.title);
  };

  const sortedGames = [...gamesWithStats].sort(sortByEngagement);
  const playable = sortedGames.filter(game => game.status !== 'soon');
  const featuredGames = playable.slice(0, 3);
  const masteryPct = playable.length
    ? Math.round((gamesPlayed.length / playable.length) * 100)
    : 0;
  const recentTitle = recent
    ? (games.find(game => game.id === recent.gameId)?.title ?? prettifyGameId(recent.gameId))
    : 'Fresh profile — pick any cabinet';

  const statCards = [
    { label: 'Live games', value: playable.length, note: 'Ready tonight' },
    { label: 'Sessions', value: totalPlays, note: 'Runs completed' },
    { label: 'Total points', value: totalPoints.toLocaleString(), note: 'Lifetime score' },
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
            Jump straight into the arcade. The most-played cabinets now surface first, while progress, spotlight picks, and session stats stay visible in side panels instead of pushing the game wall down the page.
          </p>

          <div className="main-menu__cta-row">
            <a className="arcade-btn arcade-btn--gold" href="#play-now">▶ Start playing</a>
            <div className="main-menu__hero-pills" aria-label="Arcade snapshot">
              <span className="main-menu__hero-pill">{playable.length} live games</span>
              <span className="main-menu__hero-pill">{totalPlays} total sessions</span>
              <span className="main-menu__hero-pill">{masteryPct}% explored</span>
            </div>
          </div>
        </div>
      </header>

      <div className="main-menu__experience">
        <main className="main-menu__sections" id="play-now">
          {SECTIONS.map(section => {
            const sectionGames = sortedGames.filter(game => game.status === section.key);
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

        <aside className="main-menu__aside" aria-label="Arcade dashboard">
          <section className="main-menu__panel main-menu__panel--recent">
            <span className="main-menu__panel-label">Recent run</span>
            <h2 className="main-menu__panel-title">{recentTitle}</h2>
            <p className="main-menu__panel-copy">
              {recent ? 'Jump back in or keep climbing your score on the cabinets you already like.' : 'No history yet — start with a favorite cabinet and the dashboard will begin to personalize itself.'}
            </p>
          </section>

          <section className="main-menu__panel main-menu__panel--stats" aria-label="Arcade progress">
            <div className="main-menu__panel-head">
              <span className="main-menu__panel-label">Dashboard</span>
              <strong className="main-menu__panel-kicker">Progress at a glance</strong>
            </div>
            <div className="main-menu__stats-stack">
              {statCards.map(card => (
                <article key={card.label} className="main-menu__stat-card">
                  <span className="main-menu__stat-label">{card.label}</span>
                  <strong className="main-menu__stat-value">{card.value}</strong>
                  <span className="main-menu__stat-note">{card.note}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="main-menu__panel">
            <div className="main-menu__panel-head">
              <span className="main-menu__panel-label">Game loop</span>
              <strong className="main-menu__panel-kicker">Fast, replayable, low-friction reps</strong>
            </div>
            <div className="main-menu__loop-steps main-menu__loop-steps--stacked">
              {LOOP_STEPS.map((step, index) => (
                <article key={step.title} className="main-menu__loop-step">
                  <span className="main-menu__loop-step-index">0{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="main-menu__panel">
            <div className="main-menu__panel-head">
              <span className="main-menu__panel-label">Tonight’s spotlight</span>
              <strong className="main-menu__panel-kicker">Most played or most likely to hook a new learner</strong>
            </div>
            <div className="main-menu__featured-stack">
              {featuredGames.map(game => (
                <div key={game.id} className="main-menu__featured-item">
                  <strong>{game.title}</strong>
                  <span>{game.skill}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <footer className="main-menu__footer">
        <p>PalabraCade v0.1 — Learn Spanish through arcade mini-games.</p>
      </footer>
    </div>
  );
}
