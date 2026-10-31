const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const sourceRoot = path.resolve(__dirname, "..", "components", "js");


test("documents function parameters and return values consistently", () => {
  const issues = getSourceFiles(sourceRoot).flatMap(getJsdocIssues);
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
  const pattern = /\/\*\*(?<doc>[\s\S]*?)\*\/\s*(?:async\s+)?function\s+(?<name>[A-Za-z_$][\w$]*)\s*\((?<params>[^\r\n]*)\)\s*\{/g;
  return [...source.matchAll(pattern)].map((match) => ({
    doc: match.groups.doc,
    name: match.groups.name,
    params: getParameterNames(match.groups.params),
  }));
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
