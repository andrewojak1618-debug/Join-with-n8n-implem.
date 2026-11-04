const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const sourceRoot = path.resolve(__dirname, "..", "components", "js");


test("documents function parameters and return values consistently", () => {
  const files = [path.resolve(sourceRoot, "..", "..", "main.js"), ...getSourceFiles(sourceRoot)];
  const issues = files.flatMap(getJsdocIssues);
  assert.deepEqual(issues, []);
});


function getSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return getSourceFiles(entryPath);
    return /\.m?js$/.test(entry.name) ? [entryPath] : [];
  });
}


function getJsdocIssues(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const functions = getDocumentedFunctions(source);
  return functions.flatMap((entry) => validateJsdocEntry(filePath, entry));
}


function getDocumentedFunctions(source) {
  const pattern = /^(?:export\s+)?(?:async\s+)?function\s+(?<name>[A-Za-z_$][\w$]*)\s*\((?<params>[^\r\n]*)\)\s*\{/gm;
  return [...source.matchAll(pattern)].map((match) => ({
    doc: getLeadingJsdoc(source.slice(0, match.index)),
    name: match.groups.name,
    params: getParameterNames(match.groups.params),
  }));
}


function getLeadingJsdoc(prefix) {
  const start = prefix.lastIndexOf("/**");
  const candidate = prefix.slice(start);
  return start >= 0 && /^\/\*\*(?:(?!\*\/)[\s\S])*\*\/\s*$/.test(candidate) ? candidate : "";
}


function getParameterNames(signature) {
  return signature.split(",")
    .map((parameter) => parameter.trim().replace(/^\.\.\./, "").split("=")[0].trim())
    .filter(Boolean);
}


function validateJsdocEntry(filePath, entry) {
  const label = `${path.relative(sourceRoot, filePath)}: ${entry.name}`;
  const issues = entry.params
    .filter((parameter) => !hasCompleteParamTag(entry.doc, parameter))
    .map((parameter) => `${label} is missing a complete @param for ${parameter}`);
  if (!entry.doc) issues.push(`${label} is missing JSDoc`);
  issues.push(...getUnexpectedParamIssues(label, entry));
  if (hasInvalidParamTag(entry.doc)) issues.push(`${label} has an incomplete @param tag`);
  if (hasInvalidReturnTag(entry.doc)) issues.push(`${label} has an incomplete @returns tag`);
  return issues;
}


function hasCompleteParamTag(doc, parameter) {
  return getDocumentedParameterNames(doc).includes(parameter);
}


function getUnexpectedParamIssues(label, entry) {
  return getDocumentedParameterNames(entry.doc)
    .filter((parameter) => !entry.params.includes(parameter))
    .map((parameter) => `${label} documents unknown parameter ${parameter}`);
}


function getDocumentedParameterNames(doc) {
  return doc.split(/\r?\n/).flatMap((line) => {
    const tag = line.match(/^\s*\*\s*@param\s+\{.+\}\s+(.+?)\s+-\s+\S/);
    return tag ? [tag[1].replace(/^\[|\]$/g, "").split("=")[0]] : [];
  });
}


function hasInvalidParamTag(doc) {
  return doc.split(/\r?\n/).some((line) => (
    /@param\b/.test(line)
    && !/^\s*\*\s*@param\s+\{.+\}\s+.+?\s+-\s+\S/.test(line)
  ));
}


function hasInvalidReturnTag(doc) {
  return /@returns?\b/.test(doc) && !/@returns?\s+\{[^\r\n]+\}\s+\S/.test(doc);
}



test("detects undocumented functions after a documented function", () => {
  const entries = getDocumentedFunctions("/** Documented. */\nfunction first() {}\nfunction missing() {}");
  assert.equal(entries[0].doc.includes("Documented"), true);
  const issues = validateJsdocEntry("sample.js", entries[1]);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /missing is missing JSDoc$/);
});
