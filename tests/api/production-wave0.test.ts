import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import {
  resolveDeployEnvironment,
  getDeployEnvironmentStatus,
} from "../../apps/bff/src/deploy-environment.js";
import { evaluateSecretsStatus } from "../../apps/bff/src/secrets-registry.js";
import { evaluateBackupPitrStatus } from "../../apps/bff/src/backup-pitr.js";
import {
  createWafMiddleware,
  resetWafBucketsForTests,
} from "../../apps/bff/src/waf-middleware.js";

describe("deploy environment", () => {
  it("defaults to development", () => {
    expect(resolveDeployEnvironment()).toBe("development");
    expect(getDeployEnvironmentStatus().deploy_env).toBe("development");
  });
});

describe("secrets registry", () => {
  it("passes in development without secrets", () => {
    const status = evaluateSecretsStatus();
    expect(status.deploy_env).toBe("development");
    expect(status.ready).toBe(true);
  });
});

describe("backup PITR status", () => {
  it("passes in development", () => {
    const status = evaluateBackupPitrStatus();
    expect(status.deploy_env).toBe("development");
    expect(status.ready).toBe(true);
  });
});

describe("GET /api/v1/production/readiness (Wave 0)", () => {
  it("includes infra blocks", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/production/readiness", {
      headers: {
        Authorization: "Bearer dev-token",
        "X-Tenant-Id": "tenant-demo",
      },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      deploy: { deploy_env: string };
      secrets: { ready: boolean };
      waf: { enabled: boolean };
      backup_pitr: { ready: boolean };
    };
    expect(json.deploy.deploy_env).toBe("development");
    expect(json.secrets.ready).toBe(true);
    expect(json.backup_pitr.ready).toBe(true);
    expect(json.waf).toBeDefined();
  });
});

describe("GET /api/v1/ops/backup/status", () => {
  it("returns backup status", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/ops/backup/status", {
      headers: {
        Authorization: "Bearer dev-token",
        "X-Tenant-Id": "tenant-demo",
      },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { deploy_env: string; ready: boolean };
    expect(json.deploy_env).toBe("development");
    expect(json.ready).toBe(true);
  });
});

describe("WAF middleware", () => {
  const prevDeploy = process.env.DEPLOY_ENV;
  const prevWaf = process.env.WAF_ENABLED;

  beforeEach(() => {
    resetWafBucketsForTests();
    process.env.DEPLOY_ENV = "staging";
    process.env.WAF_ENABLED = "true";
  });

  afterEach(() => {
    resetWafBucketsForTests();
    if (prevDeploy === undefined) delete process.env.DEPLOY_ENV;
    else process.env.DEPLOY_ENV = prevDeploy;
    if (prevWaf === undefined) delete process.env.WAF_ENABLED;
    else process.env.WAF_ENABLED = prevWaf;
  });

  it("blocks suspicious paths", async () => {
    const middleware = createWafMiddleware();
    const next = vi.fn(async () => {});
    const c = {
      req: {
        path: "/api/../etc/passwd",
        header: () => undefined,
      },
      header: vi.fn(),
    };
    await expect(middleware(c as never, next)).rejects.toMatchObject({
      status: 403,
    });
    expect(next).not.toHaveBeenCalled();
  });
});
