export async function sendInvitationEmail(email: string, orgName: string, role: string, inviteLink: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { emailSent: false, emailError: 'Invitation email is not configured. Set RESEND_API_KEY on the API server.' };
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.INVITE_FROM_EMAIL || 'Nexo Cloud <onboarding@resend.dev>',
        to: [email],
        subject: `You're invited to join ${orgName} on Nexo Cloud`,
        text: `You were invited to join ${orgName} as ${role}.\n\nAccept invitation: ${inviteLink}\n\nSign in with ${email} and verify your email to join the organization with this role. This invitation expires in 7 days.\n\nIf you don't recognize this invitation, you can ignore this email.`,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok && typeof result.id === 'string') return { emailSent: true, emailId: result.id };
    const emailError = response.status === 401
      ? 'Resend rejected the API key. Update RESEND_API_KEY on the API server.'
      : response.status === 403 || response.status === 422
        ? 'Resend rejected the sender or recipient. Set INVITE_FROM_EMAIL to an address on your verified Resend domain; the resend.dev testing sender cannot email teammates.'
        : response.status === 429
          ? 'Resend sending limit reached. Try again later or share the invitation link.'
          : 'Resend could not send the invitation. Check the email provider dashboard or share the invitation link.';
    return { emailSent: false, emailError };
  } catch {
    return { emailSent: false, emailError: 'Could not reach Resend. Check the API server connection or share the invitation link.' };
  }
}
