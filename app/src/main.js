// Cover Snap — GTA-style cover art maker.
// Draws a Vice City sunset scene on canvas: teal-to-orange gradient sky, retro
// sun, palm silhouettes, neon skyline, a grid of white-bordered photo panels,
// bold uppercase caption lettering, then a split-tone grade, scanlines and a
// vignette on top. ES module; no network, no dependencies.

const SAMPLES = ['./samples/boulevard.jpg', './samples/pier.jpg'];

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');

const state = {
  photos: [],       // HTMLImageElement / canvas-backed draws
  caption: 'VICE CITY',
  w: 1080,
  h: 1080,
};

// ---------------------------------------------------------------------------
// URL shot params
// ---------------------------------------------------------------------------
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const shotCaption = params.get('caption');
const shotPhoto = params.get('photo'); // 'boulevard' | 'pier' | index

const SHOTS = new Set(['cover', 'editor', 'square', 'portrait']);

function applyShotMode() {
  if (!SHOTS.has(shot)) return;
  document.body.classList.add(`shot-${shot}`);
  if (shot === 'square') { state.w = 1080; state.h = 1080; }
  if (shot === 'portrait') { state.w = 1080; state.h = 1350; }
  if (shot === 'cover') { state.w = 1080; state.h = 1080; }
  if (shotCaption != null) state.caption = shotCaption;
}

// ---------------------------------------------------------------------------
// Image loading
// ---------------------------------------------------------------------------
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadSamples() {
  let list = SAMPLES;
  if (shotPhoto === 'boulevard') list = ['./samples/boulevard.jpg'];
  else if (shotPhoto === 'pier') list = ['./samples/pier.jpg'];
  const imgs = (await Promise.all(list.map(loadImage))).filter(Boolean);
  if (imgs.length) {
    state.photos = imgs;
    updatePhotoCount();
    render();
  }
}

function updatePhotoCount() {
  const el = document.getElementById('photo-count');
  if (!el) return;
  el.textContent = state.photos.length
    ? `${state.photos.length} photo${state.photos.length > 1 ? 's' : ''} loaded.`
    : 'No photos loaded.';
}

// ---------------------------------------------------------------------------
// Scene drawing
// ---------------------------------------------------------------------------
function drawBackground(c, w, h) {
  // Vice City sunset: deep teal sky bleeding into orange/pink at the horizon.
  const sky = c.createLinearGradient(0, 0, 0, h * 0.78);
  sky.addColorStop(0.00, '#04202b');
  sky.addColorStop(0.35, '#0e5a63');
  sky.addColorStop(0.62, '#e86a3c');
  sky.addColorStop(0.80, '#ff9d4d');
  sky.addColorStop(1.00, '#ffd28a');
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);

  // Retro sun with horizontal slice gaps.
  const sx = w * 0.5, sy = h * 0.46, r = Math.min(w, h) * 0.19;
  const sun = c.createLinearGradient(0, sy - r, 0, sy + r);
  sun.addColorStop(0, '#fff3b0');
  sun.addColorStop(0.5, '#ffd23f');
  sun.addColorStop(1, '#ff7a3d');
  c.save();
  c.beginPath();
  c.arc(sx, sy, r, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = sun;
  c.fillRect(sx - r, sy - r, r * 2, r * 2);
  // slices cut from the bottom half, GTA Vice City style
  c.fillStyle = sky;
  const slices = 7;
  for (let i = 0; i < slices; i++) {
    const t = 0.52 + (i / slices) * 0.48;
    const y = sy - r + t * r * 2;
    const sh = (r * 2) * (0.018 + i * 0.012);
    c.fillRect(sx - r, y, r * 2, sh);
  }
  c.restore();

  // sun glow
  const glow = c.createRadialGradient(sx, sy, r * 0.4, sx, sy, r * 2.4);
  glow.addColorStop(0, 'rgba(255, 190, 90, 0.35)');
  glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
  c.fillStyle = glow;
  c.fillRect(0, 0, w, h);
}

function drawPalm(c, x, baseY, scale, color) {
  // A palm silhouette: curved trunk plus a fan of fronds.
  c.save();
  c.translate(x, baseY);
  c.scale(scale, scale);
  c.strokeStyle = color;
  c.fillStyle = color;
  c.lineWidth = 7;
  c.lineCap = 'round';

  const trunkH = 150;
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(-14, -trunkH * 0.55, 4, -trunkH);
  c.stroke();

  const top = { x: 4, y: -trunkH };
  const fronds = 7;
  for (let i = 0; i < fronds; i++) {
    const a = Math.PI * (0.15 + (i / (fronds - 1)) * 0.7) - Math.PI;
    const len = 62 + (i % 2) * 14;
    c.beginPath();
    c.moveTo(top.x, top.y);
    c.quadraticCurveTo(
      top.x + Math.cos(a) * len * 0.55, top.y + Math.sin(a) * len * 0.5 - 8,
      top.x + Math.cos(a) * len, top.y + Math.sin(a) * len * 0.72 + 10,
    );
    c.stroke();
  }
  // small coconuts
  c.beginPath();
  c.arc(top.x - 6, top.y + 8, 5, 0, Math.PI * 2);
  c.arc(top.x + 8, top.y + 10, 5, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function drawSkyline(c, w, h) {
  // Neon-lit downtown silhouette across the horizon with lit windows.
  const horizon = h * 0.60;
  const buildings = 14;
  const bw = w / buildings;
  const seed = 42;
  let s = seed;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };

  for (let i = 0; i < buildings; i++) {
    const bh = (h * 0.06) + rnd() * (h * 0.16);
    const x = i * bw;
    const y = horizon - bh;
    c.fillStyle = '#0a1a22';
    c.fillRect(x, y, bw - 2, bh + h * 0.2);
    // rim light
    c.fillStyle = 'rgba(255, 80, 140, 0.55)';
    c.fillRect(x, y, bw - 2, 2);
    // windows
    c.fillStyle = 'rgba(255, 214, 120, 0.75)';
    const cols = 3, rows = Math.max(2, Math.floor(bh / 22));
    for (let rr = 0; rr < rows; rr++) {
      for (let cc = 0; cc < cols; cc++) {
        if (rnd() < 0.45) continue;
        c.fillRect(x + 6 + cc * (bw - 14) / cols, y + 8 + rr * 18, 5, 7);
      }
    }
  }
  // ground band
  const ground = c.createLinearGradient(0, horizon, 0, h);
  ground.addColorStop(0, '#12333c');
  ground.addColorStop(1, '#061218');
  c.fillStyle = ground;
  c.fillRect(0, horizon + h * 0.18, w, h);

  // palms flanking the scene
  const palmColor = '#071016';
  drawPalm(c, w * 0.08, h * 0.80, Math.min(w, h) / 420, palmColor);
  drawPalm(c, w * 0.93, h * 0.78, Math.min(w, h) / 380, palmColor);
  drawPalm(c, w * 0.20, h * 0.86, Math.min(w, h) / 560, palmColor);
}

// ---------------------------------------------------------------------------
// Photo grid
// ---------------------------------------------------------------------------
function layoutPhotos(n, w, h) {
  // Choose a grid that fits the frame; GTA covers stack 3 columns.
  const cols = n <= 1 ? 1 : n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const pad = w * 0.045;
  const areaW = w - pad * 2;
  const areaH = h * 0.52;
  const gap = w * 0.02;
  const cw = (areaW - gap * (cols - 1)) / cols;
  const ch = (areaH - gap * (rows - 1)) / rows;
  const cells = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols), c = i % cols;
    cells.push({
      x: pad + c * (cw + gap),
      y: h * 0.30 + r * (ch + gap),
      w: cw, h: ch,
    });
  }
  return cells;
}

function drawPhoto(c, img, cell, radius) {
  c.save();
  // white border, rounded rect (GTA cover panel look)
  const b = cell.w * 0.028;
  c.beginPath();
  c.roundRect(cell.x, cell.y, cell.w, cell.h, radius);
  c.fillStyle = '#f5f7fa';
  c.fill();
  c.clip();

  // cover-fit the image inside the inner rect
  const ix = cell.x + b, iy = cell.y + b;
  const iw = cell.w - b * 2, ih = cell.h - b * 2;
  if (img) {
    const ir = img.width / img.height;
    const cr = iw / ih;
    let dw, dh;
    if (ir > cr) { dh = ih; dw = ih * ir; } else { dw = iw; dh = iw / ir; }
    c.drawImage(img, ix + (iw - dw) / 2, iy + (ih - dh) / 2, dw, dh);
  } else {
    c.fillStyle = '#22293a';
    c.fillRect(ix, iy, iw, ih);
  }
  c.restore();

  // subtle inner shadow line
  c.save();
  c.beginPath();
  c.roundRect(cell.x, cell.y, cell.w, cell.h, radius);
  c.strokeStyle = 'rgba(0,0,0,0.25)';
  c.lineWidth = 2;
  c.stroke();
  c.restore();
}

// ---------------------------------------------------------------------------
// Caption
// ---------------------------------------------------------------------------
function drawCaption(c, w, h, text) {
  if (!text) return;
  const letters = text.toUpperCase();
  const base = Math.max(w, h) * 0.105;
  const maxWidth = w * 0.9;
  let fontSize = base;
  c.save();
  c.font = `900 ${fontSize}px "Arial Black", "Arial", sans-serif`;
  while (c.measureText(letters).width > maxWidth && fontSize > 10) {
    fontSize -= 2;
    c.font = `900 ${fontSize}px "Arial Black", "Arial", sans-serif`;
  }
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const cx = w / 2;
  const cy = h * 0.845;

  // shadow
  c.fillStyle = 'rgba(0,0,0,0.55)';
  c.fillText(letters, cx + fontSize * 0.05, cy + fontSize * 0.07);

  // stroke
  c.lineWidth = fontSize * 0.11;
  c.lineJoin = 'round';
  c.strokeStyle = '#0a0f16';
  c.strokeText(letters, cx, cy);

  // fill: neon pink → amber gradient
  const grad = c.createLinearGradient(0, cy - fontSize / 2, 0, cy + fontSize / 2);
  grad.addColorStop(0, '#ff5fa2');
  grad.addColorStop(0.5, '#ff2d95');
  grad.addColorStop(1, '#ffb347');
  c.fillStyle = grad;
  c.fillText(letters, cx, cy);
  c.restore();
}

// ---------------------------------------------------------------------------
// Grade: split-tone, scanlines, vignette
// ---------------------------------------------------------------------------
function drawGrade(c, w, h) {
  c.save();

  // split-tone: teal into shadows, warm into highlights
  c.globalCompositeOperation = 'soft-light';
  const cool = c.createLinearGradient(0, 0, 0, h);
  cool.addColorStop(0, 'rgba(0, 120, 160, 0.55)');
  cool.addColorStop(0.55, 'rgba(0, 120, 160, 0.08)');
  cool.addColorStop(1, 'rgba(255, 120, 40, 0.0)');
  c.fillStyle = cool;
  c.fillRect(0, 0, w, h);

  const warm = c.createLinearGradient(0, h * 0.4, 0, h);
  warm.addColorStop(0, 'rgba(255, 140, 60, 0.0)');
  warm.addColorStop(1, 'rgba(255, 140, 60, 0.40)');
  c.fillStyle = warm;
  c.fillRect(0, 0, w, h);

  // scanlines
  c.globalCompositeOperation = 'multiply';
  const step = Math.max(2, Math.round(h / 540));
  for (let y = 0; y < h; y += step * 2) {
    c.fillStyle = 'rgba(0, 0, 0, 0.10)';
    c.fillRect(0, y, w, step);
  }

  // vignette
  c.globalCompositeOperation = 'source-over';
  const vig = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.34, w / 2, h / 2, Math.max(w, h) * 0.78);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.42)');
  c.fillStyle = vig;
  c.fillRect(0, 0, w, h);

  c.restore();
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function render() {
  const { w, h } = state;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.clearRect(0, 0, w, h);

  drawBackground(ctx, w, h);
  drawSkyline(ctx, w, h);

  const cells = layoutPhotos(state.photos.length, w, h);
  const radius = w * 0.018;
  state.photos.forEach((img, i) => drawPhoto(ctx, img, cells[i], radius));

  drawCaption(ctx, w, h, state.caption);
  drawGrade(ctx, w, h);
}

// ---------------------------------------------------------------------------
// Editor wiring
// ---------------------------------------------------------------------------
function wireEditor() {
  const input = document.getElementById('photo-input');
  const sampleBtn = document.getElementById('sample-btn');
  const captionEl = document.getElementById('caption');
  const sizeBtns = document.getElementById('size-buttons');
  const exportBtn = document.getElementById('export-btn');

  if (input) {
    input.addEventListener('change', () => {
      const files = Array.from(input.files || []);
      files.slice(0, 9).forEach((file) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { state.photos.push(img); updatePhotoCount(); render(); };
        img.src = url;
      });
    });
  }
  if (sampleBtn) sampleBtn.addEventListener('click', loadSamples);

  if (captionEl) {
    captionEl.value = state.caption;
    captionEl.addEventListener('input', () => {
      state.caption = captionEl.value;
      render();
    });
  }

  if (sizeBtns) {
    sizeBtns.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-w]');
      if (!btn) return;
      for (const b of sizeBtns.querySelectorAll('button')) b.classList.remove('active');
      btn.classList.add('active');
      state.w = Number(btn.dataset.w);
      state.h = Number(btn.dataset.h);
      render();
    });
  }

  if (exportBtn) exportBtn.addEventListener('click', exportCover);
}

function exportCover() {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover-${state.w}x${state.h}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png');
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
applyShotMode();
wireEditor();
render();

if (shot === 'cover' || shot === 'square' || shot === 'portrait') {
  loadSamples().then(() => render());
}

export { render, exportCover, state };
