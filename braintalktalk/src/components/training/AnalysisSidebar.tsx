"use client";
import React from "react";

export const AnalysisSidebar = ({
  videoRef,
  canvasRef,
  isFaceReady,
  metrics,
  showTracking,
  onToggleTracking,
}: any) => {
  return (
    // 전체 높이를 부모에 맞추고 내부 요소 간격을 최적화 (gap-3)
    <div className="w-full h-full flex flex-col gap-3 overflow-hidden">
      {/* 카메라 프리뷰 섹션 - 크기를 살짝 줄임 */}
      <div className="relative aspect-[4/3] bg-gray-900 rounded-[24px] overflow-hidden shrink-0">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover -scale-x-100"
        />
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full -scale-x-100 transition-opacity duration-300 ${
            showTracking ? "opacity-100" : "opacity-0"
          }`}
        />
        {!isFaceReady && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-black tracking-widest">
            AI INITIALIZING...
          </div>
        )}
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={onToggleTracking}
            className={`w-9 h-9 flex items-center justify-center rounded-xl backdrop-blur-md transition-all ${
              showTracking
                ? "bg-[#DAA520]/90 text-white"
                : "bg-black/40 text-gray-400"
            }`}
          >
            {showTracking ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
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
                width="16"
                height="16"
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
        </div>
      </div>

      {/* 지표 영역 - 패딩과 간격을 조정하여 하단이 잘리지 않게 함 */}
      <div className="flex-1 bg-[#FBFBFC] rounded-[24px] p-5 space-y-4 border border-gray-50 shadow-sm overflow-y-auto min-h-0">
        <MetricBar
          label="안면 대칭성"
          value={metrics.symmetryScore}
          color="bg-emerald-400"
        />
        <MetricBar
          label="구강 개구도"
          value={metrics.openingRatio}
          color="bg-amber-400"
        />

        <div className="pt-3 border-t border-gray-100 space-y-4">
          <MetricBar
            label="자음 정확도"
            value={metrics.consonantAcc}
            color="bg-blue-500"
          />
          <MetricBar
            label="모음 정확도"
            value={metrics.vowelAcc}
            color="bg-purple-500"
          />
        </div>

        {/* ✅ 오디오 레벨 - 확실히 보이도록 배치 */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase mb-2 tracking-tighter">
            <span>Audio Level</span>
            <span className="text-orange-500 font-mono">
              {Math.round(metrics.audioLevel)} dB
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-400 transition-all duration-75"
              style={{ width: `${Math.min(100, metrics.audioLevel)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricBar = ({ label, value, color }: any) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-tighter">
      <span>{label}</span>
      <span className="text-gray-600 font-mono">
        {Number(value || 0).toFixed(1)}%
      </span>
    </div>
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} transition-all duration-300`}
        style={{ width: `${Math.min(Number(value || 0), 100)}%` }}
      />
    </div>
  </div>
);
