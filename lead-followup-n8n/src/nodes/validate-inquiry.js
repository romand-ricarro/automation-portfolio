// Normalise the webhook body and reject inquiries without a name or a usable email.
const body = $input.first().json.body ?? {};
const clean = (value) => String(value ?? '').trim();

const inquiry = {
  name: clean(body.name),
  email: clean(body.email).toLowerCase(),
  phone: clean(body.phone),
  message: clean(body.message),
  source: clean(body.source) || 'website',
};

const errors = [];
if (!inquiry.name) errors.push('name is required');
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inquiry.email)) errors.push('a valid email is required');
if (inquiry.message.length > 5000) errors.push('message must be 5000 characters or fewer');

return [{ json: { valid: errors.length === 0, errors, inquiry } }];
