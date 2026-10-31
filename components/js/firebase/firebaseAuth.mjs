import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
const app = initializeApp(window.joinFirebaseConfig);
const auth = getAuth(app);
const authPersistenceReady = setPersistence(auth, browserLocalPersistence);
const authReady = authPersistenceReady.then(watchFirebaseAuthState);


/**
 * Creates a Firebase user with email/password and stores the display name.
 * @param {string} name - Display name assigned to the Firebase profile.
 * @param {string} email - Email address for the new account.
 * @param {string} password - Password for the new account.
 * @returns {Promise<Object>} Join user data derived from Firebase.
 */
async function registerFirebaseUser(name, email, password) {
  await authPersistenceReady;
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(userCredential.user, { displayName: name });
  return getStoredFirebaseUser(userCredential.user, "firebase-signup");
}


/**
 * Signs in an existing Firebase user with email and password.
 * @param {string} email - Email address of the account.
 * @param {string} password - Password of the account.
 * @returns {Promise<Object>} Join user data derived from Firebase.
 */
async function loginFirebaseUser(email, password) {
  await authPersistenceReady;
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return getStoredFirebaseUser(userCredential.user, "firebase-login");
}


/**
 * Creates an anonymous Firebase session for the guest login.
 * @returns {Promise<Object>} Join guest data derived from Firebase.
 */
async function loginGuestFirebaseUser() {
  await authPersistenceReady;
  const userCredential = await signInAnonymously(auth);
  return getStoredFirebaseUser(userCredential.user, "firebase-guest");
}


/**
 * Ends the current Firebase session.
 * @returns {Promise<void>} Resolves after Firebase signs out.
 */
async function logoutFirebaseUser() {
  await signOut(auth);
}


/**
 * Updates the current regular user's display name.
 * @param {string} name - New Firebase profile display name.
 * @returns {Promise<void>} Resolves after the optional profile update.
 */
async function updateUserDisplayName(name) {
  if (!auth.currentUser || auth.currentUser.isAnonymous) return;
  await updateProfile(auth.currentUser, { displayName: name });
}


/**
 * Waits for Firebase to tell us whether a user is logged in or logged out.
 * @returns {Promise<Object|null>} First resolved Firebase authentication state.
 */
function watchFirebaseAuthState() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      syncStoredFirebaseUser(user);
      resolve(user);
    });
  });
}


/**
 * Mirrors the Firebase auth state into localStorage for the existing router.
 * @param {Object|null} user - Current Firebase user or null after logout.
 */
function syncStoredFirebaseUser(user) {
  if (!user) {
    clearStoredUser();
    return;
  }
  saveStoredUser(getStoredFirebaseUser(user, getFirebaseUserType(user)));
}


/**
 * Marks anonymous users as guests and regular Firebase users as normal users.
 * @param {Object} user - Firebase user whose account type is resolved.
 * @returns {string} Join user type identifier.
 */
function getFirebaseUserType(user) {
  return user.isAnonymous ? "firebase-guest" : "firebase-user";
}


/**
 * Converts the Firebase user object into the small user object used by Join.
 * @param {Object} user - Firebase user to normalize.
 * @param {string} type - Join user type assigned to the session.
 * @returns {Object} Serializable Join user data.
 */
function getStoredFirebaseUser(user, type) {
  return {
    name: user.displayName || user.email || "Guest",
    email: user.email || "",
    uid: user.uid,
    type,
  };
}


window.joinFirebaseAuth = {
  loginFirebaseUser,
  loginGuestFirebaseUser,
  logoutFirebaseUser,
  registerFirebaseUser,
  updateUserDisplayName,
  waitForAuthReady: () => authReady,
};
