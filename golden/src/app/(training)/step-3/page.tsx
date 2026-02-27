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
import { HomeExitModal } from "@/components/training/HomeExitModal";
import { SessionManager } from "@/lib/kwab/SessionManager";
import { loadPatientProfile } from "@/lib/patientStorage";
import { saveTrainingExitProgress } from "@/lib/trainingExitProgress";
import { trainingButtonStyles } from "@/lib/ui/trainingButtonStyles";

export const dynamic = "force-dynamic";
const STEP3_TOTAL_QUESTIONS = 10;

type VisualOption = {
  id: string;
  label: string;
  img?: string;
  emoji?: string;
};

let GLOBAL_SPEECH_LOCK: Record<number, boolean> = {};
const STEP3_IMAGE_BASE_URL = (
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

  const mappedBaseName =
    VISUAL_MATCHING_IMAGE_FILENAME_MAP[place]?.[option.label];
  if (mappedBaseName) {
    for (const nameVariant of buildNameVariants(mappedBaseName)) {
      candidates.push(
        `${STEP3_IMAGE_BASE_URL}/${place}/${nameVariant}.png`,
        `${STEP3_IMAGE_BASE_URL}/${place}/${nameVariant}.jpg`,
        `${STEP3_IMAGE_BASE_URL}/${place}/${nameVariant}.jpeg`,
        `${STEP3_IMAGE_BASE_URL}/${place}/${nameVariant}.webp`,
        `${STEP3_IMAGE_BASE_URL}/${nameVariant}.png`,
        `${STEP3_IMAGE_BASE_URL}/${nameVariant}.jpg`,
        `${STEP3_IMAGE_BASE_URL}/${nameVariant}.jpeg`,
        `${STEP3_IMAGE_BASE_URL}/${nameVariant}.webp`,
      );
    }
  }

  candidates.push(
    `${STEP3_IMAGE_BASE_URL}/${place}/${encodeURIComponent(option.label)}.png`,
    `${STEP3_IMAGE_BASE_URL}/${place}/${encodeURIComponent(option.label)}.jpg`,
    `${STEP3_IMAGE_BASE_URL}/${place}/${encodeURIComponent(option.label)}.jpeg`,
    `${STEP3_IMAGE_BASE_URL}/${place}/${encodeURIComponent(option.label)}.webp`,
    `${STEP3_IMAGE_BASE_URL}/${encodeURIComponent(option.label)}.png`,
    `${STEP3_IMAGE_BASE_URL}/${encodeURIComponent(option.label)}.jpg`,
    `${STEP3_IMAGE_BASE_URL}/${encodeURIComponent(option.label)}.jpeg`,
    `${STEP3_IMAGE_BASE_URL}/${encodeURIComponent(option.label)}.webp`,
  );

  if (option.emoji) candidates.push(toTwemojiSvgUrl(option.emoji));

  return Array.from(new Set(candidates.filter(Boolean)));
};

const shuffleArray = <T,>(arr: T[]): T[] => {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

function Step3Content() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { sidebarMetrics } = useTraining();
  const place = (searchParams?.get("place") as PlaceType) || "home";
  const handleGoHome = () => {
    setIsHomeExitModalOpen(true);
  };
  const confirmGoHome = () => {
    saveTrainingExitProgress(place, 3);
    router.push("/select");
  };

  const [isMounted, setIsMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showResult, setShowResult] = useState<boolean | null>(null);
  const [playCount, setPlayCount] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [canAnswer, setCanAnswer] = useState(false);
  const [isPreloadingImages, setIsPreloadingImages] = useState(false);
  const [resolvedImageMap, setResolvedImageMap] = useState<
    Record<string, string>
  >({});
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [isHomeExitModalOpen, setIsHomeExitModalOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef<Record<string, string>>({});

  const protocol = useMemo(() => {
    const allQuestions = (
      VISUAL_MATCHING_PROTOCOLS[place] || VISUAL_MATCHING_PROTOCOLS.home
    ).slice(0, VISUAL_MATCHING_RECOMMENDED_COUNT);
    const sampledQuestions = shuffleArray(allQuestions).slice(
      0,
      STEP3_TOTAL_QUESTIONS,
    );

    // 문항 순서 랜덤 + 문항 내부 보기 순서 랜덤(정답 위치 고정 방지)
    return sampledQuestions.map((q) => {
      const shuffledOptions = shuffleArray(q.options);
      const shuffledAnswer = shuffledOptions.find(
        (opt) => opt.label === q.targetWord,
      );
      return {
        ...q,
        options: shuffledOptions,
        answerId: shuffledAnswer?.id ?? q.answerId,
      };
    });
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

  const speakWord = useCallback((text: string) => {
    if (typeof window === "undefined") return;
    setIsSpeaking(true);
    setCanAnswer(false);
    const synth = window.speechSynthesis;
    synth.cancel();
    synth.resume();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 0.85;
    const koVoice = synth
      .getVoices()
      .find((v) => v.lang?.toLowerCase().startsWith("ko"));
    if (koVoice) utterance.voice = koVoice;
    utterance.onend = () => {
      setIsSpeaking(false);
      setCanAnswer(true);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setCanAnswer(true);
    };
    synth.speak(utterance);
  }, []);

  useEffect(() => {
    if (!isMounted || !currentItem || GLOBAL_SPEECH_LOCK[currentIndex]) return;
    GLOBAL_SPEECH_LOCK[currentIndex] = true;
    const timer = setTimeout(() => speakWord(currentItem.targetWord), 800);
    return () => clearTimeout(timer);
  }, [currentIndex, isMounted, currentItem, speakWord]);

  const findFirstLoadableImage = useCallback(async (candidates: string[]) => {
    for (const url of candidates) {
      const loaded = await new Promise<boolean>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
      });
      if (loaded) return url;
    }
    return "";
  }, []);

  useEffect(() => {
    if (!currentItem) return;
    let active = true;
    setIsPreloadingImages(true);
    setResolvedImageMap({});

    (async () => {
      const entries = await Promise.all(
        currentItem.options.map(async (option: VisualOption) => {
          const cacheKey = `${place}:${option.label}`;
          const cached = imageCacheRef.current[cacheKey];
          if (cached) return [option.id, cached] as const;

          const resolved = await findFirstLoadableImage(
            buildImageCandidates(place, option),
          );
          if (resolved) imageCacheRef.current[cacheKey] = resolved;
          return [option.id, resolved] as const;
        }),
      );

      if (!active) return;
      setResolvedImageMap(Object.fromEntries(entries));
      setIsPreloadingImages(false);
    })();

    return () => {
      active = false;
    };
  }, [currentItem, findFirstLoadableImage, place]);

  const handleReplay = () => {
    if (
      playCount < 1 &&
      !selectedId &&
      !isSpeaking &&
      !isAnswered &&
      canAnswer &&
      !isPreloadingImages
    ) {
      speakWord(currentItem.targetWord);
      setPlayCount((prev) => prev + 1);
    }
  };
  const replayEnabled =
    playCount < 1 && !isSpeaking && !isAnswered && canAnswer && !isPreloadingImages;

  const handleOptionClick = (id: string) => {
    if (!canAnswer || isPreloadingImages || selectedId || isAnswered) return;
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

    // ✅ 누적 결과 업데이트 (Step3는 10문항 기준으로 저장/채점)
    const totalQuestions = STEP3_TOTAL_QUESTIONS;
    const updatedResults = [...analysisResults, currentResult].slice(
      0,
      totalQuestions,
    );
    setAnalysisResults(updatedResults);

    // ✅ Result 페이지용 백업 저장 (실시간, 최대 10개)
    localStorage.setItem("step3_data", JSON.stringify(updatedResults));
    console.log("✅ Step 3 데이터 저장(10문항 기준):", updatedResults);

    setTimeout(() => {
      if (currentIndex < protocol.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedId(null);
        setShowResult(null);
        setIsAnswered(false);
        setPlayCount(0);
      } else {
        // ✅ 최종 점수 계산 (10문항 고정 분모)
        const correctCount = updatedResults.filter((r) => r.isCorrect).length;
        const avgScore = Math.round(
          (correctCount / Math.max(1, totalQuestions)) * 100,
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
            correctCount,
            totalCount: totalQuestions,
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

  const handleSkipStep = useCallback(() => {
    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      const demoResults = protocol.map((item, index) => ({
        text: item.targetWord,
        userAnswer: index % 5 === 0 ? "skip" : item.answerId,
        isCorrect: index % 5 !== 0,
        timestamp: new Date().toLocaleTimeString(),
      }));

      localStorage.setItem("step3_data", JSON.stringify(demoResults));

      const correctCount = demoResults.filter((item) => item.isCorrect).length;
      const totalCount = Math.max(1, demoResults.length);
      const score = Math.round((correctCount / totalCount) * 100);

      const patient = loadPatientProfile();
      const sessionManager = new SessionManager(
        (patient || { age: 70, educationYears: 12 }) as any,
        place,
      );
      sessionManager.saveStep3Result({
        items: demoResults,
        score,
        correctCount,
        totalCount,
        timestamp: Date.now(),
      });

      router.push(
        `/step-4?place=${place}&step1=${searchParams.get("step1") || 0}&step2=${searchParams.get("step2") || 0}&step3=${score}`,
      );
    } catch (error) {
      console.error("Step3 skip failed:", error);
    }
  }, [place, protocol, router, searchParams]);

  if (!isMounted || !currentItem) return null;

  return (
    <div className="flex flex-col h-full bg-[#FBFBFC] overflow-hidden text-slate-900 font-sans">
      {/* 상단 진행 프로그레스 바 */}
      <div className="fixed top-0 left-0 w-full h-1 z-[60] bg-slate-100">
        <div
          className="h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
          style={{ width: `${((currentIndex + 1) / protocol.length) * 100}%` }}
        />
      </div>
      <header className="h-16 px-6 border-b border-orange-100 flex justify-between items-center bg-white/90 backdrop-blur-md shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <img
            src="/images/logo/logo.png"
            alt="GOLDEN logo"
            className="w-10 h-10 rounded-xl object-cover"
          />
          <div>
            <span className="text-orange-500 font-black text-[10px] uppercase tracking-widest leading-none block">
              Step 03 • Visual-Auditory Association
            </span>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              단어-그림 매칭
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSkipStep}
            className={`px-3 py-1.5 rounded-full font-black text-[11px] border ${trainingButtonStyles.slateSoft}`}
          >
            SKIP
          </button>
          <div className="bg-orange-50 px-4 py-1.5 rounded-full font-black text-xs text-orange-700 border border-orange-200">
            {currentIndex + 1} / {protocol.length}
          </div>
          <button
            type="button"
            onClick={handleGoHome}
            aria-label="홈으로 이동"
            title="홈"
            className={`w-9 h-9 ${trainingButtonStyles.homeIcon}`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 9.5V21h13V9.5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 21v-5h4v5" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden">
        <main className="flex-1 flex flex-col min-h-[calc(100vh-4rem)] lg:min-h-0 bg-[#FBFBFC] pb-8 lg:pb-0">
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
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm active:scale-95 shrink-0 mb-1 pointer-events-auto ${
                  replayEnabled
                    ? trainingButtonStyles.orangeSoft
                    : `${trainingButtonStyles.slateOutline} opacity-60`
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

            <div className="flex-1 min-h-0 flex items-start justify-start lg:items-center lg:justify-center pb-6">
              <div className="grid grid-cols-3 gap-3 lg:gap-4 w-full lg:h-full lg:max-h-[60vh]">
                {currentItem.options.map((option: VisualOption) => {
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleOptionClick(option.id)}
                      disabled={isSpeaking || isAnswered || !canAnswer || isPreloadingImages}
                      className={`relative z-20 w-full aspect-[4/5] sm:aspect-square lg:h-full rounded-[24px] flex items-center justify-center transition-all border shadow-sm bg-white overflow-hidden pointer-events-auto
                    ${selectedId === option.id ? (showResult ? "border-emerald-500 ring-4 ring-emerald-50 scale-105" : "border-slate-800 opacity-60 scale-95") : "border-slate-100 hover:border-orange-100 hover:shadow-md"}`}
                    >
                      <div className="w-full h-full p-4 flex items-center justify-center pointer-events-none">
                        {isPreloadingImages ? (
                          <div className="w-20 h-20 lg:w-28 lg:h-28 rounded-2xl bg-slate-100 animate-pulse" />
                        ) : resolvedImageMap[option.id] ? (
                          <>
                            <img
                              src={resolvedImageMap[option.id]}
                              alt={option.label}
                              className="w-24 h-24 lg:w-32 lg:h-32 object-contain"
                              loading="eager"
                              decoding="async"
                            />
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

        <aside className="w-full lg:w-[380px] h-auto min-h-[340px] lg:h-full mt-auto lg:mt-0 border-t lg:border-t-0 lg:border-l border-slate-50 bg-white p-3 lg:p-4 flex flex-col overflow-visible lg:overflow-hidden">
          <AnalysisSidebar
            videoRef={videoRef}
            canvasRef={canvasRef}
            isFaceReady={sidebarMetrics.faceDetected}
            metrics={{
              symmetryScore: (sidebarMetrics.facialSymmetry || 0) * 100,
              openingRatio: (sidebarMetrics.mouthOpening || 0) * 100,
              audioLevel: isSpeaking ? 25 : 0,
            }}
            showTracking={false}
            scoreLabel="진행도"
            scoreValue={`${currentIndex + (isAnswered ? 1 : 0)} / ${protocol.length}`}
          />
        </aside>
      </div>
      <HomeExitModal
        open={isHomeExitModalOpen}
        onConfirm={confirmGoHome}
        onCancel={() => setIsHomeExitModalOpen(false)}
      />
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
