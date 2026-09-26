---
name: fdm-teil
description: Konstruieren und Prüfen von 3D-Druckteilen (OpenSCAD + FDM). Vor jeder Ausgabe einer STL/3MF anwenden, und immer wenn ein gedrucktes Teil gebrochen ist, klemmt, nicht passt oder nicht hält. Enthält die Prüfschleife (dicht, Durchdringung, Überhang in Drucklage), eine Bruch-Checkliste, Messrezepte für Querschnitt/Widerstandsmoment/Passungsspalt und die OpenSCAD-Fallen, die in diesem Repo schon einmal Teile zerstört haben.
---

# FDM-Teile konstruieren und prüfen

Gilt für jedes Teil, das gedruckt werden soll. Die Regel ist einfach: **keine STL
herausgeben, die nicht durch die Prüfschleife gelaufen ist.** Rechnen ist billig,
ein Fehldruck kostet Stunden.

## 1. Prüfschleife — immer, vor jeder Ausgabe

```bash
xvfb-run -a openscad -o teil.stl -D 'teil="x"' modell.scad 2>&1 | grep -E "Simple|WARNING|ERROR"
python3 scripts/pruefteil.py check teil.stl
```

Bestanden heißt: `Simple: yes`, **keine** WARNING, 0 offene Kanten, und der
Überhangbericht enthält keine Fläche, die in der Luft anfängt.

Bei gepaarten Teilen zusätzlich, im **geschlossenen** Zustand (nicht in Drucklage):

```bash
python3 scripts/pruefteil.py fit kasten.stl deckel.stl
```

Soll 0,000 mm³ sein. Alles andere ist eine Kollision.

### Überhang richtig messen

Die Analyse läuft **in Drucklage**, also an der exportierten Datei, nicht am
Modell in Einbaulage. Und: die Fläche auf dem Druckbett muss herausmaskiert
werden, sonst meldet das Skript Unsinn (hier schon passiert: 3269 statt 486 mm²).
`pruefteil.py` macht das; bei eigenen Skripten `c[:,2] > z_min + 0.3` nicht
vergessen. Schwelle: `n_z < -0.72` ≈ steiler als 45°.

## 2. Bruch-Checkliste — bei jedem tragenden Feature

Diese fünf Fragen haben in diesem Repo jeweils ein Teil gekostet, bevor sie auf
der Liste standen:

1. **Fängt etwas in der Luft an?** Eine waagerechte, nach unten zeigende Fläche
   über dem Bett, unter der nichts liegt, wird ins Leere gedruckt. Die ersten
   Lagen sind hängende Fäden, und genau dort reißt es ab.
   → `pruefteil.py check` meldet das unter „in der Luft".
   *Fall: NFC-Öse, 67 mm² bei 5,3 mm Höhe → abgebrochen.*
2. **Liegt die Last quer zu den Lagen?** Ein Ausleger, dessen Balkenachse in
   Druckrichtung z zeigt, wird bei Seitenlast über die Schichtgrenzen gebogen.
   Dann mit **26 MPa** rechnen, nicht mit 45.
   *Fall: Deckellasche der Lockbox, Bruch bei 5,5 kg.*
3. **Liegt der Aufhängepunkt über dem Schwerpunkt?** Sonst kippt das Teil am
   Band durch. Schwerpunkt inkl. Einbauten rechnen, nicht nur die Schale.
4. **Gibt es eine große parallele Gleitfläche?** Ab etwa 1000 mm² genügt eine
   lokale Abweichung, und die Passung klemmt unlösbar. Nicht mit mehr Spiel
   beantworten (verschiebt nur die Schwelle) — Fläche reduzieren: schmale
   Führungsrippen, Ecken freistellen.
   *Fall: Schlüsselsafe, 3940 mm² → Deckel ging nicht mehr ab.*
5. **Schmaler Querschnitt am langen Hebel?** Widerstandsmoment messen, nicht
   schätzen (Rezept unten). Verbreitern lässt sich fast immer dort, wo nichts
   im Weg ist — am Fuß, nicht an der Funktionsfläche.

Verstärken ohne Überhang: **in senkrechten Flächen verjüngen.** Ein Steg, der an
der Wand breit ist und zur Funktionsstelle hin schmal wird, kostet null mm²
Überhang, solange die Verjüngung in z-parallelen Flächen liegt. Muss die Höhe
mitlaufen, hart auf 45° ab der Bauteiloberkante beschneiden.

## 3. Messrezepte

Alles über `scripts/pruefteil.py`:

| Frage | Aufruf |
|---|---|
| Dicht, Maße, Überhang, Luftstart | `check teil.stl` |
| Kollidieren zwei Teile? | `fit a.stl b.stl` |
| Querschnitt + Widerstandsmoment | `sect teil.stl --plane z --at 22.5 [--clip x>0]` |
| Verlauf entlang einer Achse | `scan teil.stl --plane z --from 5 --to 34` |
| Passungsspalt an einer Stelle | `probe gegenstueck.stl --at X Y Z --dir 0 1 0` |
| Tragende Kontaktfläche einer Passung | Hülle um Teil A um `spiel+0,1` aufdicken, mit B verschneiden, Volumen / 0,1 |

Faustwerte PETG: 45 MPa längs der Lage, **26 MPa quer**, E ≈ 1800 MPa,
Dichte 1,27 g/cm³, Bruchzähigkeit ≈ 5 kJ/m².

## 4. OpenSCAD-Fallen

* **Keine Variablen-Hoisting.** Eine Variable, die weiter unten zugewiesen wird,
  ist oben `undef` — mit `WARNING: Ignoring unknown variable`. Parameter immer
  vor ihrer ersten Benutzung definieren.
* **`linear_extrude` und damit `rbox` extrudieren ab z = 0**, nicht zentriert.
  `translate([x,y,mitte]) rbox(...,h,...)` setzt das Teil um h/2 zu hoch.
* **Features nach dem `difference()` vereinigen.** Was vorher unioniert wird,
  frisst der Hohlraum wieder auf. Gilt für Rippen, Stege, Nasen.
* **Fasenschnitte an der Oberkante** knabbern an Anbauten, die weiter außen
  liegen. Anbau dann erst nach der `difference()` dazu-unionieren.
* **Entartete Rundungen**: `offset(r)` mit `r ≥ halbe Kantenlänge` löscht stumm
  Geometrie. `r = min(r0, t/2-0.4, b/2-0.4)` klemmen und auf `max(..., 0.01)`.
* **Drucklage kehrt z um.** Nach `rotate([180,0,0])` wird aus „oben" im Modell
  „unten" im Druck. Tropfenlöcher, Fasen und Rampen entsprechend prüfen —
  und zwar an der exportierten Datei.
* `assert()` und `echo()` für Plausibilität nutzen; sie laufen beim Export mit.

## 5. Konstruktionsregeln

* 45° Überhanggrenze, waagerechte Bohrungen als Tropfen (Spitze in Drucklage
  nach oben).
* Stützmaterial ist kein Ersatz für Geometrie: unter einer tragenden Struktur
  erzeugt Support genau die schlechte Grenzfläche, an der es später bricht.
* Elefantenfuß an der ersten Lage einplanen, Passflächen nicht auf z = 0 legen.
* Print in place nur mit ≥ 0,4 mm Fuge.
* Projektstand (Maße, Varianten, Druckempfehlung) gehört in den README neben die
  `.scad`, nicht in diesen Skill.
