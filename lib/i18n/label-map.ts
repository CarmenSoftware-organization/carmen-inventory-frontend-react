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
