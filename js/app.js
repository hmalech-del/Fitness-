/* =====================================================================
 * FitPlan – App-Logik: Wizard, Pläne, Einzel-Workouts, Workout-Player
 * ===================================================================== */

(function () {
  'use strict';

  const STORAGE_PLANS = 'fitplan.plans';
  const STORAGE_ACTIVE = 'fitplan.active';
  const STORAGE_STATS = 'fitplan.stats';
  const STORAGE_SOUND = 'fitplan.sound';
  const STORAGE_SPEAKDESC = 'fitplan.speakdesc';
  const STORAGE_THEME = 'fitplan.theme';
  const STORAGE_VOICE = 'fitplan.voice';
  const STORAGE_RATE = 'fitplan.rate';
  const STORAGE_PROG = 'fitplan.prog';

  // ------------------------------------------------------------------
  // Progression nach dem Modell der doppelten Progression:
  // Zuerst innerhalb des Wiederholungsbereichs steigern (8 → 12), erst
  // dann die Last erhöhen und wieder am unteren Ende beginnen. Bei
  // Halteübungen wächst die Zeit, bei Eigengewicht ohne Steigerungs-
  // möglichkeit wechselt die App auf die schwerere Variante.
  //
  // Wie schnell automatisch gesteigert wird, hängt vom Trainingsstand ab:
  // Einsteiger können praktisch jede Einheit zulegen, Fortgeschrittene
  // brauchen mehrere Einheiten pro Schritt.
  // ------------------------------------------------------------------
  const PROG_SESSIONS = { anfaenger: 1, mittel: 2, profi: 3 };
  const TIME_FACTOR = 1.6; // so weit dürfen Haltezeiten wachsen
  const SWITCH_SEC = FitPlanner.SIDE_SWITCH_SEC; // Umbaupause zwischen den Seiten

  function progOf(exId) {
    return state.prog[exId] || { step: 0, done: 0, cycle: 0 };
  }

  function setProg(exId, pr) {
    state.prog[exId] = pr;
    saveJSON(STORAGE_PROG, state.prog);
  }

  // Heutige Vorgabe aus Basis-Item und Fortschritt
  function targetFor(item) {
    const pr = progOf(item.exId);
    if (item.reps) {
      const [lo, hi] = String(item.reps).split('–').map(Number);
      const span = Math.max(0, (hi || lo) - lo);
      const step = Math.min(pr.step, span);
      return { kind: 'reps', value: lo + step, lo, hi: hi || lo, atTop: step >= span, cycle: pr.cycle };
    }
    const max = Math.round(item.seconds * TIME_FACTOR / 5) * 5;
    const value = Math.min(item.seconds + pr.step * 5, max);
    return { kind: 'time', value, base: item.seconds, atTop: value >= max, cycle: pr.cycle };
  }

  // Hinweis, wie es weitergeht, wenn das obere Ende erreicht ist
  function progressHint(exId) {
    const ex = EXERCISE_BY_ID[exId];
    if (ex.equipment === 'kurzhanteln') return 'Schaffst du das sauber? Dann nächstes Mal schwerere Hanteln.';
    if (ex.equipment === 'band') return 'Schaffst du das sauber? Dann ein stärkeres Band nehmen.';
    if (ex.harder) return `Schaffst du das sauber? Dann auf ${EXERCISE_BY_ID[ex.harder].name} wechseln.`;
    return 'Schaffst du das sauber? Dann langsamer ausführen – etwa 3 Sekunden absenken.';
  }

  const MAX_CYCLE_STEP = 2;

  function shiftProgress(exId, delta) {
    const pr = Object.assign({}, progOf(exId));
    const ex = EXERCISE_BY_ID[exId];
    // Spanne des Wiederholungsbereichs bestimmt, wann die Last steigt
    const base = state.baseItems[exId];
    let span = 4;
    if (base && base.reps) {
      const [lo, hi] = String(base.reps).split('–').map(Number);
      span = Math.max(0, (hi || lo) - lo);
    } else if (base) {
      span = Math.round(base.seconds * (TIME_FACTOR - 1) / 5);
    }

    pr.step += delta;
    pr.done = 0;
    while (pr.step > span) {
      // Oberes Ende überschritten: Last erhöhen bzw. Variante wechseln
      if (pr.cycle >= MAX_CYCLE_STEP && ex.harder) {
        // Statt endlos zu steigern lieber die schwerere Variante empfehlen
        pr.cycle = 0;
        pr.step = 0;
        break;
      }
      pr.cycle += 1;
      pr.step -= span + 1;
    }
    if (pr.step < 0) {
      if (pr.cycle > 0) { pr.cycle -= 1; pr.step = span; } else pr.step = 0;
    }
    setProg(exId, pr);
  }

  // Nach einer Einheit: automatische Steigerung, wenn genug Einheiten
  // auf der aktuellen Stufe absolviert wurden
  function advanceProgress(exIds) {
    const needed = PROG_SESSIONS[state.plans.length && activePlan()
      ? activePlan().profile.level : 'mittel'] || 2;
    exIds.forEach((exId) => {
      const pr = Object.assign({}, progOf(exId));
      const t = targetFor(state.baseItems[exId] || { reps: '8–12' });
      pr.done += 1;
      // Am oberen Ende wartet die App auf die Rückmeldung, statt blind
      // weiterzusteigern – die Last erhöht man bewusst, nicht automatisch
      if (pr.done >= needed && !t.atTop) {
        pr.step += 1;
        pr.done = 0;
      }
      setProg(exId, pr);
    });
  }

  // Themes: "studio" (hell, Salbei/Creme), "loft" (Beton & Pflanzen)
  // und "neon" (dunkel, Cyberpunk-Gym). Der 🎨-Knopf schaltet der Reihe nach.
  const THEMES = {
    studio: { label: 'Studio', themeColor: '#f4efe6' },
    loft: { label: 'Loft', themeColor: '#ecebe7' },
    neon: { label: 'Neon', themeColor: '#0e1219' },
    iron: { label: 'Iron', themeColor: '#14161a' },
  };
  const THEME_ORDER = Object.keys(THEMES);

  const $ = (sel) => document.querySelector(sel);

  // LocalStorage kann in Sandbox-Umgebungen (z. B. eingebettete iframes)
  // blockiert sein – dann fällt die App auf einen In-Memory-Speicher zurück.
  const storage = (() => {
    try {
      const t = '__fitplan_test__';
      localStorage.setItem(t, t);
      localStorage.removeItem(t);
      return localStorage;
    } catch {
      const mem = {};
      return {
        getItem: (k) => (k in mem ? mem[k] : null),
        setItem: (k, v) => { mem[k] = String(v); },
        removeItem: (k) => { delete mem[k]; },
      };
    }
  })();

  function loadJSON(key) {
    try { return JSON.parse(storage.getItem(key)); } catch { return null; }
  }
  function saveJSON(key, value) {
    storage.setItem(key, JSON.stringify(value));
  }

  const state = {
    plans: [],
    activePlanId: null,
    stats: loadJSON(STORAGE_STATS) || { workouts: 0, minutes: 0 },
    wizardStep: 0,
    wizardData: {},
    wizardMode: 'new', // 'new' = neuen Plan anlegen, 'edit' = aktiven Plan ändern
    currentDayRef: null, // { type:'plan', planId, index, day } | { type:'quick', day }
    workout: null,
    soundOn: true,
    speakDescOn: true,
    theme: 'studio',
    prog: loadJSON(STORAGE_PROG) || {},
    baseItems: {}, // Basisvorgaben je Übung, für die Progressionsrechnung
  };

  // Basisvorgaben einer Einheit merken, damit die Progression weiß, wie
  // groß der Wiederholungsbereich ursprünglich war
  function rememberBase(day) {
    [...day.blocks.warmup, ...day.blocks.main, ...day.blocks.cooldown]
      .forEach((it) => { state.baseItems[it.exId] = it; });
  }

  function applyTheme(theme) {
    state.theme = THEMES[theme] ? theme : 'studio';
    if (state.theme === 'studio') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = state.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEMES[state.theme].themeColor);
    const btn = $('#btn-theme');
    if (btn) btn.title = `Design: ${THEMES[state.theme].label} – tippen zum Wechseln`;
    saveJSON(STORAGE_THEME, state.theme);
  }

  // ------------------------------------------------------------------
  // Stimmenauswahl: zeigt die deutschen Stimmen des jeweiligen Geräts
  // ------------------------------------------------------------------
  function voiceLabel(v) {
    const regions = { 'de-DE': '', 'de-AT': ' · Österreich', 'de-CH': ' · Schweiz' };
    const region = v.lang in regions ? regions[v.lang] : ` · ${v.lang}`;
    return v.name.replace(/^Microsoft |^Google /, '') + region;
  }

  let showAllVoices = false;

  function renderVoicePanel() {
    const german = FitSound.getVoices();
    const all = FitSound.getAllVoices();
    const others = all.filter((v) => !german.includes(v));
    const voices = showAllVoices ? german.concat(others) : german;
    const current = FitSound.getVoice();
    const list = $('#voice-list');

    const chips = voices.map((v) => `
      <button class="chip ${v.voiceURI === current || (!current && v.default && german.includes(v)) ? 'selected' : ''}"
              data-voice="${v.voiceURI}">${voiceLabel(v)}</button>`).join('');
    const toggle = others.length ? `
      <button class="chip chip-add" id="btn-all-voices">${showAllVoices
        ? '− nur deutsche Stimmen' : `＋ ${others.length} weitere Sprachen`}</button>` : '';
    list.innerHTML = chips + toggle;

    if (!german.length && !all.length) {
      $('#voice-hint').textContent = 'Dieses Gerät meldet der App noch keine Stimmen. '
        + 'Tippe einmal auf „Probe hören“ – danach steht die Liste meist bereit.';
    } else if (!german.length) {
      $('#voice-hint').textContent = 'Keine deutsche Stimme gefunden. Andere Sprachen sprechen '
        + 'deutsche Texte nur unsauber aus.';
    } else if (german.length === 1) {
      $('#voice-hint').innerHTML = 'Dieses Gerät gibt der App nur eine deutsche Stimme frei. '
        + '<strong>Auf dem iPhone</strong> stellt Safari Web-Apps nur die Standardstimmen bereit – '
        + 'Stimmen für „Live-Sprachausgabe“ oder „Gesprochene Inhalte“ bleiben iOS-Apps vorbehalten '
        + 'und tauchen hier nicht auf. <strong>Auf Android</strong> lassen sich unter Einstellungen → '
        + 'Sprachausgabe weitere Stimmen laden, die dann hier erscheinen.';
    } else {
      $('#voice-hint').textContent = `${german.length} deutsche Stimmen auf diesem Gerät verfügbar.`;
    }

    list.querySelectorAll('[data-voice]').forEach((chip) => {
      chip.addEventListener('click', () => {
        FitSound.setVoice(chip.dataset.voice);
        saveJSON(STORAGE_VOICE, chip.dataset.voice);
        renderVoicePanel();
        FitSound.speak('Kniebeugen. Drei Sätze mit zehn Wiederholungen.');
      });
    });
    const allBtn = $('#btn-all-voices');
    if (allBtn) {
      allBtn.addEventListener('click', () => { showAllVoices = !showAllVoices; renderVoicePanel(); });
    }

    const rate = FitSound.getRate();
    $('#rate-list').innerHTML = [
      [0.85, 'Langsam'], [1.05, 'Normal'], [1.25, 'Zügig'], [1.45, 'Schnell'],
    ].map(([r, label]) => `
      <button class="chip ${Math.abs(rate - r) < 0.01 ? 'selected' : ''}" data-rate="${r}">${label}</button>`).join('');
    $('#rate-list').querySelectorAll('[data-rate]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const r = parseFloat(chip.dataset.rate);
        FitSound.setRate(r);
        saveJSON(STORAGE_RATE, r);
        renderVoicePanel();
        FitSound.speak('Noch drei Sekunden. Weiter geht’s!');
      });
    });
  }

  function toggleVoicePanel() {
    const panel = $('#voice-panel');
    const wasHidden = panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    if (wasHidden) {
      FitSound.unlock();
      renderVoicePanel();
      // iOS meldet die Stimmen teils verzögert nach
      FitSound.refreshVoices();
    }
  }

  function toggleTheme() {
    const next = (THEME_ORDER.indexOf(state.theme) + 1) % THEME_ORDER.length;
    applyTheme(THEME_ORDER[next]);
  }

  // ------------------------------------------------------------------
  // Pläne: Laden, Speichern, Migration vom alten Einzelplan-Format
  // ------------------------------------------------------------------
  function planName(goal) {
    const base = FitPlanner.GOALS[goal].label;
    const names = state.plans.map((p) => p.name);
    let name = base;
    let i = 2;
    while (names.includes(name)) name = `${base} ${i++}`;
    return name;
  }

  function loadPlans() {
    let plans = loadJSON(STORAGE_PLANS);
    if (!Array.isArray(plans)) {
      plans = [];
      // Migration: altes Einzelplan-Format übernehmen
      const oldProfile = loadJSON('fitplan.profile');
      const oldPlan = loadJSON('fitplan.plan');
      if (oldProfile && oldPlan) {
        plans.push({
          id: 'p' + Date.now(),
          name: FitPlanner.GOALS[oldProfile.goal].label,
          profile: oldProfile,
          plan: oldPlan,
          progress: {},
        });
      }
    }
    state.plans = plans;
    const active = loadJSON(STORAGE_ACTIVE);
    state.activePlanId = plans.some((p) => p.id === active)
      ? active
      : (plans[0] ? plans[0].id : null);
  }

  function savePlans() {
    saveJSON(STORAGE_PLANS, state.plans);
    saveJSON(STORAGE_ACTIVE, state.activePlanId);
  }

  function activePlan() {
    return state.plans.find((p) => p.id === state.activePlanId) || null;
  }

  // ------------------------------------------------------------------
  // Navigation
  // ------------------------------------------------------------------
  const SCREENS = ['welcome', 'wizard', 'plan', 'day', 'workout', 'done'];
  function show(screen) {
    SCREENS.forEach((s) => $('#screen-' + s).classList.toggle('hidden', s !== screen));
    window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------------
  // Wizard
  // ------------------------------------------------------------------
  const WIZARD_STEPS = [
    {
      key: 'goal', title: 'Was ist dein Ziel?',
      sub: 'Dein Plan wird auf dieses Ziel zugeschnitten.',
      render(data) {
        return cardGrid([
          { value: 'muskelaufbau', emoji: '💪', label: 'Muskelaufbau', desc: 'Kraft und Muskeln aufbauen' },
          { value: 'abnehmen', emoji: '🔥', label: 'Abnehmen', desc: 'Kalorien verbrennen, Körper straffen' },
          { value: 'ausdauer', emoji: '🏃', label: 'Ausdauer', desc: 'Kondition und Herz-Kreislauf stärken' },
          { value: 'beweglichkeit', emoji: '🧘', label: 'Beweglichkeit', desc: 'Mobilität und Dehnung verbessern' },
          { value: 'ruecken', emoji: '🛡️', label: 'Rückenstärkung', desc: 'Rücken kräftigen, Haltung verbessern' },
          { value: 'haltung', emoji: '🧍', label: 'Aufrechte Haltung', desc: 'Nacken entlasten, Schultern öffnen, aufrecht werden' },
          { value: 'fitness', emoji: '⚡', label: 'Allgemeine Fitness', desc: 'Rundum fit und gesund bleiben' },
        ], data.goal, 'goal');
      },
      valid: (d) => !!d.goal,
    },
    {
      key: 'age', title: 'Wie alt bist du?',
      sub: 'Alter und Erfahrung bestimmen Intensität und Übungsauswahl.',
      render(data) {
        return `
          <div class="field">
            <label for="input-age">Alter</label>
            <div class="age-row">
              <input type="range" id="input-age" min="14" max="90" value="${data.age || 30}">
              <span class="age-value" id="age-value">${data.age || 30}</span>
            </div>
          </div>
          <div class="field">
            <label>Wie fit bist du aktuell?</label>
            ${cardGrid([
              { value: 'anfaenger', emoji: '🌱', label: 'Anfänger', desc: 'Wenig oder keine Trainingserfahrung' },
              { value: 'mittel', emoji: '🌿', label: 'Fortgeschritten', desc: 'Ich trainiere gelegentlich' },
              { value: 'profi', emoji: '🌳', label: 'Sehr erfahren', desc: 'Ich trainiere regelmäßig seit Jahren' },
            ], data.level, 'level')}
          </div>`;
      },
      mount(data) {
        const slider = $('#input-age');
        slider.addEventListener('input', () => {
          $('#age-value').textContent = slider.value;
          data.age = parseInt(slider.value, 10);
          updateWizardButtons();
        });
        data.age = data.age || 30;
      },
      valid: (d) => d.age && d.level,
    },
    {
      key: 'time', title: 'Wie viel Zeit hast du?',
      sub: 'Der Plan nutzt deine Zeit sinnvoll – ohne sie künstlich zu strecken.',
      render(data) {
        const t = timeOptions(data.goal);
        // Gespeicherte Auswahl verwerfen, wenn sie zum Ziel nicht passt
        if (data.minutes && !t.options.includes(data.minutes)) data.minutes = null;
        return `
          <div class="field">
            <label>Minuten pro Einheit</label>
            ${chipRow(t.options, data.minutes, 'minutes', ' Min.')}
            ${t.hint ? `<p class="muted field-hint">${t.hint}</p>` : ''}
          </div>
          <div class="field">
            <label>Trainingstage pro Woche</label>
            ${chipRow([2, 3, 4, 5, 6], data.days, 'days', ' Tage')}
            <p class="muted field-hint">Die Einheiten werden mit Ruhetagen über die Woche verteilt, damit jede Muskelgruppe mindestens 48 Stunden regeneriert.</p>
          </div>`;
      },
      valid: (d) => d.minutes && d.days,
    },
    {
      key: 'equipment', title: 'Welches Equipment hast du?',
      sub: 'Wähle alles aus, was dir zur Verfügung steht – oder nichts für reines Körpergewichtstraining.',
      render(data) {
        const eq = data.equipment || [];
        return cardGrid([
          { value: 'kurzhanteln', emoji: '🏋️', label: 'Kurzhanteln', desc: 'Oder Kettlebells / gefüllte Flaschen' },
          { value: 'band', emoji: '🎗️', label: 'Widerstandsbänder', desc: 'Stretch-/Fitnessbänder' },
          { value: 'matte', emoji: '🧘', label: 'Matte', desc: 'Für Boden- und Dehnübungen' },
        ], eq, 'equipment', true);
      },
      valid: () => true,
    },
    {
      key: 'summary', title: 'Alles klar!',
      sub: 'Prüfe deine Angaben – dann erstellen wir deinen Plan.',
      render(data) {
        const goal = FitPlanner.GOALS[data.goal];
        const level = FitPlanner.LEVELS[data.level];
        const eq = (data.equipment || []);
        const eqLabel = eq.length
          ? eq.map((e) => ({ kurzhanteln: 'Kurzhanteln', band: 'Bänder', matte: 'Matte' }[e])).join(', ')
          : 'Nur Körpergewicht';
        return `
          <div class="summary-card">
            <div class="summary-row"><span>🎯 Ziel</span><strong>${goal.emoji} ${goal.label}</strong></div>
            <div class="summary-row"><span>🎂 Alter</span><strong>${data.age} Jahre</strong></div>
            <div class="summary-row"><span>📈 Level</span><strong>${level.label}</strong></div>
            <div class="summary-row"><span>⏱️ Zeit</span><strong>${data.minutes} Min. × ${data.days} Tage/Woche</strong></div>
            <div class="summary-row"><span>🛠️ Equipment</span><strong>${eqLabel}</strong></div>
          </div>`;
      },
      valid: () => true,
    },
  ];

  // Sinnvolle Einheitenlängen je Ziel: Mobility und Haltungsarbeit wirken
  // über Regelmäßigkeit, nicht über Dauer – dort wären 60 Minuten nur
  // gestreckte Zeit ohne Zusatznutzen.
  function timeOptions(goal) {
    if (goal === 'beweglichkeit' || goal === 'haltung') {
      return {
        options: [10, 15, 20, 30],
        hint: 'Kurz und regelmäßig wirkt hier besser als lang und selten.',
      };
    }
    if (goal === 'muskelaufbau') {
      return {
        options: [20, 30, 45, 60],
        hint: 'Freie Zeit fließt in zusätzliche Sätze statt in immer mehr Übungen.',
      };
    }
    return { options: [15, 20, 30, 45, 60], hint: '' };
  }

  function cardGrid(options, selected, field, multi) {
    const isSelected = (v) => multi ? (selected || []).includes(v) : selected === v;
    return `<div class="card-grid" data-field="${field}" data-multi="${multi ? 1 : 0}">
      ${options.map((o) => `
        <button type="button" class="option-card ${isSelected(o.value) ? 'selected' : ''}" data-value="${o.value}">
          <span class="option-emoji">${o.emoji}</span>
          <span class="option-label">${o.label}</span>
          <span class="option-desc">${o.desc}</span>
        </button>`).join('')}
    </div>`;
  }

  function chipRow(values, selected, field, suffix) {
    return `<div class="chip-row" data-field="${field}">
      ${values.map((v) => `
        <button type="button" class="chip ${selected === v ? 'selected' : ''}" data-value="${v}">${v}${suffix}</button>
      `).join('')}
    </div>`;
  }

  function renderWizardStep() {
    const step = WIZARD_STEPS[state.wizardStep];
    const body = $('#wizard-body');
    body.innerHTML = `
      <h2>${step.title}</h2>
      <p class="muted">${step.sub}</p>
      ${step.render(state.wizardData)}`;
    if (step.mount) step.mount(state.wizardData);

    // Auswahl-Handler
    body.querySelectorAll('.card-grid').forEach((grid) => {
      const field = grid.dataset.field;
      const multi = grid.dataset.multi === '1';
      grid.querySelectorAll('.option-card').forEach((card) => {
        card.addEventListener('click', () => {
          if (multi) {
            const list = state.wizardData[field] || (state.wizardData[field] = []);
            const idx = list.indexOf(card.dataset.value);
            if (idx === -1) list.push(card.dataset.value); else list.splice(idx, 1);
            card.classList.toggle('selected');
          } else {
            state.wizardData[field] = card.dataset.value;
            grid.querySelectorAll('.option-card').forEach((c) => c.classList.remove('selected'));
            card.classList.add('selected');
          }
          updateWizardButtons();
        });
      });
    });
    body.querySelectorAll('.chip-row').forEach((row) => {
      const field = row.dataset.field;
      row.querySelectorAll('.chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          state.wizardData[field] = parseInt(chip.dataset.value, 10);
          row.querySelectorAll('.chip').forEach((c) => c.classList.remove('selected'));
          chip.classList.add('selected');
          updateWizardButtons();
        });
      });
    });

    $('#wizard-progress').style.width = `${((state.wizardStep + 1) / WIZARD_STEPS.length) * 100}%`;
    $('#wizard-step-label').textContent = `${state.wizardStep + 1}/${WIZARD_STEPS.length}`;
    $('#wizard-next').textContent = state.wizardStep === WIZARD_STEPS.length - 1 ? '✨ Plan erstellen' : 'Weiter';
    updateWizardButtons();
  }

  function updateWizardButtons() {
    const step = WIZARD_STEPS[state.wizardStep];
    $('#wizard-next').disabled = !step.valid(state.wizardData);
  }

  function wizardNext() {
    if (state.wizardStep < WIZARD_STEPS.length - 1) {
      state.wizardStep++;
      renderWizardStep();
      return;
    }
    // Fertig: Plan anlegen bzw. aktiven Plan aktualisieren
    const d = state.wizardData;
    const profile = {
      goal: d.goal, age: d.age, level: d.level,
      minutes: d.minutes, days: d.days,
      equipment: d.equipment || [],
    };
    if (state.wizardMode === 'edit' && activePlan()) {
      const p = activePlan();
      p.profile = profile;
      p.plan = FitPlanner.generatePlan(profile);
      p.progress = {};
    } else {
      const p = {
        id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: planName(d.goal),
        profile,
        plan: FitPlanner.generatePlan(profile),
        progress: {},
      };
      state.plans.push(p);
      state.activePlanId = p.id;
    }
    savePlans();
    renderPlan();
    show('plan');
  }

  function wizardBack() {
    if (state.wizardStep === 0) {
      show(state.plans.length ? 'plan' : 'welcome');
    } else {
      state.wizardStep--;
      renderWizardStep();
    }
  }

  function startWizard(mode) {
    state.wizardMode = mode;
    state.wizardStep = 0;
    state.wizardData = (mode === 'edit' && activePlan())
      ? Object.assign({}, activePlan().profile)
      : {};
    renderWizardStep();
    show('wizard');
  }

  // ------------------------------------------------------------------
  // Planübersicht
  // ------------------------------------------------------------------
  let deleteArmed = false;

  function regeneratePlan() {
    const p = activePlan();
    if (!p) return;
    p.plan = FitPlanner.generatePlan(p.profile);
    p.progress = {};
    savePlans();
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' });
    } catch {
      return '';
    }
  }

  function renderPlan() {
    const p = activePlan();
    if (!p) { show('welcome'); return; }
    deleteArmed = false;

    const goal = FitPlanner.GOALS[p.profile.goal];
    $('#plan-title').textContent = p.name;
    $('#plan-subtitle').textContent =
      `${goal.emoji} ${goal.label} · ${p.profile.minutes} Min. · ${p.profile.days}× pro Woche`;

    const del = $('#btn-delete-plan');
    del.classList.toggle('hidden', state.plans.length < 2);
    del.textContent = '🗑️';

    // Plan-Umschalter
    $('#plan-switcher').innerHTML = state.plans.map((plan) => `
      <button class="chip ${plan.id === state.activePlanId ? 'selected' : ''}" data-plan="${plan.id}">${plan.name}</button>
    `).join('') + '<button class="chip chip-add" id="btn-new-plan">＋ Neuer Plan</button>';
    $('#plan-switcher').querySelectorAll('[data-plan]').forEach((chip) => {
      chip.addEventListener('click', () => {
        state.activePlanId = chip.dataset.plan;
        savePlans();
        renderPlan();
      });
    });
    $('#btn-new-plan').addEventListener('click', () => startWizard('new'));

    // Statistik
    $('#plan-stats').innerHTML = `
      <div class="stat"><strong>${state.stats.workouts}</strong><span>Workouts geschafft</span></div>
      <div class="stat"><strong>${state.stats.minutes}</strong><span>Minuten trainiert</span></div>
      <div class="stat"><strong>${p.plan.days.reduce((s, d) => s + d.blocks.main.length, 0)}</strong><span>Übungen im Plan</span></div>`;

    // Einzel-Workouts
    $('#quick-section').innerHTML = `
      <h3 class="block-title">⚡ Einzel-Workout – ohne Plan, sofort starten</h3>
      <div class="chip-row quick-row">
        ${Object.entries(FitPlanner.QUICK_FOCUS).map(([id, f]) => `
          <button class="chip" data-quick="${id}">${f.emoji} ${f.label}</button>`).join('')}
      </div>`;
    $('#quick-section').querySelectorAll('[data-quick]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const day = FitPlanner.generateQuickDay(p.profile, chip.dataset.quick);
        state.currentDayRef = { type: 'quick', day };
        renderDay();
        show('day');
      });
    });

    // Wochenplan – mit Wochentagen und sichtbaren Ruhetagen, damit der
    // Regenerations-Rhythmus (48 h je Muskelgruppe) erkennbar ist
    const dayCard = (day, i) => {
      const count = day.blocks.warmup.length + day.blocks.main.length + day.blocks.cooldown.length;
      const pr = p.progress[i];
      const progressLine = pr
        ? `<span class="day-progress">✅ ${pr.n}× absolviert · zuletzt ${formatDate(pr.last)}</span>`
        : '';
      return `
        <button class="day-card" data-day="${i}">
          <span class="day-emoji">${day.emoji}</span>
          <span class="day-info">
            <span class="day-name">${day.name} · ${day.focus}</span>
            <span class="day-meta">${count} Übungen · ca. ${day.estMinutes} Min.</span>
            ${progressLine}
          </span>
          <span class="day-arrow">→</span>
        </button>`;
    };

    const hasSchedule = p.plan.days.every((d) => d.weekday);
    let rows;
    if (hasSchedule) {
      const byWeekday = {};
      p.plan.days.forEach((d, i) => { byWeekday[d.weekday] = { d, i }; });
      rows = FitPlanner.WEEKDAYS.map((wd) => {
        const entry = byWeekday[wd];
        return entry
          ? `<div class="week-row"><span class="week-day">${wd}</span>${dayCard(entry.d, entry.i)}</div>`
          : `<div class="week-row"><span class="week-day">${wd}</span><div class="rest-day">😴 Ruhetag – Regeneration</div></div>`;
      }).join('');
    } else {
      rows = p.plan.days.map(dayCard).join('');
    }
    $('#plan-days').innerHTML = '<h3 class="block-title">📅 Dein Wochenplan</h3>' + rows;

    $('#plan-days').querySelectorAll('.day-card').forEach((card) => {
      card.addEventListener('click', () => {
        const index = parseInt(card.dataset.day, 10);
        state.currentDayRef = { type: 'plan', planId: p.id, index, day: p.plan.days[index] };
        renderDay();
        show('day');
      });
    });
  }

  function deletePlan() {
    if (state.plans.length < 2) return;
    const btn = $('#btn-delete-plan');
    if (!deleteArmed) {
      // Erst nach zweitem Tipp wirklich löschen
      deleteArmed = true;
      btn.textContent = 'Wirklich löschen?';
      setTimeout(() => {
        deleteArmed = false;
        btn.textContent = '🗑️';
      }, 3000);
      return;
    }
    state.plans = state.plans.filter((p) => p.id !== state.activePlanId);
    state.activePlanId = state.plans[0] ? state.plans[0].id : null;
    savePlans();
    renderPlan();
  }

  // ------------------------------------------------------------------
  // Tagesansicht
  // ------------------------------------------------------------------
  // Einseitige Übungen (Ausfallschritte, Seitstütz …) gelten je Seite –
  // sonst ist unklar, ob die Vorgabe für beide Seiten zusammen zählt
  const perSideNote = (item) => (EXERCISE_BY_ID[item.exId].perSide ? ' je Seite' : '');

  function itemMeta(item) {
    const t = targetFor(item);
    const parts = [];
    if (t.kind === 'time') parts.push(`${item.sets} × ${t.value} Sek.${perSideNote(item)}`);
    else parts.push(`${item.sets} × ${t.value} Wdh.${perSideNote(item)}`);
    if (item.sets > 1) parts.push(`${item.restSec} Sek. Pause`);
    return parts.join(' · ');
  }

  // Zusatzzeile mit Bereich, Steigerungsstufe und nächstem Schritt
  function progressLine(item) {
    const t = targetFor(item);
    const bits = [];
    if (t.kind === 'reps' && t.hi > t.lo) bits.push(`Bereich ${t.lo}–${t.hi}`);
    if (t.cycle > 0) {
      const ex = EXERCISE_BY_ID[item.exId];
      const wie = ex.equipment === 'none' ? 'Stufe' : 'Gewichtsstufe';
      bits.push(`${wie} +${t.cycle}`);
    }
    if (t.atTop) bits.push(progressHint(item.exId));
    return bits.length ? `<p class="progress-line">↗ ${bits.join(' · ')}</p>` : '';
  }

  function exerciseCard(item) {
    const ex = EXERCISE_BY_ID[item.exId];
    const muscles = ex.muscles
      .filter((m) => MUSCLE_LABELS[m])
      .map((m) => `<span class="tag">${MUSCLE_LABELS[m]}</span>`).join('');
    return `
      <div class="exercise-card" data-ex="${ex.id}">
        <div class="exercise-anim-box" data-anim-slot="${ex.id}"></div>
        <div class="exercise-info">
          <h4>${ex.name}</h4>
          <p class="exercise-meta">${itemMeta(item)}</p>
          ${progressLine(item)}
          <p class="exercise-desc">${ex.desc}</p>
          <div class="tags">${muscles}</div>
        </div>
      </div>`;
  }

  function mountAnimations(container) {
    container.querySelectorAll('[data-anim-slot]').forEach((slot) => {
      const ex = EXERCISE_BY_ID[slot.dataset.animSlot];
      slot.innerHTML = '';
      slot.appendChild(FitAnimations.createExerciseAnimation(ex.anim, ex.props));
    });
  }

  function renderDay() {
    const ref = state.currentDayRef;
    const day = ref.day;
    rememberBase(day);
    $('#day-title').textContent = ref.type === 'quick'
      ? `${day.emoji} ${day.focus}`
      : `${day.emoji} ${day.name} – ${day.focus}`;
    $('#day-subtitle').textContent =
      (ref.type === 'quick' ? 'Einzel-Workout · ' : '') + `ca. ${day.estMinutes} Minuten`;

    const block = (title, items) => items.length ? `
      <h3 class="block-title">${title}</h3>
      ${items.map(exerciseCard).join('')}` : '';

    const blocks = $('#day-blocks');
    blocks.innerHTML =
      block('🔆 Aufwärmen', day.blocks.warmup) +
      block('🏋️ Hauptteil', day.blocks.main) +
      block('🧘 Ausklang & Dehnen', day.blocks.cooldown);
    mountAnimations(blocks);
  }

  // ------------------------------------------------------------------
  // Workout-Player
  // ------------------------------------------------------------------
  function buildWorkoutSteps(day) {
    const items = [...day.blocks.warmup, ...day.blocks.main, ...day.blocks.cooldown];
    const steps = [];
    items.forEach((item, itemIdx) => {
      for (let set = 1; set <= item.sets; set++) {
        steps.push({ type: 'work', item, set });
        const isLastOverall = itemIdx === items.length - 1 && set === item.sets;
        if (!isLastOverall) steps.push({ type: 'rest', sec: item.restSec, nextItem: set < item.sets ? item : items[itemIdx + 1] });
      }
    });
    return steps;
  }

  // Ansage-Texte: "8–12 Wdh." → "8 bis 12 Wiederholungen"
  function speakableReps(reps) {
    return reps.replace('–', ' bis ') + ' Wiederholungen';
  }

  // Display während des Trainings wachhalten (Screen Wake Lock API).
  // Nicht überall verfügbar – Aufrufe sind abgesichert.
  let wakeLock = null;
  async function acquireWakeLock() {
    try {
      if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    } catch { /* z. B. Energiesparmodus – dann eben ohne */ }
  }
  function releaseWakeLock() {
    try {
      if (wakeLock) { wakeLock.release(); wakeLock = null; }
    } catch { /* egal */ }
  }
  // Nach App-Wechsel geht der Wake Lock verloren – bei Rückkehr neu anfordern
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.workout) acquireWakeLock();
  });

  function startWorkout() {
    const day = state.currentDayRef.day;
    rememberBase(day);
    state.workout = {
      steps: buildWorkoutSteps(day),
      index: 0,
      startedAt: Date.now(),
      timer: null,
    };
    FitSound.unlock(); // Audio braucht eine Nutzer-Interaktion – die ist das hier
    acquireWakeLock();
    updateAudioButtons();
    renderWorkoutStep();
    show('workout');
  }

  // Countdown auf Uhrzeit-Basis: läuft auch nach kurzem App-Wechsel korrekt
  // weiter (setInterval wird im Hintergrund gedrosselt).
  // Rückgabe: extend(sec) verlängert den laufenden Countdown.
  function startCountdown(w, seconds, displaySel, onDone) {
    let endAt = Date.now() + seconds * 1000;
    let last = seconds;
    w.timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      if (remaining === last) return;
      last = remaining;
      const t = $(displaySel);
      if (t) t.textContent = remaining;
      if (remaining > 0 && remaining <= 3) FitSound.tick();
      if (remaining <= 0) onDone();
    }, 250);
    return {
      extend(sec) {
        endAt += sec * 1000;
        last = -1; // Anzeige beim nächsten Tick sofort aktualisieren
      },
    };
  }

  function updateAudioButtons() {
    const sound = $('#btn-sound');
    sound.textContent = state.soundOn ? '🔊' : '🔇';
    sound.title = state.soundOn ? 'Ton ausschalten' : 'Ton einschalten';
    const speak = $('#btn-speak-desc');
    speak.classList.toggle('off', !state.speakDescOn);
    speak.title = state.speakDescOn
      ? 'Übungsbeschreibung nicht mehr ansagen'
      : 'Übungsbeschreibung ansagen';
  }

  function toggleSound() {
    state.soundOn = !state.soundOn;
    saveJSON(STORAGE_SOUND, state.soundOn);
    FitSound.setEnabled(state.soundOn);
    if (state.soundOn) FitSound.unlock();
    updateAudioButtons();
  }

  function toggleSpeakDesc() {
    state.speakDescOn = !state.speakDescOn;
    saveJSON(STORAGE_SPEAKDESC, state.speakDescOn);
    updateAudioButtons();
  }

  function stopTimer() {
    if (state.workout && state.workout.timer) {
      clearInterval(state.workout.timer);
      state.workout.timer = null;
    }
  }

  function renderWorkoutStep() {
    const w = state.workout;
    stopTimer();

    if (w.index >= w.steps.length) return finishWorkout();

    const step = w.steps[w.index];
    $('#workout-progress').style.width = `${(w.index / w.steps.length) * 100}%`;

    const workSteps = w.steps.filter((s) => s.type === 'work');
    const doneWork = w.steps.slice(0, w.index).filter((s) => s.type === 'work').length;
    $('#workout-step-label').textContent = `${Math.min(doneWork + 1, workSteps.length)}/${workSteps.length}`;

    const body = $('#workout-body');

    if (step.type === 'rest') {
      const nextEx = EXERCISE_BY_ID[step.nextItem.exId];
      body.innerHTML = `
        <div class="player-rest">
          <p class="player-kicker">Pause</p>
          <div class="rest-timer" id="rest-timer">${step.sec}</div>
          <p class="muted">Gleich weiter mit: <strong>${nextEx.name}</strong></p>
          <div class="rest-actions">
            <button class="btn btn-ghost" id="btn-extend-rest">+20 Sek.</button>
            <button class="btn btn-ghost" id="btn-skip-rest">Überspringen ➜</button>
          </div>
        </div>`;
      FitSound.speak(`Pause, ${step.sec} Sekunden. Gleich weiter mit: ${nextEx.name}.`);
      const countdown = startCountdown(w, step.sec, '#rest-timer', nextStep);
      $('#btn-skip-rest').addEventListener('click', nextStep);
      $('#btn-extend-rest').addEventListener('click', () => countdown.extend(20));
      return;
    }

    // Arbeits-Schritt
    const ex = EXERCISE_BY_ID[step.item.exId];
    const isTimed = !!step.item.seconds;
    const ziel = targetFor(step.item);
    body.innerHTML = `
      <div class="player-work">
        <p class="player-kicker">Satz ${step.set} von ${step.item.sets}</p>
        <h2 class="player-title">${ex.name}</h2>
        <div class="player-anim" data-anim-slot="${ex.id}"></div>
        <p class="player-target">${isTimed ? '' : ziel.value + ' Wiederholungen' + perSideNote(step.item)}</p>
        ${isTimed && ex.perSide ? '<p class="player-side" id="work-side">Seite 1 von 2</p>' : ''}
        ${isTimed ? `<div class="rest-timer work-timer" id="work-timer">${ziel.value}</div>` : ''}
        <p class="player-desc">${ex.desc}</p>
        ${isTimed
          ? '<button class="btn btn-ghost" id="btn-skip-work">Überspringen ➜</button>'
          : '<button class="btn btn-primary btn-lg" id="btn-set-done">✓ Satz geschafft</button>'}
      </div>`;
    mountAnimations(body);

    // Ansage: Übung, Satz, Vorgabe – und auf Wunsch die Beschreibung
    const setInfo = step.item.sets > 1 ? `Satz ${step.set} von ${step.item.sets}. ` : '';
    const seite = ex.perSide ? ' je Seite' : '';
    let text = isTimed
      ? `${ex.name}. ${setInfo}${ziel.value} Sekunden${seite}.`
      : `${ex.name}. ${setInfo}${ziel.value} Wiederholungen${seite}.`;
    if (state.speakDescOn && step.set === 1) text += ' ' + ex.desc;
    if (isTimed) text += " Los geht's!";
    FitSound.start();
    FitSound.speak(text);

    // Seite 1 → Umbaupause → Seite 2. Jede Seite bekommt die volle Haltezeit.
    function runSide(side) {
      const label = $('#work-side');
      if (label) {
        label.textContent = `Seite ${side} von 2`;
        label.classList.remove('switching');
      }
      $('#work-timer').textContent = ziel.value;
      startCountdown(w, ziel.value, '#work-timer', () => {
        FitSound.finish();
        if (side === 1) runSwitch(); else nextStep();
      });
    }

    function runSwitch() {
      const label = $('#work-side');
      if (label) {
        label.textContent = 'Seite wechseln';
        label.classList.add('switching');
      }
      FitSound.speak('Seite wechseln!');
      $('#work-timer').textContent = SWITCH_SEC;
      startCountdown(w, SWITCH_SEC, '#work-timer', () => {
        FitSound.start();
        runSide(2);
      });
    }

    if (isTimed) {
      if (ex.perSide) {
        // Einseitige Halteübungen laufen über beide Seiten. Dazwischen liegt
        // eine echte Umbaupause – der Wechsel darf nicht von der Haltezeit
        // abgehen, sonst ist die zweite Seite kürzer belastet als die erste.
        runSide(1);
      } else {
        $('#work-timer').textContent = ziel.value;
        startCountdown(w, ziel.value, '#work-timer', () => {
          FitSound.finish();
          nextStep();
        });
      }
      $('#btn-skip-work').addEventListener('click', nextStep);
    } else {
      $('#btn-set-done').addEventListener('click', nextStep);
    }
  }

  function nextStep() {
    if (!state.workout) return; // Klick auf einen Knopf aus einem beendeten Workout
    stopTimer();
    state.workout.index++;
    renderWorkoutStep();
  }

  // ------------------------------------------------------------------
  // Optionale Rückmeldung nach der Einheit
  // Bewusst erst am Ende und überspringbar – wer nichts sagt, bekommt die
  // automatische Steigerung. Die Abstufungen entsprechen grob der
  // Anstrengungseinschätzung (wie viele Wiederholungen blieben übrig).
  // ------------------------------------------------------------------
  const FEEDBACK = [
    { key: 'schwer', label: '😮‍💨 Zu schwer', delta: -1 },
    { key: 'passt', label: '👍 Passte', delta: 0 },
    { key: 'leicht', label: '🙂 Etwas zu leicht', delta: 1 },
    { key: 'sehrleicht', label: '💪 Deutlich zu leicht', delta: 2 },
  ];

  function renderFeedback(day) {
    const main = day.blocks.main;
    $('#feedback-session').innerHTML = FEEDBACK.map((f) => `
      <button class="chip" data-fb="${f.key}">${f.label}</button>`).join('');
    $('#feedback-session').querySelectorAll('[data-fb]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const f = FEEDBACK.find((x) => x.key === chip.dataset.fb);
        // "Passte" bestätigt die automatische Steigerung – nichts zu tun
        if (f.delta) main.forEach((it) => shiftProgress(it.exId, f.delta));
        $('#feedback-session').querySelectorAll('.chip').forEach((c) => c.classList.remove('selected'));
        chip.classList.add('selected');
        renderFeedbackList(day);
        FitSound.speak(f.delta > 0 ? 'Alles klar, nächstes Mal etwas mehr.'
          : f.delta < 0 ? 'Verstanden, wir gehen etwas zurück.' : 'Gut, weiter so.');
      });
    });
    $('#feedback-list').classList.add('hidden');
    $('#btn-feedback-detail').textContent = 'Einzelne Übungen anpassen ▾';
    renderFeedbackList(day);
  }

  function renderFeedbackList(day) {
    $('#feedback-list').innerHTML = day.blocks.main.map((it) => {
      const ex = EXERCISE_BY_ID[it.exId];
      const t = targetFor(it);
      const wert = t.kind === 'time' ? `${t.value} Sek.` : `${t.value} Wdh.`;
      return `
        <div class="feedback-row">
          <span class="feedback-name">${ex.name}<span class="muted"> · nächstes Mal ${wert}</span></span>
          <span class="feedback-actions">
            <button class="chip chip-mini" data-ex="${it.exId}" data-delta="-1" title="zu schwer">−</button>
            <button class="chip chip-mini" data-ex="${it.exId}" data-delta="1" title="etwas zu leicht">+</button>
            <button class="chip chip-mini" data-ex="${it.exId}" data-delta="2" title="deutlich zu leicht">++</button>
          </span>
        </div>`;
    }).join('');
    $('#feedback-list').querySelectorAll('[data-ex]').forEach((btn) => {
      btn.addEventListener('click', () => {
        shiftProgress(btn.dataset.ex, parseInt(btn.dataset.delta, 10));
        renderFeedbackList(day);
      });
    });
  }

  function finishWorkout() {
    stopTimer();
    const minutes = Math.max(1, Math.round((Date.now() - state.workout.startedAt) / 60000));
    state.stats.workouts++;
    state.stats.minutes += minutes;
    saveJSON(STORAGE_STATS, state.stats);

    // Fortschritt am Plan-Tag festhalten
    const ref = state.currentDayRef;
    if (ref && ref.type === 'plan') {
      const p = state.plans.find((x) => x.id === ref.planId);
      if (p) {
        const pr = p.progress[ref.index] || { n: 0 };
        pr.n++;
        pr.last = new Date().toISOString();
        p.progress[ref.index] = pr;
        savePlans();
      }
    }

    const day = ref.day;
    const label = ref.type === 'quick' ? day.focus : `${day.name} – ${day.focus}`;
    $('#done-summary').textContent =
      `${label} abgeschlossen: ${day.blocks.main.length + day.blocks.warmup.length + day.blocks.cooldown.length} Übungen in ${minutes} Minuten. Stark! 💪`;
    state.workout = null;
    releaseWakeLock();

    // Automatische Steigerung für die Hauptübungen dieser Einheit
    advanceProgress(day.blocks.main.map((it) => it.exId));
    renderFeedback(day);

    FitSound.finish();
    FitSound.speak('Workout geschafft. Stark!');
    show('done');
  }

  function quitWorkout() {
    stopTimer();
    FitSound.stop();
    state.workout = null;
    releaseWakeLock();
    renderDay();
    show('day');
  }

  // ------------------------------------------------------------------
  // Events & Init
  // ------------------------------------------------------------------
  $('#btn-start').addEventListener('click', () => startWizard('new'));
  $('#btn-resume').addEventListener('click', () => { renderPlan(); show('plan'); });
  $('#wizard-next').addEventListener('click', wizardNext);
  $('#wizard-back').addEventListener('click', wizardBack);
  $('#btn-theme').addEventListener('click', toggleTheme);
  $('#btn-voice').addEventListener('click', toggleVoicePanel);
  $('#btn-voice-test').addEventListener('click', () => {
    FitSound.unlock();
    FitSound.start();
    FitSound.speak('Ausfallschritte. Satz eins von drei. Zehn bis zwölf Wiederholungen.');
    // Nach der ersten Ansage kennt iOS die Stimmenliste
    FitSound.refreshVoices();
  });
  // Stimmen stehen auf manchen Geräten erst verzögert bereit
  FitSound.onVoicesChanged(() => {
    if (!$('#voice-panel').classList.contains('hidden')) renderVoicePanel();
  });
  $('#btn-edit-profile').addEventListener('click', () => startWizard('edit'));
  $('#btn-regenerate').addEventListener('click', () => { regeneratePlan(); renderPlan(); });
  $('#btn-delete-plan').addEventListener('click', deletePlan);
  $('#day-back').addEventListener('click', () => { renderPlan(); show('plan'); });
  $('#btn-start-workout').addEventListener('click', startWorkout);
  $('#workout-quit').addEventListener('click', quitWorkout);
  $('#btn-sound').addEventListener('click', toggleSound);
  $('#btn-speak-desc').addEventListener('click', toggleSpeakDesc);
  $('#btn-done-home').addEventListener('click', () => { renderPlan(); show('plan'); });
  $('#btn-feedback-detail').addEventListener('click', () => {
    const list = $('#feedback-list');
    const auf = list.classList.toggle('hidden');
    $('#btn-feedback-detail').textContent = auf
      ? 'Einzelne Übungen anpassen ▾' : 'Einzelne Übungen ▴';
  });

  // Einstellungen laden (Standard: Ton und Beschreibungs-Ansage an)
  state.soundOn = loadJSON(STORAGE_SOUND);
  if (state.soundOn === null) state.soundOn = true;
  FitSound.setEnabled(state.soundOn);
  state.speakDescOn = loadJSON(STORAGE_SPEAKDESC);
  if (state.speakDescOn === null) state.speakDescOn = true;
  applyTheme(loadJSON(STORAGE_THEME) || 'studio');
  const savedVoice = loadJSON(STORAGE_VOICE);
  if (savedVoice) FitSound.setVoice(savedVoice);
  const savedRate = loadJSON(STORAGE_RATE);
  if (savedRate) FitSound.setRate(savedRate);

  // Splash-Screen: bei jedem Start kurz zeigen, per Tipp überspringbar
  const splash = document.getElementById('splash');
  if (splash) {
    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      splash.classList.add('hide');
      setTimeout(() => splash.remove(), 600);
    };
    splash.addEventListener('click', dismiss);
    setTimeout(dismiss, 1900);
  }

  // Start
  loadPlans();
  if (state.plans.length) {
    savePlans();
    $('#btn-resume').classList.remove('hidden');
    renderPlan();
    show('plan');
  } else {
    show('welcome');
  }
})();
