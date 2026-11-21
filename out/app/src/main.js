// main.js — wires the VICE GRID editor: load photos from your own machine,
// fill the panel grid, position and zoom each panel's photo, type the caption,
// tune the look, and export the cover as a PNG. A ?shot= query instead sets up
// a fixed scene for a screenshot (./shots.js).

import { drawCover, panelGrid } from './cover.js';
import { runShot } from './shots.js';

export const SIZES = [
  { name: 'Square', w: 1080, h: 1080 },
  { name: 'Portrait', w: 1080, h: 1350 },
  { name: 'Landscape', w: 1920, h: 1080 },
];

const state = {
  sizeIndex: 0,
  caption: 'SUNSET HEIST',
  panels: [],
  photos: [],
  selected: 0,
  lastPhoto: -1,
  style: { grain: 0.6, grade: 0.7, scan: 0.5 },
};

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const status = document.getElementById('status');
const photoInput = document.getElementById('photo');
const photoList = document.getElementById('photo-list');
const panelChips = document.getElementById('panel-chips');
const zoomInput = document.getElementById('zoom');
const zoomLabel = document.getElementById('zoom-label');
const sizeBar = document.getElementById('size-bar');
const exportButton = document.getElementById('export');

function size() {
  return SIZES[state.sizeIndex];
}

function initPanels(carry) {
  const next = panelGrid(size().w, size().h).count;
  const panels = [];
  for (let i = 0; i < next; i++) {
    const prev = carry ? carry[i] : null;
    panels.push(prev ? { ...prev } : { img: null, zoom: 1, ox: 0, oy: 0 });
  }
  state.panels = panels;
  if (state.selected >= next) state.selected = 0;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function render() {
  const s = size();
  canvas.width = s.w;
  canvas.height = s.h;
  canvas.style.aspectRatio = `${s.w} / ${s.h}`;
  drawCover(canvas, state);
  renderPanelChips();
  renderPhotoList();
  const panel = state.panels[state.selected];
  zoomInput.value = String(Math.round((panel ? panel.zoom : 1) * 100));
  zoomLabel.textContent = `${Math.round((panel ? panel.zoom : 1) * 100)}%`;
}

function renderPanelChips() {
  panelChips.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip panel-chip${i === state.selected ? ' on' : ''}${panel.img ? ' filled' : ''}`;
    chip.textContent = String(i + 1);
    chip.title = panel.img ? `Panel ${i + 1}` : `Panel ${i + 1} (empty)`;
    chip.addEventListener('click', () => {
      state.selected = i;
      render();
    });
    panelChips.appendChild(chip);
  });
}

function renderPhotoList() {
  photoList.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `chip photo-chip${i === state.lastPhoto ? ' on' : ''}`;
    const thumb = document.createElement('img');
    thumb.src = photo.url;
    thumb.alt = '';
    const label = document.createElement('span');
    label.textContent = photo.name;
    item.append(thumb, label);
    item.addEventListener('click', () => {
      state.lastPhoto = i;
      assignPhoto(i);
    });
    photoList.appendChild(item);
  });
  const fill = document.getElementById('fill-all');
  fill.disabled = state.lastPhoto < 0;
}

function assignPhoto(photoIndex) {
  const photo = state.photos[photoIndex];
  if (!photo) return;
  const panel = state.panels[state.selected];
  if (panel) {
    panel.img = photo.img;
    panel.zoom = 1;
    panel.ox = 0;
    panel.oy = 0;
  }
  status.textContent = `${photo.name} in panel ${state.selected + 1}`;
  render();
}

function fillAllPanels() {
  const photo = state.photos[state.lastPhoto];
  if (!photo) return;
  for (const panel of state.panels) {
    panel.img = photo.img;
    panel.zoom = 1;
    panel.ox = 0;
    panel.oy = 0;
  }
  status.textContent = `${photo.name} fills every panel`;
  render();
}

async function onPhotosPicked(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      state.photos.push({ name: file.name.replace(/\.[^.]+$/, ''), url, img });
      state.lastPhoto = state.photos.length - 1;
    } catch {
      URL.revokeObjectURL(url);
    }
  }
  if (state.photos.length) {
    // first photo fills the whole grid, so one pick is enough for a full poster
    if (state.panels.every((p) => !p.img)) fillAllPanels();
    else assignPhoto(state.lastPhoto);
  }
  render();
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  return { x, y };
}

function panelAt(point) {
  const s = size();
  const margin = Math.round(s.w * 0.05);
  const { cols, rows } = panelGrid(s.w, s.h);
  const gap = Math.max(6, Math.round(s.w * 0.012));
  const gridBottom = Math.round(s.h * 0.615);
  const pw = Math.floor((s.w - 2 * margin - gap * (cols - 1)) / cols);
  const ph = Math.floor((gridBottom - margin - gap * (rows - 1)) / rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = margin + c * (pw + gap);
      const y = margin + r * (ph + gap);
      if (point.x >= x && point.x <= x + pw && point.y >= y && point.y <= y + ph) {
        return r * cols + c;
      }
    }
  }
  return -1;
}

function setupCanvasInteraction() {
  let dragging = false;
  let dragPanel = -1;
  let start = null;

  canvas.addEventListener('pointerdown', (event) => {
    const point = canvasPoint(event);
    const index = panelAt(point);
    if (index < 0) return;
    state.selected = index;
    dragging = true;
    dragPanel = index;
    start = { x: event.clientX, y: event.clientY, ox: state.panels[index].ox, oy: state.panels[index].oy };
    canvas.setPointerCapture(event.pointerId);
    render();
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!dragging || dragPanel < 0 || !start) return;
    const panel = state.panels[dragPanel];
    if (!panel || !panel.img) return;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const dx = (event.clientX - start.x) * scale;
    const dy = (event.clientY - start.y) * scale;
    // convert pixel movement into the panel's normalized offset range
    const s = size();
    const margin = Math.round(s.w * 0.05);
    const { cols, rows } = panelGrid(s.w, s.h);
    const gap = Math.max(6, Math.round(s.w * 0.012));
    const gridBottom = Math.round(s.h * 0.615);
    const pw = Math.floor((s.w - 2 * margin - gap * (cols - 1)) / cols);
    const ph = Math.floor((gridBottom - margin - gap * (rows - 1)) / rows);
    const b = Math.max(3, Math.round(pw * 0.017));
    const iw = pw - 2 * b;
    const ih = ph - 2 * b;
    const fit = Math.max(iw / panel.img.naturalWidth, ih / panel.img.naturalHeight) * panel.zoom;
    const overX = Math.max(0, panel.img.naturalWidth * fit - iw);
    const overY = Math.max(0, panel.img.naturalHeight * fit - ih);
    if (overX > 0) panel.ox = clamp(start.ox + (dx * 2) / overX, -1, 1);
    if (overY > 0) panel.oy = clamp(start.oy + (dy * 2) / overY, -1, 1);
    render();
  });

  canvas.addEventListener('pointerup', () => {
    dragging = false;
    dragPanel = -1;
    start = null;
  });

  canvas.addEventListener('wheel', (event) => {
    const panel = state.panels[state.selected];
    if (!panel || !panel.img) return;
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.07 : 0.93;
    panel.zoom = clamp(panel.zoom * factor, 1, 5);
    render();
  }, { passive: false });
}

function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

function setupControls() {
  photoInput.addEventListener('change', (event) => {
    const input = event.target;
    if (input.files && input.files.length) onPhotosPicked([...input.files]);
    input.value = '';
  });
  document.getElementById('fill-all').addEventListener('click', fillAllPanels);
  document.getElementById('clear-panel').addEventListener('click', () => {
    const panel = state.panels[state.selected];
    if (panel) {
      panel.img = null;
      panel.zoom = 1;
      panel.ox = 0;
      panel.oy = 0;
      status.textContent = `Panel ${state.selected + 1} cleared`;
      render();
    }
  });
  zoomInput.addEventListener('input', () => {
    const panel = state.panels[state.selected];
    if (!panel) return;
    panel.zoom = clamp(Number(zoomInput.value) / 100, 1, 5);
    zoomLabel.textContent = `${zoomInput.value}%`;
    render();
  });
  captionInput.addEventListener('input', () => {
    state.caption = captionInput.value;
    render();
  });
  for (const slider of ['grain', 'grade', 'scan']) {
    const input = document.getElementById(slider);
    const label = document.getElementById(`${slider}-label`);
    input.addEventListener('input', () => {
      state.style[slider] = Number(input.value) / 100;
      label.textContent = `${input.value}%`;
      render();
    });
  }
  sizeBar.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-size]');
    if (!button) return;
    state.sizeIndex = Number(button.dataset.size);
    [...sizeBar.children].forEach((child, i) => {
      child.classList.toggle('on', i === state.sizeIndex);
    });
    initPanels(state.panels);
    status.textContent = `${size().name} ${size().w} x ${size().h}`;
    render();
  });
  exportButton.addEventListener('click', exportPng);
}

function exportPng() {
  const s = size();
  const offscreen = document.createElement('canvas');
  offscreen.width = s.w;
  offscreen.height = s.h;
  drawCover(offscreen, state);
  offscreen.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-grid-${s.w}x${s.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    status.textContent = `Saved ${a.download}`;
  }, 'image/png');
}

/** Applies a preset scene (used by the screenshot deep links). */
export function applyPreset({ imgs, caption, w, h }) {
  const match = SIZES.findIndex((s) => s.w === w && s.h === h);
  state.sizeIndex = match >= 0 ? match : 0;
  state.caption = caption;
  captionInput.value = caption;
  initPanels(null);
  state.panels.forEach((panel, i) => {
    panel.img = imgs[i % imgs.length] || null;
    panel.zoom = 1;
    panel.ox = 0;
    panel.oy = 0;
  });
  state.selected = 0;
  render();
}

function initEditor() {
  initPanels(null);
  setupControls();
  setupCanvasInteraction();
  render();
}

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  initPanels(null);
  setupControls();
  setupCanvasInteraction();
  runShot(shot, params, { loadImage, applyPreset });
} else {
  initEditor();
}
