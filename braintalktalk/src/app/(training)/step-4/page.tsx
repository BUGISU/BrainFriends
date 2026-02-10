"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PlaceType } from "@/constants/trainingData";
import { FLUENCY_SCENARIOS, FluencyMetrics } from "@/constants/fluencyData";
import { useTraining } from "../TrainingContext";

import { AnalysisSidebar } from "@/components/training/AnalysisSidebar";
import FaceTracker from "@/components/diagnosis/FaceTracker";

export const dynamic = "force-dynamic";

function Step4Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateFooter } = useTraining();

  const place = (searchParams.get("place") as PlaceType) || "home";
  const step3Score = searchParams.get("step3") || "0";

  // --- Refs ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- States ---
  const [isMounted, setIsMounted] = useState(false);
  const [isFaceReady, setIsFaceReady] = useState(false);
  const [showTracking, setShowTracking] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"ready" | "recording" | "review">("ready");
  const [recordingTime, setRecordingTime] = useState(0);

  const [metrics, setMetrics] = useState({
    symmetryScore: 0,
    openingRatio: 0,
    audioLevel: 0,
  });

  const [currentFluency, setCurrentFluency] = useState<FluencyMetrics | null>(
    null,
  );
  const [fluencyResults, setFluencyResults] = useState<FluencyMetrics[]>([]);

  const scenarios = useMemo(() => {
    return FLUENCY_SCENARIOS[place] || FLUENCY_SCENARIOS.home;
  }, [place]);

  const currentScenario = scenarios[currentIndex];

  useEffect(() => {
    setIsMounted(true);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (updateFooter) {
      updateFooter({
        leftText: `대칭: ${metrics.symmetryScore.toFixed(0)}% | 음성: ${metrics.audioLevel.toFixed(0)}`,
        centerText: `Step 4: 유창성 훈련 (${place.toUpperCase()})`,
        rightText: `진행: ${currentIndex + 1} / ${scenarios.length}`,
      });
    }
  }, [metrics, currentIndex, place, scenarios.length, updateFooter]);

  // --- 녹음 컨트롤러 ---
  const startRecording = () => {
    setPhase("recording");
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const mockResult: FluencyMetrics = {
      totalDuration: recordingTime,
      speechDuration: Math.max(0, recordingTime - 2),
      silenceRatio:
        recordingTime > 0 ? Number(((2 / recordingTime) * 100).toFixed(1)) : 0,
      averageAmplitude: metrics.audioLevel,
      peakCount: Math.floor(recordingTime / 2),
      fluencyScore: Math.min(10, Math.floor(recordingTime / 2) + 4),
      rawScore: 70 + Math.random() * 20,
    };
    setCurrentFluency(mockResult);
    setFluencyResults((prev) => [...prev, mockResult]);
    setPhase("review");
  };

  const handleNext = () => {
    if (currentIndex < scenarios.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setPhase("ready");
      setCurrentFluency(null);
      setRecordingTime(0);
    } else {
      const avgScore =
        fluencyResults.length > 0
          ? Math.round(
              fluencyResults.reduce((a, b) => a + b.fluencyScore, 0) /
                fluencyResults.length,
            )
          : 0;
      router.push(
        `/step-5?place=${place}&step3=${step3Score}&step4=${avgScore}`,
      );
    }
  };

  if (!isMounted || !currentScenario) return null;

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden text-black">
      {/* 1. 헤더 */}
      <header className="h-20 px-10 border-b border-gray-50 flex justify-between items-center bg-white shrink-0 z-10">
        <div className="text-left">
          <span className="text-[#DAA520] font-black text-[10px] tracking-[0.2em] uppercase">
            Step 04 • Fluency Training
          </span>
          <h2 className="text-xl font-black text-[#8B4513] tracking-tighter">
            실시간 유창성 훈련
          </h2>
        </div>
        <div className="bg-gray-50 px-5 py-2 rounded-full font-black text-sm text-gray-400">
          <span className="text-orange-500 font-mono">{currentIndex + 1}</span>{" "}
          / {scenarios.length}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 2. 사이드바 */}
        <aside className="w-[350px] lg:w-[380px] border-r border-gray-50 bg-[#ffffff] p-3 shrink-0 relative flex flex-col overflow-y-auto">
          <AnalysisSidebar
            videoRef={videoRef}
            canvasRef={canvasRef}
            isFaceReady={isFaceReady}
            metrics={metrics}
            showTracking={showTracking}
            onToggleTracking={() => setShowTracking(!showTracking)}
            scoreLabel="K-WAB 유창성 점수"
            scoreValue={
              currentFluency ? `${currentFluency.fluencyScore}/10` : undefined
            }
          />
        </aside>

        {/* 3. 메인 트레이닝 공간 (반응형 적용) */}
        <main className="flex-1 bg-[#FBFBFC] overflow-y-auto overflow-x-hidden relative">
          <div className="min-h-full w-full max-w-2xl mx-auto flex flex-col justify-between p-6 lg:p-10 gap-6">
            {/* 시나리오 카드 섹션 */}
            <div
              className={`w-full bg-white rounded-[40px] p-8 lg:p-12 shadow-[0_30px_60px_-12px,rgba(0,0,0,0.05)] border border-gray-100 text-center relative transition-all duration-500 shrink-0 ${phase === "recording" ? "ring-4 ring-red-500/5 scale-[1.01]" : ""}`}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 text-[10px] font-black text-amber-600 uppercase tracking-widest mb-6">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                상황: {currentScenario.situation}
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-gray-800 leading-snug break-keep mb-6">
                {currentScenario.prompt}
              </h1>
              <div className="bg-gray-50 rounded-2xl py-4 px-6 inline-block">
                <p className="text-gray-400 font-bold italic text-sm">
                  " {currentScenario.hint} "
                </p>
              </div>
              {phase === "recording" && (
                <div className="absolute bottom-0 left-0 h-1.5 bg-red-500 w-full animate-pulse" />
              )}
            </div>

            {/* 컨트롤 및 결과 섹션 (가운데 유동적 영역) */}
            <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[200px]">
              {phase === "ready" && (
                <button
                  onClick={startRecording}
                  disabled={!isFaceReady}
                  className="w-24 h-24 lg:w-28 lg:h-28 rounded-full bg-white border-2 border-gray-100 shadow-2xl flex items-center justify-center hover:scale-105 transition-all group disabled:opacity-50"
                >
                  <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center group-hover:bg-red-100 transition-colors">
                    <div className="w-6 h-6 bg-red-500 rounded-full shadow-lg" />
                  </div>
                </button>
              )}

              {phase === "recording" && (
                <div className="flex flex-col items-center gap-6">
                  <button
                    onClick={stopRecording}
                    className="w-24 h-24 lg:w-28 lg:h-28 rounded-full bg-gray-900 shadow-2xl flex items-center justify-center animate-pulse"
                  >
                    <div className="w-8 h-8 bg-white rounded-sm" />
                  </button>
                  <div className="px-8 py-2.5 bg-white rounded-full shadow-sm border border-red-100">
                    <span className="text-red-500 font-mono font-black text-2xl">
                      {Math.floor(recordingTime / 60)
                        .toString()
                        .padStart(2, "0")}
                      :{(recordingTime % 60).toString().padStart(2, "0")}
                    </span>
                  </div>
                </div>
              )}

              {phase === "review" && currentFluency && (
                <div className="w-full max-w-md bg-white rounded-[32px] p-6 lg:p-8 shadow-2xl border border-orange-100 animate-in fade-in zoom-in duration-500">
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono">
                        Analysis Result
                      </span>
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-lg uppercase">
                        Success
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-[20px] border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">
                          총 발화 시간
                        </p>
                        <p className="text-xl font-black text-gray-800">
                          {currentFluency.speechDuration}s
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-[20px] border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">
                          침묵 비율
                        </p>
                        <p className="text-xl font-black text-gray-800">
                          {currentFluency.silenceRatio}%
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleNext}
                      className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-[20px] font-black text-sm shadow-xl shadow-orange-100 transition-all active:scale-[0.98]"
                    >
                      {currentIndex < scenarios.length - 1
                        ? "다음 시나리오"
                        : "최종 결과 확인"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 하단 상태 텍스트 섹션 */}
            <div className="flex-none pt-4 pb-2 text-center">
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.5em] transition-all">
                {phase === "ready"
                  ? "Start Recording"
                  : phase === "recording"
                    ? "Recording..."
                    : "Review Done"}
              </p>
            </div>
          </div>
        </main>
      </div>

      <FaceTracker
        videoRef={videoRef}
        canvasRef={canvasRef}
        onReady={() => setIsFaceReady(true)}
        onMetricsUpdate={(m) =>
          setMetrics((prev) => ({
            ...prev,
            symmetryScore: m.symmetryScore,
            openingRatio: m.openingRatio * 100,
          }))
        }
      />
    </div>
  );
}

export default function Step4Page() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
            <p className="text-xs font-black text-gray-300 uppercase tracking-widest">
              Loading Fluency Engine
            </p>
          </div>
        </div>
      }
    >
      <Step4Content />
    </Suspense>
  );
}
