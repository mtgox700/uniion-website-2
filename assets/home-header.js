(() => {
  const header = document.querySelector('.site-header');
  const surface = header.querySelector('.header-surface');
  const brand = header.querySelector('.brand');
  const action = header.querySelector('.button');
  const darkSections = [...document.querySelectorAll('#securite, .site-footer')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let measureNeeded = true;
  let width = 0;
  let inset = 0;
  let brandInset = 0;
  let actionInset = 0;
  let surfaceRadius = 26;
  let progress = 0;
  let velocity = 0;
  let previousTime = 0;
  let snap = true;
  // A critically damped spring: a soft settle, with no decorative bounce.
  const response = 0.4;
  const frequency = (2 * Math.PI) / response;

  function render(time) {
    frame = 0;
    if (measureNeeded) {
      width = header.clientWidth;
      const controlsWidth = brand.offsetWidth + action.offsetWidth;
      const minimum = controlsWidth + 32;
      const compact = Math.min(width, Math.max(minimum, Math.min(880, width * 0.78)));
      inset = (width - compact) / 2;
      // Reserve a gap between controls even on the narrowest supported screens.
      const edgeGap = (surface.offsetHeight - action.offsetHeight) / 2;
      const brandPadding = Math.min(16, Math.max(0, compact - controlsWidth - edgeGap - 12));
      brandInset = inset + brandPadding;
      actionInset = inset + edgeGap;
      surfaceRadius = surface.offsetHeight / 2;
      measureNeeded = false;
    }
    const target = reduce.matches
      ? Number(scrollY > 120)
      : Math.max(0, Math.min(1, (scrollY - 32) / 280));
    if (snap || reduce.matches) {
      progress = target;
      velocity = 0;
      snap = false;
    } else {
      const delta = Math.min((time - previousTime) / 1000, 0.064);
      const offset = progress - target;
      const momentum = velocity + frequency * offset;
      const decay = Math.exp(-frequency * delta);
      progress = target + (offset + momentum * delta) * decay;
      velocity = (velocity - frequency * momentum * delta) * decay;
      if (Math.abs(progress - target) < 0.0001 && Math.abs(velocity) < 0.001) {
        progress = target;
        velocity = 0;
      }
    }
    previousTime = time;
    const shift = inset * progress;
    const scale = 1 - (2 * shift) / width;
    // Counter the horizontal scale so the pill ends remain circular at every width.
    // The CTA's right inset equals its top/bottom inset, giving concentric corners.
    surface.style.borderRadius = `${surfaceRadius / scale}px / ${surfaceRadius}px`;
    if (darkSections.length) {
      const bar = header.getBoundingClientRect();
      const center = bar.top + bar.height / 2;
      const overDarkSection = darkSections.some(element => {
        const section = element.getBoundingClientRect();
        // The footer can be shorter than the viewport and never pass behind the bar.
        // Switch once it fills most of the screen, including at the end of the page.
        const threshold = element.matches('.site-footer')
          ? Math.max(center, innerHeight * 0.2, innerHeight - section.height + 24)
          : center;
        return section.top <= threshold && section.bottom > center;
      });
      header.classList.toggle('is-over-dark', overDarkSection);
    }
    // Only the surface scales: the wordmark and CTA keep their original proportions.
    // The header's layout box stays fixed, preserving the hero-to-app geometry.
    surface.style.transform = `scaleX(${scale})`;
    surface.style.opacity = String(progress);
    brand.style.transform = `translate3d(${brandInset * progress}px, 0, 0)`;
    action.style.transform = `translate3d(${-actionInset * progress}px, 0, 0)`;
    if (progress !== target || velocity !== 0) schedule();
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }
  function measure() {
    measureNeeded = true;
    snap = true;
    schedule();
  }
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', measure, {passive:true});
  window.addEventListener('pageshow', measure);
  reduce.addEventListener('change', schedule);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      snap = true;
    } else schedule();
  });
  new ResizeObserver(measure).observe(header);
  document.fonts.ready.then(measure);
  measure();
})();
