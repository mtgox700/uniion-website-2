(() => {
  if (!window.Lenis) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const defaults = { ...window.UNIION_SCROLL_CONFIG };
  let settings = { ...defaults };
  let engine;
  // easeInOutCubic: a continuous departure and arrival for deliberate navigation.
  const easing = (t) => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

  function mount() {
    engine?.destroy();
    engine = null;
    if (reduce.matches) return;
    engine = new Lenis({
      autoRaf: true,
      lerp: settings.lerp,
      smoothWheel: true,
      syncTouch: false,
      anchors: false, // The handler below preserves URL, modifiers and focus.
      allowNestedScroll: true,
    });
  }

  function focusTarget(target) {
    const temporary = !target.hasAttribute("tabindex") && !target.matches("a, button, input, select, textarea");
    if (temporary) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    if (temporary) target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
  }

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest("a[href]");
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
    let id;
    try { id = decodeURIComponent(url.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const top = id === "top";
    const keyboard = event.detail === 0;
    const offset = top ? 0 : -(parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
    const destination = top ? 0 : target.getBoundingClientRect().top + scrollY + offset;
    const nextURL = top ? url.pathname + url.search : url.pathname + url.search + url.hash;
    if (nextURL !== location.pathname + location.search + location.hash) history.pushState(null, "", nextURL);
    const onComplete = () => {
      // Moving focus only for keyboard navigation avoids interrupting an active pointer gesture.
      if (keyboard) focusTarget(target);
    };
    if (engine) {
      engine.scrollTo(destination, {
        duration: top ? settings.topDuration : settings.anchorDuration,
        easing,
        immediate: keyboard,
        onComplete,
      });
    } else {
      window.scrollTo({ top: destination, behavior: "instant" });
      onComplete();
    }
  });

  // Native input always wins over a running return-to-top animation.
  function cancelNavigation() {
    if (engine?.isScrolling) engine.scrollTo(scrollY, { immediate: true });
  }
  window.addEventListener("keydown", (event) => {
    if (["Tab", "Escape", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) cancelNavigation();
  });
  window.addEventListener("touchstart", cancelNavigation, { passive: true });
  window.addEventListener("popstate", cancelNavigation);
  window.addEventListener("pagehide", () => { engine?.destroy(); engine = null; });
  window.addEventListener("pageshow", (event) => { if (event.persisted) mount(); });
  reduce.addEventListener("change", mount);
  window.uniionScroll = {
    get settings() { return { ...settings }; },
    get defaults() { return { ...defaults }; },
    configure(values = {}) {
      const bounds = { lerp: [0.08, 0.18], anchorDuration: [0.7, 1.6], topDuration: [1.2, 2.4] };
      for (const [key, [min, max]] of Object.entries(bounds)) {
        if (Number.isFinite(values[key])) settings[key] = Math.max(min, Math.min(max, values[key]));
      }
      mount();
      return { ...settings };
    },
  };
  mount();
})();
