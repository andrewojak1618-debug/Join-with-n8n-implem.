const assert = require("node:assert/strict");
const test = require("node:test");

const { loadBrowserScripts } = require("./helpers/scriptContext");

const dueDateField = { min: "", value: "" };
let normalizedDueDate = "";
const document = {
  getElementById(id) {
    return id === "taskDueDate" ? dueDateField : null;
  },
  createElement() {
    return {
      dataset: {},
      classList: { toggle() {} },
      setAttribute() {},
    };
  },
};
const context = loadBrowserScripts(
  [
    "components/js/core/shared.js",
    "components/js/addTask/addTaskValidation.js",
    "components/js/addTask/addTaskDatePicker.js",
  ],
  { document, getAddTaskDueDate: () => normalizedDueDate },
);


test("formats the local date for the native Add Task date picker", () => {
  const date = new Date(2026, 6, 20, 12);
  assert.equal(context.getTodayTaskDueDate(date), "2026-07-20");
});


test("keeps today selectable in the custom Add Task date picker", () => {
  const today = new Date();
  const day = context.createAddTaskDatePickerDay(today.getDate());
  assert.equal(day.dataset.date, context.getTodayTaskDueDate(today));
  assert.equal(day.disabled, false);
});


test("recognizes past, current and future Add Task due dates", () => {
  assert.equal(context.isPastAddTaskDueDate("2026-07-19", "2026-07-20"), true);
  assert.equal(context.isPastAddTaskDueDate("2026-07-20", "2026-07-20"), false);
  assert.equal(context.isPastAddTaskDueDate("2026-07-21", "2026-07-20"), false);
});


test("rejects an empty Add Task due date", () => {
  dueDateField.value = "";
  assert.equal(context.getAddTaskDueDateError(), "Please select a due date.");
});


test("rejects an invalid normalized Add Task due date", () => {
  dueDateField.value = "2026-02-31";
  normalizedDueDate = "";
  assert.equal(context.getAddTaskDueDateError(), "Please select a valid due date.");
});


test("rejects past Add Task due dates", () => {
  const today = context.getTodayTaskDueDate();
  const yesterday = new Date(`${today}T12:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  dueDateField.value = yesterday.toISOString().slice(0, 10);
  normalizedDueDate = dueDateField.value;
  assert.equal(
    context.getAddTaskDueDateError(),
    "Please select today or a future date.",
  );
});


test("accepts today as an Add Task due date", () => {
  dueDateField.value = context.getTodayTaskDueDate();
  normalizedDueDate = dueDateField.value;
  assert.equal(context.getAddTaskDueDateError(), "");
});
