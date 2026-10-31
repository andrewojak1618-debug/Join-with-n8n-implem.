const firebaseAdapterRoutes = {
  contacts: new Set(["add-task", "board", "contacts"]),
  tasks: new Set(["summary", "add-task", "board", "contacts"]),
};


window.joinFirebaseReady = loadFirebaseConfig();


/**
 * Loads the local Firebase config and then starts the Firebase adapter.
 */
async function loadFirebaseConfig() {
  try {
    const response = await fetch("./components/js/firebase/firebaseConfig.js");
    if (!response.ok) return handleFirebaseLoadFailure();
    await loadScript("./components/js/firebase/firebaseConfig.js");
    await import("./firebaseAuth.mjs");
    await loadFirebaseDataAdapters(document.body.dataset.page);
    return window.joinFirebaseAuth.waitForAuthReady();
  } catch {
    return handleFirebaseLoadFailure();
  }
}


/**
 * Loads only the Firestore adapters required by the current page.
 * @param {string} page - Route key declared on the document body.
 */
async function loadFirebaseDataAdapters(page) {
  const adapterImports = [];
  if (firebaseAdapterRoutes.contacts.has(page)) {
    adapterImports.push(import("./firebaseContacts.mjs"));
  }
  if (firebaseAdapterRoutes.tasks.has(page)) {
    adapterImports.push(import("./firebaseTasks.mjs"));
  }
  await Promise.all(adapterImports);
}


/**
 * Removes stale local auth data when Firebase cannot be loaded.
 */
function handleFirebaseLoadFailure() {
  clearStoredUser();
  return null;
}


/**
 * Adds a script tag dynamically so the ignored firebaseConfig.js can load.
 * @param {string} src - Script source URL to load.
 * @returns {Promise<void>} Resolves after the script loads.
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
