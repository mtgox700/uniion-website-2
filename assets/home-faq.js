(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const ease = getComputedStyle(document.documentElement)
    .getPropertyValue("--tour-ease")
    .trim();
  const settleAll = [];
  document.querySelectorAll(".faq-list details").forEach((details) => {
    const summary = details.querySelector("summary");
    const answer = details.querySelector(".faq-answer");
    if (!summary || !answer) return;
    let expanded = details.open;
    let heightAnimation;
    let opacityAnimation;
    const cancel = () => {
      heightAnimation?.cancel();
      opacityAnimation?.cancel();
      heightAnimation = opacityAnimation = undefined;
    };
    const settle = () => {
      cancel();
      details.open = expanded;
      details.style.removeProperty("overflow");
      answer.inert = !expanded;
      answer.setAttribute("aria-hidden", String(!expanded));
      summary.setAttribute("aria-expanded", String(expanded));
    };
    settle();
    settleAll.push(settle);
    summary.addEventListener("click", (event) => {
      event.preventDefault();
      const wasOpen = details.open;
      const fromHeight = details.getBoundingClientRect().height;
      const fromOpacity = wasOpen ? getComputedStyle(answer).opacity : "0";
      cancel();
      expanded = !expanded;
      const instant = reduce.matches || event.detail === 0;
      details.classList.toggle("faq-instant", instant);
      if (instant) {
        settle();
        return;
      }
      // Keep native details open while closing; collapse it at the end.
      details.open = true;
      answer.inert = !expanded;
      answer.setAttribute("aria-hidden", String(!expanded));
      summary.setAttribute("aria-expanded", String(expanded));
      const border = parseFloat(getComputedStyle(details).borderBottomWidth);
      const toHeight = expanded
        ? details.getBoundingClientRect().height
        : summary.getBoundingClientRect().height + border;
      details.style.overflow = "clip";
      const timing = {
        duration: expanded ? 280 : 200,
        easing: ease,
        fill: "both",
      };
      heightAnimation = details.animate(
        [{ height: `${fromHeight}px` }, { height: `${toHeight}px` }],
        timing,
      );
      opacityAnimation = answer.animate(
        [{ opacity: fromOpacity }, { opacity: expanded ? 1 : 0 }],
        timing,
      );
      heightAnimation.onfinish = settle;
    });
  });
  window.addEventListener(
    "resize",
    () => settleAll.forEach((settle) => settle()),
    { passive: true },
  );
  reduce.addEventListener("change", () =>
    settleAll.forEach((settle) => settle()),
  );
  window.addEventListener("pagehide", () =>
    settleAll.forEach((settle) => settle()),
  );
})();
