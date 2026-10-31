const signupTransition = {
  renderDelay: 240,
  exitDelay: 600,
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
    await wait(signupTransition.renderDelay);
    await renderCurrentPage({ animate: true });
    await wait(signupTransition.exitDelay);
  } finally {
    finishSignupTransition(loader);
  }
}


/**
 * Removes the loader, cleans the URL and unlocks navigation again.
 * @param {HTMLElement} loader - The active transition loader element.
 */
function finishSignupTransition(loader) {
  removeTransitionLoader(loader);
  pageTransitionRunning = false;
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
function removeTransitionLoader(loader) {
  loader.classList.add("is-leaving");
  setTimeout(() => {
    loader.remove();
    setTransitionOverflow(false);
  }, 180);
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
