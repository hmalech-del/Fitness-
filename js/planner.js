/* =====================================================================
 * FitPlan – Plangenerator
 * Baut aus dem Nutzerprofil (Ziel, Alter, Level, Zeit, Equipment)
 * einen dynamischen Wochenplan – oder ein einzelnes Schwerpunkt-Workout
 * (z. B. HIIT, Bauch, Cardio) ohne Plan.
 * ===================================================================== */

(function (global) {
  'use strict';

  const GOALS = {
    muskelaufbau: { label: 'Muskelaufbau', emoji: '💪' },
    abnehmen: { label: 'Abnehmen', emoji: '🔥' },
    ausdauer: { label: 'Ausdauer', emoji: '🏃' },
    beweglichkeit: { label: 'Beweglichkeit', emoji: '🧘' },
    ruecken: { label: 'Rückenstärkung', emoji: '🛡️' },
    haltung: { label: 'Aufrechte Haltung', emoji: '🧍' },
    fitness: { label: 'Allgemeine Fitness', emoji: '⚡' },
  };

  const LEVELS = {
    anfaenger: { label: 'Anfänger', maxLevel: 1, allowNextLevel: true },
    mittel: { label: 'Fortgeschritten', maxLevel: 2, allowNextLevel: true },
    profi: { label: 'Sehr erfahren', maxLevel: 3, allowNextLevel: false },
  };

  // Trainingsparameter je Ziel: Sätze, Wiederholungen, Pause,
  // geschätzte Arbeitszeit pro Satz (für die Zeitplanung)
  const GOAL_PARAMS = {
    muskelaufbau: { sets: 3, reps: [8, 12], restSec: 60, workSec: 40 },
    abnehmen: { sets: 3, reps: [12, 15], restSec: 30, workSec: 45 },
    ausdauer: { sets: 3, reps: [15, 20], restSec: 25, workSec: 45 },
    beweglichkeit: { sets: 2, reps: null, restSec: 15, workSec: 35 },
    ruecken: { sets: 3, reps: [10, 15], restSec: 45, workSec: 40 },
    haltung: { sets: 2, reps: [10, 12], restSec: 30, workSec: 35 },
    fitness: { sets: 3, reps: [10, 12], restSec: 50, workSec: 40 },
  };

  const WARMUP_POOL = ['march', 'jumping_jack', 'shoulder_mob', 'high_knees', 'squat'];
  const COOLDOWN_POOL = ['forward_fold', 'quad_stretch', 'cat_cow', 'lunge_stretch', 'shoulder_mob'];

  // Wochen-Rhythmus: Die Trainingstage werden so über die Woche verteilt,
  // dass zwischen zwei Einheiten mit gleichem Schwerpunkt mindestens 48
  // Stunden Regeneration liegen.
  const WEEK_SCHEDULES = {
    2: ['Mo', 'Do'],
    3: ['Mo', 'Mi', 'Fr'],
    4: ['Mo', 'Di', 'Do', 'Fr'],
    5: ['Mo', 'Di', 'Do', 'Sa', 'So'],
    6: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  };
  const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  // ------------------------------------------------------------------
  // Hilfsfunktionen
  // ------------------------------------------------------------------
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function allowedExercises(profile) {
    const level = LEVELS[profile.level] || LEVELS.anfaenger;
    const maxLevel = level.maxLevel + (level.allowNextLevel && profile.age < 55 ? 1 : 0);
    const noImpact = profile.age >= 55;

    return EXERCISES.filter((ex) => {
      if (ex.equipment !== 'none' && !profile.equipment.includes(ex.equipment)) return false;
      if (ex.level > maxLevel) return false;
      if (noImpact && ex.impact) return false;
      return true;
    });
  }

  // Echte Bauchübungen: Core ist der Hauptmuskel (erster Eintrag).
  // Glute Bridge & Co. tragen zwar 'core', dort arbeitet aber der Po.
  const isCoreFocus = (ex) => ex.muscles[0] === 'core';

  // Umbauzeit zwischen den beiden Seiten einer einseitigen Übung. Sie geht
  // NICHT von der Belastungszeit ab: wer sich beim Seitstütz neu aufbaut,
  // soll danach wieder die volle Haltezeit haben.
  const SIDE_SWITCH_SEC = 8;

  function itemTimeSec(item) {
    // Einseitige Übungen werden je Seite ausgeführt und brauchen damit die
    // doppelte Arbeitszeit – sonst ist die Einheit spürbar länger als angesagt
    const ex = EXERCISE_BY_ID[item.exId];
    const perSide = !!(ex && ex.perSide);
    const work = (item.seconds || item.workSec || 40) * (perSide ? 2 : 1)
      + (perSide ? SIDE_SWITCH_SEC : 0);
    return item.sets * work + (item.sets - 1) * item.restSec + 20; // +20s Übergang
  }

  // Nicht jede Übung verträgt denselben Wiederholungsbereich: Waden und
  // Bauchmuskulatur sind ermüdungsresistent, und bei Eigengewichtsübungen
  // lässt sich das Gewicht nicht steigern – dort setzt der Reiz erst bei
  // höheren Wiederholungszahlen ein. repBias skaliert den Zielbereich.
  function roundReps(v) {
    const r = Math.round(v);
    return r > 12 ? Math.round(r / 5) * 5 : r;
  }

  function repRange(ex, reps) {
    const bias = ex.repBias || 1;
    return `${roundReps(reps[0] * bias)}–${roundReps(reps[1] * bias)}`;
  }

  function makeItem(ex, params, profile) {
    const item = { exId: ex.id, sets: params.sets, restSec: params.restSec, workSec: params.workSec };
    if (params.forceSec) {
      // Intervallformat (z. B. HIIT): feste Belastungszeit für alle Übungen
      item.seconds = params.forceSec;
    } else if (ex.mode === 'time' || !params.reps) {
      let sec = ex.holdSec || 30;
      if (profile.level === 'profi') sec = Math.round(sec * 1.3);
      if (profile.level === 'anfaenger') sec = Math.round(sec * 0.85);
      item.seconds = Math.max(15, Math.round(sec / 5) * 5);
    } else {
      item.reps = repRange(ex, params.reps);
    }
    return item;
  }

  // Wählt aus dem Pool Übungen, bis das Zeitbudget erschöpft ist.
  // preferredMuscles sorgt für ausgewogene Muskelabdeckung, opts steuert
  // Volumen und Belastungsgrenzen:
  //   maxItems – Obergrenze an Übungen (Qualität vor Menge)
  //   limits   – z. B. { ruecken: 1 }: höchstens eine Übung, die den
  //              Rücken mitbelastet (verhindert versteckte Mehrfachlast)
  //   maxSets  – bis hierhin darf freie Zeit in zusätzliche Sätze fließen
  // Hat der Nutzer Equipment, werden Übungen damit bevorzugt.
  function fillBlock(pool, budgetSec, params, profile, preferredMuscles, opts) {
    const o = opts || {};
    const maxItems = o.maxItems || 99;
    const limits = o.limits || {};
    const maxSets = Math.max(params.sets, o.maxSets || params.sets);

    const items = [];
    const chosen = [];
    let remaining = budgetSec;
    const hasEquipment = profile.equipment.some((e) => e === 'kurzhanteln' || e === 'band');
    let candidates = shuffle(pool);
    if (hasEquipment) {
      candidates = candidates
        .map((ex) => ({ ex, score: (ex.equipment === 'none' ? 1 : 0) + Math.random() * 0.9 }))
        .sort((a, b) => a.score - b.score)
        .map((c) => c.ex);
    }

    const underLimit = (ex) => Object.keys(limits).every((m) => !ex.muscles.includes(m)
      || chosen.filter((c) => c.muscles.includes(m)).length < limits[m]);

    function take(idx) {
      const ex = candidates[idx];
      const item = makeItem(ex, params, profile);
      const t = itemTimeSec(item);
      if (t > remaining) return false;
      candidates.splice(idx, 1);
      items.push(item);
      chosen.push(ex);
      remaining -= t;
      return true;
    }

    // 1. Je eine Übung pro gewünschter Muskelgruppe
    // (bei vorhandenem Equipment bevorzugt die Geräte-Variante –
    // außer beim Core: Bauchübungen sind klassisch Eigengewicht)
    (preferredMuscles || []).forEach((muscle) => {
      if (items.length >= maxItems) return;
      const pick = (test) => candidates.findIndex((ex) => underLimit(ex) && test(ex));
      let idx = -1;
      if (muscle === 'core') idx = pick(isCoreFocus);
      else if (hasEquipment) idx = pick((ex) => ex.muscles.includes(muscle) && ex.equipment !== 'none');
      if (idx === -1) idx = pick((ex) => ex.muscles.includes(muscle));
      if (idx !== -1) take(idx);
    });

    // 2. Bis zur Obergrenze auffüllen
    for (let i = 0; i < candidates.length && items.length < maxItems;) {
      if (remaining < 60) break;
      if (underLimit(candidates[i]) && take(i)) continue;
      i++;
    }

    // 3. Freie Zeit fließt in zusätzliche Sätze statt in weitere Übungen –
    //    mehr Volumen pro Muskel bei besserer Ausführungsqualität
    let bumped = true;
    while (bumped) {
      bumped = false;
      for (const item of items) {
        if (item.sets >= maxSets) continue;
        // Kosten aus derselben Formel ableiten, mit der das Zeitbudget
        // gerechnet wird – sonst kosten einseitige Übungen mehr als gedacht
        item.sets += 1;
        const cost = itemTimeSec(item) - itemTimeSec(Object.assign({}, item, { sets: item.sets - 1 }));
        item.sets -= 1;
        if (cost > remaining) continue;
        item.sets += 1;
        remaining -= cost;
        bumped = true;
      }
    }

    // 4. Bleibt danach noch reichlich Zeit, dürfen einzelne Übungen dazu
    for (let i = 0; i < candidates.length && items.length < maxItems + 1;) {
      if (remaining < 180) break;
      if (underLimit(candidates[i]) && take(i)) continue;
      i++;
    }

    return items;
  }

  // trained: Muskeln der Einheit – Dehnübungen, die dazu passen, kommen
  // zuerst. Nach dem Training soll das gedehnt werden, was gearbeitet hat.
  function buildSupportBlock(poolIds, count, allowed, seconds, trained) {
    const allowedIds = new Set(allowed.map((e) => e.id));
    const pool = shuffle(poolIds.filter((id) => allowedIds.has(id)));
    if (trained) {
      const passt = (id) => (EXERCISE_BY_ID[id].muscles.some((m) => trained.has(m)) ? 0 : 1);
      pool.sort((a, b) => passt(a) - passt(b));
    }
    return pool.slice(0, count).map((id) => ({
      exId: id, sets: 1, seconds, restSec: 10, workSec: seconds,
    }));
  }

  // ------------------------------------------------------------------
  // Tages-Vorlagen
  // ------------------------------------------------------------------
  const DAY_TEMPLATES = {
    ganzkoerper: {
      name: 'Ganzkörper-Kraft', emoji: '🏋️',
      filter: (ex) => ex.category === 'kraft',
      muscles: ['beine', 'brust', 'ruecken', 'schultern', 'core', 'core'],
      maxItems: 6, limits: { ruecken: 2 },
      warmup: ['march', 'jumping_jack', 'squat', 'shoulder_mob'],
    },
    oberkoerper: {
      name: 'Oberkörper', emoji: '💪',
      // Po-Übungen (Glute Bridge & Co.) gehören auf den Unterkörper-Tag –
      // sonst bekommt die Gesäßmuskulatur nie eine Pause
      filter: (ex) => ex.category === 'kraft'
        && ex.muscles.some((m) => ['brust', 'ruecken', 'schultern', 'arme', 'core'].includes(m))
        && !ex.muscles.includes('beine') && !ex.muscles.includes('po'),
      muscles: ['brust', 'ruecken', 'schultern', 'arme', 'core', 'core'],
      maxItems: 6,
      warmup: ['march', 'shoulder_mob', 'cat_cow', 'jumping_jack'],
    },
    unterkoerper: {
      name: 'Unterkörper & Po', emoji: '🦵',
      // Bauchübungen gehören mit in den Pool, sonst bliebe für den
      // Core-Slot nur die Glute Bridge übrig
      // Übungen mit dem Rücken als Zielmuskel (Superman, Rudern …) gehören
      // auf die Oberkörper-Tage, auch wenn sie den Po mitbelasten
      filter: (ex) => ex.category === 'kraft' && ex.muscles[0] !== 'ruecken'
        && (ex.muscles.some((m) => ['beine', 'po'].includes(m)) || isCoreFocus(ex)),
      muscles: ['beine', 'po', 'core', 'core'],
      // höchstens eine hüftdominante Übung (Kreuzheben, Good Mornings …),
      // damit der Rücken nicht an jedem Tag mitarbeitet
      maxItems: 6, limits: { ruecken: 1 },
      warmup: ['march', 'squat', 'high_knees', 'glute_bridge'],
    },
    zirkel: {
      name: 'Ganzkörper-Zirkel', emoji: '🔥',
      filter: (ex) => ex.category === 'kraft' || ex.category === 'cardio',
      muscles: ['beine', 'cardio', 'brust', 'core'],
      maxItems: 8,
    },
    cardio_core: {
      name: 'Cardio & Core', emoji: '🏃',
      // nur echte Bauchübungen ergänzen das Cardio – Po-/Bein-Übungen
      // gehören auf die Kraft-Tage und brauchen dort ihre Regeneration
      filter: (ex) => ex.category === 'cardio' || (ex.category === 'kraft' && isCoreFocus(ex)),
      muscles: ['cardio', 'core', 'cardio'],
      maxItems: 8,
    },
    mobility: {
      name: 'Mobility & Dehnung', emoji: '🧘',
      // Reine Mobilisation ohne Kräftigung: Diese Tage liegen zwischen den
      // belastenden Einheiten und dienen der Regeneration
      filter: (ex) => ex.category === 'mobility',
      muscles: ['ruecken', 'beine', 'schultern', 'brust'],
      maxItems: 6,
      maxMinutes: 30,
    },
    hiit: {
      name: 'HIIT-Intervalle', emoji: '🔥',
      filter: (ex) => ex.category === 'cardio'
        || (ex.category === 'kraft' && ex.muscles.some((m) => ['beine', 'po', 'brust', 'core'].includes(m))),
      muscles: ['cardio', 'beine', 'core', 'cardio', 'brust'],
      maxItems: 8,
      maxMinutes: 25,
    },
    bauch: {
      name: 'Bauch & Core', emoji: '💥',
      filter: (ex) => ex.category === 'kraft' && ex.muscles.includes('core'),
      muscles: ['core', 'core', 'core'],
      maxItems: 7,
      maxMinutes: 20,
      warmup: ['march', 'cat_cow', 'glute_bridge', 'birddog'],
    },
    ruecken: {
      name: 'Rücken & Haltung', emoji: '🛡️',
      // Rückenkräftigung + stabilisierender Core + hintere Kette + Mobilisation
      filter: (ex) => ex.muscles.includes('ruecken')
        || (ex.category === 'kraft' && ex.muscles.includes('core'))
        || ['glute_bridge', 'sl_glute_bridge', 'db_glutebridge', 'cat_cow'].includes(ex.id),
      muscles: ['ruecken', 'core', 'ruecken', 'po'],
      maxItems: 6, limits: { ruecken: 3 },
      warmup: ['march', 'cat_cow', 'shoulder_mob', 'glute_bridge'],
    },
    haltung: {
      name: 'Aufrecht & Stark', emoji: '🧍',
      // Nacken, Schulterblattführung, Brustöffnung und oberer Rücken –
      // gegen nach vorn geschobenen Kopf und Rundschultern
      filter: (ex) => ex.muscles.includes('nacken')
        || ['wall_angel', 'chest_stretch', 'band_pullapart', 'band_latpull', 'band_row',
          'db_row', 'superman', 'swimmer', 'birddog', 'cat_cow', 'shoulder_mob',
          'db_lateral', 'band_lateral'].includes(ex.id),
      muscles: ['nacken', 'schultern', 'ruecken', 'brust'],
      // Haltungsarbeit wirkt über Regelmäßigkeit, nicht über Dauer
      maxItems: 6, maxMinutes: 30,
      warmup: ['march', 'shoulder_mob', 'cat_cow', 'chin_tuck'],
    },
  };

  // Wochenstruktur je Ziel und Trainingstagen
  function weekTemplates(goal, days) {
    const seq = [];
    if (goal === 'beweglichkeit') {
      for (let i = 0; i < days; i++) seq.push(i % 3 === 2 ? 'ganzkoerper' : 'mobility');
    } else if (goal === 'ruecken') {
      // Kräftigende Einheiten immer durch einen Mobility-Tag getrennt –
      // der Rücken ist sonst an aufeinanderfolgenden Tagen belastet
      const mix = {
        2: ['ruecken', 'mobility'],
        3: ['ruecken', 'mobility', 'ruecken'],
        4: ['ruecken', 'mobility', 'ruecken', 'mobility'],
        5: ['ruecken', 'mobility', 'ruecken', 'ganzkoerper', 'mobility'],
        6: ['ruecken', 'mobility', 'ruecken', 'mobility', 'ruecken', 'mobility'],
      }[days] || ['ruecken', 'mobility'];
      mix.forEach((t) => seq.push(t));
    } else if (goal === 'haltung') {
      // Haltungsarbeit ebenfalls im Wechsel mit lockeren Mobility-Tagen
      const mix = {
        2: ['haltung', 'haltung'],
        3: ['haltung', 'mobility', 'haltung'],
        4: ['haltung', 'mobility', 'haltung', 'mobility'],
        5: ['haltung', 'mobility', 'haltung', 'ruecken', 'mobility'],
        6: ['haltung', 'mobility', 'haltung', 'mobility', 'haltung', 'mobility'],
      }[days] || ['haltung', 'haltung'];
      mix.forEach((t) => seq.push(t));
    } else if (goal === 'ausdauer') {
      for (let i = 0; i < days; i++) seq.push(i % 3 === 2 ? 'zirkel' : 'cardio_core');
    } else if (goal === 'abnehmen') {
      // Kraftbetonte Zirkel nie an aufeinanderfolgenden Kalendertagen –
      // bei 5 Tagen liegen Sonntag und Montag sonst direkt beieinander
      const mix = days === 5
        ? ['zirkel', 'cardio_core', 'zirkel', 'cardio_core', 'cardio_core']
        : null;
      for (let i = 0; i < days; i++) seq.push(mix ? mix[i] : (i % 2 === 0 ? 'zirkel' : 'cardio_core'));
    } else if (goal === 'muskelaufbau' && days === 5) {
      // Ganzkörper-Tag in die Mitte: So folgen nie zwei Einheiten mit
      // gleichem Schwerpunkt direkt aufeinander.
      seq.push('oberkoerper', 'unterkoerper', 'ganzkoerper', 'oberkoerper', 'unterkoerper');
    } else if (goal === 'muskelaufbau' && days >= 4) {
      const split = ['oberkoerper', 'unterkoerper'];
      for (let i = 0; i < days; i++) seq.push(split[i % 2]);
    } else if (goal === 'muskelaufbau') {
      for (let i = 0; i < days; i++) seq.push('ganzkoerper');
    } else {
      // Allgemeine Fitness: Kraft, Cardio und Mobility so mischen, dass
      // kraftbetonte Einheiten nie an Folgetagen liegen – auch nicht am
      // Wochenübergang von Sonntag auf Montag
      const mix = {
        2: ['ganzkoerper', 'zirkel'],
        3: ['ganzkoerper', 'cardio_core', 'ganzkoerper'],
        4: ['ganzkoerper', 'cardio_core', 'ganzkoerper', 'mobility'],
        5: ['ganzkoerper', 'cardio_core', 'ganzkoerper', 'zirkel', 'mobility'],
        6: ['ganzkoerper', 'cardio_core', 'ganzkoerper', 'mobility', 'zirkel', 'cardio_core'],
      }[days] || ['ganzkoerper', 'zirkel'];
      mix.forEach((t) => seq.push(t));
    }
    return seq;
  }

  // ------------------------------------------------------------------
  // Session-Aufbau (für Plan-Tage und Einzel-Workouts)
  // ------------------------------------------------------------------
  function adjustParams(profile, base) {
    const params = Object.assign({}, base);
    if (profile.level === 'anfaenger') params.sets = Math.max(2, params.sets - 1);
    if (profile.level === 'profi' && profile.goal === 'muskelaufbau') params.sets += 1;
    if (profile.age >= 65) {
      params.sets = Math.max(2, params.sets - 1);
      params.restSec += 15;
    }
    return params;
  }

  // Kraft-Tage, bei denen der Bauch nur an jedem zweiten Trainingstag
  // drankommt – auch die Bauchmuskulatur braucht Regeneration.
  const CORE_ALTERNATING = ['ganzkoerper', 'oberkoerper', 'unterkoerper', 'cardio_core'];

  function buildSession(tplId, profile, params, minutes, opts) {
    const withCore = !opts || opts.withCore !== false;
    const allowed = allowedExercises(profile);
    const tpl = DAY_TEMPLATES[tplId];

    // Manche Trainingsarten profitieren nicht von mehr Zeit: Mobility,
    // HIIT und reines Bauchtraining werden nicht kuenstlich gestreckt.
    const totalSec = Math.min(minutes, tpl.maxMinutes || minutes) * 60;
    // Ältere Trainierende: etwas längeres Aufwärmen
    const warmupCount = minutes <= 20 ? 1 : profile.age >= 55 ? 3 : 2;
    const cooldownCount = minutes <= 20 ? 1 : 2;
    // Aufwärmen bereitet die Muskeln vor, die gleich arbeiten sollen. Es wird
    // zuerst gebaut, damit der Hauptteil mit der tatsächlichen Restzeit
    // rechnet statt mit einer Schätzung.
    const warmup = buildSupportBlock(tpl.warmup || WARMUP_POOL, warmupCount, allowed, 40);
    const warmupSec = warmup.reduce((s, it) => s + itemTimeSec(it), 0);
    // Für den Ausklang wird der ungünstigste Fall reserviert (Dehnübung je
    // Seite inkl. Seitenwechsel) – er kann danach nur billiger ausfallen.
    const cooldownSec = cooldownCount * (30 * 2 + SIDE_SWITCH_SEC + 20);
    const mainBudget = Math.max(300, totalSec - warmupSec - cooldownSec);

    let pool = allowed.filter(tpl.filter);
    let muscles = tpl.muscles;
    if (!withCore && CORE_ALTERNATING.includes(tplId)) {
      pool = pool.filter((ex) => !isCoreFocus(ex));
      muscles = muscles.filter((m) => m !== 'core');
    }

    // Freie Zeit darf in zusätzliche Sätze fließen – beim Muskelaufbau
    // etwas großzügiger, weil dort das Satzvolumen den Reiz setzt.
    // Bis 4 Saetze pro Uebung ist der Reiz nachweislich wirksam; darueber
    // steigt vor allem die Ermuedung, nicht der Trainingseffekt.
    const maxSets = Math.min(4, params.sets + 1);
    const main = fillBlock(pool, mainBudget, params, profile, muscles, {
      maxItems: tpl.maxItems,
      limits: tpl.limits,
      maxSets,
    });

    const trained = new Set();
    main.forEach((it) => EXERCISE_BY_ID[it.exId].muscles.forEach((m) => trained.add(m)));
    const usedIds = new Set(main.map((it) => it.exId));
    const cooldown = buildSupportBlock(
      COOLDOWN_POOL.filter((id) => !usedIds.has(id)),
      cooldownCount, allowed, 30, trained
    );

    const estSec = [...warmup, ...main, ...cooldown].reduce((s, it) => s + itemTimeSec(it), 0);

    return {
      focus: tpl.name,
      emoji: tpl.emoji,
      blocks: { warmup, main, cooldown },
      estMinutes: Math.round(estSec / 60),
    };
  }

  // ------------------------------------------------------------------
  // Wochenplan
  // ------------------------------------------------------------------
  function generatePlan(profile) {
    const params = adjustParams(profile, GOAL_PARAMS[profile.goal] || GOAL_PARAMS.fitness);
    const templates = weekTemplates(profile.goal, profile.days);

    const schedule = WEEK_SCHEDULES[profile.days] || WEEKDAYS.slice(0, profile.days);

    const days = templates.map((tplId, i) => Object.assign(
      // Bauch nur an jedem zweiten Trainingstag – auch er regeneriert
      buildSession(tplId, profile, params, profile.minutes, { withCore: i % 2 === 0 }),
      { name: `Tag ${i + 1}`, weekday: schedule[i] }
    ));

    return {
      createdAt: new Date().toISOString(),
      goal: profile.goal,
      days,
    };
  }

  // ------------------------------------------------------------------
  // Einzel-Workouts mit Schwerpunkt (ohne Plan)
  // ------------------------------------------------------------------
  const QUICK_FOCUS = {
    hiit: { tpl: 'hiit', label: 'HIIT', emoji: '🔥' },
    cardio: { tpl: 'cardio_core', label: 'Cardio & Core', emoji: '🏃' },
    bauch: { tpl: 'bauch', label: 'Bauch', emoji: '💥' },
    ruecken: { tpl: 'ruecken', label: 'Rücken', emoji: '🛡️' },
    haltung: { tpl: 'haltung', label: 'Haltung', emoji: '🧍' },
    ganzkoerper: { tpl: 'ganzkoerper', label: 'Ganzkörper', emoji: '🏋️' },
    oberkoerper: { tpl: 'oberkoerper', label: 'Oberkörper', emoji: '💪' },
    unterkoerper: { tpl: 'unterkoerper', label: 'Beine & Po', emoji: '🦵' },
    mobility: { tpl: 'mobility', label: 'Mobility', emoji: '🧘' },
  };

  function generateQuickDay(profile, focusId) {
    const focus = QUICK_FOCUS[focusId] || QUICK_FOCUS.ganzkoerper;

    let base;
    if (focusId === 'hiit') {
      // Klassisches Intervallformat: 30 s Belastung, 15 s Pause, 2 Runden
      base = { sets: 2, reps: null, restSec: 15, workSec: 30, forceSec: 30 };
    } else if (focusId === 'cardio') {
      base = GOAL_PARAMS.ausdauer;
    } else if (focusId === 'mobility') {
      base = GOAL_PARAMS.beweglichkeit;
    } else if (focusId === 'ruecken') {
      base = GOAL_PARAMS.ruecken;
    } else if (focusId === 'haltung') {
      base = GOAL_PARAMS.haltung;
    } else {
      base = profile.goal === 'muskelaufbau' ? GOAL_PARAMS.muskelaufbau : GOAL_PARAMS.fitness;
    }

    const params = adjustParams(profile, base);
    const day = buildSession(focus.tpl, profile, params, profile.minutes);
    day.name = 'Einzel-Workout';
    return day;
  }

  global.FitPlanner = {
    generatePlan, generateQuickDay, GOALS, LEVELS, GOAL_PARAMS, QUICK_FOCUS, WEEKDAYS,
    SIDE_SWITCH_SEC,
  };
})(window);
