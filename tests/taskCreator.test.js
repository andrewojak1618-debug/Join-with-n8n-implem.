const assert = require("node:assert/strict");
const test = require("node:test");
const { loadBrowserScripts } = require("./helpers/scriptContext");

const { getManualTaskCreator } = loadBrowserScripts(["components/js/addTask/addTask.js"]);

test("captures internal account details separately from assignments", () => {
  const user = { uid: "account", name: "Alex", email: "alex@example.test" };
  assert.deepEqual({ ...getManualTaskCreator(user) }, { type: "intern", ...user });
});

test("captures guests without an invented email", () => {
  const guest = { uid: "anonymous-id", type: "firebase-guest" };
  assert.deepEqual({ ...getManualTaskCreator(guest) }, {
    type: "extern", origin: "guest", uid: "anonymous-id", name: "Gast",
  });
});

test("rejects a missing session instead of inventing a creator", () => {
  assert.throws(() => getManualTaskCreator(null), /Sign in/);
});
