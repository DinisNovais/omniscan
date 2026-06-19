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
  logo: '/assets/logo-omniscan.png',
  subtitulo: 'Reconfigurable UAV swarms for humanitarian response',
  contexto:
    'Group 6 · Integrating Project · 1st Cycle · Aerospace Engineering · IST · 2026',
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
    'Humanitarian crises — earthquakes, floods, wildfires, conflict — expose critical gaps in reaching contaminated or destroyed terrain. Omniscan answers with a heterogeneous swarm and a reconfigurable payload: one vehicle, three missions.',
};

export const missoes = [
  {
    id: 'demining',
    nome: 'Demining',
    resumo:
      'A technical survey that flags plastic mines (vegetation stress) and confirms metallic targets and UXO.',
  },
  {
    id: 'sar',
    nome: 'Search and Rescue',
    resumo:
      'Detects the human thermal signature (36–37 °C) through smoke, at night or in avalanches, with coordinate-only alerts.',
  },
  {
    id: 'reignition',
    nome: 'Wildfire re-ignitions',
    resumo:
      'Persistent patrol of hidden hotspots across burned terrain, in LWIR.',
  },
];

// ---------------------------------------------------------------------------
//  Section 3 — The platform (3D viewer + modular payload)
// ---------------------------------------------------------------------------
export const plataforma = {
  etiqueta: 'The platform',
  titulo: 'See Omniscan. Swap the payload.',
  intro:
    'A single Blended Wing Body airframe, fully electric VTOL. Rotate the model and pick a payload module — the camera moves in on the bay and the real sensor appears alongside.',
  // Platform spec strip (rendered as "chips")
  specs: [
    'BWB',
    'Electric VTOL',
    'MTOW 2 kg',
    'Cruise 20 m/s',
    'Swarm operation',
  ],
  // Helper text for the side panel before a payload is picked
  painelVazio:
    'Pick a payload module above to frame it in the bay and see the real sensor.',
};

// 3D viewer parameters ------------------------------------------------------
//  TUNE these after loading the real omniscan.glb. Coordinates are in the
//  model space (same scale/origin as the GLB). See the README, section
//  "Tuning the payload bay", for the step-by-step.
export const viewer = {
  modelo: '/models/omniscan.glb',
  bayFocus: { x: 0, y: 0, z: 0 }, // target point of the payload bay
  bayCameraOffset: { x: 0.3, y: 0.2, z: 0.6 }, // camera position when zooming to the bay
};

// Flight-video box (shown right below the 3D viewer) ------------------------
//  tipo: 'local'   -> <video controls poster>, src = path under /public
//        'youtube' -> responsive <iframe>, src = the YouTube EMBED url
//  Leave src empty ('') to show the "coming soon" placeholder (with the poster).
//  Examples:
//    src: '/media/voo-omniscan.mp4'                 (tipo: 'local')
//    src: 'https://www.youtube.com/embed/XXXXXXXX'  (tipo: 'youtube')
export const video = {
  titulo: 'Omniscan flight',
  tipo: 'local',
  src: '',
  poster: '/assets/hero-drone.png',
  emBreve: 'Flight video coming soon',
};

// ---------------------------------------------------------------------------
//  Payloads (selector data + real photo + side-panel specs)
//  imagem: real sensor photo in /public/assets (grey placeholder if missing)
// ---------------------------------------------------------------------------
export const payloads = [
  {
    id: 'flora',
    nome: 'Flora — Multispectral',
    curto: 'Flora',
    imagem: '/assets/payload-flora.jpg',
    missao: 'Demining (vegetation stress)',
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
    nome: 'Magno — Magnetometer',
    curto: 'Magno',
    imagem: '/assets/payload-magno.jpg',
    missao: 'Demining (metallic targets / UXO)',
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
    nome: 'Thermal — FLIR Lepton 3.5',
    curto: 'Thermal',
    imagem: '/assets/payload-termico.jpg',
    missao: 'Search and rescue + re-ignitions',
    specs: [
      'FLIR Lepton 3.5',
      '160 × 120 px',
      'LWIR 8–14 µm',
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
    'One platform, several ways to acquire and grow capability in the field.',
  fluxos: [
    {
      nome: 'Turnkey swarms',
      desc: 'Complete swarms, calibrated and ready to operate for each mission.',
    },
    {
      nome: 'Payload upgrades',
      desc: 'Sensor modules to reconfigure the fleet and open new missions.',
    },
    {
      nome: 'Maintenance & consumables',
      desc: 'Parts, batteries and support that keep field operations running.',
    },
  ],
  reconfig: {
    titulo: 'Reconfigurability is the multiplier',
    texto:
      'SAR and fire missions use the SAME thermal vehicle, and the demining swarm’s relays come from the same pool. Whoever owns a demining swarm already has the airframes for SAR or fire missions — just re-equip the payload. New capability is bought by swapping modules and scaling nodes, not by buying three fleets.',
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
    'Note: these figures are capital recovery, not full-lifecycle return — they exclude operating costs and recurring revenue. Releasing land back to use (avoiding full clearance at ~€26,700/ha) only strengthens the case.',
};

export const roi = [
  {
    kpi: '~47 ha',
    label: 'Break-even for the demining swarm',
    detalhe:
      'Survey ~€2,770/ha vs full clearance >€26,730/ha; drone+AI saves ~€1,385/ha; €65,400 ÷ €1,385 ≈ 47 ha.',
  },
  {
    kpi: '~20×',
    label: 'Cheaper than a helicopter (SAR)',
    detalhe: '€80–150/h of flight vs €2,000–3,000/h for a helicopter.',
  },
  {
    kpi: '+800%',
    label: 'Survey productivity gain',
    detalhe: 'Drone+AI workflows cover the area in days, not months.',
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
  equipa: [
    'António Teixeira',
    'Beatriz Amaral',
    'Bruno Marques',
    'Dinis Novais',
    'Laura Fernandes',
    'Lucas Moreira',
    'Maria Bastos',
    'Miguel Batalha',
    'Sofia Gomes',
  ],
};
