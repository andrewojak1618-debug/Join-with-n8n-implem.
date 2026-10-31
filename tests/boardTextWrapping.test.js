const assert = require("node:assert/strict");
const test = require("node:test");

const { loadBrowserScripts } = require("./helpers/scriptContext");

const context = loadBrowserScripts([
  "components/js/core/shared.js",
  "components/js/board/boardViewData.js",
]);


test("shortens a long board URL in the compact card preview", () => {
  const url = "https://example.com/a-very-long-path-without-natural-spaces-or-breaks/and-more-content";
  assert.equal(context.getBoardShortText(url).length, 72);
  assert.equal(context.getBoardShortText(url).endsWith("..."), true);
});


test("still shortens ordinary long board descriptions", () => {
  const description = "A regular description with enough words to exceed the board preview limit without containing a link.";
  assert.equal(context.getBoardShortText(description).length, 72);
  assert.equal(context.getBoardShortText(description).endsWith("..."), true);
});


test("creates a readable short description from meaningful phrases", () => {
  const description = "Create a contact form and an imprint page with contact validation.";
  assert.equal(
    context.getBoardDescriptionPreview(description),
    "Contact form, imprint page and contact validation.",
  );
});


test("ignores links when creating a short description", () => {
  const description = "Review accessibility at https://example.com and improve keyboard accessibility navigation.";
  const preview = context.getBoardDescriptionPreview(description);
  assert.equal(preview.includes("example"), false);
  assert.equal(preview.includes("accessibility"), true);
});


test("removes action and filler words from a readable preview", () => {
  const description = "Coordinate the cross-team product launch and prepare the release communication for every stakeholder group.";
  assert.equal(
    context.getBoardDescriptionPreview(description),
    "Cross-team product, launch and release communication.",
  );
});


test("keeps an action word when it belongs to a noun phrase", () => {
  const description = "Prepare the sprint review and collect stakeholder feedback.";
  assert.equal(
    context.getBoardDescriptionPreview(description),
    "Sprint review and stakeholder feedback.",
  );
});
