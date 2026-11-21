const assert = require("node:assert/strict");
const test = require("node:test");
const { loadBrowserScripts } = require("./helpers/scriptContext");


/**
 * Creates a required form field and its validation feedback.
 * @param {string} name - Field name.
 * @param {string} value - Entered text.
 * @returns {Object} Field model used by the isolated form test.
 */
function createRequestField(name, value) {
  const attributes = {};
  return {
    name, value, validity: { typeMismatch: false }, focused: false,
    error: { textContent: "", hidden: true },
    getAttribute: () => name,
    setAttribute: (key, text) => { attributes[key] = text; },
    removeAttribute: (key) => { delete attributes[key]; },
    focus() { this.focused = true; },
  };
}


/**
 * Loads request validation with an inert location sink, without opening mail.
 * @param {Object} values - Submitted field values.
 * @returns {Object} Form, fields, context and captured destination.
 */
function createRequestContext(values) {
  const fields = Object.entries(values).map(([name, value]) => createRequestField(name, value));
  const form = { addEventListener() {}, querySelectorAll: () => fields };
  const window = { location: { href: "unchanged" } };
  const context = loadBrowserScripts(["components/js/email-mask.js"], {
    window, hydrateHtmlIncludes() {},
    document: { querySelector: () => form, getElementById: (id) => fields.find(f => f.name === id).error },
    FormData: class { get(name) { return values[name]; } },
  });
  return { context, form, fields, window };
}


test("draft keeps recipient, special characters, line breaks and sender details", () => {
  const values = { name: " Anfrageweg Test ", email: " request-preview@example.test ",
    subject: " Anfrageweg – Rückfrage & Übersicht ", message: "Beim Öffnen fehlt A & B.\nZweite Zeile: 50% + Übersicht." };
  const setup = createRequestContext(values);
  setup.context.openRequestDraft({ preventDefault() {}, currentTarget: setup.form });
  const draft = new URL(setup.window.location.href);
  assert.equal(draft.protocol, "mailto:");
  assert.equal(draft.pathname, "ai.viralreelcreator@gmail.com");
  assert.equal(draft.searchParams.get("subject"), values.subject.trim());
  assert.equal(draft.searchParams.get("body"), `${values.message}\r\n\r\nAnfrageweg Test\r\nrequest-preview@example.test`);
});


for (const value of ["", "   "]) {
  test(`empty or whitespace-only fields prevent a draft: ${JSON.stringify(value)}`, () => {
    const setup = createRequestContext({ name: value, email: value, subject: value, message: value });
    setup.context.openRequestDraft({ preventDefault() {}, currentTarget: setup.form });
    assert.equal(setup.window.location.href, "unchanged");
    assert.equal(setup.fields.filter(field => !field.error.hidden).length, 4);
    assert.equal(setup.fields[0].focused, true);
  });
}


test("invalid email prevents a draft even with all fields filled", () => {
  const setup = createRequestContext({ name: "Test", email: "invalid", subject: "Test", message: "Request" });
  setup.fields[1].validity.typeMismatch = true;
  setup.context.openRequestDraft({ preventDefault() {}, currentTarget: setup.form });
  assert.equal(setup.window.location.href, "unchanged");
  assert.equal(setup.fields[1].error.textContent, "Please enter a valid email address.");
});
