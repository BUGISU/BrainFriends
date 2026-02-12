"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  Suspense,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PlaceType } from "@/constants/trainingData";
import { VISUAL_MATCHING_PROTOCOLS } from "@/constants/visualTrainingData";
import { SessionManager } from "@/lib/kwab/SessionManager";
import { loadPatientProfile } from "@/lib/patientStorage";
import { useTraining } from "../TrainingContext";

import { AnalysisSidebar } from "@/components/training/AnalysisSidebar";
import FaceTracker from "@/components/diagnosis/FaceTracker";

export const dynamic = "force-dynamic";

// 전역 락 관리 (컴포넌트 리렌더링 시 초기화 방지용)
let GLOBAL_SPEECH_LOCK: Record<number, boolean> = {};

function Step3Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateFooter } = useTraining();
  const place = (searchParams?.get("place") as PlaceType) || "home";

  // 상태 관리
  const [isMounted, setIsMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showResult, setShowResult] = useState<boolean | null>(null);
  const [playCount, setPlayCount] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [canAnswer, setCanAnswer] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);

  // 미디어 Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFaceReady, setIsFaceReady] = useState(false);
  const [showTracking, setShowTracking] = useState(true);

  const [metrics, setMetrics] = useState({
    symmetryScore: 0,
    openingRatio: 0,
    audioLevel: 0,
    articulationScore: 0,
  });

  // 데이터 로드 및 셔플
  const protocol = useMemo(() => {
    const allQuestions = (
      VISUAL_MATCHING_PROTOCOLS[place] || VISUAL_MATCHING_PROTOCOLS.home
    ).slice(0, 10);
    return [...allQuestions].sort(() => Math.random() - 0.5);
  }, [place]);

  const currentItem = protocol[currentIndex];

  // 마운트 및 정리
  useEffect(() => {
    setIsMounted(true);
    GLOBAL_SPEECH_LOCK = {}; // 페이지 진입 시 락 초기화
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 푸터 업데이트
  useEffect(() => {
    if (!updateFooter) return;
    const correctCount = analysisResults.filter((r) => r.isCorrect).length;
    updateFooter({
      leftText: `SI: ${metrics.symmetryScore.toFixed(0)}% | ACC: ${correctCount}/${analysisResults.length}`,
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

  // 음성 출력 로직
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

  // 문제 진입 시 자동 음성 재생
  useEffect(() => {
    if (!isMounted || !currentItem || GLOBAL_SPEECH_LOCK[currentIndex]) return;
    GLOBAL_SPEECH_LOCK[currentIndex] = true;
    const timer = setTimeout(() => speakWord(currentItem.targetWord), 1000);
    return () => clearTimeout(timer);
  }, [currentIndex, isMounted, currentItem, speakWord]);

  // 정답 선택 핸들러
  const handleOptionClick = (id: string) => {
    if (!canAnswer || selectedId || isAnswered) return;
    const isCorrect = id === currentItem.answerId;

    setSelectedId(id);
    setShowResult(isCorrect);
    setIsAnswered(true);
    setCanAnswer(false);

    const currentResult = {
      text: currentItem.targetWord,
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
        setPlayCount(0);
      } else {
        finishStep(updatedResults);
      }
    }, 1500);
  };

  const finishStep = (finalResults: any[]) => {
    const avgScore = Math.round(
      (finalResults.filter((r) => r.isCorrect).length / finalResults.length) *
        100,
    );

    // 로컬 스토리지 저장
    const sess = JSON.parse(
      localStorage.getItem("kwab_training_session") || "{}",
    );
    localStorage.setItem(
      "kwab_training_session",
      JSON.stringify({
        ...sess,
        step3: { items: finalResults, score: avgScore },
      }),
    );

    // SessionManager를 통한 정교한 결과 저장
    const patient = loadPatientProfile();
    if (patient) {
      const sm = new SessionManager(
        { age: patient.age, educationYears: patient.educationYears || 0 },
        place,
      );
      sm.saveStep3Result({
        items: finalResults,
        score: avgScore,
        correctCount: finalResults.filter((r) => r.isCorrect).length,
        totalCount: finalResults.length,
        timestamp: Date.now(),
      });
    }

    router.push(`/step-4?place=${place}&step3=${avgScore}`);
  };

  const handleReplay = () => {
    if (
      playCount < 1 &&
      !selectedId &&
      !isSpeaking &&
      !isAnswered &&
      canAnswer
    ) {
      speakWord(currentItem.targetWord);
      setPlayCount((prev) => prev + 1);
    }
  };

  if (!isMounted || !currentItem) return null;

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
        <aside className="w-[380px] border-r border-gray-50 bg-white p-3 shrink-0 relative flex flex-col">
          <AnalysisSidebar
            videoRef={videoRef}
            canvasRef={canvasRef}
            isFaceReady={isFaceReady}
            metrics={metrics}
            showTracking={showTracking}
            onToggleTracking={() => setShowTracking(!showTracking)}
            scoreLabel="정답 개수"
            scoreValue={`${analysisResults.filter((r) => r.isCorrect).length} / ${currentIndex + (isAnswered ? 1 : 0)}`}
          />
        </aside>

        <main className="flex-1 bg-[#FBFBFC] overflow-y-auto px-12">
          <section className="w-full max-w-2xl mx-auto flex flex-col items-center gap-8 py-10">
            <div className="h-20 flex flex-col items-center justify-center">
              <p className="text-2xl font-black text-[#8B4513] text-center">
                {isSpeaking
                  ? "문제를 잘 들어보세요"
                  : "알맞은 그림을 찾아보세요"}
              </p>
              <div className="mt-2 h-1 w-24 bg-orange-100 rounded-full animate-pulse" />
            </div>

            <button
              onClick={handleReplay}
              disabled={
                playCount >= 1 || isSpeaking || isAnswered || !canAnswer
              }
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-xl border-4
                ${
                  playCount < 1 && !isSpeaking && !isAnswered && canAnswer
                    ? "bg-white border-orange-100 text-[#DAA520] hover:scale-110 active:scale-95"
                    : "bg-gray-100 border-transparent text-gray-300 scale-90 opacity-50"
                }`}
            >
              <span
                className={`text-4xl ${isSpeaking ? "animate-bounce" : ""}`}
              >
                {isSpeaking ? "🔊" : "👂"}
              </span>
            </button>

            <div className="grid grid-cols-3 gap-6 w-full max-w-xl pb-10">
              {currentItem.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOptionClick(option.id)}
                  disabled={isSpeaking || isAnswered || !canAnswer}
                  className={`relative aspect-square rounded-[32px] flex items-center justify-center transition-all duration-500 border-2 shadow-sm overflow-hidden bg-white
                    ${
                      selectedId === option.id
                        ? showResult
                          ? "border-emerald-500 ring-4 ring-emerald-50 scale-105 z-10"
                          : "border-red-500 opacity-60 scale-95"
                        : "border-gray-100 hover:border-orange-200 hover:shadow-md"
                    }`}
                >
                  {option.img ? (
                    <img
                      src={option.img}
                      alt=""
                      className="w-full h-full object-cover p-4"
                    />
                  ) : (
                    <span className="text-6xl">{option.emoji || "🖼️"}</span>
                  )}

                  {selectedId === option.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-sm animate-in fade-in zoom-in">
                      <span className="text-7xl">
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

      {/* 비가시적 얼굴 트래킹 엔진 */}
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

export default function Step3Page() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center font-black text-slate-300 animate-pulse">
          데이터 로드 중...
        </div>
      }
    >
      <Step3Content />
    </Suspense>
  );
}
