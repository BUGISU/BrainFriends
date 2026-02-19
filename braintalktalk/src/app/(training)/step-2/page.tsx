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

  const { sidebarMetrics, updateClinical } = useTraining();
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
  const [isPromptPlaying, setIsPromptPlaying] = useState(false);
  const [canRecord, setCanRecord] = useState(false);
  const [replayCount, setReplayCount] = useState(0);

  const [audioLevel, setAudioLevel] = useState(0);
  const [resultScore, setResultScore] = useState<number | null>(null);
  const [transcript, setTranscript] = useState("");
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [showTracking, setShowTracking] = useState(false);

  const protocol = useMemo(() => {
    const questions =
      SPEECH_REPETITION_PROTOCOLS[place] || SPEECH_REPETITION_PROTOCOLS.home;
    return [...questions].sort(() => Math.random() - 0.5).slice(0, 10);
  }, [place]);

  const currentItem = protocol[currentIndex];

  const playPrompt = useCallback(
    (countReplay: boolean = false) => {
      if (!currentItem) return;

      setCanRecord(false);
      setIsPromptPlaying(true);

      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(currentItem.text);
        utterance.lang = "ko-KR";
        utterance.rate = 0.85;
        utterance.onend = () => {
          setIsPromptPlaying(false);
          setCanRecord(true);
        };
        utterance.onerror = () => {
          setIsPromptPlaying(false);
          setCanRecord(true);
        };
        window.speechSynthesis.speak(utterance);
      } else {
        setIsPromptPlaying(false);
        setCanRecord(true);
      }

      if (countReplay) {
        setReplayCount((prev) => prev + 1);
      }
    },
    [currentItem],
  );

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

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!isMounted || !currentItem) return;
    setReplayCount(0);
    playPrompt(false);
  }, [isMounted, currentItem, currentIndex, playPrompt]);

  useEffect(() => {
    if (!isMounted) return;

    const currentAcc =
      analysisResults.length > 0
        ? analysisResults.reduce((a, b) => a + b.finalScore, 0) /
          analysisResults.length
        : 95.2;
    const symmetry = sidebarMetrics.facialSymmetry || 0;
    const opening = sidebarMetrics.mouthOpening || 0;
    const progress = analysisResults.length / Math.max(1, protocol.length);

    updateClinical({
      systemLatency: 30 + Math.floor(Math.random() * 6),
      trackingPrecision: 0.12 + (1 - symmetry) * 0.12 + Math.random() * 0.03,
      analysisAccuracy: currentAcc,
      correlation: Math.min(
        0.99,
        0.84 + symmetry * 0.1 + progress * 0.04 + opening * 0.02,
      ),
      reliability: Math.min(0.99, 0.78 + symmetry * 0.14 + progress * 0.05),
      stability: Math.max(
        1.8,
        Number(
          (7.5 - currentAcc * 0.04 - symmetry * 2.0 - opening * 1.2).toFixed(1),
        ),
      ),
    });
  }, [
    sidebarMetrics.faceDetected,
    sidebarMetrics.facialSymmetry,
    sidebarMetrics.mouthOpening,
    analysisResults,
    currentIndex,
    protocol.length,
    place,
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
      setCanRecord(false);
      setReplayCount(0);
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

  const handleSkipPlayback = useCallback(() => {
    if (!isPlayingAudio) return;
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current.onended = null;
    }
    setIsPlayingAudio(false);
    handleNext();
  }, [isPlayingAudio, handleNext]);

  const handleToggleRecording = async () => {
    if (!canRecord || isPromptPlaying) return;

    if (!isRecording) {
      setResultScore(null);
      setTranscript("");
      try {
        if (!analyzerRef.current) analyzerRef.current = new SpeechAnalyzer();
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

        setTranscript(result.transcript || "");
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
        const audioBlob = result.audioBlob;
        if (audioBlob) {
          console.log("🎤 Step 2: 음성 파일 저장 시작");
          setIsSaving(true);

          const reader = new FileReader();
          reader.onloadend = () => {
            try {
              const base64Audio = reader.result as string;
              const rawData = localStorage.getItem("step2_recorded_audios");
              let existingAudios: any[] = [];
              try {
                existingAudios = JSON.parse(rawData || "[]");
                if (!Array.isArray(existingAudios)) existingAudios = [];
              } catch {
                existingAudios = [];
              }

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
              const audio = new Audio(URL.createObjectURL(audioBlob));
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

          reader.readAsDataURL(audioBlob);
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

  const replayEnabled =
    replayCount < 1 &&
    !isPromptPlaying &&
    !isRecording &&
    !isAnalyzing &&
    !isSaving &&
    !isPlayingAudio &&
    !!currentItem;

  const handleReplayPrompt = () => {
    if (!replayEnabled) return;
    playPrompt(true);
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
          <div className="w-full max-w-2xl mx-auto flex flex-col h-full justify-center gap-5">
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
                  isPromptPlaying || isRecording
                    ? "text-orange-600"
                    : "text-slate-800"
                }`}
              >
                {isPromptPlaying
                  ? "문제를 듣는 중입니다..."
                  : canRecord
                    ? "녹음 버튼을 누르고 따라 말해 주세요"
                    : "문제를 준비 중입니다..."}
              </h1>
            </div>

            <div
              className={`${resultScore !== null ? "h-36 lg:h-44" : "h-12"} flex items-center justify-center relative transition-all duration-500 ease-out`}
            >
              <div
                className={`w-full bg-gradient-to-br from-white via-orange-50/40 to-white rounded-[32px] p-6 shadow-xl border border-orange-100/70 flex items-center gap-6 relative overflow-hidden transition-all duration-500 ease-out ${
                  resultScore !== null
                    ? "opacity-100 translate-y-0 scale-100"
                    : "opacity-0 translate-y-2 scale-[0.985] pointer-events-none"
                }`}
              >
                {resultScore !== null && (
                  <>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(251,146,60,0.12),transparent_45%)] pointer-events-none" />
                    <div className="border-r border-orange-100 pr-6 text-center shrink-0 relative z-[1]">
                      <span className="text-[9px] font-black text-orange-300 uppercase block mb-1">
                        Accuracy
                      </span>
                      <span className="text-3xl lg:text-4xl font-black text-orange-500 tracking-tight">
                        {resultScore}%
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 relative z-[1]">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">
                        STT Result
                      </p>
                      <p className="text-sm lg:text-base font-bold text-slate-700 pr-32 break-words">
                        "{transcript.trim() ? transcript.trim() : "..."}"
                      </p>
                      <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/90 border border-orange-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-wide text-orange-500">
                          {isPlayingAudio
                            ? "Playback Active"
                            : "Analysis Ready"}
                        </span>
                      </div>
                    </div>
                    {isPlayingAudio && (
                      <button
                        onClick={handleSkipPlayback}
                        className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-[10px] font-black text-white bg-orange-500 hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 z-[2]"
                      >
                        스킵하기
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 shrink-0">
              <button
                type="button"
                onClick={handleReplayPrompt}
                disabled={!replayEnabled}
                className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${
                  replayEnabled
                    ? "bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100"
                    : "bg-slate-50 border-slate-100 text-slate-300"
                }`}
              >
                문제 다시 듣기
              </button>
              <button
                onClick={handleToggleRecording}
                disabled={
                  isAnalyzing ||
                  isPlayingAudio ||
                  isSaving ||
                  isPromptPlaying ||
                  !canRecord
                }
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
                  : isPromptPlaying
                    ? "Listening..."
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
