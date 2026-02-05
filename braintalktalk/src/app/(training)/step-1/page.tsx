"use client";

export const dynamic = "force-dynamic";

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

export default function Step1Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const placeParam = (searchParams.get("place") as PlaceType) || "home";

  const [isMounted, setIsMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [responseTimes, setResponseTimes] = useState<number[]>([]); // 반응 시간 기록
  const [questionStartTime, setQuestionStartTime] = useState<number>(0); // 문제 시작 시간

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

    // 🔹 Fisher-Yates 셔플
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
        if (utteranceRef.current) {
          window.speechSynthesis.cancel();
          utteranceRef.current = null;
        }

        setIsSpeaking(true);
        setTimeLeft(null);

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
            setTimeLeft(currentItem?.duration || 10);
            setQuestionStartTime(Date.now()); // 문제 시작 시간 기록
          };

          msg.onerror = (e) => {
            console.error("❌ TTS 에러:", e.error);
            utteranceRef.current = null;
            setIsSpeaking(false);
            setTimeLeft(currentItem?.duration || 10);
          };

          utteranceRef.current = msg;
          window.speechSynthesis.speak(msg);
        }, 300);
      }
    },
    [currentItem],
  );

  // 정답 처리 (중복 클릭 방지)
  const handleAnswer = useCallback(
    (userAnswer: boolean | null) => {
      if (isAnswered) return;

      setIsAnswered(true);

      // 반응 시간 기록
      if (questionStartTime > 0) {
        const responseTime = Date.now() - questionStartTime;
        setResponseTimes((prev) => [...prev, responseTime]);
      }

      if (window.speechSynthesis && utteranceRef.current) {
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
      }

      if (!currentItem) return;

      const isCorrect =
        userAnswer === null ? false : currentItem.answer === userAnswer;
      const nextScore = isCorrect ? score + 1 : score;

      if (isCorrect) setScore((prev) => prev + 1);
      setTimeLeft(null);

      // 마지막 문제 완료 시 K-WAB 저장
      setTimeout(() => {
        if (currentIndex < trainingData.length - 1) {
          setCurrentIndex((prev) => prev + 1);
          setIsAnswered(false);
        } else {
          // Step1 완료 - K-WAB 세션에 저장
          const patient = loadPatientProfile();
          if (patient) {
            const sessionManager = new SessionManager(
              {
                age: patient.age,
                educationYears: patient.educationYears || 0,
              },
              placeParam
            );

            const avgResponseTime =
              responseTimes.length > 0
                ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
                : 0;

            const step1Result: Step1Result = {
              correctAnswers: nextScore,
              totalQuestions: trainingData.length,
              averageResponseTime: avgResponseTime,
              timestamp: Date.now(),
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
      responseTimes,
    ],
  );

  // 🔹 문제 진입 시 자동 재생
  useEffect(() => {
    if (!isMounted || !currentItem) return;
    if (GLOBAL_SPEECH_LOCK[currentIndex]) return;

    GLOBAL_SPEECH_LOCK[currentIndex] = true;

    const timer = setTimeout(
      () => {
        playInstruction(currentItem.question);
      },
      currentIndex === 0 ? 500 : 800, // 🔹 첫 문제 0.5초로 단축
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

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* HEADER */}
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

      {/* MAIN */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 overflow-hidden relative">
        <div className="w-full max-w-4xl flex flex-col items-center gap-10">
          {/* 가이드 메시지 */}
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

          {/* 🔹 다시 듣기 버튼 (재생 중이거나 답변 완료 시 비활성) */}
          <div className="h-44 flex flex-col items-center justify-center gap-3">
            <button
              onClick={() => playInstruction(currentItem.question)}
              disabled={isSpeaking || isAnswered} // 🔹 답변 완료 시 비활성
              className={`w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all active:scale-95 border-4 ${
                isSpeaking || isAnswered
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

          {/* 🔹 O/X 선택지 (재생 중이거나 답변 완료 시 비활성) */}
          <div className="flex gap-10">
            <button
              disabled={isSpeaking || isAnswered} // 🔹 답변 완료 시 비활성
              onClick={() => handleAnswer(true)}
              className="w-52 h-52 bg-white rounded-[60px] text-[120px] shadow-2xl border-2 border-gray-50 flex items-center justify-center transition-all hover:border-blue-200 active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed"
            >
              ⭕
            </button>
            <button
              disabled={isSpeaking || isAnswered} // 🔹 답변 완료 시 비활성
              onClick={() => handleAnswer(false)}
              className="w-52 h-52 bg-white rounded-[60px] text-[120px] shadow-2xl border-2 border-gray-50 flex items-center justify-center transition-all hover:border-red-200 active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed"
            >
              ❌
            </button>
          </div>
        </div>
      </main>

      {/* FOOTER */}
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
