export type AppLocale = "zh-CN" | "en" | "es-MX";

const localeMap: Record<AppLocale, string> = {
  "zh-CN": "zh-CN",
  en: "en-US",
  "es-MX": "es-MX",
};

export interface FormatMoneyOptions {
  locale: AppLocale;
  currency: string;
  amount: number;
}

export interface FormattedMoney {
  amount: number;
  currency: string;
  formatted: string;
}

/** SDD §10 — display amounts via BFF; locale independent from currency */
export function formatMoney(options: FormatMoneyOptions): FormattedMoney {
  const { locale, currency, amount } = options;
  const intlLocale = localeMap[locale] ?? "en-US";
  const formatted = new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return { amount, currency, formatted };
}

export function parseAcceptLanguage(header: string | undefined): AppLocale {
  if (!header) return "en";
  const lower = header.toLowerCase();
  if (lower.includes("zh")) return "zh-CN";
  if (lower.includes("es")) return "es-MX";
  return "en";
}
