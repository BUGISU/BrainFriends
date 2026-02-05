"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FaceTracker from "@/components/diagnosis/FaceTracker";
import { SpeechAnalyzer } from "@/lib/speech/SpeechAnalyzer";
import { SessionManager, Step2Result } from "@/lib/kwab/SessionManager";
import { loadPatientProfile } from "@/lib/patientStorage";
import {
  SPEECH_REPETITION_PROTOCOLS,
  PlaceType,
} from "@/constants/trainingData";

export default function Step2Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const place = (searchParams.get("place") as PlaceType) || "cafe";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [metrics, setMetrics] = useState({ symmetryScore: 0, openingRatio: 0 });
  const [audioLevel, setAudioLevel] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false); // 🔹 분석 중 상태 추가
  const [resultScore, setResultScore] = useState<number | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [analysisResults, setAnalysisResults] = useState<
    Array<{
      text: string;
      symmetryScore: number;
      pronunciationScore: number;
      audioLevel: number;
    }>
  >([]);

  const analyzerRef = useRef<SpeechAnalyzer | null>(null);

  // 1. 프로토콜 랜덤 섞기
  const protocol = useMemo(() => {
    const questions =
      SPEECH_REPETITION_PROTOCOLS[place] || SPEECH_REPETITION_PROTOCOLS.cafe;
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [place]);

  const currentItem = protocol[currentIndex];

  // 2. 녹음 및 분석 제어 (이동 로직 보정)
  const handleToggleRecording = async () => {
    if (!isRecording) {
      // --- 녹음 시작 ---
      setResultScore(null);
      setTranscript("");
      try {
        const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
        if (!apiKey) {
          alert("OpenAI API 키를 확인해주세요.");
          return;
        }
        if (!analyzerRef.current)
          analyzerRef.current = new SpeechAnalyzer(apiKey);
        await analyzerRef.current.startAnalysis((level) =>
          setAudioLevel(level),
        );
        setIsRecording(true);
      } catch (err) {
        console.error("Recording Start Error:", err);
      }
    } else {
      // --- 녹음 중지 및 분석 ---
      try {
        setIsRecording(false);
        setIsAnalyzing(true); // 🔹 분석 중 레이블 표시

        if (!analyzerRef.current) return;
        const result = await analyzerRef.current.stopAnalysis(currentItem.text);

        setTranscript(result.transcript);
        setResultScore(result.pronunciationScore);

        const newResult = {
          text: currentItem.text,
          symmetryScore: metrics.symmetryScore,
          pronunciationScore: result.pronunciationScore,
          audioLevel: result.audioLevel,
        };

        // 🔹 state 업데이트와 별개로 최신 배열 생성하여 이동 로직에 사용
        const updatedResults = [...analysisResults, newResult];
        setAnalysisResults(updatedResults);

        // 🔹 2.5초 대기 후 다음 단계로 자동 이동
        setTimeout(() => {
          setIsAnalyzing(false);

          if (currentIndex < protocol.length - 1) {
            // 다음 문제로
            setCurrentIndex((prev) => prev + 1);
            setResultScore(null);
            setTranscript("");
            setAudioLevel(0);
          } else {
            // Step 2 완료 후 Step 3 이동
            saveStep2Results(updatedResults);
            router.push(`/step-3?place=${place}`);
          }
        }, 2500);
      } catch (err) {
        console.error("Analysis Error:", err);
        alert("음성 분석 중 오류가 발생했습니다.");
        setIsRecording(false);
        setIsAnalyzing(false);
      }
    }
  };

  const saveStep2Results = (results: typeof analysisResults) => {
    const patient = loadPatientProfile();
    if (!patient) return;
    const sessionManager = new SessionManager(
      { age: patient.age, educationYears: patient.educationYears || 0 },
      place,
    );
    const avgSymmetry =
      results.reduce((sum, r) => sum + r.symmetryScore, 0) / results.length;
    const avgPronunciation =
      results.reduce((sum, r) => sum + r.pronunciationScore, 0) /
      results.length;

    sessionManager.saveStep2Result({
      items: results,
      averageSymmetry: avgSymmetry,
      averagePronunciation: avgPronunciation,
      timestamp: Date.now(),
    });
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
                {isRecording && (
                  <div className="flex gap-1 h-6 items-end justify-center bg-gray-50 rounded-lg overflow-hidden">
                    {[...Array(15)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-red-400 rounded-full transition-all duration-75"
                        style={{
                          height: `${Math.random() * audioLevel + 10}%`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 결과 패널 */}
            {(resultScore !== null || transcript) && (
              <div className="bg-orange-50 rounded-[32px] p-6 border border-orange-100 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="text-center">
                  <p className="text-5xl font-black text-orange-700">
                    {resultScore}%
                  </p>
                  <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mt-1">
                    발음 정확도
                  </p>
                </div>
                <div className="bg-white/80 p-4 rounded-2xl border border-orange-100/50">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                    인식된 텍스트
                  </p>
                  <p className="text-base font-bold text-gray-800 leading-snug break-keep">
                    "{transcript}"
                  </p>
                </div>
              </div>
            )}
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
              <h1 className="text-5xl font-black text-white leading-tight break-keep z-10 relative">
                {currentItem?.text}
              </h1>
              {isRecording && (
                <div className="absolute inset-0 opacity-20 bg-white animate-pulse" />
              )}
              <div className="absolute top-[-20px] right-[-10px] text-white/5 text-[180px] font-black italic select-none">
                {currentIndex + 1}
              </div>
            </div>

            <div className="h-48 flex flex-col items-center justify-center gap-6 text-center">
              <button
                onClick={handleToggleRecording}
                disabled={isAnalyzing}
                className={`relative w-32 h-32 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-95 ${
                  isRecording
                    ? "bg-white ring-[12px] ring-red-500/20"
                    : isAnalyzing
                      ? "bg-gray-100 cursor-wait"
                      : "bg-orange-500 hover:scale-105"
                }`}
              >
                {isRecording ? (
                  <div className="w-10 h-10 bg-red-500 rounded-lg animate-pulse" />
                ) : isAnalyzing ? (
                  <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="w-0 h-0 border-t-[22px] border-t-transparent border-l-[36px] border-l-white border-b-[22px] border-b-transparent ml-3" />
                )}
                {isRecording && (
                  <div className="absolute inset-0 rounded-full border-4 border-red-400 opacity-50 animate-ping" />
                )}
              </button>

              <p
                className={`font-black text-sm tracking-widest uppercase transition-colors ${
                  isRecording
                    ? "text-red-500"
                    : isAnalyzing
                      ? "text-orange-500"
                      : "text-gray-300"
                }`}
              >
                {isRecording
                  ? "목소리를 인식하고 있습니다..."
                  : isAnalyzing
                    ? "정확도를 분석하고 있습니다..."
                    : "버튼을 눌러 훈련 시작"}
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

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
