import { evaluateAgentReadiness } from "./agent-readiness.js";
import { evaluateP3Readiness } from "./p3-readiness.js";
import { evaluateP5Readiness } from "./p5-readiness.js";

export interface ProductMilestoneStatus {
  id: "P3" | "P4" | "P5";
  status: "in_progress" | "accepted";
  summary: string;
  loops: string;
}

export function getProductMilestoneStatus(): {
  milestones: ProductMilestoneStatus[];
  p3_readiness: ReturnType<typeof evaluateP3Readiness>;
  p4_readiness: ReturnType<typeof evaluateAgentReadiness>;
  p5_readiness: ReturnType<typeof evaluateP5Readiness>;
} {
  const p3 = evaluateP3Readiness();
  const p4 = evaluateAgentReadiness();
  const p5 = evaluateP5Readiness();
  const milestones: ProductMilestoneStatus[] = [
    {
      id: "P3",
      status: p3.ready ? "accepted" : "in_progress",
      summary: p3.ready
        ? "Channel write-back, reconcile, ops queue, guards (Loop 27 acceptance)"
        : "P3 checks failing",
      loops: "13–27",
    },
    {
      id: "P4",
      status: p4.ready ? "accepted" : "in_progress",
      summary: p4.ready
        ? "Copilot read-only + draft + NL compile + digest (Loop 26 acceptance)"
        : "Agent milestone checks failing",
      loops: "19–26",
    },
    {
      id: "P5",
      status: p5.ready ? "accepted" : "in_progress",
      summary: p5.ready
        ? "Cross-channel guard, templates, batch queue, NFR ops (Loop 56 acceptance)"
        : "P5 checks failing",
      loops: "37–56",
    },
  ];
  return { milestones, p3_readiness: p3, p4_readiness: p4, p5_readiness: p5 };
}

export function getProductReadinessSummary() {
  const { milestones, p3_readiness, p4_readiness, p5_readiness } =
    getProductMilestoneStatus();
  return {
    milestones,
    p3: p3_readiness,
    p4: p4_readiness,
    p5: p5_readiness,
    all_accepted: milestones.every((m) => m.status === "accepted"),
  };
}
