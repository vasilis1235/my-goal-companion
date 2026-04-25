// Μετατροπές μονάδων Metric ↔ Imperial
export type Units = "metric" | "imperial";

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const cmToIn = (cm: number) => cm / CM_PER_IN;
export const inToCm = (inch: number) => inch * CM_PER_IN;

// Format helpers — δίνουν τιμή + label με βάση τις προτιμήσεις
export function fmtWeight(kg: number, units: Units, decimals = 1): { value: number; unit: string } {
  return units === "imperial"
    ? { value: +kgToLb(kg).toFixed(decimals), unit: "lb" }
    : { value: +kg.toFixed(decimals), unit: "kg" };
}

export function fmtLength(cm: number, units: Units, decimals = 1): { value: number; unit: string } {
  return units === "imperial"
    ? { value: +cmToIn(cm).toFixed(decimals), unit: "in" }
    : { value: +cm.toFixed(decimals), unit: "cm" };
}

export function weightUnit(units: Units): string {
  return units === "imperial" ? "lb" : "kg";
}
export function lengthUnit(units: Units): string {
  return units === "imperial" ? "in" : "cm";
}

// Convenience: δίνει ωραίο string π.χ. "75.0 kg" ή "165.3 lb"
export function displayWeight(kg: number | null | undefined, units: Units, d = 1): string {
  if (kg == null) return "—";
  const { value, unit } = fmtWeight(Number(kg), units, d);
  return `${value.toFixed(d)} ${unit}`;
}
export function displayLength(cm: number | null | undefined, units: Units, d = 1): string {
  if (cm == null) return "—";
  const { value, unit } = fmtLength(Number(cm), units, d);
  return `${value.toFixed(d)} ${unit}`;
}
