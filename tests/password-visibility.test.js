const assert = require("node:assert/strict");
const test = require("node:test");
const { loadBrowserScripts } = require("./helpers/scriptContext");


/**
 * Builds a field and its associated visibility control.
 * @returns {Object} Input, button and icon for a single password field.
 */
function createPasswordField() {
  const attributes = { "aria-controls": "password", "aria-pressed": "false" };
  const icon = { src: "" };
  const button = {
    getAttribute: (name) => attributes[name],
    setAttribute: (name, value) => { attributes[name] = value; },
    querySelector: () => icon,
  };
  const input = { value: "Example-only", type: "password" };
  input.parentElement = { querySelector: () => button };
  return { input, button, icon, attributes };
}


/**
 * Loads password controls without registering real browser listeners.
 * @param {Object} field - Controlled password field.
 * @returns {Object} Isolated password behavior context.
 */
function createPasswordContext(field) {
  return loadBrowserScripts(["components/js/auth/passwordVisibility.js"], {
    document: { addEventListener() {}, getElementById: () => field.input },
  });
}


test("toggles password masking and its accessible action together", () => {
  const field = createPasswordField();
  const context = createPasswordContext(field);
  const event = { target: { closest: () => field.button } };
  context.handlePasswordToggle(event);
  assert.equal(field.input.type, "text");
  assert.equal(field.attributes["aria-pressed"], "true");
  assert.equal(field.attributes["aria-label"], "Hide password");
  assert.match(field.icon.src, /\/visibility.svg$/);
  context.handlePasswordToggle(event);
  assert.equal(field.input.type, "password");
  assert.equal(field.attributes["aria-label"], "Show password");
  assert.match(field.icon.src, /\/visibility_off.svg$/);
});


test("clearing a visible password restores masking", () => {
  const field = createPasswordField();
  const context = createPasswordContext(field);
  context.setPasswordVisibility(field.input, field.button, true);
  field.input.value = "";
  context.resetEmptyPassword({ target: field.input });
  assert.equal(field.input.type, "password");
  assert.equal(field.attributes["aria-pressed"], "false");
});


test("empty password and unrelated clicks do not enable visibility", () => {
  const field = createPasswordField();
  const context = createPasswordContext(field);
  field.input.value = "";
  context.handlePasswordToggle({ target: { closest: () => field.button } });
  context.handlePasswordToggle({ target: { closest: () => null } });
  assert.equal(field.input.type, "password");
});


test("changing one password leaves the confirmation masked", () => {
  const field = createPasswordField();
  const confirmation = createPasswordField();
  const context = createPasswordContext(field);
  context.setPasswordVisibility(field.input, field.button, true);
  assert.equal(confirmation.input.type, "password");
  assert.equal(confirmation.attributes["aria-pressed"], "false");
});
