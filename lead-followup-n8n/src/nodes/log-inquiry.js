// Store the inquiry in workflow static data and build the instant reply.
// Static data only persists for production (active workflow) executions, not manual test runs.
const store = $getWorkflowStaticData('global');
store.inquiries = store.inquiries ?? {};

const business = $env.BUSINESS_NAME || 'Example Plumbing Co.';
const { inquiry } = $input.first().json;
const id = `inq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const record = {
  id,
  ...inquiry,
  receivedAt: new Date().toISOString(),
  status: 'open',
  followUps: {},
};
store.inquiries[id] = record;

const notification = {
  channel: 'email',
  recipient: record.email,
  subject: `Thanks for contacting ${business}`,
  body: [
    `Hi ${record.name},`,
    '',
    'Thanks for reaching out. We have your message and will reply within one business day.',
    '',
    `The ${business} team`,
  ].join('\n'),
  metadata: { inquiryId: id, kind: 'instant_reply' },
};

return [{ json: { record, notification } }];
