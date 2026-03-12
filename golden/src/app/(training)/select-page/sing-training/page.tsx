"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Music, ChevronRight } from "lucide-react";
import { useTrainingSession } from "@/hooks/useTrainingSession";

type SongOption = {
  key: string;
  level: string;
  title: string;
  desc: string;
  imagePath: string;
  imagePosition: string;
  overlayStyle: string;
  badgeStyle: string;
  startLabelStyle: string;
};

const SONG_OPTIONS: SongOption[] = [
  {
    key: "나비야",
    level: "Level 1",
    title: "나비야",
    desc: "짧고 익숙한 멜로디로 가장 부담 없이 호흡 시작과 발성 진입을 확인합니다.",
    imagePath: "/images/mode/sing-card.png",
    imagePosition: "18% 18%",
    overlayStyle:
      "linear-gradient(135deg, rgba(236, 253, 245, 0.32) 0%, rgba(52, 211, 153, 0.22) 100%)",
    badgeStyle: "linear-gradient(90deg, #6EE7B7 0%, #34D399 100%)",
    startLabelStyle: "text-emerald-200/95",
  },
  {
    key: "아리랑",
    level: "Level 2",
    title: "아리랑",
    desc: "느린 흐름에 맞춰 호흡 길이와 발화 유창성을 비교적 안정적으로 점검합니다.",
    imagePath: "/images/mode/sing-card.png",
    imagePosition: "16% 22%",
    overlayStyle:
      "linear-gradient(135deg, rgba(239, 246, 255, 0.32) 0%, rgba(96, 165, 250, 0.22) 100%)",
    badgeStyle: "linear-gradient(90deg, #93C5FD 0%, #60A5FA 100%)",
    startLabelStyle: "text-sky-200/95",
  },
  {
    key: "군밤타령",
    level: "Level 2",
    title: "군밤타령",
    desc: "짧은 문장과 박자 전환 구간에서 호흡 조절과 발화 지속성을 평가합니다.",
    imagePath: "/images/mode/sing-card.png",
    imagePosition: "10% 20%",
    overlayStyle:
      "linear-gradient(135deg, rgba(239, 246, 255, 0.32) 0%, rgba(96, 165, 250, 0.22) 100%)",
    badgeStyle: "linear-gradient(90deg, #93C5FD 0%, #60A5FA 100%)",
    startLabelStyle: "text-sky-200/95",
  },
  {
    key: "둥글게 둥글게",
    level: "Level 3",
    title: "둥글게 둥글게",
    desc: "빠른 반복 리듬과 연속 조음이 많아 환자 기준으로 부담이 큰 편입니다.",
    imagePath: "/images/mode/sing-card.png",
    imagePosition: "14% 26%",
    overlayStyle:
      "linear-gradient(135deg, rgba(250, 245, 255, 0.34) 0%, rgba(192, 132, 252, 0.22) 100%)",
    badgeStyle: "linear-gradient(90deg, #F9A8D4 0%, #F472B6 100%)",
    startLabelStyle: "text-fuchsia-200/95",
  },
  {
    key: "도라지 타령",
    level: "Level 3",
    title: "도라지 타령",
    desc: "빠른 장단 반응과 발음 명료도를 함께 요구하는 고난도 곡입니다.",
    imagePath: "/images/mode/sing-card.png",
    imagePosition: "12% 30%",
    overlayStyle:
      "linear-gradient(135deg, rgba(250, 245, 255, 0.34) 0%, rgba(192, 132, 252, 0.22) 100%)",
    badgeStyle: "linear-gradient(90deg, #F9A8D4 0%, #F472B6 100%)",
    startLabelStyle: "text-fuchsia-200/95",
  },
  {
    key: "밀양 아리랑",
    level: "Level 3",
    title: "밀양 아리랑",
    desc: "긴 흐름과 큰 박자 변화가 있어 가장 난도가 높은 축에 속합니다.",
    imagePath: "/images/mode/sing-card.png",
    imagePosition: "8% 28%",
    overlayStyle:
      "linear-gradient(135deg, rgba(250, 245, 255, 0.34) 0%, rgba(192, 132, 252, 0.22) 100%)",
    badgeStyle: "linear-gradient(90deg, #F9A8D4 0%, #F472B6 100%)",
    startLabelStyle: "text-fuchsia-200/95",
  },
];

export default function SelectSingPage() {
  const router = useRouter();
  const { patient, ageGroup } = useTrainingSession();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden bg-[#F8FAFC] min-h-screen">
      <header className="px-4 sm:px-6 py-3 border-b border-emerald-100 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            <img
              src="/images/logo/logo.png"
              alt="GOLDEN logo"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover shrink-0"
            />
            <div className="grid grid-cols-2 items-center gap-x-2 sm:gap-x-3 min-w-0">
              <p className="col-span-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">
                Active Patient Profile
              </p>
              <h2 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight leading-none truncate">
                {isMounted ? (patient?.name ?? "정보 없음") : "정보 없음"}
                <span className="text-xs sm:text-sm font-bold text-slate-500 ml-1.5 sm:ml-2">
                  {isMounted ? (patient?.age ?? "-") : "-"}세
                </span>
              </h2>
              <span
                className={`mt-1 justify-self-start inline-flex px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shadow-sm border whitespace-nowrap ${
                  ageGroup === "Senior"
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white border-emerald-500"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                {ageGroup === "Senior" ? "실버 규준 적용" : "일반 규준 적용"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 sm:gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => router.push("/select-page/mode")}
              className="h-8 sm:h-9 min-w-[90px] sm:min-w-[98px] px-3 sm:px-4 rounded-full text-[11px] sm:text-xs font-black shadow-sm border bg-gradient-to-r from-emerald-600 to-emerald-500 text-white border-emerald-500 hover:from-emerald-700 hover:to-emerald-600 transition-all"
            >
              활동선택
            </button>
            <button
              type="button"
              onClick={() => router.push("/report?mode=sing")}
              className="h-8 sm:h-9 min-w-[90px] sm:min-w-[98px] px-3 sm:px-4 rounded-full text-[11px] sm:text-xs font-black shadow-sm border bg-[#0B1A3A] text-white border-[#0B1A3A] hover:bg-[#09152f] transition-all"
            >
              리포트 보기
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="h-8 sm:h-9 min-w-[90px] sm:min-w-[98px] px-3 sm:px-4 rounded-full text-[11px] sm:text-xs font-black shadow-sm border bg-white text-slate-700 border-slate-200 hover:bg-slate-100 transition-all"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1440px] mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-8 lg:pt-10 pb-10 sm:pb-12 lg:pb-14 flex flex-col justify-center">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-5 mb-5 sm:mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">
              브레인 노래방 곡 선택
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium">
              난이도에 맞는 곡을 선택한 뒤 30초 음성/안면 기반 가창 훈련을
              시작합니다.
            </p>
          </div>
          <div className="self-start md:self-end inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] sm:text-xs font-black text-emerald-700">
            <Music className="w-3.5 h-3.5" />총 6곡 · 3단계 난이도
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {SONG_OPTIONS.map((song) => (
            <button
              key={song.key}
              type="button"
              onClick={() =>
                router.push(
                  `/programs/sing-training?song=${encodeURIComponent(song.key)}`,
                )
              }
              className="group relative w-full min-h-[220px] sm:min-h-0 aspect-[16/10] sm:aspect-[16/10] lg:aspect-[16/10] xl:aspect-[16/9] rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-lg transition-all duration-500 hover:-translate-y-1 hover:shadow-slate-300/40"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                style={{
                  backgroundImage: `url(${song.imagePath})`,
                  backgroundPosition: song.imagePosition,
                  filter: "brightness(1.1) saturate(1)",
                }}
              />
              <div
                className="absolute inset-0 opacity-55 group-hover:opacity-65 transition-opacity duration-500"
                style={{ background: song.overlayStyle }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
              <div className="relative z-10 h-full p-4 sm:p-5 flex flex-col justify-end items-start text-left">
                <div className="flex h-full flex-col">
                  <div>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/18 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-950 shadow-[0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur-md"
                      style={{ background: song.badgeStyle }}
                    >
                      <Music className="h-3 w-3" />
                      {song.level}
                      <span className="text-slate-900/75">SONG</span>
                    </span>
                  </div>

                  <div className="mt-auto">
                    <h3 className="text-4xl font-black text-white mb-2 leading-none [text-shadow:0_10px_28px_rgba(0,0,0,0.95)]">
                      {song.title}
                    </h3>
                    <p className="text-white font-bold text-xs sm:text-sm leading-relaxed mb-4 max-w-[88%] [text-shadow:0_8px_20px_rgba(0,0,0,0.9)]">
                      {song.desc}
                    </p>

                    <div className="w-full flex items-center justify-end">
                      <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform">
                        <ChevronRight className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 border-[3px] border-white/0 group-hover:border-white/35 rounded-[28px] transition-all duration-500 pointer-events-none" />
            </button>
          ))}
        </section>
      </main>
    </div>
  );
}
