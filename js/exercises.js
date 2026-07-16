/* =====================================================================
 * FitPlan – Übungsdatenbank
 *
 * equipment: 'none' | 'kurzhanteln' | 'band'   (Matte ist optional, wird
 *            nicht hart vorausgesetzt – Bodenübungen gehen auch ohne)
 * muscles:   beine, po, brust, ruecken, schultern, arme, core, cardio, ganzkoerper
 * category:  kraft | cardio | mobility
 * level:     1 = Anfänger, 2 = Mittel, 3 = Fortgeschritten
 * impact:    true = Sprung-/Stoßbelastung (wird bei höherem Alter gemieden)
 * mode:      'reps' | 'time'
 * anim:      Schlüssel in FitAnimations.ANIMS
 * ===================================================================== */

const EXERCISES = [

  // ---------------- Eigengewicht: Kraft ----------------
  {
    id: 'squat', name: 'Kniebeugen', anim: 'squat',
    equipment: 'none', muscles: ['beine', 'po'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Füße schulterbreit, Rücken gerade. Hüfte nach hinten-unten schieben, als würdest du dich auf einen Stuhl setzen, dann kraftvoll aufstehen.',
  },
  {
    id: 'sumo_squat', name: 'Sumo-Kniebeugen', anim: 'squat',
    equipment: 'none', muscles: ['beine', 'po'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Breiter Stand, Fußspitzen zeigen nach außen. Tief in die Hocke gehen, Knie folgen der Fußrichtung.',
  },
  {
    id: 'wallsit', name: 'Wandsitz', anim: 'squat_hold',
    equipment: 'none', muscles: ['beine'], category: 'kraft', level: 1,
    impact: false, mode: 'time', holdSec: 30,
    desc: 'Mit dem Rücken an die Wand lehnen und so weit hinunterrutschen, bis die Knie etwa 90° gebeugt sind. Position halten.',
  },
  {
    id: 'lunge', name: 'Ausfallschritte', anim: 'lunge',
    equipment: 'none', muscles: ['beine', 'po'], category: 'kraft', level: 2,
    impact: false, mode: 'reps',
    desc: 'Großen Schritt nach vorn machen, hinteres Knie Richtung Boden senken. Oberkörper aufrecht halten, dann zurückdrücken. Seiten abwechseln.',
  },
  {
    id: 'pushup', name: 'Liegestütze', anim: 'pushup',
    equipment: 'none', muscles: ['brust', 'arme', 'schultern'], category: 'kraft', level: 2,
    impact: false, mode: 'reps',
    desc: 'Hände unter den Schultern, Körper bildet eine Linie. Brust kontrolliert Richtung Boden senken und wieder hochdrücken.',
  },
  {
    id: 'knee_pushup', name: 'Knie-Liegestütze', anim: 'pushup',
    equipment: 'none', muscles: ['brust', 'arme', 'schultern'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Wie Liegestütze, aber mit abgelegten Knien – ideal zum Einstieg. Körper von Knie bis Kopf in einer Linie halten.',
  },
  {
    id: 'wide_pushup', name: 'Breite Liegestütze', anim: 'pushup',
    equipment: 'none', muscles: ['brust', 'schultern'], category: 'kraft', level: 3,
    impact: false, mode: 'reps',
    desc: 'Liegestütze mit deutlich breiterem Handabstand – betont die Brustmuskulatur stärker.',
  },
  {
    id: 'plank', name: 'Unterarmstütz (Plank)', anim: 'plank',
    equipment: 'none', muscles: ['core'], category: 'kraft', level: 1,
    impact: false, mode: 'time', holdSec: 30,
    desc: 'Auf den Unterarmen abstützen, Körper bildet eine gerade Linie. Bauch und Po anspannen, nicht durchhängen.',
  },
  {
    id: 'glute_bridge', name: 'Glute Bridge', anim: 'glutebridge',
    equipment: 'none', muscles: ['po', 'core'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Rückenlage, Füße aufgestellt. Hüfte anheben, bis Knie–Hüfte–Schulter eine Linie bilden, oben den Po fest anspannen.',
  },
  {
    id: 'sl_glute_bridge', name: 'Einbeinige Glute Bridge', anim: 'glutebridge',
    equipment: 'none', muscles: ['po', 'core'], category: 'kraft', level: 2,
    impact: false, mode: 'reps',
    desc: 'Wie die Glute Bridge, aber ein Bein gestreckt in der Luft halten. Seiten abwechseln.',
  },
  {
    id: 'crunch', name: 'Crunches', anim: 'crunch',
    equipment: 'none', muscles: ['core'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Rückenlage, Hände an die Schläfen. Schulterblätter kontrolliert vom Boden abheben, unteren Rücken liegen lassen.',
  },
  {
    id: 'superman', name: 'Superman', anim: 'superman',
    equipment: 'none', muscles: ['ruecken', 'po'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Bauchlage, Arme nach vorn gestreckt. Arme und Beine gleichzeitig anheben, kurz halten, langsam absenken.',
  },
  {
    id: 'good_morning', name: 'Good Mornings', anim: 'goodmorning',
    equipment: 'none', muscles: ['ruecken', 'po', 'beine'], category: 'kraft', level: 2,
    impact: false, mode: 'reps',
    desc: 'Hände an die Schläfen, Knie leicht gebeugt. Oberkörper mit geradem Rücken aus der Hüfte nach vorn kippen, bis er fast waagerecht ist, und kontrolliert aufrichten.',
  },
  {
    id: 'swimmer', name: 'Schwimmer', anim: 'superman',
    equipment: 'none', muscles: ['ruecken', 'po'], category: 'kraft', level: 1,
    impact: false, mode: 'time', holdSec: 30,
    desc: 'Bauchlage, Arme nach vorn. Gegengleich rechten Arm und linkes Bein anheben, absenken und wechseln – wie beim Kraulschwimmen. Ruhig und kontrolliert.',
  },
  {
    id: 'birddog', name: 'Bird Dog', anim: 'birddog',
    equipment: 'none', muscles: ['core', 'ruecken'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Vierfüßlerstand. Rechten Arm und linkes Bein gleichzeitig strecken, kurz halten, wechseln. Rumpf bleibt stabil.',
  },
  {
    id: 'calf_raise', name: 'Wadenheben', anim: 'calfraise',
    equipment: 'none', muscles: ['beine'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Aufrecht stehen und langsam auf die Zehenspitzen drücken, oben kurz halten, kontrolliert absenken.',
  },
  {
    id: 'reverse_lunge', name: 'Ausfallschritte rückwärts', anim: 'lunge',
    equipment: 'none', muscles: ['beine', 'po'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Großen Schritt nach hinten machen und das hintere Knie Richtung Boden senken – knieschonender als die Vorwärts-Variante. Seiten abwechseln.',
  },
  {
    id: 'leg_raise', name: 'Beinheben', anim: 'legraise',
    equipment: 'none', muscles: ['core'], category: 'kraft', level: 2,
    impact: false, mode: 'reps',
    desc: 'Rückenlage, Hände neben dem Körper. Gestreckte Beine langsam bis zur Senkrechten anheben und kontrolliert absenken, ohne ins Hohlkreuz zu fallen.',
  },
  {
    id: 'dead_bug', name: 'Dead Bug', anim: 'deadbug',
    equipment: 'none', muscles: ['core'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Rückenlage, Arme senkrecht, Knie über der Hüfte. Gegengleich einen Arm hinter den Kopf und das andere Bein lang ausstrecken, zurück und wechseln.',
  },
  {
    id: 'side_plank', name: 'Seitstütz', anim: 'sideplank',
    equipment: 'none', muscles: ['core'], category: 'kraft', level: 2,
    impact: false, mode: 'time', holdSec: 20,
    desc: 'Seitlich auf dem Unterarm abstützen, Körper bildet eine Linie. Hüfte oben halten, dann die Seite wechseln.',
  },
  {
    id: 'chair_dip', name: 'Trizeps-Dips am Stuhl', anim: 'dip',
    equipment: 'none', muscles: ['arme', 'brust'], category: 'kraft', level: 2,
    impact: false, mode: 'reps',
    desc: 'Hände hinter dem Körper auf einer stabilen Stuhlkante. Ellbogen beugen, Körper absenken und wieder hochdrücken.',
  },
  {
    id: 'bicycle_crunch', name: 'Bicycle Crunches', anim: 'crunch',
    equipment: 'none', muscles: ['core'], category: 'kraft', level: 2,
    impact: false, mode: 'reps',
    desc: 'Rückenlage, Hände an die Schläfen. Ellbogen und gegenüberliegendes Knie abwechselnd zueinander führen – wie Fahrradfahren.',
  },
  {
    id: 'squat_jump', name: 'Squat Jumps', anim: 'squatjump',
    equipment: 'none', muscles: ['beine', 'po', 'cardio'], category: 'cardio', level: 3,
    impact: true, mode: 'time', holdSec: 30,
    desc: 'In die Kniebeuge gehen und explosiv nach oben springen, weich landen und direkt in die nächste Wiederholung übergehen.',
  },

  // ---------------- Kurzhanteln ----------------
  {
    id: 'goblet_squat', name: 'Goblet Squats', anim: 'squat',
    equipment: 'kurzhanteln', muscles: ['beine', 'po'], category: 'kraft', level: 2,
    impact: false, mode: 'reps', props: [{ type: 'dumbbell', joint: 'handF' }],
    desc: 'Eine Kurzhantel vor der Brust halten und tief in die Kniebeuge gehen. Ellbogen zeigen nach unten, Rücken gerade.',
  },
  {
    id: 'db_curl', name: 'Bizeps-Curls', anim: 'curl',
    equipment: 'kurzhanteln', muscles: ['arme'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Kurzhanteln seitlich halten, Ellbogen am Körper. Unterarme kontrolliert anheben und wieder senken – ohne Schwung.',
  },
  {
    id: 'db_press', name: 'Schulterdrücken', anim: 'press',
    equipment: 'kurzhanteln', muscles: ['schultern', 'arme'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Hanteln auf Schulterhöhe, Handflächen nach vorn. Über den Kopf drücken, ohne ins Hohlkreuz zu fallen.',
  },
  {
    id: 'db_row', name: 'Vorgebeugtes Rudern', anim: 'row',
    equipment: 'kurzhanteln', muscles: ['ruecken', 'arme'], category: 'kraft', level: 2,
    impact: false, mode: 'reps',
    desc: 'Oberkörper mit geradem Rücken vorbeugen. Hanteln Richtung Bauch ziehen, Schulterblätter zusammenführen.',
  },
  {
    id: 'db_rdl', name: 'Rumänisches Kreuzheben', anim: 'rdl',
    equipment: 'kurzhanteln', muscles: ['beine', 'po', 'ruecken'], category: 'kraft', level: 2,
    impact: false, mode: 'reps',
    desc: 'Hanteln vor den Oberschenkeln. Hüfte nach hinten schieben, Rücken gerade, Hanteln nah am Bein absenken, dann Hüfte strecken.',
  },
  {
    id: 'db_lateral', name: 'Seitheben', anim: 'lateralraise',
    equipment: 'kurzhanteln', muscles: ['schultern'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Hanteln seitlich am Körper. Arme leicht gebeugt bis auf Schulterhöhe anheben, langsam absenken.',
  },
  {
    id: 'db_lunge', name: 'Ausfallschritte mit Kurzhanteln', anim: 'lunge',
    equipment: 'kurzhanteln', muscles: ['beine', 'po'], category: 'kraft', level: 2,
    impact: false, mode: 'reps',
    props: [{ type: 'dumbbell', joint: 'handF' }, { type: 'dumbbell', joint: 'handB' }],
    desc: 'Ausfallschritte mit Kurzhanteln in beiden Händen – Arme hängen seitlich, Oberkörper aufrecht.',
  },
  {
    id: 'db_calf', name: 'Wadenheben mit Kurzhantel', anim: 'calfraise',
    equipment: 'kurzhanteln', muscles: ['beine'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    props: [{ type: 'dumbbell', joint: 'handF' }],
    desc: 'Wadenheben mit zusätzlichem Gewicht in einer Hand, die andere kann sich abstützen.',
  },
  {
    id: 'db_floorpress', name: 'Bankdrücken am Boden', anim: 'floorpress',
    equipment: 'kurzhanteln', muscles: ['brust', 'arme'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Rückenlage, Hanteln auf Brusthöhe, Ellbogen am Boden. Gewichte senkrecht nach oben drücken und langsam absenken.',
  },
  {
    id: 'db_kickback', name: 'Trizeps-Kickbacks', anim: 'kickback',
    equipment: 'kurzhanteln', muscles: ['arme'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Oberkörper vorbeugen, Oberarme parallel zum Boden fixieren. Unterarme nach hinten strecken, bis der Arm gerade ist, dann langsam zurück.',
  },
  {
    id: 'db_frontraise', name: 'Frontheben', anim: 'frontraise',
    equipment: 'kurzhanteln', muscles: ['schultern'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Hanteln vor den Oberschenkeln. Gestreckte Arme bis auf Schulterhöhe nach vorn anheben und kontrolliert absenken.',
  },
  {
    id: 'db_overhead', name: 'Überkopf-Trizepsstrecken', anim: 'overheadtriceps',
    equipment: 'kurzhanteln', muscles: ['arme'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Eine Hantel mit beiden Händen über dem Kopf halten. Unterarme hinter den Kopf absenken und wieder nach oben strecken, Ellbogen bleiben eng.',
  },
  {
    id: 'db_hammer', name: 'Hammer Curls', anim: 'curl',
    equipment: 'kurzhanteln', muscles: ['arme'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Wie Bizeps-Curls, aber die Handflächen zeigen zueinander – trainiert zusätzlich den Unterarm.',
  },
  {
    id: 'db_glutebridge', name: 'Glute Bridge mit Gewicht', anim: 'glutebridge',
    equipment: 'kurzhanteln', muscles: ['po', 'core'], category: 'kraft', level: 2,
    impact: false, mode: 'reps',
    props: [{ type: 'dumbbell', joint: 'hip' }],
    desc: 'Glute Bridge mit einer Kurzhantel auf der Hüfte – festhalten, Hüfte kraftvoll anheben und oben kurz halten.',
  },

  // ---------------- Widerstandsband ----------------
  {
    id: 'band_pullapart', name: 'Band Pull-Aparts', anim: 'pullapart',
    equipment: 'band', muscles: ['schultern', 'ruecken'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Band auf Brusthöhe mit gestreckten Armen halten und auseinanderziehen, bis es die Brust berührt. Langsam zurück.',
  },
  {
    id: 'band_row', name: 'Band-Rudern', anim: 'bandrow',
    equipment: 'band', muscles: ['ruecken', 'arme'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Band an einem festen Punkt einhängen. Ellbogen nah am Körper nach hinten ziehen, Schulterblätter zusammenführen.',
  },
  {
    id: 'band_squat', name: 'Band-Kniebeugen', anim: 'squat',
    equipment: 'band', muscles: ['beine', 'po'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Auf das Band stellen, Enden auf Schulterhöhe halten und gegen den Widerstand Kniebeugen ausführen.',
  },
  {
    id: 'band_curl', name: 'Band Bizeps-Curls', anim: 'bandcurl',
    equipment: 'band', muscles: ['arme'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Auf das Band stellen, Enden greifen und die Unterarme gegen den Zug anheben.',
  },
  {
    id: 'band_press', name: 'Band-Schulterdrücken', anim: 'bandpress',
    equipment: 'band', muscles: ['schultern', 'arme'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Auf das Band stellen, Hände auf Schulterhöhe, dann gegen den Widerstand über den Kopf drücken.',
  },
  {
    id: 'band_lateral', name: 'Band-Seitheben', anim: 'bandlateral',
    equipment: 'band', muscles: ['schultern'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Auf das Band stellen und die Arme seitlich bis auf Schulterhöhe anheben.',
  },
  {
    id: 'band_latpull', name: 'Band-Lat-Zug', anim: 'latpulldown',
    equipment: 'band', muscles: ['ruecken', 'arme'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Band mit gestreckten Armen über dem Kopf halten. Ellbogen seitlich nach unten ziehen, bis das Band hinter bzw. vor dem Kopf ist, Schulterblätter zusammenführen, langsam zurück.',
  },
  {
    id: 'band_frontraise', name: 'Band-Frontheben', anim: 'bandfrontraise',
    equipment: 'band', muscles: ['schultern'], category: 'kraft', level: 1,
    impact: false, mode: 'reps',
    desc: 'Auf das Band stellen und die gestreckten Arme gegen den Widerstand nach vorn bis auf Schulterhöhe anheben.',
  },
  {
    id: 'band_rdl', name: 'Band-Kreuzheben', anim: 'bandrdl',
    equipment: 'band', muscles: ['beine', 'po', 'ruecken'], category: 'kraft', level: 2,
    impact: false, mode: 'reps',
    desc: 'Auf das Band stellen, Enden greifen. Hüfte mit geradem Rücken nach hinten schieben und gegen den Zug wieder aufrichten.',
  },

  // ---------------- Cardio ----------------
  {
    id: 'jumping_jack', name: 'Hampelmänner', anim: 'jumpingjack',
    equipment: 'none', muscles: ['cardio', 'ganzkoerper'], category: 'cardio', level: 1,
    impact: true, mode: 'time', holdSec: 40,
    desc: 'Beim Sprung Beine öffnen und Arme über dem Kopf zusammenführen, beim nächsten Sprung zurück in die Ausgangsposition.',
  },
  {
    id: 'high_knees', name: 'High Knees', anim: 'highknees',
    equipment: 'none', muscles: ['cardio', 'beine', 'core'], category: 'cardio', level: 2,
    impact: true, mode: 'time', holdSec: 30,
    desc: 'Auf der Stelle laufen und die Knie abwechselnd zügig bis auf Hüfthöhe ziehen. Arme aktiv mitschwingen.',
  },
  {
    id: 'march', name: 'Marschieren auf der Stelle', anim: 'march',
    equipment: 'none', muscles: ['cardio', 'beine'], category: 'cardio', level: 1,
    impact: false, mode: 'time', holdSec: 45,
    desc: 'Zügig auf der Stelle marschieren, Knie bewusst anheben und die Arme mitschwingen. Gelenkschonende Cardio-Übung.',
  },
  {
    id: 'mountain_climber', name: 'Mountain Climbers', anim: 'mountainclimber',
    equipment: 'none', muscles: ['cardio', 'core'], category: 'cardio', level: 2,
    impact: false, mode: 'time', holdSec: 30,
    desc: 'Liegestützposition. Knie abwechselnd zügig Richtung Brust ziehen, Hüfte stabil halten.',
  },
  {
    id: 'burpee', name: 'Burpees', anim: 'burpee',
    equipment: 'none', muscles: ['cardio', 'ganzkoerper'], category: 'cardio', level: 3,
    impact: true, mode: 'time', holdSec: 30,
    desc: 'Aus dem Stand in die Hocke, Beine nach hinten in den Stütz, zurück in die Hocke und explosiv nach oben springen.',
  },

  // ---------------- Mobility & Dehnung ----------------
  {
    id: 'forward_fold', name: 'Stehende Vorbeuge', anim: 'forwardfold',
    equipment: 'none', muscles: ['beine', 'ruecken'], category: 'mobility', level: 1,
    impact: false, mode: 'time', holdSec: 30,
    desc: 'Aus dem Stand langsam nach vorn abrollen, Kopf und Arme locker hängen lassen. Dehnt die Beinrückseite und den Rücken.',
  },
  {
    id: 'quad_stretch', name: 'Quadrizeps-Dehnung', anim: 'quadstretch',
    equipment: 'none', muscles: ['beine'], category: 'mobility', level: 1,
    impact: false, mode: 'time', holdSec: 30,
    desc: 'Im Stand eine Ferse zum Gesäß ziehen, Knie zeigen zueinander. Bei Bedarf festhalten. Seite wechseln.',
  },
  {
    id: 'cat_cow', name: 'Katze-Kuh', anim: 'catcow',
    equipment: 'none', muscles: ['ruecken', 'core'], category: 'mobility', level: 1,
    impact: false, mode: 'time', holdSec: 40,
    desc: 'Im Vierfüßlerstand den Rücken abwechselnd rund machen (Katze) und ins leichte Hohlkreuz kommen (Kuh). Ruhig atmen.',
  },
  {
    id: 'shoulder_mob', name: 'Schulter-Mobilisation', anim: 'shouldermob',
    equipment: 'none', muscles: ['schultern'], category: 'mobility', level: 1,
    impact: false, mode: 'time', holdSec: 40,
    desc: 'Arme auf Brusthöhe öffnen und schließen, Schulterblätter bewusst zusammenziehen und wieder lösen.',
  },
  {
    id: 'lunge_stretch', name: 'Ausfallschritt-Dehnung', anim: 'lunge_hold',
    equipment: 'none', muscles: ['beine', 'po'], category: 'mobility', level: 1,
    impact: false, mode: 'time', holdSec: 30,
    desc: 'Tiefen Ausfallschritt einnehmen und die Hüfte sanft Richtung Boden sinken lassen. Dehnt den Hüftbeuger. Seite wechseln.',
  },
];

const EXERCISE_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

const MUSCLE_LABELS = {
  beine: 'Beine', po: 'Po', brust: 'Brust', ruecken: 'Rücken',
  schultern: 'Schultern', arme: 'Arme', core: 'Core',
  cardio: 'Cardio', ganzkoerper: 'Ganzkörper',
};
