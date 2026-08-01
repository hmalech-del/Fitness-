/* =====================================================================
 * FitPlan – Animations-Engine
 * Erzeugt animierte SVG-Strichfiguren per SMIL.
 * Jede Animation besteht aus einer Liste von Posen (Gelenk-Koordinaten),
 * zwischen denen weich interpoliert wird.
 * ViewBox: 0 0 220 200, Boden bei y = 182.
 * ===================================================================== */

(function (global) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  // Gelenke: head, neck (= Schulter), hip, kneeF/footF (vorderes Bein),
  // kneeB/footB (hinteres Bein), elbowF/handF, elbowB/handB
  //
  // Die Figur wird mit Volumen gezeichnet: Rumpf als breite "Shirt"-Kapsel,
  // Arme in Hautfarbe, Beine in Hosenfarbe. Hintere Gliedmaßen sind
  // abgedunkelt, damit Tiefe erkennbar ist. Zeichenreihenfolge = Ebenen:
  // hintere Gliedmaßen → Rumpf → vorderes Bein → Kopf → vorderer Arm.
  const LAYERS = [
    { bones: [['neck', 'elbowB'], ['elbowB', 'handB']], cls: 'arm arm-b', dot: ['handB', 'hand hand-b', 3.2] },
    { bones: [['hip', 'kneeB'], ['kneeB', 'footB']], cls: 'leg leg-b', dot: ['footB', 'shoe shoe-b', 4.5] },
    { bones: [['head', 'neck']], cls: 'neck-line' },
    { bones: [['neck', 'hip']], cls: 'torso' },
    { bones: [['hip', 'kneeF'], ['kneeF', 'footF']], cls: 'leg leg-f', dot: ['footF', 'shoe shoe-f', 4.5] },
    { head: true },
    { bones: [['neck', 'elbowF'], ['elbowF', 'handF']], cls: 'arm arm-f', dot: ['handF', 'hand hand-f', 3.2] },
  ];

  // ------------------------------------------------------------------
  // Basis-Posen
  // ------------------------------------------------------------------
  const STAND = {
    head: [101, 44], neck: [100, 58], hip: [100, 112],
    kneeF: [102, 146], footF: [104, 182], kneeB: [97, 146], footB: [95, 182],
    elbowF: [103, 84], handF: [104, 108], elbowB: [97, 84], handB: [96, 108],
  };

  const STAND_FRONT = {
    head: [100, 44], neck: [100, 58], hip: [100, 112],
    kneeF: [105, 146], footF: [106, 182], kneeB: [95, 146], footB: [94, 182],
    elbowF: [111, 82], handF: [114, 105], elbowB: [89, 82], handB: [86, 105],
  };

  const PUSHUP_UP = {
    head: [162, 132], neck: [150, 138], hip: [96, 158],
    kneeF: [68, 168], footF: [40, 178], kneeB: [66, 166], footB: [38, 176],
    elbowF: [149, 160], handF: [148, 182], elbowB: [145, 158], handB: [144, 180],
  };

  const QUADRUPED = {
    head: [151, 130], neck: [140, 136], hip: [92, 138],
    kneeF: [90, 178], footF: [64, 180], kneeB: [88, 176], footB: [62, 178],
    elbowF: [140, 158], handF: [140, 180], elbowB: [136, 156], handB: [136, 178],
  };

  const p = (base, over) => Object.assign({}, base, over);

  // Rückenlage (Kopf links) – Basis für Boden-Übungen
  const LYING = {
    head: [34, 168], neck: [46, 173], hip: [96, 176],
    kneeF: [116, 150], footF: [128, 180], kneeB: [114, 148], footB: [126, 178],
    elbowF: [66, 178], handF: [84, 178], elbowB: [64, 176], handB: [82, 176],
  };

  // Hüftbeuge (Kreuzheben) – von rdl und Band-Variante geteilt
  const RDL_HINGE = {
    head: [150, 92], neck: [138, 97], hip: [86, 120],
    kneeF: [100, 150], footF: [104, 182], kneeB: [95, 150], footB: [95, 182],
    elbowF: [140, 120], handF: [141, 144], elbowB: [136, 118], handB: [137, 142],
  };

  // Frontheben oben – von Kurzhantel- und Band-Variante geteilt
  const FRONTRAISE_UP = p(STAND, {
    elbowF: [124, 62], handF: [148, 64],
    elbowB: [120, 64], handB: [144, 66],
  });

  // Curl-Bewegung (Kurzhantel- und Band-Variante geteilt). Die Zwischenpose
  // mit waagerechtem Unterarm lässt die Hand sichtbar um den Ellbogen
  // kreisen, statt auf gerader Linie durch den Körper abzukürzen.
  const CURL_POSES = [
    STAND,
    p(STAND, { elbowF: [103, 84], handF: [127, 85], elbowB: [97, 84], handB: [121, 86] }),
    p(STAND, { elbowF: [103, 84], handF: [112, 64], elbowB: [97, 84], handB: [106, 66] }),
    p(STAND, { elbowF: [103, 84], handF: [127, 85], elbowB: [97, 84], handB: [121, 86] }),
  ];
  const CURL_HOLDS = [true, false, true, false];

  // Seitheben (Kurzhantel- und Band-Variante geteilt): 45°-Zwischenpose,
  // damit die Arme sichtbar seitlich um die Schulter kreisen.
  const LATERAL_POSES = [
    p(STAND_FRONT, { elbowF: [110, 82], handF: [113, 104], elbowB: [90, 82], handB: [87, 104] }),
    p(STAND_FRONT, { elbowF: [118, 76], handF: [134, 92], elbowB: [82, 76], handB: [66, 92] }),
    p(STAND_FRONT, { elbowF: [125, 60], handF: [147, 58], elbowB: [75, 60], handB: [53, 58] }),
    p(STAND_FRONT, { elbowF: [118, 76], handF: [134, 92], elbowB: [82, 76], handB: [66, 92] }),
  ];
  const LATERAL_HOLDS = [true, false, true, false];

  // ------------------------------------------------------------------
  // Animationen: { dur (s), poses [...], props [...] }
  // Prop-Typen: dumbbell (joint), band (from/to: Gelenk oder [x,y])
  // ------------------------------------------------------------------
  const ANIMS = {

    squat: {
      dur: 2.6,
      poses: [
        STAND,
        {
          head: [98, 82], neck: [95, 95], hip: [86, 146],
          kneeF: [112, 158], footF: [104, 182], kneeB: [107, 158], footB: [95, 182],
          elbowF: [116, 98], handF: [134, 100], elbowB: [112, 100], handB: [130, 102],
        },
      ],
    },

    squat_hold: {
      dur: 3,
      poses: [
        {
          head: [98, 82], neck: [95, 95], hip: [86, 146],
          kneeF: [112, 158], footF: [104, 182], kneeB: [107, 158], footB: [95, 182],
          elbowF: [116, 98], handF: [134, 100], elbowB: [112, 100], handB: [130, 102],
        },
        {
          head: [98, 84], neck: [95, 97], hip: [86, 148],
          kneeF: [112, 159], footF: [104, 182], kneeB: [107, 159], footB: [95, 182],
          elbowF: [116, 100], handF: [134, 102], elbowB: [112, 102], handB: [130, 104],
        },
      ],
    },

    lunge: {
      dur: 2.6,
      poses: [
        STAND,
        {
          head: [101, 72], neck: [100, 86], hip: [100, 140],
          kneeF: [124, 152], footF: [124, 182], kneeB: [88, 162], footB: [72, 182],
          elbowF: [108, 106], handF: [102, 122], elbowB: [92, 106], handB: [98, 122],
        },
      ],
    },

    lunge_hold: {
      dur: 3,
      poses: [
        {
          head: [101, 72], neck: [100, 86], hip: [100, 140],
          kneeF: [124, 152], footF: [124, 182], kneeB: [88, 162], footB: [72, 182],
          elbowF: [108, 106], handF: [102, 122], elbowB: [92, 106], handB: [98, 122],
        },
        {
          head: [101, 76], neck: [100, 90], hip: [100, 144],
          kneeF: [124, 154], footF: [124, 182], kneeB: [88, 164], footB: [72, 182],
          elbowF: [108, 110], handF: [102, 126], elbowB: [92, 110], handB: [98, 126],
        },
      ],
    },

    pushup: {
      dur: 2.2,
      poses: [
        PUSHUP_UP,
        {
          head: [163, 160], neck: [150, 166], hip: [96, 168],
          kneeF: [68, 173], footF: [40, 178], kneeB: [66, 171], footB: [38, 176],
          elbowF: [163, 174], handF: [148, 182], elbowB: [159, 172], handB: [144, 180],
        },
      ],
    },

    plank: {
      dur: 3,
      poses: [
        {
          head: [152, 146], neck: [141, 152], hip: [92, 160],
          kneeF: [65, 169], footF: [38, 178], kneeB: [62, 167], footB: [35, 176],
          elbowF: [146, 178], handF: [164, 178], elbowB: [142, 176], handB: [160, 176],
        },
        {
          head: [152, 144], neck: [141, 150], hip: [92, 157],
          kneeF: [65, 168], footF: [38, 178], kneeB: [62, 166], footB: [35, 176],
          elbowF: [146, 178], handF: [164, 178], elbowB: [142, 176], handB: [160, 176],
        },
      ],
    },

    jumpingjack: {
      dur: 1.3,
      // Zwischenpose mit waagerechten Armen (T-Position): Die Arme schwingen
      // sichtbar seitlich über den Bogen nach oben statt durch den Körper.
      poses: [
        {
          head: [100, 44], neck: [100, 58], hip: [100, 112],
          kneeF: [104, 146], footF: [105, 182], kneeB: [96, 146], footB: [95, 182],
          elbowF: [112, 82], handF: [116, 106], elbowB: [88, 82], handB: [84, 106],
        },
        {
          head: [100, 42], neck: [100, 56], hip: [100, 110],
          kneeF: [108, 144], footF: [114, 179], kneeB: [92, 144], footB: [86, 179],
          elbowF: [126, 56], handF: [150, 57], elbowB: [74, 56], handB: [50, 57],
        },
        {
          head: [100, 40], neck: [100, 54], hip: [100, 108],
          kneeF: [112, 144], footF: [124, 180], kneeB: [88, 144], footB: [76, 180],
          elbowF: [116, 44], handF: [108, 22], elbowB: [84, 44], handB: [92, 22],
        },
        {
          head: [100, 42], neck: [100, 56], hip: [100, 110],
          kneeF: [108, 144], footF: [114, 179], kneeB: [92, 144], footB: [86, 179],
          elbowF: [126, 56], handF: [150, 57], elbowB: [74, 56], handB: [50, 57],
        },
      ],
    },

    curl: {
      dur: 2.4,
      poses: CURL_POSES,
      holdMask: CURL_HOLDS,
      props: [{ type: 'dumbbell', joint: 'handF' }, { type: 'dumbbell', joint: 'handB' }],
    },

    press: {
      dur: 2.4,
      poses: [
        p(STAND_FRONT, {
          elbowF: [114, 76], handF: [112, 58],
          elbowB: [86, 76], handB: [88, 58],
        }),
        p(STAND_FRONT, {
          elbowF: [110, 38], handF: [108, 16],
          elbowB: [90, 38], handB: [92, 16],
        }),
      ],
      props: [{ type: 'dumbbell', joint: 'handF' }, { type: 'dumbbell', joint: 'handB' }],
    },

    row: {
      dur: 2.2,
      poses: [
        {
          head: [153, 78], neck: [142, 84], hip: [100, 118],
          kneeF: [103, 149], footF: [104, 182], kneeB: [98, 149], footB: [95, 182],
          elbowF: [144, 108], handF: [145, 130], elbowB: [140, 106], handB: [141, 128],
        },
        {
          head: [153, 78], neck: [142, 84], hip: [100, 118],
          kneeF: [103, 149], footF: [104, 182], kneeB: [98, 149], footB: [95, 182],
          elbowF: [130, 96], handF: [140, 114], elbowB: [126, 94], handB: [136, 112],
        },
      ],
      props: [{ type: 'dumbbell', joint: 'handF' }, { type: 'dumbbell', joint: 'handB' }],
    },

    rdl: {
      dur: 2.8,
      poses: [STAND, RDL_HINGE],
      props: [{ type: 'dumbbell', joint: 'handF' }, { type: 'dumbbell', joint: 'handB' }],
    },

    bandrdl: {
      dur: 2.8,
      poses: [STAND, RDL_HINGE],
      props: [{ type: 'band', from: 'handF', to: 'footF' }],
    },

    goodmorning: {
      dur: 2.8,
      poses: [
        p(STAND, {
          elbowF: [112, 66], handF: [106, 50],
          elbowB: [108, 68], handB: [104, 52],
        }),
        p(RDL_HINGE, {
          elbowF: [136, 80], handF: [148, 86],
          elbowB: [132, 82], handB: [144, 88],
        }),
      ],
    },

    chintuck: {
      dur: 2.6,
      // Kopf gleitet waagerecht nach hinten (Doppelkinn), Körper bleibt ruhig
      poses: [
        p(STAND, { head: [110, 48] }),
        p(STAND, { head: [97, 43] }),
      ],
    },

    wallangel: {
      dur: 2.8,
      // Frontansicht: Arme gleiten von der W-Position in die Y-Position
      poses: [
        p(STAND_FRONT, {
          elbowF: [122, 80], handF: [118, 58],
          elbowB: [78, 80], handB: [82, 58],
        }),
        p(STAND_FRONT, {
          elbowF: [118, 44], handF: [130, 24],
          elbowB: [82, 44], handB: [70, 24],
        }),
      ],
    },

    cheststretch: {
      dur: 3,
      // Arm hinten an der Wand, Oberkörper dreht sanft von der Wand weg
      poses: [
        {
          head: [101, 44], neck: [100, 58], hip: [100, 112],
          kneeF: [102, 146], footF: [104, 182], kneeB: [97, 146], footB: [95, 182],
          elbowF: [82, 64], handF: [66, 70], elbowB: [103, 84], handB: [104, 108],
        },
        {
          head: [104, 45], neck: [103, 59], hip: [101, 112],
          kneeF: [103, 146], footF: [104, 182], kneeB: [97, 146], footB: [95, 182],
          elbowF: [83, 65], handF: [66, 70], elbowB: [106, 85], handB: [107, 109],
        },
      ],
      props: [{ type: 'wall', x: 62 }],
    },

    latpulldown: {
      dur: 2.4,
      poses: [
        p(STAND_FRONT, {
          elbowF: [116, 44], handF: [110, 22],
          elbowB: [84, 44], handB: [90, 22],
        }),
        p(STAND_FRONT, {
          elbowF: [122, 74], handF: [126, 48],
          elbowB: [78, 74], handB: [74, 48],
        }),
      ],
      props: [{ type: 'band', from: 'handF', to: 'handB' }],
    },

    frontraise: {
      dur: 2.4,
      poses: [STAND, FRONTRAISE_UP],
      props: [{ type: 'dumbbell', joint: 'handF' }, { type: 'dumbbell', joint: 'handB' }],
    },

    bandfrontraise: {
      dur: 2.4,
      poses: [STAND, FRONTRAISE_UP],
      props: [{ type: 'band', from: 'handF', to: 'footF' }],
    },

    floorpress: {
      dur: 2.2,
      poses: [
        p(LYING, {
          elbowF: [62, 176], handF: [62, 152],
          elbowB: [58, 174], handB: [58, 150],
        }),
        p(LYING, {
          elbowF: [52, 152], handF: [53, 128],
          elbowB: [48, 150], handB: [49, 126],
        }),
      ],
      props: [{ type: 'dumbbell', joint: 'handF' }, { type: 'dumbbell', joint: 'handB' }],
    },

    kickback: {
      dur: 2.4,
      // Oberarm bleibt waagerecht fixiert, der Unterarm pendelt sichtbar um
      // den Ellbogen: senkrecht hängend → 45° → gestreckt nach hinten.
      poses: [
        {
          head: [153, 78], neck: [142, 84], hip: [100, 118],
          kneeF: [103, 149], footF: [104, 182], kneeB: [98, 149], footB: [95, 182],
          elbowF: [118, 88], handF: [120, 112], elbowB: [114, 86], handB: [116, 110],
        },
        {
          head: [153, 78], neck: [142, 84], hip: [100, 118],
          kneeF: [103, 149], footF: [104, 182], kneeB: [98, 149], footB: [95, 182],
          elbowF: [118, 88], handF: [102, 105], elbowB: [114, 86], handB: [98, 103],
        },
        {
          head: [153, 78], neck: [142, 84], hip: [100, 118],
          kneeF: [103, 149], footF: [104, 182], kneeB: [98, 149], footB: [95, 182],
          elbowF: [118, 88], handF: [94, 90], elbowB: [114, 86], handB: [90, 88],
        },
        {
          head: [153, 78], neck: [142, 84], hip: [100, 118],
          kneeF: [103, 149], footF: [104, 182], kneeB: [98, 149], footB: [95, 182],
          elbowF: [118, 88], handF: [102, 105], elbowB: [114, 86], handB: [98, 103],
        },
      ],
      holdMask: [true, false, true, false],
      props: [{ type: 'dumbbell', joint: 'handF' }, { type: 'dumbbell', joint: 'handB' }],
    },

    overheadtriceps: {
      dur: 2.2,
      poses: [
        p(STAND, {
          elbowF: [105, 36], handF: [88, 48],
          elbowB: [101, 38], handB: [84, 50],
        }),
        p(STAND, {
          elbowF: [105, 36], handF: [107, 14],
          elbowB: [101, 38], handB: [103, 16],
        }),
      ],
      props: [{ type: 'dumbbell', joint: 'handF' }],
    },

    legraise: {
      dur: 2.4,
      poses: [
        p(LYING, {
          kneeF: [124, 177], footF: [152, 178],
          kneeB: [122, 175], footB: [150, 176],
        }),
        p(LYING, {
          kneeF: [100, 149], footF: [101, 121],
          kneeB: [98, 147], footB: [99, 119],
        }),
      ],
    },

    deadbug: {
      dur: 2.6,
      poses: [
        p(LYING, {
          kneeF: [98, 150], footF: [118, 152], kneeB: [96, 148], footB: [116, 150],
          elbowF: [48, 152], handF: [47, 130], elbowB: [44, 150], handB: [43, 128],
        }),
        p(LYING, {
          kneeF: [118, 166], footF: [142, 172], kneeB: [96, 148], footB: [116, 150],
          elbowF: [48, 152], handF: [47, 130], elbowB: [30, 166], handB: [12, 162],
        }),
      ],
    },

    sideplank: {
      dur: 3,
      poses: [
        {
          head: [148, 115], neck: [136, 122], hip: [95, 146],
          kneeF: [68, 163], footF: [42, 180], kneeB: [66, 161], footB: [40, 178],
          elbowF: [138, 150], handF: [156, 152], elbowB: [132, 102], handB: [130, 82],
        },
        {
          head: [148, 118], neck: [136, 125], hip: [95, 152],
          kneeF: [68, 166], footF: [42, 180], kneeB: [66, 164], footB: [40, 178],
          elbowF: [138, 152], handF: [156, 154], elbowB: [132, 105], handB: [130, 85],
        },
      ],
    },

    dip: {
      dur: 2.2,
      poses: [
        {
          head: [124, 91], neck: [120, 104], hip: [102, 148],
          kneeF: [76, 164], footF: [54, 180], kneeB: [74, 162], footB: [52, 178],
          elbowF: [126, 124], handF: [124, 140], elbowB: [122, 122], handB: [120, 138],
        },
        {
          head: [128, 105], neck: [124, 118], hip: [106, 160],
          kneeF: [76, 164], footF: [54, 180], kneeB: [74, 162], footB: [52, 178],
          elbowF: [136, 130], handF: [124, 140], elbowB: [132, 128], handB: [120, 138],
        },
      ],
      props: [{ type: 'chair' }],
    },

    squatjump: {
      dur: 1.1,
      poses: [
        {
          head: [98, 82], neck: [95, 95], hip: [86, 146],
          kneeF: [112, 158], footF: [104, 182], kneeB: [107, 158], footB: [95, 182],
          elbowF: [116, 98], handF: [134, 100], elbowB: [112, 100], handB: [130, 102],
        },
        {
          head: [101, 30], neck: [100, 44], hip: [100, 98],
          kneeF: [102, 133], footF: [104, 168], kneeB: [97, 133], footB: [95, 168],
          elbowF: [108, 32], handF: [106, 12], elbowB: [92, 32], handB: [94, 12],
        },
      ],
    },

    lateralraise: {
      dur: 2.6,
      poses: LATERAL_POSES,
      holdMask: LATERAL_HOLDS,
      props: [{ type: 'dumbbell', joint: 'handF' }, { type: 'dumbbell', joint: 'handB' }],
    },

    glutebridge: {
      dur: 2.6,
      poses: [
        {
          head: [38, 170], neck: [50, 175], hip: [96, 176],
          kneeF: [116, 150], footF: [128, 180], kneeB: [114, 148], footB: [126, 178],
          elbowF: [70, 180], handF: [88, 180], elbowB: [68, 178], handB: [86, 178],
        },
        {
          head: [38, 170], neck: [50, 175], hip: [90, 150],
          kneeF: [116, 146], footF: [128, 180], kneeB: [114, 144], footB: [126, 178],
          elbowF: [70, 180], handF: [88, 180], elbowB: [68, 178], handB: [86, 178],
        },
      ],
    },

    crunch: {
      dur: 2,
      poses: [
        {
          head: [34, 164], neck: [46, 171], hip: [96, 176],
          kneeF: [114, 148], footF: [130, 180], kneeB: [112, 146], footB: [128, 178],
          elbowF: [52, 158], handF: [42, 157], elbowB: [50, 156], handB: [40, 155],
        },
        {
          head: [46, 146], neck: [54, 156], hip: [96, 176],
          kneeF: [114, 148], footF: [130, 180], kneeB: [112, 146], footB: [128, 178],
          elbowF: [62, 142], handF: [52, 140], elbowB: [60, 140], handB: [50, 138],
        },
      ],
    },

    superman: {
      dur: 2.6,
      poses: [
        {
          head: [160, 170], neck: [148, 175], hip: [96, 177],
          kneeF: [72, 178], footF: [46, 178], kneeB: [70, 176], footB: [44, 176],
          elbowF: [166, 176], handF: [184, 176], elbowB: [164, 174], handB: [182, 174],
        },
        {
          head: [162, 158], neck: [150, 164], hip: [96, 175],
          kneeF: [70, 172], footF: [44, 162], kneeB: [68, 170], footB: [42, 160],
          elbowF: [168, 160], handF: [186, 156], elbowB: [166, 158], handB: [184, 154],
        },
      ],
    },

    birddog: {
      dur: 2.8,
      poses: [
        QUADRUPED,
        p(QUADRUPED, {
          elbowF: [158, 132], handF: [178, 130],
          kneeB: [66, 142], footB: [42, 138],
        }),
      ],
    },

    catcow: {
      dur: 3.2,
      poses: [
        p(QUADRUPED, { head: [152, 126], neck: [141, 135], hip: [92, 137] }),
        p(QUADRUPED, { head: [144, 146], neck: [140, 130], hip: [92, 131] }),
      ],
    },

    mountainclimber: {
      dur: 0.9,
      poses: [
        p(PUSHUP_UP, {
          kneeF: [108, 150], footF: [96, 168],
          kneeB: [66, 166], footB: [38, 176],
        }),
        p(PUSHUP_UP, {
          kneeF: [68, 168], footF: [40, 178],
          kneeB: [106, 148], footB: [94, 166],
        }),
      ],
    },

    highknees: {
      dur: 0.8,
      poses: [
        {
          head: [101, 40], neck: [100, 54], hip: [100, 108],
          kneeF: [126, 100], footF: [122, 128], kneeB: [99, 143], footB: [97, 180],
          elbowF: [92, 88], handF: [84, 102], elbowB: [111, 74], handB: [122, 62],
        },
        {
          head: [101, 42], neck: [100, 56], hip: [100, 110],
          kneeF: [99, 143], footF: [97, 180], kneeB: [126, 100], footB: [122, 128],
          elbowF: [112, 74], handF: [123, 62], elbowB: [91, 88], handB: [83, 102],
        },
      ],
    },

    march: {
      dur: 1.6,
      poses: [
        {
          head: [101, 42], neck: [100, 56], hip: [100, 110],
          kneeF: [120, 116], footF: [118, 148], kneeB: [98, 144], footB: [96, 181],
          elbowF: [94, 86], handF: [88, 100], elbowB: [108, 78], handB: [116, 68],
        },
        {
          head: [101, 43], neck: [100, 57], hip: [100, 111],
          kneeF: [99, 144], footF: [97, 181], kneeB: [120, 116], footB: [118, 148],
          elbowF: [109, 78], handF: [117, 68], elbowB: [93, 86], handB: [87, 100],
        },
      ],
    },

    burpee: {
      dur: 3.4,
      poses: [
        STAND,
        {
          head: [105, 91], neck: [102, 104], hip: [88, 152],
          kneeF: [112, 162], footF: [104, 182], kneeB: [107, 162], footB: [95, 182],
          elbowF: [110, 130], handF: [118, 166], elbowB: [106, 128], handB: [114, 164],
        },
        PUSHUP_UP,
        {
          head: [105, 91], neck: [102, 104], hip: [88, 152],
          kneeF: [112, 162], footF: [104, 182], kneeB: [107, 162], footB: [95, 182],
          elbowF: [110, 130], handF: [118, 166], elbowB: [106, 128], handB: [114, 164],
        },
        {
          head: [101, 34], neck: [100, 48], hip: [100, 102],
          kneeF: [102, 137], footF: [104, 172], kneeB: [97, 137], footB: [95, 172],
          elbowF: [108, 36], handF: [106, 16], elbowB: [92, 36], handB: [94, 16],
        },
      ],
    },

    calfraise: {
      dur: 1.8,
      poses: [
        STAND,
        {
          head: [101, 38], neck: [100, 52], hip: [100, 106],
          kneeF: [102, 141], footF: [104, 182], kneeB: [97, 141], footB: [95, 182],
          elbowF: [103, 78], handF: [104, 102], elbowB: [97, 78], handB: [96, 102],
        },
      ],
    },

    pullapart: {
      dur: 2.6,
      poses: [
        p(STAND_FRONT, {
          elbowF: [110, 74], handF: [106, 64],
          elbowB: [90, 74], handB: [94, 64],
        }),
        p(STAND_FRONT, {
          elbowF: [124, 58], handF: [148, 58],
          elbowB: [76, 58], handB: [52, 58],
        }),
      ],
      props: [{ type: 'band', from: 'handF', to: 'handB' }],
    },

    shouldermob: {
      dur: 2.6,
      poses: [
        p(STAND_FRONT, {
          elbowF: [110, 74], handF: [106, 64],
          elbowB: [90, 74], handB: [94, 64],
        }),
        p(STAND_FRONT, {
          elbowF: [124, 58], handF: [148, 58],
          elbowB: [76, 58], handB: [52, 58],
        }),
      ],
    },

    bandrow: {
      dur: 2.2,
      poses: [
        p(STAND, {
          elbowF: [118, 80], handF: [136, 80],
          elbowB: [114, 82], handB: [132, 82],
        }),
        p(STAND, {
          elbowF: [94, 86], handF: [112, 84],
          elbowB: [90, 88], handB: [108, 86],
        }),
      ],
      props: [{ type: 'band', from: 'handF', to: [206, 80] }, { type: 'wall', x: 206 }],
    },

    bandcurl: {
      dur: 2.4,
      poses: CURL_POSES,
      holdMask: CURL_HOLDS,
      props: [{ type: 'band', from: 'handF', to: 'footF' }],
    },

    bandpress: {
      dur: 2.4,
      poses: [
        p(STAND_FRONT, {
          elbowF: [114, 76], handF: [112, 58],
          elbowB: [86, 76], handB: [88, 58],
        }),
        p(STAND_FRONT, {
          elbowF: [110, 38], handF: [108, 16],
          elbowB: [90, 38], handB: [92, 16],
        }),
      ],
      props: [
        { type: 'band', from: 'handF', to: 'footF' },
        { type: 'band', from: 'handB', to: 'footB' },
      ],
    },

    bandlateral: {
      dur: 2.6,
      poses: LATERAL_POSES,
      holdMask: LATERAL_HOLDS,
      props: [
        { type: 'band', from: 'handF', to: 'footF' },
        { type: 'band', from: 'handB', to: 'footB' },
      ],
    },

    forwardfold: {
      dur: 5,
      // Über die Hüftbeuge (Durchgangspose) abrollen, unten kurz halten
      // und sanft nachfedern, dann über die Hüftbeuge wieder aufrichten.
      poses: [
        STAND,
        RDL_HINGE,
        {
          head: [107, 172], neck: [105, 160], hip: [96, 116],
          kneeF: [102, 148], footF: [104, 182], kneeB: [97, 148], footB: [95, 182],
          elbowF: [107, 172], handF: [106, 180], elbowB: [103, 170], handB: [102, 178],
        },
        {
          head: [108, 175], neck: [106, 163], hip: [96, 118],
          kneeF: [102, 149], footF: [104, 182], kneeB: [97, 149], footB: [95, 182],
          elbowF: [108, 174], handF: [107, 181], elbowB: [104, 172], handB: [103, 179],
        },
        {
          head: [107, 172], neck: [105, 160], hip: [96, 116],
          kneeF: [102, 148], footF: [104, 182], kneeB: [97, 148], footB: [95, 182],
          elbowF: [107, 172], handF: [106, 180], elbowB: [103, 170], handB: [102, 178],
        },
        RDL_HINGE,
      ],
      holdMask: [true, false, true, false, false, false],
    },

    quadstretch: {
      dur: 3,
      poses: [
        {
          head: [101, 44], neck: [100, 58], hip: [100, 112],
          kneeF: [96, 148], footF: [84, 120], kneeB: [98, 146], footB: [96, 182],
          elbowF: [94, 86], handF: [86, 118], elbowB: [92, 84], handB: [88, 108],
        },
        {
          head: [102, 45], neck: [101, 59], hip: [101, 113],
          kneeF: [97, 149], footF: [85, 121], kneeB: [99, 147], footB: [96, 182],
          elbowF: [95, 87], handF: [87, 119], elbowB: [93, 85], handB: [89, 109],
        },
      ],
    },
  };

  // ------------------------------------------------------------------
  // Renderer
  // ------------------------------------------------------------------
  function el(name, attrs) {
    const node = document.createElementNS(SVG_NS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  // Baut aus den Posen-Werten eine SMIL-Spur. holdMask markiert Posen, in
  // denen die Figur kurz verweilt – so sind Anfangs- und Endposition einer
  // Bewegung deutlich erkennbar. Nicht markierte Posen (z. B. Zwischenposen
  // auf einem Bewegungsbogen) werden fließend durchlaufen. Übergänge werden
  // weich beschleunigt (Spline), Haltephasen bleiben statisch.
  function trackFor(vals, holdMask) {
    const n = vals.length;
    const held = holdMask || new Array(n).fill(false);
    const heldCount = held.filter(Boolean).length;
    const holdFrac = 0.3 / n;
    const transFrac = (1 - heldCount * holdFrac) / n;
    const values = [];
    const keyTimes = [];
    const splines = [];
    let t = 0;
    for (let i = 0; i < n; i++) {
      values.push(vals[i]); keyTimes.push(t.toFixed(4));
      if (held[i]) {
        splines.push('0 0 1 1');
        t += holdFrac;
        values.push(vals[i]); keyTimes.push(t.toFixed(4));
      }
      // Nur an gehaltenen Posen an- bzw. abbremsen – durch fließende
      // Zwischenposen läuft die Bewegung mit konstantem Tempo, sonst
      // ruckelt sie an jedem Keyframe.
      const nextHeld = held[(i + 1) % n];
      splines.push((held[i] ? '.42 0' : '0 0') + ' ' + (nextHeld ? '.58 1' : '1 1'));
      t += transFrac;
    }
    values.push(vals[0]);
    keyTimes.push('1');
    return { values, keyTimes, splines };
  }

  function smilEl(attr, track, dur, isTransform) {
    const node = el(isTransform ? 'animateTransform' : 'animate', {
      attributeName: attr,
      values: track.values.join(';'),
      keyTimes: track.keyTimes.join(';'),
      keySplines: track.splines.join(';'),
      calcMode: 'spline',
      dur: dur + 's',
      repeatCount: 'indefinite',
    });
    if (isTransform) node.setAttribute('type', 'translate');
    return node;
  }

  function jointVals(poses, joint, idx) {
    return poses.map((pose) => pose[joint][idx]);
  }

  function animatedLine(poses, jointA, jointB, dur, cls, useHold) {
    const line = el('line', {
      x1: poses[0][jointA][0], y1: poses[0][jointA][1],
      x2: poses[0][jointB][0], y2: poses[0][jointB][1],
      class: cls,
    });
    if (poses.length > 1) {
      line.appendChild(smilEl('x1', trackFor(jointVals(poses, jointA, 0), useHold), dur));
      line.appendChild(smilEl('y1', trackFor(jointVals(poses, jointA, 1), useHold), dur));
      line.appendChild(smilEl('x2', trackFor(jointVals(poses, jointB, 0), useHold), dur));
      line.appendChild(smilEl('y2', trackFor(jointVals(poses, jointB, 1), useHold), dur));
    }
    return line;
  }

  function animatedCircle(poses, joint, r, dur, cls, useHold) {
    const circle = el('circle', {
      cx: poses[0][joint][0], cy: poses[0][joint][1], r, class: cls,
    });
    if (poses.length > 1) {
      circle.appendChild(smilEl('cx', trackFor(jointVals(poses, joint, 0), useHold), dur));
      circle.appendChild(smilEl('cy', trackFor(jointVals(poses, joint, 1), useHold), dur));
    }
    return circle;
  }

  function resolvePoint(pose, ref) {
    return Array.isArray(ref) ? ref : pose[ref];
  }

  function buildProp(prop, poses, dur, svg, useHold) {
    if (prop.type === 'dumbbell') {
      const g = el('g', { class: 'prop-dumbbell' });
      g.appendChild(el('line', { x1: -8, y1: 0, x2: 8, y2: 0, class: 'dumbbell-bar' }));
      g.appendChild(el('circle', { cx: -8, cy: 0, r: 4, class: 'dumbbell-weight' }));
      g.appendChild(el('circle', { cx: 8, cy: 0, r: 4, class: 'dumbbell-weight' }));
      const start = poses[0][prop.joint];
      g.setAttribute('transform', `translate(${start[0]},${start[1]})`);
      if (poses.length > 1) {
        const vals = poses.map((pose) => pose[prop.joint].join(','));
        g.appendChild(smilEl('transform', trackFor(vals, useHold), dur, true));
      }
      svg.appendChild(g);
    } else if (prop.type === 'band') {
      const a0 = resolvePoint(poses[0], prop.from);
      const b0 = resolvePoint(poses[0], prop.to);
      const line = el('line', {
        x1: a0[0], y1: a0[1], x2: b0[0], y2: b0[1], class: 'prop-band',
      });
      if (poses.length > 1) {
        const av = poses.map((pose) => resolvePoint(pose, prop.from));
        const bv = poses.map((pose) => resolvePoint(pose, prop.to));
        line.appendChild(smilEl('x1', trackFor(av.map((v) => v[0]), useHold), dur));
        line.appendChild(smilEl('y1', trackFor(av.map((v) => v[1]), useHold), dur));
        line.appendChild(smilEl('x2', trackFor(bv.map((v) => v[0]), useHold), dur));
        line.appendChild(smilEl('y2', trackFor(bv.map((v) => v[1]), useHold), dur));
      }
      svg.appendChild(line);
    } else if (prop.type === 'wall') {
      svg.appendChild(el('line', {
        x1: prop.x, y1: 40, x2: prop.x, y2: 182, class: 'prop-wall',
      }));
    } else if (prop.type === 'chair') {
      svg.appendChild(el('line', { x1: 116, y1: 140, x2: 152, y2: 140, class: 'prop-wall' }));
      svg.appendChild(el('line', { x1: 120, y1: 140, x2: 120, y2: 182, class: 'prop-wall' }));
      svg.appendChild(el('line', { x1: 148, y1: 140, x2: 148, y2: 182, class: 'prop-wall' }));
    }
  }

  // Zoomt die Ansicht automatisch auf die Figur samt Requisiten, damit
  // sie den Kasten füllt (statt klein in der 220×200-Fläche zu stehen).
  function computeViewBox(poses, props) {
    let minX = 1e9; let minY = 1e9; let maxX = -1e9; let maxY = -1e9;
    const add = (x, y, r) => {
      minX = Math.min(minX, x - r); maxX = Math.max(maxX, x + r);
      minY = Math.min(minY, y - r); maxY = Math.max(maxY, y + r);
    };
    poses.forEach((pose) => {
      for (const j in pose) add(pose[j][0], pose[j][1], j === 'head' ? 11 : 5);
    });
    props.forEach((pr) => {
      if (pr.type === 'dumbbell') {
        poses.forEach((pose) => add(pose[pr.joint][0], pose[pr.joint][1], 13));
      } else if (pr.type === 'band') {
        [pr.from, pr.to].forEach((ref) => {
          if (Array.isArray(ref)) add(ref[0], ref[1], 5);
          else poses.forEach((pose) => add(pose[ref][0], pose[ref][1], 5));
        });
      } else if (pr.type === 'wall') {
        add(pr.x, 60, 5); add(pr.x, 182, 5);
      } else if (pr.type === 'chair') {
        add(116, 140, 5); add(152, 182, 5);
      }
    });
    // Bodenlinie zeigen, wenn die Figur am Boden agiert
    if (maxY > 150) maxY = Math.max(maxY, 186);
    minX -= 10; maxX += 10; minY -= 10; maxY += 8;

    // Auf das feste Seitenverhältnis 220:200 aufweiten, damit alle
    // Vorschau-Kästen gleich proportioniert bleiben.
    const ar = 220 / 200;
    let w = maxX - minX;
    let h = maxY - minY;
    if (w / h > ar) {
      minY -= (w / ar - h); // nach oben erweitern, Boden bleibt unten
      h = w / ar;
    } else {
      const dx = (h * ar - w) / 2;
      minX -= dx; maxX += dx;
      w = h * ar;
    }
    return `${minX.toFixed(1)} ${minY.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;
  }

  /**
   * Erzeugt ein animiertes SVG für die angegebene Animation.
   * @param {string} animId  – Schlüssel aus ANIMS
   * @param {Array=} extraProps – zusätzliche Props (z. B. Kurzhantel bei Varianten)
   */
  function createExerciseAnimation(animId, extraProps) {
    const anim = ANIMS[animId] || ANIMS.squat;
    const { poses, dur } = anim;
    const props = (anim.props || []).concat(extraProps || []);
    // Halte-Momente nur bei langsamen Übungen – schnelle Cardio-Bewegungen
    // (High Knees, Hampelmänner …) laufen flüssig durch. Animationen können
    // per holdMask selbst festlegen, welche Posen gehalten werden (z. B.
    // Endposen halten, Zwischenposen auf dem Bewegungsbogen fließend).
    const useHold = anim.holdMask || poses.map(() => poses.length > 1 && dur >= 1.6);

    const svg = el('svg', {
      viewBox: computeViewBox(poses, props),
      class: 'exercise-anim',
      'aria-hidden': 'true',
    });

    // Boden
    svg.appendChild(el('line', { x1: -40, y1: 182, x2: 260, y2: 182, class: 'floor' }));

    // Props (hinter der Figur gezeichnete Bänder/Wände/Stühle zuerst)
    props.filter((pr) => pr.type !== 'dumbbell')
      .forEach((pr) => buildProp(pr, poses, dur, svg, useHold));

    // Figur ebenenweise aufbauen (hinten → vorn)
    LAYERS.forEach((layer) => {
      if (layer.head) {
        svg.appendChild(animatedCircle(poses, 'head', 9, dur, 'head', useHold));
        return;
      }
      layer.bones.forEach(([a, b]) => svg.appendChild(animatedLine(poses, a, b, dur, layer.cls, useHold)));
      if (layer.dot) {
        const [joint, cls, r] = layer.dot;
        svg.appendChild(animatedCircle(poses, joint, r, dur, cls, useHold));
      }
    });

    // Hanteln über der Figur
    props.filter((pr) => pr.type === 'dumbbell')
      .forEach((pr) => buildProp(pr, poses, dur, svg, useHold));

    return svg;
  }

  global.FitAnimations = { createExerciseAnimation, ANIMS };
})(window);
