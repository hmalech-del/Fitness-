// Vorschaubilder fuer den Schluesselsafe (nicht zum Drucken)
use <schluesselsafe.scad>

loch_y = -36; loch_z = 40; fuge = 52; oben = 77;

module schloss(bd = 7, spann = 20) {
    color("#3d4756") {
        for (z = [0, -spann]) translate([-15, 0, z]) rotate([0, 90, 0]) cylinder(d = bd, h = 26, $fn=40);
        translate([11, 0, -spann/2]) rotate([0, 90, 0]) rotate([90, 0, 0])
            rotate_extrude(angle = 180, $fn=48) translate([spann/2, 0]) circle(d = bd, $fn=24);
        translate([-32, 0, -spann/2]) cube([34, 19, 42], center = true);
    }
}
module schloss_dran(dz = 0) { translate([0, loch_y, loch_z + dz]) schloss(); }

modus = "zu";
if (modus == "zu")    { kasten(); color("#cfd8e3") deckel(); schloss_dran(); }
if (modus == "explo") { kasten(); translate([0,0,58]) color("#cfd8e3") deckel(); }
if (modus == "druck") { translate([-55,0,0]) kasten(); translate([58,0,0]) color("#cfd8e3") deckel_druckbar(); }
if (modus == "schnitt") {
    difference() {
        union() { kasten(); color("#cfd8e3") deckel(); }
        translate([0, -100, -10]) cube([200, 200, 200]);   // rechte Haelfte wegschneiden
    }
}

// --- Technischer Querschnitt (2D, aus dem Modell geschnitten) --------
// Schnittebene x=0 wird durch rotate([0,90,0]) auf z=0 gelegt.
if (modus == "quer") {
    rotate([0, 0, 90]) {           // Schnitt hochkant stellen
        color("#c8992a") linear_extrude(1)
            projection(cut = true) rotate([0, 90, 0]) kasten();
        color("#6d8299") translate([0, 0, -0.2]) linear_extrude(1.4)
            projection(cut = true) rotate([0, 90, 0]) deckel();
    }
}
