let addTaskSubtasks = [];
let editingSubtaskIndex = -1;


/**
 * Wires the subtask input and list of the Add Task form.
 */
function initAddTaskSubtasks() {
  addTaskSubtasks = [];
  editingSubtaskIndex = -1;
  const input = getElement("taskSubtasks");
  if (!input) return;
  bindSubtaskInput(input);
  bindSubtaskButtons();
  bindSubtaskList();
  updateSubtaskInputMode();
  renderSubtaskList();
}


/**
 * Wires the icon switch and the Enter handling on the subtask input.
 *
 * @param {HTMLInputElement} input - The subtask text input.
 */
function bindSubtaskInput(input) {
  input.addEventListener("input", updateSubtaskInputMode);
  input.addEventListener("keydown", handleSubtaskInputKeydown);
}


/**
 * Wires the add, confirm and clear buttons of the subtask input.
 */
function bindSubtaskButtons() {
  getElement("taskSubtaskAdd").addEventListener("click", commitSubtaskFromInput);
  getElement("taskSubtaskConfirm").addEventListener("click", commitSubtaskFromInput);
  getElement("taskSubtaskClear").addEventListener("click", clearSubtaskInput);
}


/**
 * Wires click and keyboard handling for the rendered subtask list.
 */
function bindSubtaskList() {
  const list = getElement("taskSubtaskList");
  list.addEventListener("click", handleSubtaskListClick);
  list.addEventListener("keydown", handleSubtaskListKeydown);
}


/**
 * Adds a subtask on Enter without ever submitting the main task form.
 *
 * @param {KeyboardEvent} event - Keydown event of the subtask input.
 */
function handleSubtaskInputKeydown(event) {
  if (event.key !== "Enter") return;

  event.preventDefault();
  commitSubtaskFromInput();
}


/**
 * Reads the input, stores a non-empty subtask and clears the field.
 */
function commitSubtaskFromInput() {
  const input = getElement("taskSubtasks");
  const title = getTrimmedElementValue(input);
  if (!title) return;
  addTaskSubtasks.push({ title, done: false });
  input.value = "";
  updateSubtaskInputMode();
  renderSubtaskList();
  scrollToNewestSubtask();
  input.focus();
}


/**
 * Empties the input field only, without touching the stored subtasks.
 */
function clearSubtaskInput() {
  const input = getElement("taskSubtasks");
  input.value = "";
  updateSubtaskInputMode();
  input.focus();
}


/**
 * Switches between the plus icon and the clear/confirm icons.
 */
function updateSubtaskInputMode() {
  const hasText = Boolean(getTrimmedInputValue("taskSubtasks"));
  getElement("taskSubtasksInputWrapper").classList.toggle("is-editing", hasText);
}


/**
 * Rerenders all subtask rows, including one in edit mode if active.
 */
function renderSubtaskList() {
  getElement("taskSubtaskList").innerHTML = addTaskSubtasks
    .map(renderSubtaskTemplate)
    .join("");
}


/**
 * Selects the view or edit template for one subtask row.
 * @param {Object} subtask - Subtask data to render.
 * @param {number} index - Position of the subtask in the task.
 * @returns {string} HTML markup for the current subtask state.
 */
function renderSubtaskTemplate(subtask, index) {
  return index === editingSubtaskIndex
    ? getSubtaskEditTemplate(subtask, index)
    : getSubtaskItemTemplate(subtask, index);
}


/** Keeps a newly added fourth or later subtask visible inside the list. */
function scrollToNewestSubtask() {
  const list = getElement("taskSubtaskList");
  list.scrollTop = list.scrollHeight;
}


/**
 * Routes clicks on the edit, delete and save icons of a subtask row.
 *
 * @param {MouseEvent} event - Click event from the subtask list.
 */
function handleSubtaskListClick(event) {
  const button = event.target.closest("[data-subtask-action]");
  if (!button) return;
  const index = getSubtaskItemIndex(button);
  const action = button.dataset.subtaskAction;
  if (action === "edit") startSubtaskEdit(index);
  if (action === "delete") deleteSubtask(index);
  if (action === "save") saveEditedSubtask(index, getSubtaskEditValue(button));
}


/**
 * Saves an inline edit on Enter without submitting the main task form.
 *
 * @param {KeyboardEvent} event - Keydown event from the subtask list.
 */
function handleSubtaskListKeydown(event) {
  if (event.key !== "Enter" || !event.target.matches("[data-subtask-edit]")) return;
  event.preventDefault();
  const index = getSubtaskItemIndex(event.target);
  saveEditedSubtask(index, event.target.value);
}


/**
 * Switches one subtask row into inline edit mode.
 *
 * @param {number} index - Position of the subtask in the list.
 */
function startSubtaskEdit(index) {
  editingSubtaskIndex = index;
  renderSubtaskList();
  focusSubtaskEditInput();
}


/**
 * Focuses the inline edit input and places the cursor at the end.
 */
function focusSubtaskEditInput() {
  const input = getElement("taskSubtaskList").querySelector("[data-subtask-edit]");
  if (!input) return;
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}


/**
 * Removes one subtask and leaves a possible edit mode.
 *
 * @param {number} index - Position of the subtask in the list.
 */
function deleteSubtask(index) {
  addTaskSubtasks.splice(index, 1);
  editingSubtaskIndex = -1;
  renderSubtaskList();
}


/**
 * Stores the edited title, dropping the subtask when it was left empty.
 *
 * @param {number} index - Position of the subtask in the list.
 * @param {string} value - The edited title text.
 */
function saveEditedSubtask(index, value) {
  const title = normalizeText(value);
  if (!title) addTaskSubtasks.splice(index, 1);
  else addTaskSubtasks[index] = { ...addTaskSubtasks[index], title };
  editingSubtaskIndex = -1;
  renderSubtaskList();
}


/**
 * Reads the list position stored on the surrounding subtask row.
 *
 * @param {HTMLElement} element - Element inside a subtask row.
 * @returns {number} Index of the subtask in the list.
 */
function getSubtaskItemIndex(element) {
  return Number(element.closest("[data-subtask-index]").dataset.subtaskIndex);
}


/**
 * Reads the current text from the inline edit input of a subtask row.
 *
 * @param {HTMLElement} button - The save button inside the row.
 * @returns {string} The unsaved edited title.
 */
function getSubtaskEditValue(button) {
  return button.closest("[data-subtask-index]").querySelector("[data-subtask-edit]").value;
}


/**
 * Returns a copy of the collected subtasks for the new task object.
 */
function getAddTaskSubtasks() {
  return addTaskSubtasks.map((subtask) => ({ ...subtask }));
}


/**
 * Clears the subtask state after the form was reset or a task was created.
 */
function resetAddTaskSubtasks() {
  addTaskSubtasks = [];
  editingSubtaskIndex = -1;
  renderSubtaskList();
  updateSubtaskInputMode();
}
