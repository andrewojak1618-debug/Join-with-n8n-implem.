const assert = require("node:assert/strict");
const test = require("node:test");

const { loadBrowserScripts } = require("./helpers/scriptContext");

const elements = {
  taskTitle: { value: "  Prepare release  " },
  taskDescription: { value: "  Verify the final build  " },
  taskDueDate: { value: "  2026-07-25  " },
  taskCategory: { value: "  technical-task  " },
};
const document = {
  getElementById: (id) => elements[id],
  querySelector: () => ({ value: "  urgent  " }),
};
const context = loadBrowserScripts([
  "components/js/core/shared.js",
  "components/js/tasks/tasks.js",
  "components/js/addTask/addTask.js",
], { document });


test("trims Add Task strings before building the task", () => {
  assert.equal(context.getTrimmedInputValue("taskTitle"), "Prepare release");
  assert.equal(context.getTrimmedInputValue("taskDescription"), "Verify the final build");
  assert.equal(context.getAddTaskDueDate(), "2026-07-25");
  assert.equal(context.getAddTaskPriority(), "urgent");
  assert.equal(context.getAddTaskCategory(), "technical-task");
});


test("treats whitespace-only required Add Task strings as empty", () => {
  elements.taskTitle.value = "   ";
  elements.taskCategory.value = "   ";
  assert.equal(context.getTrimmedInputValue("taskTitle"), "");
  assert.equal(context.getAddTaskCategory(), "");
});


test("maps the custom category button blur to category validation", () => {
  const dropdown = { contains: (target) => target === "inside" };
  const validationContext = loadBrowserScripts([
    "components/js/core/shared.js",
    "components/js/addTask/addTaskValidation.js",
  ], { document: { getElementById: () => dropdown } });
  assert.equal(validationContext.getAddTaskBlurFieldId({
    target: { id: "taskCategoryButton" }, relatedTarget: "outside",
  }), "taskCategory");
  assert.equal(validationContext.getAddTaskBlurFieldId({
    target: { id: "taskCategoryButton" }, relatedTarget: "inside",
  }), "");
});


test("marks the visible category button as invalid", () => {
  const button = {
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
  };
  const error = { textContent: "" };
  const document = {
    getElementById: (id) => id === "taskCategoryButton" ? button : error,
  };
  const validationContext = loadBrowserScripts([
    "components/js/core/shared.js",
    "components/js/addTask/addTaskValidation.js",
  ], { document });
  validationContext.setAddTaskFieldError(
    "taskCategory", "taskCategoryError", "Please select a category.",
  );
  assert.equal(button.attributes["aria-invalid"], "true");
  assert.equal(error.textContent, "Please select a category.");
});
