# Lockbox mit Vorhängeschloss (3D-Druck)

Abschließbarer Kasten für Schlüssel, Karten, Bargeld o. Ä. Zwei Druckteile,
**keine Stützstrukturen**, **keine Schrauben oder sonstige Hardware** – nur ein
handelsübliches Vorhängeschloss.

![Geschlossen](bilder/zu.png)

## Funktionsprinzip

Aus der Vorderwand des Kastens wächst ein durchgehender Riegel nach oben. Der
Deckel wird von oben darüber gestülpt, der Riegel ragt durch einen Schlitz in
der Deckelplatte hinaus. Durch das Loch im Riegel kommt der Schlossbügel – er
liegt dann quer über der Deckelplatte, und der Deckel lässt sich nicht mehr
abheben. Ohne Schloss lässt sich der Deckel einfach abziehen.

| | |
|---|---|
| ![Explosionsdarstellung](bilder/explo.png) | ![Drucklage](bilder/druck.png) |

## Dateien

| Datei | Inhalt |
|---|---|
| `lockbox_body.stl` / `.3mf` | Kasten (steht bereits in Drucklage) |
| `lockbox_lid.stl` / `.3mf` | Deckel (liegt bereits richtig herum: auf dem Rücken) |
| `lockbox.scad` | parametrisches Quellmodell (OpenSCAD) |
| `vorschau.scad` | erzeugt die Bilder oben, mit Schloss-Attrappe |

Beide STLs sind geprüft: geschlossene, mannigfaltige Volumenkörper („watertight"),
im geschlossenen Zustand kollisionsfrei.

## Maße (Standardeinstellung)

| | mm |
|---|---|
| Innenraum (B × T × H) | 80 × 55 × 50 |
| Kasten außen | 86 × 61 × 53 (mit Riegel 81 hoch) |
| Deckel außen | 92,6 × 67,6 × 20 |
| Gesamthöhe geschlossen | 58 (Riegelspitze 81) |
| Wand / Boden / Deckelplatte | 3 / 3 / 5 |
| Bügelloch | Ø 10 (als Tropfenform, druckt ohne Stütze) |
| Materialbedarf | ca. 75 + 43 cm³ ≈ 130–150 g PLA/PETG |

## Passendes Vorhängeschloss

* **Bügeldurchmesser max. 9 mm** (Loch ist Ø 10 mm).
* Bügel muss den 10 mm dicken Riegel umgreifen: praktisch jedes Schloss ab
  ca. 25–30 mm Breite passt.
* Dickerer Bügel? In `lockbox.scad` `buegel_d` erhöhen und `riegel_ueber`
  mitwachsen lassen (Faustregel: `riegel_ueber ≥ buegel_z + buegel_d`).
* Der Schlosskörper hängt nach vorn über die Deckelkante – bei kleinen
  Schlössern liegt er leicht auf dem Deckel auf. Das ist normal und stört nicht.

## Druckempfehlung

| Einstellung | Wert |
|---|---|
| Material | **PETG oder ASA** (zäh, UV-/temperaturfest). PLA nur innen. |
| Schichthöhe | 0,2 mm |
| Perimeter/Wandlinien | **5** (wichtiger als Infill!) |
| Boden-/Deckschichten | 5 |
| Infill | 40 %, Gyroid oder Kubisch |
| Stützen | **keine** – beide Teile sind so orientiert, dass nichts überhängt |
| Orientierung | genau so, wie die Dateien geladen werden: Kasten aufrecht, Deckel auf dem Rücken |
| Druckzeit | grob 6–9 h (Kasten) + 2–3 h (Deckel) |

Der Riegel wird beim Aufhebeln auf Zug zwischen den Schichten belastet – das ist
die schwächste Richtung beim FDM-Druck. Deshalb: viele Perimeter, ordentliche
Schichthaftung (Lüfter bei PETG runter), und lieber keine spröden Materialien.

## Zusammenbau / Montage

1. Deckel gerade von oben aufsetzen, bis er auf dem Rand aufliegt.
2. Bügel durch das Riegelloch stecken, Schloss zudrücken. Fertig.

**Wandmontage:** In der Rückwand sitzen drei Schraublöcher (Ø 5 mm, innen
gesenkt) – zwei oben, eines unten mittig. Die Schrauben sind nur bei offenem
Deckel erreichbar, von außen kommt niemand dran. Zwei der Löcher liegen bei
geschlossenem Deckel zusätzlich hinter der Deckelschürze. Nicht gewünscht?
`wandmontage = false;` setzen und neu exportieren.

## Anpassen

Alle Maße stehen als Variablen am Anfang von `lockbox.scad`. Nach einer Änderung
neu exportieren (OpenSCAD, kostenlos):

```bash
openscad -D 'teil="body"' -o lockbox_body.stl lockbox.scad
openscad -D 'teil="lid"'  -o lockbox_lid.stl  lockbox.scad
```

Oder in der OpenSCAD-GUI öffnen (F5 Vorschau, F6 Render, dann Export as STL).

Häufige Anpassungen:

* **Größerer/kleinerer Innenraum:** `innen_b`, `innen_t`, `innen_h`
* **Deckel klemmt / sitzt zu locker:** `spiel` (0,2 straff … 0,4 locker)
* **Weniger Restspiel beim Anheben:** `buegel_z` verkleinern (min. ca.
  `buegel_d/2 + 2`); dann liegt der Schlosskörper aber näher am Deckel
* **Außeneinsatz:** `drainage = true;` (kleine Wasserabzugslöcher im Boden)
* **Dickere Wände:** `wand = 4;` – Innenmaße bleiben gleich, der Kasten wird außen größer

## Was das Ding leistet – und was nicht

Das ist ein **Gelegenheitsschutz**, kein Tresor. Ein gedruckter Kasten aus
Kunststoff hält neugierige Hände, Kinder und spontane Langfinger ab. Er hält
keinem ernsthaften Angriff mit Hebel, Akkuschrauber oder Hammer stand – und ein
billiges Vorhängeschloss ohnehin nicht.

Konkret sinnvoll: Schlüsselübergabe, Ferienwohnung, Werkstattfach, Gartenhaus,
Briefkasten-Ergänzung, abschließbare Box im gemeinsam genutzten Raum.
Nicht sinnvoll: Wertsachen, Bargeld in größerem Umfang, Waffen, Medikamente,
die sicher weggeschlossen gehören. Dafür gibt es zertifizierte Metallkassetten.

Wer es robuster will: dickere Wände (`wand = 5`), PETG/ASA statt PLA, den Kasten
fest an eine Wand schrauben (dann kann er nicht mitgenommen werden) und ein
Bügelschloss mit gehärtetem Bügel verwenden.
