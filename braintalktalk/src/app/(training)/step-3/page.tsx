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
import {
  VISUAL_MATCHING_IMAGE_FILENAME_MAP,
  VISUAL_MATCHING_PROTOCOLS,
  VISUAL_MATCHING_RECOMMENDED_COUNT,
} from "@/constants/visualTrainingData";
import { useTraining } from "../TrainingContext";
import { AnalysisSidebar } from "@/components/training/AnalysisSidebar";
import { SessionManager } from "@/lib/kwab/SessionManager";
import { loadPatientProfile } from "@/lib/patientStorage";

export const dynamic = "force-dynamic";

type VisualOption = {
  id: string;
  label: string;
  img?: string;
  emoji?: string;
};

let GLOBAL_SPEECH_LOCK: Record<number, boolean> = {};
const STEP3_IMAGE_BASE_URL =
  (
    process.env.NEXT_PUBLIC_STEP3_IMAGE_BASE_URL ||
    "https://cdn.jsdelivr.net/gh/BUGISU/braintalktalk-assets@main/step3"
  ).replace(/\/$/, "");

const toTwemojiSvgUrl = (emoji: string) => {
  const codePoints = Array.from(emoji).map((char) =>
    char.codePointAt(0)?.toString(16),
  );
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codePoints.join("-")}.svg`;
};

const buildNameVariants = (baseName: string) => {
  const variants = new Set<string>();
  variants.add(baseName);
  variants.add(baseName.replace(/-/g, ""));
  variants.add(baseName.replace(/-/g, "_"));
  variants.add(baseName.split("-")[0]);
  return Array.from(variants).filter(Boolean);
};

const buildImageCandidates = (
  place: PlaceType,
  option: VisualOption,
): string[] => {
  const candidates: string[] = [];

  if (option.img) candidates.push(option.img);

  const mappedBaseName = VISUAL_MATCHING_IMAGE_FILENAME_MAP[place]?.[option.label];
  if (mappedBaseName) {
    for (const nameVariant of buildNameVariants(mappedBaseName)) {
      candidates.push(
        `${STEP3_IMAGE_BASE_URL}/${place}/${nameVariant}.png`,
        `${STEP3_IMAGE_BASE_URL}/${place}/${nameVariant}.jpg`,
        `${STEP3_IMAGE_BASE_URL}/${place}/${nameVariant}.jpeg`,
        `${STEP3_IMAGE_BASE_URL}/${nameVariant}.png`,
        `${STEP3_IMAGE_BASE_URL}/${nameVariant}.jpg`,
        `${STEP3_IMAGE_BASE_URL}/${nameVariant}.jpeg`,
      );
    }
  }

  candidates.push(
    `${STEP3_IMAGE_BASE_URL}/${place}/${encodeURIComponent(option.label)}.png`,
    `${STEP3_IMAGE_BASE_URL}/${place}/${encodeURIComponent(option.label)}.jpg`,
    `${STEP3_IMAGE_BASE_URL}/${place}/${encodeURIComponent(option.label)}.jpeg`,
    `${STEP3_IMAGE_BASE_URL}/${encodeURIComponent(option.label)}.png`,
    `${STEP3_IMAGE_BASE_URL}/${encodeURIComponent(option.label)}.jpg`,
    `${STEP3_IMAGE_BASE_URL}/${encodeURIComponent(option.label)}.jpeg`,
  );

  if (option.emoji) candidates.push(toTwemojiSvgUrl(option.emoji));

  return Array.from(new Set(candidates.filter(Boolean)));
};

function Step3Content() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { updateClinical, sidebarMetrics } = useTraining();
  const place = (searchParams?.get("place") as PlaceType) || "home";

  const [isMounted, setIsMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showResult, setShowResult] = useState<boolean | null>(null);
  const [playCount, setPlayCount] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [canAnswer, setCanAnswer] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const protocol = useMemo(() => {
    const allQuestions = (
      VISUAL_MATCHING_PROTOCOLS[place] || VISUAL_MATCHING_PROTOCOLS.home
    ).slice(0, VISUAL_MATCHING_RECOMMENDED_COUNT);
    return [...allQuestions].sort(() => Math.random() - 0.5);
  }, [place]);

  const currentItem = protocol[currentIndex];

  useEffect(() => {
    setIsMounted(true);
    GLOBAL_SPEECH_LOCK = {};
    localStorage.removeItem("step3_data"); // ✅ 초기화

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis)
        window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (!updateClinical) return;

    const correctCount = analysisResults.filter((r) => r.isCorrect).length;
    const totalAttempted = analysisResults.length;
    const currentAcc =
      totalAttempted > 0 ? (correctCount / totalAttempted) * 100 : 95.2;

    updateClinical({
      analysisAccuracy: currentAcc,
      reliability: 0.8 + (sidebarMetrics.facialSymmetry || 0) * 0.2,
      stability: isAnswered ? 4.1 : 5.8 + Math.random(),
      systemLatency: 38 + Math.floor(Math.random() * 7),
      correlation: 0.88 + (correctCount / totalAttempted) * 0.1,
    });
  }, [
    analysisResults,
    sidebarMetrics.facialSymmetry,
    isAnswered,
    updateClinical,
  ]);

  const speakWord = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    setCanAnswer(false);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 0.85;
    utterance.onend = () => {
      setIsSpeaking(false);
      setCanAnswer(true);
    };
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    if (!isMounted || !currentItem || GLOBAL_SPEECH_LOCK[currentIndex]) return;
    GLOBAL_SPEECH_LOCK[currentIndex] = true;
    const timer = setTimeout(() => speakWord(currentItem.targetWord), 800);
    return () => clearTimeout(timer);
  }, [currentIndex, isMounted, currentItem, speakWord]);

  const handleReplay = () => {
    if (
      playCount < 1 &&
      !selectedId &&
      !isSpeaking &&
      !isAnswered &&
      canAnswer
    ) {
      speakWord(currentItem.targetWord);
      setPlayCount((prev) => prev + 1);
    }
  };
  const replayEnabled =
    playCount < 1 && !isSpeaking && !isAnswered && canAnswer;

  const handleOptionClick = (id: string) => {
    if (!canAnswer || selectedId || isAnswered) return;
    const isCorrect = id === currentItem.answerId;
    setSelectedId(id);
    setShowResult(isCorrect);
    setIsAnswered(true);
    setCanAnswer(false);

    // ✅ 현재 문제의 결과 생성 (Result 페이지 규격)
    const currentResult = {
      text: currentItem.targetWord, // 들려준 단어
      userAnswer: id,
      isCorrect: isCorrect,
      timestamp: new Date().toLocaleTimeString(),
    };

    // ✅ 누적 결과 업데이트
    const updatedResults = [...analysisResults, currentResult];
    setAnalysisResults(updatedResults);

    // ✅ Result 페이지용 백업 저장 (실시간)
    localStorage.setItem("step3_data", JSON.stringify(updatedResults));
    console.log("✅ Step 3 데이터 저장:", updatedResults);

    setTimeout(() => {
      if (currentIndex < protocol.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedId(null);
        setShowResult(null);
        setIsAnswered(false);
        setPlayCount(0);
      } else {
        // ✅ 최종 점수 계산 (백분율)
        const avgScore = Math.round(
          (updatedResults.filter((r) => r.isCorrect).length /
            updatedResults.length) *
            100,
        );

        // ✅ SessionManager 통합 저장
        try {
          const patient = loadPatientProfile();
          const sm = new SessionManager(
            (patient || { age: 70, educationYears: 12 }) as any,
            place,
          );

          sm.saveStep3Result({
            items: updatedResults,
            score: avgScore,
            correctCount: updatedResults.filter((r) => r.isCorrect).length,
            totalCount: updatedResults.length,
            timestamp: Date.now(),
          });

          console.log("✅ Step 3 SessionManager 저장 완료");
        } catch (e) {
          console.error("❌ Step 3 SessionManager 저장 실패:", e);
        }

        router.push(
          `/step-4?place=${place}&step1=${searchParams.get("step1")}&step2=${searchParams.get("step2")}&step3=${avgScore}`,
        );
      }
    }, 1500);
  };

  if (!isMounted || !currentItem) return null;

  return (
    <div className="flex flex-col h-full bg-[#FBFBFC] overflow-hidden text-slate-900 font-sans">
      <header className="h-16 lg:h-20 px-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-xs">
            03
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm lg:text-base font-black text-slate-800 leading-none">
              단어-그림 매칭
            </h2>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter italic">
              Visual-Auditory Association
            </p>
          </div>
        </div>
        <div className="bg-orange-50 px-3 py-1.5 rounded-full font-black text-[11px] text-orange-600">
          {currentIndex + 1} / {protocol.length}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex flex-col min-h-0 bg-[#FBFBFC]">
          <div className="w-full max-w-5xl mx-auto px-6 py-4 flex flex-col h-full min-h-0 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 border-b border-slate-100 pb-3 shrink-0">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-orange-50 rounded-md">
                  <span className="w-1 h-1 rounded-full bg-orange-500" />
                  <p className="text-orange-600 font-bold text-[9px] uppercase tracking-wider">
                    Step 03
                  </p>
                </div>
                <h1 className="text-xl lg:text-2xl font-black text-slate-800 break-keep">
                  {isSpeaking
                    ? "문제를 잘 들어보세요"
                    : "알맞은 그림을 선택하세요"}
                </h1>
              </div>

              <button
                onClick={handleReplay}
                disabled={!replayEnabled}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm active:scale-95 shrink-0 mb-1 pointer-events-auto transition-colors ${
                  replayEnabled
                    ? "bg-orange-50 border-orange-200 hover:bg-orange-100"
                    : "bg-white border-slate-200 opacity-60"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    replayEnabled ? "bg-orange-500" : "bg-slate-300"
                  }`}
                >
                  <svg
                    className="w-3 h-3 text-white"
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
                  </svg>
                </div>
                <span
                  className={`text-xs font-black ${
                    replayEnabled ? "text-orange-700" : "text-slate-400"
                  }`}
                >
                  다시 듣기
                </span>
              </button>
            </div>

            <div className="flex-1 min-h-0 flex items-center justify-center pb-6">
              <div className="grid grid-cols-3 gap-4 w-full h-full max-h-[60vh]">
                {currentItem.options.map((option: VisualOption) => {
                  const imageCandidates = buildImageCandidates(place, option);
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleOptionClick(option.id)}
                      disabled={isSpeaking || isAnswered || !canAnswer}
                      className={`relative z-20 w-full h-full rounded-[24px] flex items-center justify-center transition-all border shadow-sm bg-white overflow-hidden pointer-events-auto
                    ${selectedId === option.id ? (showResult ? "border-emerald-500 ring-4 ring-emerald-50 scale-105" : "border-slate-800 opacity-60 scale-95") : "border-slate-100 hover:border-orange-100 hover:shadow-md"}`}
                    >
                      <div className="w-full h-full p-4 flex items-center justify-center pointer-events-none">
                        {option.img || option.emoji ? (
                          <>
                            <img
                              src={imageCandidates[0]}
                              data-candidate-index="0"
                              alt={option.label}
                              className="w-16 h-16 lg:w-20 lg:h-20 object-contain"
                              loading="lazy"
                              decoding="async"
                              onError={(e) => {
                                const currentIndex = Number(
                                  e.currentTarget.dataset.candidateIndex || "0",
                                );
                                const nextIndex = currentIndex + 1;
                                const nextSrc = imageCandidates[nextIndex];

                                if (nextSrc) {
                                  e.currentTarget.dataset.candidateIndex =
                                    String(nextIndex);
                                  e.currentTarget.src = nextSrc;
                                } else {
                                  e.currentTarget.style.display = "none";
                                  const fallback =
                                    e.currentTarget
                                      .nextElementSibling as HTMLSpanElement | null;
                                  if (fallback) fallback.style.display = "inline";
                                }
                              }}
                            />
                            <span className="text-4xl lg:text-5xl hidden">
                              {option.emoji || "🖼️"}
                            </span>
                          </>
                        ) : (
                          <span className="text-4xl lg:text-5xl">
                            {option.emoji || "🖼️"}
                          </span>
                        )}
                      </div>
                      {selectedId === option.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm animate-in fade-in zoom-in pointer-events-none">
                          <span
                            className={`text-6xl font-black ${showResult ? "text-emerald-500" : "text-slate-800"}`}
                          >
                            {showResult ? "O" : "X"}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </main>

        <aside className="w-[380px] border-l border-slate-50 bg-white p-4 hidden lg:flex flex-col overflow-hidden">
          <AnalysisSidebar
            videoRef={videoRef}
            canvasRef={canvasRef}
            isFaceReady={sidebarMetrics.faceDetected}
            metrics={{
              symmetryScore: (sidebarMetrics.facialSymmetry || 0) * 100,
              openingRatio: (sidebarMetrics.mouthOpening || 0) * 100,
              audioLevel: isSpeaking ? 25 : 0,
            }}
            showTracking={true}
            scoreLabel="진행도"
            scoreValue={`${currentIndex + (isAnswered ? 1 : 0)} / ${protocol.length}`}
          />
        </aside>
      </div>
    </div>
  );
}

export default function Step3Page() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center text-orange-500 font-black">
          LOADING...
        </div>
      }
    >
      <Step3Content />
    </Suspense>
  );
}
