// =====================================================================
//  Zipper-Kapsel - KONZEPTMODELL (nicht drucken, Masse sind geschaetzt!)
//  Reissverschluss-Attrappe: Kunststoff-Einzelzaehne, ca. Groesse 5
//  z = 0 liegt an der Oberkante der Endstuecke, Kette laeuft nach -z
// =====================================================================
$fn = 48;

/* Reissverschluss (Annahmen) */
kette_b = 6;     kette_d = 2.8;    // geschlossene Kette: Breite / Dicke
zahn_l  = 3.6;   zahn_t  = 5;      // Zahnlaenge, Teilung je Seite
zahn_x  = 3.6;
band_b  = 16;    band_d  = 1.2;
sch_b   = 12;    sch_d   = 7.5;  sch_l = 22;     // Schieber
griff_b = 9;     griff_d = 2;    griff_l = 24;   // Griffplaettchen
stop_b  = 3.2;   stop_d  = 2.6;  stop_l = 5;     // Endstuecke

/* Kapsel */
spiel = 0.3;  wand = 2.5;
kap_b = 24;   kap_d = 13;
z_ok  = 6;                         // Oberkante Kapsel ueber Endstueck
z_sch0 = -stop_l - 0.7;            // Oberkante Schieberkavitaet
z_sch1 = z_sch0 - sch_l - 1;       // Unterkante Schieberkavitaet
z_uk   = z_sch1 - griff_l - 3;     // Unterkante Kapsel (Griff passt rein)
kap_l  = z_ok - z_uk;

ohr_x = kap_b/2 + 4.5;             // Achse der Scharnier-/Schlossohren
ohr_d = 9;    ohr_bohr = 4.5;
ohr_o = [-14, -22.5];              // z-Bereich Ohr Rueckhaelfte
ohr_u = [-23.5, -32];              // z-Bereich Ohr Vorderhaelfte

// ------------------------------------------------- Reissverschluss-Attrappe
module zipper() {
    color("#aab4be")                                        // Baender
        for (s = [-1, 1]) translate([s*(kette_b/2 + band_b/2), 0, -32])
            cube([band_b, band_d, 95], center = true);
    color("#78838e") {
        for (s = [-1, 1])                                   // Endstuecke
            translate([s*(kette_b/2 - 0.8), 0, -stop_l/2])
                cube([stop_b, stop_d, stop_l], center = true);
        for (i = [0:1:18]) {                                // geschlossene Zaehne
            zz = z_sch1 + 1.5 - i*zahn_t/2;
            s  = (i % 2 == 0) ? -1 : 1;
            translate([s*1.2, 0, zz]) cube([zahn_x, kette_d, zahn_l], center = true);
        }
    }
    color("#5d6874") {                                      // Schieber
        translate([0, 0, z_sch0 - sch_l/2]) cube([sch_b, sch_d, sch_l], center = true);
        translate([0, -sch_d/2 - 0.6, z_sch1 - griff_l/2 + 3])
            cube([griff_b, griff_d, griff_l], center = true);
    }
}

// ------------------------------------------------- Kapselhaelften
// seite = +1: Rueckhaelfte (Kamm)   seite = -1: Vorderhaelfte (Grifftasche)
// Kammstege: wechselseitige Halbstege, die in die Zahnluecken greifen
module kamm() {
    for (i = [0:1:9]) {
        zz = z_sch1 + 1.5 - zahn_t/2 - i*zahn_t/2;
        sx = (i % 2 == 0) ? -1 : 1;
        translate([sx > 0 ? 0.7 : -3.3, 0.3, zz - 0.65]) cube([2.6, 1.4, 1.3]);
    }
}

// seite = +1: Rueckhaelfte (mit Kamm)   seite = -1: Vorderhaelfte (Grifftasche)
module haelfte(seite = 1) {
    y = seite;
    union() {
        if (seite > 0) kamm();               // Kamm nach dem Ausfraesen addieren
        difference() {
            union() {
                translate([0, seite > 0 ? 0 : -kap_d/2, z_uk]) rbox(kap_b, kap_d/2, kap_l, 3);
                for (sx = [-1, 1]) {         // Ohren, versetzt ineinandergreifend
                    zb = (seite > 0) ? ohr_o : ohr_u;
                    hull() {
                        translate([sx*ohr_x, 0, zb[1]]) cylinder(d = ohr_d, h = zb[0] - zb[1]);
                        translate([sx*(kap_b/2 - 2), y*1.5, zb[1]]) cube([4, 3, zb[0] - zb[1]]);
                    }
                }
            }
            // Bandfreistich ueber die volle Hoehe
            translate([-40, seite > 0 ? 0 : -0.75, z_uk - 1]) cube([80, 0.75, kap_l + 2]);
            kav(seite, kette_b + 4, kette_d + 1.2, 0.6, -stop_l - 0.6);          // Endstueck-Tasche
            kav(seite, sch_b + 2*spiel, sch_d + 2*spiel, z_sch0, z_sch1);        // Schieber
            if (seite > 0) kav(seite, kette_b + 1.2, kette_d + 1.0, z_sch1, z_uk - 1);  // Kettenrinne
            else           kav(seite, griff_b + 3,   sch_d + 0.6,   z_sch1, z_uk - 1);  // Grifftasche
            for (sx = [-1, 1]) translate([sx*ohr_x, 0, z_uk - 2]) cylinder(d = ohr_bohr, h = kap_l + 4);
        }
    }
}

// Kavitaet: von der Trennebene aus nach innen, zentriert in x
module kav(seite, bx, dy, z0, z1) {
    translate([-bx/2, seite > 0 ? -0.01 : -dy/2, z1]) cube([bx, dy/2 + 0.01, z0 - z1]);
}

module rbox(b, t, h, r) {
    translate([0, t/2, 0]) linear_extrude(height = h)
        offset(r = r) square([b - 2*r, t - 2*r], center = true);
}

// ------------------------------------------------- Schloss-Attrappe
module schloss(bd = 3.5, spann = 15) {
    color("#3d4756") {
        translate([ohr_x, 0, -34]) cylinder(d = bd, h = 30);
        translate([ohr_x + spann, 0, -34]) cylinder(d = bd, h = 18);
        translate([ohr_x + spann/2, 0, -4]) rotate([90, 0, 0])
            rotate_extrude(angle = 180) translate([spann/2, 0]) circle(d = bd);
        translate([ohr_x + spann/2, 0, -47]) cube([spann + 7, 11, 22], center = true);
    }
}

// ------------------------------------------------- Ausgabe
modus = "explo";

// Aufgeklappt: beide Innenseiten zeigen zur Kamera
if (modus == "explo") {
    zipper();
    translate([ 52, 0, 0])                 color("#7fa8c9") haelfte(1);
    translate([-52, 0, 0]) rotate([0,0,180]) color("#c98f7f") haelfte(-1);
}
if (modus == "zu") { zipper(); color("#7fa8c9") haelfte(1); color("#c98f7f") haelfte(-1); schloss(); }
if (modus == "schnitt") {
    difference() {
        union() { zipper(); color("#7fa8c9") haelfte(1); color("#c98f7f") haelfte(-1); }
        translate([0.9, -60, -140]) cube([120, 120, 280]);
    }
}

// ---------- Beschriftete Schnittzeichnung (2D aus dem Modell) ----------
// Schnittebene x = 0.9; nach rotate([0,90,0]) liegt sie auf z = 0.
// Im Bild gilt danach: senkrecht = z des Modells, waagerecht = -y des Modells.
module sec(obj) {
    projection(cut = true) rotate([0, 90, 0]) translate([-1.5, 0, 0]) children();
}
module lab(x, z, txt, rechts = true) {
    translate([x, z]) linear_extrude(1.6)
        text(txt, size = 3.1, halign = rechts ? "left" : "right", valign = "center");
    lx0 = rechts ? 18 : x + 1.5;
    lx1 = rechts ? x - 1.5 : -18;
    translate([lx0, z - 0.25]) linear_extrude(1.5) square([lx1 - lx0, 0.5]);
}
SK = 2.6;   // Massstab der Schnittzeichnung gegenueber der Schrift
if (modus == "quer") {
    scale([SK, SK, 1]) rotate([0, 0, 90]) {
        color("#8b959f") linear_extrude(1.0) sec() zipper();
        color("#4d81ac") linear_extrude(1.5) sec() haelfte(1);
        color("#bc7f5e") linear_extrude(1.5) sec() haelfte(-1);
    }
    color("#2f3640") {
        lab( 26,   4*SK, "Bandschlitz - nur das Gurtband passt");
        lab( 26,  -2*SK, "Endstuecke gefangen = Anschlag");
        lab( 26, -16*SK, "Schieber eingeschlossen");
        lab( 26, -44*SK, "Tasche fuers Griffplaettchen");
        lab(-26, -31*SK, "Kamm in den Zahnluecken", false);
        lab(-26, -54*SK, "Kettenrinne", false);
    }
}
