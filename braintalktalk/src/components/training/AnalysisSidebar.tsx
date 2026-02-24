"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const [localShowTracking, setLocalShowTracking] = useState(
    Boolean(showTracking),
  );
  const landmarksRef = useRef<any[]>([]);

  const isControlled = useMemo(
    () =>
      typeof showTracking === "boolean" && typeof onToggleTracking === "function",
    [showTracking, onToggleTracking],
  );

  const trackingEnabled = isControlled
    ? Boolean(showTracking)
    : localShowTracking;

  useEffect(() => {
    if (typeof showTracking === "boolean") {
      setLocalShowTracking(showTracking);
    }
  }, [showTracking]);

  useEffect(() => {
    landmarksRef.current = sidebarMetrics?.landmarks || [];
  }, [sidebarMetrics?.landmarks]);

  const handleToggleTracking = () => {
    if (typeof onToggleTracking === "function") {
      onToggleTracking();
      return;
    }
    setLocalShowTracking((prev) => !prev);
  };

  const asymmetryVisual = useMemo(() => {
    const landmarks = sidebarMetrics?.landmarks;
    if (!landmarks || landmarks.length === 0) {
      return {
        label: "안면 비대칭 분석 중",
        detail: "",
        state: "idle" as "idle" | "normal" | "warning",
      };
    }

    const lEye = landmarks[105];
    const rEye = landmarks[334];
    const lCheek = landmarks[234];
    const rCheek = landmarks[454];
    const chin = landmarks[152];
    const lMouth = landmarks[61];
    const rMouth = landmarks[291];
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];

    if (!lEye || !rEye || !lCheek || !rCheek || !chin || !lMouth || !rMouth || !upperLip || !lowerLip) {
      return {
        label: "안면 비대칭 분석 중",
        detail: "",
        state: "idle" as "idle" | "normal" | "warning",
      };
    }

    // 1) 정중선 대비 입 중심 편위(핵심)
    const midTop = { x: (lEye.x + rEye.x) / 2, y: (lEye.y + rEye.y) / 2 };
    const midBottom = { x: chin.x, y: chin.y };
    const mouthCenter = {
      x: (lMouth.x + rMouth.x + upperLip.x + lowerLip.x) / 4,
      y: (lMouth.y + rMouth.y + upperLip.y + lowerLip.y) / 4,
    };
    const faceWidth = Math.max(0.001, Math.abs(rCheek.x - lCheek.x));

    const dx = midBottom.x - midTop.x;
    const dy = midBottom.y - midTop.y;
    const norm = Math.hypot(dx, dy) || 1;
    const signedDist =
      ((mouthCenter.x - midTop.x) * dy - (mouthCenter.y - midTop.y) * dx) / norm;
    const deviationPct = (Math.abs(signedDist) / faceWidth) * 100;
    const shiftSide = signedDist > 0 ? "좌측 편위" : "우측 편위";

    // 2) 보조: 입선 기울기
    const lowerTiltPct = (Math.abs(rMouth.y - lMouth.y) / faceWidth) * 100;

    const isShifted = deviationPct >= 2.0; // 얼굴폭 대비 2% 이상이면 유의 편위
    const isTilted = lowerTiltPct >= 1.2;

    if (!isShifted && !isTilted) {
      return {
        label: "정상적인 얼굴형",
        detail: `중심선 편위 ${deviationPct.toFixed(1)}%`,
        state: "normal" as const,
      };
    }

    if (isShifted && !isTilted) {
      return {
        label: "입 중심선 편위",
        detail: `${shiftSide} · ${deviationPct.toFixed(1)}%`,
        state: "warning" as const,
      };
    }

    if (!isShifted && isTilted) {
      return {
        label: "하악 회전 경향",
        detail: `입선 기울기 ${lowerTiltPct.toFixed(1)}%`,
        state: "warning" as const,
      };
    }

    return {
      label: "편위 + 하악 회전 동반",
      detail: `${shiftSide} ${deviationPct.toFixed(1)}% / 기울기 ${lowerTiltPct.toFixed(1)}%`,
      state: "warning" as const,
    };
  }, [sidebarMetrics?.landmarks]);

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

  // ✅ 실시간 드로잉 로직: 안면 비대칭 측정용 3개 선만 표시
  useEffect(() => {
    if (!canvasRef || !canvasRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas || !trackingEnabled) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;

    const draw = () => {
      const landmarks = landmarksRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (landmarks && landmarks.length > 0) {
        const toPoint = (idx: number) => ({
          x: landmarks[idx].x * canvas.width,
          y: landmarks[idx].y * canvas.height,
        });

        // 안면 비대칭 가이드: 세로/가로 점선 (눈썹 기준)
        const leftCheek = landmarks[234];
        const rightCheek = landmarks[454];
        const leftBrow = landmarks[105];
        const rightBrow = landmarks[334];
        const noseTip = landmarks[1];
        const leftMouth = landmarks[61];
        const rightMouth = landmarks[291];
        const chin = landmarks[152];
        const leftJaw = landmarks[136] || landmarks[172];
        const rightJaw = landmarks[365] || landmarks[397];

        if (
          leftCheek &&
          rightCheek &&
          leftBrow &&
          rightBrow &&
          noseTip &&
          leftMouth &&
          rightMouth &&
          chin &&
          leftJaw &&
          rightJaw
        ) {
          const lCheek = toPoint(234);
          const rCheek = toPoint(454);
          const lEye = toPoint(105);
          const rEye = toPoint(334);
          const n = toPoint(1);
          const lM = toPoint(61);
          const rM = toPoint(291);
          const c = toPoint(152);
          let lJ = {
            x: leftJaw.x * canvas.width,
            y: leftJaw.y * canvas.height,
          };
          let rJ = {
            x: rightJaw.x * canvas.width,
            y: rightJaw.y * canvas.height,
          };

          const eyeCenter = {
            x: (lEye.x + rEye.x) / 2,
            y: (lEye.y + rEye.y) / 2,
          };
          const mouthCenter = { x: (lM.x + rM.x) / 2, y: (lM.y + rM.y) / 2 };
          const midX = (lCheek.x + rCheek.x) / 2;
          const eyeY = eyeCenter.y;
          const noseY = n.y;
          const mouthY = mouthCenter.y;
          const jawMinY = mouthY + (c.y - mouthY) * 0.72;

          // 턱선이 입선에 붙지 않도록 하부 높이 보정
          if (lJ.y < jawMinY) lJ = { ...lJ, y: jawMinY };
          if (rJ.y < jawMinY) rJ = { ...rJ, y: jawMinY };

          const pad = 6;
          const startX = lCheek.x + pad;
          const endX = rCheek.x - pad;

          ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
          ctx.lineWidth = 0.65;

          // 세로 점선(정중선)
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(midX, eyeY - 14);
          ctx.lineTo(midX, c.y + 8);
          ctx.stroke();

          // 가로 점선 3개
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          // 눈선
          ctx.moveTo(startX, eyeY);
          ctx.lineTo(endX, eyeY);
          // 코선
          ctx.moveTo(startX, noseY);
          ctx.lineTo(endX, noseY);
          // 입선
          ctx.moveTo(startX, mouthY);
          ctx.lineTo(endX, mouthY);
          ctx.stroke();

          // 턱 기준선(하악선)
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(lJ.x, lJ.y);
          ctx.lineTo(rJ.x, rJ.y);
          ctx.stroke();

          // 하강 방향 시각화 화살표
          const mouthDiff = lM.y - rM.y;
          if (Math.abs(mouthDiff) > 3) {
            const target = mouthDiff > 0 ? lM : rM; // 더 아래쪽 입꼬리
            const dir = mouthDiff > 0 ? -1 : 1;
            const startX = target.x + dir * 16;
            const startY = target.y - 10;
            const endX = target.x + dir * 4;
            const endY = target.y + 6;

            ctx.strokeStyle = "rgba(253, 224, 71, 0.98)";
            ctx.fillStyle = "rgba(253, 224, 71, 0.98)";
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(target.x + dir * 10, target.y - 2, endX, endY);
            ctx.stroke();

            // arrow head
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX - dir * 3, endY - 1.8);
            ctx.lineTo(endX - dir * 0.8, endY - 4.2);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
      rafId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [trackingEnabled, canvasRef]);

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
            trackingEnabled ? "opacity-100" : "opacity-0"
          }`}
        />

        {!isFaceReady && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-black tracking-widest z-[5]">
            AI INITIALIZING...
          </div>
        )}

        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={handleToggleTracking}
            className={`w-9 h-9 flex items-center justify-center rounded-xl backdrop-blur-md transition-all ${
              trackingEnabled
                ? "bg-orange-500 text-white"
                : "bg-black/40 text-gray-400"
            }`}
          >
            {trackingEnabled ? (
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

        <div className="absolute top-3 left-3 z-10">
          <div
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black border backdrop-blur-sm ${
              asymmetryVisual.state === "normal"
                ? "bg-emerald-500/85 border-emerald-300 text-white"
                : asymmetryVisual.state === "warning"
                  ? "bg-amber-500/90 border-amber-200 text-slate-900"
                  : "bg-black/40 border-white/30 text-white"
            }`}
          >
            {asymmetryVisual.label}
            {asymmetryVisual.detail ? ` · ${asymmetryVisual.detail}` : ""}
          </div>
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
