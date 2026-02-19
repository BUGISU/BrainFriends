"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  Suspense,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { REHAB_PROTOCOLS } from "@/constants/auditoryTrainingData";
import { PlaceType } from "@/constants/trainingData";
import { useTraining } from "../TrainingContext";
import { SessionManager } from "@/lib/kwab/SessionManager";
import { loadPatientProfile } from "@/lib/patientStorage";

let GLOBAL_SPEECH_LOCK: Record<number, boolean> = {};

function Step1Content() {
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
  const [replayCount, setReplayCount] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [questionResults, setQuestionResults] = useState<any[]>([]);

  const { updateClinical, sidebarMetrics } = useTraining();

  useEffect(() => {
    setIsMounted(true);
    GLOBAL_SPEECH_LOCK = {};

    console.group("🎯 Step 1 초기화");
    console.log("장소:", placeParam);
    console.log("초기 점수:", 0);
    console.log("총 문제 수:", 10);
    console.groupEnd();

    return () => {
      if (typeof window !== "undefined") window.speechSynthesis.cancel();
    };
  }, [placeParam]);

  useEffect(() => {
    if (!updateClinical) return;

    const totalAttempted = currentIndex + (isAnswered ? 1 : 0);
    const accuracy = totalAttempted > 0 ? (score / totalAttempted) * 100 : 95.2;

    updateClinical({
      analysisAccuracy: accuracy,
      correlation: 0.85 + accuracy / 1000, // 정답률에 비례한 상관계수
      stability: Math.max(2, 10 - accuracy / 10), // 정답률 높을수록 안정성 높음
    });
  }, [score, currentIndex, isAnswered, updateClinical]);

  const trainingData = useMemo(() => {
    const protocol = REHAB_PROTOCOLS[placeParam] || REHAB_PROTOCOLS.home;
    const combined = [
      ...protocol.basic,
      ...protocol.intermediate,
      ...protocol.advanced,
    ];
    return combined.sort(() => Math.random() - 0.5).slice(0, 10);
  }, [placeParam]);

  const currentItem = trainingData[currentIndex];

  const speakWord = useCallback(
    (text: string) => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        console.log(`🔊 음성 출력: "${text}"`);
        setIsSpeaking(true);
        setCanAnswer(false);
        setTimeLeft(null);
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = "ko-KR";
        msg.rate = 0.85;
        msg.onend = () => {
          setIsSpeaking(false);
          setCanAnswer(true);
          setTimeLeft(currentItem?.duration || 10);
          setQuestionStartTime(Date.now());
          console.log("✅ 음성 출력 완료, 답변 가능");
        };
        window.speechSynthesis.speak(msg);
      }
    },
    [currentItem],
  );

  const saveStep1Results = useCallback(
    (results: any[], finalScore: number) => {
      try {
        const patient = loadPatientProfile();
        const sessionManager = new SessionManager(
          (patient || { age: 70, educationYears: 12 }) as any,
          placeParam,
        );

        // 1. ✅ Result 페이지용 백업 (text 필드 사용)
        const formattedForResult = results.map((r) => ({
          text: r.question,
          userAnswer: r.userAnswer,
          isCorrect: r.isCorrect,
          responseTime: r.responseTime,
          timestamp: new Date().toLocaleTimeString(),
        }));

        localStorage.setItem("step1_data", JSON.stringify(formattedForResult));
        console.log("✅ Step 1 Result 페이지용 백업 저장:", formattedForResult);

        // 2. ✅ SessionManager용 데이터 (question 필드 사용)
        const formattedForSession = results.map((r) => ({
          question: r.question,
          userAnswer: r.userAnswer,
          correctAnswer: r.correctAnswer,
          isCorrect: r.isCorrect,
          responseTime: r.responseTime,
        }));

        const step1Data = {
          correctAnswers: results.filter((r) => r.isCorrect).length,
          totalQuestions: results.length,
          averageResponseTime:
            results.reduce((a, b) => a + b.responseTime, 0) / results.length,
          timestamp: Date.now(),
          items: formattedForSession,
        };

        sessionManager.saveStep1Result(step1Data);
        console.log("✅ Step 1 SessionManager 저장 완료:", step1Data);

        const verification = localStorage.getItem("kwab_training_session");
        const verifiedData = JSON.parse(verification || "{}");
        console.log("✅ 저장 검증 - step1 데이터:", verifiedData.step1);
      } catch (error) {
        console.error("❌ Step 1 저장 실패:", error);
      }
    },
    [placeParam],
  );

  const handleAnswer = useCallback(
    (userAnswer: boolean | null) => {
      if (isAnswered || !currentItem) return;
      setIsAnswered(true);
      setCanAnswer(false);

      const isCorrect =
        userAnswer === null ? false : currentItem.answer === userAnswer;
      const responseTime =
        userAnswer === null
          ? (currentItem.duration || 10) * 1000
          : Date.now() - questionStartTime;

      const updatedResults = [
        ...questionResults,
        {
          question: currentItem.question,
          userAnswer,
          isCorrect,
          responseTime,
          correctAnswer: currentItem.answer,
        },
      ];

      console.group(`📝 ${currentIndex + 1}번 문제 완료`);
      console.log("질문:", currentItem.question);
      console.log("정답:", currentItem.answer ? "O" : "X");
      console.log(
        "사용자 답변:",
        userAnswer === null ? "시간초과" : userAnswer ? "O" : "X",
      );
      console.log("정답 여부:", isCorrect ? "✅ 정답" : "❌ 오답");
      console.log("응답 시간:", `${(responseTime / 1000).toFixed(1)}초`);
      console.log("현재 누적 점수:", isCorrect ? score + 1 : score);
      console.groupEnd();

      setQuestionResults(updatedResults);
      if (isCorrect) setScore((s) => s + 1);

      setTimeout(() => {
        if (currentIndex < trainingData.length - 1) {
          console.log(
            `➡️ 다음 문제 (${currentIndex + 2}/${trainingData.length})로 이동`,
          );
          setCurrentIndex((prev) => prev + 1);
          setIsAnswered(false);
          setReplayCount(0);
        } else {
          const finalScore = isCorrect ? score + 1 : score;

          console.group("🏁 Step 1 최종 완료");
          console.log("최종 점수:", finalScore);
          console.log(
            "정답률:",
            `${((finalScore / trainingData.length) * 100).toFixed(1)}%`,
          );
          console.groupEnd();

          saveStep1Results(updatedResults, finalScore);

          console.log(
            `🚀 Step 2로 이동 (step1=${finalScore}, place=${placeParam})`,
          );
          router.push(`/step-2?step1=${finalScore}&place=${placeParam}`);
        }
      }, 800);
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
      saveStep1Results,
    ],
  );

  useEffect(() => {
    if (!isMounted || !currentItem || GLOBAL_SPEECH_LOCK[currentIndex]) return;
    GLOBAL_SPEECH_LOCK[currentIndex] = true;
    console.log(`🎬 ${currentIndex + 1}번 문제 시작`);
    setReplayCount(0);
    const timer = setTimeout(() => speakWord(currentItem.question), 800);
    return () => clearTimeout(timer);
  }, [currentIndex, isMounted, currentItem, speakWord]);

  const handleReplay = () => {
    if (replayCount < 1 && !isSpeaking && !isAnswered && canAnswer) {
      speakWord(currentItem.question);
      setReplayCount((prev) => prev + 1);
    }
  };

  const replayEnabled = replayCount < 1 && !isSpeaking && !isAnswered && canAnswer;

  useEffect(() => {
    if (!isMounted || timeLeft === null || isSpeaking) return;
    if (timeLeft <= 0) {
      console.warn("⏰ 시간 초과!");
      handleAnswer(null);
      return;
    }
    const timer = setInterval(
      () => setTimeLeft((prev) => (prev && prev > 0 ? prev - 1 : 0)),
      1000,
    );
    return () => clearInterval(timer);
  }, [isMounted, timeLeft, isSpeaking, handleAnswer]);

  if (!isMounted || !currentItem) return null;

  return (
    <div className="flex flex-col h-full bg-[#FBFBFC] overflow-hidden text-slate-900 font-sans">
      <header className="h-16 lg:h-20 px-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-sm">
            01
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm lg:text-base font-black text-slate-800 leading-none">
              청각 이해 판단 훈련
            </h2>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter italic">
              {sidebarMetrics.faceDetected
                ? "Face Tracking Active"
                : "Waiting for Camera..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1.5 rounded-full font-black text-[11px] transition-all border ${
              isSpeaking
                ? "bg-slate-50 border-slate-100 text-slate-300"
                : "bg-white border-orange-100 text-orange-500"
            }`}
          >
            {isSpeaking
              ? "LISTENING..."
              : `${timeLeft ?? currentItem.duration}s`}
          </div>
          <div className="bg-orange-50 px-3 py-1.5 rounded-full font-black text-[11px] text-orange-600">
            {currentIndex + 1} / 10
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center py-10 px-6">
        <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-8 lg:gap-12">
          <div className="text-center space-y-6">
            <div className="space-y-3">
              <h1 className="text-2xl lg:text-3xl font-black text-slate-800 break-keep leading-tight">
                {isSpeaking ? "질문을 잘 들어보세요" : "사실이 맞나요?"}
              </h1>
              <div className="h-1.5 w-12 bg-orange-500/20 rounded-full mx-auto" />
            </div>

            <button
              onClick={handleReplay}
              disabled={!replayEnabled}
              className="group flex items-center gap-2 mx-auto px-5 py-2.5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-orange-200 hover:bg-orange-50/30 transition-all disabled:opacity-30 active:scale-95"
            >
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                <svg
                  className="w-4 h-4 text-orange-600 group-hover:text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span className="text-sm font-black text-slate-600 group-hover:text-orange-600">
                다시 듣기
              </span>
            </button>
          </div>

          <div className="flex gap-8 lg:gap-12 w-full max-w-md shrink-0 mb-4">
            <button
              disabled={isSpeaking || isAnswered || !canAnswer}
              onClick={() => handleAnswer(true)}
              className="flex-1 aspect-square max-h-[180px] bg-white rounded-[40px] text-8xl shadow-[0_12px_24px_rgba(0,0,0,0.04)] border-2 border-slate-50 flex items-center justify-center transition-all hover:border-emerald-100 hover:text-emerald-500 active:scale-95 disabled:opacity-20 text-slate-300 font-black"
            >
              O
            </button>
            <button
              disabled={isSpeaking || isAnswered || !canAnswer}
              onClick={() => handleAnswer(false)}
              className="flex-1 aspect-square max-h-[180px] bg-white rounded-[40px] text-8xl shadow-[0_12px_24px_rgba(0,0,0,0.04)] border-2 border-slate-50 flex items-center justify-center transition-all hover:border-orange-100 hover:text-orange-500 active:scale-95 disabled:opacity-20 text-slate-300 font-black"
            >
              X
            </button>
          </div>
        </div>
      </main>
      <div className="h-4 shrink-0" />
    </div>
  );
}

export default function Step1Page() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center text-orange-500 font-black">
          LOADING...
        </div>
      }
    >
      <Step1Content />
    </Suspense>
  );
}
