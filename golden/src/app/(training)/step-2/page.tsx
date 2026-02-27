"use client";

import React, {
  useState,
  useRef,
  useMemo,
  useEffect,
  Suspense,
  useCallback,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SpeechAnalyzer } from "@/lib/speech/SpeechAnalyzer";
import { useTraining } from "../TrainingContext";
import { SPEECH_REPETITION_PROTOCOLS } from "@/constants/speechTrainingData";
import { PlaceType } from "@/constants/trainingData";
import { AnalysisSidebar } from "@/components/training/AnalysisSidebar";
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

const STEP2_AUDIO_STORAGE_KEY = "step2_recorded_audios";
const STEP2_MAX_STORED_AUDIO_ITEMS = 10;
const STEP2_MAX_AUDIO_URL_CHARS = 1_500_000;

function isQuotaExceededError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === "QuotaExceededError" || error.code === 22;
  }
  if (typeof error === "object" && error !== null && "name" in error) {
    return (error as { name?: string }).name === "QuotaExceededError";
  }
  return false;
}

function getResultSentenceSizeClass(text: string): string {
  const normalizedLength = (text || "").replace(/\s+/g, "").length;
  if (normalizedLength >= 56) return "text-sm md:text-base";
  if (normalizedLength >= 36) return "text-base md:text-lg";
  return "text-lg md:text-xl";
}

function Step2Content() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { sidebarMetrics } = useTraining();
  const place = (searchParams?.get("place") as PlaceType) || "home";

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const analyzerRef = useRef<SpeechAnalyzer | null>(null);
  const audioInputStreamRef = useRef<MediaStream | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPromptPlaying, setIsPromptPlaying] = useState(false);
  const [guideText, setGuideText] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [statusText, setStatusText] = useState("");
  const [isRecorderReady, setIsRecorderReady] = useState(false);
  const [canRecord, setCanRecord] = useState(false);
  const [replayCount, setReplayCount] = useState(0);

  const [audioLevel, setAudioLevel] = useState(0);
  const [resultScore, setResultScore] = useState<number | null>(null);
  const [transcript, setTranscript] = useState("");
  const [isSttExpanded, setIsSttExpanded] = useState(false);
  const [reviewAudioUrl, setReviewAudioUrl] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [showTracking, setShowTracking] = useState(false);
  const [isHomeExitModalOpen, setIsHomeExitModalOpen] = useState(false);
  const flowTokenRef = useRef(0);

  const protocol = useMemo(() => {
    const questions =
      SPEECH_REPETITION_PROTOCOLS[place] || SPEECH_REPETITION_PROTOCOLS.home;
    const sorted = [...questions].sort((a, b) => {
      const lenA = (a.text || "").replace(/\s+/g, "").length;
      const lenB = (b.text || "").replace(/\s+/g, "").length;
      if (lenA !== lenB) return lenA - lenB;
      return (a.id || 0) - (b.id || 0);
    });
    return [
      ...sorted.slice(0, 2),
      ...sorted.slice(2, 4),
      ...sorted.slice(4, 10),
    ];
  }, [place]);

  const currentItem = protocol[currentIndex];
  const handleGoHome = () => {
    setIsHomeExitModalOpen(true);
  };
  const confirmGoHome = () => {
    saveTrainingExitProgress(place, 2);
    router.push("/select");
  };
  const formattedCurrentText = useMemo(
    () => addSentenceLineBreaks(currentItem?.text || ""),
    [currentItem],
  );
  const promptTextSizeClass = useMemo(
    () => getResponsiveSentenceSizeClass(formattedCurrentText),
    [formattedCurrentText],
  );

  const speakText = useCallback((text: string) => {
    return new Promise<void>((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        resolve();
        return;
      }
      const synth = window.speechSynthesis;
      synth.cancel();
      synth.resume();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ko-KR";
      utterance.rate = 0.9;
      const koVoice = synth
        .getVoices()
        .find((v) => v.lang?.toLowerCase().startsWith("ko"));
      if (koVoice) utterance.voice = koVoice;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      synth.speak(utterance);
    });
  }, []);

  const runCountdown = useCallback(async (from: number, token: number) => {
    for (let i = from; i >= 1; i -= 1) {
      if (token !== flowTokenRef.current) return false;
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCountdown(null);
    return token === flowTokenRef.current;
  }, []);

  const playStartBeep = useCallback(async () => {
    if (typeof window === "undefined") return;
    const AudioCtx =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) {
      // fallback: 음성합성으로 짧은 신호 제공
      if (window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance("삐");
        u.lang = "ko-KR";
        u.rate = 1.2;
        window.speechSynthesis.speak(u);
      }
      return;
    }
    try {
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      if (ctx.state !== "running") {
        if (window.speechSynthesis) {
          const u = new SpeechSynthesisUtterance("삐");
          u.lang = "ko-KR";
          u.rate = 1.2;
          window.speechSynthesis.speak(u);
        }
        return;
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 1200;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.24, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.17);

      setTimeout(() => {
        ctx.close().catch(() => {});
      }, 260);
    } catch {
      // 최종 fallback
      if (window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance("삐");
        u.lang = "ko-KR";
        u.rate = 1.2;
        window.speechSynthesis.speak(u);
      }
    }
  }, []);

  const startRecording = useCallback(async () => {
    setResultScore(null);
    setTranscript("");
    setIsSttExpanded(false);
    setIsRecording(true);
    setIsRecorderReady(false);
    setStatusText("문장을 끝까지 말씀하신 후\n정지 버튼을 눌러주세요.");
    setCanRecord(true);
    setReviewAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    try {
      if (!analyzerRef.current) analyzerRef.current = new SpeechAnalyzer();
      await analyzerRef.current.startAnalysis(
        (level) => setAudioLevel(level),
        audioInputStreamRef.current || undefined,
      );
      setIsRecorderReady(true);
    } catch (err) {
      console.error("❌ 녹음 시작 실패:", err);
      setIsRecording(false);
      setIsRecorderReady(false);
      setStatusText("마이크 준비에 실패했습니다. 다시 시도해 주세요.");
    }
  }, []);

  const runPromptSequence = useCallback(
    async ({
      autoStartRecording,
      countReplay,
    }: {
      autoStartRecording: boolean;
      countReplay: boolean;
    }) => {
      if (!currentItem || isRecording || isAnalyzing || resultScore !== null)
        return;
      const token = ++flowTokenRef.current;
      setCanRecord(false);
      setIsPromptPlaying(true);
      setGuideText("듣고 따라 말해 주세요");
      setStatusText("");
      setCountdown(null);

      const first = await runCountdown(3, token);
      if (!first) return;

      await speakText(formattedCurrentText || currentItem.text);
      if (token !== flowTokenRef.current) return;

      setGuideText("녹음이 시작됩니다");
      const second = await runCountdown(3, token);
      if (!second) return;
      await playStartBeep();
      if (token !== flowTokenRef.current) return;

      setGuideText("");
      setCountdown(null);
      setIsPromptPlaying(false);

      if (countReplay) setReplayCount((prev) => prev + 1);
      if (autoStartRecording) await startRecording();
      else setCanRecord(true);
    },
    [
      currentItem,
      isAnalyzing,
      isRecording,
      resultScore,
      runCountdown,
      speakText,
      playStartBeep,
      startRecording,
    ],
  );

  const runReplaySequenceImmediate = useCallback(async () => {
    if (!currentItem || isPromptPlaying || isSaving) return;
    const token = ++flowTokenRef.current;

    if (isRecording) {
      analyzerRef.current?.cancelAnalysis();
      setIsRecording(false);
      setIsRecorderReady(false);
      setIsAnalyzing(false);
    }

    setCanRecord(false);
    setGuideText("");
    setStatusText("문제를 다시 들려드립니다.");
    setIsPromptPlaying(true);
    setCountdown(null);

    await speakText(formattedCurrentText || currentItem.text);
    if (token !== flowTokenRef.current) return;
    await playStartBeep();
    if (token !== flowTokenRef.current) return;

    setIsPromptPlaying(false);
    setStatusText("");
    setReplayCount((prev) => prev + 1);
    await startRecording();
  }, [
    currentItem,
    isPromptPlaying,
    isRecording,
    isSaving,
    playStartBeep,
    speakText,
    startRecording,
  ]);

  useEffect(() => {
    setIsMounted(true);
    localStorage.removeItem(STEP2_AUDIO_STORAGE_KEY);
    async function setupCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
          return;
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) videoRef.current.srcObject = videoStream;

        // 오디오 입력 스트림을 미리 열고 재사용: 매 문항 초기화 지연 감소
        try {
          const warmupAudioStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          audioInputStreamRef.current = warmupAudioStream;
        } catch {
          audioInputStreamRef.current = null;
        }
      } catch (err) {
        console.error("Camera Error:", err);
      }
    }
    setupCamera();
    return () => {
      flowTokenRef.current += 1;
      if (audioInputStreamRef.current) {
        audioInputStreamRef.current.getTracks().forEach((t) => t.stop());
        audioInputStreamRef.current = null;
      }
      if (typeof window !== "undefined" && window.speechSynthesis)
        window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (!isMounted || !currentItem) return;
    setReplayCount(0);
    runPromptSequence({ autoStartRecording: true, countReplay: false });
    // 초기 자동 플로우는 문항 전환 시에만 실행
    // (다시 듣기/녹음 상태 변화로 재실행되지 않도록 콜백 의존성 제외)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, currentItem, currentIndex]);

  const handleNext = useCallback(() => {
    if (isSaving) {
      setStatusText("녹음을 저장하는 중입니다. 잠시만 기다려주세요.");
      return;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.onended = null;
    }
    setIsPlayingAudio(false);

    if (currentIndex < protocol.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setResultScore(null);
      setTranscript("");
      setReviewAudioUrl(null);
      setCanRecord(false);
      setIsRecorderReady(false);
      setReplayCount(0);
    } else {
      try {
        const patient = loadPatientProfile();
        const sm = new SessionManager(
          (patient || { age: 70, educationYears: 12 }) as any,
          place,
        );
        const avgSymmetry =
          analysisResults.length > 0
            ? analysisResults.reduce((a, b) => a + b.faceScore, 0) /
              analysisResults.length
            : 0;
        const avgPronunciation =
          analysisResults.length > 0
            ? analysisResults.reduce((a, b) => a + b.speechScore, 0) /
              analysisResults.length
            : 0;
        sm.saveStep2Result({
          items: analysisResults,
          averageSymmetry: avgSymmetry,
          averagePronunciation: avgPronunciation,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("Save Error:", error);
      }

      const avgScore =
        analysisResults.length > 0
          ? analysisResults.reduce((a, b) => a + b.finalScore, 0) /
            analysisResults.length
          : 0;
      router.push(
        `/step-3?place=${place}&step1=${searchParams.get("step1")}&step2=${avgScore.toFixed(0)}`,
      );
    }
  }, [
    currentIndex,
    protocol.length,
    analysisResults,
    isSaving,
    router,
    place,
    searchParams,
  ]);

  const handleSkipStep = useCallback(() => {
    try {
      flowTokenRef.current += 1;
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      analyzerRef.current?.cancelAnalysis();

      const demoItems = protocol.slice(0, STEP2_MAX_STORED_AUDIO_ITEMS).map((item, index) => {
        const speechScore = 78 + (index % 3) * 5;
        const faceScore = 72 + (index % 4) * 4;
        const finalScore = Number((speechScore * 0.6 + faceScore * 0.4).toFixed(1));
        return {
          text: item.text,
          finalScore,
          speechScore,
          faceScore,
          isCorrect: finalScore >= 60,
          timestamp: new Date().toLocaleTimeString(),
        };
      });

      localStorage.setItem(STEP2_AUDIO_STORAGE_KEY, JSON.stringify(demoItems));

      const patient = loadPatientProfile();
      const sessionManager = new SessionManager(
        (patient || { age: 70, educationYears: 12 }) as any,
        place,
      );
      const averageSymmetry =
        demoItems.reduce((acc, curr) => acc + curr.faceScore, 0) /
        Math.max(1, demoItems.length);
      const averagePronunciation =
        demoItems.reduce((acc, curr) => acc + curr.speechScore, 0) /
        Math.max(1, demoItems.length);

      sessionManager.saveStep2Result({
        items: demoItems.map((item) => ({
          text: item.text,
          symmetryScore: item.faceScore,
          pronunciationScore: item.speechScore,
          audioLevel: 35,
        })),
        averageSymmetry,
        averagePronunciation,
        timestamp: Date.now(),
      });

      const step2Score = Math.round(
        demoItems.reduce((acc, curr) => acc + curr.finalScore, 0) /
          Math.max(1, demoItems.length),
      );

      router.push(
        `/step-3?place=${place}&step1=${searchParams.get("step1") || 0}&step2=${step2Score}`,
      );
    } catch (error) {
      console.error("Step2 skip failed:", error);
    }
  }, [place, protocol, router, searchParams]);

  const handleToggleRecording = async () => {
    if (!isRecording && (!canRecord || isPromptPlaying)) return;

    if (!isRecording) {
      await startRecording();
    } else {
      if (!isRecorderReady) return;
      flowTokenRef.current += 1;
      setIsPromptPlaying(false);
      setIsRecording(false);
      setIsRecorderReady(false);
      setIsAnalyzing(true);
      setStatusText("목소리 인식이 완료되었습니다.");

      try {
        const result = await analyzerRef.current!.stopAnalysis(
          currentItem.text,
        );
        const speechScore = result.pronunciationScore;
        const faceScore = (sidebarMetrics.facialSymmetry || 0) * 100;
        let finalScore =
          speechScore >= 85 || faceScore >= 85
            ? Math.max(speechScore, faceScore)
            : speechScore * 0.6 + faceScore * 0.4;

        setTranscript(result.transcript || "");
        setResultScore(Number(finalScore.toFixed(1)));
        setAnalysisResults((prev) => [
          ...prev,
          {
            text: currentItem.text,
            finalScore: Number(finalScore.toFixed(1)),
            speechScore,
            faceScore,
          },
        ]);

        const audioBlob = result.audioBlob;
        if (audioBlob) {
          setIsSaving(true);
          console.debug("[Step2] save:start", {
            index: currentIndex,
            text: currentItem.text,
          });
          const reader = new FileReader();
          reader.onloadend = () => {
            try {
              const base64Audio = reader.result as string;
              let existing: any[] = [];
              try {
                const raw = localStorage.getItem(STEP2_AUDIO_STORAGE_KEY) || "[]";
                const parsed = JSON.parse(raw);
                existing = Array.isArray(parsed) ? parsed : [];
              } catch {
                existing = [];
              }
              const nextEntry = {
                text: currentItem.text,
                audioUrl:
                  typeof base64Audio === "string" &&
                  base64Audio.length <= STEP2_MAX_AUDIO_URL_CHARS
                    ? base64Audio
                    : undefined,
                isCorrect: finalScore >= 60,
                finalScore: Number(finalScore.toFixed(1)),
                speechScore,
                faceScore,
                timestamp: new Date().toLocaleTimeString(),
              };

              // localStorage 용량 초과 시 항목 수를 줄이지 않고,
              // 오래된 항목의 audioUrl만 제거해 10개 메타데이터를 최대한 유지합니다.
              let candidate = [...existing, nextEntry].slice(
                -STEP2_MAX_STORED_AUDIO_ITEMS,
              );
              let saved = false;
              let droppedByQuota = 0;
              let strippedAudioCount = 0;

              while (!saved) {
                try {
                  localStorage.setItem(
                    STEP2_AUDIO_STORAGE_KEY,
                    JSON.stringify(candidate),
                  );
                  saved = true;
                } catch (saveError) {
                  if (!isQuotaExceededError(saveError)) {
                    throw saveError;
                  }

                  const oldestAudioIndex = candidate.findIndex(
                    (item) => Boolean(item?.audioUrl),
                  );
                  if (oldestAudioIndex >= 0) {
                    candidate[oldestAudioIndex] = {
                      ...candidate[oldestAudioIndex],
                      audioUrl: undefined,
                    };
                    strippedAudioCount += 1;
                    continue;
                  }

                  if (candidate.length > 1) {
                    candidate = candidate.slice(1);
                    droppedByQuota += 1;
                    continue;
                  }

                  localStorage.removeItem(STEP2_AUDIO_STORAGE_KEY);
                  candidate = [{ ...nextEntry, audioUrl: undefined }];
                }
              }

              if (!nextEntry.audioUrl || strippedAudioCount > 0 || droppedByQuota > 0) {
                console.warn("[Step2] save:reduced", {
                  strippedAudioCount,
                  droppedByQuota,
                  savedCount: candidate.length,
                  hasAudio: Boolean(candidate[candidate.length - 1]?.audioUrl),
                });
              }
              console.debug("[Step2] save:success", {
                key: STEP2_AUDIO_STORAGE_KEY,
                savedCount: candidate.length,
                score: Number(finalScore.toFixed(1)),
              });
              setReviewAudioUrl(URL.createObjectURL(audioBlob));
            } catch (saveErr) {
              console.error("Step2 localStorage 저장 실패:", saveErr);
              setStatusText("녹음 저장 중 오류가 발생했습니다.");
            } finally {
              setIsSaving(false);
            }
          };
          reader.onerror = () => {
            console.error("Step2 FileReader 오류");
            setStatusText("녹음 파일 처리 중 오류가 발생했습니다.");
            setIsSaving(false);
          };
          reader.readAsDataURL(audioBlob);
        } else {
          console.warn("[Step2] save:skip (audioBlob 없음)", {
            index: currentIndex,
            text: currentItem.text,
          });
          setIsSaving(false);
        }
      } catch (err) {
        console.error("Analysis Error:", err);
        setStatusText("분석 중 오류가 발생했습니다.");
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  if (!isMounted || !currentItem) return null;

  return (
    <div className="flex flex-col h-full bg-[#FBFBFC] overflow-hidden text-slate-900 font-sans relative">
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
            <span className="text-orange-500 font-black text-[10px] uppercase tracking-widest block leading-none">
              Repetition Training
            </span>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              문장 복창 훈련
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
            {currentIndex + 1} / {protocol.length} 문항
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

      <div className="flex flex-1 flex-col lg:flex-row min-h-0 overflow-hidden">
        <main className="flex-1 flex flex-col relative p-4 sm:p-6 lg:p-10 order-1 overflow-y-auto">
          <div className="w-full max-w-xl mx-auto flex flex-col h-full justify-center gap-6">
            {/* 메인 텍스트 영역 */}
            <div
              className={`w-full rounded-[40px] p-8 lg:p-12 text-center transition-colors duration-150 ${
                isRecording
                  ? "bg-orange-500 shadow-xl shadow-orange-200"
                  : "bg-white border border-slate-100 shadow-sm"
              }`}
            >
              <p
                className={`text-[11px] font-black uppercase tracking-[0.3em] mb-6 ${isRecording ? "text-orange-100" : "text-slate-300"}`}
              >
                {isRecording ? "Recording Now" : "Listen & Speak"}
              </p>

              <h1
                className={`${promptTextSizeClass} font-black leading-tight break-keep whitespace-pre-line ${
                  isRecording ? "text-white" : "text-slate-800"
                }`}
              >
                {isPromptPlaying
                  ? countdown
                    ? `${guideText}`
                    : "들려드리는 문장을 들어보세요"
                  : statusText
                    ? statusText
                    : isAnalyzing || isSaving
                      ? "목소리를 분석하고 있습니다..."
                      : isRecording
                        ? "지금 바로 말씀해 주세요!"
                        : formattedCurrentText}
              </h1>
            </div>

            {/* 결과 리포트 카드 */}
            {resultScore !== null && (
              <div className="w-full bg-gradient-to-br from-white via-orange-50/40 to-white rounded-[32px] p-6 shadow-xl border border-orange-100/70 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(251,146,60,0.12),transparent_45%)] pointer-events-none" />
                <div className="relative z-[1] flex items-center gap-6 mb-5">
                  <div className="border-r border-orange-100 pr-6 text-center">
                    <span className="text-[10px] font-black text-orange-400 uppercase block mb-1">
                      정확도
                    </span>
                    <span className="text-3xl md:text-4xl font-black text-orange-500">
                      {resultScore}%
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 rounded-2xl border border-orange-100/70 bg-white/85 p-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">
                      인식된 결과
                    </p>
                    <p
                      className={`${getResultSentenceSizeClass(transcript || "")} font-bold text-slate-700 italic leading-relaxed ${
                        isSttExpanded
                          ? "break-words whitespace-normal"
                          : "whitespace-nowrap overflow-hidden text-ellipsis"
                      }`}
                    >
                      "{transcript || "..."}"
                    </p>
                    {(transcript || "").length > 26 && (
                      <button
                        type="button"
                        onClick={() => setIsSttExpanded((prev) => !prev)}
                        className="mt-1 text-[11px] font-black text-orange-500 hover:text-orange-600"
                      >
                        {isSttExpanded ? "접기" : "전체보기"}
                      </button>
                    )}
                  </div>
                </div>

                  <div className="mt-5 flex flex-col gap-3 relative z-[1]">
                    <button
                      onClick={() => {
                        if (reviewAudioUrl && !isPlayingAudio) {
                          if (audioPlayerRef.current) {
                            audioPlayerRef.current.pause();
                            audioPlayerRef.current.currentTime = 0;
                            audioPlayerRef.current.onended = null;
                          }
                          const a = new Audio(reviewAudioUrl);
                          audioPlayerRef.current = a;
                          setIsPlayingAudio(true);
                          a.onended = () => setIsPlayingAudio(false);
                          a.play().catch(() => setIsPlayingAudio(false));
                        }
                      }}
                      className={`w-full py-4 rounded-2xl font-black text-sm ${
                        isPlayingAudio
                          ? trainingButtonStyles.orangeSolid
                          : trainingButtonStyles.orangeSoft
                      }`}
                    >
                      {isPlayingAudio ? "🔊 재생 중..." : "▶ 내 목소리 듣기"}
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={isSaving}
                      className={`w-full py-4 rounded-2xl font-black text-base ${
                        isSaving
                          ? trainingButtonStyles.navyPrimaryMuted
                          : trainingButtonStyles.navyPrimary
                      }`}
                    >
                      {isSaving ? "저장 중..." : "다음 문항으로"}
                    </button>
                  </div>
              </div>
            )}

            {/* 하단 컨트롤러 */}
            <div className="flex flex-col items-center gap-6">
              {resultScore === null && (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      await runReplaySequenceImmediate();
                    }}
                    disabled={
                      replayCount >= 1 || isPromptPlaying || isSaving
                    }
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black border ${
                      replayCount >= 1 || isPromptPlaying || isSaving
                        ? trainingButtonStyles.slateMuted
                        : `${trainingButtonStyles.orangeSoft} shadow-sm`
                    }`}
                  >
                    <span>↻</span>
                    <span>문제 다시 듣기</span>
                  </button>

                  <div className="relative">
                    {/* 녹음 중 파동 효과 */}
                    {isRecording && (
                      <>
                        <div className="absolute inset-0 bg-orange-400 rounded-full animate-ping" />
                        <div className="absolute inset-0 bg-orange-200 rounded-full animate-pulse" />
                      </>
                    )}

                                        <button
                      onClick={handleToggleRecording}
                      disabled={
                        !isRecording &&
                        (isAnalyzing || isPromptPlaying || !canRecord)
                      }
                      className={`group relative z-10 w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-[#0B1A3A] shadow-2xl shadow-slate-300/70 flex items-center justify-center border-4 border-white transition-all active:scale-95 ${
                        !isRecording && !isAnalyzing ? "hover:scale-105" : ""
                      } ${
                        !isRecording &&
                        (isAnalyzing || isPromptPlaying || !canRecord)
                          ? "opacity-70 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      {isPromptPlaying && countdown ? (
                        <span className="text-4xl font-black text-white">
                          {countdown}
                        </span>
                      ) : isRecording ? (
                        <div className="w-7 h-7 lg:w-9 lg:h-9 bg-white rounded-2xl flex items-center justify-center">
                          <div className="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5 bg-slate-900 rounded-sm" />
                        </div>
                      ) : isAnalyzing ? (
                        <div className="w-12 h-12 lg:w-14 lg:h-14 bg-white rounded-full flex items-center justify-center">
                          <div className="w-8 h-8 border-4 border-[#0B1A3A] border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 lg:w-14 lg:h-14 bg-white rounded-full flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                          <svg
                            viewBox="0 0 24 24"
                            className="w-6 h-6 lg:w-7 lg:h-7 text-[#0B1A3A] group-hover:text-orange-600"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                          >
                            <rect x="9" y="3.5" width="6" height="11" rx="3" />
                            <path
                              strokeLinecap="round"
                              d="M6.5 11.5a5.5 5.5 0 0 0 11 0"
                            />
                            <path strokeLinecap="round" d="M12 17v3.5" />
                            <path strokeLinecap="round" d="M9 20.5h6" />
                          </svg>
                        </div>
                      )}
                    </button>
                  </div>
                  <p
                    className={`font-black text-[11px] uppercase tracking-[0.2em] ${isRecording ? "text-orange-500 animate-pulse" : "text-slate-300"}`}
                  >
                    {isRecording
                      ? "Listening to your voice..."
                      : "Press to speak"}
                  </p>
                </>
              )}
            </div>
          </div>
        </main>

        <aside className="w-full lg:w-[380px] border-l border-slate-50 bg-white shrink-0 flex flex-col order-2">
          <AnalysisSidebar
            videoRef={videoRef}
            canvasRef={canvasRef}
            isFaceReady={sidebarMetrics.faceDetected}
            metrics={{
              symmetryScore: (sidebarMetrics.facialSymmetry || 0) * 100,
              openingRatio: (sidebarMetrics.mouthOpening || 0) * 100,
              audioLevel: audioLevel,
            }}
            showTracking={showTracking}
            onToggleTracking={() => setShowTracking(!showTracking)}
            scoreLabel="실시간 대칭도"
            scoreValue={resultScore ? `${resultScore}%` : undefined}
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

export default function Step2Page() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center font-black text-slate-200 uppercase tracking-widest animate-pulse">
          Initializing Training...
        </div>
      }
    >
      <Step2Content />
    </Suspense>
  );
}
