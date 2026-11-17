/** Updates touch feedback during contact, including taps cancelled by scrolling.
 * @param {PointerEvent} event - Pointer interaction with a primary button.
 */
function updatePrimaryButtonPress(event) {
  if (event.pointerType !== "touch") return;
  const button = event.target.closest?.(".primary-check, .primary-plain");
  if (button) button.toggleAttribute("data-touch-pressed", event.type === "pointerdown");
}


for (const type of ["pointerdown", "pointerup", "pointercancel", "lostpointercapture"]) {
  document.addEventListener(type, updatePrimaryButtonPress);
}
