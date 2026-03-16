// src/constants/config.ts

export const SAMD_CONFIG = {
  /** 단일 분석 신뢰도 임계값 (85%) */
  TRUST_THRESHOLD: 0.85,
  /** 하이브리드 분석 시 음성 데이터 가중치 (60%) */
  VOICE_WEIGHT: 0.6,
  /** 하이브리드 분석 시 안면 데이터 가중치 (40%) */
  FACE_WEIGHT: 0.4,
} as const;

/** * 시스템 성능 모니터링을 위한 임계값 (Target)
 * 이 수치를 벗어나면 대시보드에서 경고(WARN)를 표시합니다.
 */
export const METRIC_TARGETS = {
  latency: 50, // Latency ≤ 50ms
  face: 0.5, // Face ≤ 0.5mm
  speech: 95.2, // Speech ≥ 95.2%
  rValue: 0.98, // r ≥ 0.98
  icc: 0.82, // ICC ≥ 0.82
  stability: 1.18, // Stability ≤ 1.18%
} as const;
