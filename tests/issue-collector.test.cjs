const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const path = require('node:path');
const workflow = JSON.parse(fs.readFileSync(path.join(__dirname, '../n8n/issue-collector-workflow.json')));
const node = name => workflow.nodes.find(item => item.name === name);
const stamp = '2026-11-04T20:00:00.000Z';

/** Runs the actual n8n Code node with isolated linked inputs. */
function runCode(name, input, linked = {}) {
  const lookup = key => ({ itemMatching: index => ({ json: linked[key][index] }) });
  const clock = { toUTC: () => ({ toISO: () => stamp }) };
  return new Function('$input', '$', '$now', node(name).parameters.jsCode)(
    { all: () => input.map(json => ({ json })) }, lookup, clock
  );
}

/** Supplies a valid classified mail without using personal test data. */
function validMail() {
  return { ticket: { title: 'Login blocked', category: 'technical-task', priority: 'urgent', deadline: null },
    gmailMessageId: 'gmail-test', mailMessageId: '<test@example.com>', senderEmail: 'sender@example.com',
    senderName: 'Sender', emailSubject: 'Original subject', emailBody: 'Original\nbody',
    deduplicationKey: 'mail-key', reservationId: 'a'.repeat(64),
    reservation: { name: 'mail-reservation', updateTime: 'mail-version' },
    quota: { state: 'reserved', counterName: 'counter' }, validation: { valid: true, errors: [] } };
}

/** Supplies a versioned daily counter. */
function counter(reserved = 1, completed = 9) {
  return { name: 'counter', updateTime: 'counter-version', fields: {
    reservedCount: { integerValue: String(reserved) }, completedCount: { integerValue: String(completed) },
    dailyLimit: { integerValue: '10' } } };
}

test('valid mail without a deadline passes; invalid calendar dates and enums fail', () => {
  const mail = validMail();
  assert.equal(runCode('Ticketdaten prüfen', [mail])[0].json.validation.valid, true);
  mail.ticket.deadline = '2026-02-30';
  mail.ticket.category = 'invented';
  const result = runCode('Ticketdaten prüfen', [mail])[0].json.validation;
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 2);
});

/** Verifies original mail fields and default board values. */
function checkSavedMail(fields, mail) {
  for (const key of ['emailBody', 'emailSubject', 'gmailMessageId', 'senderEmail', 'mailMessageId'])
    assert.equal(fields[key].stringValue, mail[key]);
  assert.deepEqual(fields.dueDate, { nullValue: null });
  assert.equal(fields.status.stringValue, 'todo');
  assert.deepEqual(fields.assignedTo.arrayValue.values, []);
}

test('tenth ticket is atomic, deduplicated and preserves original mail fields', () => {
  const mail = validMail();
  const result = runCode('Ticketabschluss vorbereiten', [counter()], { 'Ticketdaten gültig?': [mail] });
  const writes = result[0].json.commit.writes;
  checkSavedMail(writes[0].update.fields, mail);
  assert.equal(writes.length, 3);
  assert.deepEqual(writes[0].currentDocument, { exists: false });
  assert.equal(writes[1].update.fields.completedCount.integerValue, '10');
  assert.equal(writes[1].update.fields.reservedCount.integerValue, '0');
  assert.equal(writes[1].currentDocument.updateTime, 'counter-version');
  assert.equal(writes[2].currentDocument.updateTime, 'mail-version');
});

test('quota gate blocks the eleventh mail before the AI call', () => {
  const condition = node('Tageskontingent frei?').parameters.conditions.conditions[0].leftValue;
  const expression = condition.replace(/^=\{\{\s*/, '').replace(/\s*\}\}$/, '');
  const evaluate = completed => new Function('$json', 'return ' + expression)({ body: counter(0, completed) });
  assert.equal(evaluate(9), true);
  assert.equal(evaluate(10), false);
  assert.throws(() => evaluate('invalid'));
  const blocked = workflow.connections['Tageskontingent frei?'].main[1][0].node;
  assert.equal(blocked, 'Tageslimit erreicht speichern');
});

test('no slot or an exhausted counter cannot create another ticket', () => {
  const linked = { 'Ticketdaten gültig?': [validMail()] };
  assert.throws(() => runCode('Ticketabschluss vorbereiten', [counter(0, 10)], linked));
  assert.throws(() => runCode('Ticketabschluss vorbereiten', [counter(1, 10)], linked));
});

test('AI failure frees exactly one reserved slot and records failure atomically', () => {
  const failure = { ...validMail(), reservationUpdateTime: 'mail-version', failedAt: stamp, errorMessage: 'fetch failed' };
  const output = runCode('Tagesplatz-Freigabe vorbereiten', [counter(2, 0)], { 'KI-Fehler vorbereiten': [failure] });
  const writes = output[0].json.commit.writes;
  assert.equal(writes[0].update.fields.reservedCount.integerValue, '1');
  assert.equal(writes[1].update.fields.status.stringValue, 'failed');
  assert.equal(writes[1].update.fields.quotaState.stringValue, 'released');
  assert.equal(writes[1].currentDocument.updateTime, 'mail-version');
});

test('AI failure reaches the review label and ingestion is no longer test-only', () => {
  const edges = workflow.connections['Tagesplatz freigeben und KI-Fehler speichern'].main[0];
  assert.equal(edges[0].node, 'Mail bei KI-Fehler markieren');
  assert.equal(node(edges[0].node).parameters.operation, 'addLabels');
  assert.match(node(edges[0].node).parameters.messageId, /KI-Fehler vorbereiten/);
  assert.doesNotMatch(node('Gmail Trigger').parameters.filters.q, /TEST|andrewojak/);
  const names = new Set(workflow.nodes.map(item => item.name));
  for (const connection of Object.values(workflow.connections))
    for (const outputs of Object.values(connection))
      for (const branch of outputs) for (const edge of branch) assert.ok(names.has(edge.node));
});
