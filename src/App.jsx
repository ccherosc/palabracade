import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainMenu from './components/MainMenu.jsx';

const SnakeSentences = lazy(() => import('./games/snake-sentences/SnakeSentences.jsx'));
const WordWhack = lazy(() => import('./games/word-whack/WordWhack.jsx'));
const Conexiones = lazy(() => import('./games/conexiones/Conexiones.jsx'));
const MemoryMercado = lazy(() => import('./games/memory-mercado/MemoryMercado.jsx'));
const Ahorcado = lazy(() => import('./games/ahorcado/Ahorcado.jsx'));
const VerbRunner = lazy(() => import('./games/verb-runner/VerbRunner.jsx'));
const PalabraInvaders = lazy(() => import('./games/palabra-invaders/PalabraInvaders.jsx'));
const FlappyVocab = lazy(() => import('./games/flappy-vocab/FlappyVocab.jsx'));
const ConjugationCastle = lazy(() => import('./games/conjugation-castle/ConjugationCastle.jsx'));
const RadarRelay = lazy(() => import('./games/radar-relay/RadarRelay.jsx'));
const PhraseForge = lazy(() => import('./games/phrase-forge/PhraseForge.jsx'));

function GameLoader() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexDirection: 'column', gap: '1rem',
      color: 'var(--text-muted)',
    }}>
      <div style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }}>⚙</div>
      <span style={{ fontFamily: 'var(--font-arcade)', fontSize: '0.65rem' }}>Loading game...</span>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<GameLoader />}>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/games/snake-sentences" element={<SnakeSentences />} />
        <Route path="/games/word-whack" element={<WordWhack />} />
        <Route path="/games/conexiones" element={<Conexiones />} />
        <Route path="/games/memory-mercado" element={<MemoryMercado />} />
        <Route path="/games/ahorcado" element={<Ahorcado />} />
        <Route path="/games/verb-runner" element={<VerbRunner />} />
        <Route path="/games/palabra-invaders" element={<PalabraInvaders />} />
        <Route path="/games/flappy-vocab" element={<FlappyVocab />} />
        <Route path="/games/conjugation-castle" element={<ConjugationCastle />} />
        <Route path="/games/radar-relay" element={<RadarRelay />} />
        <Route path="/games/phrase-forge" element={<PhraseForge />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
