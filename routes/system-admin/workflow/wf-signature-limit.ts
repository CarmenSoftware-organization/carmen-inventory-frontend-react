/** จำนวนช่องเซ็นสูงสุดในรายงาน — FastReport template มี Sig1Name…Sig5Name เท่านั้น */
export const MAX_SIGNATURES = 5;

export type SignatureStageLike = { is_show_signature?: boolean };

export function countSignatureStages(stages: SignatureStageLike[]): number {
  return stages.filter((s) => s.is_show_signature === true).length;
}

/** stage ที่ติ๊กแล้วปลดได้เสมอ; ที่ยังไม่ติ๊กจะ disable เมื่อครบโควตาแล้ว */
export function isSignatureCheckboxDisabled(
  stages: SignatureStageLike[],
  index: number,
): boolean {
  if (stages[index]?.is_show_signature === true) return false;
  return countSignatureStages(stages) >= MAX_SIGNATURES;
}
