/**
 * Renders user data shared by every authenticated application page.
 */
function initAppUser() {
  const user = getStoredUser();
  if (!user) return;
  setElementText("summaryUserInitials", getInitials(getAppUserDisplayName(user)));
}


/**
 * Returns the display name used by shared application UI.
 * @param {Object} user - The currently authenticated user.
 * @returns {string} A user-facing name with a guest fallback.
 */
function getAppUserDisplayName(user) {
  return user.name || "Guest";
}
