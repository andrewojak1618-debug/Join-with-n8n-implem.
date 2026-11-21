const signupTransition = {
  holdDuration: 200,
  travelDuration: 500,
  template: "./components/html/molecules/signupTransitionLoader.html",
};

/**
 * Renders the current page behind the animated transition loader.
 */
async function renderSignupWithTransition() {
  pageTransitionRunning = true;
  const loader = await createSignupTransitionLoader();
  showTransitionLoader(loader);
  try {
    await renderCurrentPage();
    await moveLoginLogo(loader);
  } finally {
    await finishSignupTransition(loader);
  }
}


/**
 * Removes the loader before unlocking navigation and announcing completion.
 * @param {HTMLElement} loader - The active transition loader element.
 */
async function finishSignupTransition(loader) {
  await removeTransitionLoader(loader);
  pageTransitionRunning = false;
  document.dispatchEvent(new Event("join:login-transition-end"));
}


/**
 * Locks page scrolling and fades the transition loader in.
 * @param {HTMLElement} loader - The transition loader element to show.
 */
function showTransitionLoader(loader) {
  setTransitionOverflow(true);
  document.body.append(loader);
  requestAnimationFrame(() => loader.classList.add("is-active"));
}


/**
 * Fades the loader out and unlocks scrolling after the exit animation.
 * @param {HTMLElement} loader - The transition loader element to remove.
 */
async function removeTransitionLoader(loader) {
  loader.classList.add("is-leaving");
  await Promise.allSettled(loader.getAnimations().map((animation) => animation.finished));
  loader.remove();
  setTransitionOverflow(false);
}


/**
 * Locks or unlocks page scrolling while a transition is running.
 * @param {boolean} isLocked - True to lock scrolling during the transition.
 */
function setTransitionOverflow(isLocked) {
  document.documentElement.classList.toggle("is-page-transitioning", isLocked);
  document.body.classList.toggle("is-page-transitioning", isLocked);
}


/**
 * @returns {Promise<HTMLElement>} The loader element built from its template.
 */
async function createSignupTransitionLoader() {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = await getHtmlContent(signupTransition.template);
  return wrapper.firstElementChild;
}


/**
 * Pauses an async flow for the given time.
 * @param {number} duration - The waiting time in milliseconds.
 * @returns {Promise<void>} Resolves after the duration has passed.
 */
function wait(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}


/**
 * Waits for both logos before moving to the rendered login logo.
 * @param {HTMLElement} loader - The visible loading screen.
 */
async function moveLoginLogo(loader) {
  const logo = loader.querySelector("img");
  const target = document.querySelector(".auth-logo__login");
  if (!logo || !target) return;
  const assets = await Promise.allSettled([logo.decode(), target.decode(), document.fonts.ready]);
  if (assets.some((asset) => asset.status === "rejected")) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  await wait(signupTransition.holdDuration);
  await animateLoginLogo(logo, target);
}


/**
 * Keeps the loader until the logo reaches the actual responsive destination.
 * @param {HTMLImageElement} logo - The centered loading logo.
 * @param {HTMLImageElement} target - The final login logo.
 */
async function animateLoginLogo(logo, target) {
  const start = logo.getBoundingClientRect();
  const end = target.getBoundingClientRect();
  const transform = `translate(${end.x - start.x}px, ${end.y - start.y}px) scale(${end.width / start.width}, ${end.height / start.height})`;
  const animation = logo.animate([{ transform: "none" }, { transform }], {
    duration: signupTransition.travelDuration,
    easing: "ease-in-out",
    fill: "forwards",
  });
  await Promise.allSettled([animation.finished]);
}
