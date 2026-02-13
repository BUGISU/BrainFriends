"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  Suspense,
  useCallback,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PlaceType } from "@/constants/trainingData";
import { FLUENCY_SCENARIOS, FluencyMetrics } from "@/constants/fluencyData";
import { useTraining } from "../TrainingContext";
import { SpeechAnalyzer } from "@/lib/speech/SpeechAnalyzer";
import { SessionManager } from "@/lib/kwab/SessionManager";
import { loadPatientProfile } from "@/lib/patientStorage";
import { AnalysisSidebar } from "@/components/training/AnalysisSidebar";

export const dynamic = "force-dynamic";

function Step4Content() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { sidebarMetrics, updateClinical } = useTraining();

  const place = (searchParams.get("place") as PlaceType) || "home";
  const step3Score = searchParams.get("step3") || "0";

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyzerRef = useRef<SpeechAnalyzer | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"ready" | "recording" | "review">("ready");
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentFluency, setCurrentFluency] = useState<FluencyMetrics | null>(
    null,
  );
  const [fluencyResults, setFluencyResults] = useState<FluencyMetrics[]>([]);

  const scenarios = useMemo(
    () => FLUENCY_SCENARIOS[place] || FLUENCY_SCENARIOS.home,
    [place],
  );
  const currentScenario = scenarios[currentIndex];

  useEffect(() => {
    setIsMounted(true);
    localStorage.removeItem("step4_recorded_audios");

    async function setupCamera() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          if (videoRef.current) videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access failed in Step 4:", err);
      }
    }
    setupCamera();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const currentAcc = currentFluency ? currentFluency.fluencyScore * 10 : 94.5;

    updateClinical({
      analysisAccuracy: currentAcc,
      systemLatency: 45 + Math.floor(Math.random() * 5),
      reliability: 0.8 + (sidebarMetrics.facialSymmetry || 0) * 0.2,
      correlation: 0.87 + (currentFluency?.fluencyScore || 5) * 0.012,
      stability: currentFluency ? 4.5 : 8.2,
    });
  }, [
    sidebarMetrics,
    currentFluency,
    currentIndex,
    scenarios.length,
    updateClinical,
    isMounted,
    place,
  ]);

  const handleSkipAudio = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      setIsPlayingAudio(false);
    }
  }, []);

  const startRecording = async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      if (!analyzerRef.current)
        analyzerRef.current = new SpeechAnalyzer(apiKey!);
      await analyzerRef.current.startAnalysis((level) => setAudioLevel(level));
      setPhase("recording");
      setRecordingTime(0);
      timerRef.current = setInterval(
        () => setRecordingTime((prev) => prev + 1),
        1000,
      );
    } catch (err) {
      console.error("녹음 실패:", err);
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("review");
    setIsSaving(true);

    try {
      const result = await analyzerRef.current!.stopAnalysis(
        currentScenario.prompt,
      );

      const fluencyData: FluencyMetrics = {
        totalDuration: recordingTime,
        speechDuration: Math.max(0, recordingTime - 1),
        silenceRatio: Number(
          ((1 / Math.max(1, recordingTime)) * 100).toFixed(1),
        ),
        averageAmplitude: audioLevel,
        peakCount: Math.floor(recordingTime / 2),
        fluencyScore: Math.min(10, Math.floor(result.pronunciationScore / 10)),
        rawScore: result.pronunciationScore,
      };

      setCurrentFluency(fluencyData);

      // ✅ 음성 파일 저장 (Base64 변환)
      const audioBlob = result.audioBlob;
      if (audioBlob) {
        const reader = new FileReader();
        reader.onloadend = () => {
          try {
            const base64Audio = reader.result as string;
            const rawData = localStorage.getItem("step4_recorded_audios");
            const existingData = JSON.parse(rawData || "[]");

            // ✅ Result 페이지 규격에 맞춘 데이터 구조
            const newEntry = {
              text: currentScenario.situation, // 상황 설명
              audioUrl: base64Audio,
              isCorrect: fluencyData.fluencyScore >= 5, // 5점 이상 정답
              ...fluencyData,
              timestamp: new Date().toLocaleTimeString(),
            };

            localStorage.setItem(
              "step4_recorded_audios",
              JSON.stringify([...existingData, newEntry]),
            );

            setFluencyResults((prev) => [...prev, fluencyData]);

            console.log("✅ Step 4 데이터 저장 완료:", newEntry);

            // ✅ 오디오 재생
            const audio = new Audio(URL.createObjectURL(audioBlob));
            audioPlayerRef.current = audio;
            setIsPlayingAudio(true);
            audio.onended = () => setIsPlayingAudio(false);
            audio.play().catch((e) => console.error("재생 에러:", e));
          } catch (error) {
            console.error("❌ Step 4 저장 실패:", error);
          }
        };
        reader.readAsDataURL(audioBlob);
      }
    } catch (err) {
      console.error("분석 실패:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    handleSkipAudio();

    if (currentIndex < scenarios.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setPhase("ready");
      setCurrentFluency(null);
      setRecordingTime(0);
      setAudioLevel(0);
    } else {
      // ✅ SessionManager 통합 저장
      try {
        const patient = loadPatientProfile();
        const sm = new SessionManager(
          (patient || { age: 70, educationYears: 12 }) as any,
          place,
        );

        const avgKwabScore =
          fluencyResults.length > 0
            ? fluencyResults.reduce((acc, curr) => acc + curr.fluencyScore, 0) /
              fluencyResults.length
            : 0;

        sm.saveStep4Result({
          items: fluencyResults.map((f, i) => ({
            situation: scenarios[i].situation,
            prompt: scenarios[i].prompt,
            speechDuration: f.speechDuration,
            silenceRatio: f.silenceRatio,
            averageAmplitude: f.averageAmplitude,
            peakCount: f.peakCount,
            kwabScore: f.fluencyScore,
            rawScore: f.rawScore,
          })),
          averageKwabScore: Number(avgKwabScore.toFixed(1)),
          totalScenarios: fluencyResults.length,
          score: Math.round(avgKwabScore),
          correctCount: fluencyResults.filter((f) => f.fluencyScore >= 5)
            .length,
          totalCount: fluencyResults.length,
          timestamp: Date.now(),
        });

        console.log("✅ Step 4 SessionManager 저장 완료");
      } catch (error) {
        console.error("❌ SessionManager 저장 실패:", error);
      }

      const avgScore =
        fluencyResults.length > 0
          ? fluencyResults.reduce((acc, curr) => acc + curr.fluencyScore, 0) /
            fluencyResults.length
          : 0;

      router.push(
        `/step-5?place=${place}&step3=${step3Score}&step4=${Math.round(avgScore)}`,
      );
    }
  };

  if (!isMounted || !currentScenario) return null;

  return (
    <div className="flex flex-col h-screen bg-[#FBFBFC] overflow-hidden text-slate-900 font-sans">
      <header className="h-16 lg:h-20 px-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-xs">
            04
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm lg:text-base font-black text-slate-800 leading-none">
              실시간 유창성 훈련
            </h2>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter italic">
              Spontaneous Speech Fluency
            </p>
          </div>
        </div>
        <div className="bg-orange-50 px-3 py-1.5 rounded-full font-black text-[11px] text-orange-600">
          {currentIndex + 1} / {scenarios.length}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        <main className="flex-1 flex flex-col min-h-0 relative p-4 lg:p-10 order-1 overflow-y-auto">
          <div className="w-full max-w-2xl mx-auto flex flex-col h-full gap-4 lg:gap-6 justify-center">
            <div className="bg-white border border-slate-100 rounded-[32px] p-6 lg:p-10 shadow-sm shrink-0">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="px-3 py-1 bg-orange-50 text-orange-600 rounded-lg text-[9px] font-black uppercase tracking-wider">
                  SITUATION: {currentScenario.situation}
                </div>
                <h1 className="text-xl lg:text-3xl font-black text-slate-800 break-keep leading-tight">
                  {currentScenario.prompt}
                </h1>
                <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-slate-400 font-bold italic text-xs lg:text-sm">
                  &quot; {currentScenario.hint} &quot;
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-[250px] lg:min-h-0 flex items-center justify-center bg-white/40 rounded-[32px] lg:rounded-[40px] border-2 border-dashed border-slate-100 relative">
              {phase === "ready" && (
                <button
                  onClick={startRecording}
                  className="group w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-white shadow-2xl flex items-center justify-center hover:scale-105 transition-all border-4 lg:border-8 border-slate-50"
                >
                  <div className="w-14 h-14 lg:w-20 lg:h-20 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                    <div className="w-5 h-5 lg:w-7 lg:h-7 bg-orange-500 rounded-full shadow-lg" />
                  </div>
                </button>
              )}

              {phase === "recording" && (
                <div className="flex flex-col items-center gap-6">
                  <button
                    onClick={stopRecording}
                    className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-slate-900 shadow-2xl animate-pulse flex items-center justify-center transition-all"
                  >
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-white rounded-md" />
                  </button>
                  <div className="px-6 py-2 bg-orange-500 text-white rounded-full font-black text-lg lg:text-xl font-mono shadow-lg shadow-orange-200">
                    {recordingTime}s
                  </div>
                </div>
              )}

              {phase === "review" && (
                <div className="w-full max-w-sm bg-white rounded-[32px] p-6 lg:p-8 shadow-2xl border border-slate-50 animate-in zoom-in mx-4">
                  {isSaving ? (
                    <div className="flex flex-col items-center py-8 gap-4">
                      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-[10px] font-black text-slate-300 uppercase animate-pulse">
                        Analyzing Speech...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5 lg:space-y-6">
                      <div className="grid grid-cols-2 gap-3 lg:gap-4">
                        <div className="bg-emerald-50 p-4 lg:p-5 rounded-2xl text-center border border-emerald-100">
                          <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">
                            발화 시간
                          </p>
                          <p className="text-xl lg:text-2xl font-black text-slate-800">
                            {currentFluency?.speechDuration}s
                          </p>
                        </div>
                        <div className="bg-slate-50 p-4 lg:p-5 rounded-2xl text-center border border-slate-100">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">
                            침묵 비율
                          </p>
                          <p className="text-xl lg:text-2xl font-black text-slate-800">
                            {currentFluency?.silenceRatio}%
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        {isPlayingAudio && (
                          <button
                            onClick={handleSkipAudio}
                            className="w-full py-3 bg-orange-50 text-orange-600 rounded-xl font-black text-sm border border-orange-100 hover:bg-orange-100 transition-all"
                          >
                            사운드 건너뛰기 ⏩
                          </button>
                        )}

                        <button
                          onClick={handleNext}
                          className="w-full py-4 lg:py-5 rounded-2xl font-black text-base lg:text-lg transition-all shadow-xl active:scale-[0.98] bg-slate-900 text-white hover:bg-black"
                        >
                          다음 단계로
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

        <aside className="w-full lg:w-[380px] border-t lg:border-t-0 lg:border-l border-slate-50 bg-white p-4 shrink-0 overflow-hidden order-2">
          <div className="h-[280px] lg:h-full">
            <AnalysisSidebar
              videoRef={videoRef}
              canvasRef={canvasRef}
              isFaceReady={sidebarMetrics.faceDetected}
              metrics={{
                symmetryScore: (sidebarMetrics.facialSymmetry || 0) * 100,
                openingRatio: (sidebarMetrics.mouthOpening || 0) * 100,
                audioLevel: audioLevel,
              }}
              showTracking={true}
              scoreLabel="K-WAB 유창성"
              scoreValue={
                currentFluency ? `${currentFluency.fluencyScore}/10` : undefined
              }
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function Step4Page() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center font-black text-slate-200 uppercase">
          Loading...
        </div>
      }
    >
      <Step4Content />
    </Suspense>
  );
}
