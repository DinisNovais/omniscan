// ============================================================================
//  content.js — THE single source of business copy and numbers.
//  Edit EVERYTHING here. The site (main.js) reads from here; nothing is
//  hardcoded in the HTML. Price tables and ROI blocks are rendered with map()
//  from these arrays — just change the values below.
// ============================================================================

// ---------------------------------------------------------------------------
//  Identity / hero
// ---------------------------------------------------------------------------
export const meta = {
  marca: 'OMNISCAN',
  logo: '/assets/logo-omniscan.svg',
  subtitulo: 'Reconfigurable UAV swarms for humanitarian response',
  contexto:
    'Group 6 · 1st Cycle Integrating Project in Aerospace Engineering · IST · 2026',
};

export const hero = {
  eyebrow: 'BWB UAV · Electric VTOL · Modular payload',
  imagem: '/assets/render-omniscan.png', // aircraft render (leads the hero)
  fundo: '/assets/hero-drone.png', // faint drone background layer (works in dark + light)
  ctaPrimario: { label: 'See the platform', href: '#platform' },
  ctaSecundario: { label: 'The missions', href: '#missions' },
};

// ---------------------------------------------------------------------------
//  Navigation (anchors of the fixed header)
// ---------------------------------------------------------------------------
export const nav = [
  { href: '#missions', label: 'Missions' },
  { href: '#platform', label: 'Platform' },
  { href: '#business', label: 'Business' },
  { href: '#returns', label: 'Returns' },
  { href: '#report', label: 'Report' },
];

// ---------------------------------------------------------------------------
//  Section 2 — The problem and the 3 missions
// ---------------------------------------------------------------------------
export const problema = {
  etiqueta: 'The problem',
  titulo: 'One platform. Three missions.',
  intro:
    'Earthquakes, floods, wildfires, conflict. The ground that needs eyes on it is usually the ground nobody can safely reach. Omniscan covers it with a mixed swarm and a swappable payload: one aircraft, three missions.',
};

export const missoes = [
  {
    id: 'demining',
    nome: 'Demining',
    resumo:
      'Flags plastic mines by the vegetation stress above them, then confirms metal and UXO.',
  },
  {
    id: 'sar',
    nome: 'Search and Rescue',
    resumo:
      'Picks out a body heat signature (36-37 °C) through smoke, at night, or under avalanche snow. Alerts are coordinates only.',
  },
  {
    id: 'reignition',
    nome: 'Wildfire re-ignitions',
    resumo:
      'Patrols burned ground for hidden hotspots in LWIR, long after the fire looks out.',
  },
];

// ---------------------------------------------------------------------------
//  Section 3 — The platform (3D viewer + modular payload)
// ---------------------------------------------------------------------------
export const plataforma = {
  etiqueta: 'The platform',
  titulo: 'See Omniscan. Swap the payload.',
  intro:
    'One blended-wing-body airframe, fully electric VTOL. Rotate it, pick a mission, and the matching payload drops into the bay with the real sensor shown next to it.',
  // Platform spec strip (rendered as "chips")
  specs: [
    'BWB',
    'Electric VTOL',
    'MTOW 2 kg',
    'Cruise 20 m/s',
    'Swarm operation',
  ],
  // Helper text for the side panel before a mission is picked
  painelVazio:
    'Pick a mission above to load its payload in the bay and see the real sensor.',
  // Small muted hint shown right above the mission tabs
  seletorHint: 'Select a mission to load the corresponding payload into the bay.',
};

// 3D viewer parameters ------------------------------------------------------
export const viewer = {
  // Model shown on load, before any mission is picked (overview of the airframe).
  // The per-mission CADs live on each payload (see `payloads[].modelo`).
  modeloDefault: '/models/omniscanflora.glb',

  // Payload-bay / interior framing. These are computed from the model's own
  // bounding box, so they work for any CAD regardless of its scale/origin.
  //   drop: how far below the model centre to aim (× model radius) — the bay is
  //         on the belly, so we look slightly down on it.
  //   dist: camera distance from that target (× model radius); smaller = closer.
  //   dir:  camera direction from the target (x=right, y=up, z=front). The bay
  //         opens on the belly, so the default looks UP from below-front.
  //   The bay opens on the belly → look UP from below. The interior (cover
  //   removed) is on TOP → look DOWN from above (positive y dir, target raised
  //   slightly above centre via a negative drop).
  bayView: { drop: 0.15, dist: 2.2, dir: { x: 0.25, y: -0.85, z: 0.45 } }, // click a mission/payload
  interiorView: { drop: -0.10, dist: 2.0, dir: { x: 0.2, y: 0.9, z: 0.45 } }, // after "View interior" (from above)

  // Initial overview camera
  // x= right/left,  y= up/down,  z= front/back  (multipliers on auto-computed dist)
  overviewAngle: { x: -0.8, y: 0.5, z: 0.7 },
  // < 1.0 = closer,  > 1.0 = further away  (default Three.js framing = 1.5)
  // The stage is taller now (matches the right panel), and a fixed vertical FOV
  // makes the model look bigger in a taller viewport — so pull the camera back.
  overviewZoom: 0.68,

  // Shift the overview pivot off the bounding-box centre so the aircraft is framed
  // more towards its front/nose (the geometric centre sits too far back). Units are
  // fractions of the model radius. Same axes as overviewAngle (z = front/back);
  // increase z to push the framing further forward, flip the sign if it goes the
  // wrong way. Applied to every payload's overview (and after a reset).
  overviewTargetOffset: { x: 0, y: 0, z: 0.30 },

  // Axis-correction rotation (degrees). DEFAULT for the Flora/Thermal airframe
  // (and the initial model): that GLB is already exported Y-up and level, so it
  // needs no correction. The Magno GLB is Z-up (SolidWorks export) and overrides
  // this with x:-90 (see payloads[]).
  modelRotation: { x: 0, y: 0, z: 0 },
};

// Flight-video box (shown right below the 3D viewer) ------------------------
//  tipo: 'local'   -> <video controls poster>, src = path under /public
//        'youtube' -> responsive <iframe>, src = the YouTube EMBED url
//  Leave src empty ('') to show the "coming soon" placeholder (with the poster).
//  Examples:
//    src: '/media/voo-omniscan.mp4'                 (tipo: 'local')
//    src: 'https://www.youtube.com/embed/XXXXXXXX'  (tipo: 'youtube')
export const video = {
  titulo: 'Omniscan prototype',
  tipo: 'local',
  src: '/media/IMG_1028.mp4',
  // Shown on the neutral pre-play overlay (no poster image).
  cta: 'Press play to watch',
  poster: '/assets/hero-drone.png', // only used by the "coming soon" placeholder
  emBreve: 'Prototype video coming soon',
};

// ---------------------------------------------------------------------------
//  Payloads (selector data + real photo + side-panel specs)
//  imagem:    real sensor photo in /public/assets (grey placeholder if missing)
//  missaoIds: which mission(s) this payload serves (ids from `missoes` above).
//             The platform selector groups payloads by mission from this.
//  modelo / modeloSemTampa: the per-payload CAD loaded when this payload is
//             selected (and its "View interior" counterpart). Each payload has
//             its own airframe CAD (Flora, Magno, Thermal).
// ---------------------------------------------------------------------------
export const payloads = [
  {
    id: 'flora',
    nome: 'Flora · Multispectral',
    curto: 'Flora',
    imagem: '/assets/payload-flora-removebg-preview.png',
    missao: 'Demining (vegetation stress)',
    missaoIds: ['demining'],
    modelo: '/models/omniscanflora.glb',
    modeloSemTampa: '/models/omniscanflora_semtampa.glb',
    specs: [
      'MicaSense RedEdge-P',
      '5 bands: 475/560/668/717/842 nm',
      '0.300 kg',
      'On-board NDVI/NDRE (Jetson Orin NX)',
      '~10 km/sortie at 12 m/s and 20 m',
    ],
  },
  {
    id: 'magno',
    nome: 'Magno · Magnetometer',
    curto: 'Magno',
    imagem: '/assets/payload-magno-removebg-preview.png',
    missao: 'Demining (metallic targets / UXO)',
    missaoIds: ['demining'],
    modelo: '/models/omniscanmagno.glb',
    modeloSemTampa: '/models/omniscanmagno_semtampa.glb',
    modelRotation: { x: -90, y: 0, z: 0 }, // Magno GLB is Z-up → needs the -90° fix

    specs: [
      'Stefan Mayer FLC3-70 Fluxgate',
      '< 0.5 nT RMS',
      '0.033 kg',
      'Low flight / hover (~2 m)',
      'Software EMI correction',
    ],
  },
  {
    id: 'thermal',
    nome: 'Thermal · FLIR Lepton 3.5',
    curto: 'Thermal',
    imagem: '/assets/payload-termico-removebg-preview.png',
    missao: 'Search and rescue + re-ignitions',
    missaoIds: ['sar', 'reignition'],
    modelo: '/models/omniscanthermal.glb',
    modeloSemTampa: '/models/omniscanthermal_semtampa.glb',
    specs: [
      'FLIR Lepton 3.5',
      '160 × 120 px',
      'LWIR 8-14 µm',
      '< 50 mK',
      '< 1 g',
    ],
  },
];

// ---------------------------------------------------------------------------
//  Section 4 — Business model and pricing
// ---------------------------------------------------------------------------
export const negocio = {
  etiqueta: 'Business model',
  titulo: 'We sell swarms, not drones.',
  intro:
    'One platform, a few ways to buy in and scale up in the field.',
  fluxos: [
    {
      nome: 'Turnkey swarms',
      desc: 'Full swarms, calibrated and ready to fly a given mission.',
    },
    {
      nome: 'Payload upgrades',
      desc: 'Sensor modules that re-task the fleet and open new missions.',
    },
    {
      nome: 'Maintenance & consumables',
      desc: 'Spares, batteries and support to keep crews in the air.',
    },
  ],
  reconfig: {
    titulo: 'Reconfiguration is the multiplier',
    texto:
      'SAR and fire fly the same thermal aircraft, and a demining swarm reuses relays from the same pool. Own a demining swarm and you already hold the airframes for SAR or fire; just re-equip the payload. New capability comes from swapping modules and adding nodes, not from buying three fleets.',
  },
};

// Sale prices. No costs or margins — this is a commercial site, we show only
// the price to the customer (and those figures don't even enter the bundle).
export const precos = {
  // Table A — Price per node
  nos: [
    { nome: 'Thermal node (SAR / fire)', preco: 4000 },
    { nome: 'Magnetometer node (Magno)', preco: 4850 },
    { nome: 'Multispectral node (Flora)', preco: 14150 },
  ],
  // Table B — Swarm packages
  pacotes: [
    {
      nome: 'Demining swarm',
      composicao: '6 Magno + 2 Flora + 2 Thermal',
      preco: 65400,
    },
    { nome: 'SAR swarm', composicao: '8 Thermal', preco: 32000 },
    { nome: 'Re-ignition swarm', composicao: '6 Thermal', preco: 24000 },
  ],
};

// ---------------------------------------------------------------------------
//  Section 5 — Return on investment
// ---------------------------------------------------------------------------
export const retorno = {
  etiqueta: 'Return on investment',
  titulo: 'The investment case.',
  nota:
    'These figures are capital recovery, not full-lifecycle return: they leave out operating costs and recurring revenue. Putting land back into use, instead of full clearance at about €26,700/ha, only strengthens the case.',
};

export const roi = [
  {
    kpi: '~47 ha',
    label: 'Break-even for the demining swarm',
    detalhe:
      'Survey runs ~€2,770/ha against full clearance above €26,730/ha. Drone and AI save ~€1,385/ha, so €65,400 / €1,385 works out to about 47 ha.',
  },
  {
    kpi: '~20×',
    label: 'Cheaper than a helicopter (SAR)',
    detalhe: '€80-150/h in the air against €2,000-3,000/h for a helicopter.',
  },
  {
    kpi: '+800%',
    label: 'Survey productivity gain',
    detalhe: 'Drone and AI cover the area in days, not months.',
  },
];

// ---------------------------------------------------------------------------
//  Section 6 — Report + team (footer)
// ---------------------------------------------------------------------------
export const rodape = {
  etiqueta: 'Next step',
  titulo: 'Want the full numbers?',
  reportLabel: 'Download the Technical Report (PDF, 120 pages)',
  reportPath: '/docs/Relatorio_Omniscan_final.pdf',
  creditos:
    'Group 6 · Advisor Prof. Frederico Afonso · In partnership with ISR-Lisbon · IST · 2026',
  equipaTitulo: 'The team',

  equipa: [
    {
      nome: 'António Teixeira',
      linkedin: 'https://www.linkedin.com/in/antónio-teixeira-233828286/'
    },
    {
      nome: 'Beatriz Amaral',
      linkedin: 'https://www.linkedin.com/in/beatriz-c-amaral/'
    },
    {
      nome: 'Bruno Marques',
      linkedin: 'https://www.linkedin.com/in/bruno-marques-191668300/'
    },
    {
      nome: 'Dinis Novais',
      linkedin: 'https://www.linkedin.com/in/dinis-novais/',
    },
    {
      nome: 'Laura Fernandes',
      linkedin: 'https://www.linkedin.com/in/lauramargaridofernandes/'
    },
    {
      nome: 'Lucas Moreira',
      linkedin: ''
    },
    {
      nome: 'Maria Bastos',
      linkedin: 'https://www.linkedin.com/in/maria-bastos0705/'
    },
    {
      nome: 'Miguel Batalha',
      linkedin: ''
    },
    {
      nome: 'Sofia Gomes',
      linkedin: 'https://www.linkedin.com/in/sofiafernandesgomes/'
    },
  ],
};
