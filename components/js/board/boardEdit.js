const boardEditFieldNames = {
  boardTaskEditTitle: "Title",
  boardTaskEditDueDate: "DueDate",
};

/**
 * Switches the detail dialog to edit mode with the active task's data.
 */
async function showBoardEditMode() {
  const task = getActiveBoardTask();
  if (!task) return;
  await fillBoardTaskEditForm(task);
  getElement("boardTaskDetailView").hidden = true;
  getElement("boardTaskEditForm").hidden = false;
}


/**
 * Fills the edit form fields with the values of the given task.
 * @param {Object} task - The task being edited.
 */
async function fillBoardTaskEditForm(task) {
  resetBoardEditValidation();
  getBoardEditField("Title").value = task.title || "";
  getBoardEditField("Description").value = task.description || "";
  getBoardEditField("DueDate").value = normalizeTaskDueDate(task.dueDate);
  setBoardEditPriority(task.priority || "medium");
  getBoardEditField("Category").value = task.category || "technical-task";
  syncBoardEditDropdowns();
  await renderBoardEditAssignees(task.assignedTo);
  initBoardEditSubtasks(task.subtasks);
}


/**
 * Deletes the active task and re-renders the board.
 */
async function handleBoardDeleteClick() {
  if (!activeBoardTaskId) return;
  try {
    await deleteTaskFromStore(activeBoardTaskId);
    closeBoardTaskDetail();
    await initBoardTasks();
    showTimedFeedback("boardToast", "Task successfully deleted");
  } catch (error) {
    showTimedFeedback("boardToast", "Task could not be deleted.");
  }
}


/**
 * Saves the edited task and refreshes the board and detail view.
 * @param {Event} event - The form submit event.
 */
async function handleBoardEditSubmit(event) {
  event.preventDefault();
  const task = getActiveBoardTask();
  if (!task || !validateBoardEditForm()) return;
  await saveBoardEdit(getBoardEditedTask(task));
}


/**
 * Persists a valid board edit and restores the submit state afterwards.
 * @param {Object} updatedTask - The validated task data to save.
 */
async function saveBoardEdit(updatedTask) {
  setBoardEditPending(true);
  try {
    await updateTaskInStore(updatedTask);
    await refreshBoardAfterEdit(updatedTask.id);
    showTimedFeedback("boardToast", "Task successfully updated");
  } catch (error) {
    showTimedFeedback("boardToast", "Task could not be updated.");
  } finally {
    setBoardEditPending(false);
  }
}


/**
 * Adds field-level validation to the board edit form.
 */
function initBoardEditValidation() {
  const form = getElement("boardTaskEditForm");
  form.addEventListener("focusout", handleBoardEditValidationEvent);
  form.addEventListener("input", handleBoardEditValidationEvent);
}


/**
 * Validates required fields after blur and clears visible errors while typing.
 * @param {Event} event - Input or focusout event from the edit form.
 */
function handleBoardEditValidationEvent(event) {
  const fieldName = boardEditFieldNames[event.target.id];
  if (!fieldName) return;
  const shouldValidate =
    event.type === "focusout" ||
    event.target.getAttribute("aria-invalid") === "true";
  if (shouldValidate) validateBoardEditField(fieldName);
}


/**
 * Validates all required edit fields and focuses the first invalid input.
 * @returns {boolean} True when every required field is valid.
 */
function validateBoardEditForm() {
  const isValid = Object.values(boardEditFieldNames)
    .map(validateBoardEditField)
    .every(Boolean);
  if (!isValid) focusFirstInvalidBoardEditField();
  return isValid;
}


/**
 * Validates one board edit field and renders its inline message.
 * @param {string} fieldName - Board edit field suffix.
 * @returns {boolean} True when the field is valid.
 */
function validateBoardEditField(fieldName) {
  const message = getBoardEditFieldError(fieldName);
  setBoardEditFieldError(fieldName, message);
  return !message;
}


/**
 * Returns the validation message for one required board edit field.
 * @param {string} fieldName - Board edit field suffix.
 * @returns {string} Error text or an empty string.
 */
function getBoardEditFieldError(fieldName) {
  const value = getTrimmedElementValue(getBoardEditField(fieldName));
  if (fieldName === "Title") return value ? "" : "Please enter a title.";
  if (!value) return "Please enter a due date.";
  return normalizeTaskDueDate(value) ? "" : "Please enter a valid due date.";
}


/**
 * Updates one field's accessibility state and inline error text.
 * @param {string} fieldName - Board edit field suffix.
 * @param {string} message - Error text or an empty string.
 */
function setBoardEditFieldError(fieldName, message) {
  const field = getBoardEditField(fieldName);
  const error = document.getElementById(`boardTaskEdit${fieldName}Error`);
  field.setAttribute("aria-invalid", String(Boolean(message)));
  error.textContent = message;
}


/**
 * Clears both board edit validation messages.
 */
function resetBoardEditValidation() {
  Object.values(boardEditFieldNames).forEach((fieldName) => {
    setBoardEditFieldError(fieldName, "");
  });
}


/**
 * Focuses the first invalid field after a failed submit.
 */
function focusFirstInvalidBoardEditField() {
  getElement("boardTaskEditForm").querySelector('[aria-invalid="true"]')?.focus();
}


/**
 * Locks the board edit submit button while its save request is pending.
 * @param {boolean} isPending - True while the task is being saved.
 */
function setBoardEditPending(isPending) {
  const button = getElement("boardTaskEditForm").querySelector('[type="submit"]');
  button.disabled = isPending;
  button.setAttribute("aria-busy", String(isPending));
}


/**
 * Builds the updated task object from the edit form values.
 * @param {Object} task - The original task being edited.
 * @returns {Object} The task with the edited values applied.
 */
function getBoardEditedTask(task) {
  return {
    ...task,
    title: getTrimmedElementValue(getBoardEditField("Title")),
    description: getTrimmedElementValue(getBoardEditField("Description")),
    dueDate: normalizeTaskDueDate(getBoardEditField("DueDate").value),
    priority: getBoardEditPriority(),
    category: getBoardEditCategory(),
    assignedTo: getBoardEditedAssignees(),
    subtasks: getBoardEditSubtaskItems(),
  };
}


/**
 * Returns the assignees selected in the edit form.
 * @returns {Object[]} Stable references to the selected contacts.
 */
function getBoardEditedAssignees() {
  return getBoardEditedAssigneesFromContacts().map(createTaskAssigneeReference);
}


/**
 * Reloads the board after an edit and reopens the edited task's detail view.
 * @param {string} taskId - The id of the edited task.
 */
async function refreshBoardAfterEdit(taskId) {
  activeBoardTasks = await loadTasksFromStore();
  renderBoardColumns(activeBoardTasks);
  initBoardTaskDetails(activeBoardTasks);
  showBoardTaskDetail(taskId, activeBoardTasks);
}


/**
 * Checks the priority radio matching the task, falling back to medium.
 * @param {string} priority - Stored priority of the task.
 */
function setBoardEditPriority(priority) {
  const radio = document.querySelector(
    `input[name="boardEditPriority"][value="${priority}"]`,
  );
  const fallback = document.querySelector(
    'input[name="boardEditPriority"][value="medium"]',
  );
  (radio || fallback).checked = true;
}


/**
 * @returns {string} The picked priority from the edit form radios.
 */
function getBoardEditPriority() {
  const checked = document.querySelector(
    'input[name="boardEditPriority"]:checked',
  );
  return normalizeTaskPriority(checked?.value);
}


/** @returns {string} A valid selected category or the task category default. */
function getBoardEditCategory() {
  return normalizeTaskCategory(getBoardEditField("Category").value) || "technical-task";
}


/**
 * Returns an input element of the edit form by its field name.
 * @param {string} fieldName - The suffix of the field's element id.
 * @returns {HTMLElement} The form field element.
 */
function getBoardEditField(fieldName) {
  return getElement(`boardTaskEdit${fieldName}`);
}
