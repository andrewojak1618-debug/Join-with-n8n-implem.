/**
 * Wires the edit dialog controls.
 */
function initContactEditEvents() {
  document.getElementById("contactEditButton").addEventListener("click", openContactEditDialog);
  document.getElementById("contactEditClose").addEventListener("click", closeContactEditDialog);
  document.getElementById("contactEditOverlay").addEventListener("click", handleContactOverlayClick);
  document.getElementById("contactEditForm").addEventListener("submit", handleContactEditSubmit);
  document.getElementById("contactEditDelete").addEventListener("click", handleContactEditDelete);
  initContactFormValidation("contactEdit");
}


/**
 * Wires the add dialog controls.
 */
function initContactAddEvents() {
  document.getElementById("contactAddButton").addEventListener("click", openContactAddDialog);
  document.getElementById("contactAddClose").addEventListener("click", closeContactAddDialog);
  document.getElementById("contactAddCancel").addEventListener("click", closeContactAddDialog);
  document.getElementById("contactAddOverlay").addEventListener("click", handleContactAddOverlayClick);
  document.getElementById("contactAddForm").addEventListener("submit", handleContactAddSubmit);
  initContactFormValidation("contactAdd");
}


/**
 * Opens the edit dialog prefilled with the active contact.
 */
function openContactEditDialog() {
  const contact = getActiveContact();
  if (!contact) return;
  fillContactEditForm(contact);
  resetContactFormValidation("contactEdit");
  document.getElementById("contactEditDelete").hidden =
    isOwnAccountContact(contact);
  document.getElementById("contactEditOverlay").hidden = false;
  closeContactMenu();
}


/**
 * Hides the edit contact dialog.
 */
function closeContactEditDialog() {
  document.getElementById("contactEditOverlay").hidden = true;
}


/**
 * Closes the dialog only when the dark backdrop itself is clicked.
 * @param {MouseEvent} event - Click event from the edit overlay.
 */
function handleContactOverlayClick(event) {
  if (event.target === document.getElementById("contactEditOverlay")) closeContactEditDialog();
}


/**
 * Writes the contact data into the edit form fields.
 * @param {Object} contact - Contact whose values fill the form.
 */
function fillContactEditForm(contact) {
  const avatar = document.getElementById("contactEditAvatar");
  avatar.textContent = getInitials(contact.name);
  avatar.style.backgroundColor = contact.color;
  document.getElementById("contactEditName").value = contact.name;
  document.getElementById("contactEditEmail").value = contact.email;
  document.getElementById("contactEditPhone").value = contact.phone;
}


/**
 * Validates the edit form and saves the contact while the submit button is disabled.
 * @param {SubmitEvent} event - Edit form submission event.
 * @returns {Promise<void>} Resolves after validation and saving finish.
 */
async function handleContactEditSubmit(event) {
  event.preventDefault();
  if (!getValidatedContactValues("contactEdit")) return;
  await submitContactForm(
    event.target,
    "contactEditError",
    "Contact could not be saved.",
    saveEditedContact,
  );
}


/**
 * Runs a save action with the submit button disabled and shows save errors.
 * @param {HTMLFormElement} form - The submitted contact form.
 * @param {string} errorId - The id of the error output element.
 * @param {string} failMessage - The message shown when saving fails.
 * @param {Function} action - The async save action to run.
 * @returns {Promise<void>} Resolves after the save attempt finishes.
 */
async function submitContactForm(form, errorId, failMessage, action) {
  setSubmitButtonDisabled(form, true);
  try {
    await action();
  } catch (error) {
    document.getElementById(errorId).textContent = failMessage;
  } finally {
    setSubmitButtonDisabled(form, false);
  }
}


/**
 * Combines the stored contact with the edited form values.
 * @param {Object} contact - Existing contact to extend with form values.
 * @returns {Object} Updated contact data.
 */
function getEditedContact(contact) {
  return { ...contact, ...getContactFormValues("contactEdit") };
}


/**
 * Updates the active contact, refreshes the page and closes the dialog.
 */
async function saveEditedContact() {
  const contact = getActiveContact();
  if (!contact) return;
  const updatedContact = getEditedContact(contact);
  const updatedTasks = await getTasksWithUpdatedContact(contact, updatedContact);
  await updateContactInStore(activeContactId, updatedContact, updatedTasks);
  const accountNameSynced = await syncStoredAccountContactName(contact, updatedContact);
  await initContacts();
  openContactDetail(activeContactId);
  closeContactEditDialog();
  showEditedContactFeedback(accountNameSynced);
}


/**
 * Keeps the signed-in account display name aligned with its own contact.
 * @param {Object} contact - Account contact before editing.
 * @param {Object} updatedContact - Account contact after editing.
 * @returns {Promise<boolean>} False when the Firebase account name could not be synchronized.
 */
async function syncStoredAccountContactName(contact, updatedContact) {
  if (!isOwnAccountContact(contact)) return true;
  const user = getStoredUser();
  if (!user) return true;
  const accountNameSynced = await updateFirebaseAccountNameSafely(updatedContact.name);
  saveStoredUser({ ...user, name: updatedContact.name });
  return accountNameSynced;
}


/**
 * Updates Firebase Auth when available without undoing the saved contact.
 * @param {string} name - New account display name.
 * @returns {Promise<boolean>} True when no update is needed or the update succeeds.
 */
async function updateFirebaseAccountNameSafely(name) {
  const updateDisplayName = window.joinFirebaseAuth?.updateUserDisplayName;
  if (!updateDisplayName) return true;
  try {
    await updateDisplayName(name);
    return true;
  } catch {
    return false;
  }
}


/**
 * Shows whether the contact and its Firebase account name both updated.
 * @param {boolean} accountNameSynced - Whether the Firebase display name was synchronized.
 */
function showEditedContactFeedback(accountNameSynced) {
  const message = accountNameSynced
    ? "Contact successfully edited"
    : "Contact edited, but the account name could not be synchronized.";
  showTimedFeedback("contactToast", message);
}


/**
 * Deletes the active contact from the edit dialog.
 */
function handleContactEditDelete() {
  closeContactEditDialog();
  deleteActiveContact();
}


/**
 * Opens the add dialog with cleared form fields.
 */
function openContactAddDialog() {
  document.getElementById("contactAddForm").reset();
  resetContactFormValidation("contactAdd");
  document.getElementById("contactAddOverlay").hidden = false;
}


/**
 * Hides the add contact dialog.
 */
function closeContactAddDialog() {
  document.getElementById("contactAddOverlay").hidden = true;
}


/**
 * Closes the add dialog only when the dark backdrop itself is clicked.
 * @param {MouseEvent} event - Click event from the add overlay.
 */
function handleContactAddOverlayClick(event) {
  if (event.target === document.getElementById("contactAddOverlay")) closeContactAddDialog();
}


/**
 * Validates the add form and creates the contact while the submit button is disabled.
 * @param {SubmitEvent} event - Add form submission event.
 * @returns {Promise<void>} Resolves after validation and creation finish.
 */
async function handleContactAddSubmit(event) {
  event.preventDefault();
  const values = getValidatedContactValues("contactAdd");
  if (!values) return;
  await submitContactForm(
    event.target,
    "contactAddError",
    "Contact could not be created.",
    () => createContactRecord(values),
  );
}


/**
 * Creates a new contact, saves it and opens its detail view.
 * @param {Object} values - Validated contact form values.
 * @returns {Promise<void>} Resolves after the contact is stored and displayed.
 */
async function createContactRecord(values) {
  const newContact = await createContactInStore({ color: getRandomContactColor(), ...values });
  await initContacts();
  openContactDetail(newContact.id);
  closeContactAddDialog();
  showTimedFeedback("contactToast", "Contact successfully created");
}


/**
 * Picks a random avatar color for a new contact.
 * @returns {string} One configured contact avatar color.
 */
function getRandomContactColor() {
  return contactColors[Math.floor(Math.random() * contactColors.length)];
}


/**
 * Enables or disables the submit button of the given form.
 * @param {HTMLFormElement} form - Contact form containing the submit button.
 * @param {boolean} isDisabled - Whether the submit button should be disabled.
 */
function setSubmitButtonDisabled(form, isDisabled) {
  form.querySelector('button[type="submit"]').disabled = isDisabled;
}
