// ============================================================================
//  main.js — site orchestrator
//  Builds ALL sections from src/content.js (nothing hardcoded in the HTML),
//  initializes the 3D viewer and wires the payload selector to the bay zoom +
//  photo/specs swap.
// ============================================================================

import './style.css';
import {
  meta,
  hero,
  nav,
  problema,
  missoes,
  plataforma,
  viewer as viewerCfg,
  payloads,
  negocio,
  precos,
  retorno,
  roi,
  rodape,
  video,
} from './content.js';
import { OmniscanViewer } from './viewer.js';

// --- Helpers ----------------------------------------------------------------

// Resolve /public paths respecting Vite's `base` (see vite.config.js).
const asset = (p) => import.meta.env.BASE_URL + String(p).replace(/^\//, '');

// Euro formatting (en-IE): thousands separator "," and "€" symbol before.
const eur = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const fmtEur = (n) => eur.format(Math.round(n));

// Escape text for safe interpolation into template strings.
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c]
  );

// Light placeholder (inline SVG) for missing images (photos / render).
function placeholderImg(label) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'>
    <rect width='600' height='400' fill='#eef2f5'/>
    <rect x='0.5' y='0.5' width='599' height='399' fill='none' stroke='#d7dee5'/>
    <text x='300' y='196' fill='#8a95a1' font-family='Inter,sans-serif'
      font-size='22' text-anchor='middle'>${esc(label)}</text>
    <text x='300' y='224' fill='#aab4be' font-family='Inter,sans-serif'
      font-size='13' text-anchor='middle'>image missing</text>
  </svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

// --- Section rendering (HTML from the content) ------------------------------

function renderHeader() {
  const brandInner = meta.logo
    ? `<img class="brand__logo" alt="${esc(meta.marca)}" data-src="${asset(meta.logo)}" data-fb="logo" />
       <span class="brand__text">${esc(meta.marca)}<span class="dot">.</span></span>`
    : `${esc(meta.marca)}<span class="dot">.</span>`;
  return `
  <header class="site-header" id="site-header">
    <div class="wrap">
      <a class="brand" href="#top">${brandInner}</a>
      <nav class="nav" aria-label="Main navigation">
        ${nav
          .map(
            (n, i) =>
              `<a href="${n.href}"${i === nav.length - 1 ? ' class="nav-cta"' : ''}>${esc(
                n.label
              )}</a>`
          )
          .join('')}
      </nav>
    </div>
  </header>`;
}

function renderHero() {
  return `
  <section class="hero" id="top">
    <!-- Faint full-bleed drone background (opacity via --hero-bg-opacity). -->
    <!-- data-fb="hide": if the asset is missing, just hide it (theme bg shows). -->
    <div class="hero__bg" aria-hidden="true">
      <img class="hero__bg-img" alt="" data-src="${asset(hero.fundo)}" data-fb="hide" />
    </div>
    <div class="hero__scrim" aria-hidden="true"></div>
    <div class="wrap hero__grid">
      <div class="hero__content">
        <p class="eyebrow">${esc(hero.eyebrow)}</p>
        <h1 class="hero__title">${esc(meta.marca)}</h1>
        <p class="hero__subtitle">${esc(meta.subtitulo)}</p>
        <div class="hero__cta">
          <a class="btn btn-primary" href="${esc(hero.ctaPrimario.href)}">${esc(
            hero.ctaPrimario.label
          )}</a>
          <a class="btn btn-ghost" href="${esc(hero.ctaSecundario.href)}">${esc(
            hero.ctaSecundario.label
          )}</a>
        </div>
        <p class="hero__context">${esc(meta.contexto)}</p>
      </div>
      <figure class="hero__media">
        <div class="hero__media-glow" aria-hidden="true"></div>
        <!-- data-src + error handler wired in JS (see wireImages) -->
        <img class="hero__img" alt="Omniscan UAV render"
          data-src="${asset(hero.imagem)}" data-fb="placeholder" data-label="Omniscan render" />
      </figure>
    </div>
  </section>`;
}

function renderMissoes() {
  return `
  <section class="section" id="missions">
    <div class="wrap reveal">
      <p class="eyebrow">${esc(problema.etiqueta)}</p>
      <h2 class="section-title">${esc(problema.titulo)}</h2>
      <p class="section-lead">${esc(problema.intro)}</p>
      <div class="cards">
        ${missoes
          .map(
            (m, i) => `
          <article class="card">
            <span class="card__index">0${i + 1}</span>
            <h3 class="card__title">${esc(m.nome)}</h3>
            <p class="card__text">${esc(m.resumo)}</p>
          </article>`
          )
          .join('')}
      </div>
    </div>
  </section>`;
}

function renderPlataforma() {
  return `
  <section class="section section--alt" id="platform">
    <div class="wrap reveal">
      <div class="platform__head">
        <div>
          <p class="eyebrow">${esc(plataforma.etiqueta)}</p>
          <h2 class="section-title">${esc(plataforma.titulo)}</h2>
        </div>
      </div>
      <p class="section-lead">${esc(plataforma.intro)}</p>
      <ul class="spec-strip">
        ${plataforma.specs.map((s) => `<li>${esc(s)}</li>`).join('')}
      </ul>

      <div class="viewer">
        <!-- 3D stage column -->
        <div class="stage-col">
          <div class="stage" id="stage" aria-label="Omniscan 3D model">
            <div class="stage__overlay" id="stage-overlay">
              <div class="spinner"></div>
              <p id="stage-overlay-text">Loading the 3D model…</p>
            </div>
          </div>
          <div class="stage-controls">
            <button class="btn btn-ghost" id="btn-reset" type="button">↺ View full aircraft</button>
            <button class="btn btn-ghost" id="btn-xray" type="button" title="View interior" hidden>View interior</button>
            <span class="stage-hint">Drag to rotate · scroll to zoom</span>
          </div>
        </div>

        <!-- Selector + specs panel column -->
        <div class="payload-col">
          <div class="payload-tabs" id="payload-tabs" role="tablist" aria-label="Payload modules">
            ${payloads
              .map(
                (p) => `
              <button class="payload-tab" type="button" role="tab"
                id="tab-${esc(p.id)}" data-id="${esc(p.id)}" aria-selected="false">
                ${esc(p.curto)}
              </button>`
              )
              .join('')}
          </div>
          <div class="payload-panel" id="payload-panel">
            <p class="payload-empty">${esc(plataforma.painelVazio)}</p>
          </div>
        </div>
      </div>

      ${renderVideoBox()}
    </div>
  </section>`;
}

// Flight-video box (config-driven): local <video>, YouTube <iframe>, or a
// "coming soon" placeholder when no src is set (see content.js > video).
function renderVideoBox() {
  const v = video || {};
  let inner;
  if (v.src && v.tipo === 'youtube') {
    inner = `<iframe class="video-frame" src="${esc(v.src)}" title="${esc(v.titulo)}"
      loading="lazy" allowfullscreen
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"></iframe>`;
  } else if (v.src && v.tipo === 'local') {
    inner = `<video class="video-frame" controls preload="metadata"${
      v.poster ? ` poster="${asset(v.poster)}"` : ''
    }>
      <source src="${asset(v.src)}" />
    </video>`;
  } else {
    const bg = v.poster
      ? ` style="background-image:url('${asset(v.poster)}')"`
      : '';
    inner = `<div class="video-placeholder"${bg}><span>${esc(
      v.emBreve || 'Coming soon'
    )}</span></div>`;
  }
  return `
      <div class="flight-video reveal">
        <h3 class="flight-video__title">${esc(v.titulo)}</h3>
        <div class="video-box">${inner}</div>
      </div>`;
}

function renderNegocio() {
  const tabelaNos = `
    <div class="price-table">
      <div class="price-table__head"><h3>Price per node</h3></div>
      <table>
        <thead>
          <tr><th>Node</th><th class="num">Price</th></tr>
        </thead>
        <tbody>
          ${precos.nos
            .map(
              (n) => `
            <tr>
              <td>${esc(n.nome)}</td>
              <td class="num price">${fmtEur(n.preco)}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`;

  const tabelaPacotes = `
    <div class="price-table">
      <div class="price-table__head"><h3>Swarm packages</h3></div>
      <table>
        <thead>
          <tr><th>Package</th><th class="num">Price</th></tr>
        </thead>
        <tbody>
          ${precos.pacotes
            .map(
              (p) => `
            <tr>
              <td>${esc(p.nome)}<span class="composicao">${esc(p.composicao)}</span></td>
              <td class="num price">${fmtEur(p.preco)}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`;

  return `
  <section class="section" id="business">
    <div class="wrap reveal">
      <p class="eyebrow">${esc(negocio.etiqueta)}</p>
      <h2 class="section-title">${esc(negocio.titulo)}</h2>
      <p class="section-lead">${esc(negocio.intro)}</p>

      <div class="streams">
        ${negocio.fluxos
          .map(
            (f, i) => `
          <div class="stream">
            <span class="stream__n">0${i + 1}</span>
            <h3>${esc(f.nome)}</h3>
            <p>${esc(f.desc)}</p>
          </div>`
          )
          .join('')}
      </div>

      <div class="tables">
        ${tabelaNos}
        ${tabelaPacotes}
      </div>

      <div class="reconfig">
        <div class="reconfig__icon">⟲</div>
        <div>
          <h3>${esc(negocio.reconfig.titulo)}</h3>
          <p>${esc(negocio.reconfig.texto)}</p>
        </div>
      </div>
    </div>
  </section>`;
}

function renderRetorno() {
  return `
  <section class="section section--alt" id="returns">
    <div class="wrap reveal">
      <p class="eyebrow">${esc(retorno.etiqueta)}</p>
      <h2 class="section-title">${esc(retorno.titulo)}</h2>
      <div class="roi-grid">
        ${roi
          .map(
            (r) => `
          <article class="roi-card">
            <p class="roi-card__kpi">${esc(r.kpi)}</p>
            <p class="roi-card__label">${esc(r.label)}</p>
            <p class="roi-card__detail">${esc(r.detalhe)}</p>
          </article>`
          )
          .join('')}
      </div>
      <p class="roi-note">${esc(retorno.nota)}</p>
    </div>
  </section>`;
}

function renderRodape() {
  return `
  <footer class="footer" id="report">
    <div class="footer__cta">
      <div class="wrap reveal">
        <p class="eyebrow" style="justify-content:center">${esc(rodape.etiqueta)}</p>
        <h2 class="section-title">${esc(rodape.titulo)}</h2>
        <a class="btn btn-primary" href="${asset(rodape.reportPath)}" download>
          ⬇ ${esc(rodape.reportLabel)}
        </a>
      </div>
    </div>
    <div class="wrap footer__meta">
      <p class="footer__credits">${esc(rodape.creditos)}</p>
      ${renderTeam()}
      <p class="footer__brandline">${esc(meta.marca)}</p>
    </div>
  </footer>`;
}

// Footer team grid — each member links to LinkedIn; members without a URL yet
// render as a styled placeholder (see content.js > rodape.equipa).
function renderTeam() {
  const linkedinIcon = `<svg class="team__icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.8 0 0 .78 0 1.74v20.52C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.74V1.74C24 .78 23.2 0 22.22 0z"/>
  </svg>`;
  const items = rodape.equipa
    .map((m) => {
      const url = (m.linkedin || '').trim();
      const inner = `${linkedinIcon}<span>${esc(m.nome)}</span>`;
      if (url) {
        return `<li><a class="team__member" href="${esc(url)}" target="_blank"
          rel="noopener noreferrer" aria-label="${esc(m.nome)} on LinkedIn">${inner}</a></li>`;
      }
      return `<li><span class="team__member is-placeholder"
        title="LinkedIn link coming soon">${inner}</span></li>`;
    })
    .join('');
  return `
      <div class="team">
        <h3 class="team__title">${esc(rodape.equipaTitulo || 'The team')}</h3>
        <ul class="team__list">${items}</ul>
      </div>`;
}

// --- Mounting ---------------------------------------------------------------

function mount() {
  const app = document.getElementById('app');
  app.innerHTML = [
    renderHeader(),
    renderHero(),
    renderMissoes(),
    renderPlataforma(),
    renderNegocio(),
    renderRetorno(),
    renderRodape(),
  ].join('\n');

  initHeaderScroll();
  initReveal();
  wireImages();
  initViewer();
  initPayloadSelector();
}

// Loads every img[data-src] and, on error, applies its fallback strategy:
//   data-fb="placeholder" -> swap to a grey placeholder (data-label as caption)
//   data-fb="hide"        -> hide it (e.g. the faint hero background)
function wireImages() {
  document.querySelectorAll('img[data-src]').forEach((img) => {
    img.addEventListener(
      'error',
      () => {
        if (img.dataset.fb === 'hide') {
          img.closest('.hero__bg')?.style.setProperty('display', 'none');
          img.style.display = 'none';
        } else if (img.dataset.fb === 'logo') {
          img.classList.add('is-hidden');
        } else {
          img.classList.add('is-placeholder');
          img.src = placeholderImg(img.dataset.label || 'Image');
        }
      },
      { once: true }
    );
    img.src = img.dataset.src;
  });
}

// Header shadow/highlight on scroll
function initHeaderScroll() {
  const header = document.getElementById('site-header');
  const onScroll = () =>
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

// Reveal sections as they enter the viewport
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  els.forEach((el) => io.observe(el));
}

// --- 3D viewer + payload selector -------------------------------------------

let viewer = null;

function initViewer() {
  const stage = document.getElementById('stage');
  const overlay = document.getElementById('stage-overlay');
  const overlayText = document.getElementById('stage-overlay-text');

  viewer = new OmniscanViewer({
    container: stage,
    modelo: asset(viewerCfg.modelo),
    bayFocus: viewerCfg.bayFocus,
    bayCameraOffset: viewerCfg.bayCameraOffset,
    interiorFocus: viewerCfg.interiorFocus,
    interiorCameraOffset: viewerCfg.interiorCameraOffset,
    overviewAngle: viewerCfg.overviewAngle,
    overviewZoom: viewerCfg.overviewZoom,
    modelRotation: viewerCfg.modelRotation,
    onProgress: (p) => {
      overlayText.textContent = `Loading the 3D model… ${Math.round(p * 100)}%`;
    },
    onLoaded: () => {
      overlay.hidden = true;
    },
    onError: (msg) => {
      // Placeholder being shown: a discreet notice that doesn't block the scene.
      overlay.hidden = false;
      overlay.classList.add('is-error');
      overlayText.textContent = msg;
      setTimeout(() => {
        overlay.hidden = true;
      }, 4200);
    },
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    clearActiveTab();
    showEmptyPanel();
    viewer.resetView();
  });

  // X-Ray toggle — swap between full model and sem-tampa (interior) model
  const btnXray = document.getElementById('btn-xray');
  if (btnXray && viewerCfg.modeloSemTampa) {
    let xrayOn = false;
    btnXray.addEventListener('click', () => {
      xrayOn = !xrayOn;
      btnXray.classList.toggle('is-active', xrayOn);
      btnXray.title = xrayOn ? 'Close cover' : 'View interior';
      btnXray.textContent = xrayOn ? 'Close cover' : 'View interior';
      const url = asset(xrayOn ? viewerCfg.modeloSemTampa : viewerCfg.modelo);
      viewer.swapModel(url, xrayOn ? 'interior' : null);
    });
    btnXray.hidden = false;
  }
}

function initPayloadSelector() {
  const tabs = document.getElementById('payload-tabs');
  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.payload-tab');
    if (!btn) return;
    const id = btn.dataset.id;
    const payload = payloads.find((p) => p.id === id);
    if (!payload) return;

    setActiveTab(id);
    showPayloadPanel(payload);
    viewer?.focusBay(payload.curto); // animates camera to the bay + lights the hotspot
  });
}

function setActiveTab(id) {
  document.querySelectorAll('.payload-tab').forEach((t) => {
    const on = t.dataset.id === id;
    t.classList.toggle('is-active', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
  });
}

function clearActiveTab() {
  document.querySelectorAll('.payload-tab').forEach((t) => {
    t.classList.remove('is-active');
    t.setAttribute('aria-selected', 'false');
  });
}

function showEmptyPanel() {
  const panel = document.getElementById('payload-panel');
  panel.innerHTML = `<p class="payload-empty">${esc(plataforma.painelVazio)}</p>`;
}

function showPayloadPanel(p) {
  const panel = document.getElementById('payload-panel');
  panel.innerHTML = `
    <div class="fade-swap" style="display:flex;flex-direction:column;gap:1rem;height:100%">
      <figure class="payload-figure">
        <img alt="${esc(p.nome)} sensor" />
      </figure>
      <div class="payload-body">
        <h3>${esc(p.nome)}</h3>
        <span class="payload-mission">${esc(p.missao)}</span>
        <ul class="payload-specs">
          ${p.specs.map((s) => `<li>${esc(s)}</li>`).join('')}
        </ul>
      </div>
    </div>`;

  // Error handler wired in JS (not inline): the real photo in /public may be
  // missing; in that case swap to a grey placeholder with the sensor name.
  // (Avoids escaping the data-URI inside an HTML attribute.)
  const img = panel.querySelector('.payload-figure img');
  img.addEventListener('error', () => { img.src = placeholderImg(p.curto); }, {
    once: true,
  });
  img.src = asset(p.imagem);
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
