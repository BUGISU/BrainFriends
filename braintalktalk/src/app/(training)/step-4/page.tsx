"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  Suspense,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { calculateLipMetrics, LipMetrics } from "@/utils/faceAnalysis";
import { PlaceType } from "@/constants/trainingData";
export const dynamic = "force-dynamic";
// --- 상황 시나리오 데이터 (기존과 동일) ---
const FLUENCY_SCENARIOS: Record<
  PlaceType,
  Array<{
    id: number;
    situation: string;
    prompt: string;
    hint: string;
    minDuration: number;
  }>
> = {
  home: [
    {
      id: 1,
      situation: "아침에 일어났을 때",
      prompt: "아침에 일어나서 무엇을 하시나요? 순서대로 말씀해 주세요.",
      hint: "예: 일어나서 세수하고...",
      minDuration: 10,
    },
    {
      id: 2,
      situation: "저녁 식사 준비",
      prompt: "저녁에 가족을 위해 어떤 음식을 만들고 싶으세요?",
      hint: "예: 된장찌개를 끓이려면...",
      minDuration: 10,
    },
    {
      id: 3,
      situation: "집 청소할 때",
      prompt: "집을 깨끗이 청소하려면 어떻게 해야 하나요?",
      hint: "예: 먼저 빗자루로...",
      minDuration: 10,
    },
  ],
  hospital: [
    {
      id: 1,
      situation: "접수할 때",
      prompt: "병원에 처음 왔을 때 어떻게 접수하나요?",
      hint: "예: 먼저 접수처에 가서...",
      minDuration: 10,
    },
    {
      id: 2,
      situation: "증상 설명",
      prompt: "의사 선생님께 어디가 아픈지 설명해 주세요.",
      hint: "예: 며칠 전부터 머리가...",
      minDuration: 10,
    },
    {
      id: 3,
      situation: "약국에서",
      prompt: "처방전을 들고 약국에 가면 어떻게 하나요?",
      hint: "예: 약사님께 처방전을 주고...",
      minDuration: 10,
    },
  ],
  cafe: [
    {
      id: 1,
      situation: "음료 주문",
      prompt: "카페에서 좋아하는 음료를 주문해 보세요.",
      hint: "예: 따뜻한 아메리카노 한 잔...",
      minDuration: 10,
    },
    {
      id: 2,
      situation: "친구와 대화",
      prompt: "카페에서 친구를 만났을 때 어떤 이야기를 하고 싶으세요?",
      hint: "예: 요즘 어떻게 지내?...",
      minDuration: 10,
    },
    {
      id: 3,
      situation: "직원에게 요청",
      prompt: "음료에 문제가 있을 때 어떻게 말씀하시겠어요?",
      hint: "예: 죄송한데 이 음료가...",
      minDuration: 10,
    },
  ],
  bank: [
    {
      id: 1,
      situation: "계좌 개설",
      prompt: "은행에서 새 통장을 만들려면 어떻게 해야 하나요?",
      hint: "예: 신분증을 가지고...",
      minDuration: 10,
    },
    {
      id: 2,
      situation: "돈 입금",
      prompt: "ATM에서 돈을 입금하는 방법을 설명해 주세요.",
      hint: "예: 카드를 넣고...",
      minDuration: 10,
    },
    {
      id: 3,
      situation: "상담 요청",
      prompt: "은행 직원에게 대출 상담을 요청해 보세요.",
      hint: "예: 안녕하세요, 대출에 대해...",
      minDuration: 10,
    },
  ],
  park: [
    {
      id: 1,
      situation: "산책할 때",
      prompt: "공원에서 산책하면서 보이는 것들을 설명해 주세요.",
      hint: "예: 나무가 있고, 꽃이...",
      minDuration: 10,
    },
    {
      id: 2,
      situation: "운동할 때",
      prompt: "공원에서 어떤 운동을 하시나요? 방법을 알려주세요.",
      hint: "예: 먼저 준비운동을 하고...",
      minDuration: 10,
    },
    {
      id: 3,
      situation: "날씨 이야기",
      prompt: "오늘 날씨가 어떤가요? 자세히 말씀해 주세요.",
      hint: "예: 오늘은 맑고...",
      minDuration: 10,
    },
  ],
  mart: [
    {
      id: 1,
      situation: "장보기",
      prompt: "마트에서 일주일치 장을 보려면 무엇을 사야 하나요?",
      hint: "예: 채소랑 고기, 그리고...",
      minDuration: 10,
    },
    {
      id: 2,
      situation: "물건 찾기",
      prompt: "마트 직원에게 원하는 물건 위치를 물어보세요.",
      hint: "예: 실례합니다, 라면이 어디...",
      minDuration: 10,
    },
    {
      id: 3,
      situation: "계산할 때",
      prompt: "계산대에서 어떻게 결제하시나요?",
      hint: "예: 카드로 결제할게요...",
      minDuration: 10,
    },
  ],
};

interface FluencyMetrics {
  totalDuration: number;
  speechDuration: number;
  silenceRatio: number;
  averageAmplitude: number;
  peakCount: number;
  fluencyScore: number;
}

// 1️⃣ 실제 로직을 담은 클라이언트 컴포넌트
function Step4Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const place = (searchParams.get("place") as PlaceType) || "home";
  const step3Score = searchParams.get("step3") || "0";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"ready" | "recording" | "review">("ready");
  const [isMounted, setIsMounted] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isFaceReady, setIsFaceReady] = useState(false);

  const [faceMetrics, setFaceMetrics] = useState<LipMetrics>({
    symmetryScore: 100,
    openingRatio: 0,
    isStretched: false,
    deviation: 0,
  });

  const [fluencyResults, setFluencyResults] = useState<FluencyMetrics[]>([]);
  const [currentFluency, setCurrentFluency] = useState<FluencyMetrics | null>(
    null,
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioAnimationRef = useRef<number | null>(null);
  const amplitudeHistoryRef = useRef<number[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const scenarios = useMemo(
    () => FLUENCY_SCENARIOS[place] || FLUENCY_SCENARIOS.home,
    [place],
  );
  const currentScenario = scenarios[currentIndex];

  const predictFace = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (landmarker && video && video.readyState >= 2) {
      const results = landmarker.detectForVideo(video, performance.now());
      if (results.faceLandmarks?.[0]) {
        setFaceMetrics(calculateLipMetrics(results.faceLandmarks[0]));
      }
    }
    animationRef.current = requestAnimationFrame(predictFace);
  }, []);

  const initAudioAnalysis = useCallback(
    (stream: MediaStream) => {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average);
        if (phase === "recording") amplitudeHistoryRef.current.push(average);
        audioAnimationRef.current = requestAnimationFrame(updateAudio);
      };
      updateAudio();
    },
    [phase],
  );

  useEffect(() => {
    setIsMounted(true);
    let isCancelled = false;

    async function initTracking() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
        );
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
        });

        if (isCancelled) return;
        landmarkerRef.current = landmarker;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { aspectRatio: 1.333, width: 320, height: 240 },
          audio: true,
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setIsFaceReady(true);
            animationRef.current = requestAnimationFrame(predictFace);
          };
        }
        initAudioAnalysis(stream);
      } catch (err) {
        console.error("초기화 실패:", err);
      }
    }

    initTracking();
    return () => {
      isCancelled = true;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioAnimationRef.current)
        cancelAnimationFrame(audioAnimationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [predictFace, initAudioAnalysis]);

  const startRecording = () => {
    setPhase("recording");
    setRecordingTime(0);
    amplitudeHistoryRef.current = [];
    timerRef.current = setInterval(
      () => setRecordingTime((prev) => prev + 1),
      1000,
    );
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const totalDuration = recordingTime;
    const history = amplitudeHistoryRef.current;

    const silenceThreshold = 15;
    const speechFrames = history.filter((amp) => amp >= silenceThreshold);
    const speechDuration =
      (speechFrames.length / Math.max(history.length, 1)) * totalDuration;
    const silenceRatio =
      ((totalDuration - speechDuration) / Math.max(totalDuration, 1)) * 100;

    let peakCount = 0;
    let inPeak = false;
    for (const amp of history) {
      if (amp > silenceThreshold * 2 && !inPeak) {
        peakCount++;
        inPeak = true;
      } else if (amp < silenceThreshold) {
        inPeak = false;
      }
    }

    const durationScore = Math.min(
      (speechDuration / currentScenario.minDuration) * 50,
      50,
    );
    const silenceScore = Math.max(30 - silenceRatio * 0.5, 0);
    const peakScore = Math.min(peakCount * 2, 20);
    const fluencyScore = Math.round(durationScore + silenceScore + peakScore);

    const metrics = {
      totalDuration,
      speechDuration: Math.round(speechDuration * 10) / 10,
      silenceRatio: Math.round(silenceRatio * 10) / 10,
      averageAmplitude: 0,
      peakCount,
      fluencyScore: Math.min(fluencyScore, 100),
    };

    setCurrentFluency(metrics);
    setFluencyResults((prev) => [...prev, metrics]);
    setPhase("review");
  };

  const handleNext = () => {
    if (currentIndex < scenarios.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setPhase("ready");
      setCurrentFluency(null);
      setRecordingTime(0);
    } else {
      const avgScore =
        fluencyResults.length > 0
          ? Math.round(
              fluencyResults.reduce((a, b) => a + b.fluencyScore, 0) /
                fluencyResults.length,
            )
          : 0;
      router.push(
        `/step-5?place=${place}&step3=${step3Score}&step4=${avgScore}`,
      );
    }
  };

  if (!isMounted || !currentScenario) return null;

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden text-black font-sans">
      <header className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
        <div className="text-left">
          <span className="text-[#DAA520] font-black text-[10px] tracking-widest uppercase block mb-0.5">
            Step 04 • {place.toUpperCase()}
          </span>
          <h2 className="text-xl font-black text-[#8B4513] tracking-tighter">
            유창성 학습
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold ${phase === "recording" ? "bg-red-100 text-red-600 animate-pulse" : "bg-gray-100 text-gray-500"}`}
          >
            {phase === "recording" ? `🔴 ${recordingTime}s` : "대기"}
          </div>
          <div className="bg-[#F8F9FA] px-4 py-1.5 rounded-2xl font-black text-lg text-[#DAA520]">
            {currentIndex + 1} / {scenarios.length}
          </div>
        </div>
      </header>

      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        <aside className="w-64 flex flex-col gap-3">
          <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-20 border-2 border-dashed border-green-400/50 rounded-full" />
            </div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-3">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              음성 레벨
            </h4>
            <div className="h-8 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${audioLevel > 30 ? "bg-green-500" : "bg-amber-500"}`}
                style={{ width: `${Math.min(audioLevel, 100)}%` }}
              />
            </div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-3">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              안면 분석
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center">
                <p className="text-gray-400">대칭지수</p>
                <p className="font-bold text-emerald-600">
                  {faceMetrics.symmetryScore}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-400">개구도</p>
                <p className="font-bold text-amber-600">
                  {faceMetrics.openingRatio.toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col items-center justify-center space-y-6">
          <div className="w-full max-w-lg text-center space-y-4">
            <div className="inline-block px-4 py-1 bg-amber-100 rounded-full">
              <span className="text-sm font-bold text-amber-700">
                🎭 상황: {currentScenario.situation}
              </span>
            </div>
            <div className="bg-gradient-to-br from-[#8B4513] to-[#A0522D] p-6 rounded-[30px] shadow-xl">
              <p className="text-xl font-bold text-white leading-relaxed">
                {currentScenario.prompt}
              </p>
            </div>
            {phase === "ready" && (
              <p className="text-gray-400 text-sm">
                💡 힌트: {currentScenario.hint}
              </p>
            )}
          </div>

          <div className="flex flex-col items-center space-y-4">
            {phase === "ready" && (
              <button
                onClick={startRecording}
                disabled={!isFaceReady}
                className={`w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-xl transition-all ${isFaceReady ? "bg-red-500 text-white hover:scale-105" : "bg-gray-200 text-gray-400"}`}
              >
                <span className="text-4xl mb-1">🎙️</span>
                <span className="text-xs font-black">시작</span>
              </button>
            )}
            {phase === "recording" && (
              <button
                onClick={stopRecording}
                className="w-32 h-32 bg-gray-800 text-white rounded-full flex flex-col items-center justify-center shadow-xl animate-pulse"
              >
                <span className="text-4xl mb-1">⏹️</span>
                <span className="text-xs font-black">종료</span>
              </button>
            )}
            {phase === "review" && currentFluency && (
              <div className="bg-white border-2 border-amber-200 rounded-[30px] p-5 shadow-lg w-full max-w-sm">
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div className="text-center p-2 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400">발화 시간</p>
                    <p className="font-black text-blue-600">
                      {currentFluency.speechDuration}초
                    </p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400">침묵 비율</p>
                    <p className="font-black text-amber-600">
                      {currentFluency.silenceRatio}%
                    </p>
                  </div>
                  <div className="text-center p-2 bg-amber-50 rounded-xl col-span-2">
                    <p className="text-xs text-amber-600">유창성 점수</p>
                    <p className="text-2xl font-black text-amber-700">
                      {currentFluency.fluencyScore}점
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleNext}
                  className="w-full py-3 bg-[#DAA520] text-white rounded-xl font-black hover:bg-[#B8860B]"
                >
                  {currentIndex < scenarios.length - 1
                    ? "다음 단계"
                    : "최종 결과 보기"}
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// 2️⃣ 메인 페이지 컴포넌트: Suspense 래핑
export default function Step4Page() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="font-black text-gray-400">
              유창성 분석 엔진 로드 중...
            </p>
          </div>
        </div>
      }
    >
      <Step4Content />
    </Suspense>
  );
}
