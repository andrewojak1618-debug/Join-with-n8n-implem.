const loginFieldIds = ["loginEmail", "loginPassword"];
const touchedLoginFields = new Set();


/**
 * Wires up the login form and the guest login button.
 * Runs every time the login page fragment is rendered.
 */
function initLoginValidation() {
  const loginForm = getElement("loginForm");
  const guestLoginButton = getElement("guestLoginButton");

  if (!loginForm || !guestLoginButton) {
    return;
  }

  touchedLoginFields.clear();
  loginForm.addEventListener("submit", handleLoginSubmit);
  loginForm.addEventListener("input", handleLoginInput);
  loginForm.addEventListener("blur", handleLoginFieldBlur, true);
  guestLoginButton.addEventListener("click", handleGuestLogin);
  showLogoutFailureMessage();
  showSignupSuccessMessage();
}


/** Shows a safe message when only the local logout could be completed. */
function showLogoutFailureMessage() {
  if (!hasLogoutFailureParameter()) return;
  removeLoginFeedbackParameter("logout");
  showLoginError("Sign out could not be completed. Please check your connection.");
}


/** @returns {boolean} True after a failed remote logout redirected to login. */
function hasLogoutFailureParameter() {
  return new URLSearchParams(window.location.search).get("logout") === "failed";
}


/** Shows the one-time success feedback after a completed signup. */
function showSignupSuccessMessage() {
  const feedback = getElement("signupSuccessMessage");
  if (!feedback || !hasSignupSuccessParameter()) return;
  removeSignupSuccessParameter();
  showSignupSuccessAfterTransition(feedback);
}


/**
 * Waits until the login transition no longer covers the feedback.
 * @param {HTMLElement} feedback - Signup success element to reveal.
 */
function showSignupSuccessAfterTransition(feedback) {
  if (!isSignupTransitionRunning()) return revealSignupSuccessMessage(feedback);
  const delay = signupTransition.exitDelay + 180;
  setTimeout(() => revealSignupSuccessMessage(feedback), delay);
}


/** @returns {boolean} True while the login intro transition is visible. */
function isSignupTransitionRunning() {
  return typeof pageTransitionRunning !== "undefined" && pageTransitionRunning;
}


/**
 * Displays the signup feedback and schedules its removal.
 * @param {HTMLElement} feedback - Signup success element to display.
 */
function revealSignupSuccessMessage(feedback) {
  showTimedFeedback(feedback);
}


/** @returns {boolean} True when the login page was opened after signup. */
function hasSignupSuccessParameter() {
  return new URLSearchParams(window.location.search).get("signup") === "success";
}


/** Removes the consumed success marker without reloading the login page. */
function removeSignupSuccessParameter() {
  removeLoginFeedbackParameter("signup");
}


/**
 * Removes one consumed login feedback marker without reloading the page.
 * @param {string} parameter - Query parameter to remove from the current URL.
 */
function removeLoginFeedbackParameter(parameter) {
  const url = new URL(window.location.href);
  url.searchParams.delete(parameter);
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}


/**
 * Handles the login form submit: validates the input and starts the login.
 * @param {SubmitEvent} event - The form submit event.
 */
async function handleLoginSubmit(event) {
  event.preventDefault();
  touchFields(loginFieldIds, touchedLoginFields);
  renderTouchedFieldErrors(touchedLoginFields, getLoginFieldError);
  const email = getTrimmedInputValue("loginEmail");
  const password = getTrimmedInputValue("loginPassword");

  if (!isLoginFormValid(email, password)) return;
  await submitLogin(email, password);
}


/**
 * Runs the login request and shows an error message if it fails.
 * Disables the submit button while the request is running.
 * @param {string} email - The email address entered by the user.
 * @param {string} password - The password entered by the user.
 */
async function submitLogin(email, password) {
  const submitButton = getElement("loginSubmitButton");
  submitButton.disabled = true;
  try {
    showLoginError("");
    await handleLogin(email, password);
  } catch (error) {
    showLoginError(getAuthErrorMessage(error));
  } finally {
    submitButton.disabled = false;
  }
}


/**
 * Checks whether email and password are filled in and the email is valid.
 * Shows a matching error message if not.
 * @param {string} email - The email address entered by the user.
 * @param {string} password - The password entered by the user.
 * @returns {boolean} True if the form input is valid.
 */
function isLoginFormValid(email, password) {
  const isValid = !getLoginEmailError(email) && !getLoginPasswordError(password);
  showLoginError("");
  return isValid;
}


/**
 * Validates a login field as soon as it loses focus.
 * @param {FocusEvent} event - Blur event from a login field.
 */
function handleLoginFieldBlur(event) {
  if (!loginFieldIds.includes(event.target.id)) return;
  touchedLoginFields.add(event.target.id);
  setFieldValidationError(event.target.id, getLoginFieldError(event.target.id));
}


/** Refreshes touched feedback and clears stale submit or Firebase messages. */
function handleLoginInput() {
  renderTouchedFieldErrors(touchedLoginFields, getLoginFieldError);
  showLoginError("");
}


/**
 * Returns validation feedback for one login field.
 * @param {string} fieldId - Id of the login field to validate.
 * @returns {string} Validation feedback or an empty string.
 */
function getLoginFieldError(fieldId) {
  if (fieldId === "loginEmail") {
    return getLoginEmailError(getTrimmedInputValue(fieldId));
  }
  if (fieldId === "loginPassword") {
    return getLoginPasswordError(getTrimmedInputValue(fieldId));
  }
  return "";
}


/**
 * Returns validation feedback for the login email.
 * @param {string} email - Normalized email input.
 * @returns {string} Email validation feedback or an empty string.
 */
function getLoginEmailError(email) {
  if (!email) return "Please enter your email address.";
  return isEmailAddressValid(email) ? "" : "Please enter a valid email address.";
}


/**
 * Returns validation feedback for the login password.
 * @param {string} password - Password input to validate.
 * @returns {string} Password validation feedback or an empty string.
 */
function getLoginPasswordError(password) {
  return password ? "" : "Please enter your password.";
}


/**
 * Shows a message in the login error area. An empty string clears it.
 * @param {string} message - The message to display.
 */
function showLoginError(message) {
  const errorElement = getElement("loginError");
  errorElement.textContent = message;
}
