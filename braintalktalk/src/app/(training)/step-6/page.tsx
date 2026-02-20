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
import { loadPatientProfile } from "@/lib/patientStorage";
import { SessionManager } from "@/lib/kwab/SessionManager";

export const dynamic = "force-dynamic";

function getResultWordSizeClass(word: string) {
  const len = (word || "").trim().length;
  if (len <= 3) return "text-5xl sm:text-6xl lg:text-8xl";
  if (len <= 5) return "text-4xl sm:text-5xl lg:text-7xl";
  if (len <= 8) return "text-3xl sm:text-4xl lg:text-6xl";
  return "text-2xl sm:text-3xl lg:text-5xl";
}

const RESULT_PRAISES = [
  "좋아요! 정답입니다",
  "정확해요! 잘 쓰셨어요",
  "완벽해요! 아주 좋습니다",
  "잘했어요, 정답입니다",
  "좋습니다. 정확하게 작성했어요",
] as const;

function Step6Content() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { sidebarMetrics, updateClinical } = useTraining();

  const place = (searchParams.get("place") as PlaceType) || "home";

  const canvasRef = useRef<HTMLCanvasElement>(null);

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
  const [writingImages, setWritingImages] = useState<string[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [praiseMessage, setPraiseMessage] = useState<string>(
    RESULT_PRAISES[0],
  );

  const questions = useMemo(
    () =>
      [...(WRITING_WORDS[place] || WRITING_WORDS.home)]
        .sort(() => Math.random() - 0.5)
        .slice(0, 5),
    [place],
  );
  const currentWord = questions[currentIndex];

  useEffect(() => {
    setIsMounted(true);
    localStorage.removeItem("step6_recorded_data"); // ✅ 초기화
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    updateClinical({
      systemLatency: 24,
      trackingPrecision: sidebarMetrics.faceDetected ? 0.08 : 0.0,
      analysisAccuracy: Math.round((correctCount / (currentIndex || 1)) * 100),
      correlation: 0.91 + (isDrawing ? 0.02 : 0),
      reliability: 0.96,
      stability: (sidebarMetrics.facialSymmetry || 0) * 10,
    });
  }, [
    sidebarMetrics,
    userStrokeCount,
    currentIndex,
    correctCount,
    questions.length,
    place,
    updateClinical,
    isMounted,
    isDrawing,
  ]);

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
      ctx.lineWidth = 18;
      ctx.strokeStyle = "#1E293B";

      if (showHint && currentWord) {
        ctx.font = `900 ${Math.min(canvas.width / 3, canvas.height * 0.5)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(226, 232, 240, 0.4)";
        ctx.fillText(currentWord.answer, canvas.width / 2, canvas.height / 2);
      }
    }
    setUserStrokeCount(0);
  }, [showHint, currentWord]);

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
    const isStrokeCorrect =
      Math.abs(userStrokeCount - currentWord.strokes) <= 5;

    if (userStrokeCount > 0 && isStrokeCorrect) {
      const imageData = canvasRef.current?.toDataURL("image/png") || "";

      // ✅ 1. 누적 이미지 업데이트
      const updatedImages = [...writingImages, imageData];
      setWritingImages(updatedImages);

      // ✅ 2. Result 페이지용 localStorage 저장
      const existingData = JSON.parse(
        localStorage.getItem("step6_recorded_data") || "[]",
      );

      const newEntry = {
        text: currentWord.answer, // 쓴 단어
        userImage: imageData, // Base64 이미지
        isCorrect: true,
        expectedStrokes: currentWord.strokes,
        userStrokes: userStrokeCount,
        timestamp: new Date().toLocaleTimeString(),
      };

      localStorage.setItem(
        "step6_recorded_data",
        JSON.stringify([...existingData, newEntry]),
      );

      console.log("✅ Step 6 데이터 저장:", newEntry);

      setCorrectCount((prev) => prev + 1);
      setPraiseMessage(
        RESULT_PRAISES[Math.floor(Math.random() * RESULT_PRAISES.length)],
      );
      setPhase("review");
    } else {
      alert(
        `획수를 확인해 주세요! (입력: ${userStrokeCount} / 목표: 약 ${currentWord.strokes}획)`,
      );
      initCanvas();
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((c) => c + 1);
      setPhase("writing");
      setShowHint(false);
    } else {
      // ✅ SessionManager 통합 저장
      try {
        const rawSession = localStorage.getItem("kwab_training_session");
        const existingSession = rawSession ? JSON.parse(rawSession) : null;
        const patientData = existingSession?.patient ||
          loadPatientProfile() || { name: "사용자" };
        const sm = new SessionManager(patientData as any, place);

        sm.saveStep6Result({
          completedTasks: correctCount,
          totalTasks: questions.length,
          accuracy: Math.round((correctCount / questions.length) * 100),
          timestamp: Date.now(),
          items: questions.map((word, idx) => ({
            word: word.answer,
            expectedStrokes: word.strokes,
            userImage: writingImages[idx] || "",
          })),
        });

        console.log("✅ Step 6 SessionManager 저장 완료");
      } catch (error) {
        console.error("❌ SessionManager 저장 실패:", error);
      }

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
    <div className="flex flex-col h-screen bg-[#FBFBFC] overflow-y-auto lg:overflow-hidden text-slate-900 font-sans">
      <header className="h-16 px-4 sm:px-6 lg:px-8 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-amber-100">
            06
          </div>
          <div>
            <span className="text-amber-500 font-black text-[10px] uppercase tracking-widest leading-none block">
              Step 06 • Writing
            </span>
            <h2 className="text-lg font-black text-slate-800 tracking-tighter">
              단어 쓰기 학습
            </h2>
          </div>
        </div>
        <div className="bg-amber-50 px-4 py-1.5 rounded-full font-black text-xs text-amber-600 border border-amber-100">
          {currentIndex + 1} / {questions.length}
        </div>
      </header>

      <div className="flex flex-1 flex-col min-h-0 overflow-y-auto lg:overflow-hidden">
        <main className="flex-1 flex flex-col min-h-[calc(100vh-4rem)] lg:min-h-0 relative p-4 sm:p-6 order-1 pb-28 lg:pb-10">
          {phase === "writing" ? (
            <div className="flex flex-col lg:flex-row h-full gap-4 lg:gap-6">
              <div className="w-full lg:w-72 flex flex-col gap-4 shrink-0 order-1">
                <div className="flex-1 bg-white rounded-[32px] p-6 flex flex-col items-center justify-center text-center shadow-sm border border-slate-100">
                  <div className="lg:hidden w-full flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="text-3xl leading-none shrink-0">
                        {currentWord.emoji}
                      </div>
                      <p className="text-sm font-black text-slate-800 truncate">
                        {currentWord.hint}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 shrink-0">
                      <button
                        onClick={() => setShowHint(!showHint)}
                        className={`px-2.5 py-2 rounded-xl font-black text-[11px] transition-all ${showHint ? "bg-amber-500 text-white" : "bg-white border border-amber-200 text-amber-600"}`}
                      >
                        {showHint ? "힌트 끄기" : "힌트 보기"}
                      </button>
                      <button
                        onClick={initCanvas}
                        className="px-2.5 py-2 bg-slate-50 text-slate-400 rounded-xl font-black text-[11px]"
                      >
                        다시 쓰기
                      </button>
                    </div>
                  </div>

                  <div className="hidden lg:block text-7xl mb-4 animate-bounce-slow leading-none">
                    {currentWord.emoji}
                  </div>
                  <p className="hidden lg:block text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">
                    Target Object
                  </p>
                  <h3 className="hidden lg:block text-2xl font-black text-slate-800 break-keep">
                    {currentWord.hint}
                  </h3>

                </div>
                <div className="hidden lg:grid grid-cols-1 gap-2">
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className={`py-4 rounded-2xl font-black text-sm transition-all ${showHint ? "bg-amber-500 text-white" : "bg-white border border-amber-200 text-amber-600"}`}
                  >
                    💡 {showHint ? "힌트 끄기" : "힌트 보기"}
                  </button>
                  <button
                    onClick={initCanvas}
                    className="py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-sm"
                  >
                    🔄 다시 쓰기
                  </button>
                  <button
                    onClick={checkAnswer}
                    className="py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-black transition-all"
                  >
                    작성 완료
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-[300px] lg:min-h-0 relative bg-white border-2 border-slate-100 rounded-[32px] lg:rounded-[40px] shadow-inner overflow-hidden order-2">
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 min-w-[320px] sm:min-w-[420px] px-6 py-2 rounded-xl bg-amber-50/95 border border-amber-100 text-amber-700 text-[11px] sm:text-xs font-bold text-center whitespace-nowrap shadow-sm">
                  한 획 한 획 또렷하고 정확하게 작성해 주세요.
                </div>
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
                {!isDrawing && userStrokeCount === 0 && (
                  <div className="absolute inset-0 grid place-items-center pointer-events-none">
                    <p className="text-slate-100 font-black text-3xl sm:text-4xl lg:text-5xl uppercase tracking-[0.18em] leading-none text-center px-2">
                      Write Here
                    </p>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center animate-in zoom-in duration-300">
              <div className="w-full max-w-[92vw] sm:max-w-[760px] bg-white p-6 sm:p-8 lg:p-12 rounded-[36px] lg:rounded-[60px] text-center shadow-2xl border border-slate-50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-amber-400" />
                <div className="text-5xl sm:text-6xl lg:text-8xl mb-4 lg:mb-6">
                  {currentWord.emoji}
                </div>
                <h4
                  className={`${getResultWordSizeClass(currentWord.answer)} font-black text-slate-800 tracking-tight mb-3 lg:mb-4 whitespace-nowrap overflow-hidden text-ellipsis`}
                >
                  {currentWord.answer}
                </h4>
                <p className="text-amber-500 font-black text-sm uppercase tracking-widest">
                  {praiseMessage}
                </p>
              </div>
              <button
                onClick={handleNext}
                className="mt-8 lg:mt-10 px-10 lg:px-20 py-4 lg:py-6 bg-amber-500 text-white rounded-3xl font-black text-xl lg:text-2xl shadow-xl shadow-amber-100 hover:scale-105 transition-all"
              >
                {currentIndex < questions.length - 1
                  ? "다음 문제"
                  : "결과 확인하기"}
              </button>
            </div>
          )}

          {phase === "writing" && (
            <div className="lg:hidden fixed left-4 right-4 z-40 space-y-2 pb-[max(env(safe-area-inset-bottom),0px)]" style={{ bottom: "9.25rem" }}>
              <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-[11px] font-bold text-center">
                한 획씩 정확하게 작성해 주세요.
              </div>
              <button
                onClick={checkAnswer}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-base shadow-xl hover:bg-black transition-all"
              >
                작성 완료
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function Step6Page() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center font-black text-slate-200 uppercase tracking-widest">
          Loading Step 06...
        </div>
      }
    >
      <Step6Content />
    </Suspense>
  );
}
