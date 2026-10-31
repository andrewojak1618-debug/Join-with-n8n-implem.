const taskStorageKey = "joinTasks";
const taskPriorityValues = ["urgent", "medium", "low"];
const taskCategoryValues = ["technical-task", "user-story"];


/**
 * Reads the locally saved task list for the temporary localStorage step.
 * @returns {Object[]} Locally stored tasks or an empty list.
 */
function getStoredTasks() {
  return getStoredJson(taskStorageKey, []);
}


/**
 * Saves the complete task list in localStorage.
 * @param {Object[]} tasks - Complete task collection to persist.
 */
function saveStoredTasks(tasks) {
  saveStoredJson(taskStorageKey, tasks);
}


/**
 * Adds one new task to the locally saved task list.
 * @param {Object} task - New task to append.
 */
function saveCreatedTask(task) {
  const tasks = getStoredTasks();
  tasks.push(task);
  saveStoredTasks(tasks);
}


/**
 * Replaces one existing task after it was edited on the board.
 * @param {Object} updatedTask - Task containing the edited values.
 */
function updateStoredTask(updatedTask) {
  const tasks = getStoredTasks();
  const updatedTasks = tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task));
  saveStoredTasks(updatedTasks);
}


/**
 * Removes one task from the locally saved task list.
 * @param {string} taskId - Id of the task to remove.
 */
function deleteStoredTask(taskId) {
  const tasks = getStoredTasks();
  const remainingTasks = tasks.filter((task) => task.id !== taskId);
  saveStoredTasks(remainingTasks);
}


/**
 * Converts supported task date values into the stored ISO date format.
 * @param {*} value - ISO or legacy Join date value.
 * @returns {string} Normalized YYYY-MM-DD date or an empty string.
 */
function normalizeTaskDueDate(value) {
  const dateParts = getTaskDueDateParts(value);
  if (!dateParts || !isMatchingTaskDateParts(dateParts)) return "";
  const month = String(dateParts.month).padStart(2, "0");
  const day = String(dateParts.day).padStart(2, "0");
  return `${dateParts.year}-${month}-${day}`;
}


/**
 * Formats a supported task date for the Join user interface.
 * @param {*} value - ISO or legacy Join date value.
 * @returns {string} Date in DD/MM/YYYY format or an empty string.
 */
function formatTaskDueDate(value) {
  const normalizedDate = normalizeTaskDueDate(value);
  if (!normalizedDate) return "";
  const [year, month, day] = normalizedDate.split("-");
  return `${day}/${month}/${year}`;
}


/**
 * Parses a supported task date without shifting it through UTC.
 * @param {*} value - ISO or legacy Join date value.
 * @returns {Date|null} Local date instance or null for invalid input.
 */
function parseTaskDueDate(value) {
  const dateParts = getTaskDueDateParts(value);
  if (!dateParts || !isMatchingTaskDateParts(dateParts)) return null;
  return new Date(dateParts.year, dateParts.month - 1, dateParts.day);
}


/**
 * Reads ISO and legacy Join date strings into numeric date parts.
 * @param {*} value - Date value to normalize and parse.
 * @returns {{year: number, month: number, day: number}|null} Parsed date parts.
 */
function getTaskDueDateParts(value) {
  const normalizedValue = normalizeText(value);
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalizedValue);
  if (isoMatch) return getDatePartsFromMatch(isoMatch, 1, 2, 3);
  const joinMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalizedValue);
  return joinMatch ? getDatePartsFromMatch(joinMatch, 3, 2, 1) : null;
}


/**
 * Returns a comparable creation time for stable task ordering.
 * Supports Firestore timestamps and ISO strings; tasks without a usable
 * value fall back to 0 so they sort first without disturbing the relative
 * order they otherwise arrived in.
 * @param {Object} task - Task with an optional createdAt value.
 * @returns {number} Milliseconds since epoch, or 0 as a stable fallback.
 */
function getTaskCreatedAtMillis(task) {
  const createdAt = task?.createdAt;
  if (!createdAt) return 0;
  if (typeof createdAt.toMillis === "function") return createdAt.toMillis();
  if (typeof createdAt.seconds === "number") return createdAt.seconds * 1000;
  const parsed = new Date(createdAt).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}


/**
 * Returns a valid task priority or the default priority.
 * @param {*} value - Stored priority candidate.
 * @returns {string} Supported priority value.
 */
function normalizeTaskPriority(value) {
  const priority = normalizeText(value);
  return taskPriorityValues.includes(priority) ? priority : "medium";
}


/**
 * Returns a valid task category or an empty required-field value.
 * @param {*} value - Stored category candidate.
 * @returns {string} Supported category or an empty string.
 */
function normalizeTaskCategory(value) {
  const category = normalizeText(value);
  return taskCategoryValues.includes(category) ? category : "";
}


/**
 * Maps matched date groups to a common date-parts object.
 * @param {RegExpMatchArray} match - Successful date pattern match.
 * @param {number} yearIndex - Capture index containing the year.
 * @param {number} monthIndex - Capture index containing the month.
 * @param {number} dayIndex - Capture index containing the day.
 * @returns {{year: number, month: number, day: number}} Numeric date parts.
 */
function getDatePartsFromMatch(match, yearIndex, monthIndex, dayIndex) {
  return {
    year: Number(match[yearIndex]),
    month: Number(match[monthIndex]),
    day: Number(match[dayIndex]),
  };
}


/**
 * Rejects dates that JavaScript silently rolls into another month.
 * @param {{year: number, month: number, day: number}} dateParts - Date parts to verify.
 * @returns {boolean} True when JavaScript preserves every date component.
 */
function isMatchingTaskDateParts(dateParts) {
  const date = new Date(dateParts.year, dateParts.month - 1, dateParts.day);
  return date.getFullYear() === dateParts.year
    && date.getMonth() === dateParts.month - 1
    && date.getDate() === dateParts.day;
}
