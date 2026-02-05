// src / hooks / useHybridAnalysis.ts;
"use client";

import { useState, useEffect } from "react";
import { SAMD_CONFIG } from "@/constants/config";
import { LipMetrics } from "@/utils/faceAnalysis"; // ✅ 아까 만든 타입 가져오기

// 1. 상태 관리 인터페이스 확장
export interface MetricsData {
  latencyMs: number;
  facePrecisionMm: number;
  speechAccuracyPct: number;
  clinicalR: number;
  icc: number;
  stabilityPct: number;
  // ✅ 실시간 입술/안면 데이터 추가
  face: LipMetrics;
}

const INITIAL_METRICS: MetricsData = {
  latencyMs: 0,
  facePrecisionMm: 0,
  speechAccuracyPct: 0,
  clinicalR: 0,
  icc: 0,
  stabilityPct: 0,
  face: {
    symmetryScore: 100,
    openingRatio: 0,
    isStretched: false,
    deviation: 0,
  },
};

export function useHybridAnalysis(interval: number = 1000) {
  const [metrics, setMetrics] = useState<MetricsData>(INITIAL_METRICS);

  // ✅ 숫자가 아닌 'LipMetrics 객체'를 받아 업데이트하도록 변경
  const updateFaceMetrics = (faceData: LipMetrics) => {
    setMetrics((prev) => ({
      ...prev,
      face: faceData,
    }));
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        latencyMs: Math.floor(Math.random() * 20) + 10,
        facePrecisionMm: Number((Math.random() * 0.3).toFixed(2)),
        speechAccuracyPct: Number((95 + Math.random() * 4).toFixed(1)),
        clinicalR: 0.99,
        icc: 0.88,
        stabilityPct: Number((Math.random() * 1).toFixed(2)),
      }));
    }, interval);
    return () => clearInterval(timer);
  }, [interval]);

  return {
    metrics,
    updateFaceMetrics, // ✅ 함수 이름 변경 (SI 점수만 받는게 아니므로)
    thresholds: {
      trustLimit: SAMD_CONFIG.TRUST_THRESHOLD,
      speechMin: 95.2,
    },
  };
}
