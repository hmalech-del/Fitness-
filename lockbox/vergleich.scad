// Vergleichsbild: Kasten geschlossen mit Schloss-Attrappe (nicht zum Drucken)
// Aufruf:  openscad -D variante="kompakt" -D teil="keins" -o x.png vergleich.scad
include <schluesselsafe.scad>

module schloss(bd = 6, spann = 17, koerper = [34, 19, 42]) {
    color("#3d4756") {
        for (z = [0, -spann]) translate([-15, 0, z]) rotate([0,90,0]) cylinder(d = bd, h = 26, $fn=40);
        translate([11, 0, -spann/2]) rotate([0,90,0]) rotate([90,0,0])
            rotate_extrude(angle = 180, $fn=48) translate([spann/2, 0]) circle(d = bd, $fn=24);
        translate([-koerper[0]/2 - 15, 0, -spann/2]) cube(koerper, center = true);
    }
}
kasten();
color("#cfd8e3") deckel();
translate([0, loch_y, loch_z])
    schloss(k ? 5 : 6, k ? 15 : 17, k ? [28,15,34] : [34,19,42]);
