export function comparePrice(price, benchmark) {
  if (price == null || price === "" || benchmark == null || benchmark === "") return null;
  const current = Number(price), reference = Number(benchmark);
  if (!Number.isFinite(current) || !Number.isFinite(reference) || current < 0 || reference < 0) return null;
  const difference = Math.round(current * 100) - Math.round(reference * 100);
  return { tone: difference > 0 ? "high" : difference < 0 ? "low" : "equal", difference: Math.abs(difference) / 100 };
}
