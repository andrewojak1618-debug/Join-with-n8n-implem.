let signupSubmitPending = false;
const signupFieldIds = [
  "signupName",
  "signupEmail",
  "signupPassword",
  "signupConfirmPassword",
];
const touchedSignupFields = new Set();


/**
 * Validates the signup form and registers the user on success.
 * @param {Event} event - The form submit event.
 */
async function handleSignup(event) {
  event.preventDefault();
  if (signupSubmitPending) return;
  touchFields(signupFieldIds, touchedSignupFields);
  renderTouchedFieldErrors(touchedSignupFields, getSignupFieldError);
  syncPrivacyConsent();
  if (!isSignupFormValid()) {
    showSignupMessage(getSignupErrorMessage());
    return;
  }
  await registerUser();
}


/**
 * Wraps signup saving so Firebase errors can be shown in the form.
 */
async function registerUser() {
  setSignupSubmitPending(true);
  try {
    await saveSignedUpUser();
    navigateToPage("login", { signup: "success" });
  } catch (error) {
    showSignupMessage(getAuthErrorMessage(error));
  } finally {
    setSignupSubmitPending(false);
  }
}


/**
 * Saves a new signup only through Firebase Authentication.
 */
async function saveSignedUpUser() {
  const auth = getFirebaseAuthAdapter();
  await auth.registerFirebaseUser(
    getTrimmedInputValue("signupName"),
    getTrimmedInputValue("signupEmail"),
    getTrimmedInputValue("signupPassword"),
  );
  await auth.logoutFirebaseUser();
  clearStoredUser();
}


/**
 * Wires the signup form validation and the privacy consent handling.
 */
function initSignupValidation() {
  const form = getElement("signupForm");
  if (!form) return;
  touchedSignupFields.clear();
  form.addEventListener("submit", handleSignup);
  form.addEventListener("input", handleSignupInput);
  form.addEventListener("blur", handleSignupFieldBlur, true);
  getPrivacyLinks().forEach((link) => {
    link.addEventListener("click", handlePrivacyPolicyOpen);
  });
  getElement("privacyAccepted").addEventListener("change", updateSignupButton);
  syncPrivacyConsent();
}


/** Refreshes visible validation while the user corrects a touched field. */
function handleSignupInput() {
  renderTouchedFieldErrors(touchedSignupFields, getSignupFieldError);
  syncPrivacyConsent();
  refreshSignupFormMessage();
}


/** Refreshes an already visible form-level signup message. */
function refreshSignupFormMessage() {
  const message = getElement("signupMessage");
  if (message.textContent) showSignupMessage(getSignupErrorMessage());
}


/**
 * Validates one signup field as soon as it loses focus.
 * @param {FocusEvent} event - Blur event from the signup form.
 */
function handleSignupFieldBlur(event) {
  const fieldId = event.target && event.target.id;
  if (!signupFieldIds.includes(fieldId)) return;
  touchedSignupFields.add(fieldId);
  setFieldValidationError(fieldId, getSignupFieldError(fieldId));
  syncPrivacyConsent();
}


/**
 * Opens the Privacy Policy separately so entered signup values stay in place.
 * @param {MouseEvent} event - Click on a Privacy Policy link.
 */
function handlePrivacyPolicyOpen(event) {
  event.preventDefault();
  window.open(event.currentTarget.href, "_blank", "noopener,noreferrer");
}


/**
 * Enables consent only after every other signup field is valid.
 */
function syncPrivacyConsent() {
  const fieldsValid = areSignupFieldsValid();
  getElement("privacyAccepted").disabled = !fieldsValid;
  if (!fieldsValid) getElement("privacyAccepted").checked = false;
  updateSignupButton();
}


/**
 * Enables the signup button only while the whole form is valid.
 */
function updateSignupButton() {
  getElement("signupButton").disabled = signupSubmitPending || !isSignupFormValid();
  if (isSignupFormValid()) showSignupMessage("");
}


/**
 * Locks or unlocks signup while Firebase processes the registration.
 * @param {boolean} isPending - True while registration is running.
 */
function setSignupSubmitPending(isPending) {
  signupSubmitPending = isPending;
  getElement("signupButton").setAttribute("aria-busy", String(isPending));
  updateSignupButton();
}


/**
 * @returns {boolean} True when all signup fields and the consent are valid.
 */
function isSignupFormValid() {
  return areSignupFieldsValid() && getElement("privacyAccepted").checked;
}


/**
 * @returns {boolean} True when every signup field except consent is valid.
 */
function areSignupFieldsValid() {
  return Boolean(
    isSignupNameValid() &&
    isEmailValid() &&
    isSignupPasswordValid() &&
    passwordsMatch(),
  );
}


/**
 * Returns the message for the first failed signup rule.
 * @returns {string} The error text, or an empty string when valid.
 */
function getSignupErrorMessage() {
  if (!areSignupFieldsValid()) return "Please correct the highlighted fields.";
  if (!getElement("privacyAccepted").checked) return "Please accept the Privacy Policy.";
  return "";
}


/**
 * Returns validation feedback for one signup input.
 * @param {string} fieldId - Id of the signup field to validate.
 * @returns {string} Validation feedback or an empty string.
 */
function getSignupFieldError(fieldId) {
  const errors = {
    signupName: getPersonNameError(getTrimmedInputValue("signupName")),
    signupEmail: isEmailValid() ? "" : "Enter a valid email address.",
    signupPassword: getSignupPasswordError(),
    signupConfirmPassword: getSignupConfirmPasswordError(),
  };
  return errors[fieldId] || "";
}


/** @returns {string} Password validation feedback. */
function getSignupPasswordError() {
  if (!getTrimmedInputValue("signupPassword")) return "Please enter a password.";
  return isSignupPasswordValid() ? "" : "Use at least 6 characters.";
}


/** @returns {string} Password confirmation feedback. */
function getSignupConfirmPasswordError() {
  if (!getTrimmedInputValue("signupConfirmPassword")) return "Please confirm your password.";
  return passwordsMatch() ? "" : "Passwords do not match.";
}


/** @returns {boolean} True when the trimmed name has at least two characters. */
function isSignupNameValid() {
  return isPersonNameValid(getTrimmedInputValue("signupName"));
}


/**
 * @returns {boolean} True when the entered email matches the email pattern.
 */
function isEmailValid() {
  return isEmailAddressValid(getTrimmedInputValue("signupEmail"));
}


/** @returns {boolean} True when Firebase's minimum password length is met. */
function isSignupPasswordValid() {
  return getTrimmedInputValue("signupPassword").length >= 6;
}


/**
 * @returns {boolean} True when both entered passwords are identical.
 */
function passwordsMatch() {
  return getTrimmedInputValue("signupPassword") ===
    getTrimmedInputValue("signupConfirmPassword");
}


/**
 * @returns {NodeList} All links that open the Privacy Policy page.
 */
function getPrivacyLinks() {
  return document.querySelectorAll('[data-page="privacy-policy"]');
}


/**
 * Shows a feedback message below the signup form.
 * @param {string} message - The text to display, or an empty string to clear.
 */
function showSignupMessage(message) {
  setElementText("signupMessage", message);
}
