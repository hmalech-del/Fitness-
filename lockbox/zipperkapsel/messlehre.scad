// =====================================================================
//  Messlehren fuer die Reissverschluss-Kapsel
//  A = Schlitzlehre (Band, Endstueck, Kette, Schieber)
//  B = Kammlehre    (Zahnteilung)
//  Flach drucken, keine Stuetzen. 0,4-mm-Duese, 0,2 mm Schicht.
//     openscad -D teil=\"A\" -o messlehre_A.stl messlehre.scad
// =====================================================================
teil = "beide";        // "A", "B" oder "beide" (nebeneinander)

/* Lehre A */
a_b = 104; a_t = 48; a_d = 2.4;
s_werte = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.4, 2.8];   // Band / Endstueck
m_werte = [4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 8.0];        // Kette / Schieber

/* Lehre B */
b_b = 88; b_t = 64; b_d = 1.8;
k_werte  = [4.0, 4.5, 5.0, 5.5];   // Zahnteilung je Seite
steg_h   = 2.2;    // Hoehe der Kammleiste ueber der Platte
rinne_b  = 7.2;    // Breite der Kettenrinne
rinne_t  = 1.6;    // Tiefe der Rinne
steg_l   = 1.2;    // Steglaenge in Laufrichtung
steg_hh  = 1.2;    // Steghoehe

schrift = 0.7;     // Praegehoehe
$fn = 32;

module platte(b, t, d) {
    linear_extrude(d) offset(r = 3) square([b - 6, t - 6], center = false);
}
module txt(x, y, s, gr = 3.4, al = "center") {
    translate([x, y, 0]) linear_extrude(schrift + 0.01)
        text(s, size = gr, halign = al, valign = "center");
}

// ------------------------------------------------------- Lehre A
module lehre_A() {
    difference() {
        union() {
            translate([3, 3, 0]) platte(a_b, a_t, a_d);
            translate([0, 0, a_d]) {
                txt(4, 33, "BAND + ENDSTUECK", 3.2, "left");
                for (i = [0:len(s_werte) - 1])
                    txt(6.5 + i*13, 27.5, str(s_werte[i]), 3.4);
                for (i = [0:len(m_werte) - 1])
                    txt(7.4 + i*14.8, 19.5, str(m_werte[i]), 3.4);
                txt(4, 14, "KETTE + SCHIEBER", 3.2, "left");
            }
        }
        // Schlitze von der Oberkante
        for (i = [0:len(s_werte) - 1])
            translate([6.5 + i*13 - s_werte[i]/2, a_t - 11, -1])
                cube([s_werte[i], 12, a_d + 2]);
        // Schlitze von der Unterkante
        for (i = [0:len(m_werte) - 1])
            translate([7.4 + i*14.8 - m_werte[i]/2, -1, -1])
                cube([m_werte[i], 13, a_d + 2]);
    }
}

// ------------------------------------------------------- Lehre B
module kammleiste(p, y0) {
    l0 = 22; l1 = b_b - 4;                       // Anfang/Ende der Rinne
    difference() {
        translate([2, y0, b_d]) cube([b_b - 4, 14, steg_h]);
        translate([l0, y0 + 7 - rinne_b/2, b_d + steg_h - rinne_t])
            cube([l1 - l0 + 1, rinne_b, rinne_t + 1]);
    }
    // wechselseitige Halbstege im Abstand p/2
    for (i = [0 : floor((l1 - l0 - 2)/(p/2))]) {
        x = l0 + 1 + i*p/2;
        s = (i % 2 == 0) ? 0 : 1;
        translate([x, y0 + 7 - rinne_b/2 + s*rinne_b/2 + 0.2,
                   b_d + steg_h - rinne_t])
            cube([steg_l, rinne_b/2 - 0.4, steg_hh]);
    }
    translate([0, 0, b_d + steg_h]) txt(13, y0 + 7, str(p), 4.2);   // Zahl auf die Leiste
}

module lehre_B() {
    translate([3, 3, 0]) platte(b_b, b_t, b_d);
    for (i = [0:len(k_werte) - 1]) kammleiste(k_werte[i], 3 + i*15);
}

// ------------------------------------------------------- Ausgabe
if      (teil == "A") lehre_A();
else if (teil == "B") lehre_B();
else { lehre_A(); translate([0, a_t + 8, 0]) lehre_B(); }
