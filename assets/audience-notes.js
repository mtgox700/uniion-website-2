(() => {
  const deck = document.querySelector(".audience-deck");
  if (!deck) return;
  const stack = deck.querySelector(".audience-cards");
  const cards = [...stack.children];
  const counter = deck.querySelector(".audience-counter");
  const dots = [...deck.querySelectorAll("[data-note-index]")];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const hoverPointer = matchMedia("(hover: hover) and (pointer: fine)");
  const fills = dots.map((dot) => {
    const track = document.createElement("span");
    track.className = "audience-dot-track";
    track.setAttribute("aria-hidden", "true");
    const fill = document.createElement("span");
    fill.className = "audience-dot-fill";
    track.append(fill);
    dot.append(track);
    return fill;
  });
  const slideDuration = 5000;
  let progress = null;
  let visible = false;
  let hovered = false;
  let focused = false;
  let pageActive = true;
  let active = 0;
  let drag = null;
  let instantFrame = 0;
  let blends = [];

  function stopBlends() {
    blends.forEach((animation) => animation.cancel());
    blends = [];
  }

  function canPlay() {
    return (
      visible &&
      pageActive &&
      !document.hidden &&
      !hovered &&
      !focused &&
      !drag &&
      !reduce.matches
    );
  }
  function syncPlayback() {
    const playing = canPlay();
    counter.setAttribute("aria-live", playing ? "off" : "polite");
    if (!progress) return;
    if (playing) progress.play();
    else progress.pause();
  }
  function resetProgress() {
    if (progress) {
      progress.onfinish = null;
      progress.cancel();
      progress = null;
    }
    if (!reduce.matches) {
      progress = fills[active].animate(
        [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
        { duration: slideDuration, easing: "linear", fill: "forwards" },
      );
      progress.pause();
      progress.onfinish = () => advance(1, false, true);
    }
    syncPlayback();
  }

  function render(instant = false) {
    stopBlends();
    deck.classList.toggle("is-instant", instant || reduce.matches);
    cards.forEach((card, index) => {
      const position = (index - active + cards.length) % cards.length;
      card.dataset.position = position;
      card.inert = position !== 0;
      card.setAttribute("aria-hidden", String(position !== 0));
      card.style.transform = "";
    });
    counter.textContent = `${active + 1} sur ${cards.length} : ${cards[active].querySelector("h3").textContent}`;
    let indicatorX = 0;
    dots.forEach((dot, index) => {
      const width = index === active ? 44 : 24;
      dot.style.width = `${width}px`;
      dot.style.transform = `translateX(${indicatorX}px)`;
      indicatorX += width;
      if (index === active) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
    resetProgress();
    cancelAnimationFrame(instantFrame);
    instantFrame = requestAnimationFrame(() => {
      instantFrame = requestAnimationFrame(() =>
        deck.classList.remove("is-instant"),
      );
    });
  }

  function advance(direction, instant = false, automatic = false) {
    counter.setAttribute("aria-live", automatic ? "off" : "polite");
    const previous = active;
    // Sample presentation opacity before interrupting an unfinished swap.
    const opacities = cards.map((card) =>
      Number(getComputedStyle(card).opacity),
    );
    const keepCardFocus = cards[active].contains(document.activeElement);
    active = (active + direction + cards.length) % cards.length;
    render(instant);
    if (!instant && !reduce.matches && previous !== active) {
      const style = getComputedStyle(deck);
      const timing = {
        duration: parseFloat(style.getPropertyValue("--card-swap-duration")),
        easing: style.getPropertyValue("--card-swap-ease").trim(),
      };
      cards.forEach((card, index) => {
        if (index === previous) {
          // Keep the departing face above the pile until it is transparent;
          // change depth there, then gently reveal its edge at the back.
          const depth = getComputedStyle(card).zIndex;
          blends.push(
            card.animate(
              [
                { opacity: opacities[index], zIndex: "4", offset: 0 },
                { opacity: 0, zIndex: "4", offset: 0.38 },
                { opacity: 0, zIndex: depth, offset: 0.4 },
                { opacity: 1, zIndex: depth, offset: 1 },
              ],
              { ...timing, easing: "linear" },
            ),
          );
        } else if (opacities[index] < 1) {
          blends.push(
            card.animate(
              [{ opacity: opacities[index] }, { opacity: 1 }],
              timing,
            ),
          );
        }
      });
    }
    if (keepCardFocus) {
      cards[active]
        .querySelector(".audience-card-trigger")
        .focus({ preventScroll: true });
    }
  }

  stack.addEventListener("click", (event) => {
    // Pointer taps are handled on release; this path is native Enter/Space activation.
    if (event.detail === 0 && event.target.closest(".audience-card-trigger"))
      advance(1, true);
  });

  dots.forEach((dot, index) => {
    dot.addEventListener("click", (event) =>
      advance(index - active, event.detail === 0),
    );
  });
  deck.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const focusedDot = dots.indexOf(event.target);
    if (focusedDot !== -1) {
      const next = (focusedDot + direction + cards.length) % cards.length;
      advance(next - active, true);
      dots[active].focus({ preventScroll: true });
    } else {
      advance(direction, true);
    }
  });

  stack.addEventListener("pointerdown", (event) => {
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      !cards[active].contains(event.target)
    )
      return;
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      distance: 0,
      travel: 0,
      started: performance.now(),
      base: getComputedStyle(cards[active]).transform,
      horizontal: false,
    };
    syncPlayback();
    stack.setPointerCapture(event.pointerId);
  });
  stack.addEventListener("pointermove", (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const x = event.clientX - drag.x;
    const y = event.clientY - drag.y;
    drag.travel = Math.hypot(x, y);
    if (!drag.horizontal) {
      // A mouse/trackpad drag can drift diagonally without cancelling the swipe.
      // On touch, still leave clearly vertical gestures to page scrolling.
      if (event.pointerType !== "mouse" && Math.abs(y) > 14 && Math.abs(y) > Math.abs(x) * 1.4) {
        release();
        return;
      }
      if (Math.abs(x) < 6) return;
      drag.horizontal = true;
      deck.classList.add("is-dragging");
    }
    drag.distance = x;
    const offset = 160 * Math.tanh(x / 160);
    if (!reduce.matches)
      cards[active].style.transform =
        `translateX(${offset}px) ${drag.base} rotate(${offset * 0.04}deg)`;
  });
  function release(commit = false) {
    if (!drag) return;
    const { id, distance, horizontal, travel, started } = drag;
    drag = null;
    if (stack.hasPointerCapture(id)) stack.releasePointerCapture(id);
    deck.classList.remove("is-dragging");
    const fling =
      Math.abs(distance) / Math.max(1, performance.now() - started) > 0.35;
    if (commit && !horizontal && travel < 8) {
      advance(1);
    } else if (
      commit &&
      horizontal &&
      (Math.abs(distance) >= 20 || (fling && Math.abs(distance) >= 12))
    ) {
      // A rightward swipe reveals the next note; leftward goes back.
      advance(distance > 0 ? 1 : -1);
    } else {
      cards[active].style.transform = "";
    }
    syncPlayback();
  }
  stack.addEventListener("pointerup", (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    if (drag.horizontal) drag.distance = event.clientX - drag.x;
    release(true);
  });
  stack.addEventListener("pointercancel", () => release());
  stack.addEventListener("lostpointercapture", () => release());
  function settle() {
    release();
    render(true);
  }
  window.addEventListener("resize", settle, { passive: true });
  window.addEventListener("pagehide", () => {
    pageActive = false;
    settle();
  });
  window.addEventListener("pageshow", () => {
    pageActive = true;
    syncPlayback();
  });
  reduce.addEventListener("change", settle);
  deck.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse" || !hoverPointer.matches) return;
    hovered = true;
    syncPlayback();
  });
  deck.addEventListener("pointerleave", () => {
    hovered = false;
    syncPlayback();
  });
  deck.addEventListener("focusin", () => {
    focused = true;
    syncPlayback();
  });
  deck.addEventListener("focusout", (event) => {
    focused = deck.contains(event.relatedTarget);
    syncPlayback();
  });
  document.addEventListener("visibilitychange", syncPlayback);
  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.45;
      syncPlayback();
    },
    { threshold: [0, 0.45] },
  ).observe(deck);
  deck.classList.add("is-ready");
  deck.querySelector(".audience-controls").hidden = false;
  render(true);
})();
