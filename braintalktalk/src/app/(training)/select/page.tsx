"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTrainingSession } from "@/hooks/useTrainingSession";
import { PlaceType } from "@/constants/trainingData";

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
    <div className="h-full w-full p-10 bg-[#F8F9FA]">
      <div className="h-full w-full rounded-[40px] border-4 border-[#DAA520]/10 bg-white p-10 flex flex-col shadow-xl">
        {/* 상단 프로필 섹션 (기존 유지) */}
        <div className="flex justify-between items-center mb-10 pb-6 border-b-2 border-gray-50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#DAA520] rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg">
              {patient?.name?.[0] ?? "환"}
            </div>
            <div>
              <p className="text-xs font-bold text-[#DAA520] uppercase mb-1 tracking-tighter">
                Active Patient
              </p>
              <h2 className="text-2xl font-black text-[#8B4513]">
                {patient?.name ?? "정보 없음"}
                <span className="text-base font-normal text-gray-400 ml-2">
                  ({patient?.age ?? "-"}세)
                </span>
              </h2>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`px-4 py-2 rounded-full text-xs font-black shadow-sm ${
                ageGroup === "Senior"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {ageGroup === "Senior"
                ? "실버 규준(65세↑) 적용"
                : "일반 규준(15-64) 적용"}
            </span>
          </div>
        </div>

        {/* 선택 카드 섹션 (3x2 그리드) */}
        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
          <div className="grid grid-cols-3 gap-6 w-full max-w-6xl mx-auto py-4">
            {PLACES.map((p) => (
              <button
                key={p.key}
                onClick={() => go(p.key)}
                className="group h-56 rounded-[40px] bg-[#F8F8F8] border-4 border-transparent hover:border-[#DAA520] transition-all flex flex-col items-center justify-center gap-3 shadow-sm hover:bg-white hover:shadow-2xl active:scale-95"
              >
                <span className="text-5xl group-hover:scale-110 transition-transform duration-300">
                  {p.icon}
                </span>
                <div className="text-center px-4">
                  <span className="block text-2xl font-black text-[#8B4513] mb-1 tracking-tighter">
                    {p.label}
                  </span>
                  <p className="text-[11px] text-gray-400 font-bold leading-tight break-keep">
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
