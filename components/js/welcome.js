const INTRO_HOLD_MS = 200;
const LOGO_TRAVEL_MS = 500;
const intro = document.getElementById("intro");
const welcomePage = document.getElementById("welcome-page");

hydrateHtmlIncludes(document.body);
const isReload = performance.getEntriesByType("navigation")[0]?.type === "reload";
const seenInTab = sessionStorage.getItem("join-welcome-seen") === "1";
if ((!isReload && seenInTab) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
  revealWelcome();
} else {
  startVisibleIntro();
}

/**
 * Starts the hold after the centered SVG has decoded and had a frame to paint.
 */
async function startVisibleIntro() {
  try {
    await intro.querySelector("img").decode();
  } catch {
    revealWelcome();
    return;
  }
  requestAnimationFrame(() => requestAnimationFrame(() => window.setTimeout(moveIntroLogo, INTRO_HOLD_MS)));
}

/** Slides the intro logo to the responsive header logo's actual bounds. */
function moveIntroLogo() {
  const logo = intro.querySelector("img");
  const start = logo.getBoundingClientRect();
  const end = welcomePage.querySelector(".brand").getBoundingClientRect();
  const transform = `translate(${end.x - start.x}px, ${end.y - start.y}px) scale(${end.width / start.width})`;
  const animation = logo.animate([{ transform: "none" }, { transform }], {
    duration: LOGO_TRAVEL_MS,
    easing: "ease-in-out",
    fill: "forwards",
  });
  animation.onfinish = revealWelcome;
}

/** Unlocks Welcome and remembers the visit for ordinary return navigation. */
function revealWelcome() {
  intro.hidden = true;
  welcomePage.inert = false;
  sessionStorage.setItem("join-welcome-seen", "1");
}
