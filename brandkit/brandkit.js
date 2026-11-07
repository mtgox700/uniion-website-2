(() => {
  const scroll = window.uniionScroll;
  const controls = [...document.querySelectorAll('[data-scroll-setting]')];
  if (scroll && controls.length) {
    const renderSettings = () => {
      const values = scroll.settings;
      controls.forEach(input => {
        input.value = values[input.dataset.scrollSetting];
        document.querySelector(`output[for="${input.id}"]`).textContent =
          Number(input.value).toLocaleString('fr-FR') + (input.dataset.scrollSetting === 'lerp' ? '' : ' s');
      });
      document.getElementById('scroll-code').textContent =
        '<link rel="stylesheet" href="assets/smooth-scroll.css">\n' +
        '<script src="assets/vendor/lenis-1.3.27.min.js" defer></script>\n' +
        '<script>\nwindow.UNIION_SCROLL_CONFIG = ' + JSON.stringify(values, null, 2) + ';\n</script>\n' +
        '<script src="assets/smooth-scroll.js" defer></script>\n\n' +
        '<!-- Sur le body : id="top". Sur le logo : href="#top". -->';
    };
    controls.forEach(input => input.addEventListener('input', () => {
      scroll.configure({ [input.dataset.scrollSetting]: Number(input.value) });
      renderSettings();
    }));
    document.querySelector('[data-scroll-reset]').addEventListener('click', () => {
      scroll.configure(scroll.defaults);
      renderSettings();
    });
    renderSettings();
  }
  const feedback = document.querySelector('.kit-feedback');
  document.querySelectorAll('[data-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      const value = button.dataset.value || document.getElementById(button.dataset.copy).textContent;
      try {
        await navigator.clipboard.writeText(value);
        feedback.textContent = 'Copié dans le presse-papiers.';
        const label = button.querySelector('strong') || button;
        const previous = label.textContent;
        label.textContent = 'Copié';
        setTimeout(() => { label.textContent = previous; }, 1600);
      } catch {
        feedback.textContent = 'Copie indisponible : sélectionnez le code ou la valeur pour la copier.';
      }
    });
  });
})();
