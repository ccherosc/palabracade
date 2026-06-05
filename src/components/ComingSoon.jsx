import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ComingSoon.css';

export default function ComingSoon({ game }) {
  const navigate = useNavigate();
  return (
    <div className="coming-soon">
      <button className="coming-soon__back" onClick={() => navigate('/')}>← Back to Menu</button>
      <div className="coming-soon__card">
        <div className="coming-soon__icon">🔭</div>
        <h1 className="coming-soon__title">{game.title}</h1>
        <p className="coming-soon__sub">{game.titleEs}</p>
        <p className="coming-soon__desc">{game.description}</p>
        <div className="coming-soon__meta">
          <span>Ages {game.ageRange}</span>
          <span>{game.level}</span>
          <span>{game.skill}</span>
        </div>
        <div className="coming-soon__badge">⏳ Coming Soon</div>
        <p className="coming-soon__msg">
          This game is being designed. Check back for updates!
        </p>
      </div>
    </div>
  );
}
