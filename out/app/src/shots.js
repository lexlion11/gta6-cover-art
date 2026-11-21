// Fixed scenes for screenshots: ?shot=editor opens the app with a sample photo
// loaded; ?shot=cover shows the finished cover alone, full window. `photo` picks
// the sample (samples/<photo>.jpg, or "both"), `caption` the words, and w/h the
// post size. window.__shotReady is set once the cover has painted.

export async function runShot(shot, query, app) {
  const which = query.get('photo') ?? 'pier';
  const names = which === 'both' ? ['pier', 'boulevard'] : [which];
  const imgs = [];
  for (const name of names) {
    imgs.push(await app.loadImage(`samples/${name}.jpg`));
  }
  const w = Number(query.get('w')) || 1080;
  const h = Number(query.get('h')) || 1080;
  if (shot === 'cover') document.body.classList.add('shot-cover');
  app.applyPreset({ imgs, caption: query.get('caption') ?? 'SUNSET HEIST', w, h });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
