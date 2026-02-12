"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<number[]>([]);
  const [playingIndex, setPlayingIndex] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 세션 통합 데이터 상태
  const [sessionData, setSessionData] = useState<any>(null);

  const s = {
    1: Number(searchParams.get("step1") || 0),
    2: Number(searchParams.get("step2") || 0),
    3: Number(searchParams.get("step3") || 0),
    4: Number(searchParams.get("step4") || 0),
    5: Number(searchParams.get("step5") || 0),
    6: Number(searchParams.get("step6") || 0),
  };

  const stepDetails = useMemo(
    () => [
      { id: 1, title: "청각 이해", score: s[1], max: 20 },
      { id: 2, title: "따라말하기", score: s[2], max: 100 },
      { id: 3, title: "단어-그림 매칭", score: s[3], max: 100 },
      { id: 4, title: "유창성 (K-WAB)", score: s[4], max: 10 },
      { id: 5, title: "읽기 능력", score: s[5], max: 100 },
      { id: 6, title: "쓰기 능력", score: s[6], max: 8 },
    ],
    [s],
  );

  useEffect(() => {
    setIsMounted(true);
    try {
      // 1. 통합 세션 데이터 로드 (Step 5 데이터는 보통 여기에 들어있음)
      const fullSession = JSON.parse(
        localStorage.getItem("kwab_training_session") || "{}",
      );

      // 2. 개별 키로 저장된 데이터들 (Step 2는 보통 여기에 배열로 저장됨)
      const s2Backup = JSON.parse(
        localStorage.getItem("step2_recorded_audios") || "[]",
      );
      const s4Backup = JSON.parse(
        localStorage.getItem("step4_recorded_audios") || "[]",
      );
      const s5Backup = JSON.parse(
        localStorage.getItem("step5_recorded_data") || "[]",
      );

      // 3. 지능적 병합: 통합 객체 내부에 데이터가 없으면 개별 백업 키에서 가져옴
      const mergedData = {
        ...fullSession,
        step1: fullSession.step1 || { items: [] },
        step2: {
          items:
            fullSession.step2?.items?.length > 0
              ? fullSession.step2.items
              : s2Backup,
        },
        step3: fullSession.step3 || { items: [] },
        step4: {
          items:
            fullSession.step4?.items?.length > 0
              ? fullSession.step4.items
              : s4Backup,
        },
        step5: {
          items:
            fullSession.step5?.items?.length > 0
              ? fullSession.step5.items
              : s5Backup,
        },
      };

      setSessionData(mergedData);
      console.log("📊 리포트 데이터 병합 완료:", mergedData);
    } catch (e) {
      console.error("Data Load Error:", e);
    }
  }, []);

  const playAudio = (audioUrl: string, id: string) => {
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setPlayingIndex(id);
    audio.onended = () => setPlayingIndex(null);
    audio.play();
  };

  const chartPoints = useMemo(() => {
    const values = [
      (s[4] / 10) * 100,
      (s[1] / 20) * 100,
      (s[2] / 100) * 100,
      (s[3] / 100) * 100,
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

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-[#FDFCFB] p-4 md:p-8 text-[#4A2C2A]">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="bg-white rounded-[32px] p-8 shadow-sm border border-orange-100 flex justify-between items-center">
          <h1 className="text-xl font-black">종합 언어 재활 리포트</h1>
          <div className="text-orange-500 font-black text-2xl">
            AQ{" "}
            {(
              (s[4] * 10 * 0.2 +
                (s[1] / 20) * 100 * 0.1 +
                s[2] * 0.1 +
                s[3] * 0.1) *
              2
            ).toFixed(1)}
          </div>
        </header>

        {/* 01. 프로파일 차트 */}
        <section className="bg-white rounded-[32px] p-8 shadow-sm border border-orange-50">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-orange-400 font-black">01</span>
            <h2 className="font-bold">언어 역량 프로파일</h2>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-around gap-8">
            <div className="w-48 h-48 relative">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {[0.25, 0.5, 0.75, 1].map((st) => (
                  <polygon
                    key={st}
                    points={stepDetails
                      .map((_, i) => {
                        const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                        return `${100 + 75 * st * Math.cos(a)},${100 + 75 * st * Math.sin(a)}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="#FEE2E2"
                  />
                ))}
                <polygon
                  points={chartPoints}
                  fill="rgba(249, 115, 22, 0.1)"
                  stroke="#F97316"
                  strokeWidth="3"
                />
              </svg>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stepDetails.map((d) => (
                <div key={d.id} className="border-l-2 border-orange-100 pl-3">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">
                    {d.title}
                  </p>
                  <p className="font-black">
                    {d.id === 4
                      ? `${d.score}/10`
                      : `${Math.round((d.score / (d.max || 100)) * 100)}%`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 02. 상세 분석 */}
        <section className="bg-white rounded-[32px] p-8 shadow-sm border border-orange-50">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <span className="text-orange-400 font-black">02</span>
              <h2 className="font-bold">단계별 분석 데이터</h2>
            </div>
            <button
              onClick={() => {
                if (expandedSteps.length === stepDetails.length)
                  setExpandedSteps([]);
                else setExpandedSteps(stepDetails.map((d) => d.id));
              }}
              className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-black uppercase hover:bg-orange-100 transition-all"
            >
              {expandedSteps.length === stepDetails.length
                ? "Close All ▲"
                : "Expand All ▼"}
            </button>
          </div>

          <div className="space-y-4">
            {stepDetails.map((step) => {
              const isOpen = expandedSteps.includes(step.id);
              const items = sessionData?.[`step${step.id}`]?.items || [];

              return (
                <div
                  key={step.id}
                  className="border border-orange-50 rounded-2xl overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedSteps((prev) =>
                        prev.includes(step.id)
                          ? prev.filter((id) => id !== step.id)
                          : [...prev, step.id],
                      )
                    }
                    className="w-full flex items-center justify-between p-5 bg-white hover:bg-orange-50/30 transition-colors"
                  >
                    <span className="font-black text-sm">
                      {step.title} 결과 ({items.length})
                    </span>
                    <span className="text-xs">{isOpen ? "▲" : "▼"}</span>
                  </button>

                  {isOpen && (
                    <div className="p-5 bg-orange-50/10 border-t border-orange-50 space-y-3">
                      {items.length === 0 && (
                        <p className="text-center text-xs text-gray-400 py-4 font-bold">
                          기록 데이터가 없습니다.
                        </p>
                      )}

                      {/* Step 1, 3 (OX/매칭) */}
                      {(step.id === 1 || step.id === 3) &&
                        items.map((item: any, i: number) => (
                          <div
                            key={i}
                            className="flex justify-between p-4 bg-white rounded-xl shadow-sm text-xs font-bold border border-orange-50"
                          >
                            <span className="text-slate-600">
                              {item.question || item.text || item.targetWord}
                            </span>
                            <span
                              className={
                                item.isCorrect
                                  ? "text-emerald-500"
                                  : "text-red-400"
                              }
                            >
                              {item.isCorrect ? "✅ 정답" : "❌ 오답"}
                            </span>
                          </div>
                        ))}

                      {/* Step 2, 4, 5 (음성 녹음 기반) */}
                      {(step.id === 2 || step.id === 4 || step.id === 5) &&
                        items.map((item: any, i: number) => (
                          <div
                            key={i}
                            className="p-4 bg-white rounded-xl shadow-sm border border-orange-50 space-y-3"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1 pr-4">
                                <p className="text-[9px] text-orange-400 font-black uppercase mb-1">
                                  {step.id === 5 ? "Reading" : "Sentence"}
                                </p>
                                <p className="text-sm font-black text-slate-800 leading-snug">
                                  "{item.text}"
                                </p>
                              </div>
                              {item.audioUrl && (
                                <button
                                  onClick={() =>
                                    playingIndex === `s${step.id}-${i}`
                                      ? setPlayingIndex(null)
                                      : playAudio(
                                          item.audioUrl,
                                          `s${step.id}-${i}`,
                                        )
                                  }
                                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${playingIndex === `s${step.id}-${i}` ? "bg-red-500 text-white animate-pulse" : "bg-orange-100 text-orange-500 hover:bg-orange-200"}`}
                                >
                                  {playingIndex === `s${step.id}-${i}`
                                    ? "■"
                                    : "▶"}
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-50 text-center">
                              {step.id === 4 ? (
                                <>
                                  <div>
                                    <p className="text-[8px] text-gray-400 font-bold">
                                      KWAB
                                    </p>
                                    <p className="text-xs font-black">
                                      {item.kwabScore || 0}/10
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[8px] text-gray-400 font-bold">
                                      SILENCE
                                    </p>
                                    <p className="text-xs font-black">
                                      {item.silenceRatio || 0}%
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[8px] text-gray-400 font-bold">
                                      TIME
                                    </p>
                                    <p className="text-xs font-black">
                                      {item.speechDuration || 0}s
                                    </p>
                                  </div>
                                </>
                              ) : step.id === 5 ? (
                                <>
                                  <div>
                                    <p className="text-[8px] text-gray-400 font-bold">
                                      WPM
                                    </p>
                                    <p className="text-xs font-black">
                                      {item.wordsPerMinute || 0}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[8px] text-gray-400 font-bold">
                                      TIME
                                    </p>
                                    <p className="text-xs font-black">
                                      {item.totalTime || 0}s
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[8px] text-orange-400 font-bold">
                                      SCORE
                                    </p>
                                    <p className="text-xs font-black text-orange-500">
                                      {item.readingScore || 0}%
                                    </p>
                                  </div>
                                </>
                              ) : (
                                <div className="col-span-3 flex justify-between items-center px-1">
                                  <span className="text-[10px] text-gray-400 font-bold">
                                    PRONUNCIATION SCORE
                                  </span>
                                  <span className="text-sm font-black text-orange-500">
                                    {/* 여러 필드명에 대응 (pronunciationScore 또는 finalScore) */}
                                    {item.pronunciationScore ||
                                      item.finalScore ||
                                      0}
                                    %
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <div className="flex gap-4 pb-10">
          <button
            onClick={() => window.print()}
            className="flex-1 py-5 bg-slate-900 text-white rounded-3xl font-black shadow-lg hover:bg-slate-800 transition-colors"
          >
            리포트 PDF 저장
          </button>
          <button
            onClick={() => router.push("/")}
            className="flex-1 py-5 bg-white text-gray-400 border border-gray-200 rounded-3xl font-black hover:bg-gray-50 transition-colors"
          >
            다시 시작
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center font-black text-orange-200">
          LOADING REPORT...
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
