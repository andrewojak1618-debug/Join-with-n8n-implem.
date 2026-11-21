const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const workflow = JSON.parse(fs.readFileSync(path.join(__dirname, '../n8n/issue-collector-workflow.json')));
const node = name => workflow.nodes.find(item => item.name === name);


/** Creates isolated versioned documents with another mail still reserved. */
function documents() {
  return {
    counter: { name: 'counter', updateTime: 'c1', fields: {
      reservedCount: { integerValue: '2' }, completedCount: { integerValue: '7' } } },
    mail: { name: 'mail', updateTime: 'm1', fields: {
      status: { stringValue: 'processing' }, quotaState: { stringValue: 'reserved' } } }
  };
}


/** @param {string} status - Target failure status. */
function failure(status) {
  return { status, reservation: { name: 'mail' }, reservationUpdateTime: 'm1',
    quota: { state: 'reserved', counterName: 'counter' },
    failedAt: '2026-11-21T12:00:00Z', errorMessage: 'Isolated test failure' };
}


/**
 * Executes the actual shared n8n Code node with linked inputs.
 * @param {Array} counters - Counter inputs.
 * @param {Array} failures - Failure inputs in matching order.
 */
function prepare(counters, failures) {
  const lookup = name => {
    assert.equal(name, 'Freigabedaten bereitstellen');
    return { itemMatching: index => ({ json: failures[index] }) };
  };
  return new Function('$input', '$', node('Tagesplatz-Freigabe vorbereiten').parameters.jsCode)(
    { all: () => counters.map(json => ({ json })) }, lookup);
}


/**
 * Models atomic update-time preconditions; this is not a Firestore live test.
 * @param {Object} store - Isolated document store.
 * @param {Array} writes - Generated commit writes.
 */
function commit(store, writes) {
  for (const write of writes) {
    assert.equal(store[write.update.name].updateTime, write.currentDocument.updateTime);
  }
  for (const write of writes) {
    const target = store[write.update.name];
    Object.assign(target.fields, structuredClone(write.update.fields));
    target.updateTime += '-next';
  }
}


for (const status of ['failed', 'manual_review']) {
  test(status + ': releases one slot atomically and preserves the target status', () => {
    const store = documents();
    const writes = prepare([store.counter], [failure(status)])[0].json.commit.writes;
    assert.deepEqual(writes.map(write => write.update.name), ['counter', 'mail']);
    commit(store, writes);
    assert.equal(store.counter.fields.reservedCount.integerValue, '1');
    assert.equal(store.counter.fields.completedCount.integerValue, '7');
    assert.equal(store.mail.fields.status.stringValue, status);
    assert.equal(store.mail.fields.quotaState.stringValue, 'released');
  });

  test(status + ': identical replay changes neither document', () => {
    const store = documents();
    const writes = prepare([store.counter], [failure(status)])[0].json.commit.writes;
    commit(store, writes);
    const saved = structuredClone(store);
    assert.throws(() => commit(store, writes));
    assert.deepEqual(store, saved);
  });

  test(status + ': refreshed counter cannot release the same reservation again', () => {
    const store = documents();
    commit(store, prepare([store.counter], [failure(status)])[0].json.commit.writes);
    const saved = structuredClone(store);
    const retry = prepare([store.counter], [failure(status)])[0].json.commit.writes;
    assert.throws(() => commit(store, retry));
    assert.deepEqual(store, saved);
  });
}


test('a stale counter rejects the entire commit before changing the mail', () => {
  const store = documents();
  const writes = prepare([store.counter], [failure('failed')])[0].json.commit.writes;
  store.counter.updateTime = 'concurrent-update';
  const saved = structuredClone(store);
  assert.throws(() => commit(store, writes));
  assert.deepEqual(store, saved);
});


test('released reservations, missing versions and unknown statuses are rejected', () => {
  const patches = [{ quota: { state: 'released', counterName: 'counter' } },
    { reservationUpdateTime: '' }, { status: 'completed' }, { reservation: null },
    { quota: { state: 'reserved', counterName: 'different-counter' } }];
  for (const patch of patches) {
    assert.throws(() => prepare([documents().counter], [{ ...failure('failed'), ...patch }]));
  }
  const empty = documents().counter;
  empty.fields.reservedCount.integerValue = '0';
  assert.throws(() => prepare([empty], [failure('failed')]));
});


test('mixed input batches preserve their status and linked item indexes', () => {
  const failures = [failure('failed'), { ...failure('manual_review'), reservation: { name: 'mail-2' } }];
  const result = prepare([documents().counter, documents().counter], failures);
  assert.deepEqual(result.map(item => item.pairedItem), [{ item: 0 }, { item: 1 }]);
  assert.deepEqual(result.map(item => item.json.commit.writes[1].update.fields.status.stringValue),
    ['failed', 'manual_review']);
  assert.equal(result[1].json.commit.writes[1].update.name, 'mail-2');
});


test('both failure paths share preparation and keep their existing post-commit paths', () => {
  for (const name of ['KI-Fehler vorbereiten', 'Ungültige Ticketdaten vorbereiten']) {
    assert.equal(workflow.connections[name].main[0][0].node, 'Freigabedaten bereitstellen');
  }
  assert.equal(workflow.connections['Freigabedaten bereitstellen'].main[0][0].node, 'Tageszähler für Freigabe lesen');
  assert.equal(workflow.connections['Tagesplatz-Freigabe vorbereiten'].main[0][0].node, 'Freigabe für KI-Fehler?');
  const branches = workflow.connections['Freigabe für KI-Fehler?'].main;
  assert.equal(branches[0][0].node, 'Tagesplatz freigeben und KI-Fehler speichern');
  assert.equal(branches[1][0].node, 'Tagesplatz bei ungültigen Daten freigeben');
  assert.equal(node('Ungültige Daten freigeben vorbereiten'), undefined);
});


test('preparation expressions assign the correct status before the common path', () => {
  assert.match(node('KI-Fehler vorbereiten').parameters.jsonOutput, /status: 'failed'/);
  assert.match(node('Ungültige Ticketdaten vorbereiten').parameters.jsonOutput, /status: 'manual_review'/);
  const expression = node('Freigabe für KI-Fehler?').parameters.conditions.conditions[0].leftValue;
  const evaluate = new Function('$json', 'return ' + expression.slice(3, -2));
  assert.equal(evaluate({ status: 'failed' }), true);
  assert.equal(evaluate({ status: 'manual_review' }), false);
});
