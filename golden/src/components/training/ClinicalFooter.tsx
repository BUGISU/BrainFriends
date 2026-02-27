import React from "react";
import { useTraining } from "@/app/(training)/TrainingContext";

export default function ClinicalFooter() {
  const { clinicalMetrics } = useTraining();

  return (
    <div className="h-12 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 px-6 flex items-center justify-between text-[10px] font-mono">
      {/* 시스템 지연시간 */}
      <MetricItem
        label="시스템 지연"
        value={`${clinicalMetrics.systemLatency.toFixed(1)}ms`}
        target="≤ 50ms"
        status={clinicalMetrics.systemLatency <= 50}
      />

      {/* 안면 트래킹 정밀도 */}
      <MetricItem
        label="트래킹 정밀도"
        value={`${clinicalMetrics.trackingPrecision.toFixed(2)}mm`}
        target="≤ 0.5mm"
        status={clinicalMetrics.trackingPrecision <= 0.5}
      />

      {/* 음성 분석 정확도 */}
      <MetricItem
        label="음성 분석"
        value={`${clinicalMetrics.analysisAccuracy.toFixed(1)}%`}
        target="≥ 95.2%"
        status={clinicalMetrics.analysisAccuracy >= 95.2}
      />

      {/* 임상적 상관성 */}
      <MetricItem
        label="상관성"
        value={`r ${clinicalMetrics.correlation.toFixed(2)}`}
        target="r ≥ 0.85"
        status={clinicalMetrics.correlation >= 0.85}
      />

      {/* 반복 측정 신뢰도 */}
      <MetricItem
        label="신뢰도"
        value={`ICC ${clinicalMetrics.reliability.toFixed(2)}`}
        target="≥ 0.80"
        status={clinicalMetrics.reliability >= 0.8}
      />

      {/* 분석 안정성 */}
      <MetricItem
        label="안정성"
        value={`CV ${clinicalMetrics.stability.toFixed(1)}%`}
        target="≤ 10%"
        status={clinicalMetrics.stability <= 10}
      />
    </div>
  );
}

// ============================================================================
// MetricItem 컴포넌트
// ============================================================================

interface MetricItemProps {
  label: string;
  value: string;
  target: string;
  status: boolean; // true = 목표 달성, false = 미달성
}

function MetricItem({ label, value, target, status }: MetricItemProps) {
  return (
    <div className="flex items-center gap-2">
      {/* 상태 표시 (초록색/빨간색 점) */}
      <div
        className={`w-1.5 h-1.5 rounded-full ${
          status ? "bg-green-500" : "bg-red-500"
        }`}
      />

      {/* 라벨 */}
      <span className="text-gray-500 font-semibold">{label}:</span>

      {/* 값 */}
      <span
        className={`font-black ${status ? "text-green-600" : "text-red-600"}`}
      >
        {value}
      </span>

      {/* 목표 */}
      <span className="text-gray-400 text-[9px]">({target})</span>
    </div>
  );
}
