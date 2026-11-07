(() => {
  const tour = document.querySelector(".product-tour");
  if (!tour) return;

  tour.querySelectorAll("[data-project-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.projectFilter;
      tour
        .querySelectorAll("[data-project-filter]")
        .forEach((item) =>
          item.setAttribute("aria-pressed", String(item === button)),
        );
      let total = 0;
      tour.querySelectorAll(".project-column").forEach((column) => {
        let count = 0;
        column.querySelectorAll("[data-task-state]").forEach((task) => {
          task.hidden = filter !== "all" && task.dataset.taskState !== filter;
          if (!task.hidden) count++;
        });
        column.querySelector("[data-column-count]").textContent = count;
        column.querySelector(".project-empty").hidden = count !== 0;
        total += count;
      });
      document.getElementById("project-count").textContent =
        `${total} tâches${filter === "validation" ? " à valider" : ""}`;
    });
  });

  const source = document.querySelector(".product-scene > .briefing-card");
  const slot = document.createElement("div");
  slot.className = "hero-window-slot";
  source.before(slot);
  slot.append(source);
  const dock = tour.querySelector(".tour-dock .briefing-card");
  const decorations = [
    ...document.querySelectorAll(
      ".floating-document, .floating-note, .hero-signature",
    ),
  ];
  const stories = [...tour.querySelectorAll("[data-story]")];
  const steps = [...tour.querySelectorAll(".tour-step")];
  const apps = steps.map((step) => step.querySelector(".tour-app"));
  const storyAnimations = [];
  const ease = getComputedStyle(document.documentElement)
    .getPropertyValue("--tour-ease")
    .trim();
  const wide = matchMedia("(min-width: 1101px)");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let geometry;
  let frame = 0;
  let needsMeasure = true;
  let lastActive;
  let lastHidden = false;
  const clamp = (value) => Math.max(0, Math.min(1, value));

  function restore() {
    source.style.removeProperty("transform");
    source.style.removeProperty("opacity");
    source.style.removeProperty("will-change");
    source.inert = false;
    source.removeAttribute("aria-hidden");
    lastHidden = false;
    dock.style.removeProperty("opacity");
    dock.inert = false;
    dock.removeAttribute("aria-hidden");
    decorations.forEach((element) => {
      element.style.removeProperty("opacity");
      element.inert = false;
    });
  }

  function measure() {
    const from = slot.getBoundingClientRect();
    // Match the content's layout width before the app's zoom is applied, so
    // text and portraits shrink uniformly when the screen enters the shell.
    if (wide.matches) dock.style.width = `${from.width}px`;
    else dock.style.removeProperty("width");
    const to = dock.getBoundingClientRect();
    const y = window.scrollY;
    const start = Math.max(0, from.top + y - innerHeight * 0.32);
    const end = Math.max(
      start + 1,
      to.top + y - Math.max(70, (innerHeight - to.height) / 2),
    );
    geometry = {
      start,
      end,
      dx: to.left - from.left,
      dy: to.top - from.top,
      sx: to.width / from.width,
      sy: to.height / from.height,
      appBounds: apps.map((app, index) => {
        // Read the stable layout box, never a previously animated transform.
        const step = steps[index].getBoundingClientRect();
        const padding = parseFloat(getComputedStyle(steps[index]).paddingTop);
        const zoom = parseFloat(getComputedStyle(app).zoom) || 1;
        return { top: step.top + y + padding, height: app.offsetHeight * zoom };
      }),
    };
    needsMeasure = false;
  }

  function render() {
    frame = 0;
    if (needsMeasure) measure();
    const enabled = wide.matches && !reduce.matches;
    document.documentElement.classList.toggle("tour-motion-enabled", enabled);
    // A direct scroll mapping reverses immediately: no lag, timer, or scroll hijack.
    // Only transform/opacity change per frame; layout is read on resize, not scroll.
    const keyboardInteraction =
      document.activeElement?.matches(":focus-visible") &&
      (source.contains(document.activeElement) ||
        dock.contains(document.activeElement));
    if (enabled && !keyboardInteraction) {
      const progress = clamp(
        (scrollY - geometry.start) / (geometry.end - geometry.start),
      );
      const blend = clamp((progress - 0.99) / 0.01);
      source.style.transform = `translate3d(${geometry.dx * progress}px, ${geometry.dy * progress}px, 0) scale(${1 + (geometry.sx - 1) * progress}, ${1 + (geometry.sy - 1) * progress})`;
      source.style.opacity = String(1 - blend);
      dock.style.opacity = String(blend);
      dock.inert = blend === 0;
      if (blend === 0) dock.setAttribute("aria-hidden", "true");
      else dock.removeAttribute("aria-hidden");
      if (progress > 0 && progress < 1)
        source.style.willChange = "transform, opacity";
      else source.style.removeProperty("will-change");
      decorations.forEach((element) => {
        element.style.opacity = String(1 - clamp(progress / 0.4));
        element.inert = progress >= 0.4;
      });
      const hidden = progress === 1;
      if (hidden !== lastHidden) {
        source.inert = hidden;
        if (hidden) source.setAttribute("aria-hidden", "true");
        else source.removeAttribute("aria-hidden");
        lastHidden = hidden;
      }
    } else {
      restore();
    }

    const readingLine = scrollY + innerHeight * 0.5;
    apps.forEach((app, index) => {
      if (!enabled || app.contains(document.activeElement)) {
        app.style.removeProperty("transform");
        app.style.removeProperty("opacity");
        return;
      }
      const { top, height } = geometry.appBounds[index];
      const entry = clamp(
        (scrollY + innerHeight * 0.92 - top) / (innerHeight * 0.42),
      );
      const exit = clamp(
        (scrollY + innerHeight * 0.15 - top - height * 0.55) / (height * 0.6),
      );
      const presence = Math.min(entry, 1 - exit);
      app.style.opacity = String(0.2 + presence * 0.8);
      // The first frame stays fixed so the hero lands on exact coordinates.
      if (index > 0) {
        app.style.transform = `translate3d(0, ${(1 - entry) * 28 - exit * 16}px, 0) scale(${0.97 + presence * 0.03})`;
      }
    });
    // Keep the current story until the next window reaches the reading line.
    // Nearest section centers switched early in the space between windows.
    const active = geometry.appBounds.reduce(
      (current, bounds, index) => bounds.top <= readingLine ? index : current,
      0,
    );
    if (lastActive !== active) {
      const animateStory =
        enabled &&
        lastActive !== undefined &&
        !document.activeElement?.matches(":focus-visible");
      // Snapshot the visible position before cancelling a previous transition.
      // A quick reversal then starts where the text actually is, without snapping.
      const before = animateStory
        ? stories.map((story) => story.getBoundingClientRect().top)
        : [];
      storyAnimations.forEach((animation) => animation.cancel());
      storyAnimations.length = 0;
      stories.forEach((story, index) => {
        const link = story.querySelector("a");
        if (index === active) link.setAttribute("aria-current", "step");
        else link.removeAttribute("aria-current");
      });
      if (animateStory) {
        stories.forEach((story, index) => {
          const shift = before[index] - story.getBoundingClientRect().top;
          storyAnimations.push(
            story.animate(
              [
                { transform: `translateY(${shift}px)` },
                { transform: "translateY(0)" },
              ],
              { duration: 400, easing: ease },
            ),
          );
        });
        stories[active].querySelectorAll("a > svg, p").forEach((element) => {
          storyAnimations.push(
            element.animate(
              [
                { opacity: 0, transform: "translateY(8px)" },
                { opacity: 1, transform: "translateY(0)" },
              ],
              { duration: 400, easing: ease },
            ),
          );
        });
      }
      lastActive = active;
    }
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }
  function scheduleMeasure() {
    needsMeasure = true;
    schedule();
  }
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", scheduleMeasure, { passive: true });
  wide.addEventListener("change", scheduleMeasure);
  reduce.addEventListener("change", scheduleMeasure);
  reduce.addEventListener("change", () =>
    storyAnimations.forEach((animation) => animation.cancel()),
  );
  tour.addEventListener("focusin", (event) => {
    if (event.target.matches(":focus-visible")) {
      storyAnimations.forEach((animation) => animation.cancel());
    }
    schedule();
  });
  tour.addEventListener("focusout", schedule);
  source.addEventListener("focusin", schedule);
  source.addEventListener("focusout", schedule);
  dock.addEventListener("focusin", schedule);
  dock.addEventListener("focusout", schedule);
  const observer = new ResizeObserver(scheduleMeasure);
  observer.observe(slot);
  observer.observe(tour);
  observer.observe(document.querySelector(".hero-grid"));
  document.fonts.ready.then(scheduleMeasure);
  window.addEventListener("pageshow", scheduleMeasure);
  // Geometry can change when an example is opened; ResizeObserver schedules one read.
  scheduleMeasure();
})();
