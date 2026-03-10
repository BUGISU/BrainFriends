"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Music, ChevronRight } from "lucide-react";
import { useTrainingSession } from "@/hooks/useTrainingSession";

type SongOption = {
  key: string;
  title: string;
  desc: string;
  imagePath: string;
};

const SONG_OPTIONS: SongOption[] = [
  {
    key: "아리랑",
    title: "아리랑",
    desc: "전통 리듬에 맞춰 발화 안정성을 확인합니다.",
    imagePath: "/images/mode/sing-training.png",
  },
  {
    key: "애국가",
    title: "애국가",
    desc: "긴 문장 발화를 통해 호흡과 리듬을 점검합니다.",
    imagePath: "/images/mode/sing-training.png",
  },
  {
    key: "내 나이가 어때서",
    title: "내 나이가 어때서",
    desc: "빠른 박자 구간에서 반응성과 유창성을 평가합니다.",
    imagePath: "/images/mode/sing-training.png",
  },
  {
    key: "무조건",
    title: "무조건",
    desc: "짧은 반복 가사로 즉시 반응과 조음 흐름을 봅니다.",
    imagePath: "/images/mode/sing-training.png",
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
                Active Patient
              </p>
              <h2 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight leading-none truncate">
                {isMounted ? (patient?.name ?? "정보 없음") : "정보 없음"}
                <span className="text-xs sm:text-sm font-bold text-slate-500 ml-1.5 sm:ml-2">
                  {isMounted ? (patient?.age ?? "-") : "-"}세
                </span>
              </h2>
              <span className="mt-1 justify-self-start inline-flex px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shadow-sm border whitespace-nowrap bg-slate-50 text-slate-700 border-slate-200">
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
              onClick={() => router.push("/")}
              className="h-8 sm:h-9 min-w-[90px] sm:min-w-[98px] px-3 sm:px-4 rounded-full text-[11px] sm:text-xs font-black shadow-sm border bg-white text-slate-700 border-slate-200 hover:bg-slate-100 transition-all"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1440px] mx-auto w-full px-4 sm:px-6 pt-8 sm:pt-12 pb-20 sm:pb-24 min-h-[calc(100vh-12.5rem)] flex flex-col justify-center">
        <section className="mb-6 sm:mb-10 text-center">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">
            브레인 노래방 곡 선택
          </h1>
          <p className="text-sm sm:text-base text-slate-500 font-medium">
            노래를 선택한 뒤 30초 음성/안면 기반 가창 훈련을 시작합니다.
          </p>
        </section>

        <section className="w-full max-w-[1280px] mx-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {SONG_OPTIONS.map((song) => (
            <button
              key={song.key}
              type="button"
              onClick={() =>
                router.push(
                  `/programs/sing-training?song=${encodeURIComponent(song.key)}`,
                )
              }
              className="group relative w-full max-w-[300px] xl:max-w-none mx-auto aspect-square rounded-3xl border border-emerald-100 bg-white overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="absolute inset-0">
                <div
                  className="h-[48%] w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${song.imagePath})` }}
                />
                <div className="h-[52%] w-full bg-white" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 to-black/20" />
              <div className="relative h-full p-5 sm:p-6 flex items-end">
                <div className="w-full flex items-start justify-between gap-4">
                  <div className="text-left">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100 mb-3">
                      <Music className="w-3 h-3" />
                      Song
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
                      {song.title}
                    </h3>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">
                      {song.desc}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </section>
      </main>
    </div>
  );
}
