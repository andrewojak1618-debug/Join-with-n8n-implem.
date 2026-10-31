let addTaskDialogTargetStatus = "todo";


/**
 * Loads the add task form once and wires the dialog controls.
 */
async function initAddTaskDialog() {
  const dialog = getElement("addTaskDialog");
  if (!dialog) return;
  await initAddTaskValidation();
  initAddTaskDialogControls();
}


/**
 * @returns {boolean} True when the viewport shows the sidebar (desktop) layout.
 */
function isDesktopAddTaskDialogViewport() {
  return window.matchMedia("(min-width: 1280px)").matches;
}


/**
 * Wires the dialog close controls and the board trigger buttons once.
 */
function initAddTaskDialogControls() {
  const dialog = getElement("addTaskDialog");
  if (dialog.dataset.eventsReady === "true") return;
  getElement("addTaskDialogClose").addEventListener("click", closeAddTaskDialog);
  dialog.addEventListener("click", handleAddTaskDialogBackdrop);
  document.addEventListener("keydown", handleAddTaskDialogEscape);
  window.addEventListener("resize", handleAddTaskDialogResize);
  bindAddTaskDialogTriggers();
  bindAddTaskDialogCancelButton();
  dialog.dataset.eventsReady = "true";
}


/**
 * Wires the board header button and every column "+" button to the dialog.
 */
function bindAddTaskDialogTriggers() {
  document
    .querySelectorAll(".board-add-task, .board-column__add")
    .forEach((trigger) => trigger.addEventListener("click", handleAddTaskTriggerClick));
}


/**
 * Opens the dialog on desktop viewports, otherwise leaves the click
 * untouched so the existing page navigation still runs.
 * @param {MouseEvent} event - Click event from a board trigger button.
 */
function handleAddTaskTriggerClick(event) {
  if (!isDesktopAddTaskDialogViewport()) return;
  event.preventDefault();
  openAddTaskDialog(event.currentTarget.dataset.taskStatus);
}


/**
 * Relabels the reused "Clear" reset button to a dialog "Cancel" action.
 */
function bindAddTaskDialogCancelButton() {
  const cancelButton = document.querySelector(
    "#addTaskDialog .add-task-button--secondary",
  );
  if (!cancelButton) return;
  cancelButton.type = "button";
  cancelButton.querySelector("span").textContent = "Cancel";
  cancelButton.addEventListener("click", closeAddTaskDialog);
}


/**
 * Opens the add task dialog preselected for one board column.
 * @param {string} [status] - The column status to preselect.
 */
function openAddTaskDialog(status) {
  addTaskDialogTargetStatus = addTaskStatuses.includes(status) ? status : "todo";
  resetAddTaskDialogForm();
  getElement("addTaskDialog").hidden = false;
  getElement("addTaskDialogCard").scrollTop = 0;
  lockPageScroll();
}


/**
 * Closes the add task dialog and restores page scrolling.
 */
function closeAddTaskDialog() {
  getElement("addTaskDialog").hidden = true;
  unlockPageScroll();
}


/**
 * Clears the reused form back to its default state for the next open.
 */
function resetAddTaskDialogForm() {
  setAddTaskSubmitPending(false);
  getElement("addTaskForm").reset();
  resetAddTaskAssignees();
  resetAddTaskCategory();
  resetAddTaskSubtasks();
  resetAddTaskFieldValidation();
  hideAddTaskErrorMessage();
}


/**
 * Closes the dialog when the backdrop itself is clicked.
 * @param {MouseEvent} event - Click event from the dialog overlay.
 */
function handleAddTaskDialogBackdrop(event) {
  if (event.target === getElement("addTaskDialog")) closeAddTaskDialog();
}


/**
 * Closes the dialog on Escape, unless the due date calendar is open.
 * @param {KeyboardEvent} event - Document keydown event.
 */
function handleAddTaskDialogEscape(event) {
  if (event.key !== "Escape") return;
  const calendar = document.getElementById("taskDueDateCalendar");
  if (calendar && !calendar.hidden) return;
  if (!getElement("addTaskDialog").hidden) closeAddTaskDialog();
}


/**
 * Closes the dialog if the window is resized below the desktop breakpoint.
 */
function handleAddTaskDialogResize() {
  if (!getElement("addTaskDialog").hidden && !isDesktopAddTaskDialogViewport()) {
    closeAddTaskDialog();
  }
}


/**
 * Closes the dialog and refreshes the board after a task was created in it.
 */
async function completeAddTaskDialogSubmit() {
  closeAddTaskDialog();
  activeBoardTasks = await loadTasksFromStore();
  renderBoardFromLocalTasks();
  showTimedFeedback("boardToast", "Task added to board.");
}
