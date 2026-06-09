import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ArcadeGameShell.css';

export default function ArcadeGameShell({
  title,
  subtitle,
  eyebrow,
  accent = '#8b5cf6',
  stats = [],
  children,
  aside,
  footer,
  controls,
}) {
  const navigate = useNavigate();

  return (
    <div className="arcade-shell" style={{ '--shell-accent': accent }}>
      <div className="arcade-shell__topbar">
        <button className="arcade-shell__back arcade-btn arcade-btn--ghost" onClick={() => navigate('/')}>
          ← Menu
        </button>
        {controls ? <div className="arcade-shell__controls">{controls}</div> : <div />}
      </div>

      <section className="arcade-shell__hero">
        <div className="arcade-shell__hero-copy">
          {eyebrow && <span className="arcade-shell__eyebrow">{eyebrow}</span>}
          <h1 className="arcade-shell__title">{title}</h1>
          {subtitle && <p className="arcade-shell__subtitle">{subtitle}</p>}
        </div>

        {stats.length > 0 && (
          <div className="arcade-shell__stats">
            {stats.map(stat => (
              <div key={stat.label} className="arcade-shell__stat">
                <span className="arcade-shell__stat-label">{stat.label}</span>
                <strong className="arcade-shell__stat-value">{stat.value}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={`arcade-shell__stage ${aside ? 'arcade-shell__stage--split' : ''}`}>
        <div className="arcade-shell__main">{children}</div>
        {aside && <aside className="arcade-shell__aside">{aside}</aside>}
      </section>

      {footer && <footer className="arcade-shell__footer">{footer}</footer>}
    </div>
  );
}
