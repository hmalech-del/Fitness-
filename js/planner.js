/* =====================================================================
 * FitPlan – Plangenerator
 * Baut aus dem Nutzerprofil (Ziel, Alter, Level, Zeit, Equipment)
 * einen dynamischen Wochenplan.
 * ===================================================================== */

(function (global) {
  'use strict';

  const GOALS = {
    muskelaufbau: { label: 'Muskelaufbau', emoji: '💪' },
    abnehmen: { label: 'Abnehmen', emoji: '🔥' },
    ausdauer: { label: 'Ausdauer', emoji: '🏃' },
    beweglichkeit: { label: 'Beweglichkeit', emoji: '🧘' },
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
    muskelaufbau: { sets: 3, reps: '8–12', restSec: 75, workSec: 40 },
    abnehmen: { sets: 3, reps: '12–15', restSec: 30, workSec: 45 },
    ausdauer: { sets: 3, reps: '15–20', restSec: 25, workSec: 45 },
    beweglichkeit: { sets: 2, reps: null, restSec: 15, workSec: 35 },
    fitness: { sets: 3, reps: '10–12', restSec: 50, workSec: 40 },
  };

  const WARMUP_POOL = ['march', 'jumping_jack', 'shoulder_mob', 'high_knees', 'squat'];
  const COOLDOWN_POOL = ['forward_fold', 'quad_stretch', 'cat_cow', 'lunge_stretch', 'shoulder_mob'];

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

  function itemTimeSec(item) {
    const work = item.seconds || item.workSec || 40;
    return item.sets * work + (item.sets - 1) * item.restSec + 20; // +20s Übergang
  }

  function makeItem(ex, params, profile) {
    const item = { exId: ex.id, sets: params.sets, restSec: params.restSec, workSec: params.workSec };
    if (ex.mode === 'time' || !params.reps) {
      let sec = ex.holdSec || 30;
      if (profile.level === 'profi') sec = Math.round(sec * 1.3);
      if (profile.level === 'anfaenger') sec = Math.round(sec * 0.85);
      item.seconds = Math.max(15, Math.round(sec / 5) * 5);
    } else {
      item.reps = params.reps;
    }
    return item;
  }

  // Wählt aus dem Pool Übungen, bis das Zeitbudget erschöpft ist.
  // preferredMuscles sorgt für ausgewogene Muskelabdeckung.
  // Hat der Nutzer Equipment, werden Übungen damit bevorzugt.
  function fillBlock(pool, budgetSec, params, profile, preferredMuscles) {
    const items = [];
    let remaining = budgetSec;
    const hasEquipment = profile.equipment.some((e) => e === 'kurzhanteln' || e === 'band');
    let candidates = shuffle(pool);
    if (hasEquipment) {
      candidates = candidates
        .map((ex) => ({ ex, score: (ex.equipment === 'none' ? 1 : 0) + Math.random() * 0.9 }))
        .sort((a, b) => a.score - b.score)
        .map((c) => c.ex);
    }

    // Zuerst je eine Übung pro gewünschter Muskelgruppe
    // (bei vorhandenem Equipment bevorzugt die Geräte-Variante)
    (preferredMuscles || []).forEach((muscle) => {
      let idx = -1;
      if (hasEquipment) {
        idx = candidates.findIndex((ex) => ex.muscles.includes(muscle) && ex.equipment !== 'none');
      }
      if (idx === -1) idx = candidates.findIndex((ex) => ex.muscles.includes(muscle));
      if (idx === -1) return;
      const ex = candidates.splice(idx, 1)[0];
      const item = makeItem(ex, params, profile);
      const t = itemTimeSec(item);
      if (t <= remaining) {
        items.push(item);
        remaining -= t;
      }
    });

    // Dann auffüllen
    for (const ex of candidates) {
      if (remaining < 60) break;
      if (items.some((it) => it.exId === ex.id)) continue;
      const item = makeItem(ex, params, profile);
      const t = itemTimeSec(item);
      if (t <= remaining) {
        items.push(item);
        remaining -= t;
      }
    }
    return items;
  }

  function buildSupportBlock(poolIds, count, allowed, seconds) {
    const allowedIds = new Set(allowed.map((e) => e.id));
    const pool = shuffle(poolIds.filter((id) => allowedIds.has(id)));
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
      muscles: ['beine', 'brust', 'ruecken', 'core'],
    },
    oberkoerper: {
      name: 'Oberkörper', emoji: '💪',
      filter: (ex) => ex.category === 'kraft' && ex.muscles.some((m) => ['brust', 'ruecken', 'schultern', 'arme', 'core'].includes(m)) && !ex.muscles.includes('beine'),
      muscles: ['brust', 'ruecken', 'schultern', 'arme'],
    },
    unterkoerper: {
      name: 'Unterkörper & Po', emoji: '🦵',
      filter: (ex) => ex.category === 'kraft' && ex.muscles.some((m) => ['beine', 'po'].includes(m)),
      muscles: ['beine', 'po', 'core'],
    },
    zirkel: {
      name: 'Ganzkörper-Zirkel', emoji: '🔥',
      filter: (ex) => ex.category === 'kraft' || ex.category === 'cardio',
      muscles: ['beine', 'cardio', 'brust', 'core'],
    },
    cardio_core: {
      name: 'Cardio & Core', emoji: '🏃',
      filter: (ex) => ex.category === 'cardio' || (ex.category === 'kraft' && ex.muscles.includes('core')),
      muscles: ['cardio', 'core', 'cardio'],
    },
    mobility: {
      name: 'Mobility & Dehnung', emoji: '🧘',
      filter: (ex) => ex.category === 'mobility' || ['birddog', 'superman', 'glute_bridge'].includes(ex.id),
      muscles: ['ruecken', 'beine', 'schultern'],
    },
  };

  // Wochenstruktur je Ziel und Trainingstagen
  function weekTemplates(goal, days) {
    const seq = [];
    if (goal === 'beweglichkeit') {
      for (let i = 0; i < days; i++) seq.push(i % 3 === 2 ? 'ganzkoerper' : 'mobility');
    } else if (goal === 'ausdauer') {
      for (let i = 0; i < days; i++) seq.push(i % 3 === 2 ? 'zirkel' : 'cardio_core');
    } else if (goal === 'abnehmen') {
      for (let i = 0; i < days; i++) seq.push(i % 2 === 0 ? 'zirkel' : 'cardio_core');
    } else if (goal === 'muskelaufbau' && days >= 4) {
      const split = ['oberkoerper', 'unterkoerper'];
      for (let i = 0; i < days; i++) seq.push(i === 4 && days === 5 ? 'ganzkoerper' : split[i % 2]);
    } else if (goal === 'muskelaufbau') {
      for (let i = 0; i < days; i++) seq.push('ganzkoerper');
    } else {
      // Allgemeine Fitness: Mischung
      const mix = days >= 3 ? ['ganzkoerper', 'cardio_core', 'ganzkoerper', 'mobility', 'zirkel', 'cardio_core'] : ['ganzkoerper', 'zirkel'];
      for (let i = 0; i < days; i++) seq.push(mix[i % mix.length]);
    }
    return seq;
  }

  // ------------------------------------------------------------------
  // Hauptfunktion
  // ------------------------------------------------------------------
  function generatePlan(profile) {
    const allowed = allowedExercises(profile);
    const params = Object.assign({}, GOAL_PARAMS[profile.goal] || GOAL_PARAMS.fitness);

    // Anpassungen
    if (profile.level === 'anfaenger') params.sets = Math.max(2, params.sets - 1);
    if (profile.level === 'profi' && profile.goal === 'muskelaufbau') params.sets += 1;
    if (profile.age >= 65) {
      params.sets = Math.max(2, params.sets - 1);
      params.restSec += 15;
    }

    const totalSec = profile.minutes * 60;
    // Ältere Trainierende: etwas längeres Aufwärmen
    const warmupCount = profile.minutes <= 20 ? 1 : profile.age >= 55 ? 3 : 2;
    const cooldownCount = profile.minutes <= 20 ? 1 : 2;
    const warmupSec = warmupCount * 55;
    const cooldownSec = cooldownCount * 45;
    const mainBudget = Math.max(300, totalSec - warmupSec - cooldownSec);

    const templates = weekTemplates(profile.goal, profile.days);

    const days = templates.map((tplId, i) => {
      const tpl = DAY_TEMPLATES[tplId];
      const pool = allowed.filter(tpl.filter);
      const main = fillBlock(pool, mainBudget, params, profile, tpl.muscles);

      const warmup = buildSupportBlock(WARMUP_POOL, warmupCount, allowed, 40);
      const usedIds = new Set(main.map((it) => it.exId));
      const cooldown = buildSupportBlock(
        COOLDOWN_POOL.filter((id) => !usedIds.has(id)),
        cooldownCount, allowed, 30
      );

      const estSec = [...warmup, ...main, ...cooldown].reduce((s, it) => s + itemTimeSec(it), 0);

      return {
        name: `Tag ${i + 1}`,
        focus: tpl.name,
        emoji: tpl.emoji,
        blocks: { warmup, main, cooldown },
        estMinutes: Math.round(estSec / 60),
      };
    });

    return {
      createdAt: new Date().toISOString(),
      goal: profile.goal,
      days,
    };
  }

  global.FitPlanner = { generatePlan, GOALS, LEVELS, GOAL_PARAMS };
})(window);
