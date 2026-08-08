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
  - Wählt Übungen passend zu Ziel, Level und Equipment aus über 80 Übungen
    aus – vorhandenes Equipment (z. B. Kurzhanteln) wird bevorzugt eingesetzt.
  - Baut sinnvolle Wochen-Splits (Ganzkörper, Oberkörper/Unterkörper, Zirkel,
    Cardio & Core, Mobility) je nach Ziel und Trainingsfrequenz.
  - Füllt exakt das angegebene Zeitbudget (Aufwärmen → Hauptteil → Dehnen).
  - Altersgerechte Anpassung: ab 55 keine Sprungbelastung, längeres Aufwärmen,
    ab 65 reduziertes Volumen und mehr Pause.
  - **Regeneration**: Die Trainingstage werden mit Ruhetagen über die Woche
    verteilt, sodass zwischen zwei Einheiten mit demselben Zielmuskel
    mindestens 48 Stunden liegen. Muskelgruppen kommen dadurch auf die für
    Muskelaufbau empfohlenen 2–3 Einheiten pro Woche. Der Bauch wird an
    jedem zweiten Trainingstag trainiert.
  - **Volumen statt Übungsflut**: höchstens sechs Hauptübungen pro Einheit
    (bei Haltungs- und Mobility-Tagen fünf); freie Zeit fließt in zusätzliche
    Sätze statt in weitere Übungen. Pro Unterkörper-Tag ist nur eine
    hüftdominante Übung erlaubt, damit der untere Rücken nicht mehrfach
    belastet wird. Eine Übung und ihre eigene schwerere Variante kommen nie
    in dieselbe Einheit.
- **Animationen für jede Übung**: SVG-Strichfiguren mit weich interpolierten
  Bewegungsabläufen (SMIL) – inklusive Requisiten wie Kurzhanteln, Bändern,
  Wand, Stuhl und Tischkante. Übungen, deren Bewegung von der Seite nicht
  erkennbar ist (Rotationen, Y-T-W-Stellungen), werden von vorn oder von
  oben gezeigt.
- **Progression**: Die App führt Buch, was du bei jeder Übung geschafft hast,
  und steigert nach dem Modell der doppelten Progression: erst
  Wiederholungen innerhalb des Zielbereichs, dann Last erhöhen bzw. auf die
  schwerere Variante wechseln und wieder unten beginnen. Wie schnell
  automatisch gesteigert wird, hängt vom Trainingsstand ab (Einsteiger jede
  Einheit, Fortgeschrittene alle zwei, Erfahrene alle drei). Nach dem
  Training gibt es eine **optionale** Rückmeldung („zu schwer" bis „deutlich
  zu leicht"), wahlweise für die ganze Einheit oder einzelne Übungen – wer
  nichts angibt, bekommt einfach die automatische Steigerung.
- **Workout-Player**: Führt Satz für Satz durch das Training, mit
  Countdown-Timern für Halte-/Cardio-Übungen und automatischen Pausen.
  Einseitige Halteübungen (z. B. Seitstütz) laufen als zwei getrennte
  Durchgänge mit einer kurzen Umbaupause dazwischen – der Seitenwechsel
  geht nicht von der Haltezeit ab, beide Seiten werden gleich lang belastet.
- **Ansagen & Klänge**: Sprachansagen (Web Speech API, Deutsch) sagen die
  nächste Übung, Satz und Vorgabe an – auf Wunsch inklusive der
  Ausführungsbeschreibung (💬-Knopf). Synthetisierte Signaltöne markieren
  Start, die letzten drei Sekunden und das Ende von Intervallen; sie laufen
  über den Medien-Kanal (auch bei iOS-Stummschalter hörbar) und sind per
  🔊-Knopf abschaltbar – ganz ohne Audiodateien.
- **Tägliche Haltungs-Routine**: Ein fester Ablauf von fünf Übungen
  (ca. 8 Minuten, ohne Geräte) für Tage ohne Trainingseinheit – bewusst
  jedes Mal identisch, weil Haltung über Wiederholung eines gleichbleibenden
  Ablaufs korrigiert wird und nicht über Abwechslung. Funktioniert auch im
  Hotelzimmer.
- **Empfehlungen**: Fehlt Equipment, das für das gewählte Ziel viel bringen
  würde, nennt die App auf dem Planbildschirm die konkrete Zahl der
  Übungen, die damit dazukämen – ohne zu drängen.
- **Einzel-Workouts**: Ohne Plan sofort loslegen – Schwerpunkt wählen
  (HIIT, Cardio & Core, Bauch, Ganzkörper, Oberkörper, Beine & Po,
  Mobility) und starten. HIIT nutzt ein Intervallformat (30 s Belastung,
  15 s Pause).
- **Mehrere Pläne parallel**: Beliebig viele Trainingspläne anlegen (z. B.
  Muskelaufbau und Ausdauer) und per Chip-Leiste umschalten.
- **Designs**: Vier Farbwelten, per 🎨-Knopf umschaltbar und gespeichert –
  *Studio* (hell, Salbeigrün), *Loft* (hell, Beton & Pflanzen), *Neon*
  (dunkel, Cyberpunk) und *Iron* (dunkel, Beton, Stahl & warmes Licht).
  Jedes Design bringt sein eigenes Titel-/Hintergrundbild und färbt auch
  die Übungsfiguren passend ein.
- **Fortschritt**: Abgeschlossene Workouts und Trainingsminuten werden
  gespeichert; jede Tageskarte zeigt, wie oft und wann zuletzt sie
  absolviert wurde. Alles lokal (LocalStorage) – keine Anmeldung, keine
  Server.

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
