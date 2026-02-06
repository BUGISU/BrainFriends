// src/utils/faceAnalysis.ts
// 입술 및 안면 정중선 핵심 인덱스
const LIPS = {
  TOP: 13,
  BOTTOM: 14,
  LEFT: 61,
  RIGHT: 291,
  NOSE_TIP: 6,
  CHIN: 152,
};

export interface LipMetrics {
  symmetryScore: number; // 0~100 (높을수록 대칭)
  openingRatio: number; // 입을 벌린 정도
  isStretched: boolean; // '이' 발음 여부
  deviation: number; // 좌우 치우침 (-가 왼쪽, +가 오른쪽)
}

export const calculateLipMetrics = (landmarks: any[]): LipMetrics => {
  const top = landmarks[LIPS.TOP];
  const bottom = landmarks[LIPS.BOTTOM];
  const left = landmarks[LIPS.LEFT];
  const right = landmarks[LIPS.RIGHT];
  const nose = landmarks[LIPS.NOSE_TIP];

  // 1. 수직 대칭성 (입꼬리 높낮이)
  const verticalDiff = Math.abs(left.y - right.y);
  const symmetryScore = Math.max(0, 100 - verticalDiff * 2500);

  // 2. 개구도 (상하 벌어짐)
  const openingRatio = Math.abs(bottom.y - top.y) * 500;

  // 3. 좌우 치우침 (코 정중선 기준)
  const midX = nose.x;
  const leftDist = Math.abs(midX - left.x);
  const rightDist = Math.abs(right.x - midX);
  const deviation = (rightDist - leftDist) * 100;

  return {
    symmetryScore: Math.round(symmetryScore),
    openingRatio: Number(openingRatio.toFixed(1)),
    isStretched: Math.abs(right.x - left.x) > 0.15,
    deviation: Number(deviation.toFixed(2)),
  };
};
