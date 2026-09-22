// =====================================================================
//  Gehaeuse fuer NFC-Reader:  ESP32 D1 Mini + PN532 (rotes V3-Board)
//  Schale (nach unten offen) + Bodenplatte, 4 Schrauben M3.
//  Beide Teile drucken flach und ohne Stuetzen.
//
//  z = 0 ist die Innenseite der Bodenplatte.
//  ALLE MODULMASSE SIND ANNAHMEN - vor dem Druck nachmessen.
// =====================================================================

/* [Verkabelung - bestimmt die Bauhoehe] */
verkabelung = "dupont";   // "dupont" oder "geloetet"

/* [Module - nachmessen!] */
pn_b      = 43;     // PN532 Platine Breite
pn_t      = 41;     // PN532 Platine Tiefe
pn_pcb    = 1.6;
pn_unten  = 3.5;    // Bauteile auf der Bestueckungsseite
pn_kabel  = (verkabelung == "dupont") ? 15 : 4;   // Buchsen unter dem PN532

esp_b     = 26;     // ESP32 D1 Mini Breite
esp_t     = 34.5;   // Laenge
esp_pcb   = 1.6;
esp_unten = 2.0;    // Bauteile auf der Unterseite
esp_oben  = (verkabelung == "dupont") ? 25.5 : 4.0;
// dupont: Buchsenleiste 8,5 + Steckerkoerper 14 + Kabelbogen 3 - NACHMESSEN
// geloetet: nur die Draehte, dann wird das Gehaeuse weniger als halb so hoch

usb_b     = 13;     // Ausschnitt Breite
usb_h     = 7;      // Ausschnitt Hoehe
esp_rand  = 2.0;    // Abstand Platinenkante zur Innenwand hinten

/* [Gehaeuse] */
innen_b   = 47;
innen_t   = 50;
wand      = 2.2;
fenster   = 1.6;    // ueber der NFC-Antenne - duenn halten
boden_d   = 2.0;
luft      = 0.4;    // Spiel fuer die Platinen
eckradius = 4;
fase      = 0.8;

/* [Schnappverschluss] */
rast_b    = 14;     // Breite der Rastarme
rast_w    = 1.6;    // Dicke der Rastarme
rast_h    = 6.0;    // Laenge der Rastarme
rast_nase = 0.8;    // Rasthoehe
rast_z    = 2.0;    // Unterkante der Rastfenster ueber dem Innenboden
fen_h     = 2.6;    // Hoehe der Rastfenster

/* [Aufhaengeoese] */
oese_an    = true;
oese_aus   = 9;     // wie weit der Bogen aus der Wand kommt
oese_h     = 16;    // Durchmesser des Auges
oese_d     = 7;     // Dicke der Oese
oese_loch  = 8.5;   // Bohrung - Buegel bis 7,5 mm, Karabiner, Schnur
oese_z     = 24;    // Hoehe der Lochmitte ueber dem Innenboden

/* [Halter] */
kl_lang   = 8;      // Schenkellaenge der Eckwinkel
kl_wand   = 1.8;
nase      = 0.9;    // Rasthoehe
nase_h    = 1.6;    // Hoehe der Einfuehrschraege

$fn = 48;

// ---------------------------------------------------------- Ableitungen
esp_uk   = esp_unten;                 // Unterkante ESP-Platine
esp_ok   = esp_uk + esp_pcb;
stapel   = esp_ok + esp_oben;         // hoechster Punkt der ESP-Verkabelung
pn_uk    = stapel + 1.5;              // Unterkante PN532-Bauteile
pn_tasche = pn_unten + pn_pcb;        // Tiefe der Einlassung
innen_h  = pn_uk + pn_tasche;         // bis zur Innenseite des Fensters
aussen_b = innen_b + 2*wand;
aussen_t = innen_t + 2*wand;
rast_y   = [-14, 14];                  // Laengspositionen der Schnapper
esp_cy   = innen_t/2 - esp_rand - esp_t/2;   // Mitte der ESP-Platine in y

// ---------------------------------------------------------- Plausibilitaet
assert(innen_b >= pn_b + 2*luft + 2.4, "innen_b zu klein - die Einlassung braucht Wand");
assert(innen_t >= pn_t + 2*luft + 2.4, "innen_t zu klein - die Einlassung braucht Wand");
assert(innen_h - pn_unten - pn_pcb >= pn_kabel,
       "Unter dem PN532 ist kein Platz fuer die aufgesteckten Buchsen - esp_oben pruefen");
assert(esp_cy - esp_t/2 > -innen_t/2 + 2, "ESP32 passt nicht in die Tiefe");
echo(str("Aussenmasse: ", aussen_b, " x ", aussen_t, " x ", innen_h + fenster + boden_d, " mm"));
echo(str("Freie Hoehe ueber der ESP-Platine: ", innen_h - pn_unten - pn_pcb - esp_ok, " mm"));

module rbox(b, t, h, r) {
    linear_extrude(h) offset(r = r) square([max(b-2*r,0.01), max(t-2*r,0.01)], center = true);
}

// Vier Eckwinkel, die eine Platine seitlich fassen
module eckwinkel(b, t, cy, z0, z1) {
    for (sx = [-1,1], sy = [-1,1]) {
        x = sx*(b/2 + luft + kl_wand/2);
        y = cy + sy*(t/2 + luft + kl_wand/2);
        translate([0, 0, (z0+z1)/2]) {
            translate([x, y - sy*(kl_lang - kl_wand)/2, 0]) cube([kl_wand, kl_lang, z1-z0], center = true);
            translate([x - sx*(kl_lang - kl_wand)/2, y, 0]) cube([kl_lang, kl_wand, z1-z0], center = true);
        }
    }
}

// Rastnase an zwei gegenueberliegenden Seiten.
// richtung = +1: Platine wird von unten eingeschoben (Nase haelt nach unten)
// richtung = -1: Platine wird von oben eingelegt (Nase haelt nach oben)
module rastnasen(b, cy, z, richtung) {
    e = 0.4;   // etwas in die Wand eingelassen, sonst liegen Flaechen aufeinander
    for (sx = [-1,1]) translate([sx*(b/2 + luft + e), cy, z])
        rotate([90, 0, 0]) linear_extrude(kl_lang, center = true)
            polygon([[0,0], [-sx*(nase+e), 0], [0, -richtung*nase_h]]);
}

// Aufhaengeoese an der linken Seitenwand. Das Loch ist als Tropfen
// ausgefuehrt, damit es in Drucklage ohne Stuetze bleibt.
module oese() {
    translate([-(innen_b/2 + wand - 0.5), 0, oese_z]) difference() {
        rotate([90, 0, 0]) linear_extrude(oese_d, center = true) hull() {
            square([1.5, oese_h], center = true);
            translate([-oese_aus, 0]) circle(d = oese_h);
        }
        rotate([90, 0, 0]) linear_extrude(oese_d + 2, center = true) hull() {
            translate([-oese_aus, 0]) circle(d = oese_loch);
            translate([-oese_aus, -oese_loch*0.62]) circle(d = 0.8);
        }
    }
}

// ---------------------------------------------------------- Schale
module schale() {
    difference() {
        union() {
            difference() {
                rbox(aussen_b, aussen_t, innen_h + fenster, eckradius);
                // Hauptinnenraum bis unter die Einlassung
                translate([0, 0, -1]) rbox(innen_b, innen_t, innen_h - pn_tasche + 1, eckradius - wand);
                // Einlassung: das PN532 sitzt passgenau unter dem Fenster
                translate([0, 0, innen_h - pn_tasche])
                    rbox(pn_b + 2*luft, pn_t + 2*luft, pn_tasche + 1, 1.5);
            }
            rastnasen(pn_b, 0, innen_h - pn_tasche, 1);   // haelt die Platine in der Einlassung
            if (oese_an) oese();
        }
        // Rastfenster in den Laengswaenden
        for (sx = [-1,1], yy = rast_y)
            translate([sx*(innen_b/2 + wand/2), yy, rast_z + fen_h/2])
                cube([wand + 2, rast_b, fen_h], center = true);
        translate([0, aussen_t/2, esp_ok + usb_h/2 - 0.5])
            cube([usb_b, 2*wand + 2, usb_h], center = true);
        // Fase an der Oberkante
        translate([0, 0, innen_h + fenster - fase]) difference() {
            rbox(aussen_b + 2, aussen_t + 2, fase + 0.1, eckradius);
            translate([0, 0, -0.05]) linear_extrude(fase + 0.2, scale = 1)
                offset(r = eckradius) square([aussen_b - 2*eckradius, aussen_t - 2*eckradius], center = true);
        }
    }
}

// ---------------------------------------------------------- Bodenplatte
module boden() {
    difference() {
        union() {
            translate([0, 0, -boden_d]) rbox(aussen_b, aussen_t, boden_d, eckradius);
            difference() {                       // Zentrierlippe als Ring
                translate([0, 0, -0.01]) rbox(innen_b - 0.5, innen_t - 0.5, 1.2, max(eckradius - wand, 1));
                translate([0, 0, -0.2]) rbox(innen_b - 5.5, innen_t - 5.5, 1.6, max(eckradius - wand, 1));
            }
            // Rastarme mit Nase, greifen in die Fenster der Schale
            for (sx = [-1,1], yy = rast_y) translate([sx*(innen_b/2 - rast_w/2 - 0.3), yy, 0]) {
                translate([0, 0, rast_h/2]) cube([rast_w, rast_b, rast_h], center = true);
                translate([sx*rast_nase/2, 0, rast_z]) hull() {     // Nase mit Einfuehrschraege
                    cube([rast_w + rast_nase, rast_b, 0.01], center = true);
                    translate([0, 0, fen_h - 0.5]) cube([rast_w, rast_b, 0.01], center = true);
                }
            }
            eckwinkel(esp_b, esp_t, esp_cy, 0, esp_ok + 1.2);
            // Auflageleisten fuer die ESP-Platine
            for (sy = [-1,1]) translate([0, esp_cy + sy*(esp_t/2 - 3), esp_uk/2])
                cube([esp_b - 4, 4, esp_uk], center = true);
            rastnasen(esp_b, esp_cy, esp_ok, -1);
        }
        // nichts mehr zu bohren - der Boden schnappt ein
    }
}

// ---------------------------------------------------------- Ausgabe
teil = "beides";
if (teil == "schale") translate([0, 0, innen_h + fenster]) rotate([180, 0, 0]) schale();  // Drucklage: NFC-Flaeche aufs Bett
if (teil == "boden")  translate([0, 0, boden_d]) boden();   // Drucklage: flach
if (teil == "beides") { schale(); translate([0, 0, -14]) boden(); }
if (teil == "montage") {
    %schale(); %boden();
    color("#b03a2e") translate([-pn_b/2, -pn_t/2, innen_h - pn_pcb]) cube([pn_b, pn_t, pn_pcb]);
    color("#1f618d") translate([-esp_b/2, esp_cy - esp_t/2, esp_uk]) cube([esp_b, esp_t, esp_pcb]);
    color("#5d6d7e") translate([-esp_b/2 + 2, esp_cy - esp_t/2, esp_ok]) cube([esp_b - 4, esp_t, esp_oben]);
}
