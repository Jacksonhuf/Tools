export interface SmtpDigestPayload {
  tenant_id: string;
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export interface SmtpDeliveryResult {
  channel: "smtp_queue";
  status: "smtp_accepted" | "smtp_skipped" | "smtp_stub_queued";
  to?: string;
  subject?: string;
  smtp_host?: string | null;
  submission_url?: string | null;
}

const smtpStubOutbox: SmtpDigestPayload[] = [];

export function listSmtpStubOutbox(): SmtpDigestPayload[] {
  return [...smtpStubOutbox];
}

export function resetSmtpDigestAdapterForTests(): void {
  smtpStubOutbox.length = 0;
}

/** SMTP adapter: HTTP submission relay or in-memory stub (no raw SMTP socket). */
export async function deliverSmtpDigest(
  payload: SmtpDigestPayload
): Promise<SmtpDeliveryResult> {
  const submissionUrl = process.env.SMTP_SUBMISSION_URL?.trim();
  const smtpHost = process.env.SMTP_HOST?.trim() || null;
  const from =
    process.env.SMTP_FROM?.trim() || "mx-pricing-digest@notifications.local";

  if (submissionUrl) {
    const res = await fetch(submissionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        from,
        smtp_host: smtpHost,
      }),
    });
    if (!res.ok) {
      throw new Error(`SMTP_SUBMISSION_${res.status}`);
    }
    return {
      channel: "smtp_queue",
      status: "smtp_accepted",
      to: payload.to,
      subject: payload.subject,
      smtp_host: smtpHost,
      submission_url: submissionUrl,
    };
  }

  if (process.env.SMTP_RECORD_STUB === "1") {
    smtpStubOutbox.push({ ...payload, from });
    return {
      channel: "smtp_queue",
      status: "smtp_stub_queued",
      to: payload.to,
      subject: payload.subject,
      smtp_host: smtpHost,
      submission_url: null,
    };
  }

  if (!smtpHost) {
    return {
      channel: "smtp_queue",
      status: "smtp_skipped",
      smtp_host: null,
      submission_url: null,
    };
  }

  smtpStubOutbox.push({ ...payload, from });
  return {
    channel: "smtp_queue",
    status: "smtp_stub_queued",
    to: payload.to,
    subject: payload.subject,
    smtp_host: smtpHost,
    submission_url: null,
  };
}
