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

export const dynamic = "force-dynamic";
// --- 전체 데이터 보존 (유지) ---
const WRITING_WORDS: Record<
  PlaceType,
  Array<{
    id: number;
    hint: string;
    image: string;
    emoji: string;
    answer: string;
    category: string;
  }>
> = {
  home: [
    {
      id: 1,
      hint: "물을 끓이는 도구",
      image: "",
      emoji: "🥘",
      answer: "냄비",
      category: "주방",
    },
    {
      id: 2,
      hint: "잠을 자는 가구",
      image: "",
      emoji: "🛏️",
      answer: "침대",
      category: "가구",
    },
    {
      id: 3,
      hint: "옷을 보관하는 곳",
      image: "",
      emoji: "👗",
      answer: "옷장",
      category: "가구",
    },
    {
      id: 4,
      hint: "문을 여는 도구",
      image: "",
      emoji: "🔑",
      answer: "열쇠",
      category: "생활",
    },
  ],
  hospital: [
    {
      id: 1,
      hint: "아플 때 먹는 것",
      image: "",
      emoji: "💊",
      answer: "약",
      category: "의료",
    },
    {
      id: 2,
      hint: "체온을 재는 도구",
      image: "",
      emoji: "🌡️",
      answer: "체온계",
      category: "의료",
    },
    {
      id: 3,
      hint: "환자를 치료하는 사람",
      image: "",
      emoji: "👨‍⚕️",
      answer: "의사",
      category: "직업",
    },
    {
      id: 4,
      hint: "주사를 놓는 도구",
      image: "",
      emoji: "💉",
      answer: "주사기",
      category: "의료",
    },
  ],
  cafe: [
    {
      id: 1,
      hint: "따뜻한 음료",
      image: "",
      emoji: "☕",
      answer: "커피",
      category: "음료",
    },
    {
      id: 2,
      hint: "음료를 담는 용기",
      image: "",
      emoji: "🥛",
      answer: "컵",
      category: "용기",
    },
    {
      id: 3,
      hint: "빵과 크림으로 만든 것",
      image: "",
      emoji: "🍰",
      answer: "케이크",
      category: "디저트",
    },
    {
      id: 4,
      hint: "음료에 꽂는 것",
      image: "",
      emoji: "🥤",
      answer: "빨대",
      category: "용품",
    },
  ],
  bank: [
    {
      id: 1,
      hint: "돈을 넣는 책",
      image: "",
      emoji: "📕",
      answer: "통장",
      category: "금융",
    },
    {
      id: 2,
      hint: "결제할 때 쓰는 것",
      image: "",
      emoji: "💳",
      answer: "카드",
      category: "금융",
    },
    {
      id: 3,
      hint: "현금을 찾는 기계",
      image: "",
      emoji: "🏧",
      answer: "ATM",
      category: "기기",
    },
    {
      id: 4,
      hint: "기다릴 때 받는 것",
      image: "",
      emoji: "🎫",
      answer: "번호표",
      category: "서류",
    },
  ],
  park: [
    {
      id: 1,
      hint: "키가 크고 잎이 있는 것",
      image: "",
      emoji: "🌳",
      answer: "나무",
      category: "자연",
    },
    {
      id: 2,
      hint: "예쁜 색의 식물",
      image: "",
      emoji: "🌸",
      answer: "꽃",
      category: "자연",
    },
    {
      id: 3,
      hint: "앉어서 쉬는 곳",
      image: "",
      emoji: "🪵",
      answer: "벤치",
      category: "시설",
    },
    {
      id: 4,
      hint: "두 바퀴로 타는 것",
      image: "",
      emoji: "🚲",
      answer: "자전거",
      category: "이동",
    },
  ],
  mart: [
    {
      id: 1,
      hint: "빨간 과일",
      image: "",
      emoji: "🍎",
      answer: "사과",
      category: "과일",
    },
    {
      id: 2,
      hint: "물건을 담는 바구니",
      image: "",
      emoji: "🛒",
      answer: "카트",
      category: "용품",
    },
    {
      id: 3,
      hint: "하얀 음료",
      image: "",
      emoji: "🥛",
      answer: "우유",
      category: "음료",
    },
    {
      id: 4,
      hint: "주황색 채소",
      image: "",
      emoji: "🥕",
      answer: "당근",
      category: "채소",
    },
  ],
};

function Step6Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const place = (searchParams.get("place") as PlaceType) || "home";
  const step5Score = searchParams.get("step5") || "0";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"writing" | "review">("writing");
  const [isMounted, setIsMounted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [scores, setScores] = useState<number[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const words = useMemo(
    () => WRITING_WORDS[place] || WRITING_WORDS.home,
    [place],
  );
  const currentWord = words[currentIndex];

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    if (!canvas || !canvas.parentElement) return;

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    if (hiddenCanvasRef.current) {
      hiddenCanvasRef.current.width = canvas.width;
      hiddenCanvasRef.current.height = canvas.height;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 28; // 고령층 사용자를 위해 조금 더 두껍게 설정
      ctx.strokeStyle = "#4A2C2A";

      if (showHint) {
        const fontSize = getFontSize(canvas, currentWord.answer);
        ctx.font = `900 ${fontSize}px 'Noto Sans KR', sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
        ctx.fillText(currentWord.answer, canvas.width / 2, canvas.height / 2);
      }
    }
  }, [showHint, currentWord.answer, getFontSize]);

  useEffect(() => {
    if (phase === "writing" && isMounted) {
      const timer = setTimeout(initCanvas, 100);
      return () => clearTimeout(timer);
    }
  }, [phase, isMounted, initCanvas, currentIndex]);

  const handleStart = (e: any) => {
    setIsDrawing(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const ctx = canvasRef.current!.getContext("2d");
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  };

  const handleMove = (e: any) => {
    if (!isDrawing) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const ctx = canvasRef.current!.getContext("2d");
    ctx?.lineTo(x, y);
    ctx?.stroke();
  };

  const checkAnswer = () => {
    const canvas = canvasRef.current;
    const hCanvas = hiddenCanvasRef.current;
    if (!canvas || !hCanvas) return;

    const hCtx = hCanvas.getContext("2d");
    if (!hCtx) return;

    hCtx.clearRect(0, 0, hCanvas.width, hCanvas.height);
    const fontSize = getFontSize(hCanvas, currentWord.answer);
    hCtx.font = `900 ${fontSize}px sans-serif`;
    hCtx.textAlign = "center";
    hCtx.textBaseline = "middle";
    hCtx.fillStyle = "black";
    hCtx.fillText(currentWord.answer, hCanvas.width / 2, hCanvas.height / 2);

    const userImg = canvas
      .getContext("2d")!
      .getImageData(0, 0, canvas.width, canvas.height).data;
    const targetImg = hCtx.getImageData(
      0,
      0,
      hCanvas.width,
      hCanvas.height,
    ).data;

    let targetTotal = 0;
    let matchCount = 0;

    for (let i = 3; i < targetImg.length; i += 4) {
      if (targetImg[i] > 100) {
        targetTotal++;
        if (userImg[i] > 30) matchCount++;
      }
    }

    const similarity = (matchCount / targetTotal) * 100;

    // 점수 저장 (힌트를 봤다면 페널티 적용 가능)
    const currentScore = Math.min(Math.round(similarity * 2.5), 100);
    setScores((prev) => [...prev, currentScore]);
    setPhase("review");
  };

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setPhase("writing");
      setShowHint(false);
    } else {
      const avgScore = Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length,
      );
      router.push(
        `/step-7?place=${place}&step5=${step5Score}&step6=${avgScore}`,
      );
    }
  };

  if (!isMounted || !currentWord) return null;

  return (
    <div className="flex flex-col h-screen w-full bg-white text-black font-sans overflow-hidden">
      <header className="px-8 py-4 border-b border-gray-50 flex justify-between items-center bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-xl">
            ✍️
          </div>
          <div>
            <span className="text-[#DAA520] font-black text-[10px] tracking-widest uppercase block">
              Step 06 • WRITING
            </span>
            <h2 className="text-xl font-black text-[#8B4513]">낱말 받아쓰기</h2>
          </div>
        </div>
        <div className="bg-[#F8F9FA] px-6 py-2 rounded-2xl font-black text-lg text-[#DAA520] border border-gray-100 shadow-sm">
          {currentIndex + 1} <span className="text-gray-300 mx-1">/</span>{" "}
          {words.length}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        {phase === "writing" ? (
          <>
            <div className="w-[320px] flex flex-col gap-4 shrink-0">
              <div className="flex-1 bg-gradient-to-b from-amber-50/50 to-orange-50/30 rounded-[40px] border-2 border-amber-100/50 p-8 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="text-[140px] mb-8 leading-none drop-shadow-sm">
                  {currentWord.emoji}
                </div>
                <div className="space-y-2">
                  <p className="text-[#DAA520] font-black text-xs uppercase tracking-widest">
                    Description
                  </p>
                  <h3 className="text-2xl font-black text-[#8B4513] leading-tight break-keep">
                    {currentWord.hint}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    initCanvas();
                  }}
                  className="py-5 bg-white border-2 border-gray-100 rounded-[24px] font-black text-gray-500 shadow-sm hover:bg-gray-50 transition-colors"
                >
                  🔄 다시쓰기
                </button>
                <button
                  onClick={() => setShowHint(!showHint)}
                  className={`py-5 border-2 rounded-[24px] font-black shadow-sm transition-all ${showHint ? "bg-[#DAA520] text-white border-[#B8860B]" : "bg-white text-[#DAA520] border-amber-100 hover:bg-amber-50"}`}
                >
                  💡 {showHint ? "가이드 끄기" : "가이드 보기"}
                </button>
              </div>

              <button
                onClick={checkAnswer}
                className="w-full py-6 bg-[#8B4513] text-white rounded-[28px] font-black text-2xl shadow-xl hover:bg-[#5D2E0A] transform active:scale-[0.97] transition-all"
              >
                작성 완료
              </button>
            </div>

            <div className="flex-1 relative bg-[#FAFAFA] border-4 border-dashed border-gray-200 rounded-[48px] overflow-hidden shadow-inner group">
              <div className="absolute top-8 left-8 text-gray-200 font-black text-6xl select-none pointer-events-none group-hover:text-gray-300 transition-colors uppercase">
                Write Here
              </div>
              <canvas
                ref={canvasRef}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={() => setIsDrawing(false)}
                onMouseLeave={() => setIsDrawing(false)}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={() => setIsDrawing(false)}
                className="absolute inset-0 w-full h-full touch-none z-10 cursor-crosshair"
              />
              <canvas ref={hiddenCanvasRef} className="hidden" />
            </div>
          </>
        ) : (
          <div className="w-full flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="bg-white w-full max-w-2xl p-16 rounded-[60px] text-center border-4 border-amber-100 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200" />
              <p className="text-[#DAA520] font-black tracking-[0.3em] text-xl mb-8 uppercase">
                Perfect Match!
              </p>
              <div className="text-[160px] mb-6 animate-bounce">
                {currentWord.emoji}
              </div>
              <h4 className="text-[120px] font-black text-[#8B4513] leading-none tracking-tighter">
                {currentWord.answer}
              </h4>
            </div>
            <button
              onClick={handleNext}
              className="w-full max-w-2xl py-8 bg-[#8B4513] text-white rounded-[32px] font-black text-4xl shadow-2xl hover:bg-black transform active:scale-95 transition-all flex items-center justify-center gap-4"
            >
              {currentIndex < words.length - 1 ? "다음 문제" : "전체 결과 보기"}{" "}
              <span className="text-3xl">→</span>
            </button>
          </div>
        )}
      </main>

      <footer className="px-8 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
        <span>Handwriting Recognition Active</span>
        <div className="flex gap-4">
          <span>Category: {currentWord.category}</span>
          <span>Place: {place}</span>
        </div>
      </footer>
    </div>
  );
}

export default function Step6Page() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <Step6Content />
    </Suspense>
  );
}
