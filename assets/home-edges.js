(() => {
  if (!CSS.supports('mask-image', 'linear-gradient(#000, transparent)')) return;
  const backgrounds = [
    { name: 'security', element: document.querySelector('.security-section') },
    { name: 'footer', element: document.querySelector('.site-footer') },
  ].filter(({ element }) => element);

  const veil = document.createElement('div');
  veil.className = 'viewport-fade';
  veil.setAttribute('aria-hidden', 'true');
  veil.inert = true;
  document.body.append(veil);

  let frame = 0;
  let needsMeasure = true;

  function render() {
    frame = 0;
    if (needsMeasure) {
      backgrounds.forEach((background) => {
        const rect = background.element.getBoundingClientRect();
        background.top = rect.top + scrollY;
        veil.style.setProperty(`--${background.name}-height`, `${rect.height}px`);
      });
      needsMeasure = false;
    }
    // Reproduce the actual section background, including its moving boundaries.
    // No white wash or delayed color transition when a dark section reaches an edge.
    backgrounds.forEach(({ name, top }) => {
      veil.style.setProperty(`--${name}-y`, `${top - scrollY}px`);
    });
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }
  function measure() {
    needsMeasure = true;
    schedule();
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('pageshow', measure);
  const observer = new ResizeObserver(measure);
  observer.observe(document.body);
  backgrounds.forEach(({ element }) => observer.observe(element));
  document.fonts.ready.then(measure);
  render();
})();
