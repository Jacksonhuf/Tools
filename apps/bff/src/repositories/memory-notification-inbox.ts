import type {
  NotificationInboxRecord,
  NotificationInboxRepository,
} from "./notification-inbox-types.js";

let seq = 0;
const records: NotificationInboxRecord[] = [];

export class MemoryNotificationInboxRepository
  implements NotificationInboxRepository
{
  readonly driver = "memory" as const;

  async create(
    input: Omit<NotificationInboxRecord, "id" | "created_at" | "read_at">
  ): Promise<NotificationInboxRecord> {
    seq += 1;
    const record: NotificationInboxRecord = {
      id: `notif-${seq}`,
      created_at: new Date().toISOString(),
      read_at: null,
      ...input,
    };
    records.push(record);
    return record;
  }

  async list(tenantId: string, limit = 50): Promise<NotificationInboxRecord[]> {
    return records
      .filter((r) => r.tenant_id === tenantId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, limit);
  }

  async markRead(
    tenantId: string,
    id: string
  ): Promise<NotificationInboxRecord | undefined> {
    const record = records.find((r) => r.tenant_id === tenantId && r.id === id);
    if (!record) {
      return undefined;
    }
    record.read_at = new Date().toISOString();
    return record;
  }

  resetForTests(): void {
    records.length = 0;
    seq = 0;
  }
}
