// src/app/(training)/step-5/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { calculateLipMetrics, LipMetrics } from "@/utils/faceAnalysis";
import { PlaceType } from "@/constants/trainingData";

// ============================================
// 1. 읽기 텍스트 데이터
// ============================================
const READING_TEXTS: Record<PlaceType, Array<{
  id: number;
  title: string;
  text: string;
  difficulty: "easy" | "medium" | "hard";
  wordCount: number;
}>> = {
  home: [
    { id: 1, title: "아침 일과", text: "아침에 일어나면 세수를 하고 이를 닦습니다. 그리고 맛있는 아침 밥을 먹습니다.", difficulty: "easy", wordCount: 15 },
    { id: 2, title: "우리 집", text: "우리 집에는 거실과 방이 있습니다. 거실에는 소파와 텔레비전이 있고, 방에는 침대와 책상이 있습니다. 부엌에서는 맛있는 음식을 만들 수 있습니다.", difficulty: "medium", wordCount: 28 },
    { id: 3, title: "가족과 저녁", text: "저녁이 되면 가족들이 모두 집에 돌아옵니다. 함께 저녁 식사를 하면서 오늘 있었던 일을 이야기합니다. 식사 후에는 텔레비전을 보거나 책을 읽습니다. 가족과 함께하는 시간은 언제나 행복합니다.", difficulty: "hard", wordCount: 42 },
  ],
  hospital: [
    { id: 1, title: "병원 가기", text: "몸이 아프면 병원에 갑니다. 의사 선생님이 어디가 아픈지 물어봅니다.", difficulty: "easy", wordCount: 14 },
    { id: 2, title: "진료 받기", text: "병원에 도착하면 먼저 접수를 합니다. 번호표를 받고 대기실에서 기다립니다. 이름이 불리면 진료실로 들어갑니다. 의사 선생님께 증상을 자세히 말씀드립니다.", difficulty: "medium", wordCount: 32 },
    { id: 3, title: "약 복용", text: "의사 선생님이 처방전을 줍니다. 처방전을 가지고 약국에 갑니다. 약사님이 약을 지어 주시면서 복용 방법을 알려줍니다. 식후 삼십 분에 물과 함께 약을 먹습니다. 약을 빠뜨리지 않고 먹어야 빨리 낫습니다.", difficulty: "hard", wordCount: 48 },
  ],
  cafe: [
    { id: 1, title: "커피 주문", text: "카페에 가서 따뜻한 커피를 주문합니다. 잠시 기다리면 음료가 나옵니다.", difficulty: "easy", wordCount: 14 },
    { id: 2, title: "카페에서", text: "오늘은 날씨가 좋아서 카페에 왔습니다. 창가 자리에 앉아 아메리카노를 마십니다. 책을 읽으면서 여유로운 시간을 보냅니다. 이런 시간이 참 좋습니다.", difficulty: "medium", wordCount: 30 },
    { id: 3, title: "친구와 카페", text: "오랜만에 친구를 만나 카페에 갔습니다. 친구는 라떼를 시키고 나는 아이스 아메리카노를 시켰습니다. 우리는 서로의 근황을 이야기하며 즐거운 시간을 보냈습니다. 다음에 또 만나자고 약속했습니다. 친구와 함께하는 시간은 소중합니다.", difficulty: "hard", wordCount: 45 },
  ],
  bank: [
    { id: 1, title: "은행 가기", text: "은행에 가서 통장을 만듭니다. 신분증을 꼭 가져가야 합니다.", difficulty: "easy", wordCount: 12 },
    { id: 2, title: "ATM 사용", text: "현금이 필요하면 ATM을 이용합니다. 카드를 넣고 비밀번호를 입력합니다. 원하는 금액을 선택하면 돈이 나옵니다. 카드와 영수증을 챙기는 것을 잊지 마세요.", difficulty: "medium", wordCount: 32 },
    { id: 3, title: "적금 가입", text: "은행에서 적금에 가입하려고 합니다. 창구에서 상담을 받고 여러 상품을 비교합니다. 금리와 만기 기간을 확인한 후 가장 좋은 상품을 선택합니다. 매달 일정 금액을 자동으로 이체하기로 했습니다. 목돈을 모으는 좋은 방법입니다.", difficulty: "hard", wordCount: 50 },
  ],
  park: [
    { id: 1, title: "공원 산책", text: "공원에서 산책을 합니다. 나무와 꽃이 많아서 기분이 좋습니다.", difficulty: "easy", wordCount: 12 },
    { id: 2, title: "운동하기", text: "아침마다 공원에서 운동을 합니다. 먼저 가볍게 스트레칭을 하고 천천히 걷습니다. 운동 기구로 팔과 다리 운동도 합니다. 땀을 흘리고 나면 기분이 상쾌합니다.", difficulty: "medium", wordCount: 32 },
    { id: 3, title: "봄 나들이", text: "따뜻한 봄날, 가족과 함께 공원으로 나들이를 갔습니다. 아이들은 놀이터에서 신나게 뛰어놀고, 어른들은 벤치에 앉아 이야기를 나눕니다. 도시락을 먹으며 행복한 시간을 보냈습니다. 저녁노을을 보며 집으로 돌아왔습니다. 즐거운 하루였습니다.", difficulty: "hard", wordCount: 48 },
  ],
  mart: [
    { id: 1, title: "장보기", text: "마트에서 과일과 채소를 삽니다. 카트에 담아서 계산대로 갑니다.", difficulty: "easy", wordCount: 12 },
    { id: 2, title: "마트 쇼핑", text: "일주일 치 장을 보러 마트에 갔습니다. 먼저 채소 코너에서 배추와 양파를 담습니다. 정육 코너에서 돼지고기도 삽니다. 계산대에서 카드로 결제하고 영수증을 받습니다.", difficulty: "medium", wordCount: 34 },
    { id: 3, title: "할인 행사", text: "오늘 마트에서 큰 할인 행사를 합니다. 평소보다 물건이 많이 저렴합니다. 필요한 것들의 목록을 미리 작성해 왔습니다. 목록대로 물건을 담으니 불필요한 지출을 줄일 수 있습니다. 포인트 카드를 적립하면 다음에 할인도 받을 수 있습니다. 알뜰하게 장을 보니 기분이 좋습니다.", difficulty: "hard", wordCount: 55 },
  ],
};

// ============================================
// 2. 읽기 평가 인터페이스
// ============================================
interface ReadingMetrics {
  textId: number;
  totalTime: number;         // 총 소요 시간 (초)
  wordsPerMinute: number;    // 분당 단어 수
  pauseCount: number;        // 멈춤 횟수
  averageAmplitude: number;  // 평균 음량
  readingScore: number;      // 읽기 점수 (0-100)
}

// ============================================
// 3. 메인 컴포넌트
// ============================================
export default function Step5Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const place = (searchParams.get("place") as PlaceType) || "home";
  const step4Score = searchParams.get("step4") || "0";

  // 상태
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"ready" | "reading" | "review">("ready");
  const [isMounted, setIsMounted] = useState(false);
  const [readingTime, setReadingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isFaceReady, setIsFaceReady] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  // 안면 분석
  const [faceMetrics, setFaceMetrics] = useState<LipMetrics>({
    symmetryScore: 100,
    openingRatio: 0,
    isStretched: false,
    deviation: 0,
  });

  // 결과
  const [readingResults, setReadingResults] = useState<ReadingMetrics[]>([]);
  const [currentReading, setCurrentReading] = useState<ReadingMetrics | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioAnimationRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const amplitudeHistoryRef = useRef<number[]>([]);

  // 텍스트 데이터
  const texts = useMemo(() => READING_TEXTS[place] || READING_TEXTS.home, [place]);
  const currentText = texts[currentIndex];
  const words = currentText.text.split(/\s+/);

  // ============================================
  // 4. 초기화 (이전과 동일)
  // ============================================
  useEffect(() => {
    setIsMounted(true);
    let isCancelled = false;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
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

    init();

    return () => {
      isCancelled = true;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioAnimationRef.current) cancelAnimationFrame(audioAnimationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

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

  const initAudioAnalysis = (stream: MediaStream) => {
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

      if (phase === "reading") {
        amplitudeHistoryRef.current.push(average);
      }

      audioAnimationRef.current = requestAnimationFrame(updateAudio);
    };
    updateAudio();
  };

  // ============================================
  // 5. 읽기 시작
  // ============================================
  const startReading = () => {
    setPhase("reading");
    setReadingTime(0);
    setHighlightIndex(0);
    amplitudeHistoryRef.current = [];

    timerRef.current = setInterval(() => {
      setReadingTime((prev) => prev + 1);
    }, 1000);

    // 단어 하이라이트 자동 진행 (예상 읽기 속도 기반)
    const avgReadingSpeed = 2; // 초당 2단어 예상
    let wordIndex = 0;
    const highlightInterval = setInterval(() => {
      wordIndex++;
      if (wordIndex < words.length) {
        setHighlightIndex(wordIndex);
      } else {
        clearInterval(highlightInterval);
      }
    }, 1000 / avgReadingSpeed);
  };

  // ============================================
  // 6. 읽기 종료 & 분석
  // ============================================
  const stopReading = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const totalTime = readingTime;
    const history = amplitudeHistoryRef.current;

    // 멈춤 횟수 계산
    const silenceThreshold = 10;
    let pauseCount = 0;
    let inSilence = false;
    for (const amp of history) {
      if (amp < silenceThreshold && !inSilence) {
        pauseCount++;
        inSilence = true;
      } else if (amp >= silenceThreshold) {
        inSilence = false;
      }
    }

    const wordsPerMinute = totalTime > 0 ? Math.round((currentText.wordCount / totalTime) * 60) : 0;
    const averageAmplitude = history.length > 0
      ? history.reduce((a, b) => a + b) / history.length
      : 0;

    // 점수 계산
    // - WPM 100-150이 이상적 (최대 40점)
    // - 멈춤이 적을수록 좋음 (최대 30점)
    // - 음량이 적절하면 좋음 (최대 30점)
    const wpmScore = wordsPerMinute >= 80 && wordsPerMinute <= 180
      ? 40
      : Math.max(0, 40 - Math.abs(wordsPerMinute - 130) * 0.3);
    const pauseScore = Math.max(0, 30 - pauseCount * 3);
    const ampScore = averageAmplitude >= 20 && averageAmplitude <= 60 ? 30 : 15;
    const readingScore = Math.round(wpmScore + pauseScore + ampScore);

    const metrics: ReadingMetrics = {
      textId: currentText.id,
      totalTime,
      wordsPerMinute,
      pauseCount,
      averageAmplitude: Math.round(averageAmplitude * 10) / 10,
      readingScore: Math.min(readingScore, 100),
    };

    setCurrentReading(metrics);
    setReadingResults((prev) => [...prev, metrics]);
    setPhase("review");
  };

  // ============================================
  // 7. 다음 / 완료
  // ============================================
  const handleNext = () => {
    if (currentIndex < texts.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setPhase("ready");
      setCurrentReading(null);
      setReadingTime(0);
      setHighlightIndex(-1);
    } else {
      finishTraining();
    }
  };

  const finishTraining = () => {
    const avgScore = readingResults.length > 0
      ? Math.round(readingResults.reduce((a, b) => a + b.readingScore, 0) / readingResults.length)
      : 0;

    router.push(`/step-6?place=${place}&step4=${step4Score}&step5=${avgScore}`);
  };

  // ============================================
  // 8. 렌더링
  // ============================================
  if (!isMounted || !currentText) return null;

  const difficultyColors = {
    easy: "bg-green-100 text-green-700",
    medium: "bg-amber-100 text-amber-700",
    hard: "bg-red-100 text-red-700",
  };

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden text-black font-sans">
      {/* HEADER */}
      <header className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
        <div className="text-left">
          <span className="text-[#DAA520] font-black text-[10px] tracking-widest uppercase block mb-0.5">
            Step 05 • {place.toUpperCase()}
          </span>
          <h2 className="text-xl font-black text-[#8B4513] tracking-tighter">
            읽기 학습
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${difficultyColors[currentText.difficulty]}`}>
            {currentText.difficulty === "easy" ? "쉬움" : currentText.difficulty === "medium" ? "보통" : "어려움"}
          </div>
          {phase === "reading" && (
            <div className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600 animate-pulse">
              🔴 {readingTime}s
            </div>
          )}
          <div className="bg-[#F8F9FA] px-4 py-1.5 rounded-2xl font-black text-lg text-[#DAA520]">
            {currentIndex + 1} / {texts.length}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* 좌측: 카메라 */}
        <div className="w-56 flex flex-col gap-3">
          <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />
          </div>

          <div className="bg-gray-50 rounded-2xl p-3">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              음성 레벨
            </h4>
            <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${
                  audioLevel > 30 ? "bg-green-500" : "bg-amber-400"
                }`}
                style={{ width: `${Math.min(audioLevel, 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-amber-50 rounded-2xl p-3 text-center">
            <p className="text-xs text-amber-600 font-bold">단어 수</p>
            <p className="text-xl font-black text-amber-700">{currentText.wordCount}개</p>
          </div>
        </div>

        {/* 우측: 텍스트 + 컨트롤 */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
          {/* 텍스트 제목 */}
          <div className="text-center">
            <span className="inline-block px-4 py-1 bg-[#8B4513] text-white rounded-full text-sm font-bold">
              📖 {currentText.title}
            </span>
          </div>

          {/* 읽기 텍스트 */}
          <div className="w-full max-w-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-8 rounded-[30px] border-4 border-amber-100">
            <p className="text-2xl font-bold leading-relaxed text-[#8B4513]">
              {phase === "reading"
                ? words.map((word, idx) => (
                    <span
                      key={idx}
                      className={`${
                        idx <= highlightIndex
                          ? "text-amber-600 bg-amber-200/50"
                          : "text-[#8B4513]"
                      } transition-colors duration-200`}
                    >
                      {word}{" "}
                    </span>
                  ))
                : currentText.text}
            </p>
          </div>

          {/* 컨트롤 */}
          <div className="flex flex-col items-center space-y-4">
            {phase === "ready" && (
              <button
                onClick={startReading}
                disabled={!isFaceReady}
                className={`px-12 py-4 rounded-2xl font-black text-xl transition-all ${
                  isFaceReady
                    ? "bg-[#DAA520] text-white hover:bg-[#B8860B] active:scale-95"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                📖 읽기 시작
              </button>
            )}

            {phase === "reading" && (
              <button
                onClick={stopReading}
                className="px-12 py-4 bg-gray-800 text-white rounded-2xl font-black text-xl hover:bg-gray-700 active:scale-95 transition-all"
              >
                ✅ 읽기 완료
              </button>
            )}

            {phase === "review" && currentReading && (
              <div className="bg-white border-4 border-amber-200 rounded-[30px] p-6 shadow-lg w-full max-w-md">
                <h3 className="text-lg font-black text-[#8B4513] mb-4 text-center">
                  📊 읽기 분석 결과
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-gray-400">소요 시간</p>
                    <p className="text-2xl font-black text-blue-600">{currentReading.totalTime}초</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-gray-400">분당 단어</p>
                    <p className="text-2xl font-black text-green-600">{currentReading.wordsPerMinute}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-gray-400">멈춤 횟수</p>
                    <p className="text-2xl font-black text-purple-600">{currentReading.pauseCount}회</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-xl">
                    <p className="text-amber-600">읽기 점수</p>
                    <p className="text-3xl font-black text-amber-700">{currentReading.readingScore}</p>
                  </div>
                </div>

                <button
                  onClick={handleNext}
                  className="w-full mt-4 py-3 bg-[#DAA520] text-white rounded-2xl font-black text-lg hover:bg-[#B8860B] transition-colors"
                >
                  {currentIndex < texts.length - 1 ? "다음 텍스트" : "완료"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="py-3 px-6 bg-[#F8F9FA]/50 border-t border-gray-50 flex justify-between items-center text-[10px] font-black text-[#8B4513]/40 uppercase tracking-[0.15em]">
        <span>Face SI: {faceMetrics.symmetryScore}%</span>
        <span>Reading Assessment Training</span>
        <span>Text {currentIndex + 1} / {texts.length}</span>
      </footer>
    </div>
  );
}
