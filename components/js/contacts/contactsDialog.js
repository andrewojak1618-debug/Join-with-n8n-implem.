const contactFieldNames = ["Name", "Email", "Phone"];


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
 * Reads the form values, shows a validation error and returns the values.
 * @param {string} prefix - The form field id prefix, e.g. "contactEdit".
 * @returns {Object|null} The entered values, or null when they are invalid.
 */
function getValidatedContactValues(prefix) {
  const values = getContactFormValues(prefix);
  const isValid = validateContactForm(prefix);
  setContactFormMessage(prefix, "");
  return isValid ? values : null;
}


/**
 * Adds blur and correction validation to one contact form.
 * @param {string} prefix - Id prefix shared by the contact form fields.
 */
function initContactFormValidation(prefix) {
  const form = document.getElementById(`${prefix}Form`);
  form.addEventListener("focusout", (event) => handleContactValidationEvent(event, prefix));
  form.addEventListener("input", (event) => handleContactValidationEvent(event, prefix));
}


/**
 * Validates a contact field on blur and while correcting an invalid value.
 * @param {FocusEvent|InputEvent} event - Form interaction to process.
 * @param {string} prefix - Id prefix shared by the contact form fields.
 */
function handleContactValidationEvent(event, prefix) {
  const fieldName = getContactFieldName(event.target.id, prefix);
  if (!fieldName) return;
  if (fieldName === "Phone" && event.type === "input") {
    event.target.value = sanitizePhoneNumber(event.target.value);
  }
  if (event.type === "input") setContactFormMessage(prefix, "");
  const shouldValidate = event.type === "focusout" || event.target.getAttribute("aria-invalid") === "true";
  if (shouldValidate) validateContactField(prefix, fieldName);
}


/**
 * Finds the configured suffix for a contact form field.
 * @param {string} fieldId - Full id of the interacted field.
 * @param {string} prefix - Contact form id prefix.
 * @returns {string|undefined} Matching contact field suffix.
 */
function getContactFieldName(fieldId, prefix) {
  return contactFieldNames.find((fieldName) => fieldId === `${prefix}${fieldName}`);
}


/**
 * Validates every required contact field.
 * @param {string} prefix - Contact form id prefix.
 * @returns {boolean} True when every contact field is valid.
 */
function validateContactForm(prefix) {
  return contactFieldNames.map((fieldName) => validateContactField(prefix, fieldName)).every(Boolean);
}


/**
 * Validates one contact field and renders its feedback.
 * @param {string} prefix - Contact form id prefix.
 * @param {string} fieldName - Configured contact field suffix.
 * @returns {boolean} True when the field is valid.
 */
function validateContactField(prefix, fieldName) {
  const field = document.getElementById(`${prefix}${fieldName}`);
  const message = getContactFieldError(
    fieldName,
    getTrimmedInputValue(`${prefix}${fieldName}`),
  );
  setContactFieldError(prefix, fieldName, message);
  return !message;
}


/**
 * Returns validation feedback for a single contact value.
 * @param {string} fieldName - Contact field suffix to validate.
 * @param {string} value - Normalized field value.
 * @returns {string} Validation message or an empty string.
 */
function getContactFieldError(fieldName, value) {
  if (fieldName === "Name") return getPersonNameError(value);
  if (fieldName === "Email") return isEmailAddressValid(value) ? "" : "Please enter a valid email address.";
  if (fieldName === "Phone") return getPhoneNumberError(value);
  return "";
}


/**
 * Returns validation feedback for one phone number.
 * @param {string} value - Normalized phone number input.
 * @returns {string} Validation feedback or an empty string.
 */
function getPhoneNumberError(value) {
  if (!value) return "Please enter a phone number.";
  if (!phoneNumberPattern.test(value)) return "Use only numbers and common phone symbols.";
  return isPhoneNumberValid(value) ? "" : "Enter at least 6 digits.";
}


/**
 * Updates one contact field's inline message and accessibility state.
 * @param {string} prefix - Contact form id prefix.
 * @param {string} fieldName - Contact field suffix to update.
 * @param {string} message - Validation message or an empty string.
 */
function setContactFieldError(prefix, fieldName, message) {
  const field = document.getElementById(`${prefix}${fieldName}`);
  field.setAttribute("aria-invalid", String(Boolean(message)));
  document.getElementById(`${prefix}${fieldName}Error`).textContent = message;
}


/**
 * Clears all client and save feedback in a contact form.
 * @param {string} prefix - Contact form id prefix.
 */
function resetContactFormValidation(prefix) {
  contactFieldNames.forEach((fieldName) => setContactFieldError(prefix, fieldName, ""));
  setContactFormMessage(prefix, "");
}


/**
 * Updates the form-level contact message.
 * @param {string} prefix - Contact form id prefix.
 * @param {string} message - Form-level message or an empty string.
 */
function setContactFormMessage(prefix, message) {
  document.getElementById(`${prefix}Error`).textContent = message;
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
 * @returns {Promise<void>} Resolves after local and Firebase names are synchronized.
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
 * @returns {Promise<void>} Resolves even when Firebase Auth is unavailable.
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
 * Reads the trimmed form values for the given dialog id prefix.
 * @param {string} idPrefix - Id prefix shared by the form fields.
 * @returns {{name: string, email: string, phone: string}} Normalized contact values.
 */
function getContactFormValues(idPrefix) {
  return Object.fromEntries(contactFieldNames.map((fieldName) => [
    fieldName.toLowerCase(),
    getTrimmedInputValue(idPrefix + fieldName),
  ]));
}


/**
 * Enables or disables the submit button of the given form.
 * @param {HTMLFormElement} form - Contact form containing the submit button.
 * @param {boolean} isDisabled - Whether the submit button should be disabled.
 */
function setSubmitButtonDisabled(form, isDisabled) {
  form.querySelector('button[type="submit"]').disabled = isDisabled;
}
