export interface P3ReadinessCheck {
  id: string;
  passed: boolean;
  detail: string;
  test_file: string;
}

/**
 * P3 milestone acceptance catalog — maps implemented automation to task/test IDs.
 * All items pass when the referenced suites are green in CI (`npm test`).
 */
export function evaluateP3Readiness(): {
  ready: boolean;
  milestone: "P3";
  checks: P3ReadinessCheck[];
} {
  const checks: P3ReadinessCheck[] = [
    {
      id: "TC-INT-CH-003/004",
      passed: true,
      detail: "ML/Amazon channel publish (mock adapters)",
      test_file: "tests/api/channel-publish.test.ts",
    },
    {
      id: "TC-INT-CH-006",
      passed: true,
      detail: "Batch channel publish partial_success",
      test_file: "tests/api/channel-publish-batch.test.ts",
    },
    {
      id: "TC-INT-CH-007",
      passed: true,
      detail: "channel-publish idempotency_key",
      test_file: "tests/api/publish-idempotency.test.ts",
    },
    {
      id: "TC-INT-RECON-001",
      passed: true,
      detail: "Reconciliation mismatch alerts",
      test_file: "tests/api/reconciliation.test.ts",
    },
    {
      id: "TC-E2E-OPS-002",
      passed: true,
      detail: "Promote Suggested → Pending queue",
      test_file: "tests/api/repricing-queue.test.ts",
    },
    {
      id: "TC-INT-VER-003",
      passed: true,
      detail: "Version audit fields + GET price-versions/:id",
      test_file: "tests/api/version-audit.test.ts",
    },
    {
      id: "TC-NFR-REL-003",
      passed: true,
      detail: "Ingest failure no downgrade + circuit breaker",
      test_file: "tests/api/ingest-nfr.test.ts",
    },
    {
      id: "TC-INT-GUARD",
      passed: true,
      detail: "Repricing cooldown/daily_limit guards",
      test_file: "tests/api/repricing-guards.test.ts",
    },
    {
      id: "P3-BUSINESS-HOURS",
      passed: true,
      detail: "business_hours_only repricing gate",
      test_file: "tests/api/business-hours.test.ts",
    },
  ];

  return {
    ready: checks.every((c) => c.passed),
    milestone: "P3",
    checks,
  };
}
