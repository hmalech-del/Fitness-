use <lockbox.scad>
loch_z = 68;  // aussen_h + deckel_dicke + buegel_z

// --- Attrappe eines Vorhaengeschlosses (nur Vorschau) ---------------
module schloss(bd = 6, w = 17, h = 24) {
    color("#3d4756") {
        // Schenkel laufen in Y-Richtung: einer steckt im Riegelloch
        for (x = [0, w]) translate([x, -22.5, 0]) rotate([90,0,0]) cylinder(d = bd, h = 17, center = true);
        translate([w/2, -14, 0]) rotate([0,90,0]) rotate_extrude(angle = 180)
            translate([w/2, 0]) circle(d = bd);            // Buegelbogen
        translate([w/2, -37.5, 0]) cube([w + 6, 13, h], center = true);   // Schlosskoerper
    }
}
module schloss_gesteckt() { translate([0, 0, loch_z]) rotate([0, 22, 0]) schloss(); }

modus = "zu";
if (modus == "zu")    { body(); color("#cfd8e3") lid(); schloss_gesteckt(); }
if (modus == "explo") { body(); translate([0, 0, 42]) color("#cfd8e3") lid(); translate([0,0,42]) schloss_gesteckt(); }
if (modus == "druck") { translate([-52, 0, 0]) body(); translate([52, 0, 0]) color("#cfd8e3") lid_druckbar(); }
