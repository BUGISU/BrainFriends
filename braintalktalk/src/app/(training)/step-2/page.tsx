"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  SPEECH_REPETITION_PROTOCOLS,
  PlaceType,
} from "@/constants/trainingData";

export default function Step2Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const placeParam = (searchParams.get("place") as PlaceType) || "home";
  const step1Score = searchParams.get("score") || "0";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // 시스템 음성 재생 중
  const [isRecording, setIsRecording] = useState(false); // 마이크 활성화 중
  const [silenceCounter, setSilenceCounter] = useState(0); // 침묵 시간 측정
  const [audioData, setAudioData] = useState<number>(0); // 실시간 오디오 수치 (그래프용)

  const trainingData = useMemo(
    () =>
      SPEECH_REPETITION_PROTOCOLS[placeParam] ||
      SPEECH_REPETITION_PROTOCOLS.home,
    [placeParam],
  );
  const currentItem = trainingData[currentIndex];

  // 오디오 분석을 위한 Ref
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    setIsMounted(true);
    return () => {
      window.speechSynthesis.cancel();
      stopMicrophone();
    };
  }, []);

  // 1. 시스템 사운드 재생
  const playVoice = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    setIsRecording(false);

    const msg = new SpeechSynthesisUtterance(currentItem.text);
    msg.lang = "ko-KR";
    msg.rate = 0.8;
    msg.onend = () => setIsSpeaking(false); // 사운드 끝나면 상태 변경
    window.speechSynthesis.speak(msg);
  }, [currentItem]);

  useEffect(() => {
    if (isMounted) playVoice();
  }, [currentIndex, isMounted, playVoice]);

  // 2. 마이크 켜기 & 오디오 분석
  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      setIsRecording(true);
      setSilenceCounter(0);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAudioData = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioData(average); // 실시간 수치 데이터 저장 (0~255)

        // 침묵 감지 로직 (수치가 10 미만이면 침묵으로 간주)
        if (average < 10) {
          setSilenceCounter((prev) => prev + 1 / 60); // 약 60fps 기준
        } else {
          setSilenceCounter(0);
        }

        animationRef.current = requestAnimationFrame(updateAudioData);
      };
      updateAudioData();
    } catch (err) {
      console.error("마이크 접근 실패:", err);
    }
  };

  const stopMicrophone = () => {
    setIsRecording(false);
    setAudioData(0);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current)
      streamRef.current.getTracks().forEach((track) => track.stop());
    if (audioContextRef.current) audioContextRef.current.close();
  };

  // 3. 10초 침묵 시 자동 이동
  useEffect(() => {
    if (silenceCounter >= 10) {
      stopMicrophone();
      alert(
        "아무런 말을 하지 않은 상태에서 10초 이상 지나 자동으로 다음으로 넘어갑니다.",
      );
      handleNext();
    }
  }, [silenceCounter]);

  const handleNext = () => {
    stopMicrophone();
    if (currentIndex < trainingData.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      router.push(`/step-3?place=${placeParam}&step1=${step1Score}`);
    }
  };

  if (!isMounted || !currentItem) return null;

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden text-black font-sans">
      <header className="px-10 py-4 border-b border-gray-50 flex justify-between items-center">
        <div className="text-left">
          <span className="text-[#DAA520] font-black text-[10px] tracking-widest uppercase block mb-0.5">
            Step 02
          </span>
          <h2 className="text-2xl font-black text-[#8B4513] tracking-tighter">
            따라말하기
          </h2>
        </div>
        <div className="bg-[#F8F9FA] px-6 py-1.5 rounded-2xl font-black text-xl text-[#DAA520]">
          {currentIndex + 1} / 10
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-6">
        {/* 문장 표시 */}
        <div className="text-center space-y-4">
          <p className="text-gray-400 font-bold text-lg">
            문장을 듣고 똑같이 말씀해 보세요
          </p>
          <div className="bg-amber-50 px-12 py-8 rounded-[40px] border-4 border-amber-100/50 shadow-inner">
            <h1 className="text-5xl font-black text-[#8B4513] leading-tight break-keep">
              {currentItem.text}
            </h1>
          </div>
        </div>

        {/* 🔹 오디오 시각화 그래프 영역 */}
        <div className="w-full max-w-xs h-24 flex items-end justify-center gap-1">
          {isRecording ? (
            Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-2 bg-amber-500 rounded-full transition-all duration-75"
                style={{
                  height: `${Math.max(10, audioData * Math.random() + 10)}%`,
                }}
              />
            ))
          ) : (
            <div className="text-gray-200 font-bold">대기 중...</div>
          )}
        </div>

        {/* 컨트롤 버튼 */}
        <div className="flex flex-col items-center space-y-6">
          {!isRecording ? (
            <button
              disabled={isSpeaking}
              onClick={startMicrophone}
              className={`w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-xl transition-all ${
                isSpeaking
                  ? "bg-gray-100 text-gray-300"
                  : "bg-amber-500 text-white hover:scale-105 active:scale-95"
              }`}
            >
              <span className="text-5xl mb-1">▶️</span>
              <span className="text-[10px] font-black uppercase">
                재생/시작
              </span>
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="w-32 h-32 bg-red-500 text-white rounded-full flex flex-col items-center justify-center shadow-xl animate-pulse hover:scale-105 active:scale-95 transition-all"
            >
              <span className="text-5xl mb-1">⏹️</span>
              <span className="text-[10px] font-black uppercase">
                정지/저장
              </span>
            </button>
          )}

          {isRecording && (
            <div className="text-center">
              <p className="text-amber-600 font-black animate-pulse">
                마이크가 켜져 있습니다. 말씀해 주세요!
              </p>
              <p className="text-gray-400 text-sm mt-1">
                침묵 시 자동 종료까지:{" "}
                {Math.max(0, 10 - Math.floor(silenceCounter))}초
              </p>
            </div>
          )}
        </div>
      </div>

      <footer className="py-5 px-10 bg-[#F8F9FA]/50 border-t border-gray-50 flex justify-between items-center text-[10px] font-black text-[#8B4513]/30 uppercase tracking-[0.2em]">
        <span>Voice Data: {audioData.toFixed(2)} dB</span>
        <span>Question {currentIndex + 1} / 10</span>
      </footer>
    </div>
  );
}
