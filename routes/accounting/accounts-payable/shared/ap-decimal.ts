import type { DecimalString } from "@/types/accounts-payable";

function scaleOf(value: DecimalString): number {
  return (value.split(".")[1] ?? "").length;
}

function integerAtScale(value: DecimalString, scale: number): bigint {
  const normalized = value.trim() || "0";
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole = "0", fraction = ""] = unsigned.split(".");
  const result =
    BigInt(whole || "0") * 10n ** BigInt(scale) +
    BigInt((fraction + "0".repeat(scale)).slice(0, scale) || "0");
  return negative ? -result : result;
}

function fromInteger(value: bigint, scale: number): DecimalString {
  const negative = value < 0n;
  const digits = (negative ? -value : value)
    .toString()
    .padStart(scale + 1, "0");
  const rendered =
    scale === 0 ? digits : `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
  return `${negative ? "-" : ""}${rendered}`;
}

export function normalizeDecimal(
  value: DecimalString,
  scale = 2,
): DecimalString {
  const sourceScale = scaleOf(value);
  if (sourceScale <= scale)
    return fromInteger(integerAtScale(value, scale), scale);
  const source = integerAtScale(value, sourceScale);
  const divisor = 10n ** BigInt(sourceScale - scale);
  const absolute = source < 0n ? -source : source;
  const rounded = (absolute + divisor / 2n) / divisor;
  return fromInteger(source < 0n ? -rounded : rounded, scale);
}

export function addDecimal(values: DecimalString[], scale = 2): DecimalString {
  return fromInteger(
    values.reduce(
      (sum, value) =>
        sum + integerAtScale(normalizeDecimal(value, scale), scale),
      0n,
    ),
    scale,
  );
}

export function subtractDecimal(
  left: DecimalString,
  right: DecimalString,
  scale = 2,
): DecimalString {
  return fromInteger(
    integerAtScale(normalizeDecimal(left, scale), scale) -
      integerAtScale(normalizeDecimal(right, scale), scale),
    scale,
  );
}

export function multiplyDecimal(
  left: DecimalString,
  right: DecimalString,
  scale = 2,
): DecimalString {
  const leftScale = scaleOf(left);
  const rightScale = scaleOf(right);
  const product =
    integerAtScale(left, leftScale) * integerAtScale(right, rightScale);
  const productScale = leftScale + rightScale;
  if (productScale <= scale)
    return fromInteger(product * 10n ** BigInt(scale - productScale), scale);
  const divisor = 10n ** BigInt(productScale - scale);
  const absolute = product < 0n ? -product : product;
  const rounded = (absolute + divisor / 2n) / divisor;
  return fromInteger(product < 0n ? -rounded : rounded, scale);
}

export function compareDecimal(
  left: DecimalString,
  right: DecimalString,
): number {
  const scale = Math.max(scaleOf(left), scaleOf(right));
  const a = integerAtScale(left, scale);
  const b = integerAtScale(right, scale);
  return a === b ? 0 : a > b ? 1 : -1;
}

export function percentOf(
  amount: DecimalString,
  rate: DecimalString,
): DecimalString {
  return multiplyDecimal(amount, multiplyDecimal(rate, "0.01", 6), 2);
}

export function divideDecimal(left: DecimalString, right: DecimalString, scale = 2): DecimalString {
  const sourceScale = Math.max(scaleOf(left), scaleOf(right));
  const numerator = integerAtScale(left, sourceScale) * 10n ** BigInt(scale);
  const denominator = integerAtScale(right, sourceScale);
  if (denominator === 0n) throw new Error("Exchange rate must be greater than zero");
  const absolute = numerator < 0n ? -numerator : numerator;
  const divisor = denominator < 0n ? -denominator : denominator;
  const result = (absolute + divisor / 2n) / divisor;
  return fromInteger((numerator < 0n) !== (denominator < 0n) ? -result : result, scale);
}
