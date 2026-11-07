// Vanilla DOM adaptation of the Signature component supplied by the user (Bencho).
// pen=50, smooth=50, ink=Black, rewind=50, corner=20; all ink stays local.
(() => {
  const frame = document.querySelector(".hero-signature");
  if (!frame) return;
  const surface = frame.querySelector(".signature-surface");
  const face = frame.querySelector(".signature-face");
  const pad = frame.querySelector(".signature-pad");
  const ink = frame.querySelector(".signature-ink");
  const clear = frame.querySelector(".signature-clear");
  const pill = frame.querySelector(".signature-pill");
  const status = frame.querySelector(".signature-status");
  const destination = document.querySelector(
    ".product-scene .signature-destination",
  );
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const ns = "http://www.w3.org/2000/svg";
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  let strokes = [],
    down = null,
    last = null,
    raf = 0;
  let softTimer = 0,
    foldTimer = 0,
    rewinding = false,
    signed = false;
  let dockFrame = 0;
  function positionSigned() {
    dockFrame = 0;
    if (!destination) return;
    const from = frame.getBoundingClientRect();
    const to = destination.getBoundingClientRect();
    surface.style.setProperty(
      "--signature-dock-x",
      `${to.left + to.width / 2 - from.left - from.width / 2}px`,
    );
    surface.style.setProperty(
      "--signature-dock-y",
      `${to.top + to.height / 2 - from.top - from.height / 2}px`,
    );
  }
  function scheduleDock() {
    if (signed && !dockFrame) dockFrame = requestAnimationFrame(positionSigned);
  }
  window.addEventListener("resize", scheduleDock, { passive: true });
  window.addEventListener("scroll", scheduleDock, { passive: true });
  if (destination)
    new ResizeObserver(scheduleDock).observe(
      destination.closest(".briefing-card"),
    );
  function cancelTimers() {
    clearTimeout(softTimer);
    clearTimeout(foldTimer);
  }
  function redraw(cut = Infinity) {
    const nodes = [];
    for (const stroke of strokes) {
      const n = Math.min(stroke.length, cut);
      if (n <= 0) break;
      if (n === 1) {
        const dot = document.createElementNS(ns, "circle");
        dot.setAttribute("cx", stroke[0].x);
        dot.setAttribute("cy", stroke[0].y);
        dot.setAttribute("r", stroke[0].w / 2);
        dot.setAttribute("fill", "currentColor");
        nodes.push(dot);
      } else
        for (let i = 1; i < n; i++) {
          const a = stroke[i - 1],
            b = stroke[i];
          const start =
            i === 1
              ? a
              : {
                  x: (stroke[i - 2].x + a.x) / 2,
                  y: (stroke[i - 2].y + a.y) / 2,
                };
          const end =
            i === stroke.length - 1
              ? b
              : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          const path = document.createElementNS(ns, "path");
          path.setAttribute(
            "d",
            `M${start.x.toFixed(1)} ${start.y.toFixed(1)}Q${a.x.toFixed(1)} ${a.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`,
          );
          path.setAttribute("stroke-width", ((a.w + b.w) / 2).toFixed(2));
          nodes.push(path);
        }
      cut -= stroke.length;
    }
    ink.replaceChildren(...nodes);
  }
  function setSettled(value) {
    surface.classList.toggle("is-settled", value);
    clear.hidden = signed || !strokes.length || rewinding;
  }
  function fold() {
    if (down !== null || !strokes.length || rewinding) return;
    const moveFocus = face.contains(document.activeElement);
    signed = true;
    setSettled(true);
    positionSigned();
    surface.classList.add("is-signed");
    face.inert = true;
    pill.hidden = false;
    status.textContent = "Signé";
    if (moveFocus) pill.focus({ preventScroll: true });
  }
  function settleLater() {
    cancelTimers();
    softTimer = setTimeout(() => setSettled(true), 220);
    foldTimer = setTimeout(fold, 1500);
  }
  function reset() {
    cancelTimers();
    cancelAnimationFrame(raf);
    strokes = [];
    rewinding = signed = false;
    surface.classList.remove("is-inked", "is-settled", "is-signed");
    face.inert = false;
    pill.hidden = true;
    clear.hidden = true;
    status.textContent = "";
    redraw();
  }
  function local(event) {
    const r = pad.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - r.left) * 300) / r.width, 0, 300),
      y: clamp(((event.clientY - r.top) * 180) / r.height, 0, 180),
    };
  }
  pad.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0 || rewinding || signed) return;
    cancelTimers();
    setSettled(false);
    down = event.pointerId;
    const p = local(event);
    last = { ...p, t: performance.now(), w: 3.25 };
    strokes.push([{ ...p, w: last.w }]);
    pad.setPointerCapture(event.pointerId);
    surface.classList.add("is-inked");
    clear.hidden = false;
    redraw();
  });
  pad.addEventListener("pointermove", (event) => {
    if (down !== event.pointerId) return;
    const raw = local(event);
    const x = last.x + (raw.x - last.x) * 0.625;
    const y = last.y + (raw.y - last.y) * 0.625;
    const d = Math.hypot(x - last.x, y - last.y);
    if (d < 0.8) return;
    const t = performance.now();
    const target = 4.7 - 2.9 * clamp(d / Math.max(1, t - last.t) / 1.6, 0, 1);
    const w = last.w + (target - last.w) * 0.35;
    last = { x, y, t, w };
    strokes.at(-1).push({ x, y, w });
    redraw();
  });
  function release(event) {
    if (down !== event.pointerId) return;
    down = null;
    if (pad.hasPointerCapture(event.pointerId))
      pad.releasePointerCapture(event.pointerId);
    settleLater();
  }
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) =>
    pad.addEventListener(type, release),
  );
  pad.addEventListener("contextmenu", (event) => event.preventDefault());
  // Keyboard access to the same demonstration, without pretending to sign a document.
  pad.addEventListener("click", (event) => {
    if (event.detail !== 0 || signed || rewinding) return;
    reset();
    const example = document.createElementNS(ns, "path");
    example.setAttribute(
      "d",
      "M46 113 C57 103 94 46 82 45 C66 44 48 126 72 119 C94 112 108 66 103 80 C91 110 94 124 111 104 C127 86 111 113 126 112 C148 111 158 44 146 51 C134 59 130 127 149 111 C169 95 159 81 155 102 C150 126 180 101 178 99 C171 93 169 113 188 110 C208 107 216 98 234 100",
    );
    const length = example.getTotalLength();
    strokes = [
      Array.from({ length: 100 }, (_, i) => {
        const p = example.getPointAtLength((length * i) / 99);
        return { x: p.x, y: p.y, w: 2.5 };
      }),
    ];
    surface.classList.add("is-inked");
    clear.hidden = false;
    redraw();
    settleLater();
  });
  // Keep the text button available while it is being pressed.
  clear.addEventListener("pointerdown", () => {
    cancelTimers();
    setSettled(false);
  });
  clear.addEventListener("pointerup", () => settleLater());
  clear.addEventListener("pointercancel", () => settleLater());
  function clearSignature(event) {
    if (!strokes.length || rewinding) return;
    cancelTimers();
    if (reduce.matches || (event.type === "click" && event.detail === 0)) {
      reset();
      pad.focus({ preventScroll: true });
      return;
    }
    rewinding = true;
    setSettled(false);
    const n = strokes.reduce((sum, s) => sum + s.length, 0);
    const duration = clamp(n * 6, 350, 2400);
    const start = performance.now();
    function step(time) {
      const k = Math.min(1, (time - start) / duration);
      redraw(Math.round(n * (1 - ease(k))));
      if (k < 1) raf = requestAnimationFrame(step);
      else {
        reset();
        pad.focus({ preventScroll: true });
      }
    }
    raf = requestAnimationFrame(step);
  }
  // Handle touch taps on release so actions remain responsive after drawing.
  // Retain mouse/keyboard clicks and ignore the duplicate compatibility click.
  function bindAction(button, action) {
    let start = null, lastTouch = -Infinity;
    button.addEventListener("pointerdown", event => {
      if (event.pointerType === "touch" && event.isPrimary) start = { x: event.clientX, y: event.clientY };
    });
    button.addEventListener("pointermove", event => {
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) start = null;
    });
    button.addEventListener("pointercancel", () => { start = null; });
    button.addEventListener("pointerup", event => {
      if (!start || event.pointerType !== "touch") return;
      start = null;
      const r = button.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) return;
      lastTouch = performance.now();
      action(event);
    });
    button.addEventListener("click", event => {
      if (event.detail !== 0 && performance.now() - lastTouch < 700) return;
      action(event);
    });
  }
  bindAction(clear, clearSignature);
  bindAction(pill, () => {
    reset();
    pad.focus({ preventScroll: true });
  });
  window.addEventListener("pagehide", () => {
    down = null;
    cancelTimers();
    cancelAnimationFrame(raf);
    if (rewinding) reset();
    else if (strokes.length) fold();
  });
})();
