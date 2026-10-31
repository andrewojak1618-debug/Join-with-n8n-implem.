const authErrorMessages = {
  "auth/firebase-unavailable":
    "Authentication could not be loaded. Please try again later.",
  "auth/invalid-email": "Invalid password or email.",
  "auth/user-not-found": "Invalid password or email.",
  "auth/invalid-credential": "Invalid password or email.",
  "auth/invalid-password": "Invalid password or email.",
  "auth/wrong-password": "Invalid password or email.",
  "auth/email-already-in-use": "This email address is already registered.",
  "auth/weak-password": "Please use at least 6 characters.",
  "auth/operation-not-allowed": "This login method is not enabled yet.",
  "auth/network-request-failed": "Please check your internet connection.",
};
/**
 * Signs in through Firebase and opens the protected summary page.
 * @param {string} email - Email address submitted by the user.
 * @param {string} password - Password submitted by the user.
 * @returns {Promise<void>} Resolves after the login flow completes.
 */
async function handleLogin(email, password) {
  await loginWithFirebase(email, password);
}


/**
 * Stores the Firebase login result and opens the protected summary page.
 * @param {string} email - Email address used for Firebase Authentication.
 * @param {string} password - Password used for Firebase Authentication.
 * @returns {Promise<void>} Resolves after storing the user and navigating.
 */
async function loginWithFirebase(email, password) {
  const auth = getFirebaseAuthAdapter();
  const user = await auth.loginFirebaseUser(email, password);
  saveStoredUser(user);
  navigateToPage("summary");
}


/**
 * Starts the guest login and shows a login message if Firebase rejects it.
 */
async function handleGuestLogin() {
  setGuestLoginPending(true);
  try {
    await loginGuestUser();
  } catch (error) {
    showLoginError(getAuthErrorMessage(error));
  } finally {
    setGuestLoginPending(false);
  }
}


/**
 * Locks the guest button while Firebase processes the sign-in request.
 * @param {boolean} isPending - True while the guest login is pending.
 */
function setGuestLoginPending(isPending) {
  const button = getElement("guestLoginButton");
  if (!button) return;
  button.disabled = isPending;
  button.setAttribute("aria-busy", String(isPending));
}


/**
 * Uses Firebase Anonymous Authentication for the guest login.
 */
async function loginGuestUser() {
  const auth = getFirebaseAuthAdapter();
  const user = await auth.loginGuestFirebaseUser();
  saveStoredUser(user);
  navigateToPage("summary");
}


/**
 * Signs out from Firebase, clears the local user and returns to login.
 */
async function handleLogout() {
  const logoutSucceeded = await logoutFirebaseUserSafely();
  clearStoredUser();
  const params = logoutSucceeded ? {} : { logout: "failed" };
  navigateToPage("login", params);
}


/**
 * Attempts the remote sign-out without blocking the local logout fallback.
 * @returns {Promise<boolean>} True when no remote session remains to clear.
 */
async function logoutFirebaseUserSafely() {
  if (!isFirebaseAuthReady()) return true;
  try {
    await window.joinFirebaseAuth.logoutFirebaseUser();
    return true;
  } catch {
    return false;
  }
}


/**
 * Checks whether the Firebase adapter finished loading on window.
 * @returns {boolean} True when Firebase Authentication is ready.
 */
function isFirebaseAuthReady() {
  return Boolean(window.joinFirebaseAuth);
}


/**
 * Returns the Firebase adapter or stops authentication with a clear error.
 * @returns {Object} Loaded Firebase Authentication adapter.
 * @throws {Error} When Firebase Authentication is unavailable.
 */
function getFirebaseAuthAdapter() {
  if (isFirebaseAuthReady()) return window.joinFirebaseAuth;
  throw createFirebaseUnavailableError();
}


/**
 * Creates the shared error for an unavailable Firebase Authentication service.
 * @returns {Error} Error carrying the firebase-unavailable code.
 */
function createFirebaseUnavailableError() {
  const error = new Error("Firebase Authentication is unavailable.");
  error.code = "auth/firebase-unavailable";
  return error;
}


/**
 * Converts Firebase error codes into short messages for the auth forms.
 * @param {Object} error - Firebase or application authentication error.
 * @returns {string} User-facing authentication feedback.
 */
function getAuthErrorMessage(error) {
  const code = error && error.code;
  return authErrorMessages[code] || "Authentication is currently not available.";
}
