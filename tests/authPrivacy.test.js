const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createMemoryStorage,
  loadBrowserScripts,
  toPlainValue,
} = require("./helpers/scriptContext");

const authScript = "components/js/auth/auth.js";
const loginScript = "components/js/auth/login.js";
const sharedScript = "components/js/core/shared.js";
const signupScript = "components/js/auth/signup.js";


/**
 * Creates one observable form control for the isolated signup context.
 * @param {string} value - Initial input value.
 * @param {string} id - Optional control id.
 * @returns {Object} Minimal input or button implementation.
 */
function createFormControl(value = "", id = "") {
  return {
    id,
    value,
    attributes: {},
    setAttribute(name, nextValue) { this.attributes[name] = nextValue; },
    getAttribute(name) { return this.attributes[name]; },
  };
}


/**
 * Creates the signup controls used by the auth validation helpers.
 * @returns {Object} Minimal form element map for the isolated script context.
 */
function createSignupElements() {
  return {
    signupName: createFormControl("QA User", "signupName"),
    signupNameError: { textContent: "" },
    signupEmail: createFormControl("qa.user@example.com", "signupEmail"),
    signupEmailError: { textContent: "" },
    signupPassword: createFormControl("Testpass123!", "signupPassword"),
    signupPasswordError: { textContent: "" },
    signupConfirmPassword: createFormControl("Testpass123!", "signupConfirmPassword"),
    signupConfirmPasswordError: { textContent: "" },
    privacyAccepted: { checked: false, disabled: false },
    signupButton: createFormControl(),
    signupMessage: { textContent: "" },
  };
}


/**
 * Builds the document methods used by the signup validation code.
 * @param {Object} elements - Form elements keyed by id.
 * @returns {Object} Minimal document implementation.
 */
function createAuthDocument(elements) {
  return {
    getElementById: (id) => elements[id],
    querySelectorAll: () => [],
  };
}


/**
 * Loads the shared auth and page-specific signup scripts.
 * @param {Object} [overrides] - Additional globals and window dependencies.
 * @returns {Object} Auth test context and observable dependencies.
 */
function createAuthContext(overrides = {}) {
  const elements = createSignupElements();
  const openedPages = [];
  const { window: windowOverrides = {}, ...globals } = overrides;
  const window = {
    open: (...args) => openedPages.push(args),
    ...windowOverrides,
  };
  const document = createAuthDocument(elements);
  const context = loadBrowserScripts([sharedScript, authScript, signupScript], {
    document, window, ...globals,
  });
  return { context, elements, openedPages };
}


/** Creates the isolated controls required by login value validation. */
function createLoginContext() {
  const elements = {
    loginEmail: createFormControl("  qa.user@example.com  ", "loginEmail"),
    loginEmailError: { textContent: "" },
    loginPassword: createFormControl("  Testpass123!  ", "loginPassword"),
    loginPasswordError: { textContent: "" },
    loginError: { textContent: "" },
  };
  const document = createAuthDocument(elements);
  return { context: loadBrowserScripts([sharedScript, loginScript], { document }), elements };
}


/**
 * Creates the click event passed to the Privacy Policy handler.
 * @returns {Object} Event with an observable preventDefault call.
 */
function createPrivacyOpenEvent() {
  return {
    currentTarget: { href: "http://localhost/privacyPolicy.html" },
    prevented: false,
    preventDefault() { this.prevented = true; },
  };
}


/**
 * Returns the values that must remain in memory while Privacy opens.
 * @param {Object} elements - Form elements keyed by id.
 * @returns {string[]} Current signup field values.
 */
function getSignupValues(elements) {
  return [
    elements.signupName.value,
    elements.signupEmail.value,
    elements.signupPassword.value,
    elements.signupConfirmPassword.value,
  ];
}


test("keeps privacy consent locked while a required field is invalid", () => {
  const { context, elements } = createAuthContext();
  elements.signupEmail.value = "invalid-email";
  context.syncPrivacyConsent();
  assert.equal(elements.privacyAccepted.disabled, true);
  assert.equal(elements.signupButton.disabled, true);
});


test("shows a name error after a one-character name loses focus", () => {
  const { context, elements } = createAuthContext();
  elements.signupName.value = "A";
  context.handleSignupFieldBlur({ target: elements.signupName });
  assert.equal(elements.signupNameError.textContent, "Enter at least 2 characters.");
  assert.equal(elements.signupName.attributes["aria-invalid"], "true");
});


test("rejects numbers in the signup name after blur", () => {
  const { context, elements } = createAuthContext();
  elements.signupName.value = "Ada2 Lovelace";
  context.handleSignupFieldBlur({ target: elements.signupName });
  assert.equal(elements.signupNameError.textContent, "Use letters, spaces, hyphens, or apostrophes only.");
  assert.equal(elements.signupName.attributes["aria-invalid"], "true");
  assert.equal(elements.privacyAccepted.disabled, true);
});


test("rejects a signup name made only of special characters", () => {
  const { context, elements } = createAuthContext();
  elements.signupName.value = "...";
  context.handleSignupFieldBlur({ target: elements.signupName });
  assert.equal(elements.signupNameError.textContent, "Use letters, spaces, hyphens, or apostrophes only.");
  assert.equal(elements.signupName.attributes["aria-invalid"], "true");
  assert.equal(elements.privacyAccepted.disabled, true);
});


test("rejects signup email addresses containing umlauts", () => {
  const { context, elements } = createAuthContext();
  const invalidEmails = ["jürgen@example.com", "user@exämple.com", "user@example.öe"];
  invalidEmails.forEach((email) => {
    elements.signupEmail.value = email;
    context.syncPrivacyConsent();
    assert.equal(context.isEmailValid(), false);
    assert.equal(elements.privacyAccepted.disabled, true);
    assert.equal(elements.signupButton.disabled, true);
  });
});


test("trims login credentials and rejects invalid email before Firebase", () => {
  const { context, elements } = createLoginContext();
  assert.equal(context.getTrimmedInputValue("loginEmail"), "qa.user@example.com");
  assert.equal(context.getTrimmedInputValue("loginPassword"), "Testpass123!");
  elements.loginEmail.value = "invalid-email";
  assert.equal(context.isLoginFormValid(
    context.getTrimmedInputValue("loginEmail"),
    context.getTrimmedInputValue("loginPassword"),
  ), false);
  assert.equal(elements.loginError.textContent, "");
});


test("shows and clears login email feedback after blur", () => {
  const { context, elements } = createLoginContext();
  elements.loginEmail.value = "invalid-email";
  context.handleLoginFieldBlur({ target: elements.loginEmail });
  assert.equal(elements.loginEmailError.textContent, "Please enter a valid email address.");
  elements.loginEmail.value = "qa.user@example.com";
  context.handleLoginInput();
  assert.equal(elements.loginEmailError.textContent, "");
});


test("opens Privacy separately and preserves signup values in memory", () => {
  const { context, elements, openedPages } = createAuthContext();
  const event = createPrivacyOpenEvent();
  const valuesBefore = getSignupValues(elements);
  context.handlePrivacyPolicyOpen(event);
  assert.equal(event.prevented, true);
  assert.deepEqual(openedPages, [[event.currentTarget.href, "_blank", "noopener,noreferrer"]]);
  assert.deepEqual(getSignupValues(elements), valuesBefore);
});


test("enables privacy consent when every required field is valid", () => {
  const { context, elements } = createAuthContext();
  context.syncPrivacyConsent();
  assert.equal(elements.privacyAccepted.disabled, false);
  assert.equal(elements.signupButton.disabled, true);
});


test("shows a mismatch after password confirmation loses focus", () => {
  const { context, elements } = createAuthContext();
  elements.signupConfirmPassword.value = "Different123!";
  context.handleSignupFieldBlur({ target: elements.signupConfirmPassword });
  assert.equal(elements.signupConfirmPasswordError.textContent, "Passwords do not match.");
  assert.equal(elements.privacyAccepted.disabled, true);
});


test("clears touched field feedback while the user corrects it", () => {
  const { context, elements } = createAuthContext();
  elements.signupName.value = "A";
  context.handleSignupFieldBlur({ target: elements.signupName });
  elements.signupName.value = "Ada";
  context.handleSignupInput();
  assert.equal(elements.signupNameError.textContent, "");
  assert.equal(elements.signupName.attributes["aria-invalid"], "false");
});


test("enables signup after valid fields and accepted privacy consent", () => {
  const { context, elements } = createAuthContext();
  context.syncPrivacyConsent();
  elements.privacyAccepted.checked = true;
  context.updateSignupButton();
  assert.equal(context.isSignupFormValid(), true);
  assert.equal(elements.signupButton.disabled, false);
});


test("locks and clears consent when a required field becomes invalid", () => {
  const { context, elements } = createAuthContext();
  elements.privacyAccepted.checked = true;
  elements.signupName.value = "";
  context.syncPrivacyConsent();
  assert.equal(elements.privacyAccepted.disabled, true);
  assert.equal(elements.privacyAccepted.checked, false);
  assert.equal(elements.signupButton.disabled, true);
});


test("shows a clear error when privacy consent was not accepted", async () => {
  const { context, elements } = createAuthContext();
  const event = createPrivacyOpenEvent();
  await context.handleSignup(event);
  assert.equal(elements.signupMessage.textContent, "Please accept the Privacy Policy.");
});


test("logs out after registration and routes the new user to login", async () => {
  const calls = [];
  const localStorage = createMemoryStorage({ joinUser: "stored-user" });
  const joinFirebaseAuth = {
    registerFirebaseUser: async (...args) => calls.push(["register", ...args]),
    logoutFirebaseUser: async () => calls.push(["logout"]),
  };
  const { context, elements } = createAuthContext({
    window: { joinFirebaseAuth },
    localStorage,
    navigateToPage: (page, params) => calls.push(["navigate", page, params]),
  });
  elements.signupName.value = "  QA User  ";
  elements.signupEmail.value = "  qa.user@example.com  ";
  elements.signupPassword.value = "  Testpass123!  ";
  elements.signupConfirmPassword.value = "  Testpass123!  ";
  elements.privacyAccepted.checked = true;
  await context.registerUser();
  assert.deepEqual(toPlainValue(calls), [
    ["register", "QA User", "qa.user@example.com", "Testpass123!"],
    ["logout"], ["navigate", "login", { signup: "success" }],
  ]);
  assert.equal(localStorage.getItem("joinUser"), null);
});
