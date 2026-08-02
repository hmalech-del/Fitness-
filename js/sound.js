/* =====================================================================
 * FitPlan – Ansagen & Klänge
 *
 * Sprachansagen: Web Speech API (speechSynthesis, Deutsch).
 *
 * Signaltöne: werden zur Laufzeit als kleine WAV-Klänge synthetisiert
 * und über <audio>-Elemente abgespielt. Wichtig: <audio> nutzt den
 * MEDIEN-Kanal des Geräts (wie Musik) – der ist auf iPhones auch bei
 * aktiviertem Stumm-Schalter hörbar, während Web-Audio-Töne dort
 * stummgeschaltet werden. Web Audio dient nur noch als Fallback, falls
 * das Abspielen der <audio>-Elemente scheitert (z. B. durch eine CSP).
 *
 * Alle Aufrufe sind abgesichert: Fehlt eine API oder ist der Ton aus,
 * passiert einfach nichts.
 * ===================================================================== */

(function (global) {
  'use strict';

  let enabled = true;
  let ctx = null;
  let primed = false;

  // ------------------------------------------------------------------
  // WAV-Synthese: Tonfolgen als data:-URI (16-bit mono, 22050 Hz)
  // segments: [{ freq, dur, at?, vol?, type? }]
  // ------------------------------------------------------------------
  function buildWav(segments) {
    const rate = 22050;
    let total = 0;
    segments.forEach((s) => { total = Math.max(total, (s.at || 0) + s.dur); });
    const n = Math.ceil((total + 0.03) * rate);
    const data = new Float32Array(n);

    segments.forEach((s) => {
      const start = Math.floor((s.at || 0) * rate);
      const len = Math.floor(s.dur * rate);
      for (let i = 0; i < len; i++) {
        const t = i / rate;
        // kurzer Attack, weiches Ausklingen
        const env = Math.min(1, i / (0.004 * rate)) * Math.pow(1 - i / len, 1.5);
        let v = Math.sin(2 * Math.PI * s.freq * t);
        if (s.type === 'square') v = Math.sign(v) * 0.55;
        data[start + i] += v * (s.vol || 0.6) * env;
      }
    });

    const buf = new ArrayBuffer(44 + n * 2);
    const dv = new DataView(buf);
    const wstr = (o, str) => { for (let i = 0; i < str.length; i++) dv.setUint8(o + i, str.charCodeAt(i)); };
    wstr(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); wstr(8, 'WAVE');
    wstr(12, 'fmt '); dv.setUint32(16, 16, true);
    dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true);
    dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
    wstr(36, 'data'); dv.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) {
      const v = Math.max(-1, Math.min(1, data[i]));
      dv.setInt16(44 + i * 2, v * 32767, true);
    }

    let bin = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 8192) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    }
    return 'data:audio/wav;base64,' + btoa(bin);
  }

  const SOUND_DEFS = {
    tick: [{ freq: 880, dur: 0.12, type: 'square', vol: 0.5 }],
    start: [{ freq: 660, dur: 0.12 }, { freq: 990, at: 0.14, dur: 0.2 }],
    finish: [{ freq: 784, dur: 0.15 }, { freq: 988, at: 0.16, dur: 0.15 }, { freq: 1319, at: 0.32, dur: 0.4 }],
  };

  const players = {};
  function buildPlayers() {
    if (players.tick) return;
    try {
      for (const name in SOUND_DEFS) {
        const a = new Audio(buildWav(SOUND_DEFS[name]));
        a.preload = 'auto';
        players[name] = a;
      }
    } catch { /* kein <audio> verfügbar – Fallback greift */ }
  }

  // ------------------------------------------------------------------
  // Web-Audio-Fallback
  // ------------------------------------------------------------------
  function ensureCtx() {
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch {
      return null;
    }
  }

  function oscillatorPlay(name) {
    const c = ensureCtx();
    if (!c) return;
    SOUND_DEFS[name].forEach((s) => {
      const t = c.currentTime + (s.at || 0);
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = s.type || 'sine';
      osc.frequency.value = s.freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime((s.vol || 0.6) * 0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + s.dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t);
      osc.stop(t + s.dur + 0.05);
    });
  }

  // ------------------------------------------------------------------
  // Abspielen & Freischalten
  // ------------------------------------------------------------------
  function play(name) {
    if (!enabled) return;
    const el = players[name];
    if (el) {
      try {
        el.currentTime = 0;
        const p = el.play();
        if (p && p.catch) p.catch(() => oscillatorPlay(name));
        return;
      } catch { /* weiter zum Fallback */ }
    }
    oscillatorPlay(name);
  }

  // Browser erlauben Audio erst nach einer Nutzer-Interaktion. unlock()
  // spielt deshalb jedes Element einmal stumm an ("Priming") – danach
  // dürfen die Töne auch aus Timern heraus abgespielt werden.
  function unlock() {
    buildPlayers();
    ensureCtx();
    if (primed) return;
    primed = true;
    for (const name in players) {
      const el = players[name];
      try {
        el.muted = true;
        const p = el.play();
        if (p && p.then) {
          p.then(() => { el.pause(); el.currentTime = 0; el.muted = false; })
            .catch(() => { el.muted = false; primed = false; });
        } else {
          el.pause(); el.currentTime = 0; el.muted = false;
        }
      } catch { el.muted = false; }
    }
  }

  // Jede Berührung/Klick schaltet Audio frei bzw. weckt den Kontext auf
  try {
    document.addEventListener('pointerdown', () => { if (enabled) unlock(); }, true);
  } catch { /* egal */ }

  // ------------------------------------------------------------------
  // Sprachansagen
  // ------------------------------------------------------------------
  // ------------------------------------------------------------------
  // Stimmenauswahl
  // Welche Stimmen zur Verfügung stehen, bestimmt das Gerät – Android,
  // iOS und Desktop bringen jeweils eigene mit. Wir listen die deutschen
  // auf und merken uns die Wahl.
  // ------------------------------------------------------------------
  let voiceURI = null;
  let rate = 1.05;
  const voiceListeners = [];

  function allVoices() {
    try { return window.speechSynthesis.getVoices() || []; } catch { return []; }
  }

  // Android meldet teils "de_DE" statt "de-DE"
  function germanVoices() {
    return allVoices().filter((v) => /^de([-_]|$)/i.test(v.lang || ''));
  }

  function pickVoice() {
    const chosen = allVoices().find((v) => v.voiceURI === voiceURI);
    if (chosen) return chosen;
    const list = germanVoices();
    if (!list.length) return null;
    return list.find((v) => v.default) || list[0];
  }

  function notifyVoices() {
    voiceListeners.forEach((fn) => {
      try { fn(); } catch { /* Panel evtl. nicht offen */ }
    });
  }

  try {
    // Auf manchen Geräten stehen die Stimmen erst verzögert bereit
    window.speechSynthesis.onvoiceschanged = notifyVoices;
  } catch { /* keine Sprachausgabe */ }

  // iOS füllt die Stimmenliste teils erst nach der ersten Nutzung der
  // Sprachausgabe – deshalb mehrfach nachfassen, statt einmalig zu lesen.
  function refreshVoices() {
    let tries = 0;
    const tick = () => {
      tries++;
      notifyVoices();
      if (tries < 5) setTimeout(tick, tries * 350);
    };
    tick();
  }

  function speak(text) {
    if (!enabled) return;
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE';
      u.rate = rate;
      const v = pickVoice();
      // Eigener Schutz: Schlägt das Setzen der Stimme fehl, soll trotzdem
      // mit der Systemstimme angesagt werden – die Ansage ist wichtiger
      // als die Stimmwahl.
      if (v) {
        try { u.voice = v; u.lang = v.lang; } catch { /* Systemstimme nutzen */ }
      }
      window.speechSynthesis.speak(u);
    } catch { /* Sprachausgabe nicht verfügbar */ }
  }

  // Laufende Ansage abbrechen (z. B. beim Verlassen des Workouts)
  function stop() {
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch { /* egal */ }
  }

  function setEnabled(on) {
    enabled = on;
    if (!on) stop();
  }

  global.FitSound = {
    speak, stop, setEnabled, unlock,
    isEnabled: () => enabled,
    // Stimmen: verfügbare deutsche Stimmen des Geräts, Auswahl und Tempo
    getVoices: germanVoices,
    getAllVoices: allVoices,
    refreshVoices,
    getVoice: () => voiceURI,
    setVoice: (uri) => { voiceURI = uri; },
    getRate: () => rate,
    setRate: (r) => { rate = r; },
    onVoicesChanged: (fn) => voiceListeners.push(fn),
    tick: () => play('tick'),
    start: () => play('start'),
    finish: () => play('finish'),
  };
})(window);
