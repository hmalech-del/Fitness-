# Schlüsselsafe zur Selbstdisziplinierung (3D-Druck)

Zwei Druckteile, kein Zubehör außer einem Vorhängeschloss, **keine Stützstrukturen**,
keine Schrauben, keine Montagelöcher.

![Geschlossen](bilder/zu.png)

## Andere Aufgabe, anderes Design

Gegen Gelegenheitsdiebe reicht ein Kasten mit Deckel. Hier ist der „Angreifer" aber
der Besitzer selbst: mit Zeit, Werkzeug, Motivation und dem Wissen, wie die Box
gebaut ist. Dagegen hilft nicht mehr Material, sondern eine Geometrie, an der
Hebeln nichts bringt. Deshalb ist das Design komplett neu:

**1. Echte Überfalle statt Riegel durch den Deckel.**
Je eine Lasche an Kasten und Deckel stehen **nebeneinander** an der Vorderwand,
die Löcher fluchten. Der Schlossbügel liegt damit auf **Scherung** zwischen beiden
Laschen – die stabilste Art, Kunststoff zu belasten. Das Schloss hängt frei vor der
Wand, nichts liegt auf dem Deckel.

**2. Der Deckel hat keine Öffnung mehr.**
In der ersten Version ragte der Riegel durch einen Schlitz im Deckel. Jeder Schlitz
ist ein Angriffspunkt für Draht, Klinge oder Schraubendreher. Jetzt ist der Deckel
eine geschlossene Platte – der einzige Zugang ist die 0,3-mm-Fuge.

**3. Labyrinthfuge statt einfacher Auflage.**
Der Deckel greift 20 mm **außen** über den Kasten *und* 6 mm **innen** hinein. Der
Kastenrand steckt also in einer Nut. Es gibt keinen geraden Weg nach innen und der
Deckel kann nicht verkanten:

![Querschnitt](bilder/quer.png)

**4. Fast kein Spiel.**
Die Lochmitte sitzt nur knapp unter der Fuge, das Loch ist nur 1 mm größer als der
Bügel. Gemessen am Modell: Der Deckel lässt sich **0,8 mm** anheben, dann steht die
Deckellasche am Bügel an. Hinten hochkippen geht bis **ca. 1 mm**, dann klemmt die
Schürze am Kasten. Es entsteht also gar kein Spalt, in den ein Werkzeug passt.

**5. Langer Hebelarm für das Schloss.**
Die Verriegelung sitzt 30 mm unter der Deckeloberkante. Wer den Deckel hinten
anhebt, dreht ihn um seine Vorderkante – und muss dabei gegen die Lasche arbeiten,
nicht gegen einen Punkt direkt daneben.

**6. Keine Angriffskante.**
Die untere Schürzenkante ist angefast, alle senkrechten Kanten sind gerundet. Es
gibt keine vorstehende Lippe, unter die ein Schraubendreher greift.

| | |
|---|---|
| ![Explosionsdarstellung](bilder/explo.png) | ![Drucklage](bilder/druck.png) |

## Dateien

| Datei | Inhalt |
|---|---|
| `safe_kasten.stl` / `.3mf` | Kasten (steht bereits in Drucklage) |
| `safe_deckel.stl` / `.3mf` | Deckel (liegt bereits auf dem Rücken) |
| `schluesselsafe.scad` | parametrisches Quellmodell (OpenSCAD) |
| `vorschau.scad` | erzeugt die Bilder oben |

## Maße

| | mm |
|---|---|
| Innenraum (B × T × H) | 80 × 45 × 68 |
| Kasten außen | 88 × 53 × 72, mit Lasche 72 tief |
| Deckel außen | 94,6 × 59,6, Schürze 20 hoch |
| Gesamthöhe geschlossen | 77 |
| Wand / Boden / Deckelplatte | 4 / 4 / 5 |
| Bügelloch | Ø 9, Mitte 40 über der Standfläche |
| Materialbedarf | 94 + 51 cm³ ≈ 180 g |

Der Innenraum nimmt mehrere Schlüsselbunde samt Autoschlüssel mit Fernbedienung auf.
Für ein Smartphone `innen_b = 170` setzen.

## Passendes Vorhängeschloss

* **Lichte Bügelweite mindestens 17 mm** – die beiden Laschen sind zusammen 15,6 mm
  breit. Ein übliches 40-mm-Bügelschloss passt, ein kleines 20-mm-Schloss nicht.
* **Bügeldurchmesser max. 8 mm.**
* Bei einem 40-mm-Schloss hängt der Schlosskörper seitlich vor der Vorderwand und
  endet ca. 10 mm über der Standfläche.

Für den eigentlichen Zweck zählt ohnehin weniger das Schloss als die Frage, wer den
Schlüssel hat: ein Zahlenschloss mit Code, den jemand anders gesetzt hat, ein
Zeitschloss, oder schlicht der Schlüssel bei einer anderen Person. Ein Schloss, dessen
Schlüssel in der Schublade liegt, ist nur Dekoration.

## Druckempfehlung

| Einstellung | Wert |
|---|---|
| Material | **PETG** (zäh, gute Schichthaftung). PLA geht, bricht aber spröder. |
| Schichthöhe | 0,2 mm |
| Perimeter | **5** – wichtiger als Infill |
| Boden-/Deckschichten | 5 |
| Infill | 40 % |
| Stützen | **keine** (geprüft: kritische Überhangfläche 3 mm² von 40 000 mm²) |
| Orientierung | genau so laden, wie die Dateien sind |
| Druckzeit | grob 9–12 h (Kasten) + 4–6 h (Deckel) |

Zwei Dinge sind beim Deckel wichtig: Die Lasche steht als schmale Säule ganz oben im
Druck. Mindestschichtzeit auf ca. 10 s stellen (oder mehrere Teile gleichzeitig
drucken), sonst wird die Schichthaftung genau dort schlecht, wo die ganze Last
hängt. Und die Schichten liegen quer zur Zugrichtung – deshalb PETG, viele
Perimeter und kein heruntergedrehter Lüfter.

Rechnerisch trägt der Laschenquerschnitt (67 mm² in der Lochebene) bei
konservativen 20 MPa Schichthaftung etwa **1,3 kN**, also gut 130 kg Zug. Von Hand
bekommt man das nicht auf.

## Anpassen

Alle Maße stehen oben in `schluesselsafe.scad`:

```bash
openscad -D 'teil="kasten"' -o safe_kasten.stl schluesselsafe.scad
openscad -D 'teil="deckel"' -o safe_deckel.stl schluesselsafe.scad
```

* **Andere Größe:** `innen_b`, `innen_t`, `innen_h`. Die Überfalle rückt automatisch
  mit, sie sitzt immer direkt unter der Fuge.
* **Deckel klemmt / sitzt locker:** `spiel` (0,2 straff … 0,4 locker)
* **Kleineres Schloss:** `lasche_b` verkleinern (beide Laschen zusammen plus 1,6 mm
  müssen durch den Bügel passen)
* **Noch mehr Hebelschutz:** `schuerze_h = 25`, `wand = 5`
* **Doch Wandmontage:** `wandmontage = true` (Schrauben sind nur bei offenem Deckel
  erreichbar). Angeschraubt kann der Safe nicht „kurz mit in die Werkstatt".
* **Außeneinsatz:** `drainage = true`

## Was das Ding leistet – und was nicht

Es ist eine **Verzögerung, kein Tresor**, und das ist bei diesem Einsatzzweck genau
richtig: Der Impuls soll teurer werden als das, was er bringt. Aufhebeln, wackeln,
am Deckel ziehen, mit dem Schraubendreher in der Fuge stochern – das führt bei
diesem Design zu nichts, dafür ist es gebaut.

Wer mit Akkuschrauber, Säge oder Hammer rangeht, ist in zwei Minuten drin. Das lässt
sich mit gedrucktem Kunststoff nicht verhindern. Genau darin liegt aber der Trick:
Diese zwei Minuten sind laut, hinterlassen Trümmer und kosten einen neuen Druck von
über zehn Stunden. Genau diese Hürde soll der Safe sein.

Und ein praktischer Hinweis: Nichts einschließen, was in einer Notlage sofort
gebraucht wird – Autoschlüssel, wenn kein zweiter existiert, Medikamente, Ausweise.
Ein zweiter Schlüssel bei einer Vertrauensperson ist keine Schwäche des Konzepts,
sondern die Voraussetzung dafür, dass man es entspannt benutzen kann.
