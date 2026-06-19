Put the site's image files here. Exact names expected by the code
(see src/content.js):

  render-omniscan.png   -> aircraft render used in the hero (foreground)
  hero-drone.png        -> faint drone image behind the hero (also the video poster)
  payload-flora.jpg     -> photo of the multispectral sensor (Figure 3.7 of the report)
  payload-magno.jpg     -> photo of the magnetometer          (Figure 3.8)
  payload-termico.jpg   -> photo of the FLIR thermal camera   (Figure 3.9)

While they're missing:
  - the hero shows a placeholder (the missing image is hidden automatically);
  - the payload photos show as grey boxes with the sensor name.

To change names/paths, edit src/content.js (nothing is hardcoded in the HTML).
