"use client";
import { Suspense } from 'react';

export const dynamic = "force-dynamic";


// ============================================
// 로딩 컴포넌트
// ============================================
function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center h-screen bg-white">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#DAA520] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-xl font-bold text-[#8B4513]">로딩 중...</p>
      </div>
    </div>
  );
}

// ============================================
// 메인 페이지
// ============================================
export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Step1Client />
    </Suspense>
  );
}

// ============================================
// 클라이언트 컴포넌트 (useSearchParams 사용)
// ============================================


import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { REHAB_PROTOCOLS, PlaceType } from "@/constants/trainingData";
import { loadPatientProfile } from "@/lib/patientStorage";
import { SessionManager, Step1Result } from "@/lib/kwab/SessionManager";

let GLOBAL_SPEECH_LOCK: Record<number, boolean> = {};

function Step1Client() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const placeParam = (searchParams.get("place") as PlaceType) || "home";

  const [isMounted, setIsMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [canAnswer, setCanAnswer] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [questionResults, setQuestionResults] = useState<
    Array<{
      question: string;
      userAnswer: boolean | null;
      correctAnswer: boolean;
      isCorrect: boolean;
      responseTime: number;
    }>
  >([]);

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

  const trainingData = useMemo(() => {
    const protocol = REHAB_PROTOCOLS[placeParam] || REHAB_PROTOCOLS.home;
    const combined = [
      ...protocol.basic,
      ...protocol.intermediate,
      ...protocol.advanced,
    ];

    const questions = combined.slice(0, 10);
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [placeParam]);

  const currentItem = trainingData[currentIndex];

  const playInstruction = useCallback(
    (text: string) => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        setIsSpeaking(true);
        setCanAnswer(false);
        setTimeLeft(null);

        if (utteranceRef.current) {
          window.speechSynthesis.cancel();
          utteranceRef.current = null;
        }

        setTimeout(() => {
          const msg = new SpeechSynthesisUtterance(text);
          msg.lang = "ko-KR";
          msg.rate = 0.85;

          const voices = window.speechSynthesis.getVoices();
          const koVoice = voices.find((v) => v.lang.includes("ko"));
          if (koVoice) msg.voice = koVoice;

          msg.onend = () => {
            utteranceRef.current = null;
            setIsSpeaking(false);
            setCanAnswer(true);
            setTimeLeft(currentItem?.duration || 10);
            setQuestionStartTime(Date.now());
          };

          msg.onerror = () => {
            setIsSpeaking(false);
            setCanAnswer(true);
            setTimeLeft(currentItem?.duration || 10);
          };

          utteranceRef.current = msg;
          window.speechSynthesis.speak(msg);
        }, 300);
      }
    },
    [currentItem],
  );

  const handleAnswer = useCallback(
    (userAnswer: boolean | null) => {
      if (isAnswered || !currentItem) return;

      setIsAnswered(true);
      setCanAnswer(false);

      const isCorrect =
        userAnswer === null ? false : currentItem.answer === userAnswer;

      const nextScore = isCorrect ? score + 1 : score;

      const responseTime =
        userAnswer === null
          ? (currentItem.duration || 10) * 1000
          : questionStartTime > 0
            ? Date.now() - questionStartTime
            : 0;

      const questionResult = {
        question: currentItem.question,
        userAnswer: userAnswer,
        correctAnswer: currentItem.answer,
        isCorrect: isCorrect,
        responseTime: responseTime,
      };

      const updatedResults = [...questionResults, questionResult];
      setQuestionResults(updatedResults);

      if (isCorrect) setScore((prev) => prev + 1);

      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setTimeLeft(null);

      setTimeout(() => {
        if (currentIndex < trainingData.length - 1) {
          setCurrentIndex((prev) => prev + 1);
          setIsAnswered(false);
        } else {
          const patient = loadPatientProfile();
          if (patient) {
            const sessionManager = new SessionManager(
              { age: patient.age, educationYears: patient.educationYears || 0 },
              placeParam,
            );

            const step1Result: Step1Result = {
              correctAnswers: nextScore,
              totalQuestions: trainingData.length,
              averageResponseTime:
                updatedResults.reduce((acc, cur) => acc + cur.responseTime, 0) /
                updatedResults.length,
              timestamp: Date.now(),
              items: updatedResults,
            };
            sessionManager.saveStep1Result(step1Result);
          }
          router.push(`/step-2?score=${nextScore}&place=${placeParam}`);
        }
      }, 500);
    },
    [
      currentIndex,
      currentItem,
      score,
      trainingData.length,
      router,
      placeParam,
      isAnswered,
      questionStartTime,
      questionResults,
    ],
  );

  useEffect(() => {
    if (!isMounted || !currentItem) return;
    if (GLOBAL_SPEECH_LOCK[currentIndex]) return;

    GLOBAL_SPEECH_LOCK[currentIndex] = true;
    setCanAnswer(false);
    setIsSpeaking(true);

    const timer = setTimeout(
      () => {
        playInstruction(currentItem.question);
      },
      currentIndex === 0 ? 500 : 800,
    );

    return () => clearTimeout(timer);
  }, [currentIndex, isMounted, currentItem, playInstruction]);

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

  const isInteractionDisabled =
    !isMounted || isSpeaking || isAnswered || !canAnswer;

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      <header className="px-10 py-6 border-b border-gray-50 flex justify-between items-center bg-white shrink-0">
        <div className="text-left">
          <span className="text-[#DAA520] font-black text-[11px] tracking-[0.2em] uppercase">
            Step 01 • {placeParam.toUpperCase()}
          </span>
          <h2 className="text-2xl font-black text-[#8B4513] tracking-tighter">
            청각 이해 사실 판단
          </h2>
        </div>
        <div
          className={`px-6 py-2 rounded-full font-black text-2xl transition-all duration-500 shadow-sm ${
            isSpeaking
              ? "bg-gray-50 text-gray-200"
              : "bg-[#F8F9FA] text-[#DAA520]"
          }`}
        >
          {isSpeaking ? "LISTENING" : `${timeLeft ?? currentItem.duration}s`}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 overflow-hidden relative">
        <div className="w-full max-w-4xl flex flex-col items-center gap-10">
          <div className="h-32 flex items-center justify-center">
            <div
              className={`px-10 py-6 rounded-[40px] shadow-xl transition-all duration-500 border-4 ${
                !isSpeaking && timeLeft !== null && timeLeft <= 5
                  ? "bg-amber-500 border-transparent scale-105 text-white"
                  : "bg-white border-[#DAA520]/15 text-[#8B4513]"
              }`}
            >
              <p className="text-3xl font-black tracking-tight leading-tight">
                {isSpeaking ? "문제를 잘 들어보세요" : "정답을 골라주세요"}
              </p>
            </div>
          </div>

          <div className="h-44 flex flex-col items-center justify-center gap-3">
            <button
              onClick={() => playInstruction(currentItem.question)}
              disabled={isInteractionDisabled}
              className={`w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all active:scale-95 border-4 ${
                isInteractionDisabled
                  ? "bg-gray-50 border-gray-200 pointer-events-none opacity-30"
                  : "bg-white border-[#DAA520]/10 hover:border-[#DAA520]"
              }`}
            >
              <span className={`text-5xl ${isSpeaking ? "animate-pulse" : ""}`}>
                🔊
              </span>
            </button>
            <span className="text-[10px] font-black text-[#DAA520] tracking-widest uppercase">
              {isSpeaking ? "재생 중" : "다시 듣기"}
            </span>
          </div>

          <div className="flex gap-10">
            <button
              disabled={isInteractionDisabled}
              onClick={() => handleAnswer(true)}
              className="w-52 h-52 bg-white rounded-[60px] text-[120px] shadow-2xl border-2 border-gray-50 flex items-center justify-center transition-all hover:border-blue-200 active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed"
            >
              ⭕
            </button>
            <button
              disabled={isInteractionDisabled}
              onClick={() => handleAnswer(false)}
              className="w-52 h-52 bg-white rounded-[60px] text-[120px] shadow-2xl border-2 border-gray-50 flex items-center justify-center transition-all hover:border-red-200 active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed"
            >
              ❌
            </button>
          </div>
        </div>
      </main>

      <footer className="px-10 py-6 border-t border-gray-50 bg-white shrink-0">
        <div className="max-w-xl mx-auto flex items-center gap-5">
          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-[#DAA520] transition-all duration-1000 ease-out"
              style={{
                width: `${((currentIndex + 1) / trainingData.length) * 100}%`,
              }}
            />
          </div>
          <span className="shrink-0 font-black text-[#8B4513]/30 text-xs tracking-widest">
            {Math.min(currentIndex + 1, trainingData.length)} /{" "}
            {trainingData.length}
          </span>
        </div>
      </footer>
    </div>
  );
}
