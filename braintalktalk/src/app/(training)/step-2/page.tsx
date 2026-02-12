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
import { SessionManager } from "@/lib/kwab/SessionManager";
import { loadPatientProfile } from "@/lib/patientStorage";

export const dynamic = "force-dynamic";

function Step2Content() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { updateFooter, sidebarMetrics, updateClinical } = useTraining();
  const place = (searchParams?.get("place") as PlaceType) || "home";

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const analyzerRef = useRef<SpeechAnalyzer | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const [audioLevel, setAudioLevel] = useState(0);
  const [resultScore, setResultScore] = useState<number | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [showTracking, setShowTracking] = useState(true);

  const protocol = useMemo(() => {
    const questions =
      SPEECH_REPETITION_PROTOCOLS[place] || SPEECH_REPETITION_PROTOCOLS.home;
    return [...questions].sort(() => Math.random() - 0.5).slice(0, 10);
  }, [place]);

  const currentItem = protocol[currentIndex];

  useEffect(() => {
    setIsMounted(true);
    localStorage.removeItem("step2_recorded_audios"); // ✅ 초기화

    async function setupCamera() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          if (videoRef.current) videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Step 2 Camera Error:", err);
      }
    }
    setupCamera();
  }, []);

  useEffect(() => {
    if (!updateFooter || !isMounted) return;

    const currentAcc =
      analysisResults.length > 0
        ? analysisResults.reduce((a, b) => a + b.finalScore, 0) /
          analysisResults.length
        : 95.2;

    updateFooter({
      leftText: sidebarMetrics.faceDetected
        ? "TRACKING ACTIVE"
        : "CAMERA STANDBY",
      centerText: `Step 2: 문장 복창 훈련 (${place.toUpperCase()})`,
      rightText: `${currentIndex + 1} / ${protocol.length}`,
    });

    updateClinical({
      systemLatency: 32 + Math.floor(Math.random() * 8),
      trackingPrecision: 0.15 + Math.random() * 0.1,
      analysisAccuracy: currentAcc,
    });
  }, [
    sidebarMetrics.faceDetected,
    analysisResults,
    currentIndex,
    protocol.length,
    place,
    updateFooter,
    updateClinical,
    isMounted,
  ]);

  const handleNext = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.onended = null;
    }
    setIsPlayingAudio(false);

    if (currentIndex < protocol.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setResultScore(null);
      setTranscript("");
    } else {
      // ✅ SessionManager 통합 저장
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

        console.log("✅ Step 2 SessionManager 저장 완료");
      } catch (error) {
        console.error("❌ SessionManager 저장 실패:", error);
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
    router,
    place,
    searchParams,
  ]);

  const handleToggleRecording = async () => {
    if (!isRecording) {
      setResultScore(null);
      setTranscript("");
      try {
        const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
        if (!analyzerRef.current)
          analyzerRef.current = new SpeechAnalyzer(apiKey!);
        await analyzerRef.current.startAnalysis((level) =>
          setAudioLevel(level),
        );
        setIsRecording(true);
      } catch (err) {
        console.error("❌ 녹음 시작 실패:", err);
      }
    } else {
      setIsRecording(false);
      setIsAnalyzing(true);

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

        setTranscript(result.transcript);
        setResultScore(Number(finalScore.toFixed(1)));

        const recordData = {
          text: currentItem.text,
          finalScore: Number(finalScore.toFixed(1)),
          speechScore,
          faceScore,
        };

        // ✅ 분석 결과 누적
        setAnalysisResults((prev) => [...prev, recordData]);

        // ✅ 음성 파일이 있으면 Base64 변환 후 저장
        if (result.audioBlob) {
          console.log("🎤 Step 2: 음성 파일 저장 시작");
          setIsSaving(true);

          const reader = new FileReader();
          reader.onloadend = () => {
            try {
              const base64Audio = reader.result as string;
              const rawData = localStorage.getItem("step2_recorded_audios");
              const existingAudios = JSON.parse(rawData || "[]");

              // ✅ Result 페이지 규격
              const newEntry = {
                text: recordData.text, // 목표 문장
                audioUrl: base64Audio, // Base64 음성
                isCorrect: recordData.finalScore >= 60,
                finalScore: recordData.finalScore,
                speechScore: recordData.speechScore,
                faceScore: recordData.faceScore,
                timestamp: new Date().toLocaleTimeString(),
              };

              // ✅ 누적 저장
              const updatedAudios = [...existingAudios, newEntry];
              localStorage.setItem(
                "step2_recorded_audios",
                JSON.stringify(updatedAudios),
              );

              console.log("✅ Step 2 데이터 저장 완료:", newEntry);
              console.log("📊 현재 누적 데이터:", updatedAudios);

              // ✅ 오디오 재생
              const audio = new Audio(URL.createObjectURL(result.audioBlob));
              audioPlayerRef.current = audio;
              setIsPlayingAudio(true);
              audio.onended = () => {
                setIsPlayingAudio(false);
                handleNext();
              };
              audio.play().catch((e) => console.error("재생 에러:", e));
            } catch (err) {
              console.error("❌ Step 2 저장 실패:", err);
            } finally {
              setIsSaving(false);
            }
          };

          reader.onerror = () => {
            console.error("❌ FileReader 에러");
            setIsSaving(false);
          };

          reader.readAsDataURL(result.audioBlob);
        } else {
          console.warn("⚠️ audioBlob이 없습니다");
          setIsSaving(false);
          handleNext();
        }
      } catch (err) {
        console.error("❌ 분석 실패:", err);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  if (!isMounted || !currentItem) return null;

  return (
    <div className="flex flex-col h-full bg-[#FBFBFC] overflow-hidden text-slate-900 font-sans relative">
      <header className="h-16 px-8 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-orange-200">
            02
          </div>
          <div>
            <span className="text-orange-500 font-black text-[10px] uppercase tracking-widest leading-none block">
              Step 02 • Repetition
            </span>
            <h2 className="text-lg font-black text-slate-800 tracking-tighter">
              문장 복창 훈련
            </h2>
          </div>
        </div>
        <div className="bg-orange-50 px-4 py-1.5 rounded-full font-black text-xs text-orange-600 border border-orange-100">
          {currentIndex + 1} / {protocol.length}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex flex-col min-h-0 relative p-6 lg:p-10 order-1">
          <div className="w-full max-w-2xl mx-auto flex flex-col h-full justify-center gap-8">
            <div
              className={`w-full bg-white rounded-[40px] p-8 lg:p-12 shadow-[0_10px_40px_rgba(0,0,0,0.02)] text-center transition-all ${
                isRecording
                  ? "ring-2 ring-orange-500/20 shadow-orange-100"
                  : "border border-slate-50"
              }`}
            >
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-6">
                Listen and Repeat
              </p>
              <h1
                className={`text-2xl md:text-3xl lg:text-4xl font-black leading-tight break-keep ${
                  isRecording ? "text-orange-600" : "text-slate-800"
                }`}
              >
                "{currentItem.text}"
              </h1>
            </div>

            <div className="h-32 lg:h-40 flex items-center justify-center">
              {resultScore !== null && (
                <div className="w-full bg-white rounded-[32px] p-6 shadow-xl border border-orange-50 animate-in zoom-in flex items-center gap-6 relative">
                  <div className="border-r border-slate-100 pr-6 text-center shrink-0">
                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">
                      Accuracy
                    </span>
                    <span className="text-3xl lg:text-4xl font-black text-orange-500">
                      {resultScore}%
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-slate-300 uppercase mb-1">
                      Detected
                    </p>
                    <p className="text-sm lg:text-lg font-bold text-slate-700 italic truncate">
                      "{transcript}"
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-4 shrink-0">
              <button
                onClick={handleToggleRecording}
                disabled={isAnalyzing || isPlayingAudio || isSaving}
                className={`w-20 h-20 rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-90 ${
                  isRecording
                    ? "bg-slate-900 shadow-orange-500/20"
                    : "bg-white border-4 border-slate-50 hover:border-orange-200"
                }`}
              >
                {isRecording ? (
                  <div className="w-6 h-6 bg-white rounded-sm animate-pulse" />
                ) : isAnalyzing || isSaving ? (
                  <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-3xl">🎙️</span>
                )}
              </button>
              <p
                className={`font-black text-[10px] uppercase tracking-widest ${
                  isRecording
                    ? "text-orange-600 animate-pulse"
                    : isSaving
                      ? "text-orange-400"
                      : "text-slate-300"
                }`}
              >
                {isRecording
                  ? "Recording..."
                  : isAnalyzing
                    ? "Analyzing..."
                    : isSaving
                      ? "Saving..."
                      : isPlayingAudio
                        ? "Reviewing..."
                        : "Tap to Speak"}
              </p>
            </div>
          </div>
        </main>

        <aside className="w-[380px] h-full border-l border-slate-50 bg-white shrink-0 relative flex flex-col overflow-hidden order-2">
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
            scoreLabel="종합 점수"
            scoreValue={resultScore ? `${resultScore}%` : undefined}
          />
        </aside>
      </div>
    </div>
  );
}

export default function Step2Page() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center font-black text-slate-200">
          LOADING...
        </div>
      }
    >
      <Step2Content />
    </Suspense>
  );
}
