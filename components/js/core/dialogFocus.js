/** Tracks keyboard focus while a Join dialog is open. */
let activeDialogFocus = null;

/**
 * Returns enabled tab stops in their current display order.
 * @param {HTMLElement} dialog - Dialog containing the controls.
 */
function dialogTabStops(dialog) {
  const controls = dialog.querySelectorAll("a[href], button, input, select, textarea, [tabindex]");
  return Array.from(controls).filter(control =>
    control.tabIndex >= 0 && !control.matches(":disabled") &&
    control.getClientRects().length && getComputedStyle(control).visibility === "visible"
  );
}

/**
 * Moves focus into the dialog and remembers how to find its opener after a render.
 * @param {HTMLElement} dialog - Open dialog.
 * @param {Function} findOpener - Finds the control that opened the dialog.
 * @param {Function} close - Closes the dialog.
 */
function startDialogFocus(dialog, findOpener, close) {
  activeDialogFocus = { dialog, findOpener, close };
  document.addEventListener("keydown", handleDialogFocusKey, true);
  dialogTabStops(dialog)[0]?.focus();
}

/**
 * Restores focus after the matching dialog has closed.
 * @param {HTMLElement} dialog - Dialog being closed.
 */
function finishDialogFocus(dialog) {
  if (activeDialogFocus?.dialog !== dialog) return;
  const { findOpener } = activeDialogFocus;
  activeDialogFocus = null;
  document.removeEventListener("keydown", handleDialogFocusKey, true);
  findOpener()?.focus();
}

/**
 * Handles modal dismissal and wraps forward or backward keyboard navigation.
 * @param {KeyboardEvent} event - Keyboard interaction in the active dialog.
 */
function handleDialogFocusKey(event) {
  const { dialog, close } = activeDialogFocus;
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    close();
  } else if (event.key === "Tab") {
    const stops = dialogTabStops(dialog);
    const edge = event.shiftKey ? stops[0] : stops.at(-1);
    if (document.activeElement !== edge && stops.includes(document.activeElement)) return;
    event.preventDefault();
    (event.shiftKey ? stops.at(-1) : stops[0])?.focus();
  }
}
