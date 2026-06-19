Put the aircraft's 3D model here:

  omniscan.glb   -> the site's only 3D model (the Omniscan airframe)

While it's missing, the viewer shows a primitive demo aircraft (simplified
Blended Wing Body), so the site runs right away.

Notes:
  - Binary glTF format (.glb). Supports Draco compression (the DRACOLoader is
    already set up in src/viewer.js, with the decoder via the gstatic CDN).
  - To change the model path, edit src/content.js > viewer.modelo.
  - After dropping the real model, tune bayFocus / bayCameraOffset in
    src/content.js (see the main README, section "Tuning the payload bay").
