// Assembles workflow.json from the Code node sources in src/nodes.
// Run: node scripts/build-workflow.mjs  (use --check to fail if workflow.json is stale)
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const code = (file) => readFileSync(join(root, 'src/nodes', file), 'utf8');

// Stable ids derived from the node name, so rebuilding gives an identical file.
const stableId = (name) => {
  const h = createHash('sha1').update(`lead-followup:${name}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};

const node = (name, type, typeVersion, position, parameters, extra = {}) => ({
  id: stableId(name),
  name,
  type,
  typeVersion,
  position,
  parameters,
  ...extra,
});

const webhook = (name, path, position) =>
  node(name, 'n8n-nodes-base.webhook', 2, position,
    { httpMethod: 'POST', path, responseMode: 'responseNode', options: {} },
    { webhookId: stableId(`${name}:webhook`) });

const codeNode = (name, file, position) =>
  node(name, 'n8n-nodes-base.code', 2, position, { jsCode: code(file) });

const respond = (name, body, responseCode, position) =>
  node(name, 'n8n-nodes-base.respondToWebhook', 1.1, position, {
    respondWith: 'json',
    responseBody: body,
    options: { responseCode },
  });

// Posts a notification to the notify-api service (see ../notify-api).
// The URL and API key come from n8n environment variables, never from this file.
const sendNotification = (name, bodyExpression, position, extra = {}) =>
  node(name, 'n8n-nodes-base.httpRequest', 4.2, position, {
    method: 'POST',
    url: '={{ $env.NOTIFY_API_URL }}/v1/notifications',
    sendHeaders: true,
    headerParameters: { parameters: [{ name: 'X-API-Key', value: '={{ $env.NOTIFY_API_KEY }}' }] },
    sendBody: true,
    specifyBody: 'json',
    jsonBody: bodyExpression,
    options: { timeout: 10000 },
  }, extra);

const nodes = [
  // Path 1: new inquiry -> validate -> log -> instant reply -> respond
  webhook('New inquiry', 'lead-inquiry', [0, 0]),
  codeNode('Validate inquiry', 'validate-inquiry.js', [220, 0]),
  node('Is valid?', 'n8n-nodes-base.if', 2, [440, 0], {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
      conditions: [{
        id: stableId('Is valid?:condition'),
        leftValue: '={{ $json.valid }}',
        rightValue: true,
        operator: { type: 'boolean', operation: 'true', singleValue: true },
      }],
      combinator: 'and',
    },
    options: {},
  }),
  codeNode('Log inquiry', 'log-inquiry.js', [660, -100]),
  sendNotification('Send instant reply', '={{ JSON.stringify($json.notification) }}', [880, -100],
    { onError: 'continueRegularOutput' }),
  respond('Respond 201', "={{ JSON.stringify({ ok: true, id: $('Log inquiry').first().json.record.id }) }}", 201, [1100, -100]),
  respond('Respond 400', '={{ JSON.stringify({ ok: false, errors: $json.errors }) }}', 400, [660, 100]),

  // Path 2: status update (replied / closed) stops follow-ups
  webhook('Lead status update', 'lead-status', [0, 300]),
  codeNode('Apply status update', 'update-status.js', [220, 300]),
  respond('Respond status', '={{ JSON.stringify($json) }}', '={{ $json.code }}', [440, 300]),

  // Path 3: hourly check for day 1 / 3 / 7 follow-ups
  node('Every hour', 'n8n-nodes-base.scheduleTrigger', 1.2, [0, 550], {
    rule: { interval: [{ field: 'hours', hoursInterval: 1 }] },
  }),
  codeNode('Find due follow-ups', 'find-due-follow-ups.js', [220, 550]),
  sendNotification('Send follow-up', '={{ JSON.stringify($json) }}', [440, 550],
    { retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 }),
  codeNode('Mark follow-up sent', 'mark-follow-up-sent.js', [660, 550]),
];

const link = (to) => ({ node: to, type: 'main', index: 0 });
const connections = {
  'New inquiry': { main: [[link('Validate inquiry')]] },
  'Validate inquiry': { main: [[link('Is valid?')]] },
  'Is valid?': { main: [[link('Log inquiry')], [link('Respond 400')]] },
  'Log inquiry': { main: [[link('Send instant reply')]] },
  'Send instant reply': { main: [[link('Respond 201')]] },
  'Lead status update': { main: [[link('Apply status update')]] },
  'Apply status update': { main: [[link('Respond status')]] },
  'Every hour': { main: [[link('Find due follow-ups')]] },
  'Find due follow-ups': { main: [[link('Send follow-up')]] },
  'Send follow-up': { main: [[link('Mark follow-up sent')]] },
};

const workflow = {
  name: 'Lead follow-up (demo)',
  nodes,
  connections,
  settings: { executionOrder: 'v1' },
  pinData: {},
  active: false,
  tags: [],
};

const out = `${JSON.stringify(workflow, null, 2)}\n`;
const target = join(root, 'workflow.json');

if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== out) {
    console.error('workflow.json is out of date. Run: node scripts/build-workflow.mjs');
    process.exit(1);
  }
  console.log('workflow.json is up to date');
} else {
  writeFileSync(target, out);
  console.log(`Wrote ${target}`);
}
