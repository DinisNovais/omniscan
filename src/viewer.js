// ============================================================================
//  viewer.js — Omniscan 3D viewer (Three.js)
//
//  Responsible ONLY for the 3D scene: WebGLRenderer + OrbitControls +
//  CSS2DRenderer (bay hotspot), lighting, async .glb loading (with a primitive
//  fallback aircraft if it's missing/fails) and a smooth camera animation to
//  the payload bay (interruptible when the user grabs the mouse).
//
//  The "chrome" (buttons, spinner, tabs, specs panel) lives in main.js and
//  talks to this module through the public API at the end of the file:
//      focusBay(label) · resetView() · isReady · dispose()
//  and through the onLoaded / onError / onProgress callbacks.
// ============================================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import {
  CSS2DRenderer,
  CSS2DObject,
} from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const CAMERA_TWEEN_MS = 1000; // camera animation duration (~1 s)

export class OmniscanViewer {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.container  div to mount the canvas into (`.stage`)
   * @param {string} opts.modelo          .glb URL (already resolved with BASE_URL)
   * @param {{x,y,z}} opts.bayFocus       bay target point (model space)
   * @param {{x,y,z}} opts.bayCameraOffset camera offset when zooming to the bay
   * @param {Function} [opts.onLoaded]
   * @param {Function} [opts.onError]
   * @param {Function} [opts.onProgress]  receives 0..1
   */
  constructor(opts) {
    this.container = opts.container;
    this.modelUrl = opts.modelo;
    this.bayFocus = new THREE.Vector3(
      opts.bayFocus.x,
      opts.bayFocus.y,
      opts.bayFocus.z
    );
    this.bayCameraOffset = new THREE.Vector3(
      opts.bayCameraOffset.x,
      opts.bayCameraOffset.y,
      opts.bayCameraOffset.z
    );
    // Initial camera angle multipliers (relative to auto-computed distance)
    this.overviewAngle = opts.overviewAngle
      ? new THREE.Vector3(opts.overviewAngle.x, opts.overviewAngle.y, opts.overviewAngle.z)
      : new THREE.Vector3(0.0, 0.45, 1.1);
    // < 1 = closer, > 1 = further (default framing factor is 1.5)
    this.overviewZoom = opts.overviewZoom ?? 1.0;
    // Interior focus (opening revealed after sem-tampa swap)
    this.interiorFocus = opts.interiorFocus
      ? new THREE.Vector3(opts.interiorFocus.x, opts.interiorFocus.y, opts.interiorFocus.z)
      : null;
    this.interiorCameraOffset = opts.interiorCameraOffset
      ? new THREE.Vector3(opts.interiorCameraOffset.x, opts.interiorCameraOffset.y, opts.interiorCameraOffset.z)
      : null;
    // Axis-correction rotation (degrees → radians). Fixes SolidWorks Z-up exports.
    const deg = Math.PI / 180;
    this.modelRotation = opts.modelRotation
      ? new THREE.Euler(
          (opts.modelRotation.x || 0) * deg,
          (opts.modelRotation.y || 0) * deg,
          (opts.modelRotation.z || 0) * deg
        )
      : new THREE.Euler(0, 0, 0);
    this.cb = {
      onLoaded: opts.onLoaded || (() => {}),
      onError: opts.onError || (() => {}),
      onProgress: opts.onProgress || (() => {}),
    };

    this.isReady = false;
    this._tween = null; // active camera animation, or null
    this._raf = 0;
    this._clock = new THREE.Clock();

    // reused scratch vector (avoids garbage in the loop)
    this._tmpV = new THREE.Vector3();

    this._initRenderer();
    this._initScene();
    this._initLights();
    this._initControls();
    this._initHotspot();
    this._initClickDebug();   // double-click logs world coordinates (for tuning bayFocus)
    this._bindResize();
    this._loadModel();

    this._animate = this._animate.bind(this);
    this._raf = requestAnimationFrame(this._animate);
  }

  // -- Setup ----------------------------------------------------------------

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // clamp
    this.renderer.setSize(this._w(), this._h());
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);

    // CSS2DRenderer above the WebGL canvas so the HTML hotspot follows the model
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(this._w(), this._h());
    this.labelRenderer.domElement.className = 'css2d-layer';
    this.container.appendChild(this.labelRenderer.domElement);
  }

  _initScene() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      45,
      this._w() / this._h(),
      0.01,
      2000
    );
    // provisional initial position; reframed after the model loads
    this.camera.position.set(2.4, 1.4, 3.2);

    // Soft environment (PMREM from RoomEnvironment) for PBR reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    pmrem.dispose();
  }

  _initLights() {
    this.scene.add(new THREE.AmbientLight(0xdfe7ef, 0.7));

    const key = new THREE.DirectionalLight(0xffffff, 2.3);
    key.position.set(4, 6, 5);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xeef3f8, 0.5);
    fill.position.set(-3, 1, 4);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0x6468d0, 0.35); // accent back-light (indigo)
    rim.position.set(-5, 2, -4);
    this.scene.add(rim);
  }

  _initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = true;
    this.controls.minDistance = 0.3;
    this.controls.maxDistance = 50;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.9;

    // Any user interaction stops the auto-rotation and interrupts the camera
    // animation in progress (requirement: interruptible tween).
    this.controls.addEventListener('start', () => {
      this.controls.autoRotate = false;
      this._tween = null;
    });
  }

  _initHotspot() {
    const el = document.createElement('div');
    el.className = 'hotspot';
    el.innerHTML = '<span class="hotspot__label"></span>';
    this._hotspotLabelEl = el.querySelector('.hotspot__label');
    this.hotspotEl = el;

    this.hotspot = new CSS2DObject(el);
    this.hotspot.position.copy(this.bayFocus);
    this.hotspot.visible = false;
    this.scene.add(this.hotspot);
  }

  /**
   * DEBUG helper — double-click on the model to log world-space coordinates.
   * Open the browser console (F12) and double-click the payload bay area.
   * Copy the printed {x, y, z} into content.js > viewer.bayFocus.
   * Remove or comment out this method once calibration is done.
   */
  _initClickDebug() {
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    this.renderer.domElement.addEventListener('dblclick', (event) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, this.camera);
      const hits = raycaster.intersectObjects(this.scene.children, true);
      if (hits.length > 0) {
        const p = hits[0].point;
        console.log(
          '%c[BAY DEBUG] Clicked point:',
          'color: #2E3192; font-weight: bold',
          `{ x: ${p.x.toFixed(4)}, y: ${p.y.toFixed(4)}, z: ${p.z.toFixed(4)} }`
        );
        console.log('  → Copy these into content.js > viewer.bayFocus');
      }
    });
  }

  // -- Model loading --------------------------------------------------------

  _loadModel() {
    const loader = new GLTFLoader();

    // DRACOLoader ready (decoder from the gstatic CDN). Only used if the .glb
    // is Draco-compressed; otherwise it stays inactive.
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    loader.setDRACOLoader(draco);

    loader.load(
      this.modelUrl,
      (gltf) => {
        this._onModelReady(gltf.scene, false);
      },
      (evt) => {
        if (evt.lengthComputable && evt.total > 0) {
          this.cb.onProgress(evt.loaded / evt.total);
        }
      },
      (err) => {
        // Failure (missing / invalid file): use the primitive aircraft so the
        // site runs right away and notify main.js (friendly message).
        console.warn(
          '[viewer] Could not load the model, using placeholder.',
          err
        );
        this._onModelReady(this._buildPlaceholderAircraft(), true);
        this.cb.onError(
          '3D model not found — showing a demo aircraft. Put omniscan.glb in /public/models/.'
        );
      }
    );
  }

  _onModelReady(object, isPlaceholder) {
    this.model = object;
    this.isPlaceholder = isPlaceholder;

    // --- Apply axis-correction rotation BEFORE bounding-box normalisation -----
    // (SolidWorks Z-up → GLB Y-up typically needs x: -90°)
    if (!isPlaceholder) {
      object.rotation.copy(this.modelRotation);
      object.updateMatrixWorld(true);
    }

    // --- Normalize the model (center + scale) --------------------------------
    // Three.js TRS order: worldPos = position + scale * localPos
    // To map the bounding-box center to the world origin we need:
    //   position + scale * center = 0  =>  position = -scale * center
    if (!isPlaceholder) {
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      const TARGET_SIZE = 3;
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const s = TARGET_SIZE / maxDim;

      object.scale.setScalar(s);
      object.position.copy(center).multiplyScalar(-s);

      this._applyComponentColors(object);

      // Log the normalized bounding box so tuning bayFocus is easy
      const nBox = new THREE.Box3().setFromObject(object);
      const nSize = nBox.getSize(new THREE.Vector3());
      const nCenter = nBox.getCenter(new THREE.Vector3());
      console.log(
        '[viewer] Normalized model — center:',
        nCenter, 'size:', nSize
      );

      // Apply realistic component materials
      // (see definitions above)
      // The material assignment block runs here after the model is scaled.
    }

    this.scene.add(object);

    this._frameOverview(object);
    this._swapping = false;   // allow next swapModel() call
    this.isReady = true;
    this.cb.onProgress(1);
    this.cb.onLoaded({ isPlaceholder });

    // Fire any post-swap action (e.g. zoom to interior opening)
    if (this._pendingAfterLoad) {
      const fn = this._pendingAfterLoad;
      this._pendingAfterLoad = null;
      // Small delay so the model visually settles before animating
      setTimeout(() => fn(), 200);
    }
  }

  // --------------------------------------------------------------------
  // Realistic component coloring
  // Strategy: match mesh names from the GLB. Because CAD exports often use
  // generic names, we also log ALL mesh names to the console (grouped) so you
  // can paste the exact names into the map below for precise coloring.
  _applyComponentColors(object) {

    // ── Material palette ──────────────────────────────────────────────────────
    const mats = {
      // Structure
      fuselage:   new THREE.MeshStandardMaterial({ color: 0x2a2d35, metalness: 0.45, roughness: 0.50 }),
      wing:       new THREE.MeshStandardMaterial({ color: 0x1e2030, metalness: 0.55, roughness: 0.45 }),
      structural: new THREE.MeshStandardMaterial({ color: 0x3c3f4a, metalness: 0.60, roughness: 0.40 }),

      // Propulsion
      rotor:      new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.90, roughness: 0.18 }),
      motor:      new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.85, roughness: 0.25 }),
      shaft:      new THREE.MeshStandardMaterial({ color: 0xb0b8c1, metalness: 0.95, roughness: 0.10 }),

      // Electronics — PCBs
      pcb:        new THREE.MeshStandardMaterial({ color: 0x1a4731, metalness: 0.10, roughness: 0.80 }), // dark green FR4
      pcbCopper:  new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.90, roughness: 0.30 }), // copper traces
      chip:       new THREE.MeshStandardMaterial({ color: 0x111318, metalness: 0.20, roughness: 0.70 }), // IC packages
      connector:  new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.80, roughness: 0.25 }), // gold-plated pins
      heatsink:   new THREE.MeshStandardMaterial({ color: 0x6b7a8d, metalness: 0.75, roughness: 0.35 }),

      // Power
      battery:    new THREE.MeshStandardMaterial({ color: 0x1f3a5f, metalness: 0.20, roughness: 0.75 }), // LiPo blue-grey
      wire:       new THREE.MeshStandardMaterial({ color: 0xcc2200, metalness: 0.05, roughness: 0.90 }), // red insulation
      wireBlack:  new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.05, roughness: 0.90 }),
      esc:        new THREE.MeshStandardMaterial({ color: 0x2d1b69, metalness: 0.15, roughness: 0.80 }), // purple ESC

      // Sensors / payload
      camera:     new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.50, roughness: 0.30 }),
      sensor:     new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.30, roughness: 0.65 }),
      lens:       new THREE.MeshStandardMaterial({ color: 0x1e3a5f, metalness: 0.05, roughness: 0.05, envMapIntensity: 2.5 }),
      antenna:    new THREE.MeshStandardMaterial({ color: 0xfafafa, metalness: 0.60, roughness: 0.20 }),

      // Enclosures / covers
      cover:      new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.20, roughness: 0.70 }),
      rubber:     new THREE.MeshStandardMaterial({ color: 0x1c1c1c, metalness: 0.00, roughness: 0.95 }),
      foam:       new THREE.MeshStandardMaterial({ color: 0xf5c048, metalness: 0.00, roughness: 1.00 }), // yellow foam

      // Fasteners
      screw:      new THREE.MeshStandardMaterial({ color: 0xa0a9b0, metalness: 0.95, roughness: 0.15 }),
    };

    // All materials share the same envMap intensity (set via scene.environment)
    Object.values(mats).forEach(m => { m.envMapIntensity = m.envMapIntensity ?? 1.2; });

    // ── Name → keyword map ────────────────────────────────────────────────────
    // Order matters: first match wins. Add exact mesh names at the top for
    // precision (paste them from the console log below).
    const rules = [
      // Exact-name overrides — based on real mesh names found via [MESH NAMES] log
      { exact: 'PICAcreta_3D', mat: mats.fuselage },   // main airframe body
      { exact: 'Cube',         mat: mats.structural },  // secondary structural part

      // Keyword rules
      { kw: ['pcb', 'board', 'circuit', 'mainboard', 'flightcontroller', 'fc'],           mat: mats.pcb },
      { kw: ['trace', 'copper', 'pad', 'track'],                                          mat: mats.pcbCopper },
      { kw: ['chip', 'ic', 'mcu', 'processor', 'microcontroller', 'imu'],                 mat: mats.chip },
      { kw: ['connector', 'plug', 'socket', 'jst', 'xt30', 'xt60', 'pin', 'header'],      mat: mats.connector },
      { kw: ['heatsink', 'heat_sink', 'cooling', 'fin'],                                  mat: mats.heatsink },
      { kw: ['battery', 'lipo', 'cell', 'accumulator'],                                   mat: mats.battery },
      { kw: ['esc', 'speedcontroller', 'speed_controller', 'speedcontrol'],               mat: mats.esc },
      { kw: ['wire', 'cable', 'harness', 'wiring'],                                       mat: mats.wire },
      { kw: ['motor', 'coil', 'stator'],                                                  mat: mats.motor },
      { kw: ['shaft', 'axle', 'driveshaft'],                                              mat: mats.shaft },
      { kw: ['rotor', 'propeller', 'blade', 'prop'],                                      mat: mats.rotor },
      { kw: ['camera', 'cam', 'gimbal'],                                                  mat: mats.camera },
      { kw: ['lens', 'optic', 'glass'],                                                   mat: mats.lens },
      { kw: ['sensor', 'lidar', 'radar', 'sonar', 'ultrasonic', 'barometer', 'gps'],      mat: mats.sensor },
      { kw: ['antenna', 'aerial', 'whip'],                                                mat: mats.antenna },
      { kw: ['screw', 'bolt', 'nut', 'fastener', 'standoff'],                             mat: mats.screw },
      { kw: ['rubber', 'grommet', 'dampener', 'damper', 'pad'],                           mat: mats.rubber },
      { kw: ['foam', 'cushion', 'insulation'],                                            mat: mats.foam },
      { kw: ['cover', 'lid', 'cap', 'hatch', 'door', 'panel'],                            mat: mats.cover },
      { kw: ['wing', 'winglet', 'aileron', 'elevon', 'flap'],                             mat: mats.wing },
      { kw: ['fuselage', 'airframe', 'body', 'hull', 'frame'],                            mat: mats.fuselage },
      { kw: ['rib', 'spar', 'stringer', 'bulkhead', 'bracket', 'mount', 'structural'],    mat: mats.structural },
    ];

    // ── Log all mesh names once (open DevTools → Console to see) ─────────────
    const meshInfo = [];
    object.traverse(child => {
      if (child.isMesh) meshInfo.push({ name: child.name, parent: child.parent?.name ?? '—' });
    });
    if (meshInfo.length) {
      console.groupCollapsed(`%c[MESH NAMES] ${meshInfo.length} meshes found — expand to see all`, 'color:#2E3192;font-weight:bold');
      console.table(meshInfo);
      console.log('Paste mesh names into the "Exact-name overrides" section of _applyComponentColors() for precise coloring.');
      console.groupEnd();
    }

    // ── Apply materials ───────────────────────────────────────────────────────
    object.traverse(child => {
      if (!child.isMesh) return;
      const n = (child.name || '').toLowerCase().replace(/[\s\-]/g, '_');
      let assigned = false;

      for (const rule of rules) {
        if (rule.exact && rule.exact.toLowerCase() === n) {
          child.material = rule.mat; assigned = true; break;
        }
        if (rule.kw && rule.kw.some(k => n.includes(k))) {
          child.material = rule.mat; assigned = true; break;
        }
      }
      if (!assigned) child.material = mats.fuselage; // fallback = charcoal

      child.castShadow = true;
      child.receiveShadow = true;
    });
  }


  /**
   * Primitive aircraft (simplified Blended Wing Body) for when the .glb is
   * missing. Just a visual marker; the real model replaces it.
   */
  _buildPlaceholderAircraft() {
    const group = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({
      color: 0x6b7a8d, // slate: reads well on the light stage
      metalness: 0.4,
      roughness: 0.45,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: 0x2e3192, // indigo (theme accent)
      metalness: 0.3,
      roughness: 0.4,
      emissive: 0x0e0f24,
    });

    // central body (flattened lifting body)
    const fuselage = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 32, 20),
      body
    );
    fuselage.scale.set(1.0, 0.32, 1.7);
    group.add(fuselage);

    // delta wings (two thin, swept prisms)
    const wingGeo = new THREE.BoxGeometry(1.7, 0.04, 0.6);
    for (const sign of [-1, 1]) {
      const wing = new THREE.Mesh(wingGeo, body);
      wing.position.set(sign * 0.95, 0, 0.1);
      wing.rotation.y = sign * 0.5;
      group.add(wing);
      // winglet
      const winglet = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.22, 0.34),
        accent
      );
      winglet.position.set(sign * 1.7, 0.1, 0.25);
      group.add(winglet);
    }

    // 4 VTOL rotors (discs) to read as "electric VTOL"
    const rotorGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.02, 24);
    const rotorPos = [
      [-0.7, 0.05, -0.5],
      [0.7, 0.05, -0.5],
      [-0.7, 0.05, 0.7],
      [0.7, 0.05, 0.7],
    ];
    for (const [x, y, z] of rotorPos) {
      const rotor = new THREE.Mesh(rotorGeo, accent);
      rotor.position.set(x, y, z);
      group.add(rotor);
    }

    return group;
  }

  // -- Camera framing -------------------------------------------------------

  /** Computes and stores the overview from the model's bounding box. */
  _frameOverview(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    this._modelCenter = center.clone();

    const radius = Math.max(size.x, size.y, size.z) * 0.5 || 1;
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const dist = (radius / Math.sin(fov / 2)) * 1.5 * (this.overviewZoom ?? 1.0);

    // camera position driven by overviewAngle so it is configurable from content.js
    this.overviewPos = new THREE.Vector3(
      center.x + dist * this.overviewAngle.x,
      center.y + dist * this.overviewAngle.y,
      center.z + dist * this.overviewAngle.z
    );
    this.overviewTarget = center.clone();

    this.camera.near = Math.max(radius / 100, 0.01);
    this.camera.far = dist * 12;
    this.camera.updateProjectionMatrix();

    // place it on the overview already (no animation)
    this.camera.position.copy(this.overviewPos);
    this.controls.target.copy(this.overviewTarget);
    this.controls.update();
  }

  /** Animates the camera to frame the payload bay and lights the hotspot. */
  focusBay(label = '') {
    if (!this.isReady) return;
    const target = this.bayFocus.clone();
    const pos = this.bayFocus.clone().add(this.bayCameraOffset);
    this._startTween(pos, target);

    if (label) this._hotspotLabelEl.textContent = label;
    this.hotspot.visible = true;
    this.hotspotEl.classList.add('is-on');
    this.controls.autoRotate = false;
  }

  /** Zoom to the interior opening (used after swapping to sem-tampa model). */
  focusInterior() {
    if (!this.isReady || !this.interiorFocus) return;
    const target = this.interiorFocus.clone();
    const pos = this.interiorFocus.clone().add(this.interiorCameraOffset);
    this._startTween(pos, target);
    this.controls.autoRotate = false;
  }

  /** Swap the loaded GLB for a different URL. afterLoad: 'interior' | null */
  swapModel(url, afterLoad) {
    if (this._swapping) return;
    this._swapping = true;
    this._pendingAfterLoad = afterLoad === 'interior' ? () => this.focusInterior() : null;

    // Remove current model from scene
    if (this.model) {
      this.scene.remove(this.model);
      this.model.traverse(child => {
        if (child.isMesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material?.dispose();
        }
      });
      this.model = null;
    }

    this.isReady = false;
    this.modelUrl = url;
    this._loadModel();
  }

  resetView() {
    if (!this.isReady) return;
    this._startTween(this.overviewPos.clone(), this.overviewTarget.clone());
    this.hotspotEl.classList.remove('is-on');
    // hide the hotspot only at the end of the animation (stays smooth)
    this._hideHotspotAfterTween = true;
    this.controls.autoRotate = true;
  }

  _startTween(toPos, toTarget) {
    this._tween = {
      fromPos: this.camera.position.clone(),
      toPos,
      fromTarget: this.controls.target.clone(),
      toTarget,
      start: performance.now(),
      dur: CAMERA_TWEEN_MS,
    };
  }

  // -- Animation loop -------------------------------------------------------

  _animate() {
    this._raf = requestAnimationFrame(this._animate);

    // advance the camera animation, if active and not interrupted
    if (this._tween) {
      const t = Math.min(
        1,
        (performance.now() - this._tween.start) / this._tween.dur
      );
      const e = easeInOutCubic(t);
      this.camera.position.lerpVectors(
        this._tween.fromPos,
        this._tween.toPos,
        e
      );
      this.controls.target.lerpVectors(
        this._tween.fromTarget,
        this._tween.toTarget,
        e
      );
      if (t >= 1) {
        this._tween = null;
        if (this._hideHotspotAfterTween) {
          this.hotspot.visible = false;
          this._hideHotspotAfterTween = false;
        }
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }

  // -- Resize / dimensions --------------------------------------------------

  _w() {
    return this.container.clientWidth || 1;
  }
  _h() {
    return this.container.clientHeight || 1;
  }

  _bindResize() {
    this._onResize = () => {
      const w = this._w();
      const h = this._h();
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setSize(w, h);
      this.labelRenderer.setSize(w, h);
    };
    // ResizeObserver handles layout changes (not just window)
    this._ro = new ResizeObserver(this._onResize);
    this._ro.observe(this.container);
    window.addEventListener('resize', this._onResize);
  }

  // -- Cleanup --------------------------------------------------------------

  dispose() {
    cancelAnimationFrame(this._raf);
    this._ro?.disconnect();
    window.removeEventListener('resize', this._onResize);
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labelRenderer.domElement.remove();
  }
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
