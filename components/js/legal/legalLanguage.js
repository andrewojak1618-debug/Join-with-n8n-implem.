const legalLanguageStorageKey = "joinLegalLanguage";


/**
 * Returns the saved legal-page language or English as the default.
 * @returns {string} Supported language code.
 */
function getStoredLegalLanguage() {
  const language = localStorage.getItem(legalLanguageStorageKey);
  return language === "de" ? "de" : "en";
}


/**
 * Connects all language toggles and restores the saved preference.
 * @param {NodeList|Array} pages - Legal page containers to translate.
 * @param {NodeList|Array} toggles - Language switches on the current page.
 */
function initLegalLanguageControls(pages, toggles) {
  toggles.forEach((toggle) => bindLegalLanguageToggle(pages, toggles, toggle));
  applyLegalLanguage(pages, toggles, getStoredLegalLanguage());
}


/**
 * Connects one switch to the shared legal-page language state.
 * @param {NodeList|Array} pages - Legal page containers to translate.
 * @param {NodeList|Array} toggles - All synchronized language switches.
 * @param {HTMLInputElement} toggle - Switch receiving the change listener.
 */
function bindLegalLanguageToggle(pages, toggles, toggle) {
  toggle.addEventListener("change", () => {
    updateStoredLegalLanguage(pages, toggles, toggle.checked);
  });
}


/**
 * Persists a switch change and applies it to every legal-page control.
 * @param {NodeList|Array} pages - Legal page containers to translate.
 * @param {NodeList|Array} toggles - All synchronized language switches.
 * @param {boolean} showEnglish - Whether English should be active.
 */
function updateStoredLegalLanguage(pages, toggles, showEnglish) {
  const language = showEnglish ? "en" : "de";
  localStorage.setItem(legalLanguageStorageKey, language);
  applyLegalLanguage(pages, toggles, language);
}


/**
 * Synchronizes page copy, controls and document language metadata.
 * @param {NodeList|Array} pages - Legal page containers to translate.
 * @param {NodeList|Array} toggles - All synchronized language switches.
 * @param {string} language - Supported language code to apply.
 */
function applyLegalLanguage(pages, toggles, language) {
  const showEnglish = language === "en";
  syncLegalLanguageToggles(toggles, showEnglish);
  syncLegalLanguagePages(pages, showEnglish);
  document.documentElement.lang = language;
}


/**
 * Mirrors the active language to every visible or hidden switch.
 * @param {NodeList|Array} toggles - Language switches to synchronize.
 * @param {boolean} showEnglish - Whether switches should select English.
 */
function syncLegalLanguageToggles(toggles, showEnglish) {
  toggles.forEach((toggle) => { toggle.checked = showEnglish; });
}


/**
 * Shows the matching language copy in all page variants.
 * @param {NodeList|Array} pages - Legal page containers to update.
 * @param {boolean} showEnglish - Whether English copy should be visible.
 */
function syncLegalLanguagePages(pages, showEnglish) {
  pages.forEach((page) => {
    page.classList.toggle("legal-page--english", showEnglish);
  });
}


/**
 * Initializes one legal document in public and signed-in layouts.
 * @param {string} documentType - Legal document key used by element ids.
 */
function initLegalPage(documentType) {
  syncInternalLegalCopy(documentType);
  updateLegalViewMode(documentType);
  const pages = document.querySelectorAll(`.legal-page--${documentType}`);
  const toggles = document.querySelectorAll(".language-switch__input");
  if (pages.length && toggles.length) initLegalLanguageControls(pages, toggles);
}


/**
 * Clones the public legal copy into the app-shell view once.
 * @param {string} documentType - Legal document key used by element ids.
 */
function syncInternalLegalCopy(documentType) {
  const internalCopy = getElement(`${documentType}InternalCopy`);
  const copies = document.querySelectorAll(
    `#${documentType}ExternalView .privacy-copy`,
  );
  if (!internalCopy || !copies.length || internalCopy.children.length) return;
  copies.forEach((copy) => internalCopy.append(copy.cloneNode(true)));
}


/**
 * Selects the public or signed-in legal view.
 * @param {string} documentType - Legal document key used by element ids.
 */
function updateLegalViewMode(documentType) {
  const externalView = getElement(`${documentType}ExternalView`);
  const internalView = getElement(`${documentType}InternalView`);
  if (!externalView || !internalView) return;
  externalView.hidden = Boolean(getStoredUser());
  internalView.hidden = !externalView.hidden;
}


function initPrivacyLanguageSwitch() {
  initLegalPage("privacy");
}


function initLegalNoticeLanguageSwitch() {
  initLegalPage("legal");
}
