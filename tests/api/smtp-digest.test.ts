import { describe, expect, it, afterEach, vi } from "vitest";
import {
  deliverSmtpDigest,
  listSmtpStubOutbox,
  resetSmtpDigestAdapterForTests,
} from "../../apps/bff/src/smtp-digest-adapter.js";

describe("smtp digest adapter", () => {
  const prevSubmission = process.env.SMTP_SUBMISSION_URL;
  const prevRecord = process.env.SMTP_RECORD_STUB;

  afterEach(() => {
    vi.unstubAllGlobals();
    resetSmtpDigestAdapterForTests();
    if (prevSubmission === undefined) delete process.env.SMTP_SUBMISSION_URL;
    else process.env.SMTP_SUBMISSION_URL = prevSubmission;
    if (prevRecord === undefined) delete process.env.SMTP_RECORD_STUB;
    else process.env.SMTP_RECORD_STUB = prevRecord;
  });

  it("queues stub when SMTP_RECORD_STUB=1", async () => {
    process.env.SMTP_RECORD_STUB = "1";
    const r = await deliverSmtpDigest({
      tenant_id: "tenant-demo",
      to: "ops@test.mx",
      subject: "Digest",
      body: "Hello",
    });
    expect(r.status).toBe("smtp_stub_queued");
    expect(listSmtpStubOutbox()).toHaveLength(1);
  });

  it("POSTs to SMTP_SUBMISSION_URL when configured", async () => {
    process.env.SMTP_SUBMISSION_URL = "https://smtp-relay.example/send";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200 }))
    );
    const r = await deliverSmtpDigest({
      tenant_id: "tenant-demo",
      to: "ops@test.mx",
      subject: "Digest",
      body: "Hello",
    });
    expect(r.status).toBe("smtp_accepted");
  });
});
