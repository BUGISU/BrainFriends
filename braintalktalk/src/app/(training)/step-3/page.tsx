"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  Suspense,
  use,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { VISUAL_MATCHING_PROTOCOLS, PlaceType } from "@/constants/trainingData";
import { SessionManager } from "@/lib/kwab/SessionManager";
import { loadPatientProfile } from "@/lib/patientStorage";
import { useTraining } from "../TrainingContext";

import { AnalysisSidebar } from "@/components/training/AnalysisSidebar";
import FaceTracker from "@/components/diagnosis/FaceTracker";

export const dynamic = "force-dynamic";

let GLOBAL_SPEECH_LOCK: Record<number, boolean> = {};

function Step3Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateFooter } = useTraining();
  const place = (searchParams?.get("place") as PlaceType) || "home";

  const [isMounted, setIsMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showResult, setShowResult] = useState<boolean | null>(null);
  const [playCount, setPlayCount] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [canAnswer, setCanAnswer] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFaceReady, setIsFaceReady] = useState(false);

  const [showTracking, setShowTracking] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [metrics, setMetrics] = useState({
    symmetryScore: 0,
    openingRatio: 0,
    audioLevel: 0,
    articulationScore: 0,
  });

  const protocol = useMemo(() => {
    const allQuestions = (
      VISUAL_MATCHING_PROTOCOLS[place] || VISUAL_MATCHING_PROTOCOLS.home
    ).slice(0, 10);
    return [...allQuestions].sort(() => Math.random() - 0.5);
  }, [place]);

  const currentItem = protocol[currentIndex];

  useEffect(() => {
    const correctCount = analysisResults.filter((r) => r.isCorrect).length;
    updateFooter({
      leftText: `SI: ${(metrics.symmetryScore / 100).toFixed(2)} | ACC: ${correctCount}/${analysisResults.length}`,
      centerText: `Step 3: 단어-그림 매칭 (${place.toUpperCase()})`,
      rightText: `Q: ${currentIndex + 1}/${protocol.length}`,
    });
  }, [
    metrics.symmetryScore,
    analysisResults,
    currentIndex,
    place,
    updateFooter,
    protocol.length,
  ]);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakWord = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    setCanAnswer(false);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 0.9;
    utterance.onend = () => {
      setIsSpeaking(false);
      setCanAnswer(true);
    };
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    if (!isMounted || !currentItem || GLOBAL_SPEECH_LOCK[currentIndex]) return;
    GLOBAL_SPEECH_LOCK[currentIndex] = true;
    setTimeout(() => speakWord(currentItem.targetWord), 1000);
  }, [currentIndex, isMounted, currentItem, speakWord]);

  const handleOptionClick = (id: string) => {
    if (!canAnswer || selectedId || isAnswered) return;
    const isCorrect = id === currentItem.answerId;

    setSelectedId(id);
    setShowResult(isCorrect);
    setIsAnswered(true);
    setCanAnswer(false);

    const currentResult = {
      question: currentItem.targetWord,
      isCorrect,
      selectedId: id,
      answerId: currentItem.answerId,
      symmetryScore: metrics.symmetryScore,
    };

    const updatedResults = [...analysisResults, currentResult];
    setAnalysisResults(updatedResults);

    setTimeout(() => {
      if (currentIndex < protocol.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedId(null);
        setShowResult(null);
        setIsAnswered(false);
      } else {
        saveStep3Results(updatedResults);
        router.push(`/step-4?place=${place}`);
      }
    }, 1500);
  };

  const saveStep3Results = (finalResults: any[]) => {
    const patient = loadPatientProfile();
    if (!patient) return;

    const sessionManager = new SessionManager(
      { age: patient.age, educationYears: patient.educationYears || 0 },
      place,
    );

    const correctCount = finalResults.filter((r) => r.isCorrect).length;

    sessionManager.saveStep3Result({
      items: finalResults,
      score: Math.round((correctCount / finalResults.length) * 100),
      correctCount,
      totalCount: finalResults.length,
      timestamp: Date.now(),
    });
  };

  const handleReplay = () => {
    if (playCount < 1 && !selectedId && !isSpeaking && !isAnswered) {
      speakWord(currentItem.targetWord);
      setPlayCount((prev) => prev + 1);
    }
  };

  if (!isMounted || !currentItem) return null;

  const correctNow = analysisResults.filter((r) => r.isCorrect).length;

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden text-black">
      <header className="px-10 py-6 border-b border-gray-50 flex justify-between items-center bg-white shrink-0">
        <div className="text-left">
          <span className="text-[#DAA520] font-black text-[11px] tracking-[0.2em] uppercase">
            Step 03 • {place.toUpperCase()}
          </span>
          <h2 className="text-2xl font-black text-[#8B4513] tracking-tighter">
            단어-그림 매칭
          </h2>
        </div>
        <div className="bg-gray-50 px-5 py-2 rounded-full font-black text-sm text-gray-400">
          <span className="text-orange-500">{currentIndex + 1}</span> /{" "}
          {protocol.length}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[380px] border-r border-gray-50 bg-white p-3 shrink-0 relative">
          {/* ✅ 1. AnalysisSidebar: 토글 함수 및 상태 전달 */}
          <AnalysisSidebar
            videoRef={videoRef}
            canvasRef={canvasRef} // ✅ 추가
            isFaceReady={isFaceReady}
            metrics={metrics}
            showTracking={showTracking} // ✅ 추가
            onToggleTracking={() => setShowTracking(!showTracking)} // ✅ 추가
            scoreLabel="정답 개수"
            scoreValue={`${correctNow} / ${currentIndex + 1}`}
          />

          {/* ✅ 2. FaceTracker: 캔버스 Ref 전달 (드로잉 엔진 작동용) */}
          <FaceTracker
            videoRef={videoRef}
            canvasRef={canvasRef} // ✅ 캔버스 연결
            showPreview={false}
            maxFps={30}
            onReady={() => setIsFaceReady(true)}
            onMetricsUpdate={(m) =>
              setMetrics((prev) => ({
                ...prev,
                symmetryScore: m.symmetryScore,
                openingRatio: m.openingRatio * 100,
                audioLevel: (m as any).audioLevel ?? prev.audioLevel,
                articulationScore:
                  (m as any).articulationScore ?? prev.articulationScore,
              }))
            }
          />
        </aside>

        <main className="flex-1 bg-white overflow-y-auto px-12">
          <section className="w-full max-w-2xl mx-auto flex flex-col items-center gap-8 py-4">
            <div className="h-20 flex items-center justify-center">
              <p className="text-3xl font-black text-[#8B4513]/40 uppercase tracking-[0.3em] text-center">
                {isSpeaking
                  ? "문제를 잘 들어보세요"
                  : "알맞은 그림을 찾아보세요"}
              </p>
            </div>

            <button
              onClick={handleReplay}
              disabled={
                playCount >= 1 || isSpeaking || isAnswered || !canAnswer
              }
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl border-b-4
                ${
                  playCount < 1 && !isSpeaking && !isAnswered && canAnswer
                    ? "bg-white text-[#DAA520] border-gray-100 hover:scale-105 active:scale-95"
                    : "bg-gray-50 text-gray-300 border-transparent scale-90"
                }`}
            >
              <span className={`text-3xl ${isSpeaking ? "animate-pulse" : ""}`}>
                🔊
              </span>
            </button>

            <div className="grid grid-cols-3 gap-4 w-full max-w-lg shrink-0 pb-8">
              {currentItem.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOptionClick(option.id)}
                  disabled={isSpeaking || isAnswered || !canAnswer}
                  className={`relative aspect-square rounded-[24px] flex items-center justify-center transition-all duration-300 border-2 shadow-sm overflow-hidden bg-[#FBFBFC]
                    ${
                      selectedId === option.id
                        ? showResult
                          ? "border-emerald-500 scale-105 z-10"
                          : "border-red-500 scale-95 opacity-50"
                        : "border-gray-100 hover:border-[#DAA520]/40"
                    }`}
                >
                  {option.img ? (
                    <img
                      src={option.img}
                      alt=""
                      className="w-full h-full object-cover p-3"
                    />
                  ) : (
                    <span className="text-5xl">{option.emoji || "🖼️"}</span>
                  )}

                  {selectedId === option.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-sm">
                      <span className="text-6xl">
                        {showResult ? "⭕" : "❌"}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default function Step3Page() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <Step3Content />
    </Suspense>
  );
}
