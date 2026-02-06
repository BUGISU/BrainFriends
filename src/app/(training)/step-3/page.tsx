"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FaceTracker from "@/components/diagnosis/FaceTracker";
import { VISUAL_MATCHING_PROTOCOLS, PlaceType } from "@/constants/trainingData";

let GLOBAL_SPEECH_LOCK: Record<number, boolean> = {};

export default function Step3Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const place = (searchParams.get("place") as PlaceType) || "home";

  const [isMounted, setIsMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [metrics, setMetrics] = useState({ symmetryScore: 0, openingRatio: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showResult, setShowResult] = useState<boolean | null>(null);
  const [playCount, setPlayCount] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [canAnswer, setCanAnswer] = useState(false); // ✅ 선택 가능 여부 상태 추가

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setIsMounted(true);
    GLOBAL_SPEECH_LOCK = {};

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
      }
    };
  }, []);

  const protocol = useMemo(() => {
    const allQuestions = (
      VISUAL_MATCHING_PROTOCOLS[place] || VISUAL_MATCHING_PROTOCOLS.home
    ).slice(0, 10);

    const shuffled = [...allQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }, [place]);

  const currentItem = protocol[currentIndex];

  const speakWord = useCallback((text: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      // ✅ 재생 시작 즉시 선택 불가 상태로 변경
      setIsSpeaking(true);
      setCanAnswer(false);

      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
      }

      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "ko-KR";
        utterance.rate = 0.9;

        const voices = window.speechSynthesis.getVoices();
        const koVoice = voices.find((v) => v.lang.includes("ko"));
        if (koVoice) utterance.voice = koVoice;

        utterance.onend = () => {
          utteranceRef.current = null;
          setIsSpeaking(false);
          setCanAnswer(true); // ✅ 음성이 끝나야 선택 가능
        };

        utterance.onerror = (e) => {
          console.error("❌ TTS 에러:", e);
          utteranceRef.current = null;
          setIsSpeaking(false);
          setCanAnswer(true);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }, 300);
    }
  }, []);

  useEffect(() => {
    if (!isMounted || !currentItem) return;
    if (GLOBAL_SPEECH_LOCK[currentIndex]) return;

    GLOBAL_SPEECH_LOCK[currentIndex] = true;
    setPlayCount(0);
    setCanAnswer(false); // ✅ 진입 시 잠금

    const timer = setTimeout(
      () => {
        speakWord(currentItem.targetWord);
      },
      currentIndex === 0 ? 500 : 800,
    );

    return () => clearTimeout(timer);
  }, [currentIndex, isMounted, currentItem, speakWord]);

  const handleReplay = () => {
    // 이미 선택했거나 재생 중이면 무시
    if (playCount < 1 && !selectedId && !isSpeaking && !isAnswered) {
      speakWord(currentItem.targetWord);
      setPlayCount((prev) => prev + 1);
    }
  };

  const handleOptionClick = (id: string) => {
    // ✅ 음성 재생 중이거나 이미 답변했으면 클릭 방지
    if (!canAnswer || selectedId || isAnswered) return;

    if (window.speechSynthesis && utteranceRef.current) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
      setIsSpeaking(false);
    }

    const isCorrect = id === currentItem.answerId;
    setSelectedId(id);
    setShowResult(isCorrect);
    setIsAnswered(true);
    setCanAnswer(false); // ✅ 답변 완료 후 추가 클릭 방지

    setTimeout(() => {
      if (currentIndex < protocol.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedId(null);
        setShowResult(null);
        setIsAnswered(false);
        // 다음 문제는 useEffect의 GLOBAL_SPEECH_LOCK에서 speakWord 호출하며 setCanAnswer 제어
      } else {
        router.push(`/step-4?place=${place}`);
      }
    }, 1200);
  };

  if (!isMounted || !currentItem) return null;

  // ✅ 버튼/선택지 공통 비활성화 조건
  const isInteractionDisabled =
    !isMounted || isSpeaking || isAnswered || !canAnswer;

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
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
        <aside className="w-[380px] border-r border-gray-50 bg-[#FCFCFC] p-8 shrink-0">
          <div className="space-y-4">
            <FaceTracker
              onMetricsUpdate={(m) =>
                setMetrics({
                  symmetryScore: m.symmetryScore,
                  openingRatio: m.openingRatio * 100,
                })
              }
            />
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
              <MetricBar
                label="안면 대칭"
                value={metrics.symmetryScore}
                unit="%"
                color="bg-emerald-500"
              />
              <MetricBar
                label="입 벌림"
                value={metrics.openingRatio}
                unit=""
                color="bg-amber-400"
              />
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col items-center justify-center bg-white px-12 overflow-y-auto">
          <section className="w-full max-w-2xl flex flex-col items-center gap-8 py-4">
            <div className="w-full flex flex-col items-center gap-6">
              <div className="h-20 flex items-center justify-center">
                <p className="text-3xl font-black text-[#8B4513]/40 uppercase tracking-[0.3em] text-center">
                  {isSpeaking
                    ? "문제를 잘 들어보세요"
                    : "문제를 듣고 알맞은 그림을 찾아보세요"}
                </p>
              </div>

              {/* 🔹 다시 듣기 버튼 */}
              <button
                onClick={handleReplay}
                disabled={playCount >= 1 || isInteractionDisabled}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl border-b-4
                  ${
                    playCount < 1 && !isInteractionDisabled
                      ? "bg-white text-[#DAA520] border-gray-100 hover:scale-105 active:scale-95 active:border-b-0 active:translate-y-1"
                      : "bg-gray-50 text-gray-300 border-transparent cursor-not-allowed scale-90"
                  }`}
              >
                <span
                  className={`text-3xl ${isSpeaking ? "animate-pulse" : ""}`}
                >
                  {isSpeaking ? "🔊" : playCount >= 1 ? "🔇" : "🔊"}
                </span>
              </button>

              <span
                className={`font-black text-sm uppercase tracking-[0.2em] ${
                  isSpeaking
                    ? "text-[#DAA520]"
                    : playCount >= 1 || isAnswered
                      ? "text-gray-300"
                      : "text-[#DAA520]"
                }`}
              >
                {isSpeaking
                  ? "재생 중"
                  : playCount >= 1 || isAnswered
                    ? "다시 듣기 완료"
                    : "다시 듣기 가능 (1회)"}
              </span>
            </div>

            {/* 🔹 그림 선택지 영역 */}
            <div className="grid grid-cols-3 gap-4 w-full max-w-lg shrink-0 pb-8">
              {currentItem.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOptionClick(option.id)}
                  // ✅ 음성 재생 중이거나 이미 답변한 경우 비활성화
                  disabled={isInteractionDisabled}
                  className={`
                    relative aspect-square rounded-[24px] flex items-center justify-center
                    transition-all duration-300 border-2 shadow-sm overflow-hidden
                    ${
                      selectedId === option.id
                        ? showResult
                          ? "bg-emerald-50 border-emerald-500 scale-105 z-10 shadow-md"
                          : "bg-red-50 border-red-500 scale-95 opacity-50"
                        : isInteractionDisabled
                          ? "bg-[#FBFBFC] border-gray-100 opacity-50 cursor-not-allowed"
                          : "bg-[#FBFBFC] border-gray-100 hover:border-[#DAA520]/40 hover:bg-white active:scale-95 shadow-sm"
                    }
                  `}
                >
                  {option.img ? (
                    <img
                      src={option.img}
                      alt=""
                      className="w-full h-full object-cover p-3"
                    />
                  ) : (
                    <span className="text-5xl select-none leading-none">
                      {option.emoji || "🖼️"}
                    </span>
                  )}

                  {selectedId === option.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-sm">
                      <span className="text-6xl">
                        {showResult ? "⭕" : "❌"}
                      </span>
                    </div>
                  )}

                  {selectedId !== null &&
                    !showResult &&
                    option.id === currentItem.answerId && (
                      <div className="absolute inset-0 border-4 border-emerald-400 rounded-[24px] animate-pulse pointer-events-none" />
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

function MetricBar({ label, value, unit, color }: any) {
  return (
    <div className="space-y-1.5 font-black">
      <div className="flex justify-between text-[10px] text-gray-400 uppercase tracking-tighter">
        <span>{label}</span>
        <span>
          {value.toFixed(1)}
          {unit}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
        <div
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}
