export const MAX_SIGNATURES = 5;

export type SignatureStageLike = { is_show_signature?: boolean };

export function countSignatureStages(stages: SignatureStageLike[]): number {
  return stages.filter((s) => s.is_show_signature === true).length;
}

export function isSignatureCheckboxDisabled(
  stages: SignatureStageLike[],
  index: number,
): boolean {
  if (stages[index]?.is_show_signature === true) return false;
  return countSignatureStages(stages) >= MAX_SIGNATURES;
}
