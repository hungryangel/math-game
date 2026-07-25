/* =========================================================
   fx.js — 효과음(WebAudio 합성) & 색종이 효과
   ========================================================= */
(function (global) {
  'use strict';

  let ctx = null;
  let enabled = localStorage.getItem('mg_sound') !== 'off';

  function ac() {
    if (!ctx) { const C = global.AudioContext || global.webkitAudioContext; if (C) ctx = new C(); }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, type = 'sine', vol = 0.18) {
    const a = ac(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    const t0 = a.currentTime + start;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  const SFX = {
    tap:     () => tone(520, 0, 0.09, 'triangle', 0.12),
    move:    () => { tone(400, 0, 0.12, 'triangle', 0.12); tone(600, 0.06, 0.12, 'triangle', 0.09); },
    correct: () => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.08, 0.3, 'sine', 0.16)); },
    wrong:   () => { tone(220, 0, 0.18, 'sawtooth', 0.1); tone(165, 0.12, 0.24, 'sawtooth', 0.09); },
    star:    () => { [784, 988, 1319].forEach((f, i) => tone(f, i * 0.12, 0.45, 'triangle', 0.14)); },
    clear:   () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.11, 0.5, 'sine', 0.15)); }
  };

  const Sound = {
    play(name) { if (enabled && SFX[name]) { try { SFX[name](); } catch (e) {} } },
    toggle() { enabled = !enabled; localStorage.setItem('mg_sound', enabled ? 'on' : 'off'); return enabled; },
    get on() { return enabled; }
  };

  /* ---------- 색종이 ---------- */
  const COLORS = ['#ff5d73', '#ffd166', '#06d6a0', '#4cc9f0', '#b892ff', '#ff9f68'];

  function confetti(count = 70) {
    const layer = document.getElementById('confetti-layer');
    if (!layer) return;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('i');
      p.className = 'confetti';
      const size = 7 + Math.random() * 9;
      p.style.cssText =
        `left:${Math.random() * 100}%;` +
        `width:${size}px;height:${size * (0.5 + Math.random())}px;` +
        `background:${COLORS[i % COLORS.length]};` +
        `border-radius:${Math.random() > 0.6 ? '50%' : '2px'};` +
        `animation-duration:${1.6 + Math.random() * 1.4}s;` +
        `animation-delay:${Math.random() * 0.35}s;` +
        `--spin:${(Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540)}deg;` +
        `--drift:${(Math.random() - 0.5) * 180}px;`;
      layer.appendChild(p);
      setTimeout(() => p.remove(), 3400);
    }
  }

  global.FX = { Sound, confetti };
})(window);
