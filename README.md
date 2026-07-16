# 💪 FitPlan – Dein dynamischer Trainingsplan

FitPlan ist eine leichtgewichtige Fitness-Web-App, die aus wenigen Fragen einen
persönlichen Wochen-Trainingsplan erstellt – inklusive animierter Übungsfiguren
und einem geführten Workout-Player mit Timer.

## ✨ Features

- **Onboarding-Fragebogen**: Ziel (Muskelaufbau, Abnehmen, Ausdauer,
  Beweglichkeit, allgemeine Fitness), Alter, Fitnesslevel, Zeit pro Einheit,
  Trainingstage pro Woche und verfügbares Equipment (Kurzhanteln,
  Widerstandsbänder, Matte).
- **Dynamischer Plangenerator**:
  - Wählt Übungen passend zu Ziel, Level und Equipment aus über 50 Übungen
    aus – vorhandenes Equipment (z. B. Kurzhanteln) wird bevorzugt eingesetzt.
  - Baut sinnvolle Wochen-Splits (Ganzkörper, Oberkörper/Unterkörper, Zirkel,
    Cardio & Core, Mobility) je nach Ziel und Trainingsfrequenz.
  - Füllt exakt das angegebene Zeitbudget (Aufwärmen → Hauptteil → Dehnen).
  - Altersgerechte Anpassung: ab 55 keine Sprungbelastung, längeres Aufwärmen,
    ab 65 reduziertes Volumen und mehr Pause.
- **Animationen für jede Übung**: SVG-Strichfiguren mit weich interpolierten
  Bewegungsabläufen (SMIL) – inklusive Requisiten wie Kurzhanteln und Bändern.
- **Workout-Player**: Führt Satz für Satz durch das Training, mit
  Countdown-Timern für Halte-/Cardio-Übungen und automatischen Pausen.
- **Fortschritt**: Abgeschlossene Workouts und Trainingsminuten werden lokal
  gespeichert (LocalStorage) – keine Anmeldung, keine Server.

## 🚀 Starten

Es gibt keinen Build-Schritt – einfach `index.html` im Browser öffnen, oder
lokal einen kleinen Server starten:

```bash
# Variante 1: Python
python3 -m http.server 8000

# Variante 2: Node
npx serve .
```

Dann <http://localhost:8000> öffnen. Die App eignet sich auch perfekt für
**GitHub Pages** (Settings → Pages → Branch auswählen).

## 🗂️ Struktur

```
index.html          – App-Gerüst (alle Screens)
css/style.css       – Styling (dunkles, responsives Design)
js/animations.js    – SVG-Animations-Engine + Posen aller Übungen
js/exercises.js     – Übungsdatenbank (Equipment, Muskeln, Level, Modus)
js/planner.js       – Plangenerator (Splits, Sätze/Wdh., Zeitbudget)
js/app.js           – UI-Logik: Wizard, Planansicht, Workout-Player
```

## 🧩 Übungen erweitern

Neue Übung in `js/exercises.js` ergänzen und entweder eine vorhandene
Animation (`anim`-Schlüssel) wiederverwenden oder in `js/animations.js` eine
neue Posen-Sequenz definieren – eine Pose ist einfach ein Satz von
Gelenkkoordinaten, zwischen denen die Engine automatisch weich animiert.

## ⚠️ Hinweis

FitPlan ersetzt keine ärztliche oder trainingswissenschaftliche Beratung.
Bei gesundheitlichen Einschränkungen vor Trainingsbeginn ärztlichen Rat einholen.
