const contactStorageKey = "joinContacts";
const accountContactPrefix = "account-";
const guestUserTypes = ["firebase-guest", "guest"];
const contactColors = [
  "#FF7A00", "#9327FF", "#6E52FF", "#FC71FF", "#FFBB2B",
  "#1FD7C1", "#FF4646", "#00BEE8", "#FF745E", "#0038FF",
];


/**
 * Reads contacts from Firestore when available, otherwise from localStorage.
 * @param {Function} [onAccountContactError] - Handles account contact errors.
 * @returns {Promise<Array>} The contacts available for rendering.
 */
async function loadContactsFromStore(onAccountContactError) {
  const contacts = isContactFirestoreReady()
    ? await window.joinFirebaseContacts.loadContacts()
    : getLocalContacts();
  return ensureAccountContactSafely(contacts, onAccountContactError);
}


/**
 * Keeps loaded contacts available if the account contact cannot be saved.
 * @param {Array} contacts - The contacts already loaded from the store.
 * @param {Function} [onError] - Handles the isolated save error.
 * @returns {Promise<Array>} The contacts available for rendering.
 */
async function ensureAccountContactSafely(contacts, onError) {
  try {
    return await ensureAccountContact(contacts);
  } catch (error) {
    if (onError) onError(error);
    return contacts;
  }
}


/**
 * Adds the signed-in account once and reuses a contact with the same email.
 * @param {Object[]} contacts - Contacts loaded from the active store.
 * @returns {Promise<Object[]>} Contacts including the account contact when applicable.
 */
async function ensureAccountContact(contacts) {
  const user = getStoredUser();
  if (!canCreateAccountContact(user)) return contacts;
  const state = getAccountContactState(contacts, user);
  if (state.accountContact && !state.emailDuplicates.length) return contacts;
  return saveAccountContactState(contacts, user, state);
}


/**
 * Collects the account contact and its email duplicates for the signed-in user.
 * @param {Array} contacts - The contacts already loaded from the store.
 * @param {Object} user - The signed-in user.
 * @returns {Object} Account id, existing account contact and email duplicates.
 */
function getAccountContactState(contacts, user) {
  const accountId = getAccountContactId(user.uid);
  return {
    accountId,
    accountContact: findContactById(contacts, accountId),
    emailDuplicates: findAccountEmailDuplicates(contacts, user.email, accountId),
  };
}


/**
 * Saves the merged account contact and replaces its duplicates in the list.
 * @param {Array} contacts - The contacts already loaded from the store.
 * @param {Object} user - The signed-in user.
 * @param {Object} state - Account id, existing account contact and duplicates.
 * @returns {Promise<Array>} The contacts with the saved account contact.
 */
async function saveAccountContactState(contacts, user, state) {
  const account = getAccountContactData(
    user,
    state.accountContact || state.emailDuplicates[0],
  );
  const duplicateIds = state.emailDuplicates.map((contact) => contact.id);
  const savedAccount = await upsertAccountContactInStore(
    state.accountId,
    duplicateIds,
    account,
  );
  return replaceAccountContact(contacts, duplicateIds, savedAccount);
}


/**
 * Checks whether a signed-in, non-guest user can own an account contact.
 * @param {Object} user - The stored user, if any.
 * @returns {boolean} True when an account contact may be created.
 */
function canCreateAccountContact(user) {
  return Boolean(
    user?.uid &&
    user?.email &&
    !guestUserTypes.includes(user.type),
  );
}


/**
 * Builds the deterministic contact id for a user account.
 * @param {string} uid - The Firebase user id.
 * @returns {string} The prefixed account contact id.
 */
function getAccountContactId(uid) {
  return accountContactPrefix + uid;
}


/**
 * Finds one contact by its id.
 * @param {Array} contacts - The contacts to search in.
 * @param {string} contactId - The id to look for.
 * @returns {Object|undefined} The matching contact, if any.
 */
function findContactById(contacts, contactId) {
  return contacts.find((contact) => contact.id === contactId);
}


/**
 * Finds contacts that share the account email but are not the account contact.
 * @param {Array} contacts - The contacts to search in.
 * @param {string} email - The email of the signed-in user.
 * @param {string} accountId - The id of the account contact.
 * @returns {Array} All duplicate contacts with the same email.
 */
function findAccountEmailDuplicates(contacts, email, accountId) {
  const normalizedEmail = normalizeContactEmail(email);
  return contacts.filter(
    (contact) =>
      contact.id !== accountId &&
      normalizeContactEmail(contact.email) === normalizedEmail,
  );
}


/**
 * Normalizes an email for comparison by trimming and lowercasing it.
 * @param {string} email - The raw email value.
 * @returns {string} The normalized email.
 */
function normalizeContactEmail(email) {
  return normalizeText(email).toLowerCase();
}


/**
 * Builds the account contact data, preferring values of an existing contact.
 * @param {Object} user - The signed-in user.
 * @param {Object} [existingContact] - A previously stored matching contact.
 * @returns {Object} Name, email, phone and color for the account contact.
 */
function getAccountContactData(user, existingContact) {
  return {
    name: existingContact?.name || user.name,
    email: existingContact?.email || user.email,
    phone: existingContact?.phone || "",
    color: existingContact?.color || getAccountContactColor(user.uid),
  };
}


/**
 * Picks a stable avatar color derived from the user id.
 * @param {string} uid - The Firebase user id.
 * @returns {string} A hex color from the contact palette.
 */
function getAccountContactColor(uid) {
  const colorIndex = [...uid].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return contactColors[colorIndex % contactColors.length];
}


/**
 * Saves the account contact in Firestore or localStorage, removing duplicates.
 * @param {string} accountId - The id of the account contact.
 * @param {string[]} duplicateIds - Ids of duplicate contacts to replace.
 * @param {Object} contact - The account contact data to save.
 * @returns {Promise<Object>} The saved account contact.
 */
async function upsertAccountContactInStore(accountId, duplicateIds, contact) {
  if (isContactFirestoreReady()) {
    return window.joinFirebaseContacts.upsertAccountContact(
      accountId,
      duplicateIds,
      contact,
    );
  }
  return upsertLocalAccountContact(accountId, duplicateIds, contact);
}


/**
 * Replaces the account contact and its duplicates inside localStorage.
 * @param {string} accountId - The id of the account contact.
 * @param {string[]} duplicateIds - Ids of duplicate contacts to replace.
 * @param {Object} contact - The account contact data to save.
 * @returns {Object} The saved account contact.
 */
function upsertLocalAccountContact(accountId, duplicateIds, contact) {
  const accountContact = { id: accountId, ...contact };
  const replacedIds = new Set([accountId, ...duplicateIds]);
  const contacts = getLocalContacts().filter(
    (currentContact) => !replacedIds.has(currentContact.id),
  );
  saveLocalContacts([...contacts, accountContact]);
  return accountContact;
}


/**
 * Returns the contact list with duplicates removed and the account contact added.
 * @param {Array} contacts - The contacts already loaded from the store.
 * @param {string[]} duplicateIds - Ids of duplicate contacts to remove.
 * @param {Object} accountContact - The saved account contact.
 * @returns {Array} The updated contact list.
 */
function replaceAccountContact(contacts, duplicateIds, accountContact) {
  const replacedIds = new Set([accountContact.id, ...duplicateIds]);
  const otherContacts = contacts.filter(
    (contact) => !replacedIds.has(contact.id),
  );
  return [...otherContacts, accountContact];
}


/**
 * Checks whether a contact represents the signed-in user's own account.
 * @param {Object} contact - The contact to check.
 * @returns {boolean} True when the contact belongs to the signed-in user.
 */
function isOwnAccountContact(contact) {
  const user = getStoredUser();
  if (!canCreateAccountContact(user) || !contact) return false;
  return contact.id === getAccountContactId(user.uid) ||
    normalizeContactEmail(contact.email) === normalizeContactEmail(user.email);
}


/**
 * Creates one contact in Firestore or localStorage and returns it with an id.
 * @param {Object} contact - Contact data to create.
 * @returns {Promise<Object>} Created contact including its store id.
 */
async function createContactInStore(contact) {
  if (isContactFirestoreReady())
    return window.joinFirebaseContacts.createContact(contact);
  const newContact = { id: Date.now().toString(), ...contact };
  saveLocalContacts([...getLocalContacts(), newContact]);
  return newContact;
}


/**
 * Updates one contact and its affected task references together.
 * @param {string} contactId - Id of the contact to update.
 * @param {Object} contact - Updated contact data.
 * @param {Object[]} [updatedTasks=[]] - Tasks with synchronized assignee references.
 * @returns {Promise<void>} Resolves after contact and task updates complete.
 */
async function updateContactInStore(contactId, contact, updatedTasks = []) {
  if (isContactFirestoreReady()) {
    await window.joinFirebaseContacts.updateContact(contactId, contact, updatedTasks);
  } else {
    updateLocalContactWithTasks(contactId, contact, updatedTasks);
  }
  if (updatedTasks.length) clearTasksCache();
}


/**
 * Updates a local contact and task references with rollback on failure.
 * @param {string} contactId - Id of the local contact to update.
 * @param {Object} contact - Updated contact data.
 * @param {Object[]} updatedTasks - Tasks with synchronized references.
 */
function updateLocalContactWithTasks(contactId, contact, updatedTasks) {
  const contacts = getLocalContacts();
  const tasks = getStoredTasks();
  try {
    saveLocalContacts(contacts.map((item) =>
      item.id === contactId ? { ...item, ...contact } : item,
    ));
    saveUpdatedLocalContactTasks(tasks, updatedTasks);
  } catch (error) {
    saveLocalContacts(contacts);
    saveStoredTasks(tasks);
    throw error;
  }
}


/**
 * Replaces only tasks affected by the contact edit.
 * @param {Object[]} tasks - Complete locally stored task list.
 * @param {Object[]} updatedTasks - Tasks changed by the contact edit.
 */
function saveUpdatedLocalContactTasks(tasks, updatedTasks) {
  const updates = new Map(updatedTasks.map((task) => [task.id, task]));
  saveStoredTasks(tasks.map((task) => updates.get(task.id) || task));
}


/**
 * Deletes a contact together with its cleaned task assignments.
 * @param {string} contactId - The contact document id.
 * @param {Object[]} updatedTasks - Tasks without the deleted assignee.
 * @returns {Promise<void>} Resolves after the atomic deletion completes.
 */
async function deleteContactFromStore(contactId, updatedTasks) {
  if (isContactFirestoreReady()) {
    await window.joinFirebaseContacts.deleteContact(contactId, updatedTasks);
    return;
  }
  deleteLocalContactWithTasks(contactId, updatedTasks);
}


/**
 * Loads and sorts contacts, returning an empty list when the store is unavailable.
 * @param {Function} [onAccountContactError] - Handles account-contact synchronization errors.
 * @param {Function} [onLoadError] - Handles failure of the complete contact load.
 * @returns {Promise<Object[]>} Sorted contacts or an empty fallback.
 */
async function loadSortedContactsSafely(onAccountContactError, onLoadError) {
  try {
    const contacts = await loadContactsFromStore(onAccountContactError);
    return sortContactsByName(contacts);
  } catch (error) {
    if (onLoadError) onLoadError(error);
    return [];
  }
}


/**
 * Returns an alphabetically sorted contact copy.
 * @param {Object[]} contacts - Contacts to sort by display name.
 * @returns {Object[]} Alphabetically sorted copy.
 */
function sortContactsByName(contacts) {
  return [...contacts].sort((a, b) => a.name.localeCompare(b.name));
}


/**
 * Applies local task cleanup before deleting the contact and rolls back on error.
 * @param {string} contactId - Id of the local contact to delete.
 * @param {Object[]} updatedTasks - Tasks without the deleted assignee.
 */
function deleteLocalContactWithTasks(contactId, updatedTasks) {
  const contacts = getLocalContacts();
  const tasks = getStoredTasks();
  const updates = new Map(updatedTasks.map((task) => [task.id, task]));
  try {
    saveStoredTasks(tasks.map((task) => updates.get(task.id) || task));
    saveLocalContacts(contacts.filter((contact) => contact.id !== contactId));
  } catch (error) {
    saveStoredTasks(tasks);
    throw error;
  }
}


/**
 * Checks whether the Firestore contact API is loaded and available.
 * @returns {boolean} True when the Firestore contact adapter is ready.
 */
function isContactFirestoreReady() {
  return Boolean(window.joinFirebaseContacts);
}


/**
 * Reads and parses the stored contacts from localStorage.
 * @returns {Object[]} Locally stored contacts or an empty list.
 */
function getLocalContacts() {
  return getStoredJson(contactStorageKey, []);
}


/**
 * Writes the given contact list as JSON into localStorage.
 * @param {Object[]} contacts - Complete contact collection to persist.
 */
function saveLocalContacts(contacts) {
  saveStoredJson(contactStorageKey, contacts);
}
