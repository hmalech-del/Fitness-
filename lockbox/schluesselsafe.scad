// =====================================================================
//  Schluesselsafe zur Selbstdisziplinierung  -  v2
//  ------------------------------------------------------------------
//  Zwei Druckteile, kein Zubehoer ausser einem Vorhaengeschloss.
//
//  Verriegelung als echte Ueberfalle: je eine Lasche am Kasten und am
//  Deckel stehen NEBENEINANDER an der Vorderseite, die Loecher fluchten.
//  Der Schlossbuegel liegt damit auf Scherung zwischen beiden Laschen -
//  das Schloss haengt frei vor dem Kasten, nichts liegt auf dem Deckel.
//
//  Hebelschutz:
//   * Deckel greift 20 mm aussen ueber den Kasten UND 6 mm innen hinein
//     (Labyrinthfuge - kein gerader Weg nach innen, kein Verkanten)
//   * Restspiel beim Anheben < 1 mm, es entsteht also gar kein Spalt
//   * Verriegelung sitzt tief unten an der Front: langer Hebelarm gegen
//     Aufkippen des Deckels
//   * Deckel hat keinerlei Oeffnung - nichts, wo ein Draht hineinpasst
//   * Untere Schuerzenkante angefast, damit kein Werkzeug untergreift
//
//  Alle Masse in mm.
//     openscad -D teil=\"kasten\" -o kasten.stl schluesselsafe.scad
//     openscad -D teil=\"deckel\" -o deckel.stl schluesselsafe.scad
// =====================================================================

/* [Was soll erzeugt werden] */
teil     = "beides";   // "kasten", "deckel", "beides" (Vorschau) oder "keins"
variante = "gross";    // "gross" (hoher Kasten) oder "kompakt" (flache Kassette)

k = (variante == "kompakt");

/* [Innenmasse des Stauraums] */
innen_b = 80;               // Breite (X) - Autoschluessel mit Fernbedienung passt laengs
innen_t = k ? 38 : 45;      // Tiefe  (Y)
innen_h = k ? 32 : 68;      // Hoehe  (Z) - gross: so hoch, dass das Schloss frei haengt

/* [Materialstaerken] */
wand          = k ? 3.5 : 4;
boden         = k ? 3.5 : 4;
deckel_dicke  = k ? 4   : 5;
schuerze_h    = k ? 13  : 20;   // Ueberlappung aussen (Hebelschutz)
schuerze_wand = k ? 2.5 : 3;
lippe_h       = k ? 5   : 6;    // Eingriff der Innenlippe (Labyrinthfuge)
lippe_wand    = k ? 2.2 : 2.5;
eckradius     = k ? 5   : 6;
fase          = k ? 1.0 : 1.2;
spiel         = 0.3;            // Passungsspiel pro Seite (0.2 straff ... 0.4 locker)

/* [Ueberfalle / Vorhaengeschloss] */
lasche_b      = k ? 5   : 7;    // Dicke je Lasche (X)
lasche_spalt  = k ? 1.0 : 1.6;  // Luft dazwischen -> noetige lichte Buegelweite
lasche_t      = k ? 16  : 19;   // wie weit die Laschen nach vorn stehen (Y)
buegel_d      = k ? 8   : 9;    // Bohrung fuer den Buegel (max. Buegel-Ø minus 1)
lasche_rand   = k ? 8   : 11;   // Material ueber/unter dem Loch
lasche_luft   = 1;              // Luft zwischen Kastenlasche und Schuerzenunterkante

/* [Optionen] */
wandmontage   = false; // Schraubloecher in der Rueckwand (nur von innen zugaenglich)
schraube_d    = 5;
senkung_d     = 10;
drainage      = false; // Wasserabzugsloecher im Boden (Aussenbereich)
drainage_d    = 4;

$fn = 72;

// ---------------------------------------------------------------- Ableitungen
aussen_b  = innen_b + 2*wand;
aussen_t  = innen_t + 2*wand;
aussen_h  = innen_h + boden;
innen_r   = max(eckradius - wand, 0.8);

deckel_b  = aussen_b + 2*(spiel + schuerze_wand);
deckel_t  = aussen_t + 2*(spiel + schuerze_wand);
deckel_r  = eckradius + spiel + schuerze_wand;
deckel_ok = aussen_h + deckel_dicke;     // Oberkante geschlossen
fuge_z    = aussen_h - schuerze_h;       // Unterkante Schuerze = sichtbare Fuge

front_y   = -aussen_t/2;                 // Aussenflaeche der Vorderwand
lasche_y  = front_y - lasche_t/2;        // Mitte der Laschen in Y
loch_y    = front_y - lasche_t/2;        // Lochmitte in Y
kasten_lasche_x =  (lasche_spalt + lasche_b)/2;   // rechts
deckel_lasche_x = -(lasche_spalt + lasche_b)/2;   // links
// Die Ueberfalle sitzt so hoch wie moeglich: direkt unter der Fuge.
// Dadurch haengt das Vorhaengeschloss frei vor der Wand statt unter dem Boden.
lasche_ok = fuge_z - lasche_luft;        // Oberkante Kastenlasche
loch_z    = lasche_ok - lasche_rand;     // Hoehe der Lochmitte
lasche_uk = loch_z - lasche_rand;        // Unterkante Deckellasche
// Ab hier laeuft die Deckellasche keilfoermig in die Schuerze aus. Beim
// kompakten Kasten frueher, sonst wird der Keil steiler als 45 Grad.
lasche_voll_ok = k ? loch_z + 5 : fuge_z;

// ---------------------------------------------------------------- Hilfsmodule

// Quader mit gerundeten senkrechten Kanten, in X/Y zentriert
module rbox(b, t, h, r) {
    linear_extrude(height = h)
        offset(r = r) square([max(b - 2*r, 0.01), max(t - 2*r, 0.01)], center = true);
}

// Quader mit umlaufender Fase unten (fu) und oben (fo)
module rbox_fase(b, t, h, r, fu = 0, fo = 0) {
    hull() {
        if (fu > 0) rbox(b - 2*fu, t - 2*fu, 0.01, max(r - fu, 0.01));
        translate([0, 0, fu]) rbox(b, t, h - fu - fo, r);
        if (fo > 0) translate([0, 0, h - 0.01]) rbox(b - 2*fo, t - 2*fo, 0.01, max(r - fo, 0.01));
    }
}

// Waagerechtes Loch mit 45-Grad-Dach (Tropfenform) - druckt ohne Stuetze.
// richtung = +1: Spitze nach oben (Teil steht),  -1: nach unten (Teil liegt auf dem Ruecken)
module tropfenloch(d, laenge, richtung = 1) {
    rotate([0, 90, 0])
        linear_extrude(height = laenge, center = true)
            hull() {
                circle(d = d);
                // Spitze so weit weg, dass die Tangenten unter 45 Grad bleiben
                translate([-richtung * d * 0.7, 0]) circle(d = 0.6);   // Vorzeichen: rotate([0,90,0]) dreht 2D-x auf -z
            }
}

// ---------------------------------------------------------------- Kasten

// Kastenlasche: unten schlank, ab Lochhoehe volle Tiefe, oben angefast.
// Die Anbindung an die Wand geht ueber die volle Hoehe bis in den Boden.
module kasten_lasche() {
    translate([kasten_lasche_x, 0, 0]) hull() {
        translate([0, front_y - 4, 0])                 rbox(lasche_b, 10, 2, 2);
        translate([0, lasche_y + 1, lasche_rand + 6])  rbox(lasche_b, lasche_t + 2, lasche_ok - lasche_rand - 9, 2);
        translate([0, lasche_y + 1.5, lasche_ok - 0.01]) rbox(lasche_b - 3, lasche_t - 2, 0.01, 1.5);
    }
}

module montageloecher() {
    for (p = [[-25, aussen_h - 12], [25, aussen_h - 12], [0, 14]])
        translate([p[0], 0, p[1]]) {
            translate([0, aussen_t/2 - wand/2, 0]) rotate([0,0,90]) tropfenloch(schraube_d, wand + 4);
            translate([0, aussen_t/2 - wand, 0]) rotate([-90, 0, 0])
                cylinder(h = wand + 0.01, d1 = senkung_d, d2 = schraube_d);
        }
}

module drainageloecher() {
    for (x = [-innen_b/4, innen_b/4], y = [-innen_t/4, innen_t/4])
        translate([x, y, -1]) cylinder(h = boden + 2, d = drainage_d);
}

module kasten() {
    difference() {
        union() {
            difference() {
                rbox_fase(aussen_b, aussen_t, aussen_h, eckradius, fase, 0);
                translate([0, 0, boden]) rbox(innen_b, innen_t, innen_h + 1, innen_r);
            }
            kasten_lasche();
        }
        translate([kasten_lasche_x, loch_y, loch_z])
            tropfenloch(buegel_d, lasche_b + 6, +1);
        if (wandmontage) montageloecher();
        if (drainage)    drainageloecher();
    }
}

// ---------------------------------------------------------------- Deckel

module deckel_lasche() {
    hull() {
        // volle Tiefe unten (dort sitzt das Loch)
        translate([deckel_lasche_x, front_y - spiel - lasche_t/2, lasche_uk])
            rbox(lasche_b, lasche_t, lasche_voll_ok - lasche_uk, 2);
        // laeuft nach oben flach in die Schuerze aus (ca. 36 Grad -> stuetzenfrei)
        translate([deckel_lasche_x, front_y - spiel - schuerze_wand/2, deckel_ok - 6])
            rbox(lasche_b, schuerze_wand, 6, 1);
    }
}

module deckel() {
    difference() {
        union() {
            difference() {
                // Aussenkoerper Schuerze + Platte
                translate([0, 0, fuge_z])
                    rbox_fase(deckel_b, deckel_t, deckel_ok - fuge_z, deckel_r, 1.8, fase);
                // Platz fuer den Kasten
                translate([0, 0, fuge_z - 1])
                    rbox(aussen_b + 2*spiel, aussen_t + 2*spiel,
                         aussen_h - fuge_z + 1, eckradius + spiel);
            }
            // Innenlippe mit Einfuehrschraege
            difference() {
                hull() {
                    translate([0, 0, aussen_h - lippe_h])
                        rbox(innen_b - 2*spiel - 1.4, innen_t - 2*spiel - 1.4, 0.01, innen_r);
                    translate([0, 0, aussen_h - lippe_h + 1.4])
                        rbox(innen_b - 2*spiel, innen_t - 2*spiel, lippe_h - 1.4, innen_r);
                }
                translate([0, 0, aussen_h - lippe_h - 1])
                    rbox(innen_b - 2*spiel - 2*lippe_wand, innen_t - 2*spiel - 2*lippe_wand,
                         lippe_h + 2, max(innen_r - lippe_wand, 0.8));
            }
            deckel_lasche();
        }
        translate([deckel_lasche_x, loch_y, loch_z])
            tropfenloch(buegel_d, lasche_b + 6, -1);
    }
}

// Deckel in Drucklage: auf dem Ruecken, Schuerze und Lasche zeigen nach oben
module deckel_druckbar() {
    translate([0, 0, deckel_ok]) rotate([180, 0, 0]) deckel();
}

// ---------------------------------------------------------------- Ausgabe
if      (teil == "kasten") kasten();
else if (teil == "deckel") deckel_druckbar();
else if (teil == "beides") { kasten(); %deckel(); }
