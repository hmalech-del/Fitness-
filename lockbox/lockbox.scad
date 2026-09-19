// =====================================================================
//  Abschliessbare Lockbox / Schluesselsafe fuer Vorhaengeschloss
//  ---------------------------------------------------------------
//  Zwei Teile:  "body"   = Kasten mit hochstehendem Riegel (Buegelloch)
//               "lid"    = Deckel mit Schuerze und Riegel-Durchbruch
//
//  Funktion: Der Deckel wird von oben ueber den Riegel gesteckt. Der
//  Riegel ragt durch den Deckel hinaus; durch sein Loch kommt der
//  Buegel des Vorhaengeschlosses. Der Deckel kann dann nicht mehr
//  angehoben werden.
//
//  Alle Masse in mm. Einfach oben anpassen und neu exportieren:
//     openscad -D teil=\"body\" -o body.stl lockbox.scad
//     openscad -D teil=\"lid\"  -o lid.stl  lockbox.scad
// =====================================================================

/* [Was soll erzeugt werden] */
teil = "both";        // "body", "lid", "both" (Vorschau) oder "none"

/* [Innenmasse des Stauraums] */
innen_b = 80;          // Breite  (X)
innen_t = 55;          // Tiefe   (Y)
innen_h = 50;          // Hoehe   (Z)

/* [Materialstaerken] */
wand          = 3;     // Seitenwaende
boden         = 3;     // Boden
deckel_dicke  = 5;     // Deckelplatte
schuerze_h    = 15;    // wie weit der Deckel aussen ueberlappt (Hebelschutz)
schuerze_wand = 3;     // Wandstaerke der Deckelschuerze
eckradius     = 5;     // vertikale Kantenrundung
spiel         = 0.3;   // Passungsspiel pro Seite (0.2 straff ... 0.4 locker)

/* [Riegel / Vorhaengeschloss] */
riegel_b      = 30;    // Riegelbreite  (X)
riegel_t      = 10;    // Riegeltiefe   (Y)
riegel_ueber  = 23;    // Riegelhoehe ueber der geschlossenen Deckeloberseite
buegel_d      = 10;    // Loch fuer den Schlossbuegel (Buegel-Durchmesser + ~1 mm)
buegel_z      = 10;    // Lochmitte ueber der Deckeloberseite (bestimmt das Restspiel)

/* [Optionen] */
wandmontage   = true;  // Schraubloecher in der Rueckwand (nur von innen zugaenglich)
schraube_d    = 5;     // Durchgangsloch fuer die Schraube
senkung_d     = 10;    // Senkung fuer den Schraubenkopf (innen)
drainage      = false; // kleine Wasserabzugsloecher im Boden (Aussenbereich)
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

deckel_ok = aussen_h + deckel_dicke;      // Deckeloberseite geschlossen
riegel_ok = deckel_ok + riegel_ueber;     // Riegeloberkante
loch_z    = deckel_ok + buegel_z;         // Mitte Buegelloch

riegel_y0 = -aussen_t/2;                  // Riegel sitzt buendig in der Vorderwand
riegel_y1 = riegel_y0 + riegel_t;

// ---------------------------------------------------------------- Hilfsmodule

// Quader mit gerundeten senkrechten Kanten, in X/Y zentriert
module rbox(b, t, h, r) {
    linear_extrude(height = h)
        offset(r = r) square([b - 2*r, t - 2*r], center = true);
}

// Tropfenloch: waagerechtes Loch mit 45-Grad-Dach -> druckt ohne Stuetzen
module tropfenloch(d, laenge) {
    rotate([90, 0, 0])
        linear_extrude(height = laenge, center = true)
            hull() {
                circle(d = d);
                translate([0, d*0.35]) rotate(45) square(d*0.45, center = true);
            }
}

// ---------------------------------------------------------------- Kasten

module riegel() {
    hull() {
        translate([0, (riegel_y0 + riegel_y1)/2, 0])
            rbox(riegel_b, riegel_t, riegel_ok - 2, 2);
        translate([0, (riegel_y0 + riegel_y1)/2, riegel_ok - 0.01])
            rbox(riegel_b - 4, riegel_t - 4, 0.01, 2);
    }
}

module montageloecher() {
    // je Loch: [x, z] - ausschliesslich in der Rueckwand
    positionen = [[-25, aussen_h - 12], [25, aussen_h - 12], [0, 14]];
    for (p = positionen) translate([p[0], 0, p[1]]) {
        translate([0, aussen_t/2 - wand/2, 0])
            tropfenloch(schraube_d, wand + 4);                // Durchgangsloch
        translate([0, aussen_t/2 - wand, 0])                  // Senkung, innen weit
            rotate([-90, 0, 0])
                cylinder(h = wand + 0.01, d1 = senkung_d, d2 = schraube_d);
    }
}

module drainageloecher() {
    for (x = [-innen_b/4, innen_b/4], y = [-innen_t/4, innen_t/4])
        translate([x, y, -1]) cylinder(h = boden + 2, d = drainage_d);
}

module body() {
    difference() {
        union() {
            difference() {
                rbox(aussen_b, aussen_t, aussen_h, eckradius);          // Aussenhuelle
                translate([0, 0, boden])
                    rbox(innen_b, innen_t, innen_h + 1, innen_r);       // Stauraum
            }
            riegel();
        }
        translate([0, (riegel_y0 + riegel_y1)/2, loch_z])
            tropfenloch(buegel_d, riegel_t + 10);                        // Buegelloch
        if (wandmontage) montageloecher();
        if (drainage)    drainageloecher();
    }
}

// ---------------------------------------------------------------- Deckel

module lid() {
    difference() {
        union() {
            translate([0, 0, aussen_h])
                rbox(deckel_b, deckel_t, deckel_dicke, deckel_r);        // Platte
            translate([0, 0, aussen_h - schuerze_h])                     // Schuerze
                difference() {
                    rbox(deckel_b, deckel_t, schuerze_h, deckel_r);
                    translate([0, 0, -1])
                        rbox(aussen_b + 2*spiel, aussen_t + 2*spiel,
                             schuerze_h + 1, eckradius + spiel);
                }
        }
        // Durchbruch fuer den Riegel
        translate([0, (riegel_y0 + riegel_y1)/2, aussen_h - 1])
            rbox(riegel_b + 2*spiel, riegel_t + 2*spiel, deckel_dicke + 2, 2);
    }
}

// ---------------------------------------------------------------- Ausgabe
// Beide Teile werden bereits in Drucklage ausgegeben (Z = 0 auf dem Bett):
//   Kasten : steht aufrecht, Riegel nach oben
//   Deckel : liegt auf dem Ruecken, Schuerze zeigt nach oben  -> keine Stuetzen
module lid_druckbar() {
    translate([0, 0, aussen_h + deckel_dicke]) rotate([180, 0, 0]) lid();
}

if      (teil == "body") body();
else if (teil == "lid")  lid_druckbar();
else if (teil == "both") { body(); %lid(); }
// teil = "none"  -> nichts ausgeben (fuer eigene Vorschau-Skripte)
