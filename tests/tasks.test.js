const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createMemoryStorage,
  loadBrowserScripts,
  toPlainValue,
} = require("./helpers/scriptContext");

const tasksScript = "components/js/tasks/tasks.js";
const sharedScript = "components/js/core/shared.js";
const taskStoreScript = "components/js/tasks/tasksStore.js";
const taskStorageKey = "joinTasks";

/**
 * Loads the local task logic with optional tasks in memory.
 * @param {Object[]} [initialTasks] - Tasks available at test start.
 * @returns {Object} Test context and its memory storage.
 */
function createTaskContext(initialTasks) {
  const initialEntries = initialTasks
    ? { [taskStorageKey]: JSON.stringify(initialTasks) }
    : {};
  const localStorage = createMemoryStorage(initialEntries);
  const context = loadBrowserScripts([sharedScript, tasksScript], { localStorage });
  return { context, localStorage };
}


/**
 * Loads the task store with a mocked Firebase adapter.
 * @param {Object} firebaseTasks - Mocked Firebase task methods.
 * @returns {Object} Test context and its memory storages.
 */
function createFirebaseTaskContext(firebaseTasks) {
  const localStorage = createMemoryStorage();
  const sessionStorage = createMemoryStorage();
  const window = { joinFirebaseTasks: firebaseTasks };
  const context = loadBrowserScripts(
    [sharedScript, tasksScript, taskStoreScript], { localStorage, sessionStorage, window }
  );
  return { context, localStorage, sessionStorage };
}


test("returns an empty task list when localStorage has no tasks", () => {
  const { context } = createTaskContext();
  assert.deepEqual(toPlainValue(context.getStoredTasks()), []);
});


test("adds a new task to localStorage", () => {
  const existingTask = { id: "task-1", title: "Existing task" };
  const newTask = { id: "task-2", title: "Write tests" };
  const { context } = createTaskContext([existingTask]);
  context.saveCreatedTask(newTask);
  assert.deepEqual(toPlainValue(context.getStoredTasks()), [existingTask, newTask]);
});


test("updates only the task with the matching id", () => {
  const firstTask = { id: "task-1", title: "First", status: "todo" };
  const secondTask = { id: "task-2", title: "Second", status: "todo" };
  const { context } = createTaskContext([firstTask, secondTask]);
  context.updateStoredTask({ ...secondTask, status: "done" });
  const expectedTasks = [firstTask, { ...secondTask, status: "done" }];
  assert.deepEqual(toPlainValue(context.getStoredTasks()), expectedTasks);
});


test("deletes only the task with the matching id", () => {
  const firstTask = { id: "task-1", title: "Keep me" };
  const secondTask = { id: "task-2", title: "Delete me" };
  const { context } = createTaskContext([firstTask, secondTask]);
  context.deleteStoredTask(secondTask.id);
  assert.deepEqual(toPlainValue(context.getStoredTasks()), [firstTask]);
});


test("normalizes ISO and legacy task dates", () => {
  const { context } = createTaskContext();
  assert.equal(context.normalizeTaskDueDate("  2026-07-15  "), "2026-07-15");
  assert.equal(context.normalizeTaskDueDate("15/07/2026"), "2026-07-15");
  assert.equal(context.formatTaskDueDate("2026-07-15"), "15/07/2026");
});


test("normalizes task selections before they are stored", () => {
  const { context } = createTaskContext();
  assert.equal(context.normalizeTaskPriority("  urgent  "), "urgent");
  assert.equal(context.normalizeTaskPriority("invalid"), "medium");
  assert.equal(context.normalizeTaskCategory("  user-story  "), "user-story");
  assert.equal(context.normalizeTaskCategory("invalid"), "");
});


test("rejects impossible or unsupported task dates", () => {
  const { context } = createTaskContext();
  assert.equal(context.normalizeTaskDueDate("2026-02-31"), "");
  assert.equal(context.normalizeTaskDueDate("July 15, 2026"), "");
  assert.equal(context.parseTaskDueDate("not-a-date"), null);
});


test("reads a comparable creation time from different createdAt shapes", () => {
  const { context } = createTaskContext();
  assert.equal(context.getTaskCreatedAtMillis({ createdAt: "2026-01-01T00:00:00.000Z" }), Date.parse("2026-01-01T00:00:00.000Z"));
  assert.equal(context.getTaskCreatedAtMillis({ createdAt: { toMillis: () => 1234 } }), 1234);
  assert.equal(context.getTaskCreatedAtMillis({ createdAt: { seconds: 2 } }), 2000);
  assert.equal(context.getTaskCreatedAtMillis({}), 0);
  assert.equal(context.getTaskCreatedAtMillis({ createdAt: "not-a-date" }), 0);
});


test("uses the Firebase adapter when it is available", async () => {
  const calls = [];
  const firebaseTasks = {
    async updateTask(taskId, task) {
      calls.push({ taskId, task });
    },
  };
  const { context, localStorage } = createFirebaseTaskContext(firebaseTasks);
  const task = { id: "task-1", title: "Move me", status: "done" };
  await context.updateTaskInStore(task);
  assert.deepEqual(calls, [{ taskId: task.id, task }]);
  assert.equal(localStorage.getItem(taskStorageKey), null);
});


test("reuses one in-flight request for concurrent task loads", async () => {
  let loadCount = 0;
  const firebaseTasks = {
    async loadTasks() {
      loadCount += 1;
      return [{ id: "task-1" }];
    },
  };
  const { context } = createFirebaseTaskContext(firebaseTasks);
  const [first, second] = await Promise.all([
    context.loadTasksFromStore(),
    context.loadTasksFromStore(),
  ]);
  assert.deepEqual(toPlainValue(first), toPlainValue(second));
  assert.equal(loadCount, 1);
});


test("caches loaded tasks for instant rendering on the next call", async () => {
  const firebaseTasks = { async loadTasks() { return [{ id: "task-1" }]; } };
  const { context } = createFirebaseTaskContext(firebaseTasks);
  await context.loadTasksFromStore();
  assert.deepEqual(
    toPlainValue(context.getCachedTasksSnapshot()), [{ id: "task-1" }],
  );
});


test("clears the cached tasks after create, update and delete", async () => {
  const firebaseTasks = {
    async createTask(task) { return task; },
    async updateTask() {},
    async deleteTask() {},
  };
  const { context, sessionStorage } = createFirebaseTaskContext(firebaseTasks);
  sessionStorage.setItem("joinTasksCache", JSON.stringify([{ id: "task-1" }]));

  await context.createTaskInStore({ title: "New task" });
  assert.equal(sessionStorage.getItem("joinTasksCache"), null);

  sessionStorage.setItem("joinTasksCache", JSON.stringify([{ id: "task-1" }]));
  await context.updateTaskInStore({ id: "task-1", status: "done" });
  assert.equal(sessionStorage.getItem("joinTasksCache"), null);

  sessionStorage.setItem("joinTasksCache", JSON.stringify([{ id: "task-1" }]));
  await context.deleteTaskFromStore("task-1");
  assert.equal(sessionStorage.getItem("joinTasksCache"), null);
});
