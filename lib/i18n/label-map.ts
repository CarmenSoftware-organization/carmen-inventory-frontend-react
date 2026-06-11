/**
 * Map an enum value to a translated label via a typed key map.
 *
 * Replaces nested-ternary patterns:
 *   value === "a" ? t("KeyA") : value === "b" ? t("KeyB") : t("KeyC")
 *
 * with:
 *   const getLabel = createLabelGetter({ a: "KeyA", b: "KeyB", c: "KeyC" }, "c");
 *   getLabel(t, value);
 *
 * The fallback is used when value is null, undefined, or not a key in the map —
 * matching the "else" branch of the original ternary.
 */
export type Translator<K extends string = string> = (key: K) => string;

export function createLabelGetter<V extends string, K extends string>(
  map: Readonly<Record<V, K>>,
  fallback: NoInfer<V>,
) {
  return (
    t: Translator<K>,
    value: V | (string & {}) | null | undefined,
  ): string => {
    const key = value != null && value in map ? (value as V) : fallback;
    return t(map[key]);
  };
}
