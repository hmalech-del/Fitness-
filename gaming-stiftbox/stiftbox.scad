// =====================================================================
//  HEX-STIFTBOX  -  Gaming-Style Schreibtisch-Organizer
//  Fuenf Wabenzellen in gestuften Hoehen auf einem Sockel.
//  Druckt aufrecht, komplett ohne Stuetzen.
//  Alle Masse in mm.
// =====================================================================

/* [Zellen] */
zelle_w  = 26;      // Schluesselweite innen (Flaeche zu Flaeche)
wand     = 2.2;     // Wandstaerke je Seite (zwischen zwei Zellen also 4,4)
fase_o   = 0.8;     // aeussere Fase an der Oberkante
fase_i   = 0.4;     // innere Fase  -> Steg oben = wand - fase_o - fase_i = 1,0

/* [Sockel] */
boden_d   = 5;      // Sockelhoehe = Boden der Zellen
sockel_ue = 4;      // Ueberstand des Sockels rundum
sockel_r  = 5;      // Eckradius
fase_s    = 2.5;    // Fase unten (gibt der LED-Nut das Licht frei)

/* [Extras] */
schrift    = "";    // Gravur im Frontschild, z.B. "LVL 99" - leer = glattes Schild
schrift_h  = 5.5;
schild_b   = 62;    // Breite des Frontschilds
schild_h   = 11;    // Hoehe des Frontschilds
led_kanal  = true;  // Nut auf der Unterseite fuer einen 8-mm-LED-Strip
led_b      = 8;
led_t      = 3.0;

/* [Gravur] */
nut_t = 0.8;        // Tiefe der Rillen
gravur = [[16, 3.0], [21, 1.6], [52, 3.0], [57, 1.6]];   // [Hoehe ueber Tisch, Breite]

$fn = 64;

// ---------------------------------------------------------- Raster
w_out = zelle_w + 2*wand;        // Schluesselweite aussen je Zelle
d_out = w_out / cos(30);         // Eckenmass
px    = 0.75 * d_out;            // Spaltenabstand
py    = w_out;                   // Zeilenabstand

// [x, y, Hoehe, Y-Teiler]
zellen = [
    [-px,  py/2, 105, false],    // hinten links  - Stifte
    [ px,  py/2,  88, false],    // hinten rechts - Marker
    [  0,     0,  62, false],    // Mitte         - Schere, Lineal, Kabel
    [-px, -py/2,  42, false],    // vorn links    - Radierer, Spitzer
    [ px, -py/2,  30, true ]     // vorn rechts   - USB-Sticks, SD-Karten
];

front_y  = -(py/2 + w_out/2) - sockel_ue;   // Vorderkante des Sockels

// ---------------------------------------------------------- Hilfen
module hex(w) { circle(d = w / cos(30), $fn = 6); }
module rrect(b, t, r) { offset(r = r) square([b - 2*r, t - 2*r], center = true); }

// Aussenkontur aller Zellen, die auf Hoehe z noch stehen
module kontur(z) {
    union() for (c = zellen) if (c[2] > z) translate([c[0], c[1]]) hex(w_out);
}

// ---------------------------------------------------------- Teile
module tuerme() {
    for (c = zellen) translate([c[0], c[1], 0]) hull() {
        linear_extrude(c[2] - fase_o) hex(w_out);
        translate([0, 0, c[2] - 0.01]) linear_extrude(0.01) hex(w_out - 2*fase_o);
    }
}

module hohlraeume() {
    for (c = zellen) translate([c[0], c[1], 0]) {
        translate([0, 0, boden_d]) linear_extrude(c[2] - boden_d - fase_i) hex(zelle_w);
        translate([0, 0, c[2] - fase_i]) hull() {      // Trichter an der Oberkante, exakt 45 Grad
            linear_extrude(0.01) hex(zelle_w);
            translate([0, 0, fase_i]) linear_extrude(1.0) hex(zelle_w + 2*fase_i);
        }
    }
}

module teiler() {
    for (c = zellen) if (c[3])
        for (a = [0, 120, 240]) translate([c[0], c[1], boden_d]) rotate(a)
            linear_extrude(c[2] - boden_d - fase_i - 1.5)
                translate([0, -1.2]) square([d_out/2 - 0.5, 2.4]);
}

// Rille mit 45-Grad-Dach: druckt sauber, keine haengende Decke
module rillen() {
    for (g = gravur) {
        z = g[0]; h = g[1]; zt = z + h + 3;
        difference() {
            translate([0, 0, z]) linear_extrude(h) kontur(zt);
            hull() {
                translate([0, 0, z - 0.5]) linear_extrude(h - nut_t + 0.5) offset(-nut_t) kontur(zt);
                translate([0, 0, z + h - 0.01]) linear_extrude(0.01) kontur(zt);
            }
        }
    }
}

// Sockel folgt der Wabenkontur - wirkt wie eine Plattform, nicht wie ein Brett
module sockel() {
    difference() {
        hull() {
            linear_extrude(0.01) offset(r = sockel_ue - fase_s) kontur(0);
            translate([0, 0, fase_s]) linear_extrude(boden_d - fase_s) offset(r = sockel_ue) kontur(0);
        }
        if (led_kanal) {
            translate([0, 0, -0.01]) linear_extrude(led_t) difference() {
                offset(r = sockel_ue - 2.5) kontur(0);
                offset(r = sockel_ue - 2.5 - led_b) kontur(0);
            }
            translate([-6, -front_y - 12, -0.01]) cube([12, 14, led_t]);   // Kabelaustritt hinten
        }
    }
}

// Namensschild quer ueber die Front
module schild() {
    difference() {
        hull() {
            translate([0, front_y + 5.75, 0])          // unten umlaufend um fase_s eingezogen
                cube([schild_b - 2*fase_s, 6.5, 0.01], center = true);
            translate([0, front_y + 4.5, fase_s])
                cube([schild_b, 9, 0.02], center = true);
            translate([0, front_y + 5.3, schild_h])
                cube([schild_b - 3, 7.4, 0.02], center = true);
        }
        if (schrift != "")
            translate([0, front_y + 0.6, schild_h/2 + 1]) rotate([90, 0, 0])
                linear_extrude(1.2, center = true)
                    text(schrift, size = schrift_h, halign = "center", valign = "center",
                         font = "DejaVu Sans:style=Bold");
    }
}

module stiftbox() {
    union() {
        difference() {
            union() { sockel(); tuerme(); schild(); }
            hohlraeume();
            rillen();
        }
        teiler();      // erst nach dem Aushoehlen, sonst weggefraest
    }
}

stiftbox();
