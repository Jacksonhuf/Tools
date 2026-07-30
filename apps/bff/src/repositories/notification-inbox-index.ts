import type { NotificationInboxRepository } from "./notification-inbox-types.js";
import { MemoryNotificationInboxRepository } from "./memory-notification-inbox.js";

let singleton: NotificationInboxRepository | undefined;

export function getNotificationInboxRepository(): NotificationInboxRepository {
  if (!singleton) {
    singleton = new MemoryNotificationInboxRepository();
  }
  return singleton;
}

export function setNotificationInboxRepository(
  repo: NotificationInboxRepository
): void {
  singleton = repo;
}

export { MemoryNotificationInboxRepository } from "./memory-notification-inbox.js";
