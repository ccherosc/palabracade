import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ArcadeGameShell from '../../components/ArcadeGameShell.jsx';
import { AudioManager } from '../../engine/AudioManager.js';
import { ProgressSystem } from '../../engine/ProgressSystem.js';
import { shuffle } from '../../engine/WordBank.js';
import './ConjugationCastle.css';

const ROUND_TIME = 8;
const WALL_MAX = 4;
const WAVE_TARGET = 12;

const CHALLENGES = [
  { cue: 'I eat breakfast', subject: 'Yo', infinitive: 'comer', tense: 'Present', answer: 'como', options: ['como', 'comes', 'comen'] },
  { cue: 'You drink water', subject: 'Tú', infinitive: 'beber', tense: 'Present', answer: 'bebes', options: ['bebo', 'bebes', 'beben'] },
  { cue: 'She reads at night', subject: 'Ella', infinitive: 'leer', tense: 'Present', answer: 'lee', options: ['leo', 'lee', 'leen'] },
  { cue: 'We run every day', subject: 'Nosotros', infinitive: 'correr', tense: 'Present', answer: 'corremos', options: ['corremos', 'corren', 'corres'] },
  { cue: 'They speak Spanish', subject: 'Ellos', infinitive: 'hablar', tense: 'Present', answer: 'hablan', options: ['hablo', 'hablas', 'hablan'] },
  { cue: 'I am going to study', subject: 'Yo', infinitive: 'estudiar', tense: 'Near future', answer: 'voy a estudiar', options: ['voy a estudiar', 'va a estudiar', 'vamos a estudiar'] },
  { cue: 'We are going to travel', subject: 'Nosotros', infinitive: 'viajar', tense: 'Near future', answer: 'vamos a viajar', options: ['voy a viajar', 'vas a viajar', 'vamos a viajar'] },
  { cue: 'She is going to write', subject: 'Ella', infinitive: 'escribir', tense: 'Near future', answer: 'va a escribir', options: ['voy a escribir', 'va a escribir', 'van a escribir'] },
  { cue: 'I ate at home', subject: 'Yo', infinitive: 'comer', tense: 'Preterite', answer: 'comí', options: ['comió', 'comimos', 'comí'] },
  { cue: 'You lived in Madrid', subject: 'Tú', infinitive: 'vivir', tense: 'Preterite', answer: 'viviste', options: ['viví', 'viviste', 'vivieron'] },
  { cue: 'We read the book', subject: 'Nosotros', infinitive: 'leer', tense: 'Preterite', answer: 'leímos', options: ['leyó', 'leímos', 'leíste'] },
  { cue: 'They wrote the letter', subject: 'Ellos', infinitive: 'escribir', tense: 'Preterite', answer: 'escribieron', options: ['escribieron', 'escribimos', 'escribiste'] },
  { cue: 'I will drink later', subject: 'Yo', infinitive: 'beber', tense: 'Simple future', answer: 'beberé', options: ['beberé', 'beberás', 'beberán'] },
  { cue: 'She will arrive soon', subject: 'Ella', infinitive: 'llegar', tense: 'Simple future', answer: 'llegará', options: ['llegaré', 'llegará', 'llegarán'] },
  { cue: 'We will play tomorrow', subject: 'Nosotros', infinitive: 'jugar', tense: 'Simple future', answer: 'jugaremos', options: ['jugarás', 'jugaremos', 'jugarán'] },
];

function buildDeck() {
  return shuffle(CHALLENGES).slice(0, WAVE_TARGET);
}

export default function ConjugationCastle() {
  const best = ProgressSystem.getGame('conjugation-castle').highScore;
  const deckRef = useRef(buildDeck());
  const correctRef = useRef(0);
  const missRef = useRef(0);
  const scoreRef = useRef(0);
  const streakRef = useRef(0);

  const [phase, setPhase] = useState('idle');
  const [wave, setWave] = useState(1);
  const [wall, setWall] = useState(WALL_MAX);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [message, setMessage] = useState('Defend the castle by choosing the correct form.');
  const [question, setQuestion] = useState(deckRef.current[0]);
  const [bestScore, setBestScore] = useState(best);

  const accuracy = useMemo(() => {
    const total = correctRef.current + missRef.current;
    return total ? Math.round((correctRef.current / total) * 100) : 0;
  }, [score, phase, wave]);

  const stats = useMemo(() => [
    { label: 'Wave', value: `${wave}/${WAVE_TARGET}` },
    { label: 'Score', value: score },
    { label: 'Wall', value: `${'🧱'.repeat(wall)}${wall === 0 ? '0' : ''}` },
    { label: 'Combo', value: streak > 1 ? `x${streak}` : '—' },
  ], [score, streak, wall, wave]);

  const finish = useCallback((resultPhase) => {
    ProgressSystem.saveGame('conjugation-castle', {
      score: scoreRef.current,
      streak: streakRef.current,
      accuracy: (() => {
        const total = correctRef.current + missRef.current;
        return total ? Math.round((correctRef.current / total) * 100) : 0;
      })(),
    });
    setBestScore(current => Math.max(current, scoreRef.current));
    setPhase(resultPhase);
    AudioManager.gameOver();
  }, []);

  const loadWave = useCallback((nextWave) => {
    const nextQuestion = deckRef.current[nextWave - 1];
    if (!nextQuestion) {
      setMessage('The castle stands strong!');
      setPhase('won');
      ProgressSystem.saveGame('conjugation-castle', {
        score: scoreRef.current,
        streak: streakRef.current,
        accuracy: (() => {
          const total = correctRef.current + missRef.current;
          return total ? Math.round((correctRef.current / total) * 100) : 0;
        })(),
      });
      setBestScore(current => Math.max(current, scoreRef.current));
      AudioManager.levelUp();
      return;
    }

    setWave(nextWave);
    setQuestion(nextQuestion);
    setTimeLeft(ROUND_TIME);
  }, []);

  const advance = useCallback((wasCorrect) => {
    const nextWave = wave + 1;
    if (wasCorrect) {
      loadWave(nextWave);
      return;
    }

    if (wall <= 1) {
      setWall(0);
      finish('lost');
      return;
    }

    setWall(current => current - 1);
    loadWave(nextWave);
  }, [finish, loadWave, wall, wave]);

  const startGame = useCallback(() => {
    deckRef.current = buildDeck();
    correctRef.current = 0;
    missRef.current = 0;
    scoreRef.current = 0;
    streakRef.current = 0;
    setPhase('playing');
    setWave(1);
    setWall(WALL_MAX);
    setStreak(0);
    setScore(0);
    setTimeLeft(ROUND_TIME);
    setMessage('Choose quickly — each wave hits harder.');
    setQuestion(deckRef.current[0]);
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft(value => {
        if (value <= 0.1) {
          missRef.current += 1;
          streakRef.current = 0;
          setStreak(0);
          setMessage(`Too slow — ${question.subject} ${question.infinitive} = ${question.answer}`);
          AudioManager.wrong();
          advance(false);
          return ROUND_TIME;
        }
        return Math.max(0, value - 0.1);
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [advance, phase, question]);

  function handleChoice(option) {
    if (phase !== 'playing') return;

    if (option === question.answer) {
      correctRef.current += 1;
      streakRef.current += 1;
      const points = 120 + Math.round(timeLeft * 16) + Math.max(0, streakRef.current - 1) * 22;
      scoreRef.current += points;
      setScore(scoreRef.current);
      setStreak(streakRef.current);
      setMessage(`Perfect defense — ${question.subject} ${option}`);
      AudioManager.correct();
      advance(true);
    } else {
      missRef.current += 1;
      streakRef.current = 0;
      setStreak(0);
      setMessage(`Wrong gate — ${question.subject} ${question.infinitive} should be ${question.answer}`);
      AudioManager.wrong();
      advance(false);
    }
  }

  return (
    <ArcadeGameShell
      title="Conjugation Castle"
      subtitle="Hold the wall through 12 attack waves by selecting the right verb form before each enemy reaches the gate."
      eyebrow="Verb-form defense"
      accent="#ec4899"
      stats={stats}
      aside={
        <div className="castle-side">
          <h2>Defense brief</h2>
          <ul>
            <li>Each wave is one subject + verb challenge.</li>
            <li>Correct answers boost combo and score.</li>
            <li>Misses crack the wall. Lose all 4 bricks and the run ends.</li>
          </ul>
          <div className="castle-side__pill">Accuracy: {accuracy}%</div>
          <div className="castle-side__pill">Best score: {bestScore.toLocaleString()}</div>
        </div>
      }
      footer={<p>Strong on desktop, big tap targets on mobile, and quick enough for repeat grammar reps.</p>}
    >
      <div className="castle-board">
        <div className="castle-board__skyline" />

        {phase !== 'playing' && (
          <div className="castle-overlay">
            <div className="castle-overlay__card">
              <div className="castle-overlay__emoji">🏰</div>
              <h2>{phase === 'won' ? 'Castle saved' : phase === 'lost' ? 'The gate fell' : 'Ready the defenses'}</h2>
              <p>
                {phase === 'won'
                  ? `You cleared all ${WAVE_TARGET} waves with ${score.toLocaleString()} points.`
                  : phase === 'lost'
                    ? `You reached wave ${wave} and finished with ${score.toLocaleString()} points.`
                    : 'Pick the correct conjugation before each enemy reaches the wall.'}
              </p>
              {(phase === 'won' || phase === 'lost') && score >= bestScore && score > 0 && (
                <strong className="castle-overlay__badge">🏆 New castle record</strong>
              )}
              <button className="arcade-btn arcade-btn--full" onClick={startGame}>
                {phase === 'idle' ? '▶ Start defense' : '▶ Run it back'}
              </button>
            </div>
          </div>
        )}

        <div className="castle-panel">
          <div className="castle-panel__copy">
            <span className="castle-panel__label">Incoming wave</span>
            <h2>{question.cue}</h2>
            <p>{question.tense} · choose the form that matches the subject.</p>
          </div>
          <div className="castle-panel__subject">
            <span>{question.subject}</span>
            <strong>{question.infinitive}</strong>
          </div>
        </div>

        <div className="castle-timer">
          <div className="castle-timer__rail">
            <div className="castle-timer__fill" style={{ width: `${(timeLeft / ROUND_TIME) * 100}%` }} />
          </div>
          <span>{timeLeft.toFixed(1)}s</span>
        </div>

        <div className="castle-message">{message}</div>

        <div className="castle-choices">
          {question.options.map(option => (
            <button
              key={option}
              className="castle-choice"
              disabled={phase !== 'playing'}
              onClick={() => handleChoice(option)}
            >
              <span className="castle-choice__eyebrow">Choose the form</span>
              <strong>{option}</strong>
            </button>
          ))}
        </div>
      </div>
    </ArcadeGameShell>
  );
}
