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
