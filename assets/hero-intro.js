(() => {
  const scene = document.querySelector(".product-scene");
  if (!scene) return;
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const source = scene.querySelector(".briefing-card");
  const signature = scene.querySelector(".hero-signature");
  let intro = [];
  let running = false;
  let completed = !root.classList.contains("hero-intro-pending");
  let startY = scrollY;
  let observer;
  clearTimeout(window.uniionHeroFallback);

  function finish() {
    completed = true;
    running = false;
    root.classList.remove("hero-intro-pending");
    intro.forEach((animation) => {
      animation.effect.target.style.removeProperty("visibility");
      animation.cancel();
    });
    intro = [];
    scene.inert = false;
    observer?.disconnect();
  }
  function enter(element, from, to, delay, duration) {
    element.style.visibility = "visible";
    const animation = element.animate([from, to], {
      delay,
      duration,
      easing: "cubic-bezier(0.32, 0.72, 0, 1)",
      fill: "both",
    });
    intro.push(animation);
    return animation;
  }
  function start() {
    if (completed || running) return;
    if (reduce.matches || !scene.animate) {
      finish();
      return;
    }
    running = true;
    startY = scrollY;
    enter(
      scene.querySelector(".ambient-light"),
      { opacity: 0, transform: "translateY(95px) scale(0.94)" },
      { opacity: 1, transform: "translateY(0) scale(1)" },
      140,
      1000,
    );
    const windowEntrance = enter(
      source,
      { opacity: 0, translate: "0 24px" },
      { opacity: 1, translate: "0 0" },
      900,
      600,
    );
    windowEntrance.finished
      .then(() => {
        scene.inert = false;
      })
      .catch(() => {});
    enter(
      scene.querySelector(".floating-document"),
      { opacity: 0, translate: "0 16px" },
      { opacity: 1, translate: "0 0" },
      1450,
      480,
    );
    const last = enter(
      signature,
      { opacity: 0, translate: "0 14px" },
      { opacity: 1, translate: "0 0" },
      1850,
      500,
    );
    last.finished.then(finish).catch(() => {});
  }
  if (!completed && !reduce.matches) {
    scene.inert = true;
    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) start();
      },
      { threshold: 0.15 },
    );
    observer.observe(scene);
  } else finish();
  // Never let the entrance compete with the screen docking into the app.
  window.addEventListener(
    "scroll",
    () => {
      if (running && Math.abs(scrollY - startY) > 40) finish();
    },
    { passive: true },
  );
  window.addEventListener(
    "resize",
    () => {
      if (running) finish();
    },
    { passive: true },
  );
  window.addEventListener("pageshow", (event) => {
    if (event.persisted || scrollY > 80) finish();
  });
  window.addEventListener("pagehide", finish);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running) finish();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Tab" && !completed) finish();
  });
  reduce.addEventListener("change", () => {
    if (reduce.matches) finish();
  });
})();
