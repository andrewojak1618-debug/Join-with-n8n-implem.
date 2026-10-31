import {
  addDoc,
  collection,
  doc,
  getFirestore,
  getDocs,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const db = getFirestore();


/**
 * Loads all contacts from Firestore with the document id attached.
 * @returns {Promise<Object[]>} Firestore contacts including document ids.
 */
async function loadContacts() {
  const snapshot = await getDocs(collection(db, "contacts"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}


/**
 * Creates one contact in Firestore and adds server timestamps.
 * @param {Object} contact - Contact data to create.
 * @returns {Promise<Object>} Created contact including its document id.
 */
async function createContact(contact) {
  const contactRef = await addDoc(collection(db, "contacts"), {
    ...contact,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: contactRef.id, ...contact };
}


/**
 * Creates the account contact under a stable id and removes email duplicates.
 * @param {string} contactId - Stable document id for the account contact.
 * @param {string[]} duplicateIds - Duplicate contact ids to remove.
 * @param {Object} contact - Account contact data to store.
 * @returns {Promise<Object>} Existing or newly created account contact.
 */
async function upsertAccountContact(contactId, duplicateIds, contact) {
  return runTransaction(db, (transaction) =>
    saveAccountContact(transaction, db, contactId, duplicateIds, contact),
  );
}


/**
 * Creates the account contact inside a transaction when it is missing
 * and removes duplicates of the same account in the same step.
 * @param {Object} transaction - The running Firestore transaction.
 * @param {Object} db - The Firestore database instance.
 * @param {string} contactId - The id reserved for the account contact.
 * @param {string[]} duplicateIds - Ids of duplicate contacts to remove.
 * @param {Object} contact - The contact data to store when missing.
 * @returns {Promise<Object>} The existing or newly created contact.
 */
async function saveAccountContact(transaction, db, contactId, duplicateIds, contact) {
  const accountRef = doc(db, "contacts", contactId);
  const snapshot = await transaction.get(accountRef);
  if (!snapshot.exists()) transaction.set(accountRef, getNewContactData(contact));
  deleteDuplicateContacts(transaction, db, duplicateIds, contactId);
  return snapshot.exists()
    ? { id: snapshot.id, ...snapshot.data() }
    : { id: contactId, ...contact };
}


/**
 * Deletes every duplicate contact except the account contact itself.
 * @param {Object} transaction - The running Firestore transaction.
 * @param {Object} db - The Firestore database instance.
 * @param {string[]} duplicateIds - Ids of the duplicate contacts.
 * @param {string} accountId - The id of the contact to keep.
 */
function deleteDuplicateContacts(transaction, db, duplicateIds, accountId) {
  duplicateIds
    .filter((contactId) => contactId !== accountId)
    .forEach((contactId) => transaction.delete(doc(db, "contacts", contactId)));
}


/**
 * Adds the created and updated server timestamps to a new contact.
 * @param {Object} contact - The contact data entered by the user.
 * @returns {Object} The contact data ready to be stored in Firestore.
 */
function getNewContactData(contact) {
  return {
    ...contact,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}


/**
 * Updates one contact and affected task references in a single batch.
 * @param {string} contactId - Id of the contact document to update.
 * @param {Object} contact - Updated contact data.
 * @param {Object[]} [updatedTasks=[]] - Tasks with synchronized assignments.
 * @returns {Promise<void>} Resolves after the batch commits.
 */
async function updateContact(contactId, contact, updatedTasks = []) {
  const { id, ...contactData } = contact;
  const batch = writeBatch(db);
  batch.update(doc(db, "contacts", contactId), {
    ...contactData,
    updatedAt: serverTimestamp(),
  });
  updatedTasks.forEach((task) => queueTaskAssignmentUpdate(batch, db, task));
  await batch.commit();
}


/**
 * Deletes one contact and updates affected tasks in a single batch.
 * @param {string} contactId - The contact document id.
 * @param {Object[]} updatedTasks - Tasks without the deleted assignee.
 * @returns {Promise<void>} Resolves after the batch commits.
 */
async function deleteContact(contactId, updatedTasks) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "contacts", contactId));
  updatedTasks.forEach((task) => queueTaskAssignmentUpdate(batch, db, task));
  await batch.commit();
}


/**
 * Adds one cleaned task assignment update to a Firestore batch.
 * @param {Object} batch - Firestore write batch receiving the update.
 * @param {Object} db - Firestore database instance.
 * @param {Object} task - Task containing normalized assignments.
 */
function queueTaskAssignmentUpdate(batch, db, task) {
  batch.update(doc(db, "tasks", task.id), {
    assignedTo: window.getTaskAssigneeReferences(task.assignedTo),
    updatedAt: serverTimestamp(),
  });
}

window.joinFirebaseContacts = {
  loadContacts,
  createContact,
  upsertAccountContact,
  updateContact,
  deleteContact,
};
