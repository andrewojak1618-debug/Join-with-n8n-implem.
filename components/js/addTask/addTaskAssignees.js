let addTaskContacts = [];
let selectedTaskAssignees = [];
let assigneeOutsideClickReady = false;


/**
 * Loads available contacts and prepares the multi-select assignee dropdown.
 */
async function initAddTaskAssignees() {
  addTaskContacts = await loadSortedContactsSafely();
  selectedTaskAssignees = [];
  renderAssigneeOptions();
  bindAssigneeDropdown();
  updateAssigneeSelection();
}


/**
 * Wires dropdown opening once and keeps the document outside-click listener unique.
 */
function bindAssigneeDropdown() {
  getElement("taskAssigneesButton").addEventListener("click", toggleAssigneeDropdown);
  getElement("taskAssigneesSearch").addEventListener("input", filterAssigneeOptions);
  getElement("taskAssigneesDropdown").addEventListener("keydown", handleAssigneeSearchKey);
  if (assigneeOutsideClickReady) return;
  document.addEventListener("click", closeAssigneeDropdownOnOutsideClick);
  assigneeOutsideClickReady = true;
}


/**
 * Renders all assignable contacts as checkbox options.
 */
function renderAssigneeOptions() {
  const panel = getElement("taskAssigneesPanel");
  panel.innerHTML = addTaskContacts.length
    ? addTaskContacts
        .map((contact) => getAssigneeOptionViewData(contact))
        .map(getAssigneeOptionTemplate)
        .join("")
    : '<p class="contact-dropdown__empty">No contacts available.</p>';
  panel.insertAdjacentHTML("beforeend", '<p class="contact-dropdown__empty" data-no-matches hidden>No matching contacts.</p>');
  panel.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", handleAssigneeChange);
  });
}


/**
 * Synchronizes selected checkbox ids with the in-memory selected contact list.
 */
function handleAssigneeChange() {
  selectedTaskAssignees = getCheckedAssigneeIds().map(getContactById).filter(Boolean);
  updateAssigneeSelection();
  handleAddTaskFormChange();
}


/**
 * @returns {string[]} Ids of all currently checked assignee options.
 */
function getCheckedAssigneeIds() {
  return [...getElement("taskAssigneesPanel").querySelectorAll("input:checked")]
    .map((input) => input.value);
}


/**
 * Finds one loaded contact by id.
 *
 * @param {string} contactId - The contact id stored on the checkbox.
 * @returns {Object|undefined} Matching contact, if it is still available.
 */
function getContactById(contactId) {
  return addTaskContacts.find((contact) => contact.id === contactId);
}


/**
 * Updates every visible part of the current assignee selection.
 */
function updateAssigneeSelection() {
  syncAssigneeOptionChecks();
  updateAssigneeButtonText();
  renderSelectedAssigneeChips();
}


/**
 * Keeps rendered checkboxes aligned with the in-memory assignee selection.
 */
function syncAssigneeOptionChecks() {
  const selectedIds = new Set(selectedTaskAssignees.map((contact) => contact.id));
  getElement("taskAssigneesPanel").querySelectorAll("input").forEach((input) => {
    input.checked = selectedIds.has(input.value);
  });
}


/**
 * Shows a compact selection summary inside the closed dropdown button.
 */
function updateAssigneeButtonText() {
  const count = selectedTaskAssignees.length;
  getElement("taskAssigneesButton").textContent = count
    ? `${count} contact${count === 1 ? "" : "s"} selected`
    : "Select contacts to assign";
}


const maxVisibleAssigneeChips = 4;


/**
 * Renders the selected contacts below the dropdown as small chips.
 * Caps the visible avatars and adds a "+N" chip for the rest.
 */
function renderSelectedAssigneeChips() {
  const { visible, overflowCount } = getVisibleAssigneeChips(
    selectedTaskAssignees, maxVisibleAssigneeChips,
  );
  const chips = visible
    .map(getAssigneeChipViewData)
    .map(getAssigneeChipTemplate)
    .join("");
  getElement("taskAssigneesSelected").innerHTML =
    chips + getAssigneeOverflowChipTemplate(overflowCount);
}


/**
 * Opens or closes the dropdown from the trigger button.
 */
function toggleAssigneeDropdown() {
  setAssigneeDropdownOpen(getElement("taskAssigneesPanel").hidden);
}


/**
 * Closes the dropdown when the user clicks outside of the component.
 *
 * @param {MouseEvent} event - Document click event.
 */
function closeAssigneeDropdownOnOutsideClick(event) {
  const dropdown = getElement("taskAssigneesDropdown");
  if (dropdown && !dropdown.contains(event.target)) setAssigneeDropdownOpen(false);
}


/**
 * Applies the visual and accessibility state for the assignee dropdown.
 *
 * @param {boolean} isOpen - True to open, false to close the dropdown.
 */
function setAssigneeDropdownOpen(isOpen) {
  const search = getElement("taskAssigneesSearch");
  if (search.hidden === !isOpen) return;
  search.value = "";
  search.hidden = !isOpen;
  filterAssigneeOptions();
  if (isOpen) search.focus();
  getElement("taskAssigneesDropdown").classList.toggle("is-open", isOpen);
  getElement("taskAssigneesPanel").hidden = !isOpen;
  getElement("taskAssigneesButton").setAttribute("aria-expanded", String(isOpen));
}


/** Filters the visible names without removing selected checkboxes. */
function filterAssigneeOptions() {
  const panel = getElement("taskAssigneesPanel");
  const query = getElement("taskAssigneesSearch").value.trim().toLowerCase();
  const options = panel.querySelectorAll(".contact-dropdown__option");
  options.forEach((option) => {
    const name = option.querySelector("span:not(.contact-dropdown__avatar)").textContent;
    option.hidden = !name.toLowerCase().includes(query);
  });
  panel.querySelector("[data-no-matches]").hidden =
    !options.length || !!panel.querySelector(".contact-dropdown__option:not([hidden])");
}


/**
 * Prevents submitting a search and returns focus to the trigger on Escape.
 * @param {KeyboardEvent} event - Keyboard interaction within the assignee dropdown.
 */
function handleAssigneeSearchKey(event) {
  if (getElement("taskAssigneesSearch").hidden) return;
  if (event.key === "Enter" && event.target.id === "taskAssigneesSearch") event.preventDefault();
  if (event.key !== "Escape") return;
  event.stopPropagation();
  setAssigneeDropdownOpen(false);
  getElement("taskAssigneesButton").focus();
}


/**
 * Clears selected assignees after form reset or successful task creation.
 */
function resetAddTaskAssignees() {
  selectedTaskAssignees = [];
  setAssigneeDropdownOpen(false);
  updateAssigneeSelection();
}


