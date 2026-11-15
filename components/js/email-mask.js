hydrateHtmlIncludes(document.body);
const requestForm = document.querySelector("#request-form");
const requiredMessages = {
  name: "Please enter your name.",
  email: "Please enter your email address.",
  subject: "Please enter a subject.",
  message: "Please describe your request."
};

requestForm.addEventListener("submit", openRequestDraft);
requestForm.addEventListener("input", (event) => {
  if (event.target.hasAttribute("aria-invalid")) validateRequestField(event.target);
});


/**
 * Shows a field-specific error and associates it with the input.
 * @param {HTMLElement} field - Request input or textarea to validate.
 */
function validateRequestField(field) {
  const error = document.getElementById(field.getAttribute("aria-describedby"));
  const message = field.value.trim() ? "" : requiredMessages[field.name];
  error.textContent = message || (field.validity.typeMismatch ? "Please enter a valid email address." : "");
  error.hidden = !error.textContent;
  if (error.hidden) field.removeAttribute("aria-invalid");
  else field.setAttribute("aria-invalid", "true");
  return error.hidden;
}


/**
 * Validates every field and focuses the first one needing a correction.
 * @param {HTMLFormElement} form - Request form to validate.
 */
function validateRequestForm(form) {
  const fields = Array.from(form.querySelectorAll("[required]"));
  const invalid = fields.filter((field) => !validateRequestField(field));
  invalid[0]?.focus();
  return invalid.length === 0;
}


/**
 * Opens an addressed mail draft after validating the request fields.
 * @param {SubmitEvent} event - Submission of the request form.
 */
function openRequestDraft(event) {
  event.preventDefault();
  if (!validateRequestForm(event.currentTarget)) return;
  const fields = new FormData(event.currentTarget);
  const subject = fields.get("subject").trim();
  const body = [fields.get("message").trim(), "", fields.get("name").trim(), fields.get("email").trim()].join("\r\n");
  window.location.href = "mailto:ai.viralreelcreator@gmail.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
}
