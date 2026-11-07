(() => {
  window.lucide?.createIcons();
  // Decorative color fields only run while visible; CSS handles reduced motion.
  const fields = [
    ...document.querySelectorAll(".ambient-light, .closing-atmosphere"),
  ];
  const visibleFields = new Set();
  const updateFields = () =>
    fields.forEach((field) => {
      field.classList.toggle(
        "is-visible",
        visibleFields.has(field) && !document.hidden,
      );
    });
  const fieldObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) visibleFields.add(entry.target);
      else visibleFields.delete(entry.target);
    });
    updateFields();
  });
  fields.forEach((field) => fieldObserver.observe(field));
  document.addEventListener("visibilitychange", updateFields);
  // Repeat one identical group so the logo ribbon loops without a jump.
  const logoList = document.querySelector(".ecosystem-logos");
  if (logoList) {
    const viewport = document.createElement("div");
    viewport.className = "ecosystem-viewport is-marquee";
    const track = document.createElement("div");
    track.className = "ecosystem-track";
    const duplicate = logoList.cloneNode(true);
    duplicate.setAttribute("aria-hidden", "true");
    duplicate.inert = true;
    logoList.before(viewport);
    viewport.append(track);
    track.append(logoList, duplicate);
    let visible = false;
    const updateLogos = () =>
      viewport.classList.toggle("is-visible", visible && !document.hidden);
    const logoObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updateLogos();
    });
    logoObserver.observe(viewport);
    document.addEventListener("visibilitychange", updateLogos);
  }
  // One selection shared by the hero screen and its in-app counterpart.
  const excerpts = {
    "compte-rendu":
      "Les sujets abordés, les décisions prises et les prochaines étapes. L’essentiel à transmettre aux salariés.",
    consultation:
      "Quels sujets souhaitez-vous faire remonter ? Recueillez les questions de vos collègues avant la prochaine réunion.",
    permanence:
      "Une question, une situation à évoquer ? Préparez les informations pratiques du prochain rendez-vous avec vos élus.",
  };
  document.querySelectorAll("[data-briefing]").forEach((button) => {
    button.addEventListener("click", () => {
      const selected = button.dataset.briefing;
      document.querySelectorAll("[data-briefing]").forEach((row) => {
        row.setAttribute(
          "aria-pressed",
          String(row.dataset.briefing === selected),
        );
      });
      document.querySelectorAll("[data-briefing-copy]").forEach((copy) => {
        copy.textContent = excerpts[selected];
      });
    });
  });
  // Segmentit's portraits gently rise around the hovered face.
  const motion = matchMedia(
    "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
  );
  document.querySelectorAll(".people-stack").forEach((group) => {
    const people = [...group.querySelectorAll(".person")];
    const update = (active) =>
      people.forEach((person, index) => {
        const influence =
          active === null ? 0 : 0.45 ** Math.abs(index - active);
        person.style.setProperty("--portrait-lift", `${-4 * influence}px`);
        person.style.setProperty(
          "--portrait-scale",
          index === active ? "1.05" : "1",
        );
        person.style.zIndex = index === active ? "1" : "";
      });
    people.forEach((person, index) =>
      person.addEventListener("pointerenter", (event) => {
        if (motion.matches && event.pointerType !== "touch") update(index);
      }),
    );
    group.addEventListener("pointerleave", () => update(null));
    group.addEventListener("pointercancel", () => update(null));
    motion.addEventListener("change", () => update(null));
  });
})();
