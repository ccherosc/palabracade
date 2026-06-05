// Web Audio synthesis engine — full design pass.
// All sounds are synthesized in real-time; no external files needed.

let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// Single oscillator tone with optional frequency glide and vibrato
function tone(ac, { freq = 440, type = 'sine', vol = 0.2, t = 0, dur = 0.15, freqEnd = null, vibHz = 0, vibDepth = 0 }) {
  const osc  = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = type;
  const now = ac.currentTime;
  osc.frequency.setValueAtTime(freq, now + t);
  if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(freqEnd, now + t + dur);
  if (vibHz > 0 && vibDepth > 0) {
    const lfo     = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.frequency.value = vibHz;
    lfoGain.gain.value  = vibDepth;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(now + t);
    lfo.stop(now + t + dur + 0.02);
  }
  gain.gain.setValueAtTime(0.001, now + t);
  gain.gain.linearRampToValueAtTime(vol, now + t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.001, now + t + dur);
  osc.start(now + t);
  osc.stop(now + t + dur + 0.02);
}

// White-noise burst with fast exponential decay
function noiseBurst(ac, { vol = 0.08, t = 0, dur = 0.04 }) {
  const size = Math.ceil(ac.sampleRate * dur);
  const buf  = ac.createBuffer(1, size, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  const src  = ac.createBufferSource();
  const gain = ac.createGain();
  src.buffer = buf;
  src.connect(gain);
  gain.connect(ac.destination);
  const now = ac.currentTime;
  gain.gain.setValueAtTime(vol, now + t);
  gain.gain.exponentialRampToValueAtTime(0.001, now + t + dur);
  src.start(now + t);
  src.stop(now + t + dur + 0.02);
}

export const AudioManager = {

  // Harmonic "crunch-pop" — escalates pitch and harmonics with streak level
  eat(streak = 1) {
    try {
      const ac    = getCtx();
      const boost = streak >= 6 ? 1.20 : streak >= 3 ? 1.10 : 1;
      tone(ac, { freq: 640 * boost, freqEnd: 820 * boost, type: 'sine', vol: 0.22, t: 0,    dur: 0.10 });
      tone(ac, { freq: 1280 * boost,                      type: 'sine', vol: 0.09, t: 0.01, dur: 0.07 });
      if (streak >= 3) tone(ac, { freq: 1920 * boost, type: 'sine', vol: 0.05, t: 0.02, dur: 0.06 });
      if (streak >= 6) tone(ac, { freq: 2560 * boost, type: 'sine', vol: 0.03, t: 0.03, dur: 0.05 });
      noiseBurst(ac, { vol: 0.05, t: 0, dur: 0.03 });
    } catch {}
  },

  // Bright ascending two-note chime (currently unused by game directly)
  correct() {
    try {
      const ac = getCtx();
      tone(ac, { freq: 880,  type: 'sine', vol: 0.18, t: 0,    dur: 0.10 });
      tone(ac, { freq: 1108, type: 'sine', vol: 0.14, t: 0.09, dur: 0.09 });
    } catch {}
  },

  // Harsh descending dual-osc buzz for collisions and wrong choices
  wrong() {
    try {
      const ac = getCtx();
      tone(ac, { freq: 200, freqEnd: 100, type: 'sawtooth', vol: 0.20, t: 0, dur: 0.24 });
      tone(ac, { freq: 160, freqEnd:  90, type: 'square',   vol: 0.08, t: 0, dur: 0.20 });
      noiseBurst(ac, { vol: 0.07, t: 0, dur: 0.05 });
    } catch {}
  },

  // Triumphant C major arpeggio + high sparkle tail
  levelUp() {
    try {
      const ac    = getCtx();
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) =>
        tone(ac, { freq: f, type: 'sine', vol: 0.20, t: i * 0.10, dur: i === 3 ? 0.22 : 0.13 })
      );
      tone(ac, { freq: 2093, type: 'sine', vol: 0.10, t: 0.44, dur: 0.16 });
      tone(ac, { freq: 2637, type: 'sine', vol: 0.07, t: 0.52, dur: 0.12 });
    } catch {}
  },

  // Descending sawtooth melody; vibrato wobble on the final note
  gameOver() {
    try {
      const ac    = getCtx();
      const notes = [392, 349, 294, 220];
      notes.forEach((f, i) =>
        tone(ac, {
          freq: f, type: 'sawtooth', vol: 0.18, t: i * 0.15, dur: 0.18,
          vibHz:   i === notes.length - 1 ? 5  : 0,
          vibDepth: i === notes.length - 1 ? 10 : 0,
        })
      );
    } catch {}
  },

  // Crisp micro-click for UI interactions
  click() {
    try {
      const ac = getCtx();
      tone(ac, { freq: 900, freqEnd: 650, type: 'sine', vol: 0.09, t: 0, dur: 0.04 });
    } catch {}
  },

  // Low "lub-dub" heartbeat — played on interval when hearts === 1
  heartbeat() {
    try {
      const ac = getCtx();
      tone(ac, { freq: 75, freqEnd: 50, type: 'sine', vol: 0.28, t: 0,    dur: 0.13 });
      tone(ac, { freq: 60, freqEnd: 42, type: 'sine', vol: 0.20, t: 0.19, dur: 0.10 });
    } catch {}
  },
};
