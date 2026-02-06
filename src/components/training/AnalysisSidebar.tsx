"use client";
import React from "react";

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isFaceReady: boolean;
  metrics: { symmetryScore: number; openingRatio: number };
  audioLevel: number;
  scoreLabel?: string;
  scoreValue?: string;
}

export const AnalysisSidebar = ({
  videoRef,
  isFaceReady,
  metrics,
  audioLevel,
  scoreLabel = "현재 점수",
  scoreValue,
}: Props) => {
  return (
    <div className="w-64 flex flex-col gap-3">
      {/* 카메라 프리뷰 */}
      <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3] shadow-inner">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover -scale-x-100"
        />
        {!isFaceReady && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-bold animate-pulse">
            CAMERA LOADING...
          </div>
        )}
      </div>

      {/* 실시간 분석 지표 (이미지 디자인 반영) */}
      <div className="bg-[#F8F9FA] rounded-2xl p-4 space-y-3">
        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center border-b border-gray-100 pb-2">
          실시간 분석
        </h4>
        <MetricBar
          label="대칭지수"
          value={metrics.symmetryScore}
          max={100}
          unit="%"
          color="bg-emerald-500"
        />
        <MetricBar
          label="개구도"
          value={metrics.openingRatio}
          max={2.0}
          unit=""
          color="bg-amber-400"
        />
        <MetricBar
          label="음성 레벨"
          value={audioLevel}
          max={100}
          unit="dB"
          color="bg-blue-500"
        />
      </div>

      {/* 점수판 */}
      {scoreValue && (
        <div className="bg-amber-50 rounded-2xl p-4 text-center border border-amber-100">
          <p className="text-[10px] text-amber-600 font-black uppercase tracking-tighter mb-1">
            {scoreLabel}
          </p>
          <p className="text-3xl font-black text-amber-800 tracking-tighter">
            {scoreValue}
          </p>
        </div>
      )}
    </div>
  );
};

const MetricBar = ({ label, value, max, unit, color }: any) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[9px] font-bold text-gray-500 uppercase">
      <span>{label}</span>
      <span>
        {value.toFixed(1)}
        {unit}
      </span>
    </div>
    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} transition-all duration-300`}
        style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
      />
    </div>
  </div>
);
