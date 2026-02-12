"use client";
import React, { useState, useRef, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SpeechAnalyzer } from "@/lib/speech/SpeechAnalyzer";
import { useTraining } from "../TrainingContext";

import { SPEECH_REPETITION_PROTOCOLS } from "@/constants/speechTrainingData";
import { PlaceType } from "@/constants/trainingData";

import { AnalysisSidebar } from "@/components/training/AnalysisSidebar";
import FaceTracker from "@/components/diagnosis/FaceTracker";

export const dynamic = "force-dynamic";

function Step2Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateFooter } = useTraining();

  const place = (searchParams?.get("place") as PlaceType) || "home";

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
  const [isSaving, setIsSaving] = useState(false);
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
      SPEECH_REPETITION_PROTOCOLS[place] || SPEECH_REPETITION_PROTOCOLS.home;
    return [...questions].sort(() => Math.random() - 0.5).slice(0, 10);
  }, [place]);

  const currentItem = protocol[currentIndex];

  useEffect(() => {
    setIsMounted(true);
    // 기존 오염된 데이터 초기화
    localStorage.removeItem("step2_recorded_audios");
  }, []);

  useEffect(() => {
    const avgAcc =
      analysisResults.length > 0
        ? (
            analysisResults.reduce((a, b) => a + b.finalScore, 0) /
            analysisResults.length
          ).toFixed(1)
        : "0";

    if (updateFooter) {
      updateFooter({
        leftText: `SI: ${metrics.symmetryScore.toFixed(0)}% | 신뢰도: ${avgAcc}%`,
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

  /**
   * ✅ 수정된 저장 로직: Blob을 Base64 문자열로 변환하여 저장
   * 이 방식은 페이지를 새로고침하거나 이동해도 데이터가 유지됩니다.
   */
  const saveStepData = (recordData: any, audioBlob: Blob) => {
    return new Promise<void>((resolve, reject) => {
      setIsSaving(true);
      const reader = new FileReader();

      reader.onloadend = () => {
        try {
          const base64Audio = reader.result as string; // 영구적인 데이터 문자열
          const rawData = localStorage.getItem("step2_recorded_audios");
          const existingAudios = JSON.parse(rawData || "[]");

          const newEntry = {
            text: currentItem.text,
            audioUrl: base64Audio, // blob: 대신 data: 주소 저장
            pronunciationScore: recordData.finalScore,
            timestamp: new Date().toLocaleTimeString(),
          };

          const updatedList = [...existingAudios, newEntry];

          // 1. 개별 키 저장
          localStorage.setItem(
            "step2_recorded_audios",
            JSON.stringify(updatedList),
          );

          // 2. 통합 세션 객체 업데이트
          const session = JSON.parse(
            localStorage.getItem("kwab_training_session") || "{}",
          );
          localStorage.setItem(
            "kwab_training_session",
            JSON.stringify({
              ...session,
              step2: { items: updatedList },
            }),
          );

          console.log("✅ Step 2 데이터 Base64 저장 완료");
          resolve();
        } catch (err) {
          console.error("❌ 저장 실패:", err);
          reject(err);
        } finally {
          setIsSaving(false);
        }
      };

      reader.onerror = reject;
      reader.readAsDataURL(audioBlob); // Blob을 문자열로 읽기 시작
    });
  };

  const handleNext = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.onended = null;
      audioPlayerRef.current = null;
    }
    setIsPlayingAudio(false);

    if (currentIndex < protocol.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setResultScore(null);
      setTranscript("");
    } else {
      const avgScore =
        analysisResults.length > 0
          ? analysisResults.reduce((a, b) => a + b.finalScore, 0) /
            analysisResults.length
          : 0;
      const step1Score = searchParams.get("step1") || "0";
      router.push(
        `/step-3?place=${place}&step1=${step1Score}&step2=${avgScore.toFixed(0)}`,
      );
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
        await analyzerRef.current.startAnalysis((level) =>
          setMetrics((prev) => ({ ...prev, audioLevel: level })),
        );
        setIsRecording(true);
      } catch (err) {
        console.error("녹음 시작 실패:", err);
      }
    } else {
      setIsRecording(false);
      setIsAnalyzing(true);
      try {
        const result = await analyzerRef.current!.stopAnalysis(
          currentItem.text,
        );
        const speechScore = result.pronunciationScore;
        const faceScore = metrics.symmetryScore;

        let finalScore =
          speechScore >= 85 || faceScore >= 85
            ? Math.max(speechScore, faceScore)
            : speechScore * 0.6 + faceScore * 0.4;

        setTranscript(result.transcript);
        setResultScore(Number(finalScore.toFixed(1)));

        const recordData = {
          text: currentItem.text,
          finalScore: Number(finalScore.toFixed(1)),
          speechScore,
          faceScore,
        };
        setAnalysisResults((prev) => [...prev, recordData]);

        if (result.audioBlob) {
          // ✅ 비동기 저장 완료 대기
          await saveStepData(recordData, result.audioBlob);

          // 피드백 재생은 여전히 blobURL을 사용해도 무방 (즉시 재생용)
          const audio = new Audio(URL.createObjectURL(result.audioBlob));
          audioPlayerRef.current = audio;
          setIsPlayingAudio(true);
          audio.onended = () => handleNext();
          audio.play();
        }
        setIsAnalyzing(false);
      } catch (err) {
        setIsAnalyzing(false);
        console.error("분석 실패:", err);
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
        <div className="flex items-center gap-3 font-black text-sm text-slate-400">
          {isSaving && (
            <span className="text-orange-400 animate-pulse text-xs">
              SAVING...
            </span>
          )}
          <div className="bg-slate-50 px-5 py-2 rounded-2xl border border-slate-100">
            <span className="text-orange-500">{currentIndex + 1}</span> /{" "}
            {protocol.length}
          </div>
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
                className={`w-full bg-white rounded-[40px] p-10 lg:p-16 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.05)] border border-gray-100 text-center relative ${isRecording ? "ring-4 ring-red-500/10" : ""}`}
              >
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-6">
                  Listen and Repeat
                </p>
                <h1
                  className={`text-2xl lg:text-4xl font-black leading-tight ${isRecording ? "text-red-600" : "text-slate-800"}`}
                >
                  "{currentItem.text}"
                </h1>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center">
              {resultScore !== null && (
                <div className="w-full max-w-lg bg-white rounded-[40px] p-8 shadow-2xl border border-orange-100 animate-in zoom-in flex items-center gap-8 relative overflow-hidden">
                  <div className="border-r pr-8 text-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                      Score
                    </span>
                    <span className="text-5xl font-black text-orange-500">
                      {resultScore}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-300 uppercase mb-2">
                      Detected
                    </p>
                    <p className="text-xl font-bold text-slate-700 italic leading-tight">
                      "{transcript}"
                    </p>
                  </div>
                  <button
                    onClick={handleNext}
                    className="absolute bottom-4 right-6 px-4 py-2 bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase hover:bg-orange-600 transition-colors shadow-lg z-20"
                  >
                    {currentIndex === protocol.length - 1 ? "Finish" : "Next →"}
                  </button>
                </div>
              )}
            </div>

            <div className="flex-none flex flex-col items-center gap-6 pb-6">
              <button
                onClick={handleToggleRecording}
                disabled={isAnalyzing || isPlayingAudio || isSaving}
                className={`w-24 h-24 lg:w-28 lg:h-28 rounded-full shadow-2xl flex items-center justify-center transition-all ${isRecording ? "bg-red-500 scale-110" : "bg-white border-2 hover:border-orange-200 disabled:opacity-50"}`}
              >
                {isRecording ? (
                  <div className="w-8 h-8 bg-white rounded-md animate-pulse" />
                ) : isAnalyzing || isSaving ? (
                  <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-4xl lg:text-5xl">🎙️</span>
                )}
              </button>
              <p
                className={`font-black text-[10px] uppercase tracking-[0.3em] ${isRecording ? "text-red-500" : "text-slate-300"}`}
              >
                {isRecording
                  ? "Recording..."
                  : isAnalyzing
                    ? "Analyzing..."
                    : isPlayingAudio
                      ? "Auto-Reviewing..."
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
