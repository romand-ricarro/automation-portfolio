// Record which follow-ups were sent. The notification API echoes back the
// metadata it was given, which tells us the inquiry id and follow-up day.
const store = $getWorkflowStaticData('global');
const sentAt = new Date().toISOString();

for (const item of $input.all()) {
  const { inquiryId, day } = item.json.metadata ?? {};
  const record = store.inquiries?.[inquiryId];
  if (record && day) record.followUps[day] = sentAt;
}

return $input.all();
