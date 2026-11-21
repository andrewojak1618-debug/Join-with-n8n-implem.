const assert = require("node:assert/strict");
const test = require("node:test");
const { loadBrowserScripts } = require("./helpers/scriptContext");

/**
 * Creates a transition context with controlled time and motion preferences.
 * @param {boolean} reduced - Whether reduced motion is requested.
 * @returns {Object} Isolated transition script context.
 */
function createMotionContext(reduced = false) {
  return loadBrowserScripts(["components/js/core/pageTransition.js"], {
    document: { fonts: { ready: Promise.resolve() } },
    matchMedia: () => ({ matches: reduced }),
    setTimeout: (resolve) => resolve(),
  });
}

for (const end of [{ x: 77, y: 80, width: 100, height: 122 }, { x: 38, y: 36, width: 64, height: 78 }]) {
  test(`waits for logo arrival at responsive destination ${end.x}/${end.y}`, async () => {
    const context = createMotionContext();
    let finish;
    let options;
    let keyframes;
    let completed = false;
    const finished = new Promise((resolve) => { finish = resolve; });
    const logo = {
      getBoundingClientRect: () => ({ x: 500, y: 400, width: 277, height: 334 }),
      animate: (frames, settings) => { keyframes = frames; options = settings; return { finished }; },
    };
    const running = context.animateLoginLogo(logo, { getBoundingClientRect: () => end }).then(() => { completed = true; });
    await Promise.resolve();
    assert.equal(completed, false);
    assert.equal(options.duration, 500);
    assert.equal(keyframes[1].transform, `translate(${end.x - 500}px, ${end.y - 400}px) scale(${end.width / 277}, ${end.height / 334})`);
    finish();
    await running;
    assert.equal(completed, true);
  });
}

test("reduced motion skips the logo travel", async () => {
  const context = createMotionContext(true);
  const image = { decode: async () => {} };
  context.document.querySelector = () => image;
  context.animateLoginLogo = () => { throw new Error("Animation must be skipped"); };
  await context.moveLoginLogo({ querySelector: () => image });
});


test("a failed logo decode skips motion without failing the login", async () => {
  const context = createMotionContext();
  context.document.querySelector = () => ({ decode: async () => {} });
  context.animateLoginLogo = () => { throw new Error("Unexpected motion"); };
  const logo = { decode: async () => { throw new Error("Image unavailable"); } };
  await context.moveLoginLogo({ querySelector: () => logo });
});


test("a missing destination skips decorative motion", async () => {
  const context = createMotionContext();
  context.document.querySelector = () => null;
  await context.moveLoginLogo({ querySelector: () => ({}) });
});


test("cancelled logo motion still allows login completion", async () => {
  const context = createMotionContext();
  const bounds = { x: 0, y: 0, width: 100, height: 120 };
  const logo = {
    getBoundingClientRect: () => bounds,
    animate: () => ({ finished: Promise.reject(new Error("Cancelled")) }),
  };
  await context.animateLoginLogo(logo, logo);
});
