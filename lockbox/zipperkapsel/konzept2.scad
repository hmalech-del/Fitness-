// =====================================================================
//  Zipper-Kapsel v2 - KONZEPT (Masse geschaetzt, nicht drucken)
//  Korrektur zu v1: Vorder- und Rueckhaelfte koennen sich nur dort
//  beruehren, wo kein Stoff ist - also OBERHALB der Kragenkante.
//  Der Stoff ist als eigener Koerper modelliert und wird geprueft.
//  z = 0 = Oberkante der Endstuecke, Kette laeuft nach -z
// =====================================================================
$fn = 48;

/* Reissverschluss (Annahmen, Groesse 5) */
kette_b=6; kette_d=2.8; zahn_l=3.6; zahn_t=5; zahn_x=3.6;
band_b=16; band_d=1.2;
sch_b=12; sch_d=7.5; sch_l=22;
griff_b=9; griff_d=2; griff_l=24;
stop_b=3.2; stop_d=2.6; stop_l=5;

/* Kleidungsstueck - DIESE ZWEI WERTE MUSS ICH VON DIR WISSEN */
kante_z  = 10;    // Oberkante Kragen ueber den Endstuecken
kragen_d = 3.0;   // Stoffdicke am Kragen (Naht!)

/* Kapsel */
spiel=0.3;
kap_b=24;  d_hinten=6.0;  d_vorn=7.5;
fuge_h   = 18;                    // Bauhoehe der Verbindungszone ueber der Kante
z_ok     = kante_z + fuge_h;
z_sch0   = -stop_l - 0.7;
z_sch1   = z_sch0 - sch_l - 1;
z_uk     = z_sch1 - 20;           // Kamm/Kettenrinne, Griff haengt unten heraus
ohr_x    = kap_b/2 + 4.5;  ohr_d = 9;  ohr_bohr = 4.5;
ohr_hint = [kante_z + 2.5, kante_z + 9.0];    // Ohr der Rueckhaelfte
ohr_vorn = [kante_z + 10.0, kante_z + 16.5];  // Ohr der Vorderhaelfte

// ---------------------------------------------- Stoff (Pruefkoerper)
module stoff() {
    color("#d8d2c4") {
        // Gurtband links und rechts der Kette, bis zur Reissverschluss-Oberkante
        for (s = [-1, 1]) translate([s*(kette_b/2 + band_b/2), 0, -60])
            cube([band_b, band_d, 120], center = true);
        // Kragenzone: durchgehender Stoff bis zur Kante, dicker (Naht)
        translate([0, 0, kante_z/2]) cube([2*band_b + kette_b, kragen_d, kante_z], center = true);
    }
}

module zipper() {
    color("#78838e") {
        for (s = [-1, 1]) translate([s*(kette_b/2 - 0.8), 0, -stop_l/2])
            cube([stop_b, stop_d, stop_l], center = true);
        for (i = [0:1:16]) {
            zz = z_sch1 + 1.5 - i*zahn_t/2;
            translate([((i%2==0)?-1:1)*1.2, 0, zz]) cube([zahn_x, kette_d, zahn_l], center = true);
        }
    }
    color("#5d6874") {
        translate([0, 0, z_sch0 - sch_l/2]) cube([sch_b, sch_d, sch_l], center = true);
        translate([0, -sch_d/2 - 0.6, z_sch1 - griff_l/2 + 3]) cube([griff_b, griff_d, griff_l], center = true);
    }
}

// ---------------------------------------------- Kapselhaelften
module rbox(b, t, h, r0) {
    r = min(r0, t/2 - 0.4, b/2 - 0.4);
    translate([0, t/2, 0]) linear_extrude(h) offset(r = r)
        square([max(b - 2*r, 0.01), max(t - 2*r, 0.01)], center = true);
}
module kav(seite, bx, dy, z0, z1) { translate([-bx/2, seite>0 ? -0.01 : -dy, z1]) cube([bx, dy+0.01, z0-z1]); }

module kamm() {
    for (i = [0:1:7]) {
        zz = z_sch1 + 1.5 - zahn_t/2 - i*zahn_t/2;
        sx = (i % 2 == 0) ? -1 : 1;
        translate([sx > 0 ? 0.4 : -2.8, 0.3, zz - 0.6]) cube([2.4, 1.3, 1.2]);
    }
}

module haelfte(seite = 1) {
    dick = (seite > 0) ? d_hinten : d_vorn;
    frei = kragen_d/2 + 0.4;          // Freistich in der Kragenzone
    union() {
        if (seite > 0) kamm();
        difference() {
            union() {
                translate([0, seite > 0 ? 0 : -dick, z_uk]) rbox(kap_b, dick, z_ok - z_uk, 3);
                for (sx = [-1, 1]) {                      // Ohren, nur ueber der Kante
                    zb = (seite > 0) ? ohr_hint : ohr_vorn;
                    hull() {
                        translate([sx*ohr_x, 0, zb[0]]) cylinder(d = ohr_d, h = zb[1] - zb[0]);
                        translate([sx*(kap_b/2 - 2), seite > 0 ? 0 : -3, zb[0]])
                            cube([4, 3, zb[1] - zb[0]]);
                    }
                }
            }
            // Freistich fuer Band (unten) und Kragen (oben)
            translate([-40, seite > 0 ? 0 : -0.8, z_uk - 1]) cube([80, 0.8, kante_z - z_uk + 1]);
            translate([-40, seite > 0 ? 0 : -frei, -0.5]) cube([80, frei, kante_z + 0.6]);
            kav(seite, kette_b + 4, kette_d/2 + 0.6, 0.6, -stop_l - 0.6);        // Endstuecke
            kav(seite, sch_b + 2*spiel, sch_d/2 + spiel, z_sch0, z_sch1);        // Schieber
            if (seite > 0) kav(seite, kette_b + 1.2, kette_d/2 + 0.5, z_sch1, z_uk - 1);   // Kettenrinne
            else           kav(seite, griff_b + 2.5, 3.6,             z_sch1, z_uk - 1);   // Griffkanal
            for (sx = [-1, 1]) translate([sx*ohr_x, 0, z_uk - 2]) cylinder(d = ohr_bohr, h = z_ok - z_uk + 4);
            // Ohr darf innerhalb der Kapselbreite nicht in die Gegenhaelfte ragen
            translate([-kap_b/2, seite > 0 ? -25 : 0, z_uk - 2]) cube([kap_b, 25, z_ok - z_uk + 4]);
        }
    }
}

module schloss(bd = 4, spann = 15) {
    color("#3d4756") {
        translate([ohr_x, 0, kante_z + 1]) cylinder(d = bd, h = 20);
        translate([ohr_x + spann, 0, kante_z + 13]) cylinder(d = bd, h = 8);
        translate([ohr_x + spann/2, 0, kante_z + 21]) rotate([90,0,0])
            rotate_extrude(angle = 180) translate([spann/2, 0]) circle(d = bd);
        translate([ohr_x + spann/2, 0, kante_z + 4]) cube([spann + 7, 11, 20], center = true);
    }
}

modus = "zu";
if (modus == "zu")    { stoff(); zipper(); color("#7fa8c9") haelfte(1); color("#c98f7f") haelfte(-1); schloss(); }
if (modus == "offen") { stoff(); zipper(); color("#7fa8c9") haelfte(1);
                        translate([-ohr_x, 0, 0]) rotate([0,0,-55]) translate([ohr_x, 0, 0]) color("#c98f7f") haelfte(-1); }
if (modus == "pruef_h") haelfte(1);
if (modus == "pruef_v") haelfte(-1);
if (modus == "pruef_s") stoff();

// ---------- Schnittzeichnung bei x = 5 (neben der Kette, durch das Band) ----------
module sec() { projection(cut = true) rotate([0, 90, 0]) translate([-5, 0, 0]) children(); }
module lab(x, z, txt, rechts = true) {
    translate([x, z]) linear_extrude(1.6)
        text(txt, size = 7.5, halign = rechts ? "left" : "right", valign = "center");
    lx0 = rechts ? 42 : x + 2;  lx1 = rechts ? x - 2 : -46;
    translate([lx0, z - 0.25]) linear_extrude(1.5) square([lx1 - lx0, 0.5]);
}
SK = 6;
module clip(z0, z1) { intersection() { children(); translate([-100, -60, z0]) cube([200, 120, z1 - z0]); } }
if (modus == "quer") {
    scale([SK, SK, 1]) rotate([0, 0, 90]) {
        color("#cfc7b4") linear_extrude(0.8) sec() clip(-24, 30) stoff();
        color("#8b959f") linear_extrude(1.0) sec() clip(-24, 30) zipper();
        color("#4d81ac") linear_extrude(1.5) sec() clip(-24, 30) haelfte(1);
        color("#bc7f5e") linear_extrude(1.5) sec() clip(-24, 30) haelfte(-1);
    }
    color("#2f3640") {
        lab( 62,  22*SK, "Fuge: hier kein Stoff");
        lab( 62,  14*SK, "Ohren + Schloss");
        lab( 62,  10*SK, "Kragenkante");
        lab( 62,   4*SK, "Kragenstoff + Naht");
        lab( 62, -14*SK, "Schieber");
        lab(-62,  -4*SK, "Gurtband, 1,2 mm", false);
        lab(-62, -20*SK, "Rueckhaelfte / Vorderhaelfte", false);
    }
}
