import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import {
  evaluateReleaseGate,
  getNfrRel003Gate,
} from "../../apps/bff/src/release-gate.js";
import { releaseGateToCsv } from "../../apps/bff/src/release-gate-csv.js";
import { evaluateGoLiveReadiness } from "../../apps/bff/src/go-live-readiness.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };

describe("P3-E3-05 release gate catalog", () => {
  it("lists TC-NFR-REL-003 as P0 blocking gate with ci-nfr-rel", () => {
    const gate = getNfrRel003Gate();
    expect(gate.priority).toBe("P0");
    expect(gate.blocking).toBe(true);
    expect(gate.passed).toBe(true);
    expect(gate.ci_job).toBe("ci-nfr-rel");
    expect(gate.npm_script).toBe("test:nfr-rel");
    expect(gate.test_file).toBe("tests/api/ingest-nfr.test.ts");
  });

  it("evaluateReleaseGate reports p0_blocking_ready", () => {
    const snapshot = evaluateReleaseGate();
    expect(snapshot.p0_blocking_ready).toBe(true);
    expect(snapshot.gates.some((g) => g.id === "TC-NFR-REL-003")).toBe(true);
  });

  it("releaseGateToCsv includes TC-NFR-REL-003 row", () => {
    const csv = releaseGateToCsv(evaluateReleaseGate(), "2026-07-30T00:00:00.000Z");
    expect(csv).toContain("TC-NFR-REL-003");
    expect(csv).toContain("ci-nfr-rel");
  });

  it("go-live checklist includes TC-NFR-REL-003 gate", () => {
    const goLive = evaluateGoLiveReadiness();
    const rel = goLive.checks.find((c) => c.id === "TC-NFR-REL-003");
    expect(rel?.passed).toBe(true);
    expect(rel?.detail).toContain("ci-nfr-rel");
  });
});

describe("GET /api/v1/product/release-gate", () => {
  it("returns P0 gate catalog", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/product/release-gate", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      p0_blocking_ready: boolean;
      gates: Array<{ id: string; ci_job: string }>;
    };
    expect(json.p0_blocking_ready).toBe(true);
    const nfr = json.gates.find((g) => g.id === "TC-NFR-REL-003");
    expect(nfr?.ci_job).toBe("ci-nfr-rel");
  });

  it("GET /api/v1/product/release-gate/export returns CSV", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/product/release-gate/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("TC-NFR-REL-003");
  });
});
