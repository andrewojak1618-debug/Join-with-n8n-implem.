const addTaskRedirectDelay = 900;
const addTaskStatuses = ["todo", "in-progress", "feedback", "done"];
let addTaskRedirectTimer;


/**
 * Initializes the Add Task form and its dynamic contact dropdown.
 */
async function initAddTaskValidation() {
  const form = getElement("addTaskForm");
  if (!form) return;

  initAddTaskDueDatePicker();
  await initAddTaskAssignees();
  initAddTaskCategory();
  initAddTaskSubtasks();
  initAddTaskCloseButton();
  initAddTaskFieldValidation(form);
  form.addEventListener("input", handleAddTaskFormChange);
  form.addEventListener("change", handleAddTaskFormChange);
  form.addEventListener("reset", handleAddTaskReset);
  form.addEventListener("submit", handleAddTaskSubmit);
}


/**
 * Saves the task through the task store and opens the board after success.
 *
 * @param {SubmitEvent} event - Submit event of the add task form.
 */
async function handleAddTaskSubmit(event) {
  event.preventDefault();
  if (!validateAddTaskForm()) return;
  const form = event.currentTarget;
  setAddTaskSubmitPending(true);
  hideAddTaskErrorMessage();
  try {
    await createTaskInStore(getAddTaskData());
    completeAddTaskSubmit(form);
  } catch {
    failAddTaskSubmit();
  }
}


/**
 * Finishes a successful save with user feedback and the board redirect.
 *
 * @param {HTMLFormElement} form - The submitted add task form.
 */
function completeAddTaskSubmit(form) {
  form.reset();
  resetAddTaskAssignees();
  resetAddTaskCategory();
  showAddTaskSuccessMessage();
  redirectToBoardAfterSuccess();
}


/**
 * Re-enables the form and shows the error feedback after a failed save.
 */
function failAddTaskSubmit() {
  setAddTaskSubmitPending(false);
  showAddTaskErrorMessage();
}


/**
 * Clears stale success feedback when the user edits the form again.
 *
 * @param {Event} [event] - Input or change event; omitted for assignee updates.
 */
function handleAddTaskFormChange(event) {
  hideAddTaskSuccessMessage();
  hideAddTaskErrorMessage();
  clearAddTaskRedirect();
  handleAddTaskValidationChange(event?.target?.id);
}


/**
 * Clears assignees, subtasks and field errors after the form was reset.
 */
function handleAddTaskReset() {
  setTimeout(() => {
    resetAddTaskAssignees();
    resetAddTaskCategory();
    resetAddTaskSubtasks();
    resetAddTaskFieldValidation();
  }, 0);
}


/**
 * Shows the short confirmation before the board route opens.
 */
function showAddTaskSuccessMessage() {
  const message = getElement("addTaskSuccessMessage");
  if (!message) return;

  message.hidden = false;
}


/**
 * Hides the confirmation while the form is being edited.
 */
function hideAddTaskSuccessMessage() {
  const message = getElement("addTaskSuccessMessage");
  if (!message) return;

  message.hidden = true;
}


/**
 * Shows the save-failed feedback below the form actions.
 */
function showAddTaskErrorMessage() {
  const message = getElement("addTaskErrorMessage");
  if (message) message.hidden = false;
}


/**
 * Hides the save-failed feedback while the form is being edited.
 */
function hideAddTaskErrorMessage() {
  const message = getElement("addTaskErrorMessage");
  if (message) message.hidden = true;
}


/**
 * Opens the board after the user had a short moment to see the confirmation.
 */
function redirectToBoardAfterSuccess() {
  clearAddTaskRedirect();
  const afterSave = typeof completeAddTaskDialogSubmit === "function"
    ? completeAddTaskDialogSubmit
    : () => navigateToPage("board");
  addTaskRedirectTimer = setTimeout(afterSave, addTaskRedirectDelay);
}


/**
 * Cancels a pending board redirect, e.g. when the user keeps editing.
 */
function clearAddTaskRedirect() {
  if (addTaskRedirectTimer) clearTimeout(addTaskRedirectTimer);
}


/**
 * Reads the current form values and creates the task object used by the board.
 */
function getAddTaskData() {
  return {
    id: createTaskId(),
    title: getTrimmedInputValue("taskTitle"),
    description: getTrimmedInputValue("taskDescription"),
    dueDate: getAddTaskDueDate(),
    priority: getAddTaskPriority(),
    assignedTo: getAddTaskAssignee(),
    category: getAddTaskCategory(),
    subtasks: getAddTaskSubtasks(),
    status: getAddTaskStatus(),
    createdAt: new Date().toISOString(),
  };
}


/**
 * Shows the close button when the page was opened from the board.
 */
function initAddTaskCloseButton() {
  const closeButton = getElement("addTaskClose");
  if (!closeButton) return;
  const from = new URLSearchParams(window.location.search).get("from");
  if (from !== "board") return;
  closeButton.hidden = false;
  closeButton.addEventListener("click", () => navigateToPage("board"));
}


/**
 * Uses a valid status passed by a board column and defaults to To do.
 */
function getAddTaskStatus() {
  if (typeof addTaskDialogTargetStatus !== "undefined") return addTaskDialogTargetStatus;
  const status = new URLSearchParams(window.location.search).get("status");
  return addTaskStatuses.includes(status) ? status : "todo";
}


/**
 * @returns {string} A unique task id based on the current timestamp.
 */
function createTaskId() {
  return `task-${Date.now()}`;
}


/**
 * @returns {string} The normalized due date, or an empty string if invalid.
 */
function getAddTaskDueDate() {
  const dueDate = getTrimmedInputValue("taskDueDate");
  return normalizeTaskDueDate(dueDate);
}


/**
 * @returns {string} The selected priority; "medium" is preselected by default.
 */
function getAddTaskPriority() {
  const selected = document.querySelector('input[name="taskPriority"]:checked');
  return normalizeTaskPriority(selected?.value);
}


/**
 * @returns {Object[]} Stable references to all selected contacts.
 */
function getAddTaskAssignee() {
  return selectedTaskAssignees.map(createTaskAssigneeReference);
}


/**
 * @returns {string} The selected category value, or an empty string.
 */
function getAddTaskCategory() {
  return normalizeTaskCategory(getElement("taskCategory").value);
}



