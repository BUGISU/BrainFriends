"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTrainingSession } from "@/hooks/useTrainingSession";
import { SessionManager } from "@/lib/kwab/SessionManager";

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
  const [resumeModal, setResumeModal] = useState<{
    open: boolean;
    place: string;
    resumePath: string;
  }>({ open: false, place: "", resumePath: "" });

  const getStartPath = (place: string) =>
    `/step-1?place=${encodeURIComponent(place)}`;

  const getResumeLabel = (path: string) => {
    if (path.includes("/result")) return "결과 보기";
    if (path.includes("/step-6")) return "Step 6 이어하기";
    if (path.includes("/step-5")) return "Step 5 이어하기";
    if (path.includes("/step-4")) return "Step 4 이어하기";
    if (path.includes("/step-3")) return "Step 3 이어하기";
    if (path.includes("/step-2")) return "Step 2 이어하기";
    return "처음부터 시작";
  };

  const go = (place: string) => {
    if (!patient) {
      router.push(getStartPath(place));
      return;
    }
    const resumePath = SessionManager.getResumePath(patient as any, place);
    const startPath = getStartPath(place);

    if (resumePath !== startPath) {
      setResumeModal({ open: true, place, resumePath });
      return;
    }

    router.push(startPath);
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
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center overflow-hidden">
        <div className="w-full max-w-6xl h-full px-6 md:px-8 lg:px-10 py-3 md:py-4 flex flex-col">
          <p className="text-center text-gray-400 font-black text-xs md:text-sm uppercase tracking-[0.25em] md:tracking-[0.35em] mb-4 md:mb-6">
            훈련을 진행할 장소를 선택해 주세요
          </p>

          <div className="flex-1 min-h-0 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 lg:gap-5 w-full auto-rows-fr">
            {PLACES.map((p) => (
              <button
                key={p.key}
                onClick={() => go(p.key)}
                className="group h-full min-h-[132px] md:min-h-[150px] lg:min-h-[168px] rounded-[26px] md:rounded-[34px] bg-[#FCFBFA] border-2 border-gray-50 hover:border-[#DAA520] transition-all duration-300 flex flex-col items-center justify-center gap-2 md:gap-3 px-3 shadow-sm hover:bg-white hover:shadow-[0_16px_38px_rgba(218,165,32,0.15)] active:scale-95 relative overflow-hidden"
              >
                {/* 배경 살짝 포인트
                <div className="absolute -top-10 -right-10 text-[120px] opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                  {p.icon}
                </div> */}

                <span className="text-4xl md:text-5xl lg:text-6xl group-hover:scale-110 transition-transform duration-500 z-10">
                  {p.icon}
                </span>
                <div className="text-center px-2 md:px-4 z-10">
                  <span className="block text-lg md:text-xl lg:text-2xl font-black text-[#8B4513] mb-1 tracking-tighter">
                    {p.label}
                  </span>
                  <p className="text-[10px] md:text-xs text-gray-400 font-bold leading-tight break-keep">
                    {p.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {resumeModal.open && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-amber-100 p-6 shadow-2xl">
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.25em] mb-2">
              Saved Progress
            </p>
            <h3 className="text-xl font-black text-[#8B4513] mb-2 break-keep">
              이전 진행 기록이 있습니다
            </h3>
            <p className="text-sm text-gray-500 font-bold mb-6">
              {getResumeLabel(resumeModal.resumePath)} 또는 처음부터 다시
              시작할 수 있습니다.
            </p>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => {
                  router.push(resumeModal.resumePath);
                  setResumeModal({ open: false, place: "", resumePath: "" });
                }}
                className="w-full py-3.5 rounded-2xl bg-[#8B4513] text-white font-black hover:bg-[#6f370f] transition-all"
              >
                이어서 하기
              </button>
              <button
                onClick={() => {
                  if (patient) {
                    SessionManager.clearSessionFor(
                      patient as any,
                      resumeModal.place,
                    );
                  }
                  router.push(getStartPath(resumeModal.place));
                  setResumeModal({ open: false, place: "", resumePath: "" });
                }}
                className="w-full py-3.5 rounded-2xl bg-white text-gray-600 border border-gray-200 font-black hover:bg-gray-50 transition-all"
              >
                처음부터 하기
              </button>
              <button
                onClick={() =>
                  setResumeModal({ open: false, place: "", resumePath: "" })
                }
                className="w-full py-2 text-xs text-gray-400 font-bold"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
