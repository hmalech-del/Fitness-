#!/usr/bin/env python3
"""Prueflauf fuer FDM-Teile. Braucht trimesh + manifold3d.

  check  teil.stl                     dicht, Masse, Ueberhang, Luftstart
  fit    a.stl b.stl                  Durchdringung zweier Teile
  sect   teil.stl --plane z --at 22.5 Querschnitt + Widerstandsmoment
  scan   teil.stl --plane z --from 5 --to 34
  probe  teil.stl --at X Y Z --dir 0 1 0   Abstand bis zum ersten Material

--clip "x>0" / "y<-26" grenzt auf einen Teilbereich ein (mehrfach moeglich).
"""
import argparse, sys
import numpy as np
import trimesh

T = 0.4                 # Dicke der Schnittscheibe
BED = 0.3               # Bettflaeche ausmaskieren
STEIL = -0.72           # n_z darunter = steiler als 45 Grad
WAAGERECHT = -0.95


def load(p):
    m = trimesh.load(p)
    if isinstance(m, trimesh.Scene):
        m = trimesh.util.concatenate(list(m.geometry.values()))
    return m


def clipbox(specs, ref):
    """--clip "x>0" -> Quader, der nur diesen Halbraum behaelt."""
    lo, hi = ref.bounds - np.array([[50.]*3, [-50.]*3])
    for s in specs or []:
        ax = "xyz".index(s[0]); val = float(s[2:])
        if s[1] == ">": lo[ax] = max(lo[ax], val)
        elif s[1] == "<": hi[ax] = min(hi[ax], val)
        else: sys.exit("clip braucht > oder <: %r" % s)
    ext = np.maximum(hi - lo, 1e-3)
    b = trimesh.creation.box(extents=ext)
    b.apply_translation((lo + hi) / 2)
    return b


def slab(m, plane, at, clip=None, thick=T):
    ext = {"x": [thick, 1e3, 1e3], "y": [1e3, thick, 1e3], "z": [1e3, 1e3, thick]}[plane]
    off = {"x": [at, 0, 0], "y": [0, at, 0], "z": [0, 0, at]}[plane]
    b = trimesh.creation.box(extents=ext); b.apply_translation(off)
    r = m.intersection(b)
    if clip is not None and not r.is_empty:
        r = r.intersection(clip)
    if r.is_empty:
        return None
    return trimesh.Trimesh(r.vertices, r.faces)


def sect_props(r, plane, thick=T):
    """Flaeche und Widerstandsmoment um die beiden Querachsen."""
    A = r.volume / thick
    J = r.moment_inertia
    ax = "xyz".index(plane)
    others = [i for i in range(3) if i != ax]
    out = {"A": A}
    for i in others:
        I = J[i][i] / thick                       # int (Abstand zur Achse i)^2 dA
        c = max(abs(r.bounds[1][i] - r.centroid[i]), 0.05)
        out["I_%s" % "xyz"[i]] = I
        out["W_%s" % "xyz"[i]] = I / c
    return out


def cmd_check(a):
    m = load(a.stl)
    z0, z1 = m.bounds[0][2], m.bounds[1][2]
    print("Datei      : %s" % a.stl)
    print("dicht      : %s   offene Kanten: %d" % (
        m.is_watertight, 0 if m.is_watertight else len(m.outline().entities)))
    print("Aussenmasse: %s mm" % np.round(m.bounds[1] - m.bounds[0], 2))
    print("Volumen    : %.1f cm3  (~%.0f g PETG)" % (m.volume / 1000, m.volume * 1.27 / 1000))
    n, ar, c = m.face_normals, m.area_faces, m.triangles_center
    frei = c[:, 2] > z0 + BED
    steil = (n[:, 2] < STEIL) & frei
    flach = (n[:, 2] < WAAGERECHT) & frei
    print("Ueberhang  : %.0f mm2 steiler als 45 Grad, davon %.0f mm2 waagerecht"
          % (ar[steil].sum(), ar[flach].sum()))
    if ar[flach].sum() > 1.0:
        print("  waagerechte Flaechen (pruefen, ob Material darunter liegt):")
        cc, aa = c[flach], ar[flach]
        for z in np.unique(np.round(cc[:, 2], 1)):
            s = np.abs(cc[:, 2] - z) < 0.06
            if aa[s].sum() > 1.0:
                print("    Druckhoehe %6.2f : %6.1f mm2   x %7.1f..%-7.1f y %7.1f..%.1f"
                      % (z, aa[s].sum(), cc[s][:, 0].min(), cc[s][:, 0].max(),
                         cc[s][:, 1].min(), cc[s][:, 1].max()))
        print("  -> Faengt eine davon IN DER LUFT an, wird sie ins Leere gedruckt.")
    # Querschnittsverlauf ueber der Hoehe: ein Sprung nach oben heisst Luftstart
    print("Querschnitt ueber der Druckhoehe (Sprung = Material ohne Unterlage):")
    prev = None
    for z in np.linspace(z0 + 0.2, z1 - 0.2, 14):
        r = slab(m, "z", z)
        A = 0.0 if r is None else r.volume / T
        flag = ""
        if prev is not None and A > prev * 1.6 + 25:
            flag = "   <-- Sprung, pruefen"
        print("   z=%7.2f : %7.1f mm2%s" % (z - z0, A, flag))
        prev = max(A, 1.0)


def cmd_fit(a):
    m1, m2 = load(a.stl_a), load(a.stl_b)
    r = m1.intersection(m2)
    v = 0.0 if r.is_empty else r.volume
    print("Durchdringung: %.3f mm3  %s" % (v, "OK" if v < 1e-3 else "KOLLISION"))
    print("  (beide Teile muessen in EINBAULAGE vorliegen, nicht in Drucklage)")
    if v >= 1e-3:
        print("  Ort: x %.1f..%.1f  y %.1f..%.1f  z %.1f..%.1f"
              % (*r.bounds[:, 0], *r.bounds[:, 1], *r.bounds[:, 2]))


def cmd_sect(a):
    m = load(a.stl); cl = clipbox(a.clip, m)
    r = slab(m, a.plane, a.at, cl)
    if r is None:
        print("Schnitt leer."); return
    p = sect_props(r, a.plane)
    print("Schnitt %s = %.2f   A = %.1f mm2" % (a.plane, a.at, p["A"]))
    for k in sorted(p):
        if k.startswith("W_"):
            print("   %s = %8.1f mm3   (%s = %10.0f mm4)" % (k, p[k], k.replace("W", "I"), p["I" + k[1:]]))
    print("   Bruchlast bei 26 MPa quer zur Lage: %s"
          % "  ".join("%s %.0f N*mm" % (k, p[k] * 26) for k in sorted(p) if k.startswith("W_")))


def cmd_scan(a):
    m = load(a.stl); cl = clipbox(a.clip, m)
    print(" %s        A mm2      W (Querachsen)" % a.plane)
    for v in np.arange(a.start, a.end + 1e-9, a.step):
        r = slab(m, a.plane, v, cl)
        if r is None:
            print("  %7.2f      -" % v); continue
        p = sect_props(r, a.plane)
        ws = "  ".join("%s=%7.1f" % (k, p[k]) for k in sorted(p) if k.startswith("W_"))
        print("  %7.2f %8.1f   %s" % (v, p["A"], ws))


def cmd_probe(a):
    """Abstand von einem Punkt entlang einer Richtung bis zum ersten Material.
    So misst man Passungsspalte: Punkt auf die Flaeche des einen Teils legen,
    Richtung zum anderen Teil, und dieses andere Teil als Datei uebergeben."""
    m = load(a.stl)
    pos = np.array(a.at, float); d = np.array(a.dir, float); d /= np.linalg.norm(d)
    ex = 0.2 + 0.8 * (np.abs(d) < 0.5)
    for g in np.arange(0.0, a.max, 0.05):
        b = trimesh.creation.box(extents=ex)
        b.apply_translation(pos + d * g)
        if not m.intersection(b).is_empty:
            print("Spalt: %.2f mm   (ab %s in Richtung %s)"
                  % (max(g - 0.1, 0), np.round(pos, 2).tolist(), np.round(d, 2).tolist()))
            return
    print("Kein Material innerhalb von %.1f mm. Startpunkt und Richtung pruefen." % a.max)


P = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
sub = P.add_subparsers(dest="cmd", required=True)
c = sub.add_parser("check"); c.add_argument("stl"); c.set_defaults(fn=cmd_check)
f = sub.add_parser("fit"); f.add_argument("stl_a"); f.add_argument("stl_b"); f.set_defaults(fn=cmd_fit)
for name, fn in (("sect", cmd_sect), ("scan", cmd_scan)):
    s = sub.add_parser(name); s.add_argument("stl")
    s.add_argument("--plane", choices="xyz", default="z")
    s.add_argument("--clip", action="append")
    if name == "sect":
        s.add_argument("--at", type=float, required=True)
    else:
        s.add_argument("--from", dest="start", type=float, required=True)
        s.add_argument("--to", dest="end", type=float, required=True)
        s.add_argument("--step", type=float, default=1.0)
    s.set_defaults(fn=fn)
g = sub.add_parser("probe"); g.add_argument("stl")
g.add_argument("--at", nargs=3, type=float, required=True)
g.add_argument("--dir", nargs=3, type=float, required=True)
g.add_argument("--max", type=float, default=10.0); g.set_defaults(fn=cmd_probe)

a = P.parse_args()
a.fn(a)
