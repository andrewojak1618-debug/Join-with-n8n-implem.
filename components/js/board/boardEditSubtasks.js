let boardEditSubtaskItems = [];
let boardEditSubtaskEditingIndex = -1;


/**
 * Loads the task subtasks into the edit state and renders the list.
 * @param {Array} subtasks - Raw subtasks stored on the task.
 */
function initBoardEditSubtasks(subtasks) {
  boardEditSubtaskItems = getNormalizedBoardSubtasks(subtasks);
  boardEditSubtaskEditingIndex = -1;
  getElement("boardTaskEditSubtaskInput").value = "";
  updateBoardEditSubtaskAddState();
  renderBoardEditSubtasks();
  bindBoardEditSubtaskControls();
}


/**
 * Wires the subtask input and list events once.
 */
function bindBoardEditSubtaskControls() {
  const input = getElement("boardTaskEditSubtaskInput");
  if (input.dataset.eventsReady === "true") return;
  input.addEventListener("keydown", handleBoardEditSubtaskInputKey);
  input.addEventListener("input", updateBoardEditSubtaskAddState);
  bindBoardEditSubtaskListEvents();
  bindBoardEditSubtaskAddButton();
  input.dataset.eventsReady = "true";
}


/**
 * Wires click and keyboard events of the editable subtask list.
 */
function bindBoardEditSubtaskListEvents() {
  const list = getElement("boardTaskEditSubtaskList");
  list.addEventListener("click", handleBoardEditSubtaskListClick);
  list.addEventListener("keydown", handleBoardEditSubtaskListKey);
}


/**
 * Wires the plus button that adds the typed subtask.
 */
function bindBoardEditSubtaskAddButton() {
  getElement("boardEditSubtaskAdd").addEventListener(
    "click",
    addBoardEditSubtask,
  );
}


/**
 * @param {string} title - Trimmed subtask title.
 * @returns {boolean} True when the title has at least four characters.
 */
function isValidBoardEditSubtaskTitle(title) {
  return title.length >= 4;
}


/**
 * Enables the plus button only while the input holds a valid title.
 */
function updateBoardEditSubtaskAddState() {
  getElement("boardEditSubtaskAdd").disabled = !isValidBoardEditSubtaskTitle(
    getTrimmedInputValue("boardTaskEditSubtaskInput"),
  );
}


/**
 * Adds a subtask on Enter without submitting the edit form.
 * @param {KeyboardEvent} event - Keydown event of the subtask input.
 */
function handleBoardEditSubtaskInputKey(event) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  addBoardEditSubtask();
}


/**
 * Appends a new open subtask when the input holds a valid title.
 */
function addBoardEditSubtask() {
  const input = getElement("boardTaskEditSubtaskInput");
  const title = getTrimmedElementValue(input);
  if (!isValidBoardEditSubtaskTitle(title)) return;
  boardEditSubtaskItems.push({ title, done: false });
  input.value = "";
  updateBoardEditSubtaskAddState();
  renderBoardEditSubtasks();
  input.focus();
}


/**
 * Starts editing, deletes or saves a subtask from the row buttons.
 * @param {MouseEvent} event - Click event inside the subtask list.
 */
function handleBoardEditSubtaskListClick(event) {
  const button = event.target.closest("[data-subtask-action]");
  if (!button) return;
  const index = Number(
    button.closest("[data-subtask-index]").dataset.subtaskIndex,
  );
  const action = button.dataset.subtaskAction;
  if (action === "save") return saveBoardEditSubtask(index);
  if (action === "edit") boardEditSubtaskEditingIndex = index;
  if (action === "delete") deleteBoardEditSubtask(index);
  renderBoardEditSubtasks();
}


/**
 * Removes one subtask and leaves edit mode when it was being edited.
 * @param {number} index - Position of the subtask to remove.
 */
function deleteBoardEditSubtask(index) {
  boardEditSubtaskItems.splice(index, 1);
  if (boardEditSubtaskEditingIndex === index) boardEditSubtaskEditingIndex = -1;
}


/**
 * Saves the inline edit on Enter without submitting the edit form.
 * @param {KeyboardEvent} event - Keydown event inside the subtask list.
 */
function handleBoardEditSubtaskListKey(event) {
  if (event.key !== "Enter" || !event.target.matches("[data-subtask-edit]"))
    return;
  event.preventDefault();
  saveBoardEditSubtask(boardEditSubtaskEditingIndex);
}


/**
 * Applies the edited title to the subtask and leaves edit mode.
 * @param {number} index - Position of the edited subtask.
 */
function saveBoardEditSubtask(index) {
  const input = getElement("boardTaskEditSubtaskList").querySelector("[data-subtask-edit]");
  const title = getTrimmedElementValue(input);
  if (title) {
    boardEditSubtaskItems[index] = { ...boardEditSubtaskItems[index], title };
  }
  boardEditSubtaskEditingIndex = -1;
  renderBoardEditSubtasks();
}


/**
 * Renders all subtask rows in view or inline edit mode.
 */
function renderBoardEditSubtasks() {
  getElement("boardTaskEditSubtaskList").innerHTML = boardEditSubtaskItems
    .map(renderBoardEditSubtaskTemplate)
    .join("");
}


/**
 * Selects the view or edit template for one board-edit subtask.
 * @param {Object} subtask - Subtask data to render.
 * @param {number} index - Position of the subtask in the edited task.
 * @returns {string} HTML markup for the current edit state.
 */
function renderBoardEditSubtaskTemplate(subtask, index) {
  return index === boardEditSubtaskEditingIndex
    ? getSubtaskEditTemplate(subtask, index)
    : getSubtaskItemTemplate(subtask, index);
}


/**
 * @returns {Object[]} Copy of the edited subtasks with kept done states.
 */
function getBoardEditSubtaskItems() {
  return [...boardEditSubtaskItems];
}
