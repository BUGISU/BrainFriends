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

// --- 읽기 텍스트 데이터 (기존 데이터 유지) ---
const READING_TEXTS: Record<
  PlaceType,
  Array<{
    id: number;
    title: string;
    text: string;
    difficulty: "easy" | "medium" | "hard";
    wordCount: number;
  }>
> = {
  home: [
    {
      id: 1,
      title: "아침 일과",
      text: "아침에 일어나면 세수를 하고 이를 닦습니다. 그리고 맛있는 아침 밥을 먹습니다.",
      difficulty: "easy",
      wordCount: 15,
    },
    {
      id: 2,
      title: "우리 집",
      text: "우리 집에는 거실과 방이 있습니다. 거실에는 소파와 텔레비전이 있고, 방에는 침대와 책상이 있습니다. 부엌에서는 맛있는 음식을 만들 수 있습니다.",
      difficulty: "medium",
      wordCount: 28,
    },
    {
      id: 3,
      title: "가족과 저녁",
      text: "저녁이 되면 가족들이 모두 집에 돌아옵니다. 함께 저녁 식사를 하면서 오늘 있었던 일을 이야기합니다. 식사 후에는 텔레비전을 보거나 책을 읽습니다. 가족과 함께하는 시간은 언제나 행복합니다.",
      difficulty: "hard",
      wordCount: 42,
    },
  ],
  hospital: [
    {
      id: 1,
      title: "병원 가기",
      text: "몸이 아프면 병원에 갑니다. 의사 선생님이 어디가 아픈지 물어봅니다.",
      difficulty: "easy",
      wordCount: 14,
    },
    {
      id: 2,
      title: "진료 받기",
      text: "병원에 도착하면 먼저 접수를 합니다. 번호표를 받고 대기실에서 기다립니다. 이름이 불리면 진료실로 들어갑니다. 의사 선생님께 증상을 자세히 말씀드립니다.",
      difficulty: "medium",
      wordCount: 32,
    },
    {
      id: 3,
      title: "약 복용",
      text: "의사 선생님이 처방전을 줍니다. 처방전을 가지고 약국에 갑니다. 약사님이 약을 지어 주시면서 복용 방법을 알려줍니다. 식후 삼십 분에 물과 함께 약을 먹습니다. 약을 빠뜨리지 않고 먹어야 빨리 낫습니다.",
      difficulty: "hard",
      wordCount: 48,
    },
  ],
  cafe: [
    {
      id: 1,
      title: "커피 주문",
      text: "카페에 가서 따뜻한 커피를 주문합니다. 잠시 기다리면 음료가 나옵니다.",
      difficulty: "easy",
      wordCount: 14,
    },
    {
      id: 2,
      title: "카페에서",
      text: "오늘은 날씨가 좋아서 카페에 왔습니다. 창가 자리에 앉아 아메리카노를 마십니다. 책을 읽으면서 여유로운 시간을 보냅니다. 이런 시간이 참 좋습니다.",
      difficulty: "medium",
      wordCount: 30,
    },
    {
      id: 3,
      title: "친구와 카페",
      text: "오랜만에 친구를 만나 카페에 갔습니다. 친구는 라떼를 시키고 나는 아이스 아메리카노를 시켰습니다. 우리는 서로의 근황을 이야기하며 즐거운 시간을 보냈습니다. 다음에 또 만나자고 약속했습니다. 친구와 함께하는 시간은 소중합니다.",
      difficulty: "hard",
      wordCount: 45,
    },
  ],
  bank: [
    {
      id: 1,
      title: "은행 가기",
      text: "은행에 가서 통장을 만듭니다. 신분증을 꼭 가져가야 합니다.",
      difficulty: "easy",
      wordCount: 12,
    },
    {
      id: 2,
      title: "ATM 사용",
      text: "현금이 필요하면 ATM을 이용합니다. 카드를 넣고 비밀번호를 입력합니다. 원하는 금액을 선택하면 돈이 나옵니다. 카드와 영수증을 챙기는 것을 잊지 마세요.",
      difficulty: "medium",
      wordCount: 32,
    },
    {
      id: 3,
      title: "적금 가입",
      text: "은행에서 적금에 가입하려고 합니다. 창구에서 상담을 받고 여러 상품을 비교합니다. 금리와 만기 기간을 확인한 후 가장 좋은 상품을 선택합니다. 매달 일정 금액을 자동으로 이체하기로 했습니다. 목돈을 모으는 좋은 방법입니다.",
      difficulty: "hard",
      wordCount: 50,
    },
  ],
  park: [
    {
      id: 1,
      title: "공원 산책",
      text: "공원에서 산책을 합니다. 나무와 꽃이 많아서 기분이 좋습니다.",
      difficulty: "easy",
      wordCount: 12,
    },
    {
      id: 2,
      title: "운동하기",
      text: "아침마다 공원에서 운동을 합니다. 먼저 가볍게 스트레칭을 하고 천천히 걷습니다. 운동 기구로 팔과 다리 운동도 합니다. 땀을 흘리고 나면 기분이 상쾌합니다.",
      difficulty: "medium",
      wordCount: 32,
    },
    {
      id: 3,
      title: "봄 나들이",
      text: "따뜻한 봄날, 가족과 함께 공원으로 나들이를 갔습니다. 아이들은 놀이터에서 신나게 뛰어놀고, 어른들은 벤치에 앉아 이야기를 나눕니다. 도시락을 먹으며 행복한 시간을 보냈습니다. 저녁노을을 보며 집으로 돌아왔습니다. 즐거운 하루였습니다.",
      difficulty: "hard",
      wordCount: 48,
    },
  ],
  mart: [
    {
      id: 1,
      title: "장보기",
      text: "마트에서 과일과 채소를 삽니다. 카트에 담아서 계산대로 갑니다.",
      difficulty: "easy",
      wordCount: 12,
    },
    {
      id: 2,
      title: "마트 쇼핑",
      text: "일주일 치 장을 보러 마트에 갔습니다. 먼저 채소 코너에서 배추와 양파를 담습니다. 정육 코너에서 돼지고기도 삽니다. 계산대에서 카드로 결제하고 영수증을 받습니다.",
      difficulty: "medium",
      wordCount: 34,
    },
    {
      id: 3,
      title: "할인 행사",
      text: "오늘 마트에서 큰 할인 행사를 합니다. 평소보다 물건이 많이 저렴합니다. 필요한 것들의 목록을 미리 작성해 왔습니다. 목록대로 물건을 담으니 불필요한 지출을 줄일 수 있습니다. 포인트 카드를 적립하면 다음에 할인도 받을 수 있습니다. 알뜰하게 장을 보니 기분이 좋습니다.",
      difficulty: "hard",
      wordCount: 55,
    },
  ],
};

interface ReadingMetrics {
  textId: number;
  totalTime: number;
  wordsPerMinute: number;
  pauseCount: number;
  averageAmplitude: number;
  readingScore: number;
}

function Step5Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const place = (searchParams.get("place") as PlaceType) || "home";
  const step4Score = searchParams.get("step4") || "0";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"ready" | "reading" | "review">("ready");
  const [isMounted, setIsMounted] = useState(false);
  const [readingTime, setReadingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isFaceReady, setIsFaceReady] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const [faceMetrics, setFaceMetrics] = useState<LipMetrics>({
    symmetryScore: 100,
    openingRatio: 0,
    isStretched: false,
    deviation: 0,
  });
  const [readingResults, setReadingResults] = useState<ReadingMetrics[]>([]);
  const [currentReading, setCurrentReading] = useState<ReadingMetrics | null>(
    null,
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioAnimationRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const highlightIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const amplitudeHistoryRef = useRef<number[]>([]);

  const texts = useMemo(
    () => READING_TEXTS[place] || READING_TEXTS.home,
    [place],
  );
  const currentText = texts[currentIndex];
  const words = useMemo(() => currentText.text.split(/\s+/), [currentText]);

  const predictFace = useCallback(() => {
    if (landmarkerRef.current && videoRef.current?.readyState >= 2) {
      const results = landmarkerRef.current.detectForVideo(
        videoRef.current,
        performance.now(),
      );
      if (results.faceLandmarks?.[0])
        setFaceMetrics(calculateLipMetrics(results.faceLandmarks[0]));
    }
    animationRef.current = requestAnimationFrame(predictFace);
  }, []);

  const initAudioAnalysis = useCallback(
    (stream: MediaStream) => {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(avg);
        if (phase === "reading") amplitudeHistoryRef.current.push(avg);
        audioAnimationRef.current = requestAnimationFrame(updateAudio);
      };
      updateAudio();
    },
    [phase],
  );

  useEffect(() => {
    setIsMounted(true);
    let isCancelled = false;
    async function init() {
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
          video: { width: 320, height: 240 },
          audio: true,
        });
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
        console.error(err);
      }
    }
    init();
    return () => {
      isCancelled = true;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioAnimationRef.current)
        cancelAnimationFrame(audioAnimationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (highlightIntervalRef.current)
        clearInterval(highlightIntervalRef.current);
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [predictFace, initAudioAnalysis]);

  const startReading = () => {
    setPhase("reading");
    setReadingTime(0);
    setHighlightIndex(0);
    amplitudeHistoryRef.current = [];
    timerRef.current = setInterval(
      () => setReadingTime((prev) => prev + 1),
      1000,
    );

    const avgReadingSpeed = 1.8; // 초당 약 1.8단어 (고령층 평균 반영)
    let wordIdx = 0;
    highlightIntervalRef.current = setInterval(() => {
      wordIdx++;
      if (wordIdx < words.length) setHighlightIndex(wordIdx);
      else if (highlightIntervalRef.current)
        clearInterval(highlightIntervalRef.current);
    }, 1000 / avgReadingSpeed);
  };

  const stopReading = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (highlightIntervalRef.current)
      clearInterval(highlightIntervalRef.current);

    const totalTime = Math.max(readingTime, 1);
    const history = amplitudeHistoryRef.current;
    const silenceThreshold = 10;
    let pauses = 0;
    let inSilence = false;
    history.forEach((amp) => {
      if (amp < silenceThreshold && !inSilence) {
        pauses++;
        inSilence = true;
      } else if (amp >= silenceThreshold) inSilence = false;
    });

    const wpm = Math.round((currentText.wordCount / totalTime) * 60);
    const wpmScore =
      wpm >= 90 && wpm <= 160
        ? 40
        : Math.max(0, 40 - Math.abs(wpm - 120) * 0.4);
    const pauseScore = Math.max(0, 30 - pauses * 2.5);
    const score = Math.min(Math.round(wpmScore + pauseScore + 30), 100);

    const metrics = {
      textId: currentText.id,
      totalTime,
      wordsPerMinute: wpm,
      pauseCount: pauses,
      averageAmplitude: 0,
      readingScore: score,
    };
    setCurrentReading(metrics);
    setReadingResults((prev) => [...prev, metrics]);
    setPhase("review");
  };

  const handleNext = () => {
    if (currentIndex < texts.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setPhase("ready");
      setCurrentReading(null);
      setHighlightIndex(-1);
    } else {
      const avg = Math.round(
        readingResults.reduce((a, b) => a + b.readingScore, 0) /
          readingResults.length,
      );
      router.push(`/step-6?place=${place}&step4=${step4Score}&step5=${avg}`);
    }
  };

  if (!isMounted || !currentText) return null;

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden text-black font-sans">
      <header className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div>
          <span className="text-[#DAA520] font-black text-[10px] tracking-widest uppercase block mb-0.5">
            Step 05 • {place.toUpperCase()}
          </span>
          <h2 className="text-xl font-black text-[#8B4513] tracking-tighter">
            문장 읽기 학습
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`px-4 py-1.5 rounded-2xl text-xs font-black shadow-sm ${currentText.difficulty === "easy" ? "bg-green-100 text-green-700" : currentText.difficulty === "medium" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}
          >
            {currentText.difficulty.toUpperCase()}
          </div>
          <div className="bg-[#F8F9FA] px-4 py-1.5 rounded-2xl font-black text-lg text-[#DAA520] border border-gray-100">
            {currentIndex + 1} / {texts.length}
          </div>
        </div>
      </header>

      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        <aside className="w-56 flex flex-col gap-3">
          <div className="relative bg-black rounded-3xl overflow-hidden aspect-[4/3] shadow-inner">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />
            {phase === "reading" && (
              <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-red-500 px-2 py-1 rounded-full animate-pulse">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                <span className="text-[10px] text-white font-bold">
                  {readingTime}s
                </span>
              </div>
            )}
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              Speech Volume
            </h4>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${audioLevel > 25 ? "bg-green-500" : "bg-amber-400"}`}
                style={{ width: `${Math.min(audioLevel * 1.5, 100)}%` }}
              />
            </div>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 text-center">
            <p className="text-[10px] text-amber-600 font-black uppercase mb-1">
              Target Words
            </p>
            <p className="text-2xl font-black text-amber-700">
              {currentText.wordCount}
            </p>
          </div>
        </aside>

        <main className="flex-1 flex flex-col items-center justify-center space-y-6 px-4">
          <div className="inline-block px-6 py-2 bg-[#8B4513] text-white rounded-2xl shadow-lg transform -rotate-1">
            <span className="text-lg font-black tracking-tight">
              📖 {currentText.title}
            </span>
          </div>

          <div className="w-full max-w-2xl bg-gradient-to-br from-white to-amber-50/30 p-10 rounded-[40px] border-4 border-amber-100 shadow-xl relative min-h-[240px] flex items-center justify-center text-center">
            <p className="text-3xl font-bold leading-[1.6] text-[#4A2C10] break-keep">
              {phase === "reading"
                ? words.map((word, idx) => (
                    <span
                      key={idx}
                      className={`${idx <= highlightIndex ? "text-amber-600 bg-amber-200/40 rounded-lg px-1" : "text-[#8B4513]"} transition-all duration-300 inline-block`}
                    >
                      {word}{" "}
                    </span>
                  ))
                : currentText.text}
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 w-full">
            {phase === "ready" && (
              <button
                onClick={startReading}
                disabled={!isFaceReady}
                className={`group flex items-center gap-3 px-14 py-5 rounded-[24px] font-black text-2xl shadow-xl transition-all ${isFaceReady ? "bg-[#DAA520] text-white hover:bg-[#B8860B] hover:-translate-y-1" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
              >
                <span className="text-3xl group-hover:rotate-12 transition-transform">
                  🎤
                </span>{" "}
                낭독 시작하기
              </button>
            )}
            {phase === "reading" && (
              <button
                onClick={stopReading}
                className="flex items-center gap-3 px-14 py-5 bg-gray-900 text-white rounded-[24px] font-black text-2xl shadow-xl hover:bg-black transition-all"
              >
                <span className="text-2xl">✅</span> 읽기 완료
              </button>
            )}
            {phase === "review" && currentReading && (
              <div className="bg-white border-2 border-amber-200 rounded-[35px] p-6 shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-300">
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="text-center p-3 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-[10px] text-blue-500 font-black mb-1">
                      TIME
                    </p>
                    <p className="text-2xl font-black text-blue-700">
                      {currentReading.totalTime}s
                    </p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-2xl border border-green-100">
                    <p className="text-[10px] text-green-500 font-black mb-1">
                      WPM
                    </p>
                    <p className="text-2xl font-black text-green-700">
                      {currentReading.wordsPerMinute}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-2xl border border-amber-200 col-span-2 shadow-inner">
                    <p className="text-xs text-amber-600 font-black mb-1">
                      READING SCORE
                    </p>
                    <p className="text-4xl font-black text-amber-700">
                      {currentReading.readingScore}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleNext}
                  className="w-full py-4 bg-[#DAA520] text-white rounded-2xl font-black text-lg hover:bg-[#B8860B] shadow-lg transition-colors"
                >
                  {currentIndex < texts.length - 1
                    ? "다음 문장으로"
                    : "최종 결과 확인"}
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function Step5Page() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-white">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <Step4ScoreChecker />
    </Suspense>
  );
}

// URL 파라미터 체크 및 Content 로드
function Step4ScoreChecker() {
  return <Step5Content />;
}
