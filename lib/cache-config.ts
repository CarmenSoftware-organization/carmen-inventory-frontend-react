/** Shape of a cache profile — `staleTime`/`gcTime` for TanStack Query */
export type CacheProfile = {
  readonly staleTime: number;
  readonly gcTime: number;
};

/** Rarely changes: permissions, config, units */
export const CACHE_STATIC = {
  staleTime: 30 * 60 * 1000,
  gcTime: 60 * 60 * 1000,
} as const;

/** Moderate: vendor list, product catalog */
export const CACHE_NORMAL = {
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
} as const;

/** Frequently changes: PRs, POs, approvals */
export const CACHE_DYNAMIC = {
  staleTime: 1 * 60 * 1000,
  gcTime: 5 * 60 * 1000,
} as const;

