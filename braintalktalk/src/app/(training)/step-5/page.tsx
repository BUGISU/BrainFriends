"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PlaceType } from "@/constants/trainingData";
import { READING_TEXTS } from "@/constants/readingData"; // ✅ 데이터 임포트
import { useTraining } from "../TrainingContext";
import { AnalysisSidebar } from "@/components/training/AnalysisSidebar";
import FaceTracker from "@/components/diagnosis/FaceTracker";

export const dynamic = "force-dynamic";

interface ReadingMetrics {
  place: string;
  text: string;
  audioUrl: string;
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

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);
  // State
  const [isMounted, setIsMounted] = useState(false);
  const [isFaceReady, setIsFaceReady] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"ready" | "reading" | "review">("ready");
  const [readingTime, setReadingTime] = useState(0);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [metrics, setMetrics] = useState({ symmetryScore: 0, openingRatio: 0 });
  const [currentResult, setCurrentResult] = useState<ReadingMetrics | null>(
    null,
  );
  const [results, setResults] = useState<ReadingMetrics[]>([]);

  // ✅ 임포트한 데이터 사용
  const texts = useMemo(
    () => READING_TEXTS[place] || READING_TEXTS.home,
    [place],
  );
  const currentItem = texts[currentIndex];
  const words = currentItem.text.split(" ");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const startReading = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) =>
        audioChunksRef.current.push(e.data);

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        const audioUrl = URL.createObjectURL(audioBlob);
        const wpm = Math.round(
          (currentItem.wordCount / Math.max(1, readingTime)) * 60,
        );
        const score = Math.max(60, 100 - Math.abs(100 - wpm) * 0.5);

        const res: ReadingMetrics = {
          place,
          text: currentItem.text,
          audioUrl,
          totalTime: readingTime,
          wordsPerMinute: wpm,
          pauseCount: Math.floor(readingTime / 5),
          readingScore: Math.round(score),
        };
        console.log(`✅ [${place}] 문항 ${currentIndex + 1} 녹음 완료`, res);
        setCurrentResult(res);
      };

      setPhase("reading");
      setReadingTime(0);
      setHighlightIndex(0);
      mediaRecorder.start();
      // 1. 녹음 시간 타이머 (1초 단위)
      timerRef.current = setInterval(
        () => setReadingTime((prev) => prev + 1),
        1000,
      );

      // ✅ 2. 하이라이트 이동 타이머 추가 (단어당 약 0.8초 간격)
      // 이 타이머가 있어야 단어의 불빛이 다음으로 넘어갑니다.
      highlightTimerRef.current = setInterval(() => {
        setHighlightIndex((prev) => {
          if (prev < words.length - 1) {
            return prev + 1;
          } else {
            // 마지막 단어 도달 시 스스로 종료
            if (highlightTimerRef.current)
              clearInterval(highlightTimerRef.current);
            return prev;
          }
        });
      }, 800);
    } catch (err) {
      console.error("마이크 에러:", err);
    }
  };

  const stopReading = () => {
    // ✅ 1. 하이라이트 타이머 즉시 정지
    if (highlightTimerRef.current) {
      clearInterval(highlightTimerRef.current);
      highlightTimerRef.current = null;
      console.log("⏱️ 하이라이트 타이머 정지됨");
    }

    // ✅ 2. 녹음 시간 타이머 정지
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // ✅ 3. 녹음기 정지
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    setPhase("review");
  };

  const handleNext = () => {
    if (!currentResult) return;
    const updatedResults = [...results, currentResult];
    setResults(updatedResults);

    if (currentIndex < texts.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setPhase("ready");
      setCurrentResult(null);
      setHighlightIndex(-1);
    } else {
      const avg = Math.round(
        updatedResults.reduce((s, r) => s + r.readingScore, 0) /
          updatedResults.length,
      );
      const sess = JSON.parse(
        localStorage.getItem("kwab_training_session") || "{}",
      );
      localStorage.setItem(
        "kwab_training_session",
        JSON.stringify({
          ...sess,
          step5: { place, score: avg, items: updatedResults },
        }),
      );
      router.push(`/step-6?place=${place}&step4=${step4Score}&step5=${avg}`);
    }
  };

  if (!isMounted || !currentItem) return null;

  return (
    <div className="flex flex-col h-screen bg-white text-black font-sans overflow-hidden">
      <header className="h-20 px-10 border-b flex justify-between items-center bg-white shrink-0">
        <div>
          <span className="text-[#DAA520] font-black text-[10px] tracking-widest uppercase">
            Step 05 • {place}
          </span>
          <h2 className="text-xl font-black text-[#8B4513]">
            텍스트 읽기 학습
          </h2>
        </div>
        <div className="bg-gray-50 px-5 py-2 rounded-full font-black text-sm text-gray-400">
          <span className="text-orange-500">{currentIndex + 1}</span> /{" "}
          {texts.length}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[380px] border-r p-3 shrink-0 relative flex flex-col">
          <AnalysisSidebar
            videoRef={videoRef}
            canvasRef={canvasRef}
            isFaceReady={isFaceReady}
            metrics={{ ...metrics, audioLevel: 0 }}
            showTracking={true}
            onToggleTracking={() => {}}
            scoreLabel="현재 성취도"
            scoreValue={currentResult ? `${currentResult.readingScore}%` : "-"}
          />
        </aside>

        <main className="flex-1 bg-[#FBFBFC] flex flex-col items-center justify-center p-10 relative">
          <div
            className={`w-full max-w-2xl bg-white rounded-[40px] p-12 shadow-sm border transition-all ${phase === "reading" ? "ring-4 ring-orange-200" : ""}`}
          >
            <p className="text-2xl font-black text-slate-800 leading-relaxed text-center break-keep">
              {words.map((w, i) => (
                <span
                  key={i}
                  className={`transition-all duration-300 ${i <= highlightIndex ? "text-orange-600 bg-orange-50" : "text-gray-300"}`}
                >
                  {" "}
                  {w}{" "}
                </span>
              ))}
            </p>
          </div>

          <div className="mt-12 min-h-[200px] flex flex-col items-center justify-center w-full">
            {phase === "ready" && (
              <button
                onClick={startReading}
                className="px-12 py-5 bg-orange-500 text-white rounded-3xl font-black text-lg shadow-lg"
              >
                📖 {place.toUpperCase()} 읽기 시작
              </button>
            )}

            {phase === "reading" && (
              <div className="flex flex-col items-center gap-4">
                <div className="text-red-500 font-bold animate-pulse text-sm">
                  🔴 녹음 중 ({readingTime}s)
                </div>
                <button
                  onClick={stopReading}
                  className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center shadow-2xl"
                >
                  <div className="w-6 h-6 bg-white rounded-sm" />
                </button>
              </div>
            )}

            {phase === "review" && currentResult && (
              <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl border border-orange-100 animate-in zoom-in duration-300">
                <button
                  onClick={() => new Audio(currentResult.audioUrl).play()}
                  className="w-full py-3 mb-4 border-2 border-orange-100 rounded-xl text-orange-500 font-bold hover:bg-orange-50 transition-colors"
                >
                  ▶ 녹음 들어보기
                </button>
                <div className="grid grid-cols-3 gap-2 mb-6 text-center font-bold">
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-[10px] text-gray-400">TIME</p>
                    <p>{currentResult.totalTime}s</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-[10px] text-gray-400">WPM</p>
                    <p>{currentResult.wordsPerMinute}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-[10px] text-gray-400">SCORE</p>
                    <p className="text-orange-500">
                      {currentResult.readingScore}%
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleNext}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black transition-transform active:scale-95"
                >
                  {currentIndex < texts.length - 1
                    ? "다음 문항으로"
                    : "Step 6 이동"}
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      <FaceTracker
        videoRef={videoRef}
        canvasRef={canvasRef}
        onReady={() => setIsFaceReady(true)}
        onMetricsUpdate={(m) =>
          setMetrics({
            symmetryScore: m.symmetryScore,
            openingRatio: m.openingRatio * 100,
          })
        }
      />
    </div>
  );
}

export default function Step5Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Step5Content />
    </Suspense>
  );
}
