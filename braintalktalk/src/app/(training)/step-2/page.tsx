"use client";
import React, { useState, useRef, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SpeechAnalyzer } from "@/lib/speech/SpeechAnalyzer";
import { useTraining } from "../TrainingContext";
import {
  SPEECH_REPETITION_PROTOCOLS,
  PlaceType,
} from "@/constants/trainingData";
import { AnalysisSidebar } from "@/components/training/AnalysisSidebar";
import FaceTracker from "@/components/diagnosis/FaceTracker";

export const dynamic = "force-dynamic";

function Step2Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateFooter } = useTraining();
  const place = (searchParams?.get("place") as PlaceType) || "cafe";

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const analyzerRef = useRef<SpeechAnalyzer | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [isFaceReady, setIsFaceReady] = useState(false);
  const [showTracking, setShowTracking] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [metrics, setMetrics] = useState({
    symmetryScore: 0,
    openingRatio: 0,
    audioLevel: 0,
    articulationScore: 0,
  });
  const [resultScore, setResultScore] = useState<number | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);

  const protocol = useMemo(() => {
    const questions =
      SPEECH_REPETITION_PROTOCOLS[place] || SPEECH_REPETITION_PROTOCOLS.cafe;
    return [...questions].sort(() => Math.random() - 0.5);
  }, [place]);

  const currentItem = protocol[currentIndex];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const avgAcc =
      analysisResults.length > 0
        ? (
            analysisResults.reduce((a, b) => a + b.pronunciationScore, 0) /
            analysisResults.length
          ).toFixed(1)
        : "0";
    if (updateFooter) {
      updateFooter({
        leftText: `SI: ${metrics.symmetryScore.toFixed(0)}% | 정확도: ${avgAcc}%`,
        centerText: `Step 2: 문장 복창 (${place.toUpperCase()})`,
        rightText: `${currentIndex + 1} / ${protocol.length}`,
      });
    }
  }, [
    metrics.symmetryScore,
    analysisResults,
    currentIndex,
    place,
    updateFooter,
    protocol.length,
  ]);

  // ✅ 다음 단계로 넘어가는 함수 (오디오 중지 로직 포함)
  const handleNext = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setIsPlayingAudio(false);

    if (currentIndex < protocol.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setResultScore(null);
      setTranscript("");
    } else {
      router.push(`/step-3?place=${place}&step2=done`);
    }
  };

  const handleToggleRecording = async () => {
    if (!isRecording) {
      setResultScore(null);
      setTranscript("");
      try {
        const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
        if (!analyzerRef.current)
          analyzerRef.current = new SpeechAnalyzer(apiKey!);
        await analyzerRef.current.startAnalysis((level) => {
          setMetrics((prev) => ({ ...prev, audioLevel: level }));
        });
        setIsRecording(true);
      } catch (err) {
        console.error(err);
      }
    } else {
      setIsRecording(false);
      setIsAnalyzing(true);
      try {
        const result = await analyzerRef.current!.stopAnalysis(
          currentItem.text,
        );
        setTranscript(result.transcript);
        setResultScore(result.pronunciationScore);
        setAnalysisResults((prev) => [
          ...prev,
          {
            text: currentItem.text,
            symmetryScore: metrics.symmetryScore,
            pronunciationScore: result.pronunciationScore,
          },
        ]);
        setIsAnalyzing(false);
        if (result.audioBlob) {
          const audio = new Audio(URL.createObjectURL(result.audioBlob));
          audioPlayerRef.current = audio;
          setIsPlayingAudio(true);
          audio.onended = () => {
            if (audioPlayerRef.current === audio) handleNext();
          };
          audio.play();
        }
      } catch (err) {
        setIsAnalyzing(false);
        console.error(err);
      }
    }
  };

  if (!isMounted || !currentItem) return null;

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden text-slate-900">
      <header className="h-20 px-10 border-b border-slate-50 flex justify-between items-center bg-white shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 font-black">
            02
          </div>
          <div>
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest leading-none mb-1">
              Step 02 • Repetition
            </p>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              문장 복창 훈련
            </h2>
          </div>
        </div>
        <div className="bg-slate-50 px-5 py-2 rounded-2xl border border-slate-100 font-black text-sm text-slate-400">
          <span className="text-orange-500">{currentIndex + 1}</span> /{" "}
          {protocol.length}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[350px] lg:w-[380px] border-r border-slate-50 bg-white p-3 shrink-0 relative flex flex-col">
          <AnalysisSidebar
            videoRef={videoRef}
            canvasRef={canvasRef}
            isFaceReady={isFaceReady}
            metrics={metrics}
            showTracking={showTracking}
            onToggleTracking={() => setShowTracking(!showTracking)}
          />
        </aside>

        <main className="flex-1 bg-[#FBFBFC] relative overflow-hidden">
          <div className="h-full w-full max-w-4xl mx-auto flex flex-col p-8 lg:p-12">
            <div className="flex-[1.5] flex items-center justify-center">
              <div
                className={`w-full bg-white rounded-[40px] p-10 lg:p-16 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.05)] border border-gray-100 text-center relative transition-all duration-500 ${isRecording ? "scale-[1.02] ring-4 ring-red-500/10" : ""}`}
              >
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-6">
                  Listen and Repeat
                </p>
                <h1
                  className={`text-2xl lg:text-4xl font-black leading-tight ${isRecording ? "text-red-600" : "text-slate-800"}`}
                >
                  "{currentItem.text}"
                </h1>
                {isRecording && (
                  <div className="absolute bottom-0 left-0 h-1.5 bg-red-500 w-full animate-pulse rounded-b-[40px]" />
                )}
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center relative">
              {resultScore !== null && (
                <div className="w-full max-w-lg bg-white rounded-[40px] p-8 shadow-2xl border border-orange-100 animate-in zoom-in duration-500 flex items-center gap-8 relative overflow-hidden">
                  <div className="border-r pr-8 text-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                      Score
                    </span>
                    <span className="text-5xl font-black text-orange-500">
                      {resultScore}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-300 uppercase mb-2 tracking-widest">
                      Detected Speech
                    </p>
                    <p className="text-xl font-bold text-slate-700 italic leading-tight">
                      "{transcript}"
                    </p>
                  </div>

                  {/* ✅ 결과창 우측 상단 SKIP 버튼 */}
                  <button
                    onClick={handleNext}
                    className="absolute top-4 right-6 text-[10px] font-black text-orange-400 hover:text-orange-600 uppercase tracking-widest flex items-center gap-1 transition-colors"
                  >
                    Skip Next <span className="text-sm">→</span>
                  </button>
                </div>
              )}
              {resultScore === null && (
                <div className="h-32 opacity-0">Spacer</div>
              )}
            </div>

            <div className="flex-none flex flex-col items-center gap-6 pb-6">
              <div className="relative">
                <button
                  onClick={handleToggleRecording}
                  disabled={isAnalyzing || isPlayingAudio}
                  className={`w-24 h-24 lg:w-28 lg:h-28 rounded-full shadow-2xl flex items-center justify-center transition-all duration-500 ${isRecording ? "bg-red-500 scale-110" : "bg-white border-2 hover:border-orange-200 disabled:opacity-50"}`}
                >
                  {isRecording ? (
                    <div className="w-8 h-8 bg-white rounded-md animate-pulse" />
                  ) : isAnalyzing ? (
                    <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-4xl lg:text-5xl">🎙️</span>
                  )}
                </button>

                {/* ✅ 녹음 버튼 옆에 작게 배치하는 보조 스킵 버튼 (재생 중일 때 노출) */}
                {isPlayingAudio && (
                  <button
                    onClick={handleNext}
                    className="absolute -right-16 top-1/2 -translate-y-1/2 bg-slate-100 hover:bg-slate-200 text-slate-500 px-4 py-2 rounded-full text-[10px] font-black tracking-tighter transition-all"
                  >
                    SKIP
                  </button>
                )}
              </div>
              <p
                className={`font-black text-[10px] uppercase tracking-[0.3em] ${isRecording ? "text-red-500" : "text-slate-300"}`}
              >
                {isRecording
                  ? "Listening..."
                  : isAnalyzing
                    ? "Analyzing..."
                    : isPlayingAudio
                      ? "Reviewing..."
                      : "Tap to Speak"}
              </p>
            </div>
          </div>
        </main>
      </div>
      <FaceTracker
        videoRef={videoRef}
        canvasRef={canvasRef}
        onReady={() => setIsFaceReady(true)}
        onMetricsUpdate={(m) =>
          setMetrics((prev) => ({
            ...prev,
            symmetryScore: m.symmetryScore,
            openingRatio: m.openingRatio * 100,
          }))
        }
      />
    </div>
  );
}

export default function Step2Page() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-white text-slate-400 font-black">
          LOADING...
        </div>
      }
    >
      <Step2Content />
    </Suspense>
  );
}
