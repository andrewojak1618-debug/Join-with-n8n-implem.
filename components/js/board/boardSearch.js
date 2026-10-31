/**
 * Wires the board search input once the board page has been rendered.
 */
function initBoardSearch() {
  const searchInput = document.getElementById("boardSearchInput");
  if (!searchInput || searchInput.dataset.searchReady === "true") return;
  searchInput.addEventListener("input", handleBoardSearchInput);
  searchInput.dataset.searchReady = "true";
}


/**
 * Filters the board in real time on every keystroke in the search field.
 *
 * @param {Event} event - Input event of the board search field.
 */
function handleBoardSearchInput(event) {
  const searchTerm = getTrimmedElementValue(event.target).toLowerCase();
  const filteredTasks = getBoardSearchResults(searchTerm);
  renderBoardColumns(filteredTasks);
  initBoardTaskDetails(filteredTasks);
  toggleBoardNoResultsMessage(searchTerm, filteredTasks);
}


/**
 * Returns the tasks matching the search term, or all tasks for an empty term.
 *
 * @param {string} searchTerm - Trimmed, lowercased search input.
 * @returns {Object[]} Tasks to display on the board.
 */
function getBoardSearchResults(searchTerm) {
  if (!searchTerm) return activeBoardTasks;
  return activeBoardTasks.filter((task) => taskMatchesSearch(task, searchTerm));
}


/**
 * Swaps the board columns for a notice when a search has no matches.
 *
 * @param {string} searchTerm - Trimmed, lowercased search input.
 * @param {Object[]} filteredTasks - Tasks remaining after the filter.
 */
function toggleBoardNoResultsMessage(searchTerm, filteredTasks) {
  const noResultsElement = document.getElementById("boardSearchNoResults");
  const columnsElement = document.querySelector(".board-columns");
  if (!noResultsElement || !columnsElement) return;
  const showMessage = searchTerm.length > 0 && filteredTasks.length === 0;
  noResultsElement.hidden = !showMessage;
  columnsElement.hidden = showMessage;
}


/**
 * Checks whether a task title or description contains the search term.
 *
 * @param {Object} task - Task object from the board store.
 * @param {string} searchTerm - Trimmed, lowercased search input.
 * @returns {boolean} True if the task should stay visible.
 */
function taskMatchesSearch(task, searchTerm) {
  const title = (task.title || "").toLowerCase();
  const description = (task.description || "").toLowerCase();
  return title.includes(searchTerm) || description.includes(searchTerm);
}


/**
 * Plays the card entrance animation once after the initial board render.
 */
function playBoardIntroAnimation() {
  const columnsElement = document.querySelector(".board-columns");
  if (!columnsElement) return;
  columnsElement.classList.add("board-columns--animate-in");
  setTimeout(() => {
    columnsElement.classList.remove("board-columns--animate-in");
  }, 600);
}
