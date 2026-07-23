import type { AppLocale } from "@mx-pricing/i18n-format";
import {
  formatGlossaryForLocale,
  getGlossaryTerm,
  listGlossaryTerms,
  type GlossaryTerm,
} from "./i18n-glossary.js";

function cell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function i18nGlossaryToCsv(locale: AppLocale, exportedAt: string): string {
  const lines = ["exported_at,locale,term_key,category,label,description"];
  for (const row of formatGlossaryForLocale(locale)) {
    lines.push(
      [
        exportedAt,
        cell(locale),
        cell(row.key),
        cell(row.category),
        cell(row.label),
        cell(row.description),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}

export function i18nGlossaryTermToCsv(
  term: GlossaryTerm,
  locale: AppLocale,
  exportedAt: string
): string {
  return [
    "exported_at,locale,term_key,category,label,description",
    [
      exportedAt,
      cell(locale),
      cell(term.key),
      cell(term.category),
      cell(term.labels[locale]),
      cell(term.descriptions[locale]),
    ].join(","),
    "",
  ].join("\n");
}

export function allGlossaryTermKeys(): string[] {
  return listGlossaryTerms().map((t) => t.key);
}

export function getGlossaryTermOrThrow(key: string): GlossaryTerm {
  const term = getGlossaryTerm(key);
  if (!term) {
    throw new Error("GLOSSARY_TERM_NOT_FOUND");
  }
  return term;
}
