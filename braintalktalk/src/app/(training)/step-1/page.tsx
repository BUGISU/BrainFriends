// src/app/(training)/step-1/page.tsx
"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { REHAB_PROTOCOLS, PlaceType } from "@/constants/trainingData";

let GLOBAL_SPEECH_LOCK: Record<number, boolean> = {};

export default function Step1Page() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const placeParam = (searchParams.get("place") as PlaceType) || "home";

  const [isMounted, setIsMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false); // 🔹 음성 재생 중 상태 추가

  useEffect(() => {
    setIsMounted(true);
    GLOBAL_SPEECH_LOCK = {};
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const trainingData = useMemo(() => {
    const protocol = REHAB_PROTOCOLS[placeParam] || REHAB_PROTOCOLS.home;
    return [...protocol.basic, ...protocol.intermediate, ...protocol.advanced];
  }, [placeParam]);

  const currentItem = trainingData[currentIndex];

  // 🔹 수정된 playInstruction: 음성이 끝나면 타이머를 시작함
  const playInstruction = useCallback(
    (text: string) => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsSpeaking(true); // 음성 시작 알림
        setTimeLeft(null); // 음성 중에는 타이머 정지

        setTimeout(() => {
          const msg = new SpeechSynthesisUtterance(text);
          msg.lang = "ko-KR";
          msg.rate = 0.85;

          // ✅ 음성 재생이 끝났을 때 실행될 로직
          msg.onend = () => {
            setIsSpeaking(false);
            setTimeLeft(currentItem.duration); // 음성이 끝나면 그때 데이터에 정의된 시간 주입
          };

          window.speechSynthesis.speak(msg);
        }, 300);
      }
    },
    [currentItem],
  );

  const handleAnswer = useCallback(
    (userAnswer: boolean | null) => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (!currentItem) return;

      const isCorrect =
        userAnswer === null ? false : currentItem.answer === userAnswer;
      const nextScore = isCorrect ? score + 1 : score;

      if (isCorrect) setScore((prev) => prev + 1);
      setTimeLeft(null);

      if (currentIndex < trainingData.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        router.push(`/step-2?score=${nextScore}&place=${placeParam}`);
      }
    },
    [currentIndex, currentItem, score, trainingData.length, router, placeParam],
  );

  // 🔹 페이지 진입 시 첫 음성 실행
  useEffect(() => {
    if (!isMounted || !currentItem) return;
    if (GLOBAL_SPEECH_LOCK[currentIndex]) return;

    GLOBAL_SPEECH_LOCK[currentIndex] = true;

    const timer = setTimeout(
      () => {
        playInstruction(currentItem.question);
      },
      currentIndex === 0 ? 1500 : 800,
    );

    return () => clearTimeout(timer);
  }, [currentIndex, isMounted, currentItem, playInstruction]);

  // 🔹 타이머 로직: timeLeft가 있을 때만 작동
  useEffect(() => {
    if (!isMounted || timeLeft === null || isSpeaking) return;

    if (timeLeft <= 0) {
      handleAnswer(null);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isMounted, timeLeft, isSpeaking, handleAnswer]);

  if (!isMounted || !currentItem) return null;

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden text-black font-sans">
      <header className="flex justify-between items-center px-10 py-4 border-b border-gray-50">
        <div className="text-left">
          <span className="text-[#DAA520] font-black text-[10px] tracking-widest uppercase block mb-0.5">
            Step 01 • {placeParam.toUpperCase()}
          </span>
          <h2 className="text-2xl font-black text-[#8B4513] tracking-tighter">
            청각 이해 사실 판단
          </h2>
        </div>

        {/* 🔹 타이머 UI: 음성 중에는 '대기' 상태 표시 가능 */}
        <div
          className={`px-6 py-1.5 rounded-[20px] font-black text-[32px] transition-all duration-500 shadow-sm ${
            isSpeaking
              ? "bg-gray-100 text-gray-300" // 음성 중일 때 색상
              : timeLeft !== null && timeLeft <= 5
                ? "bg-amber-500 text-white scale-105 shadow-amber-200"
                : "bg-[#F8F9FA] text-[#DAA520]"
          }`}
        >
          {isSpeaking ? "👂" : `${timeLeft ?? currentItem.duration}s`}
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-6">
        <div className="relative mb-2">
          <div
            className={`
              inline-block px-10 py-5 rounded-[35px] shadow-xl transition-all duration-500 text-center
              ${
                !isSpeaking && timeLeft !== null && timeLeft <= 5
                  ? "bg-amber-500 border-transparent scale-105"
                  : "bg-white border-4 border-[#DAA520]/15"
              }
            `}
          >
            <p
              className={`text-3xl font-black tracking-tight leading-tight ${
                !isSpeaking && timeLeft !== null && timeLeft <= 5
                  ? "text-white"
                  : "text-[#8B4513]"
              }`}
            >
              {isSpeaking
                ? "문제를 잘 들어보세요"
                : timeLeft !== null && timeLeft <= 5
                  ? "천천히 생각해보시고 눌러주세요"
                  : "정답을 골라주세요"}
            </p>
            <div
              className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-6 h-6 rotate-45 ${
                !isSpeaking && timeLeft !== null && timeLeft <= 5
                  ? "bg-amber-500"
                  : "bg-white border-r-4 border-b-4 border-[#DAA520]/10"
              }`}
            />
          </div>
        </div>

        <button
          onClick={() => playInstruction(currentItem.question)}
          className={`group w-36 h-36 rounded-full flex flex-col items-center justify-center shadow-md border-2 transition-all active:scale-95 ${
            isSpeaking
              ? "bg-amber-50 border-amber-300 pointer-events-none"
              : "bg-[#F8F9FA] border-[#DAA520]/10 hover:border-[#DAA520]"
          }`}
        >
          <span
            className={`text-6xl mb-1 ${isSpeaking ? "animate-pulse" : "group-hover:scale-110 transition-transform"}`}
          >
            {isSpeaking ? "🔊" : "🔊"}
          </span>
          <span className="text-[10px] font-black text-[#DAA520] tracking-widest uppercase">
            {isSpeaking ? "말하는 중..." : "다시 듣기"}
          </span>
        </button>

        <div className="flex gap-8">
          <button
            disabled={isSpeaking}
            onClick={() => handleAnswer(true)}
            className={`w-48 h-48 bg-white rounded-[50px] text-[110px] shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] border-2 flex items-center justify-center transition-all duration-300 ${
              isSpeaking
                ? "opacity-50 cursor-not-allowed"
                : "active:scale-90 hover:border-blue-200"
            }`}
          >
            ⭕
          </button>
          <button
            disabled={isSpeaking}
            onClick={() => handleAnswer(false)}
            className={`w-48 h-48 bg-white rounded-[50px] text-[110px] shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] border-2 flex items-center justify-center transition-all duration-300 ${
              isSpeaking
                ? "opacity-50 cursor-not-allowed"
                : "active:scale-90 hover:border-red-200"
            }`}
          >
            ❌
          </button>
        </div>
      </div>

      <footer className="py-5 px-10 bg-[#F8F9FA]/50 border-t border-gray-50">
        <div className="max-w-xl mx-auto text-center">
          <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden mb-2 shadow-inner">
            <div
              className="h-full bg-[#DAA520] transition-all duration-500 ease-out"
              style={{
                width: `${((currentIndex + 1) / trainingData.length) * 100}%`,
              }}
            />
          </div>
          <span className="font-black text-[#8B4513]/40 text-[10px] tracking-[0.2em] uppercase">
            QUESTION {currentIndex + 1} / {trainingData.length}
          </span>
        </div>
      </footer>
    </div>
  );
}
