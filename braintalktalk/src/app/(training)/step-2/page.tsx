"use client";

import React, { useState, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FaceTracker from "@/components/diagnosis/FaceTracker";
import { SpeechAnalyzer } from "@/lib/speech/SpeechAnalyzer";
import { SessionManager } from "@/lib/kwab/SessionManager";
import { loadPatientProfile } from "@/lib/patientStorage";
import {
  SPEECH_REPETITION_PROTOCOLS,
  PlaceType,
} from "@/constants/trainingData";
export const dynamic = "force-dynamic";
// --- 하위 컴포넌트: 실제 로직 포함 ---
function Step2Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const place = (searchParams.get("place") as PlaceType) || "cafe";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [metrics, setMetrics] = useState({ symmetryScore: 0, openingRatio: 0 });
  const [audioLevel, setAudioLevel] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resultScore, setResultScore] = useState<number | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [recordedAudios, setRecordedAudios] = useState<any[]>([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const analyzerRef = useRef<SpeechAnalyzer | null>(null);

  const protocol = useMemo(() => {
    const questions =
      SPEECH_REPETITION_PROTOCOLS[place] || SPEECH_REPETITION_PROTOCOLS.cafe;
    return [...questions].sort(() => Math.random() - 0.5);
  }, [place]);

  const currentItem = protocol[currentIndex];

  // ✅ [SaMD 로직] 하이브리드 점수 산출 및 결과 저장
  const saveStep2Results = (results: any[]) => {
    const patient = loadPatientProfile();
    if (!patient) return;

    const sessionManager = new SessionManager(
      { age: patient.age, educationYears: patient.educationYears || 0 },
      place,
    );

    // 하이브리드 가중치 적용 (음성 60%, 안면 40%)
    const avgSymmetry =
      results.reduce((a, b) => a + b.symmetryScore, 0) / results.length;
    const avgPronunciation =
      results.reduce((a, b) => a + b.pronunciationScore, 0) / results.length;

    // 최종 점수 산출: (음성 * 0.6) + (안면 * 0.4)
    const hybridScore = avgPronunciation * 0.6 + avgSymmetry * 0.4;

    sessionManager.saveStep2Result({
      items: results,
      averageSymmetry: avgSymmetry,
      averagePronunciation: avgPronunciation,
      hybridScore: Number(hybridScore.toFixed(2)),
      isSuccess: hybridScore >= 85, // 85% 기준 미달 시 리포트에서 별도 처리
      timestamp: Date.now(),
    });
  };

  const stopAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setIsPlayingAudio(false);
    handleNextTransition();
  };

  const handleNextTransition = () => {
    setResultScore(null);
    setTranscript("");
    if (currentIndex < protocol.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setAudioLevel(0);
    } else {
      saveStep2Results(analysisResults);
      router.push(`/step-3?place=${place}`);
    }
  };

  const handleToggleRecording = async () => {
    if (!isRecording) {
      setResultScore(null);
      setTranscript("");
      try {
        const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
        if (!apiKey) return alert("API 키를 확인해주세요.");
        if (!analyzerRef.current)
          analyzerRef.current = new SpeechAnalyzer(apiKey);

        await analyzerRef.current.startAnalysis((level) =>
          setAudioLevel(level),
        );
        setIsRecording(true);
      } catch (err) {
        console.error(err);
      }
    } else {
      try {
        setIsRecording(false);
        setIsAnalyzing(true);
        if (!analyzerRef.current) return;

        const result = await analyzerRef.current.stopAnalysis(currentItem.text);
        if (!result.audioBlob) return setIsAnalyzing(false);

        const audioUrl = URL.createObjectURL(result.audioBlob);
        setTranscript(result.transcript);
        setResultScore(result.pronunciationScore);
        setIsAnalyzing(false);

        const updatedResults = [
          ...analysisResults,
          {
            text: currentItem.text,
            symmetryScore: metrics.symmetryScore,
            pronunciationScore: result.pronunciationScore,
            audioLevel: result.audioLevel,
          },
        ];
        setAnalysisResults(updatedResults);
        setRecordedAudios([
          ...recordedAudios,
          { text: currentItem.text, audioUrl },
        ]);

        // 자동 재생 및 다음 단계 전환
        setTimeout(() => {
          const audio = new Audio(audioUrl);
          audioPlayerRef.current = audio;
          setIsPlayingAudio(true);
          audio.onended = () => {
            setIsPlayingAudio(false);
            handleNextTransition();
          };
          audio.play().catch(() => setIsPlayingAudio(false));
        }, 500);
      } catch (err) {
        setIsAnalyzing(false);
        console.error(err);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <header className="px-10 py-6 border-b border-gray-50 flex justify-between items-center bg-white shrink-0">
        <div className="text-left">
          <span className="text-[#DAA520] font-black text-[11px] tracking-[0.2em] uppercase">
            Step 02 • {place.toUpperCase()}
          </span>
          <h2 className="text-2xl font-black text-[#8B4513] tracking-tighter">
            문장 복창 훈련
          </h2>
        </div>
        <div className="bg-gray-50 px-5 py-2 rounded-full font-black text-sm text-gray-400">
          <span className="text-orange-500">{currentIndex + 1}</span> /{" "}
          {protocol.length}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[380px] border-r border-gray-50 bg-[#FCFCFC] p-8 shrink-0 overflow-y-auto">
          <div className="space-y-6">
            <FaceTracker
              onMetricsUpdate={(m) =>
                setMetrics({
                  symmetryScore: m.symmetryScore,
                  openingRatio: m.openingRatio * 100,
                })
              }
            />
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
              <MetricBar
                label="안면 대칭"
                value={metrics.symmetryScore}
                unit="%"
                color="bg-emerald-500"
              />
              <MetricBar
                label="입 벌림"
                value={metrics.openingRatio}
                unit=""
                color="bg-amber-400"
              />
              <div className="space-y-2 pt-2 border-t border-gray-50">
                <MetricBar
                  label="음성 레벨"
                  value={audioLevel}
                  unit="dB"
                  color={isRecording ? "bg-red-500" : "bg-blue-400"}
                />
              </div>
            </div>

            <div
              className={`bg-orange-50 rounded-[32px] p-6 border-2 transition-all duration-500 ${isPlayingAudio ? "border-blue-400 shadow-lg" : "border-orange-100"}`}
            >
              {resultScore !== null && transcript ? (
                <>
                  <div className="text-center">
                    <p className="text-5xl font-black text-orange-700">
                      {resultScore}%
                    </p>
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mt-1">
                      발음 정확도
                    </p>
                  </div>
                  <div className="bg-white/80 p-4 rounded-2xl border border-orange-100/50 mt-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                      인식된 텍스트
                    </p>
                    <p className="text-base font-bold text-gray-800 leading-snug">
                      "{transcript}"
                    </p>
                  </div>
                  {isPlayingAudio && (
                    <button
                      onClick={stopAudio}
                      className="w-full mt-4 py-3 bg-red-500 text-white rounded-2xl font-bold text-sm hover:bg-red-600 animate-pulse"
                    >
                      ⏹️ 정지 후 다음으로
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-gray-300 text-sm font-bold">
                  녹음 후 결과가 표시됩니다
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col items-center justify-center bg-white px-20">
          <div className="w-full max-w-3xl flex flex-col items-center gap-12">
            <p className="text-gray-400 font-bold text-sm uppercase tracking-[0.3em]">
              정확하게 따라 읽어보세요
            </p>
            <div
              className={`w-full py-20 px-12 rounded-[70px] shadow-2xl text-center relative overflow-hidden min-h-[280px] flex items-center justify-center transition-all duration-500 ${isRecording ? "bg-red-600 scale-[1.02]" : "bg-[#8B4513]"}`}
            >
              <h1 className="text-5xl font-black text-white leading-tight break-keep z-10">
                {currentItem?.text}
              </h1>
              {isRecording && (
                <div className="absolute inset-0 opacity-20 bg-white animate-pulse" />
              )}
            </div>
            <div className="h-48 flex flex-col items-center justify-center gap-6">
              <button
                onClick={handleToggleRecording}
                disabled={isAnalyzing || isPlayingAudio}
                className={`relative w-32 h-32 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${isRecording ? "bg-white ring-[12px] ring-red-500/20" : isAnalyzing || isPlayingAudio ? "bg-gray-100" : "bg-orange-500"}`}
              >
                {isRecording ? (
                  <div className="w-10 h-10 bg-red-500 rounded-lg animate-pulse" />
                ) : isAnalyzing ? (
                  <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="w-0 h-0 border-t-[22px] border-t-transparent border-l-[36px] border-l-white border-b-[22px] border-b-transparent ml-3" />
                )}
              </button>
              <p
                className={`font-black text-sm tracking-widest uppercase ${isRecording ? "text-red-500" : isAnalyzing ? "text-orange-500" : isPlayingAudio ? "text-blue-500" : "text-gray-300"}`}
              >
                {isRecording
                  ? "인식 중..."
                  : isAnalyzing
                    ? "분석 중..."
                    : isPlayingAudio
                      ? "내 목소리 듣는 중..."
                      : "버튼을 눌러 시작"}
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// --- 메인 페이지 컴포넌트: Suspense로 래핑 ---
export default function Step2Page() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      }
    >
      <Step2Content />
    </Suspense>
  );
}

// --- 공통 컴포넌트 ---
function MetricBar({ label, value, unit, color }: any) {
  return (
    <div className="space-y-1.5 font-black">
      <div className="flex justify-between text-[10px] text-gray-400 uppercase tracking-tighter">
        <span>{label}</span>
        <span>
          {value.toFixed(1)}
          {unit}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}
