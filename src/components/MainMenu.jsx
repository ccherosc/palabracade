import React from 'react';
import { getAllGames } from '../engine/GameRegistry.js';
import { ProgressSystem } from '../engine/ProgressSystem.js';
import GameCard from './GameCard.jsx';
import './MainMenu.css';

const SECTIONS = [
  {
    key: 'working',
    title: 'Working',
    subtitle: 'Fully playable — jump right in',
    icon: '✅',
    emptyMsg: 'No games are live yet — check back soon!',
  },
  {
    key: 'wip',
    title: 'Work in Progress',
    subtitle: 'Playable prototypes — expect rough edges',
    icon: '⚡',
    emptyMsg: 'Nothing in the workshop right now.',
  },
  {
    key: 'soon',
    title: 'Coming Soon',
    subtitle: 'Sneak peeks at what is being built next',
    icon: '🔭',
    emptyMsg: 'More games are being planned!',
  },
];

export default function MainMenu() {
  const games = getAllGames();
  const totalPoints = ProgressSystem.getTotalPoints();

  return (
    <div className="main-menu">
      <header className="main-menu__hero">
        <div className="main-menu__logo-wrap">
          <span className="main-menu__logo-icon animate-float">🎮</span>
          <div>
            <h1 className="main-menu__logo-title">
              Palabra<span className="main-menu__logo-accent">Cade</span>
            </h1>
            <p className="main-menu__logo-sub">Learn Spanish Through Play</p>
          </div>
        </div>

        {totalPoints > 0 && (
          <div className="main-menu__points">
            <span className="main-menu__points-label">Total Points</span>
            <span className="main-menu__points-value">⭐ {totalPoints.toLocaleString()}</span>
          </div>
        )}
      </header>

      <main className="main-menu__sections">
        {SECTIONS.map(section => {
          const sectionGames = games.filter(g => g.status === section.key);
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

              {sectionGames.length === 0 ? (
                <p className="menu-section__empty">{section.emptyMsg}</p>
              ) : (
                <div className="menu-section__grid">
                  {sectionGames.map((game, i) => (
                    <div
                      key={game.id}
                      style={{ animationDelay: `${i * 0.06}s` }}
                    >
                      <GameCard game={game} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </main>

      <footer className="main-menu__footer">
        <p>PalabraCade v0.1 — Built with ♥ for Spanish learners</p>
      </footer>
    </div>
  );
}
