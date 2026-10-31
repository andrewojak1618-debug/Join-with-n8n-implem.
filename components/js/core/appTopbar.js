let appTopbarDocumentEventsReady = false;


/**
 * Initializes the user menu in the shared application topbar.
 */
function initAppTopbar() {
  const menuButton = getElement("appTopbarMenuButton");
  const logoutButton = getElement("appTopbarLogoutButton");
  if (!menuButton || !logoutButton) return;
  menuButton.addEventListener("click", toggleAppTopbarMenu);
  logoutButton.addEventListener("click", handleAppTopbarLogout);
  bindAppTopbarDocumentEvents();
}


/**
 * Binds the document-wide close handlers for the user menu only once.
 */
function bindAppTopbarDocumentEvents() {
  if (appTopbarDocumentEventsReady) return;
  document.addEventListener("click", closeAppTopbarMenuOnOutsideClick);
  document.addEventListener("keydown", closeAppTopbarMenuOnEscape);
  appTopbarDocumentEventsReady = true;
}


/**
 * Opens or closes the user menu from the avatar button.
 */
function toggleAppTopbarMenu() {
  const menu = getElement("appTopbarMenu");
  if (!menu) return;
  setAppTopbarMenuOpen(menu.hidden);
}


/**
 * Closes the user menu when the user clicks outside of the topbar actions.
 *
 * @param {MouseEvent} event - Document click event.
 */
function closeAppTopbarMenuOnOutsideClick(event) {
  const userActions = document.querySelector(".summary-user-actions");
  if (userActions && !userActions.contains(event.target)) {
    setAppTopbarMenuOpen(false);
  }
}


/**
 * Closes the user menu on Escape and returns focus to the menu button.
 *
 * @param {KeyboardEvent} event - Document keydown event.
 */
function closeAppTopbarMenuOnEscape(event) {
  if (event.key !== "Escape" || !isAppTopbarMenuOpen()) return;
  setAppTopbarMenuOpen(false);
  getElement("appTopbarMenuButton").focus();
}


/**
 * Closes the menu and logs the user out of the application.
 */
async function handleAppTopbarLogout() {
  setAppTopbarMenuOpen(false);
  await handleLogout();
}


/**
 * Applies visibility, accessibility state and focus for the user menu.
 *
 * @param {boolean} isOpen - True to open, false to close the menu.
 */
function setAppTopbarMenuOpen(isOpen) {
  const menu = getElement("appTopbarMenu");
  const menuButton = getElement("appTopbarMenuButton");
  if (!menu || !menuButton) return;
  menu.hidden = !isOpen;
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute(
    "aria-label",
    isOpen ? "Close user menu" : "Open user menu",
  );
  if (isOpen) menu.querySelector("a, button").focus();
}


/**
 * @returns {boolean} True while the user menu is visible.
 */
function isAppTopbarMenuOpen() {
  const menu = getElement("appTopbarMenu");
  return Boolean(menu && !menu.hidden);
}
