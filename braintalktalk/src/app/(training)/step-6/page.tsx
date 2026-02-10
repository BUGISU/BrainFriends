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
import { WRITING_WORDS } from "@/constants/writingData";
import { useTraining } from "../TrainingContext";

export const dynamic = "force-dynamic";

function Step6Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateFooter } = useTraining();
  const place = (searchParams.get("place") as PlaceType) || "home";

  // 이전 단계 점수들 획득
  const stepParams = useMemo(
    () => ({
      step1: searchParams.get("step1") || "0",
      step2: searchParams.get("step2") || "0",
      step3: searchParams.get("step3") || "0",
      step4: searchParams.get("step4") || "0",
      step5: searchParams.get("step5") || "0",
    }),
    [searchParams],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"writing" | "review">("writing");
  const [isMounted, setIsMounted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [userStrokeCount, setUserStrokeCount] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const words = useMemo(
    () => WRITING_WORDS[place] || WRITING_WORDS.home,
    [place],
  );
  const currentWord = words[currentIndex];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 푸터 업데이트
  useEffect(() => {
    if (updateFooter) {
      updateFooter({
        leftText: `현재 획수: ${userStrokeCount}회`,
        centerText: `Step 6: 쓰기 학습 (${place.toUpperCase()})`,
        rightText: `문제: ${currentIndex + 1} / ${words.length}`,
      });
    }
  }, [userStrokeCount, currentIndex, place, words.length, updateFooter]);

  const getFontSize = useCallback((canvas: HTMLCanvasElement, text: string) => {
    const padding = 100;
    const size = Math.min(
      (canvas.width - padding) / text.length,
      canvas.height * 0.5,
    );
    return Math.floor(size);
  }, []);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 20; // 가시성을 위해 약간 조정
      ctx.strokeStyle = "#1E293B"; // Slate-800 색상

      if (showHint && currentWord) {
        const fontSize = getFontSize(canvas, currentWord.answer);
        ctx.font = `900 ${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(226, 232, 240, 0.4)"; // 매우 연한 힌트 색상
        ctx.fillText(currentWord.answer, canvas.width / 2, canvas.height / 2);
      }
    }
    setUserStrokeCount(0);
  }, [showHint, currentWord, getFontSize]);

  useEffect(() => {
    if (phase === "writing" && isMounted) {
      const timer = setTimeout(initCanvas, 150);
      return () => clearTimeout(timer);
    }
  }, [phase, isMounted, initCanvas, showHint, currentIndex]);

  const startDrawing = (e: any) => {
    setIsDrawing(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const ctx = canvasRef.current!.getContext("2d");
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const ctx = canvasRef.current!.getContext("2d");
    ctx?.lineTo(x, y);
    ctx?.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setUserStrokeCount((prev) => prev + 1);
      setIsDrawing(false);
    }
  };

  const checkAnswer = () => {
    if (!currentWord) return;
    // 획수 판정 (관대한 기준 적용)
    const isStrokeCorrect =
      Math.abs(userStrokeCount - currentWord.strokes) <= 5;

    if (userStrokeCount > 0 && isStrokeCorrect) {
      setCorrectCount((prev) => prev + 1);
      setPhase("review");
    } else {
      alert(
        `획수를 다시 확인해 주세요!\n(입력: ${userStrokeCount}획 / 목표: 약 ${currentWord.strokes}획)`,
      );
      initCanvas();
    }
  };

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex((c) => c + 1);
      setPhase("writing");
      setShowHint(false);
    } else {
      const params = new URLSearchParams({
        place,
        ...stepParams,
        step6: correctCount.toString(),
      });
      router.push(`/result?${params.toString()}`);
    }
  };

  if (!isMounted || !currentWord) return null;

  return (
    <div className="flex flex-col h-screen w-full bg-white overflow-hidden text-slate-900">
      {/* 상단 헤더 */}
      <header className="h-20 px-10 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 font-black">
            06
          </div>
          <div>
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none mb-1">
              Step 06 • Writing
            </p>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              단어 쓰기 학습
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 px-5 py-2 rounded-2xl border border-slate-100">
          <div className="flex flex-col items-end mr-4 pr-4 border-r border-slate-200">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
              Current Strokes
            </span>
            <span className="text-sm font-black text-amber-600">
              {userStrokeCount} 획
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-slate-700">
              {currentIndex + 1}
            </span>
            <span className="text-xs font-bold text-slate-300">/</span>
            <span className="text-sm font-black text-slate-400">
              {words.length}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-8 gap-8 bg-[#FBFBFC]">
        {phase === "writing" ? (
          <>
            {/* 좌측 패널: 가이드 */}
            <div className="w-[380px] flex flex-col gap-6 shrink-0">
              <div className="flex-1 bg-white rounded-[40px] p-10 flex flex-col items-center justify-center text-center shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-slate-100">
                <div className="text-[100px] mb-8 animate-bounce-slow leading-none">
                  {currentWord.emoji}
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-amber-500 uppercase tracking-[0.2em]">
                    What is this?
                  </p>
                  <h3 className="text-3xl font-black text-slate-800 break-keep">
                    {currentWord.hint}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={initCanvas}
                  className="py-5 bg-white border border-slate-200 rounded-3xl font-black text-slate-400 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  🔄 다시 쓰기
                </button>
                <button
                  onClick={() => setShowHint(!showHint)}
                  className={`py-5 border rounded-3xl font-black transition-all shadow-sm ${
                    showHint
                      ? "bg-amber-500 border-amber-500 text-white"
                      : "bg-white border-amber-200 text-amber-500 hover:bg-amber-50"
                  }`}
                >
                  💡 {showHint ? "힌트 끄기" : "힌트 보기"}
                </button>
              </div>

              <button
                onClick={checkAnswer}
                className="w-full py-6 bg-slate-900 text-white rounded-[32px] font-black text-xl shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95"
              >
                작성 완료
              </button>
            </div>

            {/* 우측 패널: 캔버스 */}
            <div className="flex-1 relative bg-white border-2 border-slate-100 rounded-[48px] shadow-inner overflow-hidden group">
              {/* 격자 배경 (글쓰기 가이드라인) */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03]">
                <div className="w-full h-px bg-slate-900 absolute top-1/2" />
                <div className="h-full w-px bg-slate-900 absolute left-1/2" />
              </div>

              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="absolute inset-0 w-full h-full touch-none z-10 cursor-crosshair"
              />

              {/* 안내 문구 */}
              {!isDrawing && userStrokeCount === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-slate-200 font-black text-2xl uppercase tracking-widest">
                    Write Here
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* 리뷰 페이즈 */
          <div className="w-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
            <div className="bg-white w-full max-w-2xl p-20 rounded-[60px] text-center shadow-[0_40px_100px_rgba(0,0,0,0.08)] border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-amber-400" />
              <div className="text-[120px] mb-10 leading-none">
                {currentWord.emoji}
              </div>
              <p className="text-amber-500 font-black text-sm uppercase tracking-[0.3em] mb-4">
                Correct Answer
              </p>
              <h4 className="text-[120px] font-black text-slate-800 leading-none tracking-tighter">
                {currentWord.answer}
              </h4>
            </div>

            <button
              onClick={handleNext}
              className="mt-12 w-full max-w-2xl py-8 bg-amber-500 hover:bg-amber-600 text-white rounded-[32px] font-black text-3xl shadow-2xl shadow-amber-100 transition-all active:scale-95"
            >
              {currentIndex < words.length - 1
                ? "다음 문제로"
                : "최종 결과 확인하기"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function Step6Page() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-white font-black text-slate-200 animate-pulse uppercase tracking-widest">
          Initializing Step 06...
        </div>
      }
    >
      <Step6Content />
    </Suspense>
  );
}
