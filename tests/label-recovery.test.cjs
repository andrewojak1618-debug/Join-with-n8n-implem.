const assert = require('node:assert/strict');
const test = require('node:test');
const workflow = require('../n8n/issue-collector-workflow.json');
const node = name => workflow.nodes.find(item => item.name === name);


/** Builds a reservation whose reply has already been sent. */
function reservation(status = 'manual_review', labelStatus = 'failed') {
  return { name: 'test-reservation', updateTime: 'version-one', fields: {
    status: { stringValue: status }, manualLabelStatus: { stringValue: labelStatus },
    labelErrorMailId: { stringValue: 'test-mail' }, manualReplyStatus: { stringValue: 'sent' },
    quotaState: { stringValue: 'released' },
  } };
}


/** Runs the exported preparation node with an isolated reservation. */
function prepare(document) {
  return new Function('$input', node('Label-Nachholung vorbereiten').parameters.jsCode)(
    { all: () => [{ json: document }] });
}


/** Evaluates the exported result node with isolated linked data. */
function result(response) {
  const linked = {
    'Label-Nachholung vorbereiten': prepare(reservation())[0].json,
    'Label-Nachholung übernehmen': { updateTime: 'claimed-version' },
  };
  return new Function('$input', '$', node('Label-Nachholung Ergebnis').parameters.jsCode)(
    { all: () => [{ json: response }] }, name => ({ itemMatching: () => ({ json: linked[name] }) }));
}


for (const status of ['failed', 'manual_review', 'limit_reached']) {
  test(`${status}: sent reply does not block label recovery`, () => {
    const document = reservation(status), before = structuredClone(document);
    assert.equal(prepare(document)[0].json.attempt, 1);
    assert.deepEqual(document, before);
  });
}


test('applied, pending and unrelated states do not modify labels', () => {
  for (const state of ['applied', 'pending', null]) assert.equal(prepare(reservation('failed', state)).length, 0);
  for (const state of ['completed', 'processing']) assert.equal(prepare(reservation(state)).length, 0);
});


test('retry count is bounded and malformed counts are rejected', () => {
  for (const count of ['3', '-1', 'invalid', '1.5']) {
    const document = reservation();
    document.fields.manualLabelRetryCount = { integerValue: count };
    assert.equal(prepare(document).length, 0);
  }
});


test('only the configured review label is added', () => {
  assert.deepEqual(JSON.parse(node('Nachbearbeitungslabel nachholen').parameters.jsonBody),
    { addLabelIds: ['YOUR_REVIEW_LABEL_ID'] });
  assert.match(node('Nachbearbeitungslabel nachholen').parameters.url, /\/modify/);
});


test('confirmed label result marks applied and replay stops', () => {
  const saved = result({ statusCode: 200, body: { labelIds: ['INBOX', 'YOUR_REVIEW_LABEL_ID'] } })[0].json;
  assert.deepEqual(saved.fields, { manualLabelStatus: { stringValue: 'applied' } });
  const document = reservation();
  Object.assign(document.fields, saved.fields);
  assert.equal(prepare(document).length, 0);
});


test('missing confirmation retains an actionable label error', () => {
  for (const response of [{ statusCode: 200, body: { labelIds: ['INBOX'] } }, { error: { message: 'timeout' } }]) {
    const fields = result(response)[0].json.fields;
    assert.equal(fields.manualLabelStatus.stringValue, 'failed');
    assert.equal(fields.labelErrorMailId.stringValue, 'test-mail');
    assert.ok(fields.labelErrorMessage.stringValue);
  }
});


test('claim and save use version guards and recovery ends without other actions', () => {
  for (const name of ['Label-Nachholung übernehmen', 'Label-Nachholung speichern']) {
    assert.match(node(name).parameters.url, /currentDocument.updateTime/);
    assert.equal(node(name).onError, undefined);
  }
  assert.equal(workflow.connections['Label-Nachholung speichern'], undefined);
  assert.deepEqual(workflow.connections['Vorhandene Reservierung lesen'].main[0].map(edge => edge.node), ['Label ausstehend?']);
  assert.deepEqual(workflow.connections['Label ausstehend?'].main[1].map(edge => edge.node), ['Antwortstatus vorhanden?']);
});
