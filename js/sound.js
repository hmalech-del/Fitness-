/* =====================================================================
 * FitPlan – Ansagen & Klänge
 * Sprachansagen über die Web Speech API (speechSynthesis, Deutsch)
 * und synthetisierte Signaltöne über die Web Audio API – beides ohne
 * Audiodateien. Alle Aufrufe sind abgesichert: Fehlt eine API (oder ist
 * der Ton aus), passiert einfach nichts.
 * ===================================================================== */

(function (global) {
  'use strict';

  let ctx = null;
  let enabled = true;

  // AudioContext darf erst nach einer Nutzer-Interaktion starten –
  // unlock() wird deshalb beim Klick auf "Workout starten" aufgerufen.
  function ensureCtx() {
    if (!enabled) return null;
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch {
      return null;
    }
  }

  function tone(freq, startIn, dur, vol, type) {
    const c = ensureCtx();
    if (!c) return;
    const t = c.currentTime + startIn;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // Countdown-Tick (letzte Sekunden)
  function tick() { tone(880, 0, 0.12, 0.1, 'square'); }
  // Start eines Satzes / einer Übung
  function start() { tone(660, 0, 0.12); tone(990, 0.14, 0.2); }
  // Intervall bzw. Workout beendet
  function finish() { tone(784, 0, 0.15); tone(988, 0.16, 0.15); tone(1319, 0.32, 0.35); }

  function speak(text) {
    if (!enabled) return;
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE';
      u.rate = 1.05;
      window.speechSynthesis.speak(u);
    } catch { /* Sprachausgabe nicht verfügbar */ }
  }

  function setEnabled(on) {
    enabled = on;
    if (!on) {
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch { /* egal */ }
    }
  }

  // Laufende Ansage abbrechen (z. B. beim Verlassen des Workouts)
  function stop() {
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch { /* egal */ }
  }

  global.FitSound = {
    speak, tick, start, finish, setEnabled, stop,
    isEnabled: () => enabled,
    unlock: ensureCtx,
  };
})(window);
