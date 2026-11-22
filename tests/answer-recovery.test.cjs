const assert = require('node:assert/strict');
const test = require('node:test');
const workflow = require('../n8n/issue-collector-workflow.json');
const node = name => workflow.nodes.find(item => item.name === name);
const mail = { id: 'test-mail', from: { value: [{ address: 'sender@example.test' }] } };


/** Creates an isolated reservation with a definite prior rejection. */
function reservation(kind, state = 'failed') {
  return { name: 'test-reservation', updateTime: 'version-one', fields: {
    status: { stringValue: kind === 'limit' ? 'limit_reached' : 'failed' },
    quotaState: { stringValue: 'released' }, aiAttemptCount: { integerValue: '1' },
    [kind + 'ReplyStatus']: { stringValue: state },
    [kind + 'ReplyHttpStatus']: { integerValue: '400' },
  } };
}


/** Runs the exported node against isolated linked data. */
function runCode(name, data, linked) {
  const input = { all: () => [{ json: data }] };
  const lookup = key => ({ itemMatching: () => ({ json: linked[key] }) });
  return new Function('$input', '$', node(name).parameters.jsCode)(input, lookup);
}


/** Evaluates the exported processing retry condition. */
function processingAllowed(document) {
  const value = node('Reservierung fehlgeschlagen?').parameters.conditions.conditions[0].leftValue;
  return new Function('$json', 'return ' + value.slice(3, -2).trim())(document);
}


/** Prepares a recovery attempt using synthetic sender metadata. */
function prepare(document) {
  return runCode('Antwort-Nachversand vorbereiten', document, { 'Mail eindeutig kennzeichnen': mail });
}


/** Builds the persisted answer result from a simulated Gmail response. */
function result(document, response) {
  return runCode('Antwort-Nachversand Ergebnis', response, {
    'Antwort-Nachversand vorbereiten': prepare(document)[0].json,
    'Antwort-Nachversand übernehmen': { updateTime: 'claimed-version' },
  })[0].json;
}


/** Collects every node reachable from the recovery branch. */
function recoveryNodes() {
  const found = new Set(), queue = ['Antwort-Nachversand vorbereiten'];
  while (queue.length) {
    const name = queue.pop();
    if (found.has(name)) continue;
    found.add(name);
    for (const output of workflow.connections[name]?.main || []) {
      for (const edge of output) queue.push(edge.node);
    }
  }
  return [...found].sort();
}


for (const kind of ['manual', 'limit']) {
  test(`${kind}: reply saved once and replay stops without processing`, () => {
    const document = reservation(kind), before = structuredClone(document.fields);
    const saved = result(document, { statusCode: 200, body: { id: 'reply-one' } });
    assert.equal(saved.fields[kind + 'ReplyStatus'].stringValue, 'sent');
    assert.equal(saved.fields[kind + 'ReplyMessageId'].stringValue, 'reply-one');
    assert.ok(Object.keys(saved.fields).every(key => key.startsWith(kind + 'Reply')));
    Object.assign(document.fields, saved.fields);
    assert.equal(prepare(document).length, 0);
    assert.equal(processingAllowed(document), false);
    for (const key of ['status', 'quotaState', 'aiAttemptCount']) assert.deepEqual(document.fields[key], before[key]);
  });
  for (const state of ['sending', 'sent', 'unconfirmed']) {
    test(`${kind}: ${state} blocks resend and AI retry`, () => {
      const document = reservation(kind, state);
      assert.equal(prepare(document).length, 0);
      assert.equal(processingAllowed(document), false);
    });
  }
  test(`${kind}: definite rejection differs from uncertain delivery`, () => {
    const document = reservation(kind);
    const rejected = result(document, { statusCode: 400, body: { error: { message: 'rejected' } } });
    assert.equal(rejected.fields[kind + 'ReplyStatus'].stringValue, 'failed');
    assert.equal(rejected.fields[kind + 'ReplyHttpStatus'].integerValue, '400');
    for (const response of [{ error: { message: 'timeout' } }, { statusCode: 500 }, { statusCode: 200 }]) {
      assert.equal(result(document, response).fields[kind + 'ReplyStatus'].stringValue, 'unconfirmed');
    }
  });
  test(`${kind}: retry bound and reply text without ticket identifier`, () => {
    const document = reservation(kind);
    const raw = Buffer.from(prepare(document)[0].json.raw, 'base64url').toString();
    assert.match(raw, /To: sender@example.test/);
    assert.doesNotMatch(raw, /Ticket-ID|mail-[a-f0-9]{64}/);
    document.fields[kind + 'ReplyRetryCount'] = { integerValue: '3' };
    assert.equal(prepare(document).length, 0);
  });
}


test('legacy limit failure without definite HTTP rejection remains blocked', () => {
  for (const status of [undefined, '0', '500', '200']) {
    const document = reservation('limit');
    document.fields.limitReplyHttpStatus = status ? { integerValue: status } : { nullValue: null };
    assert.equal(prepare(document).length, 0);
  }
});


test('reply recovery is isolated from ticket, quota and filing branches', () => {
  assert.deepEqual(recoveryNodes(), ['Antwort-Nachversand vorbereiten', 'Antwort-Nachversand übernehmen',
    'Antwort nachsenden', 'Antwort-Nachversand Ergebnis', 'Antwort-Nachversand speichern'].sort());
  for (const name of ['Antwort-Nachversand übernehmen', 'Antwort-Nachversand speichern']) {
    assert.match(node(name).parameters.url, /currentDocument.updateTime/);
    assert.equal(node(name).onError, undefined);
  }
});


test('manual review requires a released quota before reply recovery', () => {
  const document = reservation('manual');
  document.fields.status.stringValue = 'manual_review';
  assert.equal(prepare(document).length, 1);
  document.fields.quotaState.stringValue = 'reserved';
  assert.equal(prepare(document).length, 0);
});
