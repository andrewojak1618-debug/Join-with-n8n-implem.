const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..", "..");

/**
 * Executes classic browser scripts in an isolated context for unit tests.
 */
function loadBrowserScripts(relativePaths, globals = {}) {
  const context = vm.createContext({ console, ...globals });
  relativePaths.forEach((relativePath) => {
    const absolutePath = path.join(projectRoot, relativePath);
    const source = fs.readFileSync(absolutePath, "utf8");
    vm.runInContext(source, context, { filename: absolutePath });
  });

  return context;
}


/**
 * Provides the localStorage methods used by the task persistence code.
 */
function createMemoryStorage(initialEntries = {}) {
  const entries = new Map(
    Object.entries(initialEntries).map(([key, value]) => [key, String(value)])
  );
  return {
    getItem(key) { return entries.has(key) ? entries.get(key) : null; },
    setItem(key, value) { entries.set(key, String(value)); },
    removeItem(key) { entries.delete(key); },
    clear() { entries.clear(); },
  };
}


/**
 * Converts values created in the VM context into regular Node.js values.
 */
function toPlainValue(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = {
  createMemoryStorage,
  loadBrowserScripts,
  toPlainValue,
};
