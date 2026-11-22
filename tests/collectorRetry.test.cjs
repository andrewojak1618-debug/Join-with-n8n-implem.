const assert = require('node:assert/strict');
const test = require('node:test');
const workflow = require('../n8n/issue-collector-workflow.json');
const retryNode = workflow.nodes.find(node => node.name === 'Reservierung fehlgeschlagen?');
const expression = retryNode.parameters.conditions.conditions[0].leftValue.slice(3, -3);
const shouldRetry = new Function('$json', 'return ' + expression);


/**
 * Creates a persisted reservation for retry checks.
 * @param {string} status - Processing state.
 * @param {string|undefined} reply - Manual reply state.
 * @param {number} attempts - Previous AI attempts.
 */
function reservation(status, reply, attempts) {
  return { fields: { status: { stringValue: status },
    manualReplyStatus: reply ? { stringValue: reply } : undefined,
    aiAttemptCount: { integerValue: String(attempts) } } };
}


for (const attempts of [1, 2]) {
  test(`sent reply prevents another AI reservation at attempt ${attempts}`, () => {
    assert.equal(shouldRetry(reservation('failed', 'sent', attempts)), false);
  });
}


test('failure without a sent reply retains bounded retry behavior', () => {
  assert.equal(shouldRetry(reservation('failed', undefined, 1)), true);
  assert.equal(shouldRetry(reservation('failed', undefined, 2)), true);
  assert.equal(shouldRetry(reservation('failed', undefined, 3)), false);
});


for (const status of ['completed', 'manual_review', 'processing']) {
  test(`${status} does not enter the AI retry path`, () => {
    assert.equal(shouldRetry(reservation(status, undefined, 1)), false);
  });
}
