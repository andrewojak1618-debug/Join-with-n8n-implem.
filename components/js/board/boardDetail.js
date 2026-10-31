let boardDetailContacts = [];


/**
 * Shows detail subtasks as checkable items.
 *
 * @param {Object} task - The task whose subtasks are displayed.
 */
function renderBoardDetailSubtasks(task) {
  const container = getElement("boardTaskDetailSubtasks");
  const subtasks = getNormalizedBoardSubtasks(task.subtasks);
  container.innerHTML = subtasks.length
    ? subtasks
        .map(getBoardDetailSubtaskViewData)
        .map(getBoardDetailSubtaskTemplate)
        .join("")
    : '<span class="board-detail-empty">No subtasks</span>';
}


/**
 * Persists one checked state change and refreshes the open detail view.
 *
 * @param {Event} event - Change event from the subtask checkbox list.
 */
async function handleBoardDetailSubtaskChange(event) {
  if (!event.target.matches("[data-detail-subtask-index]")) return;
  const task = getActiveBoardTask();
  if (!task) return;
  const updatedTask = getTaskWithToggledSubtask(task, event.target);
  try {
    await updateTaskInStore(updatedTask);
    await refreshBoardAfterEdit(updatedTask.id);
  } catch (error) {
    event.target.checked = !event.target.checked;
    showTimedFeedback("boardToast", "Subtask could not be updated.");
  }
}


/**
 * Returns a task copy with one subtask done state flipped to the checkbox.
 *
 * @param {Object} task - The currently open task.
 * @param {HTMLInputElement} checkbox - The toggled subtask checkbox.
 * @returns {Object} Updated task ready to be stored.
 */
function getTaskWithToggledSubtask(task, checkbox) {
  const index = Number(checkbox.dataset.detailSubtaskIndex);
  const subtasks = getNormalizedBoardSubtasks(task.subtasks);
  subtasks[index] = { ...subtasks[index], done: checkbox.checked };
  return { ...task, subtasks };
}


/**
 * Normalizes stored subtasks from legacy strings or objects to one shape.
 *
 * @param {Array} subtasks - Raw subtasks from the task store.
 * @returns {Object[]} Subtasks with title and done flag, empty titles dropped.
 */
function getNormalizedBoardSubtasks(subtasks) {
  if (!Array.isArray(subtasks)) return [];
  return subtasks
    .map((subtask) =>
      typeof subtask === "string"
        ? { title: subtask.trim(), done: false }
        : { title: normalizeText(subtask?.title), done: Boolean(subtask?.done) },
    )
    .filter((subtask) => subtask.title);
}


/**
 * Loads contacts and renders them as options into the assignee dropdown panel.
 *
 * @param {Array|string} assignedTo - Current or legacy task assignments.
 */
async function renderBoardEditAssignees(assignedTo) {
  const container = getElement("boardEditAssigneesPanel");
  boardDetailContacts = await loadSortedContactsSafely();
  container.innerHTML = boardDetailContacts.length
    ? boardDetailContacts
        .map((contact) => getAssigneeOptionViewData(
          contact,
          isBoardAssigneeSelected(contact, assignedTo),
        ))
        .map(getBoardEditAssigneeTemplate)
        .join("")
    : '<span class="board-detail-empty">No contacts available.</span>';
  bindBoardEditAssigneesDropdown();
  setBoardEditAssigneesOpen(false);
  updateBoardEditAssigneesSelection();
}


/**
 * @returns {Object[]} The full contact objects for all checked contacts.
 */
function getBoardEditedAssigneesFromContacts() {
  return [
    ...getElement("boardEditAssigneesPanel").querySelectorAll("input:checked"),
  ]
    .map((input) => getBoardDetailContactById(input.value))
    .filter(Boolean);
}


/**
 * Finds one contact loaded for the board edit dropdown.
 * @param {string} contactId - Contact id stored by the checkbox.
 * @returns {Object|undefined} Matching contact if it still exists.
 */
function getBoardDetailContactById(contactId) {
  return boardDetailContacts.find((contact) => contact.id === contactId);
}


/**
 * Wires the edit assignee dropdown button and the outside click handling once.
 */
function bindBoardEditAssigneesDropdown() {
  const button = getElement("boardEditAssigneesButton");
  if (button.dataset.dropdownReady === "true") return;
  button.addEventListener("click", toggleBoardEditAssigneesDropdown);
  document.addEventListener("click", closeBoardEditAssigneesOnOutsideClick);
  getElement("boardEditAssigneesPanel").addEventListener("change", updateBoardEditAssigneesSelection);
  button.dataset.dropdownReady = "true";
}


/**
 * Opens or closes the edit assignee dropdown from the trigger button.
 */
function toggleBoardEditAssigneesDropdown() {
  setBoardEditAssigneesOpen(getElement("boardEditAssigneesPanel").hidden);
}


/**
 * Closes the dropdown when the user clicks outside of the component.
 *
 * @param {MouseEvent} event - Document click event.
 */
function closeBoardEditAssigneesOnOutsideClick(event) {
  const dropdown = getElement("boardEditAssigneesDropdown");
  if (dropdown && !dropdown.contains(event.target))
    setBoardEditAssigneesOpen(false);
}


/**
 * Applies the visual and accessibility state for the edit assignee dropdown.
 *
 * @param {boolean} isOpen - True to open, false to close the dropdown.
 */
function setBoardEditAssigneesOpen(isOpen) {
  getElement("boardEditAssigneesDropdown").classList.toggle("is-open", isOpen);
  getElement("boardEditAssigneesPanel").hidden = !isOpen;
  getElement("boardEditAssigneesButton").setAttribute("aria-expanded", String(isOpen));
}


/**
 * Shows the checked contacts as avatar chips below the dropdown.
 */
function updateBoardEditAssigneesSelection() {
  const assignees = getBoardEditedAssigneesFromContacts();
  renderBoardEditAssigneeChips(assignees);
}


const maxVisibleBoardEditAssignees = 4;


/**
 * Shows the selected contacts as colored initials avatars.
 * Caps the visible avatars and adds a "+N" chip for the rest.
 * @param {Object[]} assignees - Selected contact references.
 */
function renderBoardEditAssigneeChips(assignees) {
  const { visible, overflowCount } = getVisibleAssigneeChips(
    assignees, maxVisibleBoardEditAssignees,
  );
  const chips = visible
    .map(
      (item) =>
        `<span class="board-detail-assignee__avatar" style="background-color: ${escapeHtmlText(item.color || "var(--color-primary-auth)")}">${getInitials(item.name)}</span>`,
    )
    .join("");
  getElement("boardEditAssigneesSelected").innerHTML = chips + getBoardEditAssigneeOverflowTemplate(overflowCount);
}


/**
 * Returns a muted "+N" avatar for edit-form assignees hidden beyond the visible limit.
 *
 * @param {number} overflowCount - Number of assignees not shown directly.
 * @returns {string} HTML markup for the overflow avatar, or an empty string.
 */
function getBoardEditAssigneeOverflowTemplate(overflowCount) {
  if (!overflowCount) return "";
  return `<span class="board-detail-assignee__avatar board-detail-assignee__avatar--overflow">+${overflowCount}</span>`;
}
