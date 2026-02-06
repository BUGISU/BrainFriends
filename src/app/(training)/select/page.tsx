"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTrainingSession } from "@/hooks/useTrainingSession";

const PLACES = [
  { key: "home", label: "우리 집", icon: "🏠", desc: "일상 사실 및 추론" },
  { key: "hospital", label: "병원", icon: "🏥", desc: "증상 표현 및 소통" },
  { key: "cafe", label: "커피숍", icon: "☕", desc: "주문 및 사회적 활동" },
  { key: "bank", label: "은행", icon: "🏦", desc: "숫자 및 금융 인지" },
  { key: "park", label: "공원", icon: "🌳", desc: "청각 및 사물 이름" },
  { key: "mart", label: "마트", icon: "🛒", desc: "물건 사기 및 계산" },
] as const;

export default function SelectPage() {
  const router = useRouter();
  const { patient, ageGroup } = useTrainingSession();

  const go = (place: string) => {
    router.push(`/step-1?place=${encodeURIComponent(place)}`);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* 상단 프로필 섹션: Step 페이지 헤더와 높이감을 맞춤 */}
      <div className="px-12 py-8 border-b border-gray-50 flex justify-between items-center bg-white shrink-0">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-[#DAA520] rounded-[22px] flex items-center justify-center text-white text-3xl font-black shadow-lg">
            {patient?.name?.[0] ?? "환"}
          </div>
          <div>
            <p className="text-[10px] font-black text-[#DAA520] uppercase mb-1 tracking-[0.2em]">
              Active Patient Profile
            </p>
            <h2 className="text-3xl font-black text-[#8B4513] tracking-tighter">
              {patient?.name ?? "정보 없음"}
              <span className="text-lg font-bold text-gray-300 ml-3">
                {patient?.age ?? "-"}세
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-5 py-2.5 rounded-full text-xs font-black shadow-sm border ${
              ageGroup === "Senior"
                ? "bg-amber-50 text-amber-600 border-amber-100"
                : "bg-blue-50 text-blue-600 border-blue-100"
            }`}
          >
            {ageGroup === "Senior" ? "실버 규준 적용" : "일반 규준 적용"}
          </span>
        </div>
      </div>

      {/* 선택 카드 섹션: 중앙 정렬 및 고정 그리드 */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
        <div className="w-full max-w-6xl px-12 py-6">
          <p className="text-center text-gray-400 font-black text-sm uppercase tracking-[0.4em] mb-10">
            훈련을 진행할 장소를 선택해 주세요
          </p>

          <div className="grid grid-cols-3 gap-8 w-full">
            {PLACES.map((p) => (
              <button
                key={p.key}
                onClick={() => go(p.key)}
                className="group h-60 rounded-[50px] bg-[#FCFBFA] border-2 border-gray-50 hover:border-[#DAA520] transition-all duration-300 flex flex-col items-center justify-center gap-4 shadow-sm hover:bg-white hover:shadow-[0_20px_50px_rgba(218,165,32,0.15)] active:scale-95 relative overflow-hidden"
              >
                {/* 배경 살짝 포인트
                <div className="absolute -top-10 -right-10 text-[120px] opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                  {p.icon}
                </div> */}

                <span className="text-6xl group-hover:scale-110 transition-transform duration-500 z-10">
                  {p.icon}
                </span>
                <div className="text-center px-6 z-10">
                  <span className="block text-2xl font-black text-[#8B4513] mb-2 tracking-tighter">
                    {p.label}
                  </span>
                  <p className="text-xs text-gray-400 font-bold leading-tight break-keep">
                    {p.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
