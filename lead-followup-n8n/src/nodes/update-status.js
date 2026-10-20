// Mark an inquiry as replied or closed so no further follow-ups are sent.
const store = $getWorkflowStaticData('global');
const { id, status } = $input.first().json.body ?? {};
const allowed = ['open', 'replied', 'closed'];
const record = store.inquiries?.[id];

if (!record) {
  return [{ json: { ok: false, code: 404, error: 'unknown inquiry id' } }];
}
if (!allowed.includes(status)) {
  return [{ json: { ok: false, code: 400, error: `status must be one of: ${allowed.join(', ')}` } }];
}

record.status = status;
record.updatedAt = new Date().toISOString();
return [{ json: { ok: true, code: 200, record } }];
