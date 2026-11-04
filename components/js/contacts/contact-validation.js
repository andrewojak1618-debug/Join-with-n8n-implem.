const contactFieldNames = ["Name", "Email", "Phone"];


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
