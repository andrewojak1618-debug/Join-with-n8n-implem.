const tasksCacheKey = "joinTasksCache";
let tasksLoadPromise = null;
let tasksCacheAvailable = true;


/**
 * Loads tasks from Firestore when available, otherwise from localStorage.
 * Reuses one in-flight request so concurrent callers share a single fetch.
 * @returns {Promise<Object[]>} Tasks from the active data store.
 */
async function loadTasksFromStore() {
  if (!tasksLoadPromise) {
    tasksLoadPromise = fetchAndCacheTasks().finally(() => {
      tasksLoadPromise = null;
    });
  }
  return tasksLoadPromise;
}


/**
 * Fetches tasks from the active store and refreshes the session cache.
 * @returns {Promise<Object[]>} Fresh tasks from the active data store.
 */
async function fetchAndCacheTasks() {
  const tasks = isTaskFirestoreReady()
    ? await window.joinFirebaseTasks.loadTasks()
    : getStoredTasks();
  cacheTasksSnapshot(tasks);
  return tasks;
}


/**
 * Returns the last cached task snapshot for instant rendering, if any.
 * @returns {Object[]|null} Cached tasks, or null without a usable cache.
 */
function getCachedTasksSnapshot() {
  if (!tasksCacheAvailable) return null;
  try {
    const cached = sessionStorage.getItem(tasksCacheKey);
    return cached ? JSON.parse(cached) : null;
  } catch {
    tasksCacheAvailable = false;
    return null;
  }
}


/**
 * Saves the given tasks as the session's cached snapshot.
 * @param {Object[]} tasks - Tasks to cache for instant rendering next time.
 */
function cacheTasksSnapshot(tasks) {
  if (!tasksCacheAvailable) return false;
  try {
    sessionStorage.setItem(tasksCacheKey, JSON.stringify(tasks));
    return true;
  } catch {
    tasksCacheAvailable = false;
    return false;
  }
}


/**
 * Clears the cached task snapshot after it no longer reflects the store.
 */
function clearTasksCache() {
  if (!tasksCacheAvailable) return false;
  try {
    sessionStorage.removeItem(tasksCacheKey);
    return true;
  } catch {
    tasksCacheAvailable = false;
    return false;
  }
}


/**
 * Replaces legacy assignee names with stable contact references where possible.
 * @param {Object[]} tasks - Tasks loaded from the active store.
 * @param {Object[]} [contacts] - Contacts already loaded by the caller.
 * @returns {Promise<Object[]>} Tasks with normalized assignments.
 */
async function migrateTaskAssigneeReferences(tasks, contacts) {
  const migrationContacts = contacts || await loadTaskMigrationContacts();
  const migratedTasks = tasks.map((task) =>
    migrateTaskAssignees(task, migrationContacts),
  );
  const changedTasks = migratedTasks.filter((task, index) =>
    hasTaskAssignmentsChanged(tasks[index], task),
  );
  await Promise.all(changedTasks.map(updateTaskAssigneesInStore));
  return migratedTasks;
}


/**
 * Persists only migrated assignments so concurrent task edits stay intact.
 * @param {Object} task - Task containing the normalized assignments.
 */
async function updateTaskAssigneesInStore(task) {
  const adapter = window.joinFirebaseTasks;
  if (isTaskFirestoreReady() && adapter.updateTaskAssignees) {
    await adapter.updateTaskAssignees(task.id, task.assignedTo);
    clearTasksCache();
    return;
  }
  await updateTaskInStore(task);
}


/**
 * Loads contacts for the legacy migration without blocking task rendering.
 * @returns {Promise<Object[]>} Contacts or an empty fallback.
 */
async function loadTaskMigrationContacts() {
  try {
    return await loadContactsFromStore();
  } catch {
    return [];
  }
}


/**
 * Returns one task with every assignee in the current reference format.
 * @param {Object} task - Task to normalize.
 * @param {Object[]} contacts - Contacts used to resolve legacy names.
 * @returns {Object} Normalized task copy.
 */
function migrateTaskAssignees(task, contacts) {
  const assignedTo = getTaskAssigneeReferences(task.assignedTo).map((assignee) =>
    resolveTaskAssigneeContact(assignee, contacts),
  );
  return { ...task, assignedTo };
}


/**
 * Resolves one legacy name only when exactly one contact matches it.
 * @param {Object} assignee - Normalized assignee reference.
 * @param {Object[]} contacts - Available contacts.
 * @returns {Object} Reference with a stable id whenever it can be resolved.
 */
function resolveTaskAssigneeContact(assignee, contacts) {
  if (assignee.id) {
    const contact = contacts.find((item) => String(item.id) === assignee.id);
    return contact ? createTaskAssigneeReference(contact) : assignee;
  }
  const matches = contacts.filter((contact) => contact.name === assignee.name);
  return matches.length === 1
    ? createTaskAssigneeReference(matches[0])
    : assignee;
}


/**
 * Checks whether migration changed the persisted assignment representation.
 * @param {Object} originalTask - Task before migration.
 * @param {Object} migratedTask - Task after migration.
 * @returns {boolean} True when the assignment list needs to be saved.
 */
function hasTaskAssignmentsChanged(originalTask, migratedTask) {
  return (
    JSON.stringify(originalTask.assignedTo || []) !==
    JSON.stringify(migratedTask.assignedTo)
  );
}


/**
 * Creates one task in Firestore or localStorage and returns it with an id.
 * @param {Object} task - Task data to create.
 * @returns {Promise<Object>} Created task including its store id.
 */
async function createTaskInStore(task) {
  const createdTask = isTaskFirestoreReady()
    ? await window.joinFirebaseTasks.createTask(task)
    : saveAndReturnCreatedTask(task);
  clearTasksCache();
  return createdTask;
}


/**
 * Saves a task locally and returns it, keeping createTaskInStore short.
 * @param {Object} task - Task to persist locally.
 * @returns {Object} The stored task.
 */
function saveAndReturnCreatedTask(task) {
  saveCreatedTask(task);
  return task;
}


/**
 * Updates one task in Firestore or localStorage.
 * @param {Object} task - Complete task data to persist.
 * @returns {Promise<void>} Resolves after the update completes.
 */
async function updateTaskInStore(task) {
  if (isTaskFirestoreReady()) {
    await window.joinFirebaseTasks.updateTask(task.id, task);
  } else {
    updateStoredTask(task);
  }
  clearTasksCache();
}


/**
 * Deletes one task from Firestore or localStorage.
 * @param {string} taskId - Id of the task to delete.
 * @returns {Promise<void>} Resolves after deletion completes.
 */
async function deleteTaskFromStore(taskId) {
  if (isTaskFirestoreReady()) {
    await window.joinFirebaseTasks.deleteTask(taskId);
  } else {
    deleteStoredTask(taskId);
  }
  clearTasksCache();
}


/**
 * @returns {boolean} True when the Firebase task helpers are available.
 */
function isTaskFirestoreReady() {
  return Boolean(window.joinFirebaseTasks);
}
