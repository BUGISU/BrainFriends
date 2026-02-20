"use client";
import React, { useEffect } from "react";
import { useTraining } from "../../app/(training)/TrainingContext";

export const AnalysisSidebar = ({
  videoRef,
  canvasRef,
  isFaceReady,
  metrics,
  showTracking,
  onToggleTracking,
}: any) => {
  const { sidebarMetrics } = useTraining(); // 전역 좌표 데이터 가져오기

  // ✅ [수정] 카메라 스트림 직접 연결 로직
  // layout.tsx의 엔진과는 별개로, 현재 화면의 video 태그에 스트림을 꽂아줍니다.
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        if (
          navigator.mediaDevices &&
          navigator.mediaDevices.getUserMedia &&
          videoRef.current
        ) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false,
          });

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            // 일부 브라우저 대응: 저전력 모드 등에서 play() 호출 필요
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().catch(console.error);
            };
          }
        }
      } catch (err) {
        console.error("사이드바 카메라 스트림 연결 실패:", err);
      }
    }

    startCamera();

    // Cleanup: 컴포넌트 종료 시 카메라 자원 해제
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [videoRef]);

  // ✅ 실시간 드로잉 로직 (색상 연하게, 점 크기 작게 수정)
  // ✅ 실시간 드로잉 로직 (세련된 화이트 도트 스타일)
  useEffect(() => {
    if (!canvasRef || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const landmarks = sidebarMetrics?.landmarks;

    if (!canvas || !landmarks || !showTracking) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (landmarks && landmarks.length > 0) {
        // ✅ 1. 점의 스타일 설정
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)"; // 80% 불투명한 흰색

        // ✅ 2. 배경이 밝을 때를 대비한 미세한 그림자 효과 (가독성 확보)
        ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
        ctx.shadowBlur = 2;

        landmarks.forEach((pt: any) => {
          ctx.beginPath();
          // ✅ 3. 크기를 0.7로 더 줄여서 훨씬 세밀하게 표현
          ctx.arc(
            pt.x * canvas.width,
            pt.y * canvas.height,
            0.7,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        });

        // 다음 드로잉을 위해 그림자 효과 초기화
        ctx.shadowBlur = 0;
      }
      rafId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [sidebarMetrics.landmarks, showTracking, canvasRef]);

  return (
    <div className="w-full flex flex-col gap-3 lg:h-full overflow-visible lg:overflow-hidden">
      {/* 카메라 프리뷰 섹션 */}
      <div className="relative aspect-[4/3] bg-gray-900 rounded-[24px] overflow-hidden shrink-0 shadow-inner">
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
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-black tracking-widest z-[5]">
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

      <div className="lg:hidden rounded-[14px] border border-gray-100 bg-[#FBFBFC] px-3 py-2">
        <div className="flex items-center justify-between text-[11px] font-black text-slate-500 whitespace-nowrap overflow-x-auto gap-4">
          <span>
            안면대칭성{" "}
            <b className="text-emerald-600">
              {Number(metrics.symmetryScore || 0).toFixed(1)}%
            </b>
          </span>
          <span>
            구강개구도{" "}
            <b className="text-orange-500">
              {Number(metrics.openingRatio || 0).toFixed(1)}%
            </b>
          </span>
          <span>
            자음{" "}
            <b className="text-emerald-600">
              {Number(metrics.consonantAcc || 0).toFixed(1)}%
            </b>
          </span>
          <span>
            모음{" "}
            <b className="text-orange-500">
              {Number(metrics.vowelAcc || 0).toFixed(1)}%
            </b>
          </span>
          <span>
            음성{" "}
            <b className="text-orange-500">
              {Math.round(Number(metrics.audioLevel || 0))}dB
            </b>
          </span>
        </div>
      </div>

      <div className="hidden lg:block flex-1 bg-[#FBFBFC] rounded-[24px] p-5 space-y-4 border border-gray-50 shadow-sm overflow-y-auto min-h-0">
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
