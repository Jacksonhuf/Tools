export interface MexicoBusinessHoursConfig {
  startHour: number;
  endHour: number;
  /** Weekdays 0=Sun … 6=Sat in America/Mexico_City local calendar */
  allowedWeekdays: number[];
}

export const DEFAULT_MX_BUSINESS_HOURS: MexicoBusinessHoursConfig = {
  startHour: 9,
  endHour: 21,
  allowedWeekdays: [1, 2, 3, 4, 5, 6],
};

let clockOverride: Date | null = null;

export function setMexicoBusinessHoursClockForTests(date: Date | null): void {
  clockOverride = date;
}

function mexicoLocalMeta(date: Date): { hour: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Mexico_City",
    hour: "numeric",
    weekday: "short",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return { hour, weekday: map[wd] ?? 0 };
}

export function isWithinMexicoBusinessHours(
  at: Date = clockOverride ?? new Date(),
  config: MexicoBusinessHoursConfig = DEFAULT_MX_BUSINESS_HOURS
): boolean {
  const { hour, weekday } = mexicoLocalMeta(at);
  if (!config.allowedWeekdays.includes(weekday)) {
    return false;
  }
  return hour >= config.startHour && hour < config.endHour;
}
