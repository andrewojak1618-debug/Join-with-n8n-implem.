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
  window.addEventListener("resize", handleAddTaskDialogResize);
  bindAddTaskDialogTriggers();
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
  openAddTaskDialog(event.currentTarget);
}


/**
 * Opens the add task dialog for a new Triage task.
 * @param {HTMLElement} opener - Control that opened the dialog.
 */
function openAddTaskDialog(opener) {
  resetAddTaskDialogForm();
  getElement("addTaskDialog").hidden = false;
  getElement("addTaskDialogCard").scrollTop = 0;
  lockPageScroll();
  startDialogFocus(getElement("addTaskDialog"), () => opener, dismissAddTaskDialog);
}


/**
 * Closes the add task dialog and restores page scrolling.
 */
function closeAddTaskDialog() {
  getElement("addTaskDialog").hidden = true;
  unlockPageScroll();
  finishDialogFocus(getElement("addTaskDialog"));
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
 * Dismisses the calendar first, otherwise closes the floating dialog.
 */
function dismissAddTaskDialog() {
  const calendar = document.getElementById("taskDueDateCalendar");
  if (calendar && !calendar.hidden) {
    setAddTaskDatePickerOpen(false);
    getElement("taskDueDate").focus();
    return;
  }
  closeAddTaskDialog();
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
  hideAddTaskSuccessMessage();
  closeAddTaskDialog();
  activeBoardTasks = await loadTasksFromStore();
  renderBoardFromLocalTasks();
}
