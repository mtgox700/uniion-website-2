/* Adapted from the AsciiWake source supplied by the user (Bencho).
   The existing footer SVG supplies the mask, replacing the demo's cube. */
(() => {
  const stage = document.querySelector('.footer-art[data-ascii-wake]');
  const source = stage?.querySelector('img');
  if (!source) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'footer-ascii-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  stage.append(canvas);

  const number = (key, fallback, min, max) => {
    const value = Number(stage.dataset[key]);
    return Number.isFinite(value) && stage.dataset[key] !== undefined
      ? Math.max(min, Math.min(max, value)) : fallback;
  };
  const size = number('asciiSize', 10, 7, 20);
  const reach = number('asciiReach', 60, 0, 100);
  const trail = number('asciiTrail', 1.2, 0.1, 3);
  const pull = number('asciiPull', 40, 0, 100);
  const ramp = ' .:-=+*#%@';
  const radius = 12 + reach / 100 * 58;
  const cw = size * 0.62, ch = size * 0.82;
  const ringDuration = 2.2;
  let cells = [], rings = [];
  let width = 0, height = 0, ratio = 1, ink = '#fff';
  let visible = false, dirty = true, ready = false;
  let frame = 0, buildFrame = 0, previous = 0, tick = 0, deal = 0;
  let hx = -999, hy = -999, lx = NaN, ly = NaN, near = 0, inside = false;
  let touch = null;
  const active = () => visible && !document.hidden && !reduce.matches;
  const hash = (k, n) => {
    let h = (k * 374761393 + n * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  function paint() {
    if (!ready) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = ink;
    ctx.font = `500 ${size}px ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const dot = Math.min(cw, ch) * 0.44;
    const far2 = (radius * 2) ** 2;
    const waves = rings.map(r => {
      const p = r.t / ringDuration;
      return { x: r.x, y: r.y, radius: 8 + (1 - (1 - p) ** 3) * 260,
        amplitude: 0.6 * (1 - p) ** 2 * Math.min(1, p * 6) };
    });
    for (const cell of cells) {
      let h = cell.heat;
      const dx = hx - cell.x, dy = hy - cell.y;
      const distance2 = dx * dx + dy * dy;
      const q = distance2 / (radius * radius);
      if (near > 0.002 && q < 1) h = Math.max(h, 0.95 * near * (1 - q) ** 2);
      for (const wave of waves) {
        const d = (Math.hypot(cell.x - wave.x, cell.y - wave.y) - wave.radius) / 24;
        if (Math.abs(d) < 2.5) h += wave.amplitude * Math.exp(-d * d);
      }
      h *= 0.55 + 0.45 * cell.mask;
      let glyph = Math.min(1, h) * (ramp.length - 1) + 0.5;
      if (h > 0.04) glyph += (hash(cell.id, deal) - 0.5) * 1.6 * Math.min(1, h * 2);
      const index = Math.max(1, Math.min(ramp.length - 1, Math.floor(glyph)));
      let x = cell.x, y = cell.y;
      if (near > 0.002 && distance2 < far2) {
        const d = Math.sqrt(distance2) || 1;
        const lean = Math.min(d * 0.6, 14 * pull / 100 * near * (1 - distance2 / far2) ** 2);
        x += dx / d * lean;
        y += dy / d * lean;
      }
      if (h <= 0.04 || index === 1) {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.45, dot * Math.sqrt(cell.mask)), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillText(ramp[index], x, y);
      }
    }
  }

  function rest() {
    cancelAnimationFrame(frame);
    frame = 0;
    rings = [];
    cells.forEach(cell => { cell.heat = 0; });
    inside = false;
    near = 0;
    lx = NaN;
    touch = null;
    paint();
  }

  function build() {
    buildFrame = 0;
    if (!active() || !source.complete || !source.naturalWidth) return;
    rest();
    const bounds = stage.getBoundingClientRect();
    const image = source.getBoundingClientRect();
    width = Math.round(bounds.width);
    height = Math.round(bounds.height);
    if (!width || !height) return;
    ratio = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ink = getComputedStyle(stage).color;
    // Sample the same positioned SVG as the fallback, including its footer crop.
    const mask = document.createElement('canvas');
    mask.width = width;
    mask.height = height;
    const g = mask.getContext('2d', { willReadFrequently: true });
    try {
      g.drawImage(source, image.left - bounds.left, image.top - bounds.top, image.width, image.height);
      const pixels = g.getImageData(0, 0, width, height).data;
      const alpha = (x, y) => {
        x = Math.round(x); y = Math.round(y);
        return x < 0 || y < 0 || x >= width || y >= height ? 0 : pixels[(y * width + x) * 4 + 3] / 255;
      };
      cells = [];
      const cols = Math.floor(width / cw - 0.5), rows = Math.floor(height / ch);
      const ox = (width - cols * cw) / 2, oy = (height - rows * ch) / 2;
      for (let row = 0; row < rows; row++) {
        const y = oy + (row + 0.5) * ch;
        for (let col = 0; col < cols; col++) {
          const x = ox + (col + 0.5 + (row & 1) * 0.5) * cw;
          const density = (alpha(x, y) * 2 + alpha(x - cw * 0.25, y) + alpha(x + cw * 0.25, y)
            + alpha(x, y - ch * 0.25) + alpha(x, y + ch * 0.25)) / 6;
          if (density > 0.025) cells.push({ x, y, mask: density, heat: 0, id: row * cols + col });
        }
      }
      ready = cells.length > 0;
      dirty = false;
      paint();
      stage.classList.toggle('is-ascii-ready', ready);
    } catch {
      // A failed image decode or inaccessible mask must leave the logo visible.
      ready = false;
      stage.classList.remove('is-ascii-ready');
    }
  }

  function run() {
    if (frame || !ready || !active()) return;
    previous = performance.now();
    frame = requestAnimationFrame(step);
  }
  function step(time) {
    frame = 0;
    if (!active()) return;
    const dt = Math.min(0.05, (time - previous) / 1000);
    previous = time;
    const keep = Math.exp(-dt * 3 / trail);
    let warm = 0;
    for (const cell of cells) {
      const heat = cell.heat * keep;
      cell.heat = heat < 0.003 ? 0 : heat;
      warm = Math.max(warm, cell.heat);
    }
    rings = rings.filter(r => (r.t += dt) < ringDuration);
    near += ((inside ? 1 : 0) - near) * (1 - Math.pow(0.004, dt));
    tick += dt;
    if (tick > 0.07) { tick = 0; deal++; }
    paint();
    if (warm || rings.length || Math.abs((inside ? 1 : 0) - near) >= 0.004) frame = requestAnimationFrame(step);
  }
  function stamp(x, y, amount = 0.5) {
    for (const cell of cells) {
      const q = ((cell.x - x) ** 2 + (cell.y - y) ** 2) / (radius * radius);
      if (q < 1) cell.heat = Math.min(1, cell.heat + amount * (1 - q) ** 2);
    }
  }
  function where(event) {
    const rect = stage.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  function move(event) {
    if (event.pointerType === 'touch' || !ready || !active()) return;
    const { x, y } = where(event);
    if (Number.isNaN(lx)) { lx = x; ly = y; }
    const count = Math.max(1, Math.ceil(Math.hypot(x - lx, y - ly) / (radius / 3)));
    for (let i = 1; i <= count; i++) stamp(lx + (x - lx) * i / count, ly + (y - ly) * i / count);
    lx = hx = x; ly = hy = y;
    inside = true;
    run();
  }
  function pulse(event) {
    if (!ready || !active()) return;
    const point = where(event);
    stamp(point.x, point.y, 0.85);
    rings.push({ ...point, t: 0 });
    rings = rings.slice(-4);
    run();
  }
  function leave() { inside = false; lx = NaN; run(); }
  stage.addEventListener('pointerenter', event => { lx = NaN; move(event); });
  stage.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') {
      if (touch && Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > 10) touch = null;
    } else move(event);
  });
  stage.addEventListener('pointerleave', leave);
  stage.addEventListener('pointercancel', () => { touch = null; leave(); });
  stage.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') touch = { x: event.clientX, y: event.clientY, id: event.pointerId };
    else if (event.button === 0) pulse(event);
  });
  stage.addEventListener('pointerup', event => {
    if (touch?.id === event.pointerId) { pulse(event); touch = null; }
  });

  function scheduleBuild() {
    dirty = true;
    if (!buildFrame && active()) buildFrame = requestAnimationFrame(build);
  }
  function sync() {
    if (!active()) {
      rest();
      cancelAnimationFrame(buildFrame);
      buildFrame = 0;
    }
    if (reduce.matches) stage.classList.remove('is-ascii-ready');
    else if (active()) {
      if (dirty || !ready) scheduleBuild();
      else { stage.classList.add('is-ascii-ready'); paint(); }
    }
  }
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(stage);
  const observer = new ResizeObserver(scheduleBuild);
  observer.observe(stage);
  observer.observe(source);
  source.addEventListener('load', scheduleBuild);
  window.addEventListener('resize', scheduleBuild, { passive: true });
  document.addEventListener('visibilitychange', sync);
  reduce.addEventListener('change', sync);
  window.addEventListener('pagehide', rest);
  window.addEventListener('pageshow', sync);
})();
