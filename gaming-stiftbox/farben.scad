// =====================================================================
//  Farbstudie zur Stiftbox: Sockel und Turm getrennt eingefaerbt.
//  OpenSCAD kann in der Vorschau keine Boolesche Operation einfaerben,
//  darum zwei Schritte:
//    1) openscad -D 'teil="sockel"' -o teil_sockel.stl farben.scad
//       openscad -D 'teil="turm"'   -o teil_turm.stl   farben.scad
//    2) openscad -D 'teil="farbe"' -D v=0 -o farbstudie.png farben.scad
// =====================================================================
use <stiftbox.scad>

teil      = "farbe";     // "sockel", "turm" oder "farbe"
v         = 0;           // Farbschema
z_wechsel = 5;           // Hoehe des Filamentwechsels

// [Sockelfarbe, Turmfarbe]
farben = [ ["#00E5FF", "#16181A"],    // 0  Neon Noir   - Cyan transluzent auf Mattschwarz
           ["#FCEE0A", "#16181A"],    // 1  2077        - Neongelb auf Mattschwarz
           ["#FF2D95", "#1C1E24"] ];  // 2  Synthwave   - Magenta auf Gunmetal

if (teil == "sockel")
    intersection() { stiftbox(); translate([-99,-99,-1]) cube([198,198,z_wechsel+1]); }
else if (teil == "turm")
    difference()   { stiftbox(); translate([-99,-99,-1]) cube([198,198,z_wechsel+1]); }
else {
    color(farben[v][0]) import("teil_sockel.stl");
    color(farben[v][1]) import("teil_turm.stl");
}
