const assert = require("node:assert/strict");
const test = require("node:test");

const {
  loadBrowserScripts,
  toPlainValue,
} = require("./helpers/scriptContext");

const boardSearchScript = "components/js/board/boardSearch.js";
const sharedScript = "components/js/core/shared.js";

/**
 * Loads the board search logic with a minimal board and DOM test setup.
 * @param {Object[]} tasks Tasks available on the board.
 * @returns {Object} Search context and observable render state.
 */
function createBoardSearchContext(tasks) {
  const elements = createBoardSearchElements();
  const state = { renderedTasks: [], detailTasks: [] };
  const globals = createBoardSearchGlobals(tasks, elements, state);
  const context = loadBrowserScripts([sharedScript, boardSearchScript], globals);
  return { ...elements, context, state };
}


/**
 * Creates the observable elements used by the search result display.
 */
function createBoardSearchElements() {
  return {
    noResultsElement: { hidden: true },
    columnsElement: { hidden: false },
  };
}


/**
 * Creates the browser globals required by the board search script.
 */
function createBoardSearchGlobals(tasks, elements, state) {
  return {
    activeBoardTasks: tasks,
    document: createBoardSearchDocument(elements),
    renderBoardColumns: (result) => storeSearchResult(state, "renderedTasks", result),
    initBoardTaskDetails: (result) => storeSearchResult(state, "detailTasks", result),
  };
}


/**
 * Stores one observable search result for later assertions.
 */
function storeSearchResult(state, key, result) {
  state[key] = result;
}


/**
 * Provides only the elements used by the no-results display logic.
 */
function createBoardSearchDocument(elements) {
  return {
    getElementById: (id) =>
      id === "boardSearchNoResults" ? elements.noResultsElement : null,
    querySelector: (selector) =>
      selector === ".board-columns" ? elements.columnsElement : null,
  };
}

const tasks = [
  { id: "1", title: "Design login", description: "Create the page" },
  { id: "2", title: "Connect board", description: "Load Firestore tasks" },
  { id: "3", title: "Review contacts", description: "Check long names" },
];

test("returns all board tasks for an empty search term", () => {
  const { context } = createBoardSearchContext(tasks);
  assert.deepEqual(toPlainValue(context.getBoardSearchResults("")), tasks);
});

test("finds title matches from the first character", () => {
  const { context } = createBoardSearchContext(tasks);
  const result = context.getBoardSearchResults("v");
  assert.deepEqual(toPlainValue(result), [tasks[2]]);
});

test("finds tasks by description and handles missing text fields", () => {
  const tasksWithMissingText = [...tasks, { id: "4" }];
  const { context } = createBoardSearchContext(tasksWithMissingText);
  const result = context.getBoardSearchResults("firestore");
  assert.deepEqual(toPlainValue(result), [tasks[1]]);
  assert.equal(context.taskMatchesSearch(tasksWithMissingText[3], "firestore"), false);
});

test("normalizes whitespace and letter case before filtering", () => {
  const { context, state } = createBoardSearchContext(tasks);
  context.handleBoardSearchInput({ target: { value: "  LOGIN  " } });
  assert.deepEqual(toPlainValue(state.renderedTasks), [tasks[0]]);
  assert.deepEqual(toPlainValue(state.detailTasks), [tasks[0]]);
});

test("shows the no-results notice only for an unsuccessful search", () => {
  const setup = createBoardSearchContext(tasks);
  setup.context.handleBoardSearchInput({ target: { value: "missing" } });
  assert.equal(setup.noResultsElement.hidden, false);
  assert.equal(setup.columnsElement.hidden, true);

  setup.context.handleBoardSearchInput({ target: { value: "board" } });
  assert.equal(setup.noResultsElement.hidden, true);
  assert.equal(setup.columnsElement.hidden, false);
});
