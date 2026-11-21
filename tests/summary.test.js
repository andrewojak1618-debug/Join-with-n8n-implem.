const assert = require("node:assert/strict");
const test = require("node:test");

const { loadBrowserScripts } = require("./helpers/scriptContext");

/**
 * Loads the task and summary logic in an isolated test context.
 * @returns {Object} Context exposing the loaded browser functions.
 */
function createSummaryContext() {
  return loadBrowserScripts([
    "components/js/core/shared.js",
    "components/js/tasks/tasks.js",
    "components/js/summary/summary.js",
  ]);
}


test("counts tasks by status", () => {
  const context = createSummaryContext();
  const tasks = [
    { status: "todo" },
    { status: "done" },
    { status: "todo" },
    { status: "in-progress" },
  ];
  assert.equal(context.countTasksByStatus(tasks, "todo"), 2);
  assert.equal(context.countTasksByStatus(tasks, "done"), 1);
  assert.equal(context.countTasksByStatus(tasks, "feedback"), 0);
});


test("counts tasks by priority", () => {
  const context = createSummaryContext();
  const tasks = [
    { priority: "urgent" },
    { priority: "medium" },
    { priority: "urgent" },
  ];
  assert.equal(context.countTasksByPriority(tasks, "urgent"), 2);
  assert.equal(context.countTasksByPriority(tasks, "low"), 0);
});


test("finds the closest upcoming deadline from open tasks", () => {
  const context = createSummaryContext();
  const today = new Date(2026, 6, 14, 12);
  const tasks = [
    { status: "todo", dueDate: "2026-07-20" },
    { status: "in-progress", dueDate: "2026-07-15" },
    { status: "done", dueDate: "2026-07-14" },
  ];
  const deadline = context.getUpcomingDeadline(tasks, today);
  assert.equal(deadline.getFullYear(), 2026);
  assert.equal(deadline.getMonth(), 6);
  assert.equal(deadline.getDate(), 15);
});


test("ignores completed, past and invalid deadlines", () => {
  const context = createSummaryContext();
  const today = new Date(2026, 6, 14, 12);
  const tasks = [
    { status: "todo", dueDate: "2026-07-13" },
    { status: "done", dueDate: "2026-07-15" },
    { status: "feedback", dueDate: "invalid" },
    { status: "todo", dueDate: "2026-07-18" },
  ];
  assert.equal(
    context.getUpcomingDeadlineText(tasks, today), "July 18, 2026"
  );
});


test("shows a fallback when no upcoming deadline exists", () => {
  const context = createSummaryContext();
  const today = new Date(2026, 6, 14, 12);
  const tasks = [
    { status: "done", dueDate: "2026-07-20" },
    { status: "todo", dueDate: "2026-07-01" },
  ];
  assert.equal(
    context.getUpcomingDeadlineText(tasks, today), "No upcoming deadline"
  );
});


test("shows the mobile greeting after user data was rendered", () => {
  const classes = new Set();
  let animationHandler;
  const greeting = {
    classList: {
      add: (className) => classes.add(className),
      remove: (className) => classes.delete(className),
    },
    addEventListener: (eventName, handler) => {
      if (eventName === "animationend") animationHandler = handler;
    },
  };
  const context = loadBrowserScripts(["components/js/core/shared.js", "components/js/summary/summary.js"], {
    document: { querySelector: () => greeting },
  });

  context.showMobileSummaryGreeting();
  assert.equal(classes.has("summary-greeting--visible"), true);

  animationHandler({ currentTarget: greeting });
  assert.equal(classes.has("summary-greeting--visible"), false);
});


/**
 * Provides rendered text cells for summary behavior tests.
 * @param {Object|null} user - Current session used by the greeting.
 * @returns {Object} Script context and captured text cells.
 */
function createRenderedSummary(user = null) {
  const cells = {};
  const document = {
    getElementById: (id) => cells[id] ||= { textContent: "" },
    querySelector: () => null,
  };
  const context = loadBrowserScripts([
    "components/js/core/shared.js", "components/js/summary/summary.js",
  ], { document, parseTaskDueDate: () => null });
  context.getStoredUser = () => user;
  return { context, cells };
}


for (const type of ["guest", "firebase-guest"]) {
  test(`greets ${type} without name or comma`, () => {
    const { context, cells } = createRenderedSummary({ type, name: "Guest" });
    context.initSummaryUser();
    assert.equal(cells.summaryTitleName.textContent, "");
    assert.equal(cells.summaryTitleTime.textContent, context.getTimeGreeting());
    assert.equal(cells.summaryGreeting.textContent, "");
    assert.equal(cells.summaryGreetingTime.textContent.endsWith(","), false);
  });
}


test("greets a member with trimmed name and one comma", () => {
  const { context, cells } = createRenderedSummary({ type: "member", name: "  Andre  " });
  context.initSummaryUser();
  assert.equal(cells.summaryTitleName.textContent, "Andre");
  assert.equal(cells.summaryTitleTime.textContent, `${context.getTimeGreeting()},`);
  assert.equal(cells.summaryGreeting.textContent, "Andre");
  assert.equal(cells.summaryGreetingTime.textContent, cells.summaryTitleTime.textContent);
});


test("omits the comma when a member has no display name", () => {
  const { context, cells } = createRenderedSummary({ type: "member", name: "   " });
  context.initSummaryUser();
  assert.equal(cells.summaryTitleName.textContent, "");
  assert.equal(cells.summaryTitleTime.textContent.endsWith(","), false);
});


test("counts email requests across all statuses and excludes other sources", () => {
  const { context, cells } = createRenderedSummary();
  const statuses = ["triage", "todo", "in-progress", "feedback", "done"];
  const tasks = statuses.map(status => ({ status, source: "email" }));
  context.renderSummaryMetrics([...tasks, { source: "manual" }, {}, { source: "Email" }]);
  assert.equal(cells.summaryEmailCount.textContent, 5);
  assert.equal(cells.summaryBoardCount.textContent, 8);
  context.renderSummaryMetrics([]);
  assert.equal(cells.summaryEmailCount.textContent, 0);
});


test("shows a placeholder for email requests while no counts are available", () => {
  const { context, cells } = createRenderedSummary();
  context.blankSummaryMetricValues();
  assert.equal(cells.summaryEmailCount.textContent, "–");
  context.renderSummaryMetrics([{ source: "email", status: "done" }]);
  assert.equal(cells.summaryEmailCount.textContent, 1);
});
