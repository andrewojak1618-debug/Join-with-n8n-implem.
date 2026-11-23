const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const workflow = JSON.parse(fs.readFileSync(path.join(__dirname, '../n8n/issue-collector-workflow.json')));
const code = workflow.nodes.find(node => node.name === 'Automatische Mails ausfiltern').parameters.jsCode;
const CASES = [
  ['human request', true, { from: 'User <user@example.com>', headers: { 'Auto-Submitted': 'no' } }],
  ['personal sender remains allowed', true, { from: 'person@example.com', subject: 'Re: Join: Neuer Ticketstatus – Offen' }],
  ['human reply', true, { headers: { 'Auto-Submitted': 'Auto-Submitted: no', 'In-Reply-To': '<human@example.com>' } }],
  ['vacation', false, { headers: { 'auto-submitted': 'auto-replied; owner-email=x' } }],
  ['bounce', false, { headers: { 'content-type': 'multipart/report; report-type="delivery-status"' } }],
  ['null sender', false, { headers: { 'return-path': '<>' } }],
  ['own parsed reply', false, { from: { value: [{ address: 'jissuecollector@gmail.com' }] } }],
  ['own Gmail alias', false, { from: 'Join <J.IssueCollector+test@googlemail.com>' }],
  ['old project reply', false, { from: 'ai.viralreelcreator@gmail.com' }],
  ['account warning', false, { from: { value: [{ address: 'no-reply@accounts.google.com' }] } }],
  ['Google notification', false, { headers: { FROM: 'Google <no-reply@google.com>' } }],
  ['API auto header', false, { payload: { headers: [{ name: 'Auto-Submitted', value: 'auto-generated' }] } }],
  ['API bounce header', false, { payload: { headers: [{ name: 'Return-Path', value: '<>' }] } }],
  ['API human header', true, { payload: { headers: [{ name: 'Auto-Submitted', value: 'no' }] } }],
  ['header array', false, { headers: [{ name: 'Auto-Submitted', value: 'auto-replied' }] }],
  ['raw header lines', false, { headerLines: [{ key: 'auto-submitted', line: 'Auto-Submitted: auto-generated' }] }],
  ['duplicate automatic value', false, { headers: { 'Auto-Submitted': ['no', 'auto-generated'] } }],
  ['parsed MIME report', false, { headers: { 'content-type': { value: 'multipart/report', params: { 'report-type': 'delivery-status' } } } }],
  ['read receipt', false, { headers: { 'Content-Type': 'multipart/report; report-type=disposition-notification' } }],
  ['delivery agent', false, { from: 'Mail <MAILER-DAEMON@example.com>' }],
  ['postmaster', false, { payload: { headers: [{ name: 'From', value: 'postmaster@example.com' }] } }],
  ['negative autoreply marker', true, { headers: { 'x-autoreply': 'X-Autoreply: false' } }],
  ['true autorespond marker', false, { headers: { 'X-Autorespond': 'yes' } }],
  ['bulk notification', false, { headers: { Precedence: 'bulk' } }],
  ['security bug from human', true, { from: 'user@example.com', subject: 'Sicherheitswarnung im Board falsch angezeigt' }],
  ['human forward', true, { from: 'user@example.com', subject: 'Fwd: Fehlermeldung', headers: { 'In-Reply-To': '<old>' } }],
  ['similar external address', true, { from: 'jissuecollector@gmail.com.example.org' }],
  ['suppression header alone', true, { headers: { 'X-Auto-Response-Suppress': 'All' } }]
];

/** Executes the candidate filter without external services.
 * @param {Object[]} items - Synthetic n8n input items.
 * @returns {Object[]} Surviving items.
 */
function run(items) {
  return new Function('$input', code)({ all: () => items });
}

for (const [name, allowed, mail] of CASES) {
  test(name + ' and identical repetition', () => {
    const item = { json: { ...mail, id: name }, binary: { marker: 'preserve' } };
    const expected = allowed ? [{ ...item, pairedItem: { item: 0 } }] : [];
    assert.deepEqual(run([item]), expected);
    assert.deepEqual(run([item]), expected);
  });
}

test('mixed batch preserves original item indices', () => {
  const items = CASES.map(([name, allowed, mail]) => ({ json: { ...mail, caseName: name } }));
  assert.deepEqual(run(items).map(item => item.pairedItem.item), CASES.flatMap(([, allowed], index) => allowed ? [index] : []));
});


/** Verifies that status notifications identify themselves as automatic mail. */
test('status notification declares automation headers', () => {
  const status = JSON.parse(fs.readFileSync(path.join(__dirname, '../n8n/status-notification-workflow.json')));
  const expression = status.nodes.find(node => node.name === 'Statusnachricht senden').parameters.jsonBody;
  assert.ok(expression.includes('Auto-Submitted: auto-generated'));
  assert.ok(expression.includes('X-Auto-Response-Suppress: All'));
});
