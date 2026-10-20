// Find open inquiries whose day 1, 3 or 7 follow-up is due.
// If the workflow was paused and several are overdue, only the latest one is sent
// and the older ones are marked as skipped, so a lead never gets a burst of emails.
const FOLLOW_UP_DAYS = [1, 3, 7];
const DAY_MS = 24 * 60 * 60 * 1000;

const store = $getWorkflowStaticData('global');
const business = $env.BUSINESS_NAME || 'Example Plumbing Co.';
const now = Date.now();

const templates = {
  1: {
    subject: `Following up on your request to ${business}`,
    body: (name) => `Hi ${name},\n\nJust checking in on your request from yesterday. Reply to this email with a good time to call and we will get you booked in.\n\nThe ${business} team`,
  },
  3: {
    subject: `Still need a hand? ${business}`,
    body: (name) => `Hi ${name},\n\nWe have not heard back yet, so here is a reminder that we have openings this week. Reply any time and we will take it from there.\n\nThe ${business} team`,
  },
  7: {
    subject: `Last check-in from ${business}`,
    body: (name) => `Hi ${name},\n\nThis is our last follow-up. If you still need help, just reply and we will pick it up straight away.\n\nThe ${business} team`,
  },
};

const due = [];
for (const record of Object.values(store.inquiries ?? {})) {
  if (record.status !== 'open') continue;

  const age = now - Date.parse(record.receivedAt);
  const dueDays = FOLLOW_UP_DAYS.filter((day) => age >= day * DAY_MS && !record.followUps[day]);
  if (dueDays.length === 0) continue;

  const day = dueDays[dueDays.length - 1];
  for (const older of dueDays.slice(0, -1)) record.followUps[older] = 'skipped';

  due.push({
    json: {
      channel: 'email',
      recipient: record.email,
      subject: templates[day].subject,
      body: templates[day].body(record.name),
      metadata: { inquiryId: record.id, kind: 'follow_up', day },
    },
  });
}

return due;
