const assert = require("node:assert/strict");
const test = require("node:test");
const { loadBrowserScripts } = require("./helpers/scriptContext");

const scripts = ["components/js/core/htmlIncludes.js", "components/js/contacts/contactsTemplates.js"];


test("shares one HTML request and caches successful markup", async () => {
  let calls = 0;
  const context = loadBrowserScripts(scripts, {
    fetch: async () => { calls++; return { ok: true, text: async () => "<main>Ready</main>" }; },
  });
  const values = await Promise.all([context.getHtmlContent("page.html"), context.getHtmlContent("page.html")]);
  assert.deepEqual(values, ["<main>Ready</main>", "<main>Ready</main>"]);
  await context.getHtmlContent("page.html");
  assert.equal(calls, 1);
});


test("rejects HTTP error markup and permits retry", async () => {
  let calls = 0;
  const context = loadBrowserScripts(scripts, {
    fetch: async () => ++calls === 1
      ? { ok: false, status: 404, text: () => assert.fail("Must not read error HTML") }
      : { ok: true, text: async () => "Recovered" },
  });
  await assert.rejects(context.getHtmlContent("missing.html"), /HTTP 404/);
  assert.equal(await context.getHtmlContent("missing.html"), "Recovered");
});


test("permits retry after a network error", async () => {
  let calls = 0;
  const context = loadBrowserScripts(scripts, {
    fetch: async () => {
      if (++calls === 1) throw new Error("offline");
      return { ok: true, text: async () => "Recovered" };
    },
  });
  await assert.rejects(context.getHtmlContent("page.html"), /offline/);
  assert.equal(await context.getHtmlContent("page.html"), "Recovered");
});


test("does not create a contact template from an HTTP error", async () => {
  const context = loadBrowserScripts(scripts, {
    fetch: async () => ({ ok: false, status: 500 }),
    document: { createElement: () => assert.fail("Must not insert error markup") },
  });
  await assert.rejects(context.createTemplateElement("dialog.html"), /HTTP 500/);
});


test("returns the first element of a successfully loaded contact template", async () => {
  const element = { tagName: "DIALOG" };
  const wrapper = { innerHTML: "", firstElementChild: element };
  const context = loadBrowserScripts(scripts, {
    fetch: async () => ({ ok: true, text: async () => "<dialog></dialog>" }),
    document: { createElement: () => wrapper },
  });
  assert.equal(await context.createTemplateElement("dialog.html"), element);
  assert.equal(wrapper.innerHTML, "<dialog></dialog>");
});


test("shows accessible feedback when page startup fails", async () => {
  const message = { setAttribute(name, value) { this[name] = value; } };
  let shown;
  const context = loadBrowserScripts(["components/js/core/htmlIncludes.js", "main.js"], {
    document: {
      addEventListener() {}, body: { dataset: { page: "login" } },
      createElement: () => message,
      getElementById: () => ({ replaceChildren: (value) => { shown = value; } }),
    },
    window: {}, renderSignupWithTransition: async () => { throw new Error("offline"); },
  });
  await context.initApp();
  assert.equal(shown.role, "alert");
  assert.match(shown.textContent, /Page could not be loaded/);
});
