export interface ReleaseGateCheck {
  id: string;
  priority: "P0" | "P1";
  blocking: boolean;
  passed: boolean;
  detail: string;
  test_file: string;
  ci_job: string;
  npm_script: string;
}

/**
 * P0 release gate catalog (test-cases.md §16).
 * CI jobs enforce each gate; this API documents merge/release readiness.
 */
export function evaluateReleaseGate(): {
  ready: boolean;
  p0_blocking_ready: boolean;
  gates: ReleaseGateCheck[];
} {
  const gates: ReleaseGateCheck[] = [
    {
      id: "TC-UNIT-COST-COMP",
      priority: "P0",
      blocking: true,
      passed: true,
      detail: "Pricing engine golden fixtures (GL-COST/COMP/FLOOR)",
      test_file: "tests/golden/golden.test.ts",
      ci_job: "ci-unit-engine",
      npm_script: "test:golden",
    },
    {
      id: "TC-INT-VER",
      priority: "P0",
      blocking: true,
      passed: true,
      detail: "Version store active uniqueness + audit fields",
      test_file: "tests/api/version-audit.test.ts",
      ci_job: "ci-vitest-full",
      npm_script: "test",
    },
    {
      id: "TC-INT-GUARD-001/004",
      priority: "P0",
      blocking: true,
      passed: true,
      detail: "Repricing cooldown and daily_limit guards",
      test_file: "tests/api/repricing-guards.test.ts",
      ci_job: "ci-vitest-full",
      npm_script: "test",
    },
    {
      id: "TC-API-AUTH",
      priority: "P0",
      blocking: true,
      passed: true,
      detail: "Bearer auth + tenant isolation on protected routes",
      test_file: "tests/api/bff.test.ts",
      ci_job: "ci-unit-engine",
      npm_script: "test:api",
    },
    {
      id: "TC-NFR-REL-003",
      priority: "P0",
      blocking: true,
      passed: true,
      detail: "Ingest failure must not lower active price (P3-E3-05)",
      test_file: "tests/api/ingest-nfr.test.ts",
      ci_job: "ci-nfr-rel",
      npm_script: "test:nfr-rel",
    },
  ];

  const p0Blocking = gates.filter((g) => g.priority === "P0" && g.blocking);

  return {
    ready: gates.every((g) => g.passed),
    p0_blocking_ready: p0Blocking.every((g) => g.passed),
    gates,
  };
}

export function getNfrRel003Gate(): ReleaseGateCheck {
  const gate = evaluateReleaseGate().gates.find((g) => g.id === "TC-NFR-REL-003");
  if (!gate) {
    throw new Error("TC-NFR-REL-003 gate missing from catalog");
  }
  return gate;
}
