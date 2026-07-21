import { evaluateAgentReadiness } from "./agent-readiness.js";

export interface ProductMilestoneStatus {
  id: "P3" | "P4";
  status: "in_progress" | "accepted";
  summary: string;
  loops: string;
}

export function getProductMilestoneStatus(): {
  milestones: ProductMilestoneStatus[];
  p4_readiness: ReturnType<typeof evaluateAgentReadiness>;
} {
  const p4 = evaluateAgentReadiness();
  const milestones: ProductMilestoneStatus[] = [
    {
      id: "P3",
      status: "in_progress",
      summary: "Channel publish, reconcile, ops queue, version audit",
      loops: "13–24",
    },
    {
      id: "P4",
      status: p4.ready ? "accepted" : "in_progress",
      summary: p4.ready
        ? "Copilot read-only + draft + NL compile + digest (Loop 26 acceptance)"
        : "Agent milestone checks failing",
      loops: "19–26",
    },
  ];
  return { milestones, p4_readiness: p4 };
}
