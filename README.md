# OMNISCAN — pitch site

Static single-page site supporting the **Omniscan** pitch — an autonomous,
multi-mission UAV (Blended Wing Body, electric VTOL, modular payload) developed
by **Group 6** in the 1st-Cycle Integrating Project in Aerospace Engineering
(IST, 2026), in partnership with ISR-Lisbon.

The narrative leads with **value and return**, uses an interactive **3D viewer**
as a technical demo in the middle, and closes with a call to action (download
the report).

- **Stack:** Vite + vanilla JavaScript + Three.js (GLTFLoader · OrbitControls ·
  CSS2DRenderer · DRACOLoader). Custom, responsive CSS. Static build.
- **All copy and numbers** live in a single file: [`src/content.js`](src/content.js).
  Price tables and ROI blocks are generated from it — **nothing is hardcoded in
  the HTML**.

---

## How to run

Requires Node 18+ (tested with Node 24 / npm 11).

```bash
npm install      # install dependencies (vite, three)
npm run dev      # start at http://localhost:5173 (opens the browser)
npm run build    # generate the static site in /dist
npm run preview  # serve /dist locally to check the build
```

The site runs **with no assets at all**: the model shows as a primitive
aircraft, the hero shows a placeholder, and the payload photos show as grey
boxes.

---

## Where to put each asset

Drop the files into `public/` (copied as-is into the build). Exact expected
names — see also the `README.txt` inside each folder:

| File                                           | Where it shows                       |
| ---------------------------------------------- | ------------------------------------ |
| `public/assets/render-omniscan.png`            | Hero render                          |
| `public/models/omniscan.glb`                   | 3D viewer (the only 3D model)        |
| `public/assets/payload-flora.jpg`              | Flora payload panel                  |
| `public/assets/payload-magno.jpg`              | Magno payload panel                  |
| `public/assets/payload-termico.jpg`            | Thermal payload panel                |
| `public/docs/Relatorio_Omniscan_final.pdf`     | Download button in the footer        |

> A **placeholder PDF** (1 page) with that name already exists, so the button
> works right away. Replace it with the real report.

There are no 3D models of the payloads — only the aircraft. The payloads are
represented by **real photos** of the sensors (cropped from Figures 3.7, 3.8 and
3.9 of the report) plus the bay zoom on the aircraft model.

---

## How to edit the content (`src/content.js`)

Everything that is business copy and numbers lives in
[`src/content.js`](src/content.js), in commented blocks:

- `meta`, `hero` — brand, subtitle, hero CTAs and render.
- `nav` — header links.
- `problema`, `missoes` — intro and the 3 mission cards.
- `plataforma` — viewer intro and the spec strip (chips).
- `payloads` — the 3 modules: name, **photo** (`imagem`), mission and spec list.
- `negocio`, `precos` — ways to acquire capability, **Table A (nodes)** and
  **Table B (packages)**. As this is a sales site, only the **price** is shown
  to the customer — no costs or margins (they don't even enter the bundle).
- `retorno`, `roi` — the 3 highlight blocks + honesty note.
- `rodape` — report button, credits and the team list.

Change a number here and the table/KPI on the site updates itself. Euro values
are formatted automatically (thousands separator + `€`).

---

## Tuning the payload bay (`bayFocus` / `bayCameraOffset`)

When a payload is selected, the camera animates (~1 s) to frame the aircraft's
**payload bay** and lights an HTML hotspot (CSS2DRenderer) pinned to that point.
Both parameters live in `src/content.js > viewer`:

```js
export const viewer = {
  modelo: '/models/omniscan.glb',
  bayFocus: { x: 0, y: 0, z: 0 },           // bay target point (model space)
  bayCameraOffset: { x: 0.3, y: 0.2, z: 0.6 }, // camera position for that zoom
};
```

After dropping the real `omniscan.glb`, tune like this:

1. `npm run dev` and open the viewer.
2. `bayFocus` is the point on the model where the bay sits (where the hotspot
   appears). Nudge `x/y/z` in small steps until the marker lands on the bay.
   - The model is auto-framed, so the scale of the values depends on your
     `.glb`'s units. Start with steps on the order of the aircraft's size
     (e.g. 0.1).
3. `bayCameraOffset` is **added** to `bayFocus` to give the camera position for
   the zoom. Increase the values to pull the camera back, decrease to move in.
   `z` mostly controls the frontal distance; `x`/`y` the angle.
4. Save — Vite hot-reloads. Repeat until the framing looks right.

Tip: while tuning, you can open the console and use the `OrbitControls` to find
a good angle, then transcribe the values.

---

## Build and deploy

```bash
npm run build     # -> /dist (HTML, JS, CSS and everything in /public)
```

### GitHub Pages (automatic, via GitHub Actions)

This repo ships a workflow at `.github/workflows/deploy.yml` that builds and
deploys to GitHub Pages on every push to `main`.

1. Push the repo to GitHub (see the commands printed when you set it up).
2. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub
   Actions**.
3. Every push to `main` then publishes automatically. The live URL is
   `https://<your-user>.github.io/<repo>/` (also shown in the Actions run, under
   the `deploy` job).

The **base path is set automatically**: in CI, `vite.config.js` derives it from
the repository name (`GITHUB_REPOSITORY`), so it works whatever you name the
repo — no manual edit needed. Locally and for root domains it stays `/`.
Using a **custom domain**? Build with `VITE_BASE=/` (and add a `CNAME`).

### Other static hosts (Netlify / Vercel / Cloudflare Pages)

`npm run build` and publish the `dist` folder (base is `/`, so it works at a
domain root). For drag-and-drop: build, then drop `dist` on
<https://app.netlify.com/drop>.

---

## Structure

```
.
├── index.html              # minimal shell + no-flash theme script; #app filled by main.js
├── vite.config.js          # base auto-detected for GitHub Pages in CI
├── .github/workflows/
│   └── deploy.yml          # build + deploy to GitHub Pages on push to main
├── src/
│   ├── content.js          # ⬅ THE single source of copy and numbers (+ video config)
│   ├── main.js             # builds the sections + wires viewer / theme toggle
│   ├── viewer.js           # 3D viewer (Three.js) + tween + hotspot
│   └── style.css           # light + dark themes, tokens in :root / [data-theme=dark]
└── public/
    ├── assets/             # hero render + hero-drone bg + sensor photos
    ├── models/             # omniscan.glb
    ├── media/              # voo-omniscan.mp4 (flight video, optional)
    └── docs/               # report PDF (placeholder included)
```

The header has a **dark/light toggle** (top-right): first visit follows the OS
preference, and the choice is remembered. The hero shows a faint drone
background (`/assets/hero-drone.png`) over either theme, and a **flight-video**
box sits under the 3D viewer — set its source in `src/content.js > video`.

---

Group 6 · Advisor Prof. Frederico Afonso · In partnership with ISR-Lisbon ·
IST · 2026.
