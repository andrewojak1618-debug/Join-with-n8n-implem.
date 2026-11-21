document.addEventListener("click", handlePasswordToggle);
document.addEventListener("input", resetEmptyPassword);


/**
 * Toggles only the password field controlled by the activated button.
 * @param {MouseEvent} event - Click or keyboard activation event.
 */
function handlePasswordToggle(event) {
  const button = event.target.closest(".password-toggle");
  if (!button) return;
  const input = document.getElementById(button.getAttribute("aria-controls"));
  if (!input.value) return;
  setPasswordVisibility(input, button, input.type === "password");
}


/**
 * Restores masking when a password is cleared before entering a new value.
 * @param {InputEvent} event - Input change within an authentication form.
 */
function resetEmptyPassword(event) {
  const input = event.target;
  const button = input.parentElement?.querySelector(".password-toggle");
  if (!button || input.value) return;
  setPasswordVisibility(input, button, false);
}


/**
 * Updates the field, accessible action and original Figma icon together.
 * @param {HTMLInputElement} input - Password input to update.
 * @param {HTMLButtonElement} button - Associated visibility control.
 * @param {boolean} visible - Whether to display the password as text.
 */
function setPasswordVisibility(input, button, visible) {
  input.type = visible ? "text" : "password";
  button.setAttribute("aria-pressed", String(visible));
  button.setAttribute("aria-label", visible ? "Hide password" : "Show password");
  const icon = visible ? "visibility.svg" : "visibility_off.svg";
  button.querySelector("img").src = `./components/assets/img/icons/${icon}`;
}
