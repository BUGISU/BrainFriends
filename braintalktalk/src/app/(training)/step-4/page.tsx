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
import { SessionManager } from "@/lib/kwab/SessionManager";
import { loadPatientProfile } from "@/lib/patientStorage";

export const dynamic = "force-dynamic";
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

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[\s.,!?~"'`·\-_/()\[\]{}:;\\|]/g, "");
}

function splitSentences(text: string) {
  const trimmed = (text || "").trim();
  if (!trimmed) return [];

  const byPunctuation = trimmed
    .split(/[.!?。！？\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (byPunctuation.length > 0) return byPunctuation;

  const words = trimmed.split(/\s+/).filter(Boolean);
  const chunkSize = 6;
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }
  return chunks;
}

function buildNameVariants(baseName: string) {
  const variants = new Set<string>();
  variants.add(baseName);
  variants.add(baseName.replace(/\s+/g, ""));
  variants.add(baseName.replace(/\s+/g, "-"));
  variants.add(baseName.replace(/\s+/g, "_"));
  return Array.from(variants).filter(Boolean);
}

function buildStep4ImageCandidates(
  place: PlaceType,
  scenarioId: number,
  situation: string,
) {
  const candidates: string[] = [];
  const baseNames = [String(scenarioId), situation];

  for (const baseName of baseNames) {
    for (const nameVariant of buildNameVariants(baseName)) {
      candidates.push(
        `${STEP4_IMAGE_BASE_URL}/${place}/${nameVariant}.png`,
        `${STEP4_IMAGE_BASE_URL}/${place}/${nameVariant}.jpg`,
        `${STEP4_IMAGE_BASE_URL}/${place}/${nameVariant}.jpeg`,
        `${STEP4_IMAGE_BASE_URL}/${place}/${nameVariant}.webp`,
        `${STEP4_IMAGE_BASE_URL}/${nameVariant}.png`,
        `${STEP4_IMAGE_BASE_URL}/${nameVariant}.jpg`,
        `${STEP4_IMAGE_BASE_URL}/${nameVariant}.jpeg`,
        `${STEP4_IMAGE_BASE_URL}/${nameVariant}.webp`,
        `${STEP4_IMAGE_RAW_BASE_URL}/${place}/${nameVariant}.png`,
        `${STEP4_IMAGE_RAW_BASE_URL}/${place}/${nameVariant}.jpg`,
        `${STEP4_IMAGE_RAW_BASE_URL}/${place}/${nameVariant}.jpeg`,
        `${STEP4_IMAGE_RAW_BASE_URL}/${place}/${nameVariant}.webp`,
        `${STEP4_IMAGE_RAW_BASE_URL}/${nameVariant}.png`,
        `${STEP4_IMAGE_RAW_BASE_URL}/${nameVariant}.jpg`,
        `${STEP4_IMAGE_RAW_BASE_URL}/${nameVariant}.jpeg`,
        `${STEP4_IMAGE_RAW_BASE_URL}/${nameVariant}.webp`,
      );
    }
  }

  candidates.push(
    `/images/training/${place}/${scenarioId}.png`,
    `/images/training/${place}/${scenarioId}.jpg`,
  );

  return Array.from(new Set(candidates));
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string) || "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function Step4Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const place = (searchParams.get("place") as PlaceType) || "home";
  const step3Score = searchParams.get("step3") || "0";

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
  const [replayCount, setReplayCount] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSttExpanded, setIsSttExpanded] = useState(false);
  const [resolvedImageSrc, setResolvedImageSrc] = useState("");
  const [isImageResolving, setIsImageResolving] = useState(false);
  const [isImageLoadFailed, setIsImageLoadFailed] = useState(false);

  const [currentResult, setCurrentResult] = useState<Step4EvalResult | null>(
    null,
  );
  const [allResults, setAllResults] = useState<Step4EvalResult[]>([]);

  const scenarios = useMemo(
    () => FLUENCY_SCENARIOS[place] || FLUENCY_SCENARIOS.home,
    [place],
  );
  const currentScenario = scenarios[currentIndex];
  const imageCandidates = useMemo(() => {
    if (!currentScenario) return [];
    return buildStep4ImageCandidates(
      place,
      currentScenario.id,
      currentScenario.situation,
    );
  }, [place, currentScenario]);

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
    if (!currentScenario) return;
    let active = true;

    const cacheKey = `${place}:${currentScenario.id}`;
    const cached = imageCacheRef.current[cacheKey];
    if (cached) {
      setResolvedImageSrc(cached);
      setIsImageLoadFailed(false);
      setIsImageResolving(false);
      return;
    }

    setResolvedImageSrc("");
    setIsImageLoadFailed(false);
    setIsImageResolving(true);

    (async () => {
      const resolved = await findFirstLoadableImage(imageCandidates);
      if (!active) return;

      if (resolved) {
        imageCacheRef.current[cacheKey] = resolved;
        setResolvedImageSrc(resolved);
        setIsImageLoadFailed(false);
      } else {
        setResolvedImageSrc("");
        setIsImageLoadFailed(true);
      }
      setIsImageResolving(false);
    })();

    return () => {
      active = false;
    };
  }, [currentScenario, findFirstLoadableImage, imageCandidates, place]);

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

  const playPrompt = useCallback(
    (countReplay: boolean = false) => {
      if (!currentScenario || typeof window === "undefined") return;
      if (!window.speechSynthesis) {
        setCanRecord(true);
        return;
      }

      window.speechSynthesis.cancel();
      setIsPromptPlaying(true);
      setCanRecord(false);

      const utterance = new SpeechSynthesisUtterance(currentScenario.prompt);
      utterance.lang = "ko-KR";
      utterance.rate = 0.9;
      utterance.onend = () => {
        setIsPromptPlaying(false);
        setCanRecord(true);
      };
      utterance.onerror = () => {
        setIsPromptPlaying(false);
        setCanRecord(true);
      };

      window.speechSynthesis.speak(utterance);

      if (countReplay) {
        setReplayCount((prev) => prev + 1);
      }
    },
    [currentScenario],
  );

  useEffect(() => {
    if (!isMounted || !currentScenario) return;
    setReplayCount(0);
    setPhase("ready");
    setCanRecord(false);
    setCurrentResult(null);
    setIsSttExpanded(false);
    playPrompt(false);
  }, [isMounted, currentIndex, currentScenario, playPrompt]);

  const calculateRelevanceScore = useCallback((transcript: string) => {
    if (!currentScenario) {
      return {
        score: 0,
        matchedKeywords: [] as string[],
        relevantSentenceCount: 0,
        totalSentenceCount: 0,
      };
    }

    const normalizedTranscript = normalizeText(transcript);
    const sentences = splitSentences(transcript);
    const totalSentenceCount = Math.max(1, sentences.length);
    if (!normalizedTranscript) {
      return {
        score: 0,
        matchedKeywords: [] as string[],
        relevantSentenceCount: 0,
        totalSentenceCount,
      };
    }

    const matchedKeywords = currentScenario.answerKeywords.filter((keyword) =>
      normalizedTranscript.includes(normalizeText(keyword)),
    );
    const uniqueMatched = Array.from(new Set(matchedKeywords));
    const sentenceMatches = sentences.filter((sentence) => {
      const normalizedSentence = normalizeText(sentence);
      return uniqueMatched.some((keyword) =>
        normalizedSentence.includes(normalizeText(keyword)),
      );
    });

    const relevantSentenceCount = sentenceMatches.length;

    const keywordCoverage = Math.min(1, uniqueMatched.length / 5);
    const sentenceCoverage = Math.min(
      1,
      relevantSentenceCount / totalSentenceCount,
    );
    const score = Math.round((keywordCoverage * 0.7 + sentenceCoverage * 0.3) * 10);

    return {
      score,
      matchedKeywords: uniqueMatched,
      relevantSentenceCount,
      totalSentenceCount,
    };
  }, [currentScenario]);

  const handleReplayPrompt = useCallback(() => {
    if (phase !== "ready" || isPromptPlaying || replayCount >= 1) return;
    playPrompt(true);
  }, [phase, isPromptPlaying, replayCount, playPrompt]);

  const startRecording = async () => {
    if (!canRecord || isPromptPlaying || phase !== "ready") return;

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPromptPlaying(false);
    }

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
      console.error("녹음 시작 실패:", err);
    }
  };

  const stopRecording = async () => {
    if (!currentScenario || !analyzerRef.current || phase !== "recording") return;

    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("analyzing");

    try {
      const sttExpectedText = currentScenario.answerKeywords.join(" ");
      const analysis = await analyzerRef.current.stopAnalysis(sttExpectedText);
      const transcript = (analysis.transcript || "").trim();

      const {
        score,
        matchedKeywords,
        relevantSentenceCount,
        totalSentenceCount,
      } = calculateRelevanceScore(transcript);

      const speechDuration = Math.max(0, recordingTime - 1);
      const silenceRatio = Number(
        ((Math.max(0, recordingTime - speechDuration) / Math.max(1, recordingTime)) *
          100).toFixed(1),
      );

      const audioBlob = analysis.audioBlob;
      const dataUrl = audioBlob ? await toDataUrl(audioBlob) : "";

      const evalResult: Step4EvalResult = {
        situation: currentScenario.situation,
        prompt: currentScenario.prompt,
        transcript,
        matchedKeywords,
        relevantSentenceCount,
        totalSentenceCount,
        relevanceScore: score,
        speechDuration,
        silenceRatio,
        averageAmplitude: audioLevel,
        peakCount: Math.floor(recordingTime / 2),
        kwabScore: score,
        rawScore: analysis.pronunciationScore,
        audioUrl: dataUrl,
      };

      setCurrentResult(evalResult);
      setAllResults((prev) => [...prev, evalResult]);

      if (dataUrl) {
        const existing = JSON.parse(
          localStorage.getItem("step4_recorded_audios") || "[]",
        );

        const savedEntry = {
          text: currentScenario.situation,
          prompt: currentScenario.prompt,
          transcript: transcript || "...",
          audioUrl: dataUrl,
          isCorrect: score >= 5,
          fluencyScore: score,
          rawScore: analysis.pronunciationScore,
          speechDuration,
          silenceRatio,
          timestamp: new Date().toLocaleTimeString(),
        };

        localStorage.setItem(
          "step4_recorded_audios",
          JSON.stringify([...existing, savedEntry]),
        );
      }

      setPhase("review");
    } catch (err) {
      console.error("분석 실패:", err);
      setPhase("ready");
    }
  };

  const handleSkipPlayback = useCallback(() => {
    if (!isPlayingAudio) return;
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current.onended = null;
    }
    setIsPlayingAudio(false);
  }, [isPlayingAudio]);

  const playRecordedAudio = () => {
    if (!currentResult?.audioUrl || isPlayingAudio) return;

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current.onended = null;
    }

    const audio = new Audio(currentResult.audioUrl);
    audioPlayerRef.current = audio;
    setIsPlayingAudio(true);
    audio.onended = () => setIsPlayingAudio(false);
    audio.play().catch((e) => {
      console.error("재생 에러:", e);
      setIsPlayingAudio(false);
    });
  };

  const handleNext = () => {
    handleSkipPlayback();

    if (currentIndex < scenarios.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    try {
      const patient = loadPatientProfile();
      const sm = new SessionManager(
        (patient || { age: 70, educationYears: 12 }) as any,
        place,
      );

      const averageKwabScore =
        allResults.length > 0
          ? allResults.reduce((sum, r) => sum + r.kwabScore, 0) / allResults.length
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
    } catch (error) {
      console.error("❌ SessionManager 저장 실패:", error);
    }

    const avgScore =
      allResults.length > 0
        ? Math.round(
            allResults.reduce((sum, r) => sum + r.kwabScore, 0) /
              allResults.length,
          )
        : 0;

    router.push(`/step-5?place=${place}&step3=${step3Score}&step4=${avgScore}`);
  };

  if (!isMounted || !currentScenario) return null;

  return (
    <div className="flex flex-col h-full bg-[#FBFBFC] overflow-y-auto lg:overflow-hidden text-slate-900 font-sans">
      <header className="h-16 px-6 border-b border-orange-100 flex justify-between items-center bg-white/90 backdrop-blur-md shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm">
            04
          </div>
          <div>
            <span className="text-orange-500 font-black text-[10px] uppercase tracking-widest leading-none block">
              Step 04 • Image Prompted Spontaneous Speech
            </span>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              직관적 발화 유도 훈련
            </h2>
          </div>
        </div>
        <div className="bg-orange-50 px-4 py-1.5 rounded-full font-black text-xs text-orange-700 border border-orange-200">
          {currentIndex + 1} / {scenarios.length}
        </div>
      </header>

      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
        <main className="flex-1 min-h-0 h-full relative p-3 sm:p-4 lg:p-6 pb-4 lg:pb-4 order-1 overflow-y-auto lg:overflow-hidden">
          <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-3 lg:gap-5 items-start">
            <div className="bg-white border border-slate-100 rounded-[28px] lg:rounded-[36px] p-3 lg:p-4 shadow-sm">
              <div className="w-full max-w-[280px] sm:max-w-[340px] lg:max-w-[460px] mx-auto aspect-square bg-slate-100 relative flex items-center justify-center rounded-[20px] overflow-hidden">
                {isImageResolving ? (
                  <div className="w-36 h-36 rounded-3xl bg-slate-200/80 animate-pulse" />
                ) : !isImageLoadFailed && resolvedImageSrc ? (
                  <img
                    src={resolvedImageSrc}
                    alt={`${currentScenario.situation} 이미지`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center px-6">
                    <div className="text-5xl mb-3">🖼️</div>
                    <p className="text-sm font-black text-slate-500 break-keep">
                      상황 이미지를 불러오지 못했습니다.
                    </p>
                  </div>
                )}

                {isPromptPlaying && (
                  <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px] flex items-center justify-center">
                    <div className="bg-white/95 px-5 py-2.5 rounded-full flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                      <span className="text-[12px] font-black text-orange-600">
                        문제 음성 재생 중...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:gap-5">
              <div className="bg-white border border-slate-100 rounded-[28px] lg:rounded-[36px] p-4 lg:p-5 shadow-sm shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-wider">
                      Situation
                    </p>
                    <p className="text-sm lg:text-base font-black text-slate-800 break-keep">
                      {currentScenario.situation}
                    </p>
                  </div>
                  <button
                    onClick={handleReplayPrompt}
                    disabled={
                      phase !== "ready" ||
                      isPromptPlaying ||
                      replayCount >= 1 ||
                      isImageResolving
                    }
                    className={`w-[112px] px-3 py-2 rounded-lg text-[11px] font-black border transition-colors shrink-0 text-center ${
                      phase === "ready" &&
                      !isPromptPlaying &&
                      replayCount < 1 &&
                      !isImageResolving
                        ? "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                        : "bg-slate-50 text-slate-400 border-slate-200"
                    }`}
                  >
                    문제 다시듣기
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold text-slate-400 flex-1">
                    {isImageResolving
                      ? "상황 이미지를 불러오는 중입니다."
                      : isPromptPlaying
                      ? "문제 음성을 듣는 중입니다. 재생이 끝나면 녹음 버튼이 활성화됩니다."
                      : "이미지를 보고 떠오르는 문장을 자유롭게 말해 주세요."}
                  </p>
                  {phase === "ready" && (
                    <button
                      onClick={startRecording}
                      disabled={!canRecord || isPromptPlaying || isImageResolving}
                      className={`lg:hidden w-[112px] px-3 py-2 rounded-lg text-[11px] font-black border transition-colors shrink-0 text-center ${
                        canRecord && !isPromptPlaying && !isImageResolving
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                      }`}
                    >
                      녹음 시작
                    </button>
                  )}
                  {phase === "recording" && (
                    <button
                      onClick={stopRecording}
                      className="lg:hidden w-[112px] px-3 py-2 rounded-lg text-[11px] font-black border border-slate-900 bg-slate-900 text-white shrink-0 text-center"
                    >
                      녹음 종료
                    </button>
                  )}
                  {phase === "analyzing" && (
                    <div className="lg:hidden w-[112px] px-3 py-2 rounded-lg text-[11px] font-black border border-orange-100 bg-orange-50 text-orange-600 text-center uppercase shrink-0">
                      Analyzing...
                    </div>
                  )}
                </div>
              </div>

              {phase === "review" && currentResult && (
                <div className="w-full max-w-xl animate-in zoom-in">
                  <div className="w-full bg-gradient-to-br from-white via-orange-50/40 to-white rounded-[32px] p-6 shadow-xl border border-orange-100/70 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(251,146,60,0.12),transparent_45%)] pointer-events-none" />

                    <div className="flex items-center justify-between gap-3 relative z-[1]">
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/90 border border-orange-100">
                        <span className="text-[10px] font-black text-orange-400 uppercase">
                          Fluency
                        </span>
                      </div>
                      <span className="text-2xl lg:text-3xl font-black text-orange-500 tracking-tight">
                        {currentResult.kwabScore}/10
                      </span>
                    </div>

                    <div className="mt-2 relative z-[1] rounded-2xl border border-orange-100/70 bg-white/85 p-3 min-h-[96px]">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">
                        STT RESULT
                      </p>
                      <p className={`text-sm lg:text-base font-bold text-slate-700 ${isSttExpanded ? "break-words" : "whitespace-nowrap overflow-hidden text-ellipsis"}`}>
                        {currentResult.transcript || "..."}
                      </p>
                      {(currentResult.transcript || "").length > 26 && (
                        <button
                          onClick={() => setIsSttExpanded((prev) => !prev)}
                          className="mt-1 text-[11px] font-black text-orange-500 hover:text-orange-600"
                        >
                          {isSttExpanded ? "접기" : "전체보기"}
                        </button>
                      )}
                    </div>

                    <div className="mt-5 flex flex-col gap-3 relative z-[1]">
                      <button
                        onClick={playRecordedAudio}
                        className={`w-full py-4 rounded-2xl font-black text-sm transition-all ${
                          isPlayingAudio
                            ? "bg-orange-500 text-white"
                            : "bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-100"
                        }`}
                      >
                        {isPlayingAudio ? "🔊 재생 중..." : "▶ 내 목소리 듣기"}
                      </button>
                      <button
                        onClick={handleNext}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-base hover:bg-black transition-all shadow-xl active:scale-[0.98]"
                      >
                        {currentIndex < scenarios.length - 1 ? "다음 상황으로" : "다음 단계로"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {phase !== "review" && (
                <div className="hidden lg:flex justify-center pt-2">
                  {phase === "ready" && (
                    <button
                      onClick={startRecording}
                      disabled={!canRecord || isPromptPlaying || isImageResolving}
                      className={`group w-28 h-28 rounded-full shadow-2xl flex items-center justify-center transition-all border-8 ${
                        canRecord && !isPromptPlaying && !isImageResolving
                          ? "bg-white border-slate-50 hover:scale-105"
                          : "bg-slate-100 border-slate-100 opacity-70 cursor-not-allowed"
                      }`}
                    >
                      <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                        <div className="w-6 h-6 bg-orange-500 rounded-full shadow-lg" />
                      </div>
                    </button>
                  )}

                  {phase === "recording" && (
                    <div className="mx-auto flex flex-col items-center gap-4">
                      <button
                        onClick={stopRecording}
                        className="w-28 h-28 rounded-full bg-slate-900 shadow-2xl animate-pulse flex items-center justify-center"
                      >
                        <div className="w-7 h-7 bg-white rounded-md" />
                      </button>
                      <div className="px-6 py-2 bg-orange-500 text-white rounded-full font-black text-lg font-mono shadow-lg shadow-orange-200">
                        REC {recordingTime}s
                      </div>
                    </div>
                  )}

                  {phase === "analyzing" && (
                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-orange-100 bg-orange-50">
                      <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[11px] font-black text-orange-600 uppercase">
                        Analyzing...
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
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
