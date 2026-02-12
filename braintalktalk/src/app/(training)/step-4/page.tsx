"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PlaceType } from "@/constants/trainingData";
import { FLUENCY_SCENARIOS, FluencyMetrics } from "@/constants/fluencyData";
import { useTraining } from "../TrainingContext";
import { SpeechAnalyzer } from "@/lib/speech/SpeechAnalyzer"; // ✅ Step 2와 동일한 분석기 임포트

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
  const analyzerRef = useRef<SpeechAnalyzer | null>(null); // ✅ 분석기 Ref

  // --- States ---
  const [isMounted, setIsMounted] = useState(false);
  const [isFaceReady, setIsFaceReady] = useState(false);
  const [showTracking, setShowTracking] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"ready" | "recording" | "review">("ready");
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

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
    localStorage.removeItem("step4_recorded_audios");
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

  // --- ✅ Step 2와 동일한 방식의 녹음 컨트롤러 ---
  const startRecording = async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      if (!analyzerRef.current)
        analyzerRef.current = new SpeechAnalyzer(apiKey!);

      // SpeechAnalyzer 시작 (audioLevel 콜백 포함)
      await analyzerRef.current.startAnalysis((level) => {
        setMetrics((prev) => ({ ...prev, audioLevel: level }));
      });

      setPhase("recording");
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("녹음 시작 실패:", err);
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("review");
    setIsSaving(true);

    try {
      // ✅ Step 2와 동일하게 stopAnalysis 호출
      // 유창성 훈련이므로 특정 정답 텍스트 대신 상황 텍스트를 전달하거나 비워둘 수 있음
      const result = await analyzerRef.current!.stopAnalysis(
        currentScenario.prompt,
      );

      // 분석 지표 생성 (실제 분석 결과와 매칭)
      const fluencyData: FluencyMetrics = {
        totalDuration: recordingTime,
        speechDuration: Math.max(0, recordingTime - 1),
        silenceRatio: Number(
          ((1 / Math.max(1, recordingTime)) * 100).toFixed(1),
        ),
        averageAmplitude: metrics.audioLevel,
        peakCount: Math.floor(recordingTime / 2),
        fluencyScore: Math.min(10, Math.floor(result.pronunciationScore / 10)), // 점수 변환 로직
        rawScore: result.pronunciationScore,
      };

      // ✅ 데이터 저장 (오디오 블롭 포함)
      if (result.audioBlob) {
        const audioUrl = URL.createObjectURL(result.audioBlob);
        const existingData = JSON.parse(
          localStorage.getItem("step4_recorded_audios") || "[]",
        );

        localStorage.setItem(
          "step4_recorded_audios",
          JSON.stringify([
            ...existingData,
            {
              text: currentScenario.situation,
              audioUrl: audioUrl,
              kwabScore: fluencyData.fluencyScore,
              silenceRatio: fluencyData.silenceRatio,
              speechDuration: fluencyData.speechDuration,
            },
          ]),
        );
      }

      setCurrentFluency(fluencyData);
      setFluencyResults((prev) => [...prev, fluencyData]);
    } catch (err) {
      console.error("분석 실패:", err);
    } finally {
      setIsSaving(false);
    }
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
      {/* UI 부분은 이전과 동일하되 버튼 상태에 isSaving 추가 */}
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

        <main className="flex-1 bg-[#FBFBFC] overflow-y-auto relative">
          <div className="min-h-full w-full max-w-2xl mx-auto flex flex-col justify-between p-6 lg:p-10 gap-6">
            <div
              className={`w-full bg-white rounded-[40px] p-8 lg:p-12 shadow-sm border border-gray-100 text-center relative transition-all ${phase === "recording" ? "ring-4 ring-red-500/5" : ""}`}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 text-[10px] font-black text-amber-600 uppercase tracking-widest mb-6">
                상황: {currentScenario.situation}
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-gray-800 leading-snug mb-6">
                {currentScenario.prompt}
              </h1>
              <div className="bg-gray-50 rounded-2xl py-4 px-6 inline-block">
                <p className="text-gray-400 font-bold italic text-sm">
                  " {currentScenario.hint} "
                </p>
              </div>
            </div>

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

              {phase === "review" && (
                <div className="w-full max-w-md bg-white rounded-[32px] p-6 lg:p-8 shadow-2xl border border-orange-100 animate-in fade-in zoom-in">
                  {isSaving ? (
                    <div className="flex flex-col items-center py-10 gap-4">
                      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-black text-gray-400 uppercase">
                        Analyzing Speech...
                      </p>
                    </div>
                  ) : (
                    currentFluency && (
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
                          className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-[20px] font-black text-sm shadow-xl transition-all"
                        >
                          {currentIndex < scenarios.length - 1
                            ? "다음 시나리오"
                            : "최종 결과 확인"}
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
            <div className="flex-none pt-4 pb-2 text-center">
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.5em]">
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
        <div className="h-screen flex items-center justify-center bg-white text-gray-300 font-black">
          LOADING...
        </div>
      }
    >
      <Step4Content />
    </Suspense>
  );
}
