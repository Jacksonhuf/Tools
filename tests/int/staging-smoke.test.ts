import { describe, expect, it, beforeAll } from "vitest";
import { runMigrations, seedDemoData } from "@mx-pricing/db";
import { createApp } from "../../apps/bff/src/app.js";
import { signHs256Jwt } from "../../apps/bff/src/oidc-jwt.js";

const DATABASE_URL = process.env.DATABASE_URL;
const RUN_STAGING =
  process.env.RUN_STAGING_SMOKE === "1" ||
  process.env.RUN_STAGING_SMOKE === "true";
const STAGING_SECRET =
  process.env.OIDC_JWT_HS256_SECRET ?? "change-me-staging-jwt-secret";
const TENANT = "tenant-demo";

/**
 * TC-STAGING-001 — staging profile readiness + go-live + auth/me on PostgreSQL.
 * CI: `.github/workflows/ci-staging-smoke.yml`
 */
describe.skipIf(!RUN_STAGING || !DATABASE_URL)(
  "TC-STAGING staging profile smoke",
  () => {
    let app: ReturnType<typeof createApp>;
    let authHeaders: Record<string, string>;

    beforeAll(async () => {
      process.env.DEPLOY_ENV = "staging";
      process.env.AUTH_DRIVER = "oidc_jwt";
      process.env.OIDC_JWT_HS256_SECRET = STAGING_SECRET;
      process.env.WAF_ENABLED = "true";
      process.env.BACKUP_ENABLED = "true";
      process.env.PITR_ENABLED = "true";
      process.env.REDIS_URL =
        process.env.REDIS_URL ?? "redis://localhost:6379";

      await runMigrations(DATABASE_URL!);
      await seedDemoData(DATABASE_URL!);
      app = createApp();

      const jwt = signHs256Jwt(
        {
          sub: "staging-smoke",
          tenant_id: TENANT,
          roles: [
            "pricing:read",
            "pricing:write",
            "finance:approve",
            "channel:admin",
          ],
        },
        STAGING_SECRET
      );
      authHeaders = {
        Authorization: `Bearer ${jwt}`,
        "X-Tenant-Id": TENANT,
      };
    });

    it("GET /health returns 200", async () => {
      const res = await app.request("/health");
      expect(res.status).toBe(200);
    });

    it("GET /production/readiness reports staging deploy env", async () => {
      const res = await app.request("/api/v1/production/readiness", {
        headers: authHeaders,
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        deploy: { deploy_env: string };
        secrets: { ready: boolean };
        waf: { enabled: boolean };
        backup_pitr: { ready: boolean };
      };
      expect(json.deploy.deploy_env).toBe("staging");
      expect(json.secrets.ready).toBe(true);
      expect(json.waf.enabled).toBe(true);
      expect(json.backup_pitr.ready).toBe(true);
    });

    it("GET /production/go-live returns checklist", async () => {
      const res = await app.request("/api/v1/production/go-live", {
        headers: authHeaders,
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        ready: boolean;
        checks: Array<{ id: string; passed: boolean }>;
      };
      expect(json.checks.length).toBeGreaterThan(0);
      expect(
        json.checks.find((c) => c.id === "GL-GOLDEN-MANIFEST")?.passed
      ).toBe(true);
    });

    it("GET /auth/me returns staging principal", async () => {
      const res = await app.request("/api/v1/auth/me", {
        headers: authHeaders,
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        subject: string;
        permissions: { pricing_write: boolean; finance_approve: boolean };
      };
      expect(json.subject).toBe("staging-smoke");
      expect(json.permissions.pricing_write).toBe(true);
      expect(json.permissions.finance_approve).toBe(true);
    });

    it("GET pricing-context loads demo SKU from PostgreSQL", async () => {
      const res = await app.request(
        "/api/v1/skus/demo-sku-001/pricing-context",
        {
          headers: { ...authHeaders, "Accept-Language": "en" },
        }
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as { sku: { id: string } };
      expect(json.sku.id).toBe("demo-sku-001");
    });
  }
);
