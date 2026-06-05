import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ArcadeGameShell from '../../components/ArcadeGameShell.jsx';
import { AudioManager } from '../../engine/AudioManager.js';
import { ProgressSystem } from '../../engine/ProgressSystem.js';
import { shuffle } from '../../engine/WordBank.js';
import './RadarRelay.css';

const WORDS = [
  { en: 'dog', es: 'perro', category: 'animals' },
  { en: 'cat', es: 'gato', category: 'animals' },
  { en: 'bird', es: 'pájaro', category: 'animals' },
  { en: 'horse', es: 'caballo', category: 'animals' },
  { en: 'apple', es: 'manzana', category: 'food' },
  { en: 'bread', es: 'pan', category: 'food' },
  { en: 'milk', es: 'leche', category: 'food' },
  { en: 'water', es: 'agua', category: 'food' },
  { en: 'book', es: 'libro', category: 'school' },
  { en: 'pencil', es: 'lápiz', category: 'school' },
  { en: 'chair', es: 'silla', category: 'school' },
  { en: 'window', es: 'ventana', category: 'home' },
  { en: 'house', es: 'casa', category: 'home' },
  { en: 'door', es: 'puerta', category: 'home' },
  { en: 'moon', es: 'luna', category: 'nature' },
  { en: 'sun', es: 'sol', category: 'nature' },
  { en: 'tree', es: 'árbol', category: 'nature' },
  { en: 'flower', es: 'flor', category: 'nature' },
  { en: 'friend', es: 'amigo', category: 'people' },
  { en: 'school', es: 'escuela', category: 'places' },
];

const SESSION_TIME = 60;
const ROUND_TIME = 7;
const MAX_SHIELDS = 3;

function buildQuestion(lastAnswer) {
  const pool = WORDS.filter(word => word.es !== lastAnswer);
  const answer = pool[Math.floor(Math.random() * pool.length)];
  const distractors = shuffle(WORDS.filter(word => word.es !== answer.es))
    .slice(0, 3)
    .map(word => word.es);

  return {
    answer,
    options: shuffle([answer.es, ...distractors]),
  };
}

export default function RadarRelay() {
  const previousAnswerRef = useRef(null);
  const highScore = ProgressSystem.getGame('radar-relay').highScore;
  const [phase, setPhase] = useState('idle');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [shields, setShields] = useState(MAX_SHIELDS);
  const [signals, setSignals] = useState(0);
  const [sessionLeft, setSessionLeft] = useState(SESSION_TIME);
  const [roundLeft, setRoundLeft] = useState(ROUND_TIME);
  const [question, setQuestion] = useState(() => buildQuestion());
  const [feedback, setFeedback] = useState('');
  const [best, setBest] = useState(highScore);

  const stats = useMemo(() => [
    { label: 'Score', value: score },
    { label: 'Combo', value: streak > 1 ? `x${streak}` : '—' },
    { label: 'Signals', value: signals },
    { label: 'Shields', value: `${'🛡️'.repeat(shields)}${shields === 0 ? '0' : ''}` },
  ], [score, shields, signals, streak]);

  const nextQuestion = useCallback(() => {
    const next = buildQuestion(previousAnswerRef.current);
    previousAnswerRef.current = next.answer.es;
    setQuestion(next);
    setRoundLeft(ROUND_TIME);
  }, []);

  const finishRun = useCallback((finalScore, finalStreak, accuracy) => {
    ProgressSystem.saveGame('radar-relay', { score: finalScore, streak: finalStreak, accuracy });
    setBest(current => Math.max(current, finalScore));
    setPhase('done');
    AudioManager.gameOver();
  }, []);

  const startGame = useCallback(() => {
    correctRef.current = 0;
    missRef.current = 0;
    setScore(0);
    setStreak(0);
    setShields(MAX_SHIELDS);
    setSignals(0);
    setSessionLeft(SESSION_TIME);
    setFeedback('');
    setPhase('playing');
    nextQuestion();
  }, [nextQuestion]);

  useEffect(() => {
    if (phase !== 'playing') return undefined;

    const sessionTimer = window.setInterval(() => {
      setSessionLeft(value => {
        if (value <= 1) {
          window.clearInterval(sessionTimer);
          finishRun(scoreRef.current, streakRef.current, accuracyRef.current());
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(sessionTimer);
  }, [finishRun, phase]);

  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const correctRef = useRef(0);
  const missRef = useRef(0);
  const accuracyRef = useRef(() => 0);

  useEffect(() => {
    scoreRef.current = score;
    streakRef.current = streak;
    accuracyRef.current = () => {
      const total = correctRef.current + missRef.current;
      return total ? Math.round((correctRef.current / total) * 100) : 0;
    };
  }, [score, streak]);

  useEffect(() => {
    if (phase !== 'playing') return undefined;
    const roundTimer = window.setInterval(() => {
      setRoundLeft(value => {
        if (value <= 0.1) {
          missRef.current += 1;
          setFeedback(`Missed it — ${question.answer.en} = ${question.answer.es}`);
          setStreak(0);
          setShields(current => {
            const next = current - 1;
            if (next <= 0) {
              finishRun(scoreRef.current, 0, accuracyRef.current());
              return 0;
            }
            AudioManager.wrong();
            return next;
          });
          nextQuestion();
          return ROUND_TIME;
        }
        return Math.max(0, value - 0.1);
      });
    }, 100);

    return () => window.clearInterval(roundTimer);
  }, [finishRun, nextQuestion, phase, question]);

  function handlePick(option) {
    if (phase !== 'playing') return;
    if (option === question.answer.es) {
      correctRef.current += 1;
      const roundBonus = Math.round(roundLeft * 14);
      const nextStreak = streakRef.current + 1;
      const points = 100 + roundBonus + Math.max(0, nextStreak - 1) * 18;
      AudioManager.correct();
      setFeedback(`Locked: ${question.answer.en} → ${question.answer.es}`);
      setSignals(value => value + 1);
      setStreak(nextStreak);
      setScore(value => value + points);
    } else {
      missRef.current += 1;
      AudioManager.wrong();
      setFeedback(`Wrong signal — ${question.answer.en} = ${question.answer.es}`);
      setStreak(0);
      setShields(current => {
        const next = current - 1;
        if (next <= 0) {
          finishRun(scoreRef.current, 0, accuracyRef.current());
          return 0;
        }
        return next;
      });
    }

    nextQuestion();
  }

  return (
    <ArcadeGameShell
      title="Radar Relay"
      subtitle="Track the English prompt, lock onto the right Spanish signal, and keep your relay alive before the sweep timer burns out."
      eyebrow="Fast translation recall"
      accent="#14b8a6"
      stats={stats}
      aside={
        <div className="radar-side">
          <h2>How to win</h2>
          <ul>
            <li>Each lock adds score and extends your combo value.</li>
            <li>You have 3 shields for bad picks or timeouts.</li>
            <li>Move fast — the sweep timer is part of the score.</li>
          </ul>
          <div className="radar-side__pill">Best run: {best.toLocaleString()} pts</div>
          <div className="radar-side__pill">Session timer: {sessionLeft}s</div>
        </div>
      }
      footer={<p>Built for one-thumb play: big targets, quick reads, instant retries.</p>}
    >
      <div className="radar-board">
        <div className="radar-board__top">
          <div>
            <span className="radar-board__label">Track this word</span>
            <h2 className="radar-board__prompt">{question.answer.en}</h2>
          </div>
          <div className="radar-board__timers">
            <div className="radar-meter">
              <span>Round</span>
              <div className="radar-meter__rail"><div className="radar-meter__fill" style={{ width: `${(roundLeft / ROUND_TIME) * 100}%` }} /></div>
            </div>
            <div className="radar-meter radar-meter--session">
              <span>Run</span>
              <div className="radar-meter__rail"><div className="radar-meter__fill" style={{ width: `${(sessionLeft / SESSION_TIME) * 100}%` }} /></div>
            </div>
          </div>
        </div>

        {phase !== 'playing' && (
          <div className="radar-overlay">
            <div className="radar-overlay__card">
              <div className="radar-overlay__emoji">📡</div>
              <h2>{phase === 'done' ? 'Run complete' : 'Ready to scan?'}</h2>
              <p>
                {phase === 'done'
                  ? `You locked ${signals} signals and finished with ${score.toLocaleString()} points.`
                  : 'Choose the correct Spanish translation before the radar sweep expires.'}
              </p>
              {phase === 'done' && score >= best && score > 0 && <strong className="radar-overlay__badge">🏆 New best signal chain</strong>}
              <button className="arcade-btn arcade-btn--cyan arcade-btn--full" onClick={startGame}>
                {phase === 'done' ? '▶ Play again' : '▶ Start relay'}
              </button>
            </div>
          </div>
        )}

        <div className={`radar-feedback ${feedback ? 'radar-feedback--live' : ''}`}>{feedback || 'Choose the Spanish match.'}</div>

        <div className="radar-options">
          {question.options.map(option => (
            <button
              key={option}
              className="radar-option"
              disabled={phase !== 'playing'}
              onClick={() => handlePick(option)}
            >
              <span className="radar-option__eyebrow">Spanish signal</span>
              <strong>{option}</strong>
            </button>
          ))}
        </div>
      </div>
    </ArcadeGameShell>
  );
}
