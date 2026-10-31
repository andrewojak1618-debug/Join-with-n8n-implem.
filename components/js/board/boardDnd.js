let draggedBoardTaskId = "";
let boardDragGhost = null;
let boardDragGhostOffsetX = 0;
let boardDragGhostOffsetY = 0;
let boardDragCard = null;
let boardDragStartX = 0;
let boardDragStartY = 0;
let boardDragActive = false;


/**
 * Arms a possible card drag when the left mouse button goes down.
 * @param {PointerEvent} event - The pointerdown event.
 * @param {HTMLElement} card - The card under the pointer.
 */
function handleBoardCardPointerDown(event, card) {
  if (window.matchMedia("(max-width: 1279px)").matches) return;
  if (event.pointerType !== "mouse" || event.button !== 0) return;
  if (event.target.closest("button")) return;
  boardDragCard = card;
  boardDragStartX = event.clientX;
  boardDragStartY = event.clientY;
  document.addEventListener("pointermove", handleBoardDragPointerMove);
  document.addEventListener("pointerup", handleBoardDragPointerUp);
}


/**
 * Starts or continues the drag once the pointer moved far enough.
 * @param {PointerEvent} event - The pointermove event.
 */
function handleBoardDragPointerMove(event) {
  if (!boardDragCard) return;
  if (boardDragActive && event.buttons === 0) return endBoardCardDrag();
  if (!boardDragActive && !isBoardDragThresholdReached(event)) return;
  if (!boardDragActive) startBoardCardDrag(event);
  moveBoardDragGhost(event);
  updateBoardDropHighlight(event);
}


/**
 * @param {PointerEvent} event - The current pointermove event.
 * @returns {boolean} True once the pointer left the click tolerance.
 */
function isBoardDragThresholdReached(event) {
  return (
    Math.abs(event.clientX - boardDragStartX) > 4 ||
    Math.abs(event.clientY - boardDragStartY) > 4
  );
}


/**
 * Switches the armed card into drag mode with ghost and grab cursor.
 * @param {PointerEvent} event - The pointermove event crossing the threshold.
 */
function startBoardCardDrag(event) {
  boardDragActive = true;
  draggedBoardTaskId = boardDragCard.dataset.taskId;
  createBoardDragGhost(event, boardDragCard);
  boardDragCard.classList.add("board-card--dragging");
  document.body.classList.add("board-dragging");
  setBoardDropZonesReady(true);
  document.addEventListener("keydown", handleBoardDragEscape);
}


/**
 * Highlights the column currently under the pointer as drop target.
 * @param {PointerEvent} event - The pointermove event.
 */
function updateBoardDropHighlight(event) {
  clearAllBoardDropFeedback();
  const taskList = getBoardDropTarget(event);
  if (taskList) taskList.classList.add("board-task-list--dragover");
}


/**
 * Toggles the drop-zone marking on every board column list.
 * @param {boolean} isReady - True while a card drag is running.
 */
function setBoardDropZonesReady(isReady) {
  document.querySelectorAll("[data-board-status]").forEach((taskList) => {
    taskList.classList.toggle("board-task-list--droppable", isReady);
  });
}


/**
 * @param {PointerEvent} event - A pointer event carrying mouse coordinates.
 * @returns {HTMLElement|null} The column task list under the pointer.
 */
function getBoardDropTarget(event) {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  return element ? element.closest("[data-board-status]") : null;
}


/**
 * Drops the card into the column under the pointer and ends the drag.
 * @param {PointerEvent} event - The pointerup event.
 */
async function handleBoardDragPointerUp(event) {
  if (!boardDragActive) return endBoardCardDrag();
  const taskList = getBoardDropTarget(event);
  const task = getDraggedBoardTask();
  endBoardCardDrag();
  if (!taskList || !task) return;
  await moveBoardTaskSafely(task, taskList.dataset.boardStatus);
}


/**
 * Cancels a running drag on Escape and swallows the release click.
 * @param {KeyboardEvent} event - The keydown event.
 */
function handleBoardDragEscape(event) {
  if (event.key !== "Escape") return;
  document.addEventListener("click", stopBoardDragClick, {
    capture: true,
    once: true,
  });
  endBoardCardDrag();
}


/**
 * Stops a swallowed click from reaching the board cards.
 * @param {MouseEvent} event - The click event of the drag release.
 */
function stopBoardDragClick(event) {
  event.stopPropagation();
}


/**
 * Ends any drag attempt and removes all drag feedback and listeners.
 */
function endBoardCardDrag() {
  document.removeEventListener("pointermove", handleBoardDragPointerMove);
  document.removeEventListener("pointerup", handleBoardDragPointerUp);
  document.removeEventListener("keydown", handleBoardDragEscape);
  document.body.classList.remove("board-dragging");
  removeBoardDragGhost();
  clearActiveBoardDragCard();
  clearAllBoardDropFeedback();
  setBoardDropZonesReady(false);
  draggedBoardTaskId = "";
  boardDragCard = null;
  boardDragActive = false;
}


/**
 * Creates the rotated card clone that follows the mouse while dragging.
 * @param {PointerEvent} event - The pointer event starting the drag.
 * @param {HTMLElement} card - The card being dragged.
 */
function createBoardDragGhost(event, card) {
  const rect = card.getBoundingClientRect();
  boardDragGhostOffsetX = event.clientX - rect.left;
  boardDragGhostOffsetY = event.clientY - rect.top;
  boardDragGhost = card.cloneNode(true);
  boardDragGhost.classList.add("board-card--ghost");
  boardDragGhost.style.width = `${rect.width}px`;
  document.body.append(boardDragGhost);
  moveBoardDragGhost(event);
}


/**
 * Moves the drag ghost to the current mouse position.
 * @param {PointerEvent} event - A pointer event carrying mouse coordinates.
 */
function moveBoardDragGhost(event) {
  if (!boardDragGhost) return;
  boardDragGhost.style.left = `${event.clientX - boardDragGhostOffsetX}px`;
  boardDragGhost.style.top = `${event.clientY - boardDragGhostOffsetY}px`;
}


/**
 * Removes the drag ghost from the page.
 */
function removeBoardDragGhost() {
  if (boardDragGhost) boardDragGhost.remove();
  boardDragGhost = null;
}


/**
 * Removes the dragging style from all board cards.
 */
function clearActiveBoardDragCard() {
  document.querySelectorAll(".board-card--dragging").forEach((card) => {
    card.classList.remove("board-card--dragging");
  });
}


/**
 * Moves the task on the board immediately and saves it in the background.
 * Rolls the move back when saving fails and rethrows for the caller's toast.
 *
 * @param {Object} task - The task being moved.
 * @param {string} status - The status of the target column.
 */
async function moveBoardTaskToStatus(task, status) {
  const previousStatus = task.status;
  task.status = status;
  renderBoardFromLocalTasks();
  try {
    await updateTaskInStore(task);
  } catch (error) {
    task.status = previousStatus;
    renderBoardFromLocalTasks();
    throw error;
  }
}


/**
 * Returns the task that is currently being dragged.
 * @returns {Object|undefined} The dragged task, if any.
 */
function getDraggedBoardTask() {
  return activeBoardTasks.find((task) => task.id === draggedBoardTaskId);
}


/**
 * Removes the drop highlight from one column.
 * @param {HTMLElement} taskList - The column to clear.
 */
function clearBoardDropFeedback(taskList) {
  taskList.classList.remove("board-task-list--dragover");
}


/**
 * Removes the drop highlight from all columns.
 */
function clearAllBoardDropFeedback() {
  document.querySelectorAll("[data-board-status]").forEach((taskList) => {
    clearBoardDropFeedback(taskList);
  });
}


/**
 * Re-renders the board columns from the local task state.
 */
function renderBoardFromLocalTasks() {
  renderBoardColumns(activeBoardTasks);
  initBoardTaskDetails(activeBoardTasks);
}
