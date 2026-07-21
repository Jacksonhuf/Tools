function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

export type CopilotTurnIntent = "simulate" | "rule_compile";

export function isSimulateIntent(text: string): boolean {
  const n = normalize(text);
  return (
    /simul|模拟|what if|que pasa|qué pasa|margen|margin|试算|diagnostic|diagnóstico|竞品价|competitor price|precio competidor/.test(
      n
    ) && !/regla|rule|规则|compilar|compile|pendiente|pending|mediana|median|offset/.test(n)
  );
}

export function parseCompetitorPriceMxn(text: string): number | undefined {
  const n = normalize(text);
  const explicit = n.match(
    /(?:competitor|competidor|竞品|precio|price|mxn|pesos|比索)[^\d]*(\d+(?:\.\d+)?)/
  );
  if (explicit) return Number(explicit[1]);
  const nums = [...n.matchAll(/(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
  const plausible = nums.filter((v) => v >= 10 && v <= 1_000_000);
  return plausible.length ? plausible[plausible.length - 1] : undefined;
}
