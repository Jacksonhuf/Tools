import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchFeatureFlags,
  fetchProductReadiness,
  downloadFeatureFlagsCsv,
  downloadProductReadinessCsv,
  downloadP5ReadinessCsv,
  downloadP4ReadinessCsv,
  downloadP3ReadinessCsv,
  downloadAgentMilestonesCsv,
  type FeatureFlagsSnapshot,
  type ProductReadinessSnapshot,
} from "../api/client";

export function ProductReadinessPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [readiness, setReadiness] = useState<ProductReadinessSnapshot | null>(
    null
  );
  const [flags, setFlags] = useState<FeatureFlagsSnapshot | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [pr, ff] = await Promise.all([
        fetchProductReadiness(locale),
        fetchFeatureFlags(locale),
      ]);
      setReadiness(pr);
      setFlags(ff);
    } catch (e) {
      setError(String(e));
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="page page-wide">
      <h1>{t("readinessTitle")}</h1>
      <p className="hint">{t("readinessHint")}</p>
      {error && <p className="error">{error}</p>}
      {message && <p className="hint">{message}</p>}

      {readiness && (
        <section className="card" data-testid="product-readiness">
          <h2>{t("readinessMilestones")}</h2>
          <p data-testid="readiness-all-accepted">
            {readiness.all_accepted
              ? t("readinessAllAccepted")
              : t("readinessInProgress")}
          </p>
          <button
            type="button"
            data-testid="readiness-milestones-export"
            onClick={() =>
              void downloadAgentMilestonesCsv(locale).then(() =>
                setMessage(t("readinessMilestonesExportDone"))
              )
            }
          >
            {t("readinessMilestonesExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-product-export"
            onClick={() =>
              void downloadProductReadinessCsv(locale).then(() =>
                setMessage(t("readinessProductExportDone"))
              )
            }
          >
            {t("readinessProductExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-p3-export"
            onClick={() =>
              void downloadP3ReadinessCsv(locale).then(() =>
                setMessage(t("readinessP3ExportDone"))
              )
            }
          >
            {t("readinessP3ExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-p4-export"
            onClick={() =>
              void downloadP4ReadinessCsv(locale).then(() =>
                setMessage(t("readinessP4ExportDone"))
              )
            }
          >
            {t("readinessP4ExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-p5-export"
            onClick={() =>
              void downloadP5ReadinessCsv(locale).then(() =>
                setMessage(t("readinessP5ExportDone"))
              )
            }
          >
            {t("readinessP5ExportCsv")}
          </button>
          <table className="batch-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>{t("batchStatus")}</th>
                <th>{t("readinessSummary")}</th>
              </tr>
            </thead>
            <tbody>
              {readiness.milestones.map((m) => (
                <tr key={m.id}>
                  <td>
                    <code>{m.id}</code>
                  </td>
                  <td>
                    <span className={`status status-${m.status}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>{m.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {flags && (
        <section className="card" data-testid="feature-flags-panel">
          <h2>{t("readinessFeatureFlags")}</h2>
          <button
            type="button"
            data-testid="readiness-feature-flags-export"
            onClick={() =>
              void downloadFeatureFlagsCsv(locale).then(() =>
                setMessage(t("readinessFeatureFlagsExportDone"))
              )
            }
          >
            {t("readinessFeatureFlagsExportCsv")}
          </button>
          <dl className="adapter-status-dl">
            {Object.entries(flags)
              .filter(([k]) => k !== "generated_at")
              .map(([key, value]) => (
                <div key={key}>
                  <dt>
                    <code>{key}</code>
                  </dt>
                  <dd>{value ? t("readinessFlagOn") : t("readinessFlagOff")}</dd>
                </div>
              ))}
          </dl>
        </section>
      )}
    </div>
  );
}
