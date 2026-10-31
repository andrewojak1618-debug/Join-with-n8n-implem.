const assert = require("node:assert/strict");
const test = require("node:test");

const { loadBrowserScripts } = require("./helpers/scriptContext");


test("completes local logout when Firebase logout fails", async () => {
  let cleared = false;
  let destination = "";
  const context = loadBrowserScripts(["components/js/auth/auth.js"], {
    console: { error() {} },
    window: {
      joinFirebaseAuth: {
        async logoutFirebaseUser() { throw new Error("offline"); },
      },
    },
    clearStoredUser: () => { cleared = true; },
    navigateToPage: (page) => { destination = page; },
  });

  await context.handleLogout();

  assert.equal(cleared, true);
  assert.equal(destination, "login");
});


test("shows feedback when initial summary loading fails", async () => {
  const error = { textContent: "", hidden: true };
  const context = loadBrowserScripts(["components/js/core/shared.js", "components/js/summary/summary.js"], {
    document: { getElementById: () => error, querySelector: () => null },
    getCachedTasksSnapshot: () => null,
    loadTasksFromStore: async () => { throw new Error("offline"); },
  });

  await context.initSummaryMetrics();

  assert.equal(error.textContent, "Task overview could not be loaded.");
  assert.equal(error.hidden, false);
});


test("renders cached tasks immediately without waiting for the store", async () => {
  const cells = {};
  const metricIds = [
    "summaryTodoCount", "summaryDoneCount", "summaryUrgentCount",
    "summaryBoardCount", "summaryProgressCount", "summaryFeedbackCount",
    "summaryDeadlineDate",
  ];
  metricIds.forEach((id) => { cells[id] = { textContent: "" }; });
  let resolveLoad;
  const pendingLoad = new Promise((resolve) => { resolveLoad = resolve; });

  const context = loadBrowserScripts(["components/js/core/shared.js", "components/js/summary/summary.js"], {
    document: { getElementById: (id) => cells[id], querySelector: () => null },
    getCachedTasksSnapshot: () => [{ status: "todo" }, { status: "done" }],
    loadTasksFromStore: () => pendingLoad,
    parseTaskDueDate: () => null,
  });

  const metricsLoaded = context.initSummaryMetrics();
  assert.equal(cells.summaryTodoCount.textContent, 1);
  assert.equal(cells.summaryDoneCount.textContent, 1);

  resolveLoad([{ status: "todo" }, { status: "todo" }]);
  await metricsLoaded;

  assert.equal(cells.summaryTodoCount.textContent, 2);
  assert.equal(cells.summaryDoneCount.textContent, 0);
});


test("shows feedback when initial board loading fails", async () => {
  const toast = { textContent: "", hidden: true };
  const context = loadBrowserScripts(["components/js/core/shared.js", "components/js/board/board.js"], {
    document: {
      querySelectorAll: () => [{}],
      getElementById: () => toast,
    },
    loadTasksFromStore: async () => { throw new Error("offline"); },
    loadSortedContactsSafely: async () => [],
    setTimeout: () => 0,
  });

  await context.initBoardTasks();

  assert.equal(toast.textContent, "Board tasks could not be loaded.");
  assert.equal(toast.hidden, false);
});


/**
 * Creates an isolated board action context with captured feedback messages.
 * @param {Object} task - Task returned as the active board task.
 * @returns {Object} Browser context and its collected messages.
 */
function createBoardActionContext(task) {
  const messages = [];
  const toast = {
    hidden: true,
    set textContent(message) { messages.push(message); },
  };
  const context = loadBrowserScripts([
    "components/js/core/shared.js",
    "components/js/board/boardDetail.js",
  ], {
    document: { getElementById: () => toast },
    getActiveBoardTask: () => task,
    updateTaskInStore: async () => { throw new Error("offline"); },
    setTimeout: () => 0,
  });
  return { context, messages };
}


test("restores a subtask checkbox and reports a failed update", async () => {
  const task = { id: "task-1", subtasks: [{ title: "Test", done: false }] };
  const { context, messages } = createBoardActionContext(task);
  const checkbox = {
    checked: true,
    dataset: { detailSubtaskIndex: "0" },
    matches: () => true,
  };

  await context.handleBoardDetailSubtaskChange({ target: checkbox });

  assert.equal(checkbox.checked, false);
  assert.deepEqual(messages, ["Subtask could not be updated."]);
});


/**
 * Creates an isolated board move context with observable state.
 * @returns {Object} Browser context and move state.
 */
function createBoardMoveContext() {
  const state = {
    targetStatus: "",
    toast: { hidden: true, textContent: "" },
  };
  const context = loadBrowserScripts([
    "components/js/core/shared.js",
    "components/js/board/board.js",
  ], {
    document: { getElementById: () => state.toast },
    moveBoardTaskToStatus: (_task, status) =>
      rejectBoardMove(state, status),
    setTimeout: () => 0,
  });
  return { context, state };
}


/**
 * Records the requested status and simulates an unavailable task store.
 */
async function rejectBoardMove(state, status) {
  state.targetStatus = status;
  throw new Error("offline");
}


test("reports a failed mobile card move", async () => {
  const task = { id: "task-1", status: "todo" };
  const { context, state } = createBoardMoveContext();
  const event = {
    currentTarget: { dataset: { moveStatus: "done" } },
    stopPropagation() {},
  };
  const card = { dataset: { taskId: "task-1" } };

  await context.handleBoardCardMoveOption(event, card, [task]);

  assert.equal(state.targetStatus, "done");
  assert.equal(state.toast.textContent, "Task status could not be updated.");
  assert.equal(state.toast.hidden, false);
});
