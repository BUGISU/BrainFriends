"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { loadPatientProfile } from "@/lib/patientStorage";
import { SessionManager } from "@/lib/kwab/SessionManager";

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<number[]>([]);
  const [playingIndex, setPlayingIndex] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);

  // URL에서 점수 파싱
  const s = useMemo(
    () => ({
      1: Number(searchParams.get("step1") || 0),
      2: Number(searchParams.get("step2") || 0),
      3: Number(searchParams.get("step3") || 0),
      4: Number(searchParams.get("step4") || 0),
      5: Number(searchParams.get("step5") || 0),
      6: Number(searchParams.get("step6") || 0),
    }),
    [searchParams],
  );

  const stepDetails = useMemo(
    () => [
      { id: 1, title: "청각 이해", score: s[1], max: 20 },
      { id: 2, title: "따라말하기", score: s[2], max: 100 },
      { id: 3, title: "단어-그림 매칭", score: s[3], max: 100 },
      { id: 4, title: "유창성 (K-WAB)", score: s[4], max: 10 },
      { id: 5, title: "읽기 능력", score: s[5], max: 100 },
      { id: 6, title: "쓰기 능력", score: s[6], max: 100 },
    ],
    [s],
  );

  // src/app/result/page.tsx (useEffect 수정)

  useEffect(() => {
    setIsMounted(true);

    try {
      // ✅ 데이터 로드 전 100ms 대기 (비동기 저장 여유 시간)
      setTimeout(() => {
        const backups = {
          step1: JSON.parse(localStorage.getItem("step1_data") || "[]"),
          step2: JSON.parse(
            localStorage.getItem("step2_recorded_audios") || "[]",
          ),
          step3: JSON.parse(localStorage.getItem("step3_data") || "[]"),
          step4: JSON.parse(
            localStorage.getItem("step4_recorded_audios") || "[]",
          ),
          step5: JSON.parse(
            localStorage.getItem("step5_recorded_data") || "[]",
          ),
          step6: JSON.parse(
            localStorage.getItem("step6_recorded_data") || "[]",
          ),
        };

        console.log("📊 [LOAD] Step 1:", backups.step1.length);
        console.log("📊 [LOAD] Step 2:", backups.step2.length);
        console.log("📊 [LOAD] Step 3:", backups.step3.length);
        console.log("📊 [LOAD] Step 4:", backups.step4.length);
        console.log("📊 [LOAD] Step 5:", backups.step5.length);
        console.log("📊 [LOAD] Step 6:", backups.step6.length);

        setSessionData({
          step1: { items: backups.step1 },
          step2: { items: backups.step2 },
          step3: { items: backups.step3 },
          step4: { items: backups.step4 },
          step5: { items: backups.step5 },
          step6: { items: backups.step6 },
        });
      }, 100);
    } catch (e) {
      console.error("❌ Data Load Error:", e);
    }
  }, [searchParams]);

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
      s[2],
      s[3],
      s[5],
      s[6],
    ];
    return values
      .map((val, i) => {
        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        const r = (Math.min(val, 100) / 100) * 75;
        return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`;
      })
      .join(" ");
  }, [s]);

  if (!isMounted || !sessionData) return null;

  return (
    <div className="min-h-screen bg-[#FDFCFB] p-4 md:p-8 text-[#4A2C2A]">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 헤더 (AQ 계산 포함) */}
        <header className="bg-white rounded-[32px] p-8 shadow-sm border border-orange-100 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-[#4A2C2A]">
              종합 언어 재활 리포트
            </h1>
            <p className="text-xs text-orange-300 font-bold uppercase tracking-widest mt-1">
              Report Generated
            </p>
          </div>
          <div className="text-orange-500 font-black text-3xl">
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

        {/* 01. 역량 프로파일 차트 */}
        <section className="bg-white rounded-[40px] p-8 shadow-sm border border-orange-50">
          {/* ... (차트 렌더링 코드 유지) ... */}
          <div className="flex flex-col md:flex-row items-center justify-around gap-10">
            <div className="w-52 h-52 relative">
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
                    strokeWidth="1"
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
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {stepDetails.map((d) => (
                <div key={d.id} className="border-l-2 border-orange-100 pl-3">
                  <p className="text-[10px] text-gray-400 font-black uppercase">
                    {d.title}
                  </p>
                  <p className="text-lg font-black text-slate-700">
                    {d.id === 4 ? `${d.score}/10` : `${Math.round(d.score)}%`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 02. 단계별 상세 기록 (데이터 출력 핵심부) */}
        <section className="bg-white rounded-[40px] p-8 shadow-sm border border-orange-50">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-orange-400 font-black text-lg">02</span>
            <h2 className="font-bold text-gray-700">단계별 상세 기록</h2>
          </div>

          <div className="space-y-4">
            {stepDetails.map((step) => {
              const isOpen = expandedSteps.includes(step.id);
              const items = sessionData[`step${step.id}`]?.items || [];

              return (
                <div
                  key={step.id}
                  className="border border-orange-50 rounded-2xl overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedSteps((prev) =>
                        prev.includes(step.id)
                          ? prev.filter((i) => i !== step.id)
                          : [...prev, step.id],
                      )
                    }
                    className="w-full flex justify-between items-center p-5 bg-white hover:bg-orange-50/10"
                  >
                    <span className="font-black text-sm text-slate-600">
                      {step.title}{" "}
                      <span className="text-orange-400 ml-1">
                        ({items.length})
                      </span>
                    </span>
                    <span>{isOpen ? "▲" : "▼"}</span>
                  </button>

                  {isOpen && (
                    <div className="p-6 bg-white border-t border-orange-50 space-y-4">
                      {items.length === 0 ? (
                        <p className="text-center text-xs text-gray-300 py-4 font-bold">
                          기록된 데이터가 없습니다.
                        </p>
                      ) : step.id === 6 ? (
                        /* Step 6: 쓰기 이미지 전용 레이아웃 */
                        <div className="grid grid-cols-2 gap-4">
                          {items.map((item: any, idx: number) => (
                            <div
                              key={idx}
                              className="bg-[#FBFBFC] rounded-2xl p-4 border border-slate-100 text-center"
                            >
                              <p className="text-[10px] font-black text-orange-400 mb-2 uppercase">
                                단어: {item.text || item.word}
                              </p>
                              <div className="bg-white rounded-xl aspect-square flex items-center justify-center border border-slate-100">
                                {item.userImage ? (
                                  <img
                                    src={item.userImage}
                                    alt="writing"
                                    className="max-w-full max-h-full object-contain p-2"
                                  />
                                ) : (
                                  "NO IMAGE"
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* 기타 Step: 리스트 레이아웃 */
                        items.map((item: any, i: number) => (
                          <div
                            key={i}
                            className="flex justify-between items-center p-4 bg-[#FBFBFC] rounded-xl border border-slate-50"
                          >
                            <span className="text-sm font-bold text-slate-600">
                              "
                              {item.text ||
                                item.question ||
                                item.targetText ||
                                item.targetWord ||
                                "기록 없음"}
                              "
                            </span>
                            <div className="flex gap-2">
                              {item.audioUrl && (
                                <button
                                  onClick={() =>
                                    playAudio(item.audioUrl, `s${step.id}-${i}`)
                                  }
                                  className="w-8 h-8 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center"
                                >
                                  ▶
                                </button>
                              )}
                              <span
                                className={`text-[10px] font-black px-2 py-1 rounded-md ${item.isCorrect ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-400"}`}
                              >
                                {item.isCorrect ? "CORRECT" : "WRONG"}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 하단 버튼 영역 */}
        <div className="flex gap-4 pb-12">
          <button
            onClick={() => window.print()}
            className="flex-1 py-5 bg-slate-900 text-white rounded-[24px] font-black"
          >
            리포트 PDF 저장
          </button>
          <button
            onClick={() => router.push("/")}
            className="flex-1 py-5 bg-white text-slate-400 border border-slate-200 rounded-[24px] font-black"
          >
            처음으로
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div>LOADING...</div>}>
      <ResultContent />
    </Suspense>
  );
}
