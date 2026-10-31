/**
 * Wires the help page back button without inline JavaScript.
 */
function initHelpPage() {
  document
    .getElementById("helpBackButton")
    ?.addEventListener("click", handleHelpBackClick);
}


/**
 * Returns to the previous document or falls back to the summary page.
 */
function handleHelpBackClick() {
  if (window.history.length > 1) window.history.back();
  else navigateToPage("summary");
}
