"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PlaceType } from "@/constants/trainingData";
import { useTraining } from "../TrainingContext";

// ✅ 공통 컴포넌트 임포트
import { AnalysisSidebar } from "@/components/training/AnalysisSidebar";
import FaceTracker from "@/components/diagnosis/FaceTracker";

export const dynamic = "force-dynamic";

// ============================================
// 1. 읽기 데이터 (Step 5 전용)
// ============================================
const READING_TEXTS: Record<
  PlaceType,
  Array<{ id: number; title: string; text: string; wordCount: number }>
> = {
  home: [
    {
      id: 1,
      title: "아침 일과",
      text: "아침에 일어나면 세수를 하고 이를 닦습니다. 그리고 맛있는 아침 밥을 먹습니다.",
      wordCount: 15,
    },
  ],
  hospital: [
    {
      id: 1,
      title: "진료 받기",
      text: "병원에 도착하면 먼저 접수를 합니다. 번호표를 받고 대기실에서 기다립니다.",
      wordCount: 12,
    },
  ],
  cafe: [
    {
      id: 1,
      title: "커피 주문",
      text: "카페에 가서 따뜻한 커피를 주문합니다. 잠시 기다리면 음료가 나옵니다.",
      wordCount: 12,
    },
  ],
  bank: [
    {
      id: 1,
      title: "은행 가기",
      text: "은행에 가서 통장을 만듭니다. 신분증을 꼭 가져가야 합니다.",
      wordCount: 10,
    },
  ],
  park: [
    {
      id: 1,
      title: "공원 산책",
      text: "공원에서 산책을 합니다. 나무와 꽃이 많아서 기분이 좋습니다.",
      wordCount: 11,
    },
  ],
  mart: [
    {
      id: 1,
      title: "장보기",
      text: "마트에서 과일과 채소를 삽니다. 카트에 담아서 계산대로 갑니다.",
      wordCount: 10,
    },
  ],
};

interface ReadingMetrics {
  totalTime: number;
  wordsPerMinute: number;
  pauseCount: number;
  readingScore: number;
}

function Step5Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateFooter } = useTraining();

  const place = (searchParams.get("place") as PlaceType) || "home";
  const step4Score = searchParams.get("step4") || "0";

  // --- Refs ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // ✅ 캔버스 Ref 추가
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- 상태 관리 ---
  const [isMounted, setIsMounted] = useState(false);
  const [isFaceReady, setIsFaceReady] = useState(false);
  const [showTracking, setShowTracking] = useState(true); // ✅ 트래킹 ON/OFF 상태 추가
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"ready" | "reading" | "review">("ready");
  const [readingTime, setRecordingTime] = useState(0);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const [metrics, setMetrics] = useState({
    symmetryScore: 0,
    openingRatio: 0,
    audioLevel: 0,
  });
  const [currentResult, setCurrentResult] = useState<ReadingMetrics | null>(
    null,
  );
  const [results, setResults] = useState<ReadingMetrics[]>([]);

  const texts = useMemo(
    () => READING_TEXTS[place] || READING_TEXTS.home,
    [place],
  );
  const currentItem = texts[currentIndex];
  const words = currentItem.text.split(" ");

  useEffect(() => {
    setIsMounted(true);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (updateFooter) {
      updateFooter({
        leftText: `SI: ${metrics.symmetryScore.toFixed(0)}% | VOL: ${metrics.audioLevel.toFixed(0)}`,
        centerText: `Step 5: 읽기 학습 (${place.toUpperCase()})`,
        rightText: `Q: ${currentIndex + 1} / ${texts.length}`,
      });
    }
  }, [metrics, currentIndex, place, texts.length, updateFooter]);

  // --- 읽기 로직 ---
  const startReading = () => {
    setPhase("reading");
    setRecordingTime(0);
    setHighlightIndex(0);

    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    const interval = setInterval(() => {
      setHighlightIndex((prev) => {
        if (prev < words.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 800);
  };

  const stopReading = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const wpm = Math.round(
      (currentItem.wordCount / Math.max(1, readingTime)) * 60,
    );
    const score = Math.max(60, 100 - Math.abs(120 - wpm) * 0.5);
    const res: ReadingMetrics = {
      totalTime: readingTime,
      wordsPerMinute: wpm,
      pauseCount: Math.floor(readingTime / 5),
      readingScore: Math.round(score),
    };
    setCurrentResult(res);
    setResults((prev) => [...prev, res]);
    setPhase("review");
  };

  const handleNext = () => {
    if (currentIndex < texts.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setPhase("ready");
      setCurrentResult(null);
      setHighlightIndex(-1);
    } else {
      const avg =
        results.length > 0
          ? Math.round(
              results.reduce((s, r) => s + r.readingScore, 0) / results.length,
            )
          : 0;
      router.push(`/step-6?place=${place}&step4=${step4Score}&step5=${avg}`);
    }
  };

  if (!isMounted || !currentItem) return null;

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden text-black font-sans">
      {/* 1. 헤더 (반응형 높이) */}
      <header className="h-20 px-10 border-b border-gray-50 flex justify-between items-center bg-white shrink-0 z-10">
        <div className="text-left">
          <span className="text-[#DAA520] font-black text-[10px] tracking-[0.2em] uppercase">
            Step 05 • Reading
          </span>
          <h2 className="text-xl font-black text-[#8B4513] tracking-tighter">
            텍스트 읽기 학습
          </h2>
        </div>
        <div className="bg-gray-50 px-5 py-2 rounded-full font-black text-sm text-gray-400">
          <span className="text-orange-500">{currentIndex + 1}</span> /{" "}
          {texts.length}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 2. 사이드바 */}
        <aside className="w-[350px] lg:w-[380px] border-r border-gray-50 bg-white p-3 shrink-0 relative flex flex-col overflow-y-auto">
          <AnalysisSidebar
            videoRef={videoRef}
            canvasRef={canvasRef} // ✅ 추가
            isFaceReady={isFaceReady}
            metrics={metrics}
            showTracking={showTracking} // ✅ 추가
            onToggleTracking={() => setShowTracking(!showTracking)} // ✅ 추가
            scoreLabel="읽기 정확도"
            scoreValue={
              currentResult ? `${currentResult.readingScore}%` : undefined
            }
          />
        </aside>

        {/* 3. 메인 콘텐츠 (반응형 레이아웃) */}
        <main className="flex-1 bg-[#FBFBFC] overflow-y-auto relative">
          <div className="min-h-full w-full max-w-3xl mx-auto flex flex-col justify-between p-6 lg:p-10 gap-6">
            {/* 텍스트 박스 섹션: phase에 따라 유동적인 크기 */}
            <div
              className={`w-full bg-white rounded-[40px] p-8 lg:p-12 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.05)] border border-gray-100 transition-all duration-700 relative overflow-hidden shrink-0 ${phase === "reading" ? "ring-4 ring-orange-400/20 scale-[1.01]" : ""}`}
            >
              <div className="flex justify-center mb-6">
                <span className="px-4 py-1 rounded-full bg-orange-50 text-orange-500 text-[9px] font-black uppercase tracking-widest border border-orange-100">
                  Topic: {currentItem.title}
                </span>
              </div>

              <div className="text-2xl lg:text-3xl font-black text-slate-800 leading-[1.8] break-keep text-center">
                {words.map((word, idx) => (
                  <span
                    key={idx}
                    className={`transition-all duration-300 px-1 rounded-lg ${idx <= highlightIndex ? "bg-orange-100 text-orange-600 shadow-sm" : "text-slate-400"}`}
                  >
                    {word}{" "}
                  </span>
                ))}
              </div>

              {phase === "reading" && (
                <div className="absolute bottom-0 left-0 h-1.5 bg-orange-400 w-full animate-pulse" />
              )}
            </div>

            {/* 하단 컨트롤 및 결과창 영역 */}
            <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[180px]">
              {phase === "ready" && (
                <button
                  onClick={startReading}
                  disabled={!isFaceReady}
                  className="px-10 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-[24px] font-black text-base shadow-2xl shadow-orange-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  📖 읽기 시작하기
                </button>
              )}

              {phase === "reading" && (
                <button
                  onClick={stopReading}
                  className="w-20 h-20 rounded-full bg-gray-900 shadow-2xl flex items-center justify-center animate-bounce transition-all active:scale-90"
                >
                  <div className="w-6 h-6 bg-white rounded-md" />
                </button>
              )}

              {phase === "review" && currentResult && (
                <div className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl border border-orange-100 animate-in fade-in zoom-in duration-500">
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                      <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                        Reading Stats
                      </span>
                      <span className="text-emerald-500 font-black text-[10px] uppercase flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />{" "}
                        Complete
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-50/50 p-4 rounded-2xl text-center border border-gray-50">
                        <p className="text-[8px] font-black text-gray-400 uppercase mb-1">
                          Time
                        </p>
                        <p className="text-lg font-black text-slate-700">
                          {currentResult.totalTime}s
                        </p>
                      </div>
                      <div className="bg-gray-50/50 p-4 rounded-2xl text-center border border-gray-50">
                        <p className="text-[8px] font-black text-gray-400 uppercase mb-1">
                          WPM
                        </p>
                        <p className="text-lg font-black text-slate-700">
                          {currentResult.wordsPerMinute}
                        </p>
                      </div>
                      <div className="bg-gray-50/50 p-4 rounded-2xl text-center border border-gray-50">
                        <p className="text-[8px] font-black text-gray-400 uppercase mb-1">
                          Pauses
                        </p>
                        <p className="text-lg font-black text-slate-700">
                          {currentResult.pauseCount}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleNext}
                      className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-[20px] font-black text-xs shadow-xl transition-all active:scale-95"
                    >
                      {currentIndex < texts.length - 1
                        ? "다음 텍스트로"
                        : "최종 결과 확인"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 최하단 안내 텍스트 */}
            <div className="flex-none pb-4 text-center">
              <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.5em]">
                {phase === "ready"
                  ? "Prepare to read"
                  : phase === "reading"
                    ? `Reading Timer: ${readingTime}s`
                    : "Analysis Result"}
              </p>
            </div>
          </div>
        </main>
      </div>

      <FaceTracker
        videoRef={videoRef}
        canvasRef={canvasRef} // ✅ 캔버스 추가
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

export default function Step5Page() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <Step5Content />
    </Suspense>
  );
}
