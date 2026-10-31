const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createMemoryStorage,
  loadBrowserScripts,
} = require("./helpers/scriptContext");

const legalLanguageScript = "components/js/legal/legalLanguage.js";


/**
 * Creates an observable language switch for the isolated script context.
 */
function createLanguageToggle() {
  return {
    checked: false,
    listeners: {},
    addEventListener(type, listener) { this.listeners[type] = listener; },
  };
}


/**
 * Creates a legal page that records its English modifier state.
 */
function createLegalPage() {
  return {
    english: false,
    classList: {
      toggle(_className, active) { this.owner.english = active; },
      owner: null,
    },
  };
}


/**
 * Connects the page object with its class-list observer.
 */
function connectLegalPage() {
  const page = createLegalPage();
  page.classList.owner = page;
  return page;
}


/**
 * Loads the legal language helpers with observable browser dependencies.
 */
function createLegalLanguageContext(localStorage = createMemoryStorage()) {
  const document = { documentElement: { lang: "de" } };
  const context = loadBrowserScripts([legalLanguageScript], {
    document,
    localStorage,
  });
  return { context, document, localStorage };
}


test("uses English as the default legal-page language", () => {
  const { context, document } = createLegalLanguageContext();
  const page = connectLegalPage();
  const toggle = createLanguageToggle();
  context.initLegalLanguageControls([page], [toggle]);
  assert.equal(page.english, true);
  assert.equal(toggle.checked, true);
  assert.equal(document.documentElement.lang, "en");
});


test("stores German and restores it on another legal page", () => {
  const storage = createMemoryStorage();
  const first = createLegalLanguageContext(storage);
  const firstToggle = createLanguageToggle();
  first.context.initLegalLanguageControls([connectLegalPage()], [firstToggle]);
  firstToggle.checked = false;
  firstToggle.listeners.change();
  const second = createLegalLanguageContext(storage);
  const secondPage = connectLegalPage();
  const secondToggle = createLanguageToggle();
  second.context.initLegalLanguageControls([secondPage], [secondToggle]);
  assert.equal(storage.getItem("joinLegalLanguage"), "de");
  assert.equal(secondPage.english, false);
  assert.equal(secondToggle.checked, false);
  assert.equal(second.document.documentElement.lang, "de");
});


test("synchronizes all language switches after a change", () => {
  const { context, localStorage } = createLegalLanguageContext();
  const toggles = [createLanguageToggle(), createLanguageToggle()];
  context.initLegalLanguageControls([connectLegalPage()], toggles);
  toggles[0].checked = false;
  toggles[0].listeners.change();
  assert.deepEqual(toggles.map((toggle) => toggle.checked), [false, false]);
  assert.equal(localStorage.getItem("joinLegalLanguage"), "de");
});
