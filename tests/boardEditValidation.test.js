const assert = require("node:assert/strict");
const test = require("node:test");

const { loadBrowserScripts } = require("./helpers/scriptContext");

const fields = {
  boardTaskEditTitle: { value: "" },
  boardTaskEditDescription: { value: "" },
  boardTaskEditDueDate: { value: "" },
  boardTaskEditCategory: { value: "technical-task" },
};

const document = {
  getElementById(id) {
    return fields[id] || null;
  },
  querySelector() {
    return { value: "  low  " };
  },
};

const context = loadBrowserScripts(
  [
    "components/js/core/shared.js",
    "components/js/tasks/tasks.js",
    "components/js/board/boardEdit.js",
  ],
  {
    document,
    getActiveBoardTask: () => ({ dueDate: "2026-07-16" }),
    getBoardEditedAssigneesFromContacts: () => [],
    getBoardEditSubtaskItems: () => [],
  },
);


test("accepts a valid board edit due date", () => {
  fields.boardTaskEditDueDate.value = "2026-07-16";
  assert.equal(context.getBoardEditFieldError("DueDate"), "");
});


test("distinguishes a missing board edit due date", () => {
  fields.boardTaskEditDueDate.value = "";
  assert.equal(
    context.getBoardEditFieldError("DueDate"),
    "Please enter a due date.",
  );
});


test("rejects an impossible board edit due date before saving", () => {
  fields.boardTaskEditDueDate.value = "2026-02-31";
  assert.equal(
    context.getBoardEditFieldError("DueDate"),
    "Please enter a valid due date.",
  );
});


test("trims board edit strings before building the stored task", () => {
  fields.boardTaskEditTitle.value = "  Updated title  ";
  fields.boardTaskEditDescription.value = "  Updated description  ";
  fields.boardTaskEditDueDate.value = "  2026-07-16  ";
  fields.boardTaskEditCategory.value = "  user-story  ";
  const task = context.getBoardEditedTask({ id: "task-1" });
  assert.equal(task.title, "Updated title");
  assert.equal(task.description, "Updated description");
  assert.equal(task.dueDate, "2026-07-16");
  assert.equal(task.priority, "low");
  assert.equal(task.category, "user-story");
});


test("saves imported tickets without a deadline", () => {
  const original = context.getActiveBoardTask;
  try {
    fields.boardTaskEditDueDate.value = "";
    for (const task of [{}, { dueDate: null }, { dueDate: "" }]) {
      context.getActiveBoardTask = () => task;
      assert.equal(context.getBoardEditFieldError("DueDate"), "");
      assert.equal(context.getBoardEditedTask(task).dueDate, null);
    }
  } finally {
    context.getActiveBoardTask = original;
  }
});
