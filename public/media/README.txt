Put the flight video here (optional):

  voo-omniscan.mp4   -> local flight video shown below the 3D viewer

How it works (configured in src/content.js > video):
  - Leave  video.src = ''            -> shows the "Flight video coming soon" placeholder.
  - Local: video.tipo = 'local',  video.src = '/media/voo-omniscan.mp4'
  - YouTube: video.tipo = 'youtube', video.src = 'https://www.youtube.com/embed/XXXXXXXX'
    (use the EMBED url, not the normal watch?v= link)

The poster image defaults to /assets/hero-drone.png (video.poster).
