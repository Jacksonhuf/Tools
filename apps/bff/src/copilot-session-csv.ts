import type { CopilotSession } from "./copilot-session.js";

function cell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function copilotSessionToCsv(
  session: CopilotSession,
  exportedAt: string
): string {
  const lines = [
    "exported_at,session_id,listing_id,sku_id,role,content,message_created_at",
  ];
  if (session.messages.length === 0) {
    lines.push(
      [
        exportedAt,
        cell(session.session_id),
        cell(session.listing_id),
        cell(session.sku_id),
        "",
        "",
        "",
      ].join(",")
    );
  } else {
    for (const msg of session.messages) {
      lines.push(
        [
          exportedAt,
          cell(session.session_id),
          cell(session.listing_id),
          cell(session.sku_id),
          cell(msg.role),
          cell(msg.content),
          cell(msg.created_at),
        ].join(",")
      );
    }
  }
  return `${lines.join("\n")}\n`;
}
