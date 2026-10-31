const assert = require("node:assert/strict");
const test = require("node:test");

const { loadBrowserScripts } = require("./helpers/scriptContext");


test("offers the adjacent board columns as move targets", () => {
  const context = loadBrowserScripts(["components/js/board/boardViewData.js"]);

  assert.deepEqual(
    Array.from(
      context.getBoardMoveTargets("in-progress"),
      (target) => target.value,
    ),
    ["todo", "feedback"],
  );
});


test("uses directional icons relative to the current board column", () => {
  const context = loadBrowserScripts(["components/js/board/boardViewData.js"]);
  const targets = context.getBoardMoveTargets("feedback");

  assert.deepEqual(
    Array.from(targets, (target) => target.icon),
    ["arrow_upward", "arrow_downward"],
  );
});


test("renders one column's tasks ordered by creation time, oldest first", () => {
  const taskList = { dataset: { boardStatus: "todo" }, innerHTML: "" };
  const context = loadBrowserScripts(
    ["components/js/tasks/tasks.js", "components/js/board/board.js"],
    {
      getBoardTaskTemplate: (task) => `${task.id};`,
      getBoardTaskViewData: (task) => task,
      getBoardEmptyTemplate: () => "empty",
      formatBoardStatus: (status) => status,
    },
  );
  const tasks = [
    { id: "third", status: "todo", createdAt: "2026-01-03T00:00:00.000Z" },
    { id: "first", status: "todo", createdAt: "2026-01-01T00:00:00.000Z" },
    { id: "other-column", status: "done", createdAt: "2026-01-02T00:00:00.000Z" },
    { id: "second", status: "todo", createdAt: "2026-01-02T00:00:00.000Z" },
    { id: "no-timestamp", status: "todo" },
  ];

  context.renderBoardColumn(taskList, tasks);

  assert.equal(taskList.innerHTML, "no-timestamp;first;second;third;");
});


test("renders a moved task immediately and persists its new status", async () => {
  const task = { id: "task-1", status: "todo" };
  const state = { renders: 0, savedStatus: "" };
  const context = loadBrowserScripts(["components/js/board/boardDnd.js"], {
    activeBoardTasks: [task],
    renderBoardColumns: () => { state.renders += 1; },
    initBoardTaskDetails() {},
    updateTaskInStore: async (updatedTask) => {
      state.savedStatus = updatedTask.status;
    },
  });

  await context.moveBoardTaskToStatus(task, "done");

  assert.equal(task.status, "done");
  assert.equal(state.renders, 1);
  assert.equal(state.savedStatus, "done");
});
