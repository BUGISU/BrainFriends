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
import { READING_TEXTS } from "@/constants/readingData";
import { useTraining } from "../TrainingContext";
import { AnalysisSidebar } from "@/components/training/AnalysisSidebar";
import { HomeExitModal } from "@/components/training/HomeExitModal";
import { SessionManager } from "@/lib/kwab/SessionManager";
import { loadPatientProfile } from "@/lib/patientStorage";
import { saveTrainingExitProgress } from "@/lib/trainingExitProgress";
import { addSentenceLineBreaks } from "@/lib/text/displayText";
import { trainingButtonStyles } from "@/lib/ui/trainingButtonStyles";

export const dynamic = "force-dynamic";

interface ReadingMetrics {
  place: string;
  text: string;
  audioUrl: string;
  totalTime: number;
  wordsPerMinute: number;
  pauseCount: number;
  readingScore: number;
}

function getStep5TextSizeClass(text: string): string {
  const normalizedLength = (text || "").replace(/\s+/g, "").length;
  if (normalizedLength >= 80) return "text-sm md:text-base lg:text-lg";
  if (normalizedLength >= 60) return "text-base md:text-lg lg:text-xl";
  if (normalizedLength >= 40) return "text-lg md:text-xl lg:text-2xl";
  return "text-xl md:text-2xl lg:text-3xl";
}

function Step5Content() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { sidebarMetrics } = useTraining();

  const place = (searchParams.get("place") as PlaceType) || "home";
  const step4Score = searchParams.get("step4") || "0";

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const readingStartAtRef = useRef<number | null>(null);
  const readingSecondsRef = useRef(0);
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"ready" | "reading" | "review">("ready");
  const [readingTime, setReadingTime] = useState(0);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentResult, setCurrentResult] = useState<ReadingMetrics | null>(
    null,
  );
  const [results, setResults] = useState<ReadingMetrics[]>([]);
  const [isHomeExitModalOpen, setIsHomeExitModalOpen] = useState(false);

  const handleGoHome = () => {
    setIsHomeExitModalOpen(true);
  };
  const confirmGoHome = () => {
    saveTrainingExitProgress(place, 5);
    router.push("/select");
  };

  const texts = useMemo(
    () => READING_TEXTS[place] || READING_TEXTS.home,
    [place],
  );
  const currentItem = texts[currentIndex];
  const formattedText = useMemo(
    () => addSentenceLineBreaks(currentItem?.text || ""),
    [currentItem],
  );
  const words = useMemo(
    () => formattedText.split(/\s+/).filter(Boolean),
    [formattedText],
  );
  const textLines = useMemo(
    () => formattedText.split("\n").map((line) => line.trim()).filter(Boolean),
    [formattedText],
  );
  const readingTextSizeClass = useMemo(
    () => getStep5TextSizeClass(formattedText),
    [formattedText],
  );

  useEffect(() => {
    setIsMounted(true);
    localStorage.removeItem("step5_recorded_data");

    async function setupCamera() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          if (videoRef.current) videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Step 5 Camera Error:", err);
      }
    }
    setupCamera();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (highlightTimerRef.current) clearInterval(highlightTimerRef.current);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  // UX 가이드 메시지
  const getPhaseMessage = () => {
    switch (phase) {
      case "ready":
        return "준비가 되시면 녹음 버튼을 눌러주세요.";
      case "reading":
        return "강조되는 단어를 천천히 따라 읽어보세요.";
      case "review":
        return "읽은 목소리를 확인하고 다음으로 넘어가세요.";
      default:
        return "";
    }
  };

  const playStartBeep = useCallback(async () => {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    try {
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      if (ctx.state !== "running") return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 1200;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.15);

      setTimeout(() => {
        ctx.close().catch(() => {});
      }, 250);
    } catch {
      // ignore beep errors
    }
  }, []);

  const startReading = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) =>
        audioChunksRef.current.push(e.data);
      const startedAt = Date.now();

      mediaRecorderRef.current.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const finalReadingTime = Math.max(1, readingSecondsRef.current);
        const wpm = Math.round((currentItem.wordCount / finalReadingTime) * 60);

        const res: ReadingMetrics = {
          place,
          text: currentItem.text,
          audioUrl: URL.createObjectURL(audioBlob),
          totalTime: finalReadingTime,
          wordsPerMinute: wpm,
          pauseCount: 0,
          readingScore: Math.min(100, Math.round((wpm / 100) * 100)), // 임시 로직
        };

        setCurrentResult(res);
        console.debug("[Step5] analysis:done", {
          index: currentIndex,
          text: currentItem.text,
          totalTime: res.totalTime,
          wpm: res.wordsPerMinute,
          score: res.readingScore,
        });

        const reader = new FileReader();
        reader.onloadend = () => {
          try {
            const existing = JSON.parse(
              localStorage.getItem("step5_recorded_data") || "[]",
            );
            const next = [
              ...existing,
              {
                ...res,
                audioUrl: reader.result as string,
                timestamp: new Date().toLocaleTimeString(),
              },
            ];
            localStorage.setItem("step5_recorded_data", JSON.stringify(next));
            console.debug("[Step5] localStorage:save:success", {
              key: "step5_recorded_data",
              savedCount: next.length,
              score: res.readingScore,
            });
          } catch (saveError) {
            console.error("[Step5] localStorage:save:failed", saveError);
          }
        };
        reader.onerror = (error) => {
          console.error("[Step5] audio:base64:failed", error);
        };
        reader.readAsDataURL(audioBlob);
      };

      setPhase("reading");
      setReadingTime(0);
      readingSecondsRef.current = 0;
      setHighlightIndex(0);
      await playStartBeep();
      mediaRecorderRef.current.start();

      timerRef.current = setInterval(() => {
        readingSecondsRef.current += 1;
        setReadingTime(readingSecondsRef.current);
      }, 1000);

      highlightTimerRef.current = setInterval(() => {
        setHighlightIndex((p) =>
          p < words.length - 1
            ? p + 1
            : (clearInterval(highlightTimerRef.current!), p),
        );
      }, 900); // 실독증 환자를 위해 약간 느린 하이라이트 속도
    } catch (err) {
      console.error(err);
    }
  };

  const stopReading = () => {
    if (highlightTimerRef.current) clearInterval(highlightTimerRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state !== "inactive")
      mediaRecorderRef.current?.stop();
    setPhase("review");
  };

  const playRecordedAudio = () => {
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
    audio.play().catch(() => setIsPlayingAudio(false));
  };

  const handleNext = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current.onended = null;
      setIsPlayingAudio(false);
    }
    if (!currentResult) return;
    const updatedResults = [...results, currentResult];
    setResults(updatedResults);
    console.debug("[Step5] next:clicked", {
      index: currentIndex,
      totalSavedInState: updatedResults.length,
      score: currentResult.readingScore,
    });

    if (currentIndex < texts.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setPhase("ready");
      setCurrentResult(null);
      setHighlightIndex(-1);
    } else {
      try {
        const patient = loadPatientProfile();
        const sm = new SessionManager(
          (patient || { age: 70, educationYears: 12 }) as any,
          place,
        );
        sm.saveStep5Result({
          correctAnswers: updatedResults.length,
          totalQuestions: texts.length,
          timestamp: Date.now(),
          items: updatedResults as any,
        });
        console.debug("[Step5] session:save:success", {
          totalQuestions: texts.length,
          savedItems: updatedResults.length,
        });
      } catch (error) {
        console.error("[Step5] session:save:failed", error);
      }
      const avg = Math.round(
        updatedResults.reduce((s, r) => s + r.readingScore, 0) /
          updatedResults.length,
      );
      console.debug("[Step5] route:step6", {
        avg,
        place,
        step4Score,
      });
      router.push(`/step-6?place=${place}&step4=${step4Score}&step5=${avg}`);
    }
  };

  if (!isMounted || !currentItem) return null;

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-y-auto lg:overflow-hidden text-slate-900 font-sans">
      <div className="fixed top-0 left-0 w-full h-1 z-[60] bg-slate-100">
        <div
          className="h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.45)]"
          style={{ width: `${((currentIndex + 1) / texts.length) * 100}%` }}
        />
      </div>
      <header className="h-16 px-6 border-b border-orange-100 flex justify-between items-center bg-white/90 backdrop-blur-md shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm">
            05
          </div>
          <div>
            <span className="text-orange-500 font-black text-[10px] uppercase tracking-widest leading-none block">
              Step 05 • Reading Fluency Training
            </span>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              텍스트 읽기 학습
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-orange-50 px-4 py-1.5 rounded-full font-black text-xs text-orange-700 border border-orange-200">
            {currentIndex + 1} / {texts.length}
          </div>
          <button
            type="button"
            onClick={handleGoHome}
            aria-label="홈으로 이동"
            title="홈"
            className={`w-9 h-9 ${trainingButtonStyles.homeIcon}`}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 10.5 12 3l9 7.5"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5.5 9.5V21h13V9.5"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 21v-5h4v5"
              />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
        <main className="flex-1 flex flex-col min-h-[calc(100vh-4rem)] lg:min-h-0 relative p-4 lg:p-10 pb-8 lg:pb-10 order-1 overflow-y-auto">
          <div className="w-full max-w-2xl mx-auto flex flex-col h-full gap-4 lg:gap-8 justify-start lg:justify-center">
            <div className="w-full bg-white border border-orange-100 rounded-2xl px-4 py-3 shadow-sm">
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.18em] mb-1">
                Reading Guide
              </p>
              <p
                className={`text-sm font-bold break-keep leading-relaxed ${
                  phase === "reading" ? "text-orange-700" : "text-slate-600"
                }`}
              >
                {getPhaseMessage()}
              </p>
            </div>
            <div
              className={`relative bg-white border rounded-[28px] p-8 lg:p-12 shadow-sm transition-all duration-500 ${phase === "reading" ? "border-orange-500 shadow-orange-100/70 scale-[1.01]" : "border-orange-100"}`}
            >
              {phase === "reading" && (
                <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-600 text-[11px] font-black font-mono">
                  REC {readingTime}s
                </div>
              )}
              <div
                className={`${readingTextSizeClass} font-black text-slate-800 leading-snug text-center break-keep max-h-[3.4em] md:max-h-[3.6em] overflow-hidden`}
              >
                {(() => {
                  let wordCursor = -1;
                  return textLines.map((line, lineIndex) => (
                    <div
                      key={`line-${lineIndex}`}
                      className="flex flex-wrap justify-center gap-y-1"
                    >
                      {line
                        .split(/\s+/)
                        .filter(Boolean)
                        .map((word, wordIndex) => {
                          wordCursor += 1;
                          return (
                            <React.Fragment key={`w-${lineIndex}-${wordIndex}`}>
                              <span
                                className={`transition-all duration-300 rounded-lg px-1 inline-block ${
                                  wordCursor <= highlightIndex
                                    ? "text-orange-700 bg-orange-100"
                                    : phase === "ready"
                                      ? "text-slate-700"
                                      : "text-slate-500"
                                }`}
                              >
                                {word}
                              </span>
                              <span className="w-1" />
                            </React.Fragment>
                          );
                        })}
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="flex flex-col items-center gap-6">
              {phase === "ready" && (
                <button
                  onClick={startReading}
                  className="group w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-[#0B1A3A] shadow-2xl shadow-slate-300/70 flex items-center justify-center hover:scale-105 transition-all border-4 border-white"
                  aria-label="읽기 녹음 시작"
                >
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
                </button>
              )}

              {phase === "reading" && (
                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-orange-400 rounded-full animate-ping opacity-35" />
                    <div className="absolute inset-0 bg-orange-300 rounded-full animate-pulse opacity-45" />
                    <button
                      onClick={stopReading}
                      className="relative z-10 w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-[#0B1A3A] shadow-2xl shadow-slate-300/70 flex items-center justify-center"
                      aria-label="읽기 녹음 종료"
                    >
                      <div className="w-7 h-7 lg:w-9 lg:h-9 bg-white rounded-2xl flex items-center justify-center">
                        <div className="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5 bg-slate-900 rounded-sm" />
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {phase === "review" && currentResult && (
                <div className="w-full max-w-xl animate-in zoom-in">
                  <div className="w-full bg-white rounded-[28px] p-6 shadow-xl border border-orange-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-orange-500" />

                    <div className="flex items-center gap-6 relative z-[1]">
                      <div className="border-r border-orange-100 pr-6 text-center shrink-0">
                        <span className="text-[9px] font-black text-orange-300 uppercase block mb-1">
                          Reading
                        </span>
                        <span className="text-3xl lg:text-4xl font-black text-orange-500 tracking-tight">
                          {currentResult.readingScore}%
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">
                          Metrics
                        </p>
                        <p className="text-sm lg:text-base font-bold text-slate-700 break-words">
                          읽기 시간 {currentResult.totalTime}s / 속도{" "}
                          {currentResult.wordsPerMinute} WPM
                        </p>
                        <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/90 border border-orange-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-wide text-orange-500">
                            {isPlayingAudio ? "Playback Active" : "Ready"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 relative z-[1]">
                      <button
                        onClick={playRecordedAudio}
                        className={`w-full py-4 rounded-2xl font-black text-sm ${isPlayingAudio ? trainingButtonStyles.orangeSolid : trainingButtonStyles.orangeOutline}`}
                      >
                        {isPlayingAudio ? "목소리 재생 중..." : "내 목소리 듣기"}
                      </button>
                      <button
                        onClick={handleNext}
                        className={`w-full py-4 rounded-2xl font-black text-base ${trainingButtonStyles.navyPrimary}`}
                      >
                        다음 문항으로
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        <aside className="w-full lg:w-[380px] h-auto min-h-[340px] lg:h-full mt-auto lg:mt-0 border-t lg:border-t-0 lg:border-l border-slate-50 bg-white p-3 lg:p-4 shrink-0 overflow-visible lg:overflow-hidden order-2">
          <div className="h-full">
            <AnalysisSidebar
              videoRef={videoRef}
              canvasRef={canvasRef}
              isFaceReady={sidebarMetrics.faceDetected}
              metrics={{
                symmetryScore: (sidebarMetrics.facialSymmetry || 0) * 100,
                openingRatio: (sidebarMetrics.mouthOpening || 0) * 100,
                audioLevel: phase === "reading" ? 40 : 0,
              }}
              showTracking={false}
              scoreLabel="현재 성취도"
              scoreValue={
                currentResult ? `${currentResult.readingScore}%` : "-"
              }
            />
          </div>
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

export default function Step5Page() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center font-black text-slate-200 uppercase tracking-tighter">
          Initialising Training...
        </div>
      }
    >
      <Step5Content />
    </Suspense>
  );
}
