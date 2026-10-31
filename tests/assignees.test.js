const assert = require("node:assert/strict");
const test = require("node:test");

const {
  loadBrowserScripts,
  toPlainValue,
} = require("./helpers/scriptContext");

const sharedScript = "components/js/core/shared.js";
const taskStoreScript = "components/js/tasks/tasksStore.js";
const contactsScript = "components/js/contacts/contacts.js";

/**
 * Loads the shared assignee helpers in isolation.
 * @returns {Object} Context exposing the shared helper functions.
 */
function createSharedContext() {
  return loadBrowserScripts([sharedScript]);
}


/**
 * Creates a Firebase task adapter that records every persisted update.
 * @param {Object[]} updates - Target list for captured updates.
 * @returns {Object} Minimal Firebase task adapter.
 */
function createFirebaseTaskAdapter(updates) {
  return {
    async updateTask(taskId, task) {
      updates.push({ taskId, task: toPlainValue(task) });
    },
  };
}


/**
 * Loads task migration logic with contacts and an observable Firebase adapter.
 * @param {Object[]} contacts - Contacts available during legacy migration.
 * @returns {Object} Migration context and captured task updates.
 */
function createMigrationContext(contacts) {
  const updates = [];
  const window = { joinFirebaseTasks: createFirebaseTaskAdapter(updates) };
  const loadContactsFromStore = async () => contacts;
  const context = loadBrowserScripts(
    [sharedScript, taskStoreScript],
    { loadContactsFromStore, window },
  );
  return { context, updates };
}


/**
 * Loads the contact cleanup helper with shared assignee behavior.
 * @returns {Object} Context exposing contact task cleanup functions.
 */
function createContactContext() {
  return loadBrowserScripts([sharedScript, contactsScript]);
}


test("normalizes legacy strings and current assignee references", () => {
  const context = createSharedContext();
  const assignedTo = ["Anna Schmidt", { id: "contact-2", name: "Ben Mueller" }];
  const actual = context.getTaskAssigneeReferences(assignedTo);
  assert.deepEqual(toPlainValue(actual), [
    { id: "", name: "Anna Schmidt" },
    { id: "contact-2", name: "Ben Mueller" },
  ]);
});


test("migrates a unique legacy name to a stable contact id", async () => {
  const contacts = [{ id: "contact-1", name: "Anna Schmidt" }];
  const { context, updates } = createMigrationContext(contacts);
  const tasks = [{ id: "task-1", assignedTo: ["Anna Schmidt"] }];
  const migrated = await context.migrateTaskAssigneeReferences(tasks);
  assert.deepEqual(toPlainValue(migrated[0].assignedTo), [
    { id: "contact-1", name: "Anna Schmidt" },
  ]);
  assert.equal(updates.length, 1);
});


test("does not rewrite an already normalized assignment", async () => {
  const assignee = { id: "contact-1", name: "Anna Schmidt" };
  const { context, updates } = createMigrationContext([assignee]);
  const tasks = [{ id: "task-1", assignedTo: [assignee] }];
  const migrated = await context.migrateTaskAssigneeReferences(tasks);
  assert.deepEqual(toPlainValue(migrated), tasks);
  assert.equal(updates.length, 0);
});


test("keeps an ambiguous legacy name unresolved", async () => {
  const contacts = [
    { id: "contact-1", name: "Alex Kim" },
    { id: "contact-2", name: "Alex Kim" },
  ];
  const { context } = createMigrationContext(contacts);
  const tasks = [{ id: "task-1", assignedTo: ["Alex Kim"] }];
  const migrated = await context.migrateTaskAssigneeReferences(tasks);
  assert.deepEqual(toPlainValue(migrated[0].assignedTo), [
    { id: "", name: "Alex Kim" },
  ]);
});


test("distinguishes contacts with the same name by id", () => {
  const context = createSharedContext();
  const assignee = { id: "contact-1", name: "Alex Kim" };
  assert.equal(context.isTaskAssigneeContact(assignee, assignee), true);
  assert.equal(
    context.isTaskAssigneeContact(assignee, { id: "contact-2", name: "Alex Kim" }),
    false,
  );
});


test("contact deletion removes only the matching assignee id", () => {
  const context = createContactContext();
  const task = {
    id: "task-1",
    assignedTo: [
      { id: "contact-1", name: "Alex Kim" },
      { id: "contact-2", name: "Alex Kim" },
    ],
  };
  const result = context.removeAssigneeFromTask(task, task.assignedTo[0]);
  assert.deepEqual(toPlainValue(result.assignedTo), [task.assignedTo[1]]);
});


test("contact rename updates the matching board assignee reference", () => {
  const context = createContactContext();
  const contact = { id: "contact-1", name: "Alex Kim" };
  const updatedContact = { ...contact, name: "Alex Morgan" };
  const task = {
    id: "task-1",
    assignedTo: [
      contact,
      { id: "contact-2", name: "Alex Kim" },
    ],
  };
  const result = context.updateTaskContactReference(
    task, contact, updatedContact, false,
  );
  assert.deepEqual(toPlainValue(result.assignedTo), [
    { id: "contact-1", name: "Alex Morgan" },
    { id: "contact-2", name: "Alex Kim" },
  ]);
});


test("contact rename updates an unambiguous legacy assignee name", () => {
  const context = createContactContext();
  const contact = { id: "contact-1", name: "Anna Schmidt" };
  const updatedContact = { ...contact, name: "Anna Berger" };
  const task = { id: "task-1", assignedTo: ["Anna Schmidt"] };
  const result = context.updateTaskContactReference(
    task, contact, updatedContact, true,
  );
  assert.deepEqual(toPlainValue(result.assignedTo), [
    { id: "contact-1", name: "Anna Berger" },
  ]);
});
