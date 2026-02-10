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

  const [sessionData, setSessionData] = useState<any>(null);
  const [stepAudios, setStepAudios] = useState<{ [key: string]: any[] }>({
    step2: [],
    step3: [],
    step4: [],
    step5: [],
  });

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
      {
        id: 1,
        title: "청각 이해",
        score: s[1],
        max: 20,
        color: "#DAA520",
        desc: "예/아니오 및 명령어 이행",
      },
      {
        id: 2,
        title: "따라말하기",
        score: s[2],
        max: 100,
        color: "#DAA520",
        desc: "문장 복창 및 조음 정확도",
      },
      {
        id: 3,
        title: "단어-그림 매칭",
        score: s[3],
        max: 100,
        color: "#DAA520",
        desc: "사물 명칭 인출 능력",
      },
      {
        id: 4,
        title: "유창성 (K-WAB)",
        score: s[4],
        max: 10,
        color: "#DAA520",
        desc: "자발화 유창성 (0~10점)",
      },
      {
        id: 5,
        title: "읽기 능력",
        score: s[5],
        max: 100,
        color: "#8B4513",
        desc: "문자 해독 및 파악",
      },
      {
        id: 6,
        title: "쓰기 능력",
        score: s[6],
        max: 8,
        color: "#8B4513",
        desc: "자형 구성 및 받아쓰기",
      },
    ],
    [s],
  );

  useEffect(() => {
    setIsMounted(true);
    const loadAllData = () => {
      console.group("📊 Result 페이지 - 데이터 로드");
      try {
        const fullSession = JSON.parse(
          localStorage.getItem("kwab_training_session") || "{}",
        );
        console.log("전체 세션 데이터:", fullSession);
        console.log("Step 4 데이터:", fullSession.step4);
        console.log("K-WAB 점수:", fullSession.kwabScores);

        setSessionData(fullSession);

        setStepAudios({
          step2: JSON.parse(
            localStorage.getItem("step2_recorded_audios") || "[]",
          ),
          step3: JSON.parse(
            localStorage.getItem("step3_recorded_audios") || "[]",
          ),
          step4: JSON.parse(
            localStorage.getItem("step4_recorded_audios") || "[]",
          ),
          step5: JSON.parse(
            localStorage.getItem("step5_recorded_audios") || "[]",
          ),
        });
        console.groupEnd();
      } catch (e) {
        console.error("데이터 로드 실패:", e);
        console.groupEnd();
      }
    };
    loadAllData();
  }, []);

  const playAudio = (audioUrl: string, id: string) => {
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setPlayingIndex(id);
    audio.onended = () => setPlayingIndex(null);
    audio.play().catch((err) => console.error("재생 실패:", err));
  };

  const stopAudio = () => {
    if (audioRef.current) audioRef.current.pause();
    setPlayingIndex(null);
  };

  const chartPoints = useMemo(() => {
    const values = [
      (s[4] / 10) * 100, // Step 4를 0~100 스케일로 변환
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4 md:p-8 font-sans text-[#8B4513]">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 헤더 */}
        <header className="bg-white rounded-[30px] p-8 shadow-lg border-b-4 border-[#DAA520] flex justify-between items-center">
          <h1 className="text-2xl font-black">종합 언어 재활 리포트</h1>
          <div className="text-right font-black text-[#DAA520] text-xl">
            AQ{" "}
            {(
              ((s[4] / 10) * 100 * 0.2 +
                (s[1] / 20) * 100 * 0.1 +
                (s[2] / 100) * 100 * 0.1 +
                (s[3] / 100) * 100 * 0.1) *
              2
            ).toFixed(1)}
          </div>
        </header>

        {/* 01. 역량 프로파일 (레이더 차트) */}
        <section className="bg-white rounded-[30px] p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-8">
            <span className="text-xl font-black text-[#DAA520]">01</span>
            <h2 className="text-lg font-bold">언어 역량 요인 프로파일</h2>
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
                {chartPoints.split(" ").map((p, i) => {
                  const [x, y] = p.split(",");
                  return (
                    <circle key={i} cx={x} cy={y} r="3.5" fill="#DAA520" />
                  );
                })}
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
                    {step.id === 4
                      ? `${step.score}/10`
                      : `${Math.round((step.score / step.max) * 100)}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 02. 상세 성취도 분석 */}
        <section className="bg-white rounded-[30px] p-8 shadow-lg">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <span className="text-xl font-black text-[#DAA520]">02</span>
              <h2 className="text-lg font-bold">단계별 상세 분석 데이터</h2>
            </div>
            <button
              onClick={() =>
                expandedSteps.length === stepDetails.length
                  ? setExpandedSteps([])
                  : setExpandedSteps(stepDetails.map((s) => s.id))
              }
              className="px-4 py-2 bg-amber-50 text-[#DAA520] rounded-xl text-xs font-black border border-amber-100"
            >
              {expandedSteps.length === stepDetails.length
                ? "전체 접기 ▲"
                : "전체 펼치기 ▼"}
            </button>
          </div>

          <div className="space-y-4">
            {stepDetails.map((step) => {
              const isOpen = expandedSteps.includes(step.id);
              const stepKey = `step${step.id}`;
              const stepData = sessionData?.[stepKey];

              return (
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
                    className={`flex items-center justify-between p-6 cursor-pointer ${isOpen ? "bg-amber-50/50" : "bg-white"}`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-1.5 h-6 rounded-full ${isOpen ? "bg-[#DAA520]" : "bg-amber-100"}`}
                      />
                      <span className="text-sm font-black">
                        {step.title} 결과
                      </span>
                    </div>
                    <span
                      className={`text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}
                    >
                      ▼
                    </span>
                  </div>

                  {isOpen && (
                    <div className="p-6 bg-white border-t border-amber-50 space-y-4">
                      <div className="bg-amber-50 p-4 rounded-xl flex justify-between items-center mb-2">
                        <span className="font-black text-sm">
                          {step.id === 4
                            ? `${step.score}/10점 달성`
                            : `${Math.round((step.score / step.max) * 100)}% 달성`}
                        </span>
                        <span className="text-xs font-bold text-gray-500">
                          {step.score} / {step.max}
                        </span>
                      </div>

                      {/* ✅ Step 1 & Step 3: 정답/오답 리스트 형식 */}
                      {(step.id === 1 || step.id === 3) &&
                        stepData?.items?.map((item: any, i: number) => (
                          <div
                            key={i}
                            className="flex justify-between p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-100"
                          >
                            <span className="text-gray-600">
                              {item.question || item.text}
                            </span>
                            <span
                              className={
                                item.isCorrect
                                  ? "text-emerald-600"
                                  : "text-red-500"
                              }
                            >
                              {item.isCorrect ? "✅ 정답" : "❌ 오답"}
                            </span>
                          </div>
                        ))}

                      {/* ✅ Step 2: 따라말하기 정확도 바 형식 */}
                      {step.id === 2 &&
                        stepData?.items?.map((item: any, i: number) => (
                          <div
                            key={i}
                            className="p-4 bg-amber-50/30 rounded-xl border border-amber-100/50 space-y-2"
                          >
                            <div className="flex justify-between font-black text-xs text-[#8B4513]">
                              <span>"{item.text}"</span>
                              <span className="text-orange-600">
                                {item.pronunciationScore}% 정확도
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-orange-500 h-full transition-all duration-500"
                                style={{ width: `${item.pronunciationScore}%` }}
                              />
                            </div>
                          </div>
                        ))}

                      {/* ✅ Step 4: 유창성 K-WAB 점수 표시 */}
                      {step.id === 4 &&
                        stepData?.items?.map((item: any, i: number) => (
                          <div
                            key={i}
                            className="p-4 bg-blue-50/30 rounded-xl border border-blue-100/50 space-y-2"
                          >
                            <div className="flex justify-between font-black text-xs text-[#8B4513]">
                              <span>🎭 {item.situation}</span>
                              <span className="text-blue-600">
                                K-WAB {item.kwabScore}/10점
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-600 mt-2">
                              <div>🗣️ {item.speechDuration}초</div>
                              <div>🤐 {item.silenceRatio}%</div>
                              <div>🔢 {item.peakCount}단어</div>
                            </div>
                            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-blue-500 h-full transition-all duration-500"
                                style={{
                                  width: `${(item.kwabScore / 10) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}

                      {!stepData?.items && (
                        <p className="text-center text-xs text-gray-400 py-4">
                          저장된 상세 데이터가 없습니다.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 03. 녹음 다시 듣기 */}
        <section className="bg-white rounded-[30px] p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xl font-black text-[#DAA520]">03</span>
            <h2 className="text-lg font-bold">🎙️ 단계별 녹음 데이터</h2>
          </div>

          {Object.entries(stepAudios).map(
            ([key, audios]) =>
              audios.length > 0 && (
                <div key={key} className="mb-6 last:mb-0">
                  <h3 className="text-xs font-black text-[#DAA520] uppercase tracking-widest mb-3">
                    {key.replace("step", "STEP ")} Recordings
                  </h3>
                  <div className="grid gap-2">
                    {audios.map((audio, idx) => (
                      <div
                        key={`${key}-${idx}`}
                        className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100"
                      >
                        <span className="flex-1 text-sm font-bold truncate">
                          "{audio.text}"
                        </span>
                        <button
                          onClick={() =>
                            playingIndex === `${key}-${idx}`
                              ? stopAudio()
                              : playAudio(audio.audioUrl, `${key}-${idx}`)
                          }
                          className={`px-4 py-2 rounded-xl font-bold text-xs ${playingIndex === `${key}-${idx}` ? "bg-red-500 text-white" : "bg-[#DAA520] text-white"}`}
                        >
                          {playingIndex === `${key}-${idx}` ? "정지" : "재생"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ),
          )}
        </section>

        {/* 하단 버튼 */}
        <div className="flex gap-4 pt-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex-1 py-5 bg-[#8B4513] text-white rounded-[30px] font-black text-sm shadow-xl"
          >
            리포트 PDF 저장
          </button>
          <button
            onClick={() => router.push("/")}
            className="flex-1 py-5 bg-white text-gray-400 rounded-[30px] font-black text-sm border-2 border-amber-100"
          >
            테스트 다시 시작
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
        <div className="h-screen flex items-center justify-center bg-amber-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
