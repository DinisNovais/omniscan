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

    const rim = new THREE.DirectionalLight(0x2bb3a8, 0.35); // accent back-light
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
    this.scene.add(object);

    this._frameOverview(object);
    this.isReady = true;
    this.cb.onProgress(1);
    this.cb.onLoaded({ isPlaceholder });
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
      color: 0x0e7c74, // teal (theme accent)
      metalness: 0.3,
      roughness: 0.4,
      emissive: 0x05231f,
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
    const dist = (radius / Math.sin(fov / 2)) * 1.5;

    // camera slightly above and in front, 3/4 view
    this.overviewPos = new THREE.Vector3(
      center.x + dist * 0.55,
      center.y + dist * 0.42,
      center.z + dist * 0.9
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

  /** Returns the camera to the overview and hides the hotspot. */
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
