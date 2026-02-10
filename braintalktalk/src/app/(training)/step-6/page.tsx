"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PlaceType } from "@/constants/trainingData";

// --- 데이터 세트 ---
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
    {
      id: 5,
      hint: "얼굴을 보는 물건",
      image: "",
      emoji: "🪞",
      answer: "거울",
      category: "생활",
    },
    {
      id: 6,
      hint: "추울 때 덮는 것",
      image: "",
      emoji: "☁️",
      answer: "이불",
      category: "침구",
    },
    {
      id: 7,
      hint: "TV 채널을 바꾸는 것",
      image: "",
      emoji: "📺",
      answer: "리모컨",
      category: "가전",
    },
    {
      id: 8,
      hint: "빨래를 하는 기계",
      image: "",
      emoji: "🧺",
      answer: "세탁기",
      category: "가전",
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
    {
      id: 5,
      hint: "상처에 붙이는 것",
      image: "",
      emoji: "🩹",
      answer: "반창고",
      category: "의료",
    },
    {
      id: 6,
      hint: "환자를 옮기는 의자",
      image: "",
      emoji: "🦽",
      answer: "휠체어",
      category: "의료",
    },
    {
      id: 7,
      hint: "코와 입을 가리는 것",
      image: "",
      emoji: "😷",
      answer: "마스크",
      category: "위생",
    },
    {
      id: 8,
      hint: "의사가 쓰는 처방",
      image: "",
      emoji: "📋",
      answer: "처방전",
      category: "서류",
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
    {
      id: 5,
      hint: "주문 후 받는 것",
      image: "",
      emoji: "🔔",
      answer: "진동벨",
      category: "용품",
    },
    {
      id: 6,
      hint: "앉는 가구",
      image: "",
      emoji: "🪑",
      answer: "의자",
      category: "가구",
    },
    {
      id: 7,
      hint: "메뉴를 보는 것",
      image: "",
      emoji: "📜",
      answer: "메뉴판",
      category: "용품",
    },
    {
      id: 8,
      hint: "결제 후 받는 것",
      image: "",
      emoji: "🧾",
      answer: "영수증",
      category: "서류",
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
    {
      id: 5,
      hint: "귀중품 보관함",
      image: "",
      emoji: "🔐",
      answer: "금고",
      category: "보관",
    },
    {
      id: 6,
      hint: "서류에 찍는 것",
      image: "",
      emoji: "⭕",
      answer: "도장",
      category: "문구",
    },
    {
      id: 7,
      hint: "신원을 확인하는 것",
      image: "",
      emoji: "🆔",
      answer: "신분증",
      category: "서류",
    },
    {
      id: 8,
      hint: "숫자를 계산하는 것",
      image: "",
      emoji: "🧮",
      answer: "계산기",
      category: "기기",
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
    {
      id: 5,
      hint: "물이 솟아오르는 곳",
      image: "",
      emoji: "⛲",
      answer: "분수대",
      category: "시설",
    },
    {
      id: 6,
      hint: "하늘을 나는 곤충",
      image: "",
      emoji: "🦋",
      answer: "나비",
      category: "동물",
    },
    {
      id: 7,
      hint: "공중에 띄우는 것",
      image: "",
      emoji: "🪁",
      answer: "연",
      category: "놀이",
    },
    {
      id: 8,
      hint: "낮에 빛나는 것",
      image: "",
      emoji: "☀️",
      answer: "해",
      category: "자연",
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
    {
      id: 5,
      hint: "돈을 내는 곳",
      image: "",
      emoji: "🏪",
      answer: "계산대",
      category: "시설",
    },
    {
      id: 6,
      hint: "노란 과일",
      image: "",
      emoji: "🍌",
      answer: "바나나",
      category: "과일",
    },
    {
      id: 7,
      hint: "둥근 알",
      image: "",
      emoji: "🥚",
      answer: "계란",
      category: "식품",
    },
    {
      id: 8,
      hint: "돈을 넣는 곳",
      image: "",
      emoji: "👛",
      answer: "지갑",
      category: "용품",
    },
  ],
};

export default function Step6Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const place = (searchParams.get("place") as PlaceType) || "home";

  // 이전 단계 점수들 획득
  const step1 = searchParams.get("step1") || "0";
  const step2 = searchParams.get("step2") || "0";
  const step3 = searchParams.get("step3") || "0";
  const step4 = searchParams.get("step4") || "0";
  const step5 = searchParams.get("step5") || "0";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"writing" | "review">("writing");
  const [isMounted, setIsMounted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

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
    const padding = 80;
    const size = Math.min(
      (canvas.width - padding) / text.length,
      canvas.height * 0.6,
    );
    return Math.floor(size);
  }, []);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const hCanvas = hiddenCanvasRef.current;
    if (!canvas || !hCanvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    hCanvas.width = canvas.width;
    hCanvas.height = canvas.height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 35;
      ctx.strokeStyle = "#4A2C2A";

      if (showHint) {
        const fontSize = getFontSize(canvas, currentWord.answer);
        ctx.font = `900 ${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
        ctx.fillText(currentWord.answer, canvas.width / 2, canvas.height / 2);
      }
    }
  }, [showHint, currentWord.answer, getFontSize]);

  useEffect(() => {
    if (phase === "writing" && isMounted) {
      setTimeout(initCanvas, 150);
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
        if (userImg[i] > 50 || userImg[i - 16] > 50 || userImg[i + 16] > 50)
          matchCount++;
      }
    }

    const similarity = (matchCount / targetTotal) * 100;

    if (similarity > 20) {
      setCorrectCount((prev) => prev + 1);
      setPhase("review");
    } else {
      alert(`잘하셨어요! 가이드를 따라 조금 더 써볼까요?`);
    }
  };

  // ✅ 결과 페이지 이동 로직
  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex((c) => c + 1);
      setPhase("writing");
      setShowHint(false);
    } else {
      // 모든 점수를 모아서 결과 페이지로 전송
      const params = new URLSearchParams({
        place,
        step1,
        step2,
        step3,
        step4,
        step5,
        step6: correctCount.toString(), // 8점 만점
      });
      router.push(`/result?${params.toString()}`);
    }
  };

  if (!isMounted || !currentWord) return null;

  return (
    <div className="flex flex-col h-screen w-full bg-white text-black font-sans overflow-hidden">
      <header className="px-6 py-3 border-b border-gray-100 flex justify-between items-center shrink-0 bg-white z-20">
        <div>
          <span className="text-[#DAA520] font-black text-[10px] tracking-widest uppercase">
            Step 06 • {place.toUpperCase()}
          </span>
          <h2 className="text-lg font-black text-[#8B4513]">쓰기 학습</h2>
        </div>
        <div className="bg-[#F8F9FA] px-4 py-1 rounded-xl font-black text-md text-[#DAA520]">
          {currentIndex + 1} / {words.length}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        {phase === "writing" ? (
          <>
            <div className="w-[35%] flex flex-col gap-4 shrink-0">
              <div className="flex-1 bg-amber-50/50 rounded-[32px] border border-amber-100 p-6 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="text-[120px] mb-6">{currentWord.emoji}</div>
                <p className="text-[#DAA520] font-bold text-sm mb-1 uppercase tracking-tighter">
                  HINT
                </p>
                <h3 className="text-xl font-black text-[#8B4513] leading-tight break-keep">
                  {currentWord.hint}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const ctx = canvasRef.current?.getContext("2d");
                    ctx?.clearRect(
                      0,
                      0,
                      canvasRef.current!.width,
                      canvasRef.current!.height,
                    );
                    initCanvas();
                  }}
                  className="py-4 bg-white border-2 border-gray-100 rounded-2xl font-black text-sm text-gray-500 shadow-sm"
                >
                  🔄 다시쓰기
                </button>
                <button
                  onClick={() => setShowHint(!showHint)}
                  className={`py-4 border-2 rounded-2xl font-black text-sm shadow-sm transition-colors ${showHint ? "bg-[#DAA520] text-white border-[#B8860B]" : "bg-white text-[#DAA520] border-amber-100"}`}
                >
                  💡 {showHint ? "힌트 끄기" : "힌트 보기"}
                </button>
              </div>
              <button
                onClick={checkAnswer}
                className="w-full py-5 bg-[#8B4513] text-white rounded-[24px] font-black text-xl shadow-lg active:scale-[0.98]"
              >
                작성 완료
              </button>
            </div>
            <div className="flex-1 relative bg-[#FDFDFD] border-4 border-dashed border-gray-200 rounded-[40px] overflow-hidden shadow-inner">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={() => setIsDrawing(false)}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={() => setIsDrawing(false)}
                className="absolute inset-0 w-full h-full touch-none z-10"
              />
              <canvas ref={hiddenCanvasRef} className="hidden" />
            </div>
          </>
        ) : (
          <div className="w-full flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-300">
            <div className="bg-amber-50 w-full max-w-lg p-16 rounded-[60px] text-center border-4 border-amber-100 shadow-xl">
              <p className="text-[#DAA520] font-black tracking-[0.2em] text-lg mb-6 uppercase">
                {currentIndex < words.length - 1 ? "Great!" : "Excellent!"}
              </p>
              <div className="text-[120px] mb-4">{currentWord.emoji}</div>
              <h4 className="text-9xl font-black text-[#8B4513]">
                {currentWord.answer}
              </h4>
            </div>
            <button
              onClick={handleNext}
              className="w-full max-w-lg py-7 bg-[#8B4513] text-white rounded-[32px] font-black text-3xl shadow-2xl active:scale-95 transition-transform"
            >
              {currentIndex < words.length - 1 ? "다음 문제" : "결과 확인하기"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
