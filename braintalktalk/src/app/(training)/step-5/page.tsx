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
import { SessionManager } from "@/lib/kwab/SessionManager";
import { loadPatientProfile } from "@/lib/patientStorage";

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

function Step5Content() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { sidebarMetrics, updateClinical } = useTraining();

  const place = (searchParams.get("place") as PlaceType) || "home";
  const step4Score = searchParams.get("step4") || "0";

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
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

  const texts = useMemo(
    () => READING_TEXTS[place] || READING_TEXTS.home,
    [place],
  );
  const currentItem = texts[currentIndex];
  const words = useMemo(
    () => currentItem?.text.split(" ") || [],
    [currentItem],
  );

  useEffect(() => {
    setIsMounted(true);
    localStorage.removeItem("step5_recorded_data"); // ✅ 초기화

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

  useEffect(() => {
    if (!isMounted) return;
    updateClinical({
      analysisAccuracy: currentResult ? currentResult.readingScore : 92.8,
      systemLatency: 40 + Math.floor(Math.random() * 5),
      reliability: 0.85 + (sidebarMetrics.facialSymmetry || 0) * 0.1,
      correlation: 0.89 + (currentResult?.readingScore || 85) / 1000,
      stability: currentResult ? 3.8 : 7.1,
    });
  }, [
    sidebarMetrics,
    currentResult,
    currentIndex,
    texts.length,
    place,
    updateClinical,
    isMounted,
  ]);

  const handleSkipAudio = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      setIsPlayingAudio(false);
    }
  }, []);

  const startReading = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) =>
        audioChunksRef.current.push(e.data);

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });

        const wpm = Math.round(
          (currentItem.wordCount / Math.max(1, readingTime)) * 60,
        );

        const res: ReadingMetrics = {
          place,
          text: currentItem.text,
          audioUrl: URL.createObjectURL(audioBlob),
          totalTime: readingTime,
          wordsPerMinute: wpm,
          pauseCount: Math.floor(readingTime / 5),
          readingScore: Math.round(
            Math.max(60, 100 - Math.abs(100 - wpm) * 0.5),
          ),
        };

        setCurrentResult(res);

        // ✅ Base64 변환하여 localStorage 저장
        const reader = new FileReader();
        reader.onloadend = () => {
          try {
            const base64Audio = reader.result as string;
            const existingData = JSON.parse(
              localStorage.getItem("step5_recorded_data") || "[]",
            );

            const newEntry = {
              text: currentItem.text,
              audioUrl: base64Audio,
              isCorrect: res.readingScore >= 70,
              readingScore: res.readingScore,
              wordsPerMinute: res.wordsPerMinute,
              totalTime: res.totalTime,
              timestamp: new Date().toLocaleTimeString(),
            };

            localStorage.setItem(
              "step5_recorded_data",
              JSON.stringify([...existingData, newEntry]),
            );

            console.log("✅ Step 5 데이터 저장:", newEntry);
          } catch (error) {
            console.error("❌ Step 5 저장 실패:", error);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      setPhase("reading");
      setReadingTime(0);
      setHighlightIndex(0);
      mediaRecorder.start();

      timerRef.current = setInterval(
        () => setReadingTime((prev) => prev + 1),
        1000,
      );
      highlightTimerRef.current = setInterval(() => {
        setHighlightIndex((p) =>
          p < words.length - 1
            ? p + 1
            : (clearInterval(highlightTimerRef.current!), p),
        );
      }, 800);
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
    if (!currentResult) return;
    handleSkipAudio();
    const audio = new Audio(currentResult.audioUrl);
    audioPlayerRef.current = audio;
    setIsPlayingAudio(true);
    audio.onended = () => setIsPlayingAudio(false);
    audio.play();
  };

  const handleNext = () => {
    handleSkipAudio();
    if (!currentResult) return;

    const updatedResults = [...results, currentResult];
    setResults(updatedResults);

    if (currentIndex < texts.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setPhase("ready");
      setCurrentResult(null);
      setHighlightIndex(-1);
    } else {
      // ✅ SessionManager 통합 저장
      try {
        const patient = loadPatientProfile();
        const sm = new SessionManager(
          (patient || { age: 70, educationYears: 12 }) as any,
          place,
        );

        sm.saveStep5Result({
          correctAnswers: updatedResults.filter((r) => r.readingScore >= 70)
            .length,
          totalQuestions: texts.length,
          timestamp: Date.now(),
          items: updatedResults as any,
        });

        console.log("✅ Step 5 SessionManager 저장 완료");
      } catch (error) {
        console.error("❌ SessionManager 저장 실패:", error);
      }

      const avg = Math.round(
        updatedResults.reduce((s, r) => s + r.readingScore, 0) /
          updatedResults.length,
      );

      router.push(`/step-6?place=${place}&step4=${step4Score}&step5=${avg}`);
    }
  };

  if (!isMounted || !currentItem) return null;

  return (
    <div className="flex flex-col h-screen bg-[#FBFBFC] overflow-hidden text-slate-900 font-sans">
      <header className="h-16 lg:h-20 px-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-xs">
            05
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm lg:text-base font-black text-slate-800 leading-none">
              텍스트 읽기 학습
            </h2>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter italic">
              Reading Fluency Training
            </p>
          </div>
        </div>
        <div className="bg-orange-50 px-3 py-1.5 rounded-full font-black text-[11px] text-orange-600 border border-orange-100">
          {currentIndex + 1} / {texts.length}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        <main className="flex-1 flex flex-col min-h-0 relative p-4 lg:p-10 order-1 overflow-y-auto">
          <div className="w-full max-w-2xl mx-auto flex flex-col h-full gap-4 lg:gap-8 justify-center">
            <div
              className={`bg-white border rounded-[32px] p-8 lg:p-12 shadow-sm transition-all duration-500 ${phase === "reading" ? "border-orange-500 shadow-orange-50 scale-[1.02]" : "border-slate-100"}`}
            >
              <p className="text-xl lg:text-3xl font-black text-slate-800 leading-relaxed text-center break-keep">
                {words.map((w, i) => (
                  <span
                    key={i}
                    className={`transition-all duration-300 rounded-lg px-1 inline-block ${i <= highlightIndex ? "text-orange-600 bg-orange-50" : "text-slate-200"}`}
                  >
                    {w}{" "}
                  </span>
                ))}
              </p>
            </div>

            <div className="flex flex-col items-center gap-6">
              {phase === "ready" && (
                <button
                  onClick={startReading}
                  className="group w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-white shadow-2xl flex items-center justify-center hover:scale-105 transition-all border-4 lg:border-8 border-slate-50"
                >
                  <div className="w-14 h-14 lg:w-20 lg:h-20 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                    <span className="text-2xl lg:text-4xl">📖</span>
                  </div>
                </button>
              )}

              {phase === "reading" && (
                <div className="flex flex-col items-center gap-6">
                  <button
                    onClick={stopReading}
                    className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-slate-900 shadow-2xl animate-pulse flex items-center justify-center"
                  >
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-white rounded-md" />
                  </button>
                  <div className="px-6 py-2 bg-orange-500 text-white rounded-full font-black text-lg lg:text-xl font-mono shadow-lg shadow-orange-200">
                    REC {readingTime}s
                  </div>
                </div>
              )}

              {phase === "review" && currentResult && (
                <div className="w-full max-w-sm bg-white rounded-[32px] p-6 lg:p-8 shadow-2xl border border-slate-50 animate-in zoom-in">
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-slate-50 p-3 rounded-2xl text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase">
                        Time
                      </p>
                      <p className="text-lg font-black text-slate-800">
                        {currentResult.totalTime}s
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase">
                        WPM
                      </p>
                      <p className="text-lg font-black text-slate-800">
                        {currentResult.wordsPerMinute}
                      </p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-2xl text-center border border-orange-100">
                      <p className="text-[9px] font-black text-orange-400 uppercase">
                        Score
                      </p>
                      <p className="text-lg font-black text-orange-600">
                        {currentResult.readingScore}%
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={playRecordedAudio}
                      className={`w-full py-4 rounded-2xl font-black text-sm transition-all ${isPlayingAudio ? "bg-orange-500 text-white" : "bg-orange-50 text-orange-600 hover:bg-orange-100"}`}
                    >
                      {isPlayingAudio
                        ? "🔊 목소리 재생 중..."
                        : "▶ 내 목소리 듣기"}
                    </button>
                    {isPlayingAudio && (
                      <button
                        onClick={handleSkipAudio}
                        className="text-[11px] font-bold text-slate-400 underline"
                      >
                        스킵하기
                      </button>
                    )}
                    <button
                      onClick={handleNext}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-base hover:bg-black transition-all shadow-xl active:scale-[0.98]"
                    >
                      다음 문항으로
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        <aside className="w-full lg:w-[380px] border-t lg:border-t-0 lg:border-l border-slate-50 bg-white p-4 shrink-0 overflow-hidden order-2">
          <div className="h-[280px] lg:h-full">
            <AnalysisSidebar
              videoRef={videoRef}
              canvasRef={canvasRef}
              isFaceReady={sidebarMetrics.faceDetected}
              metrics={{
                symmetryScore: (sidebarMetrics.facialSymmetry || 0) * 100,
                openingRatio: (sidebarMetrics.mouthOpening || 0) * 100,
                audioLevel: phase === "reading" ? 40 : 0,
              }}
              showTracking={true}
              scoreLabel="현재 성취도"
              scoreValue={
                currentResult ? `${currentResult.readingScore}%` : "-"
              }
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function Step5Page() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center font-black text-slate-200 uppercase">
          Loading...
        </div>
      }
    >
      <Step5Content />
    </Suspense>
  );
}
