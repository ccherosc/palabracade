import React from 'react';
import { getAllGames } from '../engine/GameRegistry.js';
import { ProgressSystem } from '../engine/ProgressSystem.js';
import GameCard from './GameCard.jsx';
import './MainMenu.css';

const SECTIONS = [
  {
    key: 'working',
    title: 'Play now',
    subtitle: 'Most-played cabinets first.',
    icon: '🕹️',
  },
  {
    key: 'wip',
    title: 'Workshop',
    subtitle: 'Experimental cabinets that need a sharper hook before promotion.',
    icon: '⚙️',
  },
  {
    key: 'soon',
    title: 'On deck',
    subtitle: 'Future cabinets in the queue.',
    icon: '🚀',
  },
];

const STAT_ICONS = {
  Live: '🟢',
  Sessions: '🎯',
  Points: '⚡',
  Explored: '🗺️',
};

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
  const workingGames = sortedGames.filter(game => game.status === 'working');
  const featuredGames = workingGames.slice(0, 3);
  const masteryPct = workingGames.length
    ? Math.round((gamesPlayed.length / workingGames.length) * 100)
    : 0;
  const recentTitle = recent
    ? (games.find(game => game.id === recent.gameId)?.title ?? prettifyGameId(recent.gameId))
    : 'Fresh profile — pick any cabinet';
  const resumeHref = recent ? `/games/${recent.gameId}` : '#play-now';

  const statCards = [
    { label: 'Live', value: workingGames.length, note: 'fully promoted' },
    { label: 'Sessions', value: totalPlays, note: 'completed' },
    { label: 'Points', value: totalPoints.toLocaleString(), note: 'lifetime' },
    { label: 'Explored', value: `${masteryPct}%`, note: `${gamesPlayed.length}/${workingGames.length || 0} promoted` },
  ];

  return (
    <div className="main-menu">
      <header className="main-menu__hero">
        <div className="main-menu__hero-shell">
          <div className="main-menu__hero-copy">
            <span className="main-menu__eyebrow">Learn Spanish through arcade mini-games</span>

            <div className="main-menu__logo-wrap">
              <span className="main-menu__logo-icon animate-float">🎮</span>
              <div>
                <h1 className="main-menu__logo-title">
                  Palabra<span className="main-menu__logo-accent">Cade</span>
                </h1>
                <p className="main-menu__logo-sub">Fast, replayable Spanish reps with a real arcade feel.</p>
              </div>
            </div>

            <p className="main-menu__pitch">
              Start with the most-played cabinets first. The hero now carries the key dashboard stats so the top of the page feels fuller and more useful.
            </p>

            <div className="main-menu__cta-row">
              <a className="arcade-btn arcade-btn--gold" href="#play-now">▶ Start playing</a>
              <a className="arcade-btn arcade-btn--ghost" href={resumeHref}>
                {recent ? '↺ Continue recent run' : '★ Browse top cabinets'}
              </a>
            </div>
          </div>

          <div className="main-menu__hero-dashboard" aria-label="Arcade snapshot">
            <div className="main-menu__hero-dashboard-head">
              <span className="main-menu__panel-label">Arcade snapshot</span>
              <strong className="main-menu__panel-kicker">At-a-glance progress</strong>
            </div>

            <div className="main-menu__hero-stats-grid">
              {statCards.map(card => (
                <article key={card.label} className="main-menu__hero-stat-card">
                  <div className="main-menu__hero-stat-topline">
                    <span className="main-menu__hero-stat-icon" aria-hidden="true">{STAT_ICONS[card.label]}</span>
                    <span className="main-menu__stat-label">{card.label}</span>
                  </div>
                  <strong className="main-menu__hero-stat-value">{card.value}</strong>
                  <span className="main-menu__stat-note">{card.note}</span>
                </article>
              ))}
            </div>

            <div className="main-menu__hero-recent">
              <span className="main-menu__panel-label">Recent run</span>
              <strong className="main-menu__hero-recent-title">{recentTitle}</strong>
              <span className="main-menu__hero-recent-note">
                {recent ? 'Keep your momentum going.' : 'Pick any cabinet to start tracking progress.'}
              </span>
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
          <section className="main-menu__panel main-menu__panel--picks">
            <div className="main-menu__panel-head">
              <span className="main-menu__panel-label">Top picks</span>
              <strong className="main-menu__panel-kicker">Quick-start cabinets</strong>
            </div>
            <div className="main-menu__featured-stack">
              {featuredGames.map(game => (
                <a key={game.id} className="main-menu__featured-item" href={`/games/${game.id}`}>
                  <span className="main-menu__featured-rank">Top pick</span>
                  <strong>{game.title}</strong>
                  <span>{game.skill}</span>
                </a>
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
