// cover.js — VICE GRID's poster art engine.
// Draws the whole cover onto a canvas 2D context: a Vice-style sunset sky with a
// low sun, palm and skyline silhouettes, a white-bordered grid of photo panels,
// bold uppercase caption lettering, then colour grade, scanlines and film grain
// over everything. Pure canvas drawing, no network, no external assets.

const FONT_STACK = '"Arial Black", "Arial Bold", Impact, "DejaVu Sans", "Liberation Sans", sans-serif';

/** Panel grid shape for a canvas of the given size: portrait 2x3, landscape 4x2, square 3x2. */
export function panelGrid(width, height) {
  const portrait = height > width;
  const landscape = width > height;
  const cols = portrait ? 2 : landscape ? 4 : 3;
  const rows = portrait ? 3 : 2;
  return { cols, rows, count: cols * rows };
}

/** Every panel rectangle in reading order, plus the horizon band and margins the caption lives in. */
export function panelRects(width, height) {
  const { cols, rows } = panelGrid(width, height);
  const margin = Math.round(width * 0.05);
  const gap = Math.max(6, Math.round(width * 0.012));
  const top = margin;
  const gridBottom = Math.round(height * 0.615);
  const bandBottom = Math.round(height * 0.815);
  const panelW = Math.floor((width - 2 * margin - gap * (cols - 1)) / cols);
  const panelH = Math.floor((gridBottom - top - gap * (rows - 1)) / rows);
  const rects = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push({ x: margin + c * (panelW + gap), y: top + r * (panelH + gap), w: panelW, h: panelH });
    }
  }
  return { rects, cols, rows, margin, gap, gridBottom, bandBottom };
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** The sunset sky: deep teal up top through purple and pink to a hot orange haze. */
function drawSky(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#0b2a4c');
  sky.addColorStop(0.22, '#155e7c');
  sky.addColorStop(0.45, '#7a2c8e');
  sky.addColorStop(0.65, '#d63f86');
  sky.addColorStop(0.83, '#ff8b3d');
  sky.addColorStop(1, '#ffd28a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
}

/** A low sun sitting on the horizon, with soft light streaks below it. */
function drawSun(ctx, w, h, geo) {
  const bandH = geo.bandBottom - geo.gridBottom;
  const cx = w / 2;
  const cy = geo.gridBottom + bandH * 0.44;
  const r = w * 0.145;
  const sun = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
  sun.addColorStop(0, 'rgba(255, 250, 224, 0.98)');
  sun.addColorStop(0.42, 'rgba(255, 226, 122, 0.92)');
  sun.addColorStop(0.75, 'rgba(255, 157, 77, 0.55)');
  sun.addColorStop(1, 'rgba(255, 120, 60, 0)');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // horizontal light reflections streaking out under the sun
  ctx.save();
  ctx.translate(cx, cy + r * 0.42);
  const streaks = [
    { y: 0, wd: w * 0.34, ht: r * 0.16, a: 0.22 },
    { y: r * 0.34, wd: w * 0.22, ht: r * 0.12, a: 0.14 },
    { y: r * 0.62, wd: w * 0.12, ht: r * 0.1, a: 0.1 },
  ];
  for (const s of streaks) {
    ctx.fillStyle = `rgba(255, 214, 150, ${s.a})`;
    roundRectPath(ctx, -s.wd / 2, s.y, s.wd, s.ht, s.ht / 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A dark city skyline strip along the bottom of the horizon band. */
function drawSkyline(ctx, w, h, geo) {
  const stripH = Math.max(30, h * 0.058);
  const top = geo.bandBottom - stripH;
  ctx.fillStyle = 'rgba(24, 8, 38, 0.94)';
  ctx.fillRect(0, top, w, stripH + 2);
  // varied rooftops along the strip
  const step = w / 26;
  for (let i = 0; i < 26; i++) {
    const seed = (i * 73 + 37) % 100;
    const bh = stripH * (0.25 + (seed / 100) * 0.75);
    const bw = step * (0.55 + ((seed * 13) % 40) / 100);
    const bx = i * step + step * 0.2;
    ctx.fillStyle = 'rgba(24, 8, 38, 0.94)';
    ctx.fillRect(bx, top + (stripH - bh), bw, bh);
    if (seed % 7 === 0) {
      // a thin antenna on some rooftops
      ctx.fillRect(bx + bw * 0.45, top + (stripH - bh) - stripH * 0.35, Math.max(1, w * 0.0018), stripH * 0.35);
    }
  }
}

/** One palm tree silhouette: a curved trunk with fronds fanning out. */
function drawPalm(ctx, x, baseY, size, lean) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.rotate(lean);
  const dark = 'rgba(22, 7, 34, 0.93)';
  ctx.strokeStyle = dark;
  ctx.lineCap = 'round';
  const topX = size * 0.07;
  const topY = -size * 0.9;
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(size * 0.17, -size * 0.42, topX, topY);
  ctx.stroke();
  const fronds = 7;
  for (let i = 0; i < fronds; i++) {
    const a = -Math.PI * 0.96 + (i / (fronds - 1)) * Math.PI * 0.92;
    const len = size * (0.4 + 0.09 * (i % 2));
    ctx.lineWidth = Math.max(1.5, size * 0.048);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * len * 0.5,
      topY + Math.sin(a) * len * 0.28 - len * 0.24,
      topX + Math.cos(a) * len,
      topY + Math.sin(a) * len * 0.5 + len * 0.2,
    );
    ctx.stroke();
  }
  ctx.restore();
}

/** Two palms flanking the sun, standing on the skyline. */
function drawPalms(ctx, w, h, geo) {
  const bandH = geo.bandBottom - geo.gridBottom;
  const stripH = Math.max(30, h * 0.058);
  const baseY = geo.bandBottom - stripH * 0.15;
  const size = bandH * 0.92;
  drawPalm(ctx, w * 0.12, baseY, size, 0.14);
  drawPalm(ctx, w * 0.88, baseY, size, -0.14);
}

/** One photo panel: a white plate with rounded corners, the photo cover-fit inside it,
 *  graded teal in the shadows and orange in the highlights. */
function drawPanel(ctx, rect, panel, style, selected) {
  const border = Math.max(3, Math.round(rect.w * 0.017));
  const radius = Math.max(8, Math.round(rect.w * 0.04));
  // white plate with a soft drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(16, 4, 30, 0.5)';
  ctx.shadowBlur = rect.w * 0.05;
  ctx.shadowOffsetY = rect.w * 0.018;
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, radius);
  ctx.fillStyle = '#fdfdfd';
  ctx.fill();
  ctx.restore();
  // inner window
  const ix = rect.x + border;
  const iy = rect.y + border;
  const iw = rect.w - 2 * border;
  const ih = rect.h - 2 * border;
  ctx.save();
  roundRectPath(ctx, ix, iy, iw, ih, Math.max(2, radius - border));
  ctx.clip();
  const bg = ctx.createLinearGradient(ix, iy, ix, iy + ih);
  bg.addColorStop(0, '#231533');
  bg.addColorStop(1, '#120c22');
  ctx.fillStyle = bg;
  ctx.fillRect(ix, iy, iw, ih);
  const img = panel && panel.img;
  if (img && img.naturalWidth) {
    const scale = Math.max(iw / img.naturalWidth, ih / img.naturalHeight) * (panel.zoom || 1);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const overX = Math.max(0, dw - iw);
    const overY = Math.max(0, dh - ih);
    const dx = ix + (iw - dw) / 2 + (panel.ox || 0) * overX / 2;
    const dy = iy + (ih - dh) / 2 + (panel.oy || 0) * overY / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
    // teal shadows, orange highlights, as an overlay grade inside the panel
    const grade = ctx.createLinearGradient(ix, iy, ix, iy + ih);
    const g = style.grade;
    grade.addColorStop(0, `rgba(12, 74, 92, ${0.5 * g})`);
    grade.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    grade.addColorStop(1, `rgba(255, 126, 52, ${0.46 * g})`);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = grade;
    ctx.fillRect(ix, iy, iw, ih);
    ctx.globalCompositeOperation = 'source-over';
    // a gentle inner shade along the bottom for depth
    const shade = ctx.createLinearGradient(ix, iy + ih * 0.6, ix, iy + ih);
    shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shade.addColorStop(1, 'rgba(10, 2, 22, 0.28)');
    ctx.fillStyle = shade;
    ctx.fillRect(ix, iy, iw, ih);
  } else {
    // empty panel: a faint plus hint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    const t = Math.min(iw, ih) * 0.06;
    const cx = ix + iw / 2;
    const cy = iy + ih / 2;
    roundRectPath(ctx, cx - t / 2, cy - t * 2.1, t, t * 4.2, t / 2);
    ctx.fill();
    roundRectPath(ctx, cx - t * 2.1, cy - t / 2, t * 4.2, t, t / 2);
    ctx.fill();
  }
  ctx.restore();
  if (selected) {
    // the editor's selection outline
    ctx.save();
    ctx.setLineDash([rect.w * 0.05, rect.w * 0.03]);
    ctx.lineWidth = Math.max(2, rect.w * 0.012);
    ctx.strokeStyle = '#ff2d93';
    roundRectPath(ctx, rect.x - 4, rect.y - 4, rect.w + 8, rect.h + 8, radius + 4);
    ctx.stroke();
    ctx.restore();
  }
}

/** Splits the caption into lines that fit: one line preferred, shrinking the
 *  lettering first; two lines only when one cannot fit at a sensible floor. */
function captionLines(ctx, text, start, maxWidth, maxHeight) {
  const floor = start * 0.55;
  const setFont = (s) => {
    ctx.font = `900 ${s}px ${FONT_STACK}`;
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = `${Math.max(1, Math.round(s * 0.02))}px`;
  };
  let s = start;
  while (s > floor) {
    setFont(s);
    if (ctx.measureText(text).width <= maxWidth && s * 1.12 <= maxHeight) return { lines: [text], size: s };
    s -= Math.max(2, s * 0.06);
  }
  const words = text.split(' ');
  if (words.length > 1) {
    const mid = Math.ceil(words.length / 2);
    const halves = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
    s = Math.min(start, maxHeight / 2.24);
    while (s > floor * 0.7) {
      setFont(s);
      if (halves.every((ln) => ctx.measureText(ln).width <= maxWidth)) return { lines: halves, size: s };
      s -= Math.max(2, s * 0.06);
    }
  }
  setFont(floor);
  return { lines: [text], size: floor };
}

/** The bold caption lettering across the foot of the poster. */
function drawCaption(ctx, w, h, geo, caption) {
  const text = (caption || '').trim().toUpperCase();
  if (!text) return;
  const maxWidth = w * 0.9;
  const zoneH = h - geo.bandBottom - geo.margin * 0.4;
  const start = Math.min(w * 0.125, h * 0.16);
  const fit = captionLines(ctx, text, start, maxWidth, zoneH);
  const { lines, size } = fit;
  const lineH = size * 1.12;
  const cx = w / 2;
  const cy = h * 0.895;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  // extruded dark base with a soft shadow
  ctx.lineWidth = size * 0.15;
  ctx.strokeStyle = '#140822';
  ctx.shadowColor = 'rgba(8, 0, 20, 0.65)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.05;
  lines.forEach((ln, i) => {
    const y = cy + (i - (lines.length - 1) / 2) * lineH + size * 0.045;
    ctx.strokeText(ln, cx, y);
  });
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  // white face
  ctx.fillStyle = '#ffffff';
  lines.forEach((ln, i) => {
    const y = cy + (i - (lines.length - 1) / 2) * lineH;
    ctx.fillText(ln, cx, y);
  });
  // thin pink keyline hugging the letters
  ctx.lineWidth = Math.max(1.5, size * 0.022);
  ctx.strokeStyle = '#ff2d93';
  lines.forEach((ln, i) => {
    const y = cy + (i - (lines.length - 1) / 2) * lineH;
    ctx.strokeText(ln, cx, y);
  });
  ctx.restore();
}

/** Global colour grade: teal over the top, warm orange lifting the foot. */
function drawGrade(ctx, w, h, style) {
  const g = style.grade;
  if (g <= 0) return;
  ctx.save();
  const grade = ctx.createLinearGradient(0, 0, 0, h);
  grade.addColorStop(0, `rgba(10, 58, 78, ${0.34 * g})`);
  grade.addColorStop(0.45, 'rgba(0, 0, 0, 0)');
  grade.addColorStop(1, `rgba(255, 120, 44, ${0.3 * g})`);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = grade;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

let scanTile = null;
let grainTile = null;

function tileCanvas(draw) {
  const c = document.createElement('canvas');
  draw(c.getContext('2d'), c);
  return c;
}

/** Faint scanlines across the whole poster. */
function drawScanlines(ctx, w, h, style) {
  if (style.scan <= 0) return;
  if (!scanTile) {
    scanTile = tileCanvas((g, c) => {
      c.width = 4;
      c.height = 4;
      g.fillStyle = 'rgba(0, 0, 0, 0.55)';
      g.fillRect(0, 0, 4, 1);
    });
  }
  ctx.save();
  ctx.globalAlpha = 0.2 * style.scan;
  ctx.fillStyle = ctx.createPattern(scanTile, 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Film grain, blended in with an overlay so it lifts the midtones. */
function drawGrain(ctx, w, h, style) {
  if (style.grain <= 0) return;
  if (!grainTile) {
    grainTile = tileCanvas((g, c) => {
      c.width = 150;
      c.height = 150;
      const id = g.createImageData(150, 150);
      for (let i = 0; i < id.data.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        id.data[i] = v;
        id.data[i + 1] = v;
        id.data[i + 2] = v;
        id.data[i + 3] = 255;
      }
      g.putImageData(id, 0, 0);
    });
  }
  ctx.save();
  ctx.globalAlpha = 0.16 * style.grain;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(grainTile, 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** A vignette to focus the eye on the collage. */
function drawVignette(ctx, w, h) {
  const v = ctx.createRadialGradient(w / 2, h * 0.46, Math.min(w, h) * 0.34, w / 2, h * 0.5, Math.max(w, h) * 0.78);
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, 'rgba(8, 2, 18, 0.4)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Draws the whole cover onto `canvas` from `state`:
 *   panels: [{ img, zoom, ox, oy }]  one per grid slot (img may be null)
 *   caption: string
 *   style: { grain, grade, scan }    each 0..1
 *   selected: index of the panel the editor highlights, or -1
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const geo = panelRects(w, h);
  const style = state.style || { grain: 0.6, grade: 0.7, scan: 0.5 };
  drawSky(ctx, w, h);
  drawSun(ctx, w, h, geo);
  drawPalms(ctx, w, h, geo);
  drawSkyline(ctx, w, h, geo);
  geo.rects.forEach((rect, i) => {
    drawPanel(ctx, rect, state.panels ? state.panels[i] : null, style, state.selected === i);
  });
  drawCaption(ctx, w, h, geo, state.caption);
  drawGrade(ctx, w, h, style);
  drawScanlines(ctx, w, h, style);
  drawGrain(ctx, w, h, style);
  drawVignette(ctx, w, h);
}
