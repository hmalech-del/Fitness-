// =====================================================================
//  HEX-STIFTBOX  "CYBER"  -  Cyberpunk-Variante
//  Unterschiede zur cleanen Version:
//    * asymmetrisch: die kleinste Zelle ist versetzt und um 30 Grad
//      gedreht, dazwischen bleibt eine Schattenfuge
//    * Schraegschnitt am hoechsten Turm
//    * Frontpanel mit Leuchtband, Warnstreifen und Code-Feld
//    * LED-Streifen steht senkrecht hinter einer 0,8-mm-Blende:
//      gerades Stueck, nichts muss gebogen werden
//  Druckt aufrecht, ohne Stuetzen.
// =====================================================================

/* [Zellen] */
zelle_w = 26;       // Schluesselweite innen
wand    = 2.2;      // Wandstaerke je Seite
fase_o  = 0.8;
fase_i  = 0.4;

/* [Sockel / Frontpanel] */
sockel_h  = 12;     // Hoehe des Sockelbands
boden_d   = 3;      // Bodenplatte (Zellenboden liegt hier drauf)
sockel_ue = 4;      // Ueberstand rundum
fase_s    = 2.5;    // Fase unten
panel_t   = 10;     // Tiefe des Frontpanels

/* [Licht] */
led_b      = 10.5;  // Nuthoehe fuer den senkrecht stehenden Streifen
led_t      = 3.2;   // Nuttiefe
blende     = 0.8;   // Wandstaerke der Leuchtblende
licht_x    = [-22, 8];    // Bereich des Leuchtbands

/* [Grafik] */
streifen_x = [-43, -26];  // Warnstreifen
code_x     = [ 12,  43];  // Code-Feld
code       = "";          // z.B. "07-B" oder der Gamertag
code_h     = 6;

/* [Gravur] */
nut_t  = 0.9;
gravur = [[17, 3.0], [22, 1.6], [64, 3.0], [69, 1.6]];

$fn = 64;

// ---------------------------------------------------------- Raster
w_out = zelle_w + 2*wand;
d_out = w_out / cos(30);
px    = 0.75 * d_out;
py    = w_out;

// [x, y, Hoehe, Y-Teiler, Drehung, Schraegschnitt-Winkel]
zellen = [
    [ -px,  py/2, 108, false,  0, 34],   // Stifte, oben schraeg abgeschnitten
    [  px,  py/2,  86, false,  0,  0],   // Marker
    [   0,     0,  64, false,  0,  0],   // Schere, Kleber
    [ -px, -py/2,  44, false,  0,  0],   // Kleinkram
    [  38,   -14,  32,  true, 30,  0]    // versetzt + gedreht: USB, SD-Karten
];

front_y  = -(py/2 + w_out/2) - sockel_ue - 1.5;   // Panel steht vor allen Tuermen

module hex(w) { circle(d = w / cos(30), $fn = 6); }

module kontur(z) {
    union() for (c = zellen) if (c[2] > z) translate([c[0], c[1]]) rotate(c[4]) hex(w_out);
}

// ---------------------------------------------------------- Tuerme
module tuerme() {
    for (c = zellen) difference() {
        translate([c[0], c[1], 0]) rotate([0, 0, c[4]]) hull() {
            linear_extrude(c[2] - fase_o) hex(w_out);
            translate([0, 0, c[2] - 0.01]) linear_extrude(0.01) hex(w_out - 2*fase_o);
        }
        if (c[5] > 0) intersection() {                       // Schraegschnitt
            translate([c[0], c[1], c[2] - 8]) rotate([c[5], 0, 0])
                translate([-80, -80, 0]) cube([160, 160, 80]);
            translate([c[0], c[1], 0]) linear_extrude(200) rotate(c[4]) hex(w_out + 2);
        }
    }
}

module hohlraeume() {
    for (c = zellen) translate([c[0], c[1], 0]) rotate([0, 0, c[4]]) {
        translate([0, 0, boden_d]) linear_extrude(c[2] + 20) hex(zelle_w);
        translate([0, 0, c[2] - fase_i]) hull() {            // Einfuehrtrichter
            linear_extrude(0.01) hex(zelle_w);
            translate([0, 0, fase_i]) linear_extrude(1.0) hex(zelle_w + 2*fase_i);
        }
    }
}

module teiler() {
    for (c = zellen) if (c[3])
        for (a = [0, 120, 240]) translate([c[0], c[1], boden_d]) rotate(a + c[4])
            linear_extrude(c[2] - boden_d - fase_i - 2)
                translate([0, -1.2]) square([d_out/2 - 0.5, 2.4]);
}

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

// ---------------------------------------------------------- Sockel + Panel
module sockel_form(h, schrumpf = 0) {
    linear_extrude(h) offset(r = sockel_ue - schrumpf) kontur(0);
}

module sockel() {
    hull() {
        sockel_form(0.01, fase_s);
        translate([0, 0, fase_s]) sockel_form(sockel_h - fase_s);
    }
    // gerades Frontpanel quer ueber die Vorderseite
    hull() {
        translate([0, front_y + panel_t/2 + fase_s/2, 0])
            cube([88 - 2*fase_s, panel_t - fase_s, 0.01], center = true);
        translate([0, front_y + panel_t/2, fase_s])
            cube([88, panel_t, sockel_h - fase_s], center = true);
    }
}

// Nut fuer den senkrecht stehenden LED-Streifen, unten offen zum Einschieben
module lichtnut() {
    translate([licht_x[0], front_y + blende, -1])
        cube([licht_x[1] - licht_x[0], led_t, led_b + 1]);
}

module warnstreifen() {
    intersection() {
        translate([0, front_y + 0.01, 0]) rotate([90, 0, 0]) linear_extrude(0.9)
            for (i = [0:6]) translate([streifen_x[0] - 6 + i*6.5, 6]) rotate(45)
                square([3.2, 34], center = true);
        translate([(streifen_x[0] + streifen_x[1])/2, front_y - 1, sockel_h/2])
            cube([streifen_x[1] - streifen_x[0], 3, sockel_h - 3], center = true);
    }
}

module codefeld() {
    if (code != "")
        translate([(code_x[0] + code_x[1])/2, front_y + 0.7, sockel_h/2]) rotate([90, 0, 0])
            linear_extrude(1.4, center = true)
                text(code, size = code_h, halign = "center", valign = "center",
                     font = "DejaVu Sans:style=Bold");
}

module stiftbox_cyber() {
    union() {
        difference() {
            union() { sockel(); tuerme(); warnstreifen(); }
            hohlraeume();
            rillen();
            lichtnut();
            codefeld();
        }
        teiler();
    }
}

stiftbox_cyber();
