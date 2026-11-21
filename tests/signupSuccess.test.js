const assert = require("node:assert/strict");
const test = require("node:test");

const { loadBrowserScripts } = require("./helpers/scriptContext");


test("shows signup success feedback once for three seconds", () => {
  const feedback = { hidden: true };
  let hideFeedback;
  let timeoutDelay;
  let replacedUrl;
  const context = loadBrowserScripts([
    "components/js/core/shared.js",
    "components/js/auth/login.js",
  ], {
    document: { getElementById: () => feedback },
    window: createSuccessWindow((url) => (replacedUrl = url)),
    URL,
    URLSearchParams,
    setTimeout: (callback, delay) => {
      hideFeedback = callback;
      timeoutDelay = delay;
    },
  });

  context.showSignupSuccessMessage();

  assert.equal(feedback.hidden, false);
  assert.equal(timeoutDelay, 3000);
  assert.equal(replacedUrl, "/index.html");
  hideFeedback();
  assert.equal(feedback.hidden, true);
});


/**
 * Creates the location and history APIs used by the login feedback.
 * @param {Function} onReplace - Receives the cleaned login URL.
 * @returns {Object} Minimal window implementation.
 */
function createSuccessWindow(onReplace) {
  return {
    location: {
      href: "http://localhost/index.html?signup=success",
      search: "?signup=success",
    },
    history: { replaceState: (_state, _title, url) => onReplace(url) },
  };
}

for (const exit of ["finished", "cancelled", "none"]) {
  test(`signup feedback waits for logo and loader exit: ${exit}`, async () => {
    const feedback = { hidden: true };
    const document = new EventTarget();
    const delays = [];
    let finishLogo;
    let finishExit;
    let removed = false;
    const logoFinished = new Promise(resolve => { finishLogo = resolve; });
    const exitFinished = new Promise((resolve, reject) => {
      finishExit = exit === "cancelled" ? reject : resolve;
    });
    const loader = {
      classList: { add() {} },
      getAnimations: () => exit === "none" ? [] : [{ finished: exitFinished }],
      remove: () => { removed = true; },
    };
    document.getElementById = () => feedback;
    const context = loadBrowserScripts([
      "components/js/core/shared.js",
      "components/js/core/pageTransition.js",
      "components/js/auth/login.js",
    ], {
      document, Event, URL, URLSearchParams, pageTransitionRunning: false,
      window: createSuccessWindow(() => {}),
      setTimeout: (callback, delay) => { delays.push({ callback, delay }); },
    });
    context.createSignupTransitionLoader = async () => loader;
    context.showTransitionLoader = () => {};
    context.setTransitionOverflow = () => {};
    context.renderCurrentPage = async () => context.showSignupSuccessMessage();
    context.moveLoginLogo = () => logoFinished;
    const running = context.renderSignupWithTransition();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(feedback.hidden, true);
    assert.equal(delays.length, 0);
    finishLogo();
    await new Promise(resolve => setImmediate(resolve));
    if (exit !== "none") {
      assert.equal(feedback.hidden, true);
      assert.equal(removed, false);
      finishExit();
    }
    await running;
    assert.equal(removed, true);
    assert.equal(context.pageTransitionRunning, false);
    assert.equal(feedback.hidden, false);
    assert.equal(delays.length, 1);
    assert.equal(delays[0].delay, 3000);
    document.dispatchEvent(new Event("join:login-transition-end"));
    assert.equal(delays.length, 1);
    delays[0].callback();
    assert.equal(feedback.hidden, true);
  });
}
