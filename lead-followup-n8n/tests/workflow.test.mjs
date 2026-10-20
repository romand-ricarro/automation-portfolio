// Runs the Code node scripts exactly as exported in workflow.json, with a
// minimal stand-in for the n8n runtime ($input, $env, static data, clock).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const raw = readFileSync(join(root, 'workflow.json'), 'utf8');
const workflow = JSON.parse(raw);
const DAY = 24 * 60 * 60 * 1000;

function runCodeNode(name, { items = [], store = {}, env = {}, now = Date.now() } = {}) {
  const node = workflow.nodes.find((n) => n.name === name);
  assert.ok(node, `node "${name}" exists`);

  class FakeDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const $input = { all: () => items, first: () => items[0] };
  const fn = new Function('$input', '$env', '$getWorkflowStaticData', 'Date', node.parameters.jsCode);
  return fn($input, env, () => store, FakeDate);
}

const sample = JSON.parse(readFileSync(join(root, 'sample-data/inquiries.json'), 'utf8'));

test('workflow export contains no credentials or secrets', () => {
  for (const node of workflow.nodes) {
    assert.equal(node.credentials, undefined, `${node.name} has no credentials block`);
  }
  assert.doesNotMatch(raw, /"credentials"/);
  assert.doesNotMatch(raw, /(sk-|ntf_|Bearer\s+[A-Za-z0-9]|password)/i);
  // API key is only ever referenced through an environment variable.
  assert.match(raw, /\$env\.NOTIFY_API_KEY/);
});

test('every connection points at an existing node', () => {
  const names = new Set(workflow.nodes.map((n) => n.name));
  for (const [from, { main }] of Object.entries(workflow.connections)) {
    assert.ok(names.has(from), from);
    for (const branch of main) for (const link of branch) assert.ok(names.has(link.node), link.node);
  }
});

test('validate accepts a sample inquiry and normalises the email', () => {
  const [out] = runCodeNode('Validate inquiry', { items: [{ json: { body: { ...sample[0], email: ' Alex.Rivera@Example.com ' } } }] });
  assert.equal(out.json.valid, true);
  assert.equal(out.json.inquiry.email, 'alex.rivera@example.com');
});

test('validate rejects missing name and bad email', () => {
  const [out] = runCodeNode('Validate inquiry', { items: [{ json: { body: { email: 'not-an-email' } } }] });
  assert.equal(out.json.valid, false);
  assert.deepEqual(out.json.errors, ['name is required', 'a valid email is required']);
});

test('log stores the inquiry and builds an instant reply', () => {
  const store = {};
  const inquiry = { ...sample[0] };
  const [out] = runCodeNode('Log inquiry', { items: [{ json: { inquiry } }], store, env: { BUSINESS_NAME: 'Test Co.' } });
  const { record, notification } = out.json;
  assert.equal(store.inquiries[record.id].status, 'open');
  assert.equal(notification.recipient, inquiry.email);
  assert.match(notification.subject, /Test Co\./);
  assert.deepEqual(notification.metadata, { inquiryId: record.id, kind: 'instant_reply' });
});

function storeWith(ageMs, followUps = {}, status = 'open', now = Date.now()) {
  return {
    inquiries: {
      inq_1: { id: 'inq_1', name: 'Sam', email: 'sam@example.com', status, followUps,
        receivedAt: new Date(now - ageMs).toISOString() },
    },
  };
}

test('no follow-up before day 1', () => {
  const now = Date.now();
  assert.deepEqual(runCodeNode('Find due follow-ups', { store: storeWith(DAY - 1000, {}, 'open', now), now }), []);
});

for (const [age, sent, expected] of [[1, {}, 1], [3, { 1: 'x' }, 3], [7, { 1: 'x', 3: 'x' }, 7]]) {
  test(`day ${expected} follow-up is due after ${age} day(s)`, () => {
    const now = Date.now();
    const out = runCodeNode('Find due follow-ups', { store: storeWith(age * DAY + 1000, sent, 'open', now), now });
    assert.equal(out.length, 1);
    assert.equal(out[0].json.metadata.day, expected);
  });
}

test('overdue follow-ups are skipped so only the latest one is sent', () => {
  const now = Date.now();
  const store = storeWith(8 * DAY, {}, 'open', now);
  const out = runCodeNode('Find due follow-ups', { store, now });
  assert.equal(out.length, 1);
  assert.equal(out[0].json.metadata.day, 7);
  assert.deepEqual(store.inquiries.inq_1.followUps, { 1: 'skipped', 3: 'skipped' });
});

test('replied or closed leads get no follow-ups', () => {
  const now = Date.now();
  for (const status of ['replied', 'closed']) {
    assert.deepEqual(runCodeNode('Find due follow-ups', { store: storeWith(2 * DAY, {}, status, now), now }), []);
  }
});

test('mark sent records the day from the echoed metadata', () => {
  const now = Date.now();
  const store = storeWith(DAY + 1000, {}, 'open', now);
  runCodeNode('Mark follow-up sent', { store, now, items: [{ json: { metadata: { inquiryId: 'inq_1', day: 1 } } }] });
  assert.equal(store.inquiries.inq_1.followUps[1], new Date(now).toISOString());
  assert.deepEqual(runCodeNode('Find due follow-ups', { store, now }), []);
});

test('status update closes a lead and rejects unknown ids or statuses', () => {
  const store = storeWith(DAY);
  const ok = runCodeNode('Apply status update', { store, items: [{ json: { body: { id: 'inq_1', status: 'closed' } } }] });
  assert.equal(ok[0].json.code, 200);
  assert.equal(store.inquiries.inq_1.status, 'closed');

  const missing = runCodeNode('Apply status update', { store, items: [{ json: { body: { id: 'nope', status: 'closed' } } }] });
  assert.equal(missing[0].json.code, 404);
  const bad = runCodeNode('Apply status update', { store, items: [{ json: { body: { id: 'inq_1', status: 'won' } } }] });
  assert.equal(bad[0].json.code, 400);
});
