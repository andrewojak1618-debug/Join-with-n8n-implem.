/**
 * Shows the currently signed-in user on the protected summary page.
 */
function initSummaryUser() {
  const user = getStoredUser();
  if (!user) return;

  setElementText("summaryGreeting", getSummaryDisplayName(user));
  setElementText("summaryUserType", getSummaryUserTypeText(user));
  setElementText("summaryGreetingTime", getTimeGreeting());
  showMobileSummaryGreeting();
}


/**
 * Shows the filled greeting briefly on mobile and removes its overlay afterwards.
 */
function showMobileSummaryGreeting() {
  const greeting = document.querySelector(".summary-greeting");
  if (!greeting) return;
  greeting.classList.add("summary-greeting--visible");
  greeting.addEventListener("animationend", hideMobileSummaryGreeting, { once: true });
}


/**
 * Removes the mobile overlay after its entrance greeting has finished.
 * @param {AnimationEvent} event - Completed CSS animation on the greeting.
 */
function hideMobileSummaryGreeting(event) {
  event.currentTarget.classList.remove("summary-greeting--visible");
}


/**
 * Returns the display name for the summary greeting.
 * @param {Object} user - Stored user shown on the summary page.
 * @returns {string} User name or the guest fallback.
 */
function getSummaryDisplayName(user) {
  return user.name || "Guest";
}


/**
 * Returns greeting appropriate to the time of day.
 * @returns {string} Time-dependent greeting text.
 */
function getTimeGreeting() {
  const hour = new Date().getHours();
  let greeting = "Good night,";

  if (hour >= 5 && hour < 12) greeting = "Good morning,";
  else if (hour >= 12 && hour < 18) greeting = "Good afternoon,";
  else if (hour >= 18 && hour < 22) greeting = "Good evening,";

  return greeting;
}


/**
 * Explains whether the current session belongs to a guest or regular user.
 * @param {Object} user - Stored user whose session type is described.
 * @returns {string} User-facing account type explanation.
 */
function getSummaryUserTypeText(user) {
  if (user.type === "firebase-guest" || user.type === "guest") {
    return "You are signed in as a guest.";
  }

  return "You are signed in with your account.";
}


/**
 * Loads tasks from the task store and fills the summary metric cards.
 * Renders a cached snapshot instantly to avoid a flash of empty values.
 */
async function initSummaryMetrics() {
  const cachedTasks = getCachedTasksSnapshot();
  if (cachedTasks) renderSummaryMetrics(cachedTasks);
  else setSummaryMetricsLoading(true);

  try {
    renderSummaryMetrics(await loadTasksFromStore());
  } catch (error) {
    setSummaryLoadError("Task overview could not be loaded.");
  } finally {
    setSummaryMetricsLoading(false);
  }
}


/**
 * Fills every summary metric card with counts from the given tasks.
 * @param {Object[]} tasks - Tasks to summarize.
 */
function renderSummaryMetrics(tasks) {
  setElementText("summaryTodoCount", countTasksByStatus(tasks, "todo"));
  setElementText("summaryProgressCount", countTasksByStatus(tasks, "in-progress"));
  setElementText("summaryFeedbackCount", countTasksByStatus(tasks, "feedback"));
  setElementText("summaryDoneCount", countTasksByStatus(tasks, "done"));
  setElementText("summaryBoardCount", tasks.length);
  setElementText("summaryUrgentCount", countTasksByPriority(tasks, "urgent"));
  setElementText("summaryDeadlineDate", getUpcomingDeadlineText(tasks));
}


/**
 * Toggles the loading style and neutral placeholders on the summary metrics.
 * @param {boolean} isLoading - True while no task data is available yet.
 */
function setSummaryMetricsLoading(isLoading) {
  const metrics = document.querySelector(".summary-metrics");
  if (metrics) metrics.classList.toggle("summary-metrics--loading", isLoading);
  if (isLoading) blankSummaryMetricValues();
}


/**
 * Replaces the static placeholder numbers with a neutral loading marker.
 */
function blankSummaryMetricValues() {
  const metricIds = [
    "summaryTodoCount", "summaryDoneCount", "summaryUrgentCount",
    "summaryBoardCount", "summaryProgressCount", "summaryFeedbackCount",
  ];
  metricIds.forEach((id) => setElementText(id, "–"));
  setElementText("summaryDeadlineDate", "–");
}


/**
 * Shows a page-level error when the summary task request fails.
 * @param {string} message - Error text shown to the user.
 */
function setSummaryLoadError(message) {
  const error = document.getElementById("summaryLoadError");
  if (!error) return;
  error.textContent = message;
  error.hidden = !message;
}


/**
 * Counts how many tasks are in the given board status.
 * @param {Object[]} tasks - Tasks included in the metric.
 * @param {string} status - Board status to count.
 * @returns {number} Number of matching tasks.
 */
function countTasksByStatus(tasks, status) {
  return tasks.filter((task) => task.status === status).length;
}


/**
 * Counts how many tasks have the given priority.
 * @param {Object[]} tasks - Tasks included in the metric.
 * @param {string} priority - Priority value to count.
 * @returns {number} Number of matching tasks.
 */
function countTasksByPriority(tasks, priority) {
  return tasks.filter((task) => task.priority === priority).length;
}


/**
 * Returns the closest valid due date from unfinished tasks.
 * @param {Object[]} tasks - Tasks searched for an upcoming deadline.
 * @param {Date} [today=new Date()] - Local comparison date.
 * @returns {string} Formatted deadline or the empty-state message.
 */
function getUpcomingDeadlineText(tasks, today = new Date()) {
  const upcomingDeadline = getUpcomingDeadline(tasks, today);
  if (!upcomingDeadline) return "No upcoming deadline";

  return upcomingDeadline.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}


/**
 * Selects the earliest upcoming date from unfinished tasks.
 * @param {Object[]} tasks - Tasks searched for due dates.
 * @param {Date} today - Local comparison date.
 * @returns {Date|undefined} Earliest valid deadline, if one exists.
 */
function getUpcomingDeadline(tasks, today) {
  const startOfToday = getStartOfDay(today);
  return getOpenTaskDueDates(tasks)
    .filter((dueDate) => dueDate && dueDate >= startOfToday)
    .sort((firstDate, secondDate) => firstDate - secondDate)[0];
}


/**
 * Returns midnight in the local timezone for date comparisons.
 * @param {Date} date - Date whose time component is removed.
 * @returns {Date} Copy representing local midnight.
 */
function getStartOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}


/**
 * Collects parsed due dates from tasks that are not done.
 * @param {Object[]} tasks - Tasks whose open due dates are collected.
 * @returns {(Date|null)[]} Parsed due dates from unfinished tasks.
 */
function getOpenTaskDueDates(tasks) {
  return tasks
    .filter((task) => task.status !== "done")
    .map((task) => parseTaskDueDate(task.dueDate));
}


