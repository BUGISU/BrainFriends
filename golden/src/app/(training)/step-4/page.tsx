"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  Suspense,
  useCallback,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PlaceType } from "@/constants/trainingData";
import { FLUENCY_SCENARIOS } from "@/constants/fluencyData";
import { SpeechAnalyzer } from "@/lib/speech/SpeechAnalyzer";
import { HomeExitModal } from "@/components/training/HomeExitModal";
import { SessionManager } from "@/lib/kwab/SessionManager";
import { loadPatientProfile } from "@/lib/patientStorage";
import { saveTrainingExitProgress } from "@/lib/trainingExitProgress";
import {
  addSentenceLineBreaks,
  getResponsiveSentenceSizeClass,
} from "@/lib/text/displayText";
import { trainingButtonStyles } from "@/lib/ui/trainingButtonStyles";

export const dynamic = "force-dynamic";

// 이미지 경로 설정
const STEP4_IMAGE_BASE_URL = (
  process.env.NEXT_PUBLIC_STEP4_IMAGE_BASE_URL ||
  "https://cdn.jsdelivr.net/gh/BUGISU/braintalktalk-assets@main/step4"
).replace(/\/$/, "");
const STEP4_IMAGE_RAW_BASE_URL = (
  process.env.NEXT_PUBLIC_STEP4_IMAGE_RAW_BASE_URL ||
  "https://raw.githubusercontent.com/BUGISU/braintalktalk-assets/main/step4"
).replace(/\/$/, "");

type Phase = "ready" | "recording" | "analyzing" | "review";

type Step4EvalResult = {
  situation: string;
  prompt: string;
  transcript: string;
  matchedKeywords: string[];
  relevantSentenceCount: number;
  totalSentenceCount: number;
  relevanceScore: number;
  speechDuration: number;
  silenceRatio: number;
  averageAmplitude: number;
  peakCount: number;
  kwabScore: number;
  rawScore: number;
  audioUrl: string;
};

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string) || "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// 장소 직접 노출 방지를 위한 마스킹 함수
const STEP4_PLACE_TERMS = [
  "우리 집",
  "커피숍",
  "거실",
  "주방",
  "침실",
  "병원",
  "카페",
  "은행",
  "공원",
  "마트",
  "창구",
  "카운터",
  "매장",
];
function maskPlaceLabels(text: string) {
  if (!text) return text;
  const sortedTerms = [...STEP4_PLACE_TERMS].sort(
    (a, b) => b.length - a.length,
  );
  let masked = text;
  for (const term of sortedTerms) {
    masked = masked.split(term).join("이곳");
  }
  return masked.replace(/(이곳\s*){2,}/g, "이곳 ");
}

function Step4Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const place = (searchParams.get("place") as PlaceType) || "home";
  const step3Score = searchParams.get("step3") || "0";
  const handleGoHome = () => {
    setIsHomeExitModalOpen(true);
  };
  const confirmGoHome = () => {
    saveTrainingExitProgress(place, 4);
    router.push("/select");
  };

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyzerRef = useRef<SpeechAnalyzer | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const imageCacheRef = useRef<Record<string, string>>({});

  const [isMounted, setIsMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isPromptPlaying, setIsPromptPlaying] = useState(false);
  const [canRecord, setCanRecord] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [saveStatusText, setSaveStatusText] = useState("");
  const [isSttExpanded, setIsSttExpanded] = useState(false);
  const [resolvedImageSrc, setResolvedImageSrc] = useState("");
  const [isImageResolving, setIsImageResolving] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isHomeExitModalOpen, setIsHomeExitModalOpen] = useState(false);

  const [currentResult, setCurrentResult] = useState<Step4EvalResult | null>(
    null,
  );
  const [allResults, setAllResults] = useState<Step4EvalResult[]>([]);

  const scenarios = useMemo(
    () => FLUENCY_SCENARIOS[place] || FLUENCY_SCENARIOS.home,
    [place],
  );
  const currentScenario = scenarios[currentIndex];

  // UX 개선된 마스킹 대사
  const maskedPrompt = useMemo(
    () => maskPlaceLabels(currentScenario?.prompt || ""),
    [currentScenario],
  );
  const maskedHint = useMemo(
    () => maskPlaceLabels(currentScenario?.hint || ""),
    [currentScenario],
  );
  const formattedPrompt = useMemo(
    () => addSentenceLineBreaks(maskedPrompt),
    [maskedPrompt],
  );
  const formattedHint = useMemo(
    () => addSentenceLineBreaks(maskedHint),
    [maskedHint],
  );
  const headlineTextSizeClass = useMemo(
    () => getResponsiveSentenceSizeClass(formattedPrompt),
    [formattedPrompt],
  );

  // 이미지 로드 로직
  useEffect(() => {
    if (!currentScenario) return;
    let active = true;
    const cacheKey = `${place}:${currentScenario.id}`;
    if (imageCacheRef.current[cacheKey]) {
      setResolvedImageSrc(imageCacheRef.current[cacheKey]);
      setIsImageResolving(false);
      return;
    }
    setIsImageResolving(true);
    const img = new Image();
    const url = `${STEP4_IMAGE_BASE_URL}/${place}/${currentScenario.id}.png`;
    img.onload = () => {
      if (active) {
        setResolvedImageSrc(url);
        imageCacheRef.current[cacheKey] = url;
        setIsImageResolving(false);
      }
    };
    img.onerror = () => {
      if (active) {
        setResolvedImageSrc("/images/placeholder.png");
        setIsImageResolving(false);
      }
    };
    img.src = url;
    return () => {
      active = false;
    };
  }, [currentScenario, place]);

  useEffect(() => {
    setIsMounted(true);
    localStorage.removeItem("step4_recorded_audios");
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 안내 음성 재생 (단순 버전)
  const playInstruction = useCallback(() => {
    if (!currentScenario || typeof window === "undefined") return;
    if (!window.speechSynthesis) {
      setIsPromptPlaying(false);
      setCanRecord(true);
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();
    synth.resume();
    setIsPromptPlaying(true);

    const utterance = new SpeechSynthesisUtterance(
      "이 사진 속 상황을 자유롭게 이야기해 주세요.",
    );
    utterance.lang = "ko-KR";
    utterance.rate = 0.9;
    const koVoice = synth
      .getVoices()
      .find((v) => v.lang?.toLowerCase().startsWith("ko"));
    if (koVoice) utterance.voice = koVoice;
    utterance.onend = () => {
      setIsPromptPlaying(false);
      setCanRecord(true);
    };
    utterance.onerror = () => {
      setIsPromptPlaying(false);
      setCanRecord(true);
    };

    setTimeout(() => {
      synth.speak(utterance);
    }, 80);
  }, [currentScenario]);

  useEffect(() => {
    if (!isMounted || !currentScenario) return;
    setPhase("ready");
    setCanRecord(false);
    setShowHint(false);
    setCurrentResult(null);
    setSaveStatusText("");
    playInstruction();
  }, [currentIndex, isMounted, playInstruction, currentScenario]);

  const startRecording = async () => {
    if (!canRecord || phase !== "ready") return;
    try {
      if (!analyzerRef.current) analyzerRef.current = new SpeechAnalyzer();
      await analyzerRef.current.startAnalysis((level) => setAudioLevel(level));
      setPhase("recording");
      setRecordingTime(0);
      timerRef.current = setInterval(
        () => setRecordingTime((prev) => prev + 1),
        1000,
      );
    } catch (err) {
      console.error(err);
    }
  };

  const stopRecording = async () => {
    if (phase !== "recording") return;
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("analyzing");
    setShowHint(false);
    try {
      const analysis = await analyzerRef.current!.stopAnalysis(
        currentScenario.answerKeywords.join(" "),
      );
      const transcript = (analysis.transcript || "").trim();

      // 채점 로직 (기존 로직 유지)
      const matched = currentScenario.answerKeywords.filter((kw) =>
        transcript.includes(kw),
      );
      const score = Math.min(10, Math.round((matched.length / 5) * 10));

      const evalResult: Step4EvalResult = {
        situation: currentScenario.situation,
        prompt: currentScenario.prompt,
        transcript,
        matchedKeywords: Array.from(new Set(matched)),
        relevantSentenceCount: 1,
        totalSentenceCount: 1,
        relevanceScore: score,
        speechDuration: recordingTime,
        silenceRatio: 0,
        averageAmplitude: audioLevel,
        peakCount: 0,
        kwabScore: score,
        rawScore: analysis.pronunciationScore,
        audioUrl: analysis.audioBlob
          ? URL.createObjectURL(analysis.audioBlob)
          : "",
      };

      setCurrentResult(evalResult);
      setAllResults((prev) => [...prev, evalResult]);

      if (analysis.audioBlob) {
        try {
          const base64Audio = await toDataUrl(analysis.audioBlob);
          const existing = JSON.parse(
            localStorage.getItem("step4_recorded_audios") || "[]",
          );
          const next = Array.isArray(existing)
            ? [
                ...existing,
                {
                  text: currentScenario.situation,
                  prompt: currentScenario.prompt,
                  transcript: transcript || "...",
                  audioUrl: base64Audio,
                  isCorrect: score >= 5,
                  fluencyScore: score,
                  rawScore: analysis.pronunciationScore,
                  speechDuration: recordingTime,
                  silenceRatio: 0,
                  timestamp: new Date().toLocaleTimeString(),
                },
              ]
            : [];
          localStorage.setItem("step4_recorded_audios", JSON.stringify(next));
          console.log("[Step4] save:success", {
            index: currentIndex,
            savedCount: next.length,
            score,
          });
          setSaveStatusText("녹음 저장 완료");
        } catch (e) {
          console.error("[Step4] save:failed", e);
          setSaveStatusText("저장 실패");
        }
      } else {
        console.warn("[Step4] save:skip (audioBlob 없음)", {
          index: currentIndex,
        });
        setSaveStatusText("오디오 없음");
      }

      setPhase("review");
    } catch (err) {
      console.error("[Step4] analyze:failed", err);
      setPhase("ready");
    }
  };

  const playRecordedAudio = useCallback(() => {
    if (!currentResult?.audioUrl) return;
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current.onended = null;
    }
    if (isPlayingAudio) {
      setIsPlayingAudio(false);
      return;
    }
    const audio = new Audio(currentResult.audioUrl);
    audioPlayerRef.current = audio;
    setIsPlayingAudio(true);
    audio.onended = () => setIsPlayingAudio(false);
    audio.play().catch((e) => {
      console.error("[Step4] playback:failed", e);
      setIsPlayingAudio(false);
    });
  }, [currentResult, isPlayingAudio]);

  const handleNext = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current.onended = null;
      setIsPlayingAudio(false);
    }

    if (currentIndex < scenarios.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      try {
        const patient = loadPatientProfile();
        const sm = new SessionManager(
          (patient || { age: 70, educationYears: 12 }) as any,
          place,
        );
        const averageKwabScore =
          allResults.length > 0
            ? allResults.reduce((sum, r) => sum + r.kwabScore, 0) /
              allResults.length
            : 0;
        sm.saveStep4Result({
          items: allResults.map((r) => ({
            situation: r.situation,
            prompt: r.prompt,
            speechDuration: r.speechDuration,
            silenceRatio: r.silenceRatio,
            averageAmplitude: r.averageAmplitude,
            peakCount: r.peakCount,
            kwabScore: r.kwabScore,
            rawScore: r.rawScore,
          })),
          averageKwabScore: Number(averageKwabScore.toFixed(1)),
          totalScenarios: allResults.length,
          score: Math.round(averageKwabScore),
          correctCount: allResults.filter((r) => r.kwabScore >= 5).length,
          totalCount: allResults.length,
          timestamp: Date.now(),
        });
        console.log("[Step4] session:save:success", {
          totalScenarios: allResults.length,
          averageKwabScore: Number(averageKwabScore.toFixed(1)),
        });
      } catch (e) {
        console.error("[Step4] session:save:failed", e);
      }

      const avgScore = Math.round(
        allResults.reduce((s, r) => s + r.kwabScore, 0) / allResults.length,
      );
      router.push(
        `/step-5?place=${place}&step3=${step3Score}&step4=${avgScore}`,
      );
    }
  };

  const handleSkipStep = useCallback(() => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      const demoItems = scenarios.slice(0, 3).map((scenario, index) => ({
        situation: scenario.situation,
        prompt: scenario.prompt,
        transcript: "시연용 더미 응답입니다.",
        matchedKeywords: scenario.answerKeywords.slice(0, 2),
        relevantSentenceCount: 1,
        totalSentenceCount: 1,
        relevanceScore: 7 + (index % 2),
        speechDuration: 8 + index,
        silenceRatio: 0.12,
        averageAmplitude: 38,
        peakCount: 3,
        kwabScore: 7 + (index % 2),
        rawScore: 79 + index * 3,
        isCorrect: true,
        timestamp: new Date().toLocaleTimeString(),
      }));

      localStorage.setItem("step4_recorded_audios", JSON.stringify(demoItems));

      const patient = loadPatientProfile();
      const sessionManager = new SessionManager(
        (patient || { age: 70, educationYears: 12 }) as any,
        place,
      );
      const averageKwabScore =
        demoItems.reduce((acc, curr) => acc + curr.kwabScore, 0) /
        Math.max(1, demoItems.length);
      const score = Math.round(averageKwabScore);

      sessionManager.saveStep4Result({
        items: demoItems.map((item) => ({
          situation: item.situation,
          prompt: item.prompt,
          speechDuration: item.speechDuration,
          silenceRatio: item.silenceRatio,
          averageAmplitude: item.averageAmplitude,
          peakCount: item.peakCount,
          kwabScore: item.kwabScore,
          rawScore: item.rawScore,
        })),
        averageKwabScore: Number(averageKwabScore.toFixed(1)),
        totalScenarios: demoItems.length,
        score,
        correctCount: demoItems.filter((item) => item.kwabScore >= 5).length,
        totalCount: demoItems.length,
        timestamp: Date.now(),
      });

      router.push(
        `/step-5?place=${place}&step3=${step3Score}&step4=${score}`,
      );
    } catch (error) {
      console.error("Step4 skip failed:", error);
    }
  }, [place, router, scenarios, step3Score]);

  if (!isMounted || !currentScenario) return null;

  return (
    <div className="flex flex-col h-full bg-[#FBFBFC] text-slate-900 font-sans">
      {/* 상단 진행 프로그레스 바 */}
      <div className="fixed top-0 left-0 w-full h-1 z-[60] bg-slate-100">
        <div
          className="h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.45)]"
          style={{ width: `${((currentIndex + 1) / scenarios.length) * 100}%` }}
        />
      </div>
      <header className="h-16 px-6 border-b border-orange-100 flex justify-between items-center bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <img
            src="/images/logo/logo.png"
            alt="GOLDEN logo"
            className="w-10 h-10 rounded-xl object-cover"
          />
          <h2 className="text-lg font-black text-slate-900">상황 설명하기</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSkipStep}
            className={`px-3 py-1.5 rounded-full font-black text-[11px] border ${trainingButtonStyles.slateSoft}`}
          >
            SKIP
          </button>
          <div className="bg-orange-50 px-4 py-1.5 rounded-full font-black text-xs text-orange-700">
            {currentIndex + 1} / {scenarios.length}
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

      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* 이미지 영역 */}
          <div className="bg-white p-4 rounded-[40px] shadow-xl border border-slate-100">
            <div className="aspect-square rounded-[32px] overflow-hidden bg-slate-50 relative flex items-center justify-center">
              {isImageResolving ? (
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent" />
              ) : (
                <img
                  src={resolvedImageSrc}
                  alt="상황 이미지"
                  className="w-full h-full object-contain"
                />
              )}
              {isPromptPlaying && (
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
                  <div className="bg-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl">
                    <span className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                    <span className="font-black text-orange-600 text-sm">
                      안내를 듣고 있습니다
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 대화 및 컨트롤 영역 */}
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <span className="text-[11px] font-black text-orange-500 tracking-[0.3em] uppercase block mb-4">
                Spontaneous Speech
              </span>
              <h1
                className={`${headlineTextSizeClass} font-black text-slate-800 leading-tight break-keep whitespace-pre-line`}
              >
                {phase === "recording"
                  ? "듣고 있습니다. \n편하게 말씀해 주세요."
                  : "이 사진 속 상황을 자유롭게 이야기해 주세요."}
              </h1>

              <div className="mt-8">
                {phase === "review" ? (
                  <div className="w-full space-y-3">
                    <div className="bg-white p-5 sm:p-6 rounded-[28px] sm:rounded-[32px] border border-orange-100 shadow-lg grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 sm:gap-5 items-start">
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-slate-400 uppercase">
                          인식된 문장
                        </span>
                        <p className="mt-1 font-bold text-slate-700 italic break-words leading-relaxed max-h-24 overflow-y-auto pr-1">
                          "{currentResult?.transcript || "..."}"
                        </p>
                        <p className="mt-1 text-[11px] font-black text-emerald-600">
                          {saveStatusText || "저장 상태 확인 중"}
                        </p>
                      </div>
                      <div className="text-center shrink-0 w-full sm:w-[110px]">
                        <span className="text-[10px] font-black text-orange-400 uppercase">
                          유창성 점수
                        </span>
                        <p className="text-2xl sm:text-3xl font-black text-orange-500 leading-none mt-1">
                          {currentResult?.kwabScore}/10
                        </p>
                        <button
                          onClick={playRecordedAudio}
                          className={`mt-2 w-full h-9 inline-flex items-center justify-center rounded-lg border text-[12px] font-black ${
                            isPlayingAudio
                              ? trainingButtonStyles.orangeSolid
                              : trainingButtonStyles.orangeSoft
                          }`}
                          aria-label="내 목소리 재생"
                        >
                          {isPlayingAudio ? "⏸" : "▶"}
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={handleNext}
                      className={`w-full py-5 rounded-[24px] font-black text-lg ${trainingButtonStyles.navyPrimary}`}
                    >
                      {currentIndex < scenarios.length - 1
                        ? "다음 상황 보기"
                        : "결과 확인하기"}
                    </button>
                  </div>
                ) : !showHint ? (
                  <div className="flex flex-wrap gap-2 items-start">
                    <button
                      onClick={() => setShowHint(true)}
                      className={`w-fit px-5 py-2.5 rounded-2xl text-xs font-black ${trainingButtonStyles.orangeSoft}`}
                    >
                      💡 힌트 보기
                    </button>
                    <button
                      onClick={playInstruction}
                      disabled={
                        isPromptPlaying ||
                        phase === "recording" ||
                        phase === "analyzing"
                      }
                      className={`w-fit px-5 py-2.5 rounded-2xl text-xs font-black border ${
                        isPromptPlaying ||
                        phase === "recording" ||
                        phase === "analyzing"
                          ? trainingButtonStyles.slateMuted
                          : trainingButtonStyles.orangeOutline
                      }`}
                    >
                      문제 다시듣기
                    </button>
                  </div>
                ) : (
                  <div className="p-5 rounded-[24px] bg-slate-50 border border-slate-100">
                    <p className="text-sm font-bold text-slate-600 leading-relaxed break-keep">
                      <span className="text-orange-500">상황: </span>
                      <span className="whitespace-pre-line">
                        {formattedPrompt}
                      </span>
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-600 leading-relaxed break-keep">
                      <span className="text-orange-500">도움말: </span>
                      <span className="whitespace-pre-line">
                        {formattedHint}
                      </span>
                    </p>
                    <div className="mt-3">
                      <button
                        onClick={playInstruction}
                        disabled={
                          isPromptPlaying ||
                          phase === "recording" ||
                          phase === "analyzing"
                        }
                        className={`w-fit px-4 py-2 rounded-xl text-xs font-black border ${
                          isPromptPlaying ||
                          phase === "recording" ||
                          phase === "analyzing"
                            ? trainingButtonStyles.slateMuted
                            : trainingButtonStyles.orangeOutline
                        }`}
                      >
                        문제 다시듣기
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 녹음 컨트롤 */}
            <div className={`w-full py-2 ${phase === "review" ? "min-h-0" : "lg:min-h-[320px]"}`}>
              {phase !== "review" && (
                <div className="flex flex-col items-center">
                  <div className="relative">
                    {phase === "recording" && (
                      <div className="absolute inset-0 bg-orange-400 rounded-full animate-ping opacity-40" />
                    )}
                    <button
                      onClick={
                        phase === "recording" ? stopRecording : startRecording
                      }
                      disabled={!canRecord || phase === "analyzing"}
                      className={`relative z-10 w-24 h-24 rounded-full shadow-2xl flex items-center justify-center transition-all ${
                        phase === "recording"
                          ? "bg-slate-900"
                          : "bg-white border-4 border-slate-50"
                      }`}
                    >
                      {phase === "recording" ? (
                        <div className="w-7 h-7 bg-white rounded-sm animate-pulse" />
                      ) : phase === "analyzing" ? (
                        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="text-4xl">🎙️</span>
                      )}
                    </button>
                  </div>
                  <p className="mt-4 text-[11px] font-black uppercase tracking-widest text-slate-300">
                    {phase === "recording"
                      ? "Recording..."
                      : phase === "analyzing"
                        ? "Analyzing..."
                        : "Tap to Speak"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <HomeExitModal
        open={isHomeExitModalOpen}
        onConfirm={confirmGoHome}
        onCancel={() => setIsHomeExitModalOpen(false)}
      />
    </div>
  );
}

export default function Step4Page() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center font-black text-slate-200 uppercase">
          Loading...
        </div>
      }
    >
      <Step4Content />
    </Suspense>
  );
}
