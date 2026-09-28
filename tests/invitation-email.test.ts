import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendInvitationEmail } from '../backend/invitation-email';

test('invitation email reports provider acceptance and recoverable delivery failures', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  try {
    delete process.env.RESEND_API_KEY;
    assert.equal((await sendInvitationEmail('member@example.com', 'Team', 'admin', 'https://app.example/invite')).emailSent, false);
    process.env.RESEND_API_KEY = 'test-key';
    globalThis.fetch = async (_url, options) => {
      const body = JSON.parse(String(options?.body));
      assert.deepEqual(body.to, ['member@example.com']);
      assert.match(body.text, /as admin/);
      assert.match(body.text, /https:\/\/app.example\/invite/);
      return new Response(JSON.stringify({ id: 'provider-id' }), { status: 200 });
    };
    assert.deepEqual(await sendInvitationEmail('member@example.com', 'Team', 'admin', 'https://app.example/invite'), { emailSent: true, emailId: 'provider-id' });
    for (const status of [401, 403, 422, 429, 500]) {
      globalThis.fetch = async () => new Response('{}', { status });
      const result = await sendInvitationEmail('member@example.com', 'Team', 'viewer', 'https://app.example/invite');
      assert.equal(result.emailSent, false);
      assert.ok(result.emailError);
    }
    globalThis.fetch = async () => { throw new Error('Network failure'); };
    assert.match((await sendInvitationEmail('member@example.com', 'Team', 'viewer', 'https://app.example/invite')).emailError!, /Could not reach Resend/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  }
});
