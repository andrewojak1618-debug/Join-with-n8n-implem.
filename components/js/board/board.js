let activeBoardTasks = [];
let activeBoardTaskId = "";
let activeBoardContacts = [];


/**
 * Loads tasks from the task store and wires the board interactions.
 */
async function initBoardTasks() {
  const taskLists = document.querySelectorAll("[data-board-status]");
  if (!taskLists.length) return;
  try {
    await loadBoardData();
    renderBoardColumns(activeBoardTasks);
    playBoardIntroAnimation();
    initBoardTaskDetails(activeBoardTasks);
    initBoardSearch();
    await initAddTaskDialog();
    migrateBoardAssigneesInBackground();
  } catch (error) {
    showTimedFeedback("boardToast", "Board tasks could not be loaded.");
  }
}


/** Loads tasks and contacts in parallel for a faster first render. */
async function loadBoardData() {
  const boardRequests = [loadTasksFromStore(), loadSortedContactsSafely()];
  [activeBoardTasks, activeBoardContacts] =
    await Promise.all(boardRequests);
}


/** Persists legacy assignee references without delaying the visible board. */
function migrateBoardAssigneesInBackground() {
  migrateTaskAssigneeReferences(activeBoardTasks, activeBoardContacts)
    .catch(handleBoardAssigneeMigrationFailure);
}


/** Keeps the loaded board usable while reporting a failed data migration. */
function handleBoardAssigneeMigrationFailure() {
  showTimedFeedback(
    "boardToast",
    "Board loaded, but task assignments could not be synchronized.",
  );
}


/**
 * Renders every board column with the tasks matching its status.
 * @param {Object[]} tasks - All tasks shown on the board.
 */
function renderBoardColumns(tasks) {
  document.querySelectorAll("[data-board-status]").forEach((taskList) => {
    renderBoardColumn(taskList, tasks);
  });
}


/**
 * Fills one column with its task cards or an empty-state message.
 * @param {HTMLElement} taskList - The column's task list element.
 * @param {Object[]} tasks - All tasks shown on the board.
 */
function renderBoardColumn(taskList, tasks) {
  const status = taskList.dataset.boardStatus;
  const filteredTasks = tasks
    .filter((task) => task.status === status)
    .sort((a, b) => getTaskCreatedAtMillis(a) - getTaskCreatedAtMillis(b));
  taskList.innerHTML = filteredTasks.length
    ? filteredTasks.map(getBoardTaskViewData).map(getBoardTaskTemplate).join("")
    : getBoardEmptyTemplate(formatBoardStatus(status));
}


/**
 * Adds click and keyboard handling for opening, closing and editing task details.
 * @param {Object[]} tasks - All tasks currently shown on the board.
 */
function initBoardTaskDetails(tasks) {
  document
    .querySelectorAll(".board-card")
    .forEach((card) => addBoardCardListeners(card, tasks));
  initBoardDetailControls();
}


/**
 * Wires the click, keyboard and drag events of one board card.
 * @param {HTMLElement} card - The board card element.
 * @param {Object[]} tasks - All tasks shown on the board.
 */
function addBoardCardListeners(card, tasks) {
  card.addEventListener("click", () =>
    openBoardTaskDetail(card.dataset.taskId, tasks),
  );
  card.addEventListener("keydown", (event) =>
    handleBoardCardKey(event, card, tasks),
  );
  card.addEventListener("pointerdown", (event) =>
    handleBoardCardPointerDown(event, card),
  );
  card.addEventListener("dragstart", (event) => event.preventDefault());
  addBoardCardMoveListeners(card, tasks);
}


/**
 * Wires the edit, delete and form controls of the detail dialog.
 */
function initBoardDetailControls() {
  const overlay = getElement("boardTaskDetail");
  if (overlay.dataset.eventsReady === "true") return;
  getElement("boardTaskDetailClose").addEventListener("click", closeBoardTaskDetail);
  overlay.addEventListener("click", handleBoardDetailBackdrop);
  document.addEventListener("keydown", handleBoardDetailEscape);
  document.addEventListener("click", closeAllBoardCardMoveMenus);
  initBoardDetailActionControls();
  overlay.dataset.eventsReady = "true";
}


/**
 * Wires the edit, delete, form and status controls of the detail dialog.
 */
function initBoardDetailActionControls() {
  getElement("boardTaskEditButton").addEventListener("click", showBoardEditMode);
  getElement("boardTaskDeleteButton").addEventListener("click", handleBoardDeleteClick);
  getElement("boardTaskEditForm").addEventListener("submit", handleBoardEditSubmit);
  initBoardEditValidation();
  getElement("boardTaskDetailSubtasks").addEventListener(
    "change",
    handleBoardDetailSubtaskChange,
  );
  initBoardEditDropdowns();
}


/**
 * Opens the task detail when a card is activated via Enter or Space.
 * @param {KeyboardEvent} event - The keydown event.
 * @param {HTMLElement} card - The focused board card.
 * @param {Object[]} tasks - All tasks shown on the board.
 */
function handleBoardCardKey(event, card, tasks) {
  if (event.target !== card) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  openBoardTaskDetail(card.dataset.taskId, tasks);
}


/**
 * Wires the mobile move menu controls of one board card.
 * @param {HTMLElement} card - The board card element.
 * @param {Object[]} tasks - All tasks shown on the board.
 */
function addBoardCardMoveListeners(card, tasks) {
  const toggle = card.querySelector(".board-card-move__toggle");
  if (!toggle) return;
  toggle.addEventListener("click", (event) => toggleBoardCardMoveMenu(event, card));
  card.querySelectorAll("[data-move-status]").forEach((option) => {
    option.addEventListener("click", (event) => handleBoardCardMoveOption(event, card, tasks));
  });
}


/**
 * Opens or closes the move menu of one card and closes all other menus.
 * @param {MouseEvent} event - The toggle button click event.
 * @param {HTMLElement} card - The board card element.
 */
function toggleBoardCardMoveMenu(event, card) {
  event.stopPropagation();
  const menu = card.querySelector(".board-card-move__menu");
  const shouldOpen = menu.hidden;
  closeAllBoardCardMoveMenus();
  menu.hidden = !shouldOpen;
  card.querySelector(".board-card-move__toggle").setAttribute("aria-expanded", String(shouldOpen));
}


/**
 * Closes every open move menu on the board.
 */
function closeAllBoardCardMoveMenus() {
  document.querySelectorAll(".board-card-move__menu:not([hidden])").forEach((menu) => {
    menu.hidden = true;
  });
  document.querySelectorAll('.board-card-move__toggle[aria-expanded="true"]').forEach((toggle) => {
    toggle.setAttribute("aria-expanded", "false");
  });
}


/**
 * Moves the card's task to the picked column and re-renders the board.
 * @param {MouseEvent} event - The option button click event.
 * @param {HTMLElement} card - The board card element.
 * @param {Object[]} tasks - All tasks shown on the board.
 */
async function handleBoardCardMoveOption(event, card, tasks) {
  event.stopPropagation();
  const status = event.currentTarget.dataset.moveStatus;
  const task = tasks.find((currentTask) => currentTask.id === card.dataset.taskId);
  if (!task) return;
  await moveBoardTaskSafely(task, status);
}


/**
 * Moves a task and reports a failed persistence attempt consistently.
 * @param {Object} task - The task whose status should be changed.
 * @param {string} status - The target board status.
 * @returns {Promise<void>} Resolves after the status update attempt finishes.
 */
async function moveBoardTaskSafely(task, status) {
  try {
    await moveBoardTaskToStatus(task, status);
  } catch (error) {
    showTimedFeedback("boardToast", "Task status could not be updated.");
  }
}


/**
 * Opens the detail dialog for the task with the given id and locks page scrolling.
 * @param {string} taskId - The id of the task to show.
 * @param {Object[]} tasks - All tasks shown on the board.
 */
function openBoardTaskDetail(taskId, tasks) {
  if (!showBoardTaskDetail(taskId, tasks)) return;
  getElement("boardTaskDetailCard").scrollTop = 0;
  lockPageScroll();
}


/**
 * Fills and reveals the detail dialog without touching any scroll state.
 * Used to refresh an already-open dialog without re-locking the background.
 *
 * @param {string} taskId - The id of the task to show.
 * @param {Object[]} tasks - All tasks shown on the board.
 * @returns {boolean} True when the task was found and shown.
 */
function showBoardTaskDetail(taskId, tasks) {
  const task = tasks.find((currentTask) => currentTask.id === taskId);
  if (!task) return false;
  activeBoardTaskId = task.id;
  fillBoardTaskDetail(task);
  showBoardDetailViewMode();
  getElement("boardTaskDetail").hidden = false;
  return true;
}


/**
 * Closes the detail dialog, restores page scrolling and resets it to view mode.
 */
function closeBoardTaskDetail() {
  getElement("boardTaskDetail").hidden = true;
  unlockPageScroll();
  activeBoardTaskId = "";
  showBoardDetailViewMode();
}


/**
 * Closes the detail dialog when the backdrop is clicked.
 * @param {MouseEvent} event - The click event.
 */
function handleBoardDetailBackdrop(event) {
  if (event.target === getElement("boardTaskDetail")) closeBoardTaskDetail();
}


/**
 * Closes the detail dialog when the Escape key is pressed.
 * @param {KeyboardEvent} event - The keydown event.
 */
function handleBoardDetailEscape(event) {
  if (event.key === "Escape") closeBoardTaskDetail();
}


/**
 * Fills the task detail dialog with the content of the given task.
 * @param {Object} task - The task shown in the detail view.
 */
function fillBoardTaskDetail(task) {
  setElementText(
    "boardTaskDetailCategory",
    formatBoardCategory(task.category),
  );
  setElementText("boardTaskDetailTitle", task.title);
  setElementText(
    "boardTaskDetailDescription",
    task.description || "No description",
  );
  fillBoardDetailMetaFields(task);
  renderBoardDetailSubtasks(task);
}


/**
 * Fills the meta fields (due date, priority, assignee) of the task detail dialog.
 * @param {Object} task - The task providing the meta information.
 */
function fillBoardDetailMetaFields(task) {
  setElementText(
    "boardTaskDetailDueDate",
    formatTaskDueDate(task.dueDate) || "-",
  );
  fillBoardDetailPriority(task.priority);
  renderBoardDetailAssignees(task.assignedTo);
}


/**
 * Shows the priority text with its icon in the task detail dialog.
 * @param {string} priority - Stored priority of the task.
 */
function fillBoardDetailPriority(priority) {
  setElementText("boardTaskDetailPriority", priority || "-");
  const icon = document.getElementById("boardTaskDetailPriorityIcon");
  icon.src = priority ? getBoardPriorityIcon(priority) : "";
  icon.hidden = !priority;
}


/**
 * Renders the assignees as avatar rows in the task detail dialog.
 * @param {Array|string} assignedTo - Stored task assignment value.
 */
function renderBoardDetailAssignees(assignedTo) {
  const references = getTaskAssigneeReferences(assignedTo);
  const target = document.getElementById("boardTaskDetailAssignee");
  if (!references.length) {
    target.textContent = "Not assigned";
    return;
  }
  target.innerHTML = references
    .map(getBoardDetailAssigneeViewData)
    .map(getBoardDetailAssigneeTemplate)
    .join("");
}


/**
 * Combines an assignee reference with the color of its matching contact.
 * @param {Object} reference - Stored assignee reference with id and name.
 * @param {Object[]} contacts - All known contacts.
 * @returns {{name: string, color: string}} Display data for the avatar row.
 */
function resolveAssigneeDisplay(reference, contacts) {
  const contact = contacts.find((item) => isTaskAssigneeContact(reference, item));
  return {
    name: contact?.name || reference.name,
    color: (contact && contact.color) || "var(--color-primary-auth)",
  };
}


/**
 * Switches the detail dialog back to the read-only view.
 */
function showBoardDetailViewMode() {
  getElement("boardTaskDetailView").hidden = false;
  getElement("boardTaskEditForm").hidden = true;
}


/**
 * Returns the task currently shown in the detail dialog.
 * @returns {Object|undefined} The active task, if any.
 */
function getActiveBoardTask() {
  return activeBoardTasks.find((task) => task.id === activeBoardTaskId);
}
