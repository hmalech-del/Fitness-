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

  // Frontansicht: Von vorn betrachtet laufen beide Arme vor dem Rumpf –
  // sonst verschwindet der hintere Arm hinter dem Oberkörper, sobald die
  // Hände vor dem Körper zusammenkommen (z. B. Russian Twists).
  const LAYERS_FRONT = LAYERS
    .filter((l) => l.cls !== 'arm arm-b')
    .flatMap((l) => (l.cls === 'arm arm-f' ? [LAYERS[0], l] : [l]));

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

    gobletsquat: {
      dur: 2.8,
      // Die Kurzhantel bleibt dicht vor der Brust, die Ellbogen zeigen nach
      // unten – die Arme schwingen also nicht wie bei der freien Kniebeuge
      // nach vorn, sondern behalten ihre Haltung über die ganze Bewegung.
      poses: [
        p(STAND, {
          elbowF: [104, 82], handF: [112, 68],
          elbowB: [100, 82], handB: [108, 70],
        }),
        {
          head: [98, 82], neck: [95, 95], hip: [86, 146],
          kneeF: [112, 158], footF: [104, 182], kneeB: [107, 158], footB: [95, 182],
          elbowF: [99, 119], handF: [107, 105], elbowB: [95, 119], handB: [103, 107],
        },
      ],
      props: [{ type: 'dumbbell', joint: 'handF' }],
    },

    bandsquat: {
      dur: 2.8,
      // Auf dem Band stehend, die Enden auf Schulterhöhe: Die Hände bleiben
      // an der Schulter und wandern mit ihr nach unten, das Band spannt
      // sich zwischen Händen und Füßen.
      poses: [
        p(STAND, {
          elbowF: [106, 80], handF: [110, 62],
          elbowB: [102, 80], handB: [106, 64],
        }),
        {
          head: [98, 82], neck: [95, 95], hip: [86, 146],
          kneeF: [112, 158], footF: [104, 182], kneeB: [107, 158], footB: [95, 182],
          elbowF: [101, 117], handF: [104, 99], elbowB: [97, 117], handB: [100, 101],
        },
      ],
      props: [
        { type: 'band', from: 'handF', to: 'footF' },
        { type: 'band', from: 'handB', to: 'footB' },
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
      dur: 3,
      // Echter Schritt statt Gleiten: Das vordere Bein hebt ab, setzt vorn
      // auf, dann sinkt das hintere Knie Richtung Boden. Der hintere Fuß
      // bleibt dabei stehen – vorher rutschten beide Füße über den Boden.
      poses: [
        STAND,
        p(STAND, {
          hip: [100, 114],
          kneeF: [118, 138], footF: [124, 158],
          elbowF: [104, 86], handF: [110, 104], elbowB: [96, 86], handB: [92, 104],
        }),
        {
          head: [101, 76], neck: [100, 90], hip: [100, 142],
          kneeF: [124, 154], footF: [128, 182], kneeB: [92, 162], footB: [94, 182],
          elbowF: [108, 108], handF: [104, 126], elbowB: [92, 108], handB: [96, 126],
        },
        p(STAND, {
          hip: [100, 114],
          kneeF: [118, 138], footF: [124, 158],
          elbowF: [104, 86], handF: [110, 104], elbowB: [96, 86], handB: [92, 104],
        }),
      ],
      holdMask: [true, false, true, false],
    },

    reverselunge: {
      dur: 3,
      // Rückwärts-Variante: Das hintere Bein hebt ab und setzt hinten auf,
      // das vordere bleibt stehen.
      poses: [
        STAND,
        p(STAND, {
          hip: [100, 114],
          kneeB: [88, 140], footB: [76, 162],
          elbowF: [104, 86], handF: [110, 104], elbowB: [96, 86], handB: [92, 104],
        }),
        {
          head: [101, 76], neck: [100, 90], hip: [100, 142],
          kneeF: [106, 154], footF: [108, 182], kneeB: [82, 162], footB: [68, 182],
          elbowF: [108, 108], handF: [104, 126], elbowB: [92, 108], handB: [96, 126],
        },
        p(STAND, {
          hip: [100, 114],
          kneeB: [88, 140], footB: [76, 162],
          elbowF: [104, 86], handF: [110, 104], elbowB: [96, 86], handB: [92, 104],
        }),
      ],
      holdMask: [true, false, true, false],
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

    floorfly: {
      dur: 2.8,
      // Ansicht von oben auf die liegende Figur – nur so ist die Öffnung
      // der Arme zur Seite sichtbar. In der Seitenansicht bewegen sich die
      // Hände auf den Betrachter zu. Deshalb ohne Bodenlinie.
      noFloor: true,
      armsFront: true,
      poses: [
        {
          head: [100, 40], neck: [100, 58], hip: [100, 118],
          kneeF: [120, 144], footF: [106, 166], kneeB: [80, 144], footB: [94, 166],
          elbowF: [117, 62], handF: [107, 46], elbowB: [83, 62], handB: [93, 46],
        },
        {
          head: [100, 40], neck: [100, 58], hip: [100, 118],
          kneeF: [120, 144], footF: [106, 166], kneeB: [80, 144], footB: [94, 166],
          elbowF: [128, 70], handF: [152, 76], elbowB: [72, 70], handB: [48, 76],
        },
      ],
      props: [{ type: 'dumbbell', joint: 'handF' }, { type: 'dumbbell', joint: 'handB' }],
    },

    bandchestpress: {
      dur: 2.4,
      // Band läuft hinter dem Rücken, die Hände drücken nach vorn zusammen
      poses: [
        p(STAND, {
          elbowF: [110, 78], handF: [116, 66],
          elbowB: [106, 80], handB: [112, 68],
        }),
        p(STAND, {
          elbowF: [126, 70], handF: [148, 66],
          elbowB: [122, 72], handB: [144, 68],
        }),
      ],
      props: [
        { type: 'band', from: 'handF', to: [76, 66] },
        { type: 'band', from: 'handB', to: [76, 68] },
      ],
    },

    declinepushup: {
      dur: 2.4,
      // Füße erhöht: verlagert die Last auf die obere Brust
      poses: [
        {
          head: [162, 126], neck: [150, 132], hip: [96, 146],
          kneeF: [70, 150], footF: [46, 148], kneeB: [68, 148], footB: [44, 146],
          elbowF: [149, 156], handF: [148, 182], elbowB: [145, 154], handB: [144, 180],
        },
        {
          head: [163, 156], neck: [150, 160], hip: [96, 156],
          kneeF: [70, 154], footF: [46, 148], kneeB: [68, 152], footB: [44, 146],
          elbowF: [163, 172], handF: [148, 182], elbowB: [159, 170], handB: [144, 180],
        },
      ],
      props: [{ type: 'chair', x: 44, top: 148 }],
    },

    inclinepushup: {
      dur: 2.4,
      // Hände erhöht: leichtere Variante, betont die untere Brust
      poses: [
        {
          head: [166, 110], neck: [154, 116], hip: [100, 144],
          kneeF: [72, 160], footF: [46, 180], kneeB: [70, 158], footB: [44, 178],
          elbowF: [152, 130], handF: [150, 144], elbowB: [148, 128], handB: [146, 142],
        },
        {
          head: [168, 130], neck: [156, 136], hip: [102, 154],
          kneeF: [74, 165], footF: [46, 180], kneeB: [72, 163], footB: [44, 178],
          elbowF: [166, 140], handF: [150, 144], elbowB: [162, 138], handB: [146, 142],
        },
      ],
      props: [{ type: 'chair', x: 150, top: 144 }],
    },

    plank: {
      dur: 3,
      poses: [
        {
          head: [152, 146], neck: [141, 152], hip: [92, 160],
          kneeF: [65, 169], footF: [38, 180], kneeB: [62, 167], footB: [35, 179],
          elbowF: [146, 180], handF: [166, 180], elbowB: [142, 179], handB: [162, 179],
        },
        {
          head: [152, 144], neck: [141, 150], hip: [92, 157],
          kneeF: [65, 168], footF: [38, 180], kneeB: [62, 166], footB: [35, 179],
          elbowF: [146, 180], handF: [166, 180], elbowB: [142, 179], handB: [162, 179],
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
          // Flugphase: Der ganze Körper ist angehoben, beide Füße sind
          // deutlich vom Boden gelöst, die Arme schwingen seitlich hoch
          head: [100, 30], neck: [100, 44], hip: [100, 98],
          kneeF: [110, 132], footF: [118, 166], kneeB: [90, 132], footB: [82, 166],
          elbowF: [126, 44], handF: [150, 45], elbowB: [74, 44], handB: [50, 45],
        },
        {
          head: [100, 40], neck: [100, 54], hip: [100, 108],
          kneeF: [112, 144], footF: [124, 180], kneeB: [88, 144], footB: [76, 180],
          elbowF: [116, 44], handF: [108, 22], elbowB: [84, 44], handB: [92, 22],
        },
        {
          head: [100, 30], neck: [100, 44], hip: [100, 98],
          kneeF: [110, 132], footF: [118, 166], kneeB: [90, 132], footB: [82, 166],
          elbowF: [126, 44], handF: [150, 45], elbowB: [74, 44], handB: [50, 45],
        },
      ],
      holdMask: [true, false, true, false],
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

    hollowhold: {
      dur: 3,
      // Bananenposition: Schultern und gestreckte Beine knapp über dem
      // Boden halten, Arme über dem Kopf
      poses: [
        {
          head: [37, 155], neck: [48, 164], hip: [96, 176],
          kneeF: [124, 168], footF: [151, 160], kneeB: [122, 166], footB: [149, 158],
          elbowF: [30, 158], handF: [12, 152], elbowB: [28, 156], handB: [10, 150],
        },
        {
          head: [37, 152], neck: [48, 161], hip: [96, 176],
          kneeF: [124, 165], footF: [151, 155], kneeB: [122, 163], footB: [149, 153],
          elbowF: [30, 155], handF: [12, 148], elbowB: [28, 153], handB: [10, 146],
        },
      ],
      // Bananenform: Rücken bleibt gerundet am Boden
      spine: [8, 9],
    },

    russiantwist: {
      dur: 2.6,
      // Frontansicht im Sitzen: Nur so ist die Drehung sichtbar – in der
      // Seitenansicht bewegen sich die Hände auf den Betrachter zu.
      // Knie angewinkelt, Füße leicht abgehoben, Hände wandern von einer
      // Seite zur anderen, der Kopf dreht mit.
      armsFront: true,
      poses: [
        {
          head: [108, 96], neck: [102, 116], hip: [100, 176],
          kneeF: [118, 142], footF: [128, 180], kneeB: [82, 142], footB: [72, 180],
          elbowF: [116, 126], handF: [136, 134], elbowB: [110, 138], handB: [133, 139],
        },
        {
          head: [100, 94], neck: [100, 114], hip: [100, 176],
          kneeF: [118, 142], footF: [128, 180], kneeB: [82, 142], footB: [72, 180],
          elbowF: [110, 130], handF: [104, 148], elbowB: [90, 130], handB: [97, 148],
        },
        {
          head: [92, 96], neck: [98, 116], hip: [100, 176],
          kneeF: [118, 142], footF: [128, 180], kneeB: [82, 142], footB: [72, 180],
          elbowF: [90, 138], handF: [67, 139], elbowB: [84, 126], handB: [64, 134],
        },
        {
          head: [100, 94], neck: [100, 114], hip: [100, 176],
          kneeF: [118, 142], footF: [128, 180], kneeB: [82, 142], footB: [72, 180],
          elbowF: [110, 130], handF: [104, 148], elbowB: [90, 130], handB: [97, 148],
        },
      ],
      holdMask: [true, false, true, false],
    },

    vup: {
      dur: 2.6,
      // Aus der flachen Rückenlage in die V-Position klappen
      poses: [
        {
          head: [30, 167], neck: [42, 172], hip: [96, 176],
          kneeF: [124, 177], footF: [152, 178], kneeB: [122, 175], footB: [150, 176],
          elbowF: [20, 170], handF: [2, 168], elbowB: [18, 168], handB: [0, 166],
        },
        {
          head: [56, 126], neck: [66, 136], hip: [96, 174],
          kneeF: [121, 148], footF: [143, 124], kneeB: [119, 146], footB: [141, 122],
          elbowF: [88, 120], handF: [110, 106], elbowB: [84, 118], handB: [106, 104],
        },
      ],
      // Der Rumpf rollt beim Zusammenklappen ein
      spine: [2, 9],
    },

    flutterkick: {
      dur: 0.9,
      // Rückenlage, gestreckte Beine scheren knapp über dem Boden
      poses: [
        {
          head: [34, 168], neck: [46, 173], hip: [96, 176],
          kneeF: [118, 160], footF: [140, 146], kneeB: [116, 170], footB: [142, 168],
          elbowF: [66, 178], handF: [84, 178], elbowB: [64, 176], handB: [82, 176],
        },
        {
          head: [34, 168], neck: [46, 173], hip: [96, 176],
          kneeF: [116, 172], footF: [142, 170], kneeB: [118, 158], footB: [140, 144],
          elbowF: [66, 178], handF: [84, 178], elbowB: [64, 176], handB: [82, 176],
        },
      ],
    },

    reversecrunch: {
      dur: 2.2,
      // Knie über der Hüfte, dann Knie zur Brust ziehen und Hüfte anheben
      poses: [
        {
          head: [34, 168], neck: [46, 173], hip: [96, 176],
          kneeF: [100, 150], footF: [118, 158], kneeB: [98, 148], footB: [116, 156],
          elbowF: [66, 178], handF: [84, 178], elbowB: [64, 176], handB: [82, 176],
        },
        {
          head: [34, 168], neck: [46, 173], hip: [92, 166],
          kneeF: [76, 142], footF: [98, 148], kneeB: [74, 140], footB: [96, 146],
          elbowF: [66, 178], handF: [84, 178], elbowB: [64, 176], handB: [82, 176],
        },
      ],
      // Becken kippt, unterer Rücken rollt ab
      spine: [2, 7],
    },

    planktap: {
      dur: 2.6,
      // Im hohen Stütz tippen die Hände abwechselnd zur Gegenschulter
      poses: [
        PUSHUP_UP,
        p(PUSHUP_UP, { elbowF: [136, 150], handF: [146, 140] }),
        PUSHUP_UP,
        p(PUSHUP_UP, { elbowB: [132, 148], handB: [142, 138] }),
      ],
      holdMask: [false, true, false, true],
    },

    pikepushup: {
      dur: 2.4,
      // Umgekehrtes V: Ellbogen beugen, Kopf Richtung Boden senken
      poses: [
        {
          head: [147, 152], neck: [138, 142], hip: [95, 112],
          kneeF: [70, 146], footF: [45, 178], kneeB: [68, 144], footB: [43, 176],
          elbowF: [147, 161], handF: [154, 180], elbowB: [143, 159], handB: [150, 178],
        },
        {
          head: [151, 168], neck: [144, 160], hip: [102, 124],
          kneeF: [72, 150], footF: [45, 178], kneeB: [70, 148], footB: [43, 176],
          elbowF: [156, 168], handF: [154, 180], elbowB: [152, 166], handB: [150, 178],
        },
      ],
    },

    bulgariansquat: {
      dur: 2.6,
      // Ausfallschritt mit hinterem Fuß auf dem Stuhl. Die Figur schaut nach
      // links (weg vom Stuhl), also wandert das vordere Knie beim Absenken
      // nach links über den Fuß – und die Hüfte gleichzeitig etwas zurück.
      poses: [
        {
          head: [78, 48], neck: [77, 62], hip: [76, 116],
          kneeF: [72, 148], footF: [70, 182], kneeB: [90, 145], footB: [124, 142],
          elbowF: [80, 88], handF: [81, 112], elbowB: [74, 88], handB: [75, 112],
        },
        {
          head: [73, 71], neck: [76, 85], hip: [87, 138],
          kneeF: [57, 150], footF: [70, 182], kneeB: [101, 167], footB: [124, 142],
          elbowF: [79, 111], handF: [80, 135], elbowB: [73, 111], handB: [74, 135],
        },
      ],
      props: [{ type: 'chair' }],
    },

    singlelegrdl: {
      dur: 2.8,
      // Standwaage: Oberkörper kippt vor, das freie Bein hebt nach hinten
      poses: [
        STAND,
        {
          head: [158, 100], neck: [146, 102], hip: [98, 116],
          kneeF: [100, 148], footF: [104, 182], kneeB: [66, 124], footB: [38, 134],
          elbowF: [142, 126], handF: [143, 148], elbowB: [138, 124], handB: [139, 146],
        },
      ],
    },

    sideplank: {
      dur: 3,
      // Stützender Unterarm liegt flach am Boden (y = 182), die Schulter steht
      // senkrecht darüber. Dadurch ist die Körperlinie flach – genau so sieht
      // ein Unterarm-Seitstütz von der Seite aus. Der obere Arm liegt an der
      // Hüfte: senkrecht nach oben ist nur eine Variante für Fortgeschrittene.
      poses: [
        // Start: Hüfte noch abgesenkt
        {
          head: [144, 156], neck: [130, 159], hip: [79, 175],
          kneeF: [48, 178], footF: [15, 181], kneeB: [46, 180], footB: [13, 182],
          elbowF: [109, 153], handF: [86, 168], elbowB: [130, 181], handB: [156, 181],
        },
        // Halteposition: Schulter–Hüfte–Knöchel bilden eine Linie
        {
          head: [144, 149], neck: [130, 152], hip: [78, 165],
          kneeF: [47, 172], footF: [14, 180], kneeB: [45, 174], footB: [12, 182],
          elbowF: [108, 147], handF: [85, 161], elbowB: [130, 181], handB: [156, 181],
        },
      ],
      holdMask: [false, true],
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
      // Beim Aufrollen rundet sich die Brustwirbelsäule sichtbar
      spine: [3, 11],
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
      // Beim Anheben streckt sich die Wirbelsäule ins leichte Hohlkreuz
      spine: [0, -8],
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
      dur: 4,
      // Katze: Rücken rundet sich nach oben, Kopf sinkt zwischen die Arme.
      // Kuh: Rücken senkt sich ins leichte Hohlkreuz, Blick geht nach vorn.
      poses: [
        p(QUADRUPED, { head: [148, 148], neck: [140, 138], hip: [92, 140] }),
        p(QUADRUPED, { head: [152, 124], neck: [141, 132], hip: [92, 134] }),
      ],
      spine: [13, -9],
      holdMask: [true, true],
    },

    mountainclimber: {
      dur: 1.3,
      // Ein Knie zieht nach vorn unter den Körper, während das andere
      // gestreckt bleibt. Die Zwischenposen lassen die Beine aneinander
      // vorbeilaufen, statt die Rollen hart zu tauschen.
      poses: [
        p(PUSHUP_UP, {
          kneeF: [122, 154], footF: [104, 172],
          kneeB: [66, 166], footB: [38, 178],
        }),
        p(PUSHUP_UP, {
          kneeF: [94, 160], footF: [72, 175],
          kneeB: [94, 164], footB: [72, 177],
        }),
        p(PUSHUP_UP, {
          kneeF: [66, 168], footF: [38, 180],
          kneeB: [120, 152], footB: [102, 170],
        }),
        p(PUSHUP_UP, {
          kneeF: [94, 160], footF: [72, 175],
          kneeB: [94, 164], footB: [72, 177],
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
      // Der Rücken rollt beim Abrollen Wirbel für Wirbel ein
      spine: [0, -4, -7, -7, -7, -4],
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

  // Gebogener Rumpf: Der Wert spine wölbt die Wirbelsäule senkrecht zur
  // Achse Schulter–Hüfte (positiv = Rundrücken, negativ = Hohlkreuz).
  // Damit lassen sich Katze-Kuh & Co. darstellen.
  function torsoPath(pose, spine) {
    const [nx, ny] = pose.neck;
    const [hx, hy] = pose.hip;
    const dx = hx - nx;
    const dy = hy - ny;
    const len = Math.hypot(dx, dy) || 1;
    const cx = (nx + hx) / 2 + (-dy / len) * spine * 2;
    const cy = (ny + hy) / 2 + (dx / len) * spine * 2;
    return `M${nx},${ny} Q${cx.toFixed(1)},${cy.toFixed(1)} ${hx},${hy}`;
  }

  function animatedTorso(poses, spine, dur, useHold) {
    const path = el('path', { d: torsoPath(poses[0], spine[0]), class: 'torso' });
    if (poses.length > 1) {
      const vals = poses.map((pose, i) => torsoPath(pose, spine[i] || 0));
      path.appendChild(smilEl('d', trackFor(vals, useHold), dur));
    }
    return path;
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
      // Sitzfläche und Beine – frei platzierbar (Stuhl, Bank, Stufe)
      const x = prop.x != null ? prop.x : 134;
      const top = prop.top != null ? prop.top : 140;
      svg.appendChild(el('line', { x1: x - 18, y1: top, x2: x + 18, y2: top, class: 'prop-wall' }));
      svg.appendChild(el('line', { x1: x - 14, y1: top, x2: x - 14, y2: 182, class: 'prop-wall' }));
      svg.appendChild(el('line', { x1: x + 14, y1: top, x2: x + 14, y2: 182, class: 'prop-wall' }));
    }
  }

  // Zoomt die Ansicht automatisch auf die Figur samt Requisiten, damit
  // sie den Kasten füllt (statt klein in der 220×200-Fläche zu stehen).
  function computeViewBox(poses, props, spineBulge, noFloor) {
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
        const cx = pr.x != null ? pr.x : 134;
        const ctop = pr.top != null ? pr.top : 140;
        add(cx - 18, ctop, 5); add(cx + 18, 182, 5);
      }
    });
    // Bodenlinie zeigen, wenn die Figur am Boden agiert
    if (maxY > 150 && !noFloor) maxY = Math.max(maxY, 186);
    const bulge = spineBulge || 0;
    minX -= 10 + bulge; maxX += 10 + bulge; minY -= 10 + bulge; maxY += 8 + bulge;

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
      viewBox: computeViewBox(poses, props,
        anim.spine ? Math.max(...anim.spine.map(Math.abs)) * 2 : 0, anim.noFloor),
      class: 'exercise-anim',
      'aria-hidden': 'true',
    });

    // Boden – bei Ansichten von oben (z. B. Fliegende am Boden) entfällt er
    if (!anim.noFloor) {
      svg.appendChild(el('line', { x1: -40, y1: 182, x2: 260, y2: 182, class: 'floor' }));
    }

    // Props (hinter der Figur gezeichnete Bänder/Wände/Stühle zuerst)
    props.filter((pr) => pr.type !== 'dumbbell')
      .forEach((pr) => buildProp(pr, poses, dur, svg, useHold));

    // Figur ebenenweise aufbauen (hinten → vorn)
    (anim.armsFront ? LAYERS_FRONT : LAYERS).forEach((layer) => {
      if (layer.head) {
        svg.appendChild(animatedCircle(poses, 'head', 9, dur, 'head', useHold));
        return;
      }
      if (layer.cls === 'torso' && anim.spine) {
        svg.appendChild(animatedTorso(poses, anim.spine, dur, useHold));
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
