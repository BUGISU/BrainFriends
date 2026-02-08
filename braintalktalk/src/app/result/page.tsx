"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// 1️⃣ 실제 로직을 담은 내부 컴포넌트
function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);

  // 아코디언 및 오디오 상태 관리
  const [expandedSteps, setExpandedSteps] = useState<number[]>([]);
  const [playingIndex, setPlayingIndex] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 데이터 상태
  const [step1Items, setStep1Items] = useState<
    Array<{ question: string; isCorrect: boolean }>
  >([]);
  const [step2Audios, setStep2Audios] = useState<
    Array<{ text: string; audioUrl: string }>
  >([]);
  const [step4Audios, setStep4Audios] = useState<
    Array<{ text: string; audioUrl: string }>
  >([]);
  const [step5Audios, setStep5Audios] = useState<
    Array<{ text: string; audioUrl: string }>
  >([]);

  // 점수 계산 (searchParams 안전하게 접근)
  const s = useMemo(
    () => ({
      1: Number(searchParams?.get("step1") || 0),
      2: Number(searchParams?.get("step2") || 0),
      3: Number(searchParams?.get("step3") || 0),
      4: Number(searchParams?.get("step4") || 0),
      5: Number(searchParams?.get("step5") || 0),
      6: Number(searchParams?.get("step6") || 0),
    }),
    [searchParams],
  );

  const stepDetails = useMemo(
    () => [
      {
        id: 1,
        title: "청각 이해",
        score: s[1],
        max: 20,
        desc: "예/아니오 및 명령어 이행 능력",
      },
      {
        id: 2,
        title: "따라말하기",
        score: s[2],
        max: 10,
        desc: "단어 및 문장 복사 능력",
      },
      {
        id: 3,
        title: "이름대기",
        score: s[3],
        max: 10,
        desc: "사물 명칭 인출 및 유창성",
      },
      {
        id: 4,
        title: "스스로 말하기",
        score: s[4],
        max: 100,
        desc: "내용 전달력 및 발화 유창성",
      },
      {
        id: 5,
        title: "읽기 능력",
        score: s[5],
        max: 100,
        desc: "문자 해독 및 의미 파악",
      },
      {
        id: 6,
        title: "쓰기 능력",
        score: s[6],
        max: 8,
        desc: "단어 받아쓰기 및 자형 구성",
      },
    ],
    [s],
  );

  useEffect(() => {
    setIsMounted(true);
    // localStorage 로드 로직
    const loadData = (key: string, setter: Function) => {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          setter(JSON.parse(data));
        } catch (e) {
          console.error(`${key} 로드 실패`, e);
        }
      }
    };

    loadData("step2_recorded_audios", setStep2Audios);
    loadData("step4_recorded_audios", setStep4Audios);
    loadData("step5_recorded_audios", setStep5Audios);

    const sessionData = localStorage.getItem("kwab_training_session");
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        if (session.step1?.items) setStep1Items(session.step1.items);
      } catch (e) {
        console.error("세션 로드 실패", e);
      }
    }
  }, []);

  // 차트 포인트 계산
  const chartPoints = useMemo(() => {
    const values = [
      s[4],
      (s[1] / 20) * 100,
      (s[2] / 10) * 100,
      (s[3] / 10) * 100,
      s[5],
      (s[6] / 8) * 100,
    ];
    return values
      .map((val, i) => {
        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        const r = (Math.min(val, 100) / 100) * 75;
        return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`;
      })
      .join(" ");
  }, [s]);

  const playAudio = (audioUrl: string, id: string) => {
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setPlayingIndex(id);
    audio.onended = () => {
      setPlayingIndex(null);
    };
    audio.play();
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingIndex(null);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4 md:p-8 font-sans text-[#8B4513]">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="bg-white rounded-[30px] p-8 shadow-lg border-b-4 border-[#DAA520] flex justify-between items-center">
          <h1 className="text-2xl font-black">언어 평가 결과지</h1>
          <div className="text-right font-black text-[#DAA520] text-xl">
            AQ{" "}
            {(
              ((s[4] / 100) * 20 +
                (s[1] / 20) * 10 +
                (s[2] / 10) * 10 +
                (s[3] / 10) * 10) *
              2
            ).toFixed(1)}
          </div>
        </header>

        {/* 01. 역량 프로파일 */}
        <section className="bg-white rounded-[30px] p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-8">
            <span className="text-xl font-black text-[#DAA520]">01</span>
            <h2 className="text-lg font-bold">언어 역량 주요 요인 프로파일</h2>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-around gap-8">
            <div className="relative w-56 h-56">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {[0.25, 0.5, 0.75, 1].map((step) => (
                  <polygon
                    key={step}
                    points={stepDetails
                      .map((_, i) => {
                        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                        return `${100 + 75 * step * Math.cos(angle)},${100 + 75 * step * Math.sin(angle)}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="#FEF3C7"
                    strokeWidth="1"
                  />
                ))}
                <polygon
                  points={chartPoints}
                  fill="rgba(218, 165, 32, 0.1)"
                  stroke="#DAA520"
                  strokeWidth="2.5"
                />
              </svg>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {stepDetails.map((step) => (
                <div
                  key={step.id}
                  className="flex flex-col border-l-2 border-amber-100 pl-3"
                >
                  <span className="text-[10px] font-bold text-gray-400 uppercase">
                    {step.title}
                  </span>
                  <span className="text-sm font-black">
                    {Math.round((step.score / step.max) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 02. 상세 성취도 (아코디언) */}
        <section className="bg-white rounded-[30px] p-8 shadow-lg">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <span className="text-xl font-black text-[#DAA520]">02</span>
              <h2 className="text-lg font-bold">항목별 상세 성취도</h2>
            </div>
          </div>
          <div className="space-y-4">
            {stepDetails.map((step) => (
              <div
                key={step.id}
                className="border border-amber-100 rounded-[24px] overflow-hidden"
              >
                <div
                  onClick={() =>
                    setExpandedSteps((prev) =>
                      prev.includes(step.id)
                        ? prev.filter((id) => id !== step.id)
                        : [...prev, step.id],
                    )
                  }
                  className="flex items-center justify-between p-6 cursor-pointer hover:bg-amber-50/30"
                >
                  <span className="text-sm font-black">{step.title}</span>
                  <span>{expandedSteps.includes(step.id) ? "▲" : "▼"}</span>
                </div>
                {expandedSteps.includes(step.id) && (
                  <div className="p-6 bg-amber-50/20 border-t border-amber-50">
                    <p className="font-bold text-sm">
                      성취율: {Math.round((step.score / step.max) * 100)}% (
                      {step.score}/{step.max})
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 03. 녹음 다시 듣기 */}
        <section className="bg-white rounded-[30px] p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xl font-black text-[#DAA520]">03</span>
            <h2 className="text-lg font-bold">🎙️ 녹음 다시 듣기</h2>
          </div>
          {[
            { id: 2, label: "따라말하기", audios: step2Audios, key: "step2" },
            {
              id: 4,
              label: "스스로 말하기",
              audios: step4Audios,
              key: "step4",
            },
            { id: 5, label: "읽기", audios: step5Audios, key: "step5" },
          ].map(
            (group) =>
              group.audios.length > 0 && (
                <div key={group.key} className="mb-6">
                  <h3 className="text-sm font-bold mb-3">
                    Step {group.id}. {group.label}
                  </h3>
                  <div className="space-y-2">
                    {group.audios.map((audio, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100"
                      >
                        <span className="flex-1 text-sm font-bold truncate">
                          {audio.text}
                        </span>
                        <button
                          onClick={() =>
                            playingIndex === `${group.key}-${idx}`
                              ? stopAudio()
                              : playAudio(audio.audioUrl, `${group.key}-${idx}`)
                          }
                          className="px-4 py-2 bg-[#DAA520] text-white rounded-xl text-xs font-bold"
                        >
                          {playingIndex === `${group.key}-${idx}`
                            ? "정지"
                            : "재생"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ),
          )}
        </section>

        <div className="flex gap-4 pt-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex-1 py-5 bg-[#8B4513] text-white rounded-[30px] font-black"
          >
            리포트 저장
          </button>
          <button
            onClick={() => router.push("/")}
            className="flex-1 py-5 bg-white text-gray-400 rounded-[30px] font-black border-2 border-amber-100"
          >
            다시 시작
          </button>
        </div>
      </div>
    </div>
  );
}

// 2️⃣ 메인 Export 컴포넌트 (Suspense 래핑)
export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-white">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-black text-gray-400">
            결과 데이터를 분석하고 있습니다...
          </p>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
