"use client";
import React from "react";

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isFaceReady: boolean;
  metrics: {
    symmetryScore: number;
    openingRatio: number;
    audioLevel?: number;
  };
  showTracking: boolean; // ✅ 트래킹 표시 여부
  onToggleTracking: () => void; // ✅ 토글 함수
  scoreLabel?: string;
  scoreValue?: string | number;
}

export const AnalysisSidebar = ({
  videoRef,
  canvasRef,
  isFaceReady,
  metrics,
  showTracking,
  onToggleTracking,
  scoreLabel,
  scoreValue,
}: Props) => {
  return (
    <div className="w-full flex flex-col gap-4">
      {/* 🔴 카메라 프리뷰 컨테이너 */}
      <div className="relative aspect-[4/3] bg-gray-900 rounded-[32px] overflow-hidden shadow-inner border border-gray-100 group">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover -scale-x-100"
        />
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-cover -scale-x-100 pointer-events-none z-10 transition-opacity duration-500 ${
            showTracking ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* ✅ 우측 상단 토글 버튼 */}
        {isFaceReady && (
          <button
            onClick={onToggleTracking}
            className={`absolute top-4 right-4 z-30 p-2.5 rounded-2xl backdrop-blur-md transition-all duration-300 border ${
              showTracking
                ? "bg-orange-500/80 border-orange-400 text-white shadow-lg"
                : "bg-black/40 border-white/10 text-white/60 hover:bg-black/60"
            }`}
          >
            {showTracking ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9.88 9.88L12 12m.12 4.12l1.1 1.1M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7zM21.25 18L3 3m15 15l-3-3m-6.12-6.12L8 8" />
              </svg>
            )}
          </button>
        )}

        {!isFaceReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm text-white z-20">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-3" />
            <span className="text-[10px] font-black tracking-[0.2em] animate-pulse uppercase">
              Initializing AI...
            </span>
          </div>
        )}

        {isFaceReady && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <div
              className={`w-1.5 h-1.5 rounded-full animate-pulse ${showTracking ? "bg-emerald-400" : "bg-gray-400"}`}
            />
            <span className="text-[9px] font-black text-white uppercase tracking-widest">
              {showTracking ? "Live Tracking" : "Sensor Only"}
            </span>
          </div>
        )}
      </div>

      {/* 🟢 실시간 지표 */}
      <div className="bg-[#FBFBFC] rounded-[32px] p-6 space-y-5 border border-gray-50">
        <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] text-center border-b border-gray-50 pb-3">
          Face & Mouth Status
        </h4>
        <MetricBar
          label="안면 대칭성"
          value={metrics.symmetryScore}
          unit="%"
          color="bg-emerald-400"
        />
        <MetricBar
          label="구강 개구도"
          value={metrics.openingRatio}
          unit="%"
          color="bg-amber-400"
        />
      </div>
    </div>
  );
};

const MetricBar = ({ label, value, unit, color }: any) => (
  <div className="space-y-1.5">
    <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-tight">
      <span>{label}</span>
      <span className="text-gray-600 font-mono">
        {Number(value || 0).toFixed(1)}
        {unit}
      </span>
    </div>
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} transition-all duration-500`}
        style={{ width: `${Math.min(value || 0, 100)}%` }}
      />
    </div>
  </div>
);
