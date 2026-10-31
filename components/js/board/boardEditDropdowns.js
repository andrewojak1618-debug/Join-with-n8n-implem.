let boardEditDropdownsReady = false;


/**
 * Prepares every single-select dropdown of the board edit form.
 */
function initBoardEditDropdowns() {
  getBoardEditDropdowns().forEach(bindBoardEditDropdown);
  if (boardEditDropdownsReady) return;
  document.addEventListener("click", closeBoardEditDropdownsOnOutsideClick);
  boardEditDropdownsReady = true;
}


/**
 * Wires the toggle button and option clicks of one dropdown once.
 * @param {HTMLElement} dropdown - The dropdown container element.
 */
function bindBoardEditDropdown(dropdown) {
  if (dropdown.dataset.eventsReady === "true") return;
  getBoardEditDropdownButton(dropdown).addEventListener("click", () =>
    toggleBoardEditDropdown(dropdown),
  );
  bindBoardEditDropdownOptions(dropdown);
  dropdown.dataset.eventsReady = "true";
}


/**
 * Registers the click handling for every static option of one dropdown.
 * @param {HTMLElement} dropdown - The dropdown container element.
 */
function bindBoardEditDropdownOptions(dropdown) {
  getBoardEditDropdownOptions(dropdown).forEach((option) => {
    option.addEventListener("click", () =>
      selectBoardEditDropdownOption(dropdown, option),
    );
  });
}


/**
 * Applies a picked option to the hidden input, button text and option list.
 * @param {HTMLElement} dropdown - The dropdown container element.
 * @param {HTMLElement} option - The clicked option.
 */
function selectBoardEditDropdownOption(dropdown, option) {
  getBoardEditDropdownInput(dropdown).value = option.dataset.value;
  getBoardEditDropdownButton(dropdown).textContent = option.textContent.trim();
  markBoardEditDropdownOption(dropdown, option);
  setBoardEditDropdownOpen(dropdown, false);
  getBoardEditDropdownInput(dropdown).dispatchEvent(new Event("change"));
}


/**
 * Highlights the picked option inside one dropdown panel.
 * @param {HTMLElement} dropdown - The dropdown container element.
 * @param {HTMLElement|null} selectedOption - The option to mark, or null to clear.
 */
function markBoardEditDropdownOption(dropdown, selectedOption) {
  getBoardEditDropdownOptions(dropdown).forEach((option) => {
    option.classList.toggle("is-selected", option === selectedOption);
  });
}


/**
 * Opens or closes one dropdown from its trigger button.
 * @param {HTMLElement} dropdown - The dropdown container element.
 */
function toggleBoardEditDropdown(dropdown) {
  setBoardEditDropdownOpen(dropdown, getBoardEditDropdownPanel(dropdown).hidden);
}


/**
 * Closes every open dropdown when the user clicks outside of it.
 * @param {MouseEvent} event - Document click event.
 */
function closeBoardEditDropdownsOnOutsideClick(event) {
  getBoardEditDropdowns().forEach((dropdown) => {
    if (!dropdown.contains(event.target)) setBoardEditDropdownOpen(dropdown, false);
  });
}


/**
 * Applies the visual and accessibility state for one dropdown.
 * @param {HTMLElement} dropdown - The dropdown container element.
 * @param {boolean} isOpen - True to open, false to close the dropdown.
 */
function setBoardEditDropdownOpen(dropdown, isOpen) {
  dropdown.classList.toggle("is-open", isOpen);
  getBoardEditDropdownPanel(dropdown).hidden = !isOpen;
  getBoardEditDropdownButton(dropdown).setAttribute("aria-expanded", String(isOpen));
}


/**
 * Shows the stored input values in the dropdown buttons after the form is filled.
 */
function syncBoardEditDropdowns() {
  getBoardEditDropdowns().forEach(syncBoardEditDropdown);
}


/**
 * Aligns button text and highlighted option with the hidden input value.
 * @param {HTMLElement} dropdown - The dropdown container element.
 */
function syncBoardEditDropdown(dropdown) {
  const value = getBoardEditDropdownInput(dropdown).value;
  const option = getBoardEditDropdownOptions(dropdown).find(
    (currentOption) => currentOption.dataset.value === value,
  );
  if (!option) return;
  getBoardEditDropdownButton(dropdown).textContent = option.textContent.trim();
  markBoardEditDropdownOption(dropdown, option);
}


/**
 * @returns {HTMLElement[]} All single-select dropdown containers of the edit form.
 */
function getBoardEditDropdowns() {
  return [...document.querySelectorAll("[data-board-edit-dropdown]")];
}


/**
 * @param {HTMLElement} dropdown - The dropdown container element.
 * @returns {HTMLElement} The button that toggles the dropdown.
 */
function getBoardEditDropdownButton(dropdown) {
  return dropdown.querySelector(".contact-dropdown__button");
}


/**
 * @param {HTMLElement} dropdown - The dropdown container element.
 * @returns {HTMLElement} The panel that lists the options.
 */
function getBoardEditDropdownPanel(dropdown) {
  return dropdown.querySelector(".contact-dropdown__panel");
}


/**
 * @param {HTMLElement} dropdown - The dropdown container element.
 * @returns {HTMLElement[]} All option buttons of the dropdown.
 */
function getBoardEditDropdownOptions(dropdown) {
  return [...dropdown.querySelectorAll("[data-value]")];
}


/**
 * @param {HTMLElement} dropdown - The dropdown container element.
 * @returns {HTMLElement} The hidden input that stores the picked value.
 */
function getBoardEditDropdownInput(dropdown) {
  return dropdown.querySelector('input[type="hidden"]');
}
