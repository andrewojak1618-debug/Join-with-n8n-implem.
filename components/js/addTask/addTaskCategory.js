let categoryOutsideClickReady = false;


/**
 * Prepares the single-select category dropdown of the add-task form.
 */
function initAddTaskCategory() {
  bindCategoryDropdown();
  bindCategoryOptions();
}


/**
 * Wires dropdown opening once and keeps the document outside-click listener unique.
 */
function bindCategoryDropdown() {
  getElement("taskCategoryButton").addEventListener("click", toggleCategoryDropdown);
  if (categoryOutsideClickReady) return;
  document.addEventListener("click", closeCategoryDropdownOnOutsideClick);
  categoryOutsideClickReady = true;
}


/**
 * Registers the click handling for every static category option.
 */
function bindCategoryOptions() {
  getElement("taskCategoryPanel").querySelectorAll("[data-category-value]").forEach((option) => {
    option.addEventListener("click", () => selectAddTaskCategory(option));
  });
}


/**
 * Applies a picked category to the hidden input, button text and option list.
 * @param {HTMLElement} option - The clicked category option.
 */
function selectAddTaskCategory(option) {
  getElement("taskCategory").value = option.dataset.categoryValue;
  getElement("taskCategoryButton").textContent = option.textContent.trim();
  markSelectedCategoryOption(option);
  setCategoryDropdownOpen(false);
  handleAddTaskValidationChange("taskCategory");
  handleAddTaskFormChange();
}


/**
 * Highlights the picked option inside the panel.
 * @param {HTMLElement|null} selectedOption - The option to mark, or null to clear.
 */
function markSelectedCategoryOption(selectedOption) {
  getElement("taskCategoryPanel").querySelectorAll("[data-category-value]").forEach((option) => {
    option.classList.toggle("is-selected", option === selectedOption);
  });
}


/**
 * Opens or closes the dropdown from the trigger button.
 */
function toggleCategoryDropdown() {
  setCategoryDropdownOpen(getElement("taskCategoryPanel").hidden);
}


/**
 * Closes the dropdown when the user clicks outside of the component.
 * @param {MouseEvent} event - Document click event.
 */
function closeCategoryDropdownOnOutsideClick(event) {
  const dropdown = getElement("taskCategoryDropdown");
  if (dropdown && !dropdown.contains(event.target)) setCategoryDropdownOpen(false);
}


/**
 * Applies the visual and accessibility state for the category dropdown.
 * @param {boolean} isOpen - True to open, false to close the dropdown.
 */
function setCategoryDropdownOpen(isOpen) {
  getElement("taskCategoryDropdown").classList.toggle("is-open", isOpen);
  getElement("taskCategoryPanel").hidden = !isOpen;
  getElement("taskCategoryButton").setAttribute("aria-expanded", String(isOpen));
}


/**
 * Clears the category selection after form reset or successful task creation.
 */
function resetAddTaskCategory() {
  getElement("taskCategory").value = "";
  getElement("taskCategoryButton").textContent = "Select task category";
  markSelectedCategoryOption(null);
  setCategoryDropdownOpen(false);
}


