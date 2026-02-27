"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTrainingSession } from "@/hooks/useTrainingSession";
import { SessionManager } from "@/lib/kwab/SessionManager";
import {
  clearTrainingExitProgress,
  getTrainingExitProgress,
} from "@/lib/trainingExitProgress";

const PLACES = [
  {
    key: "home",
    label: "우리 집",
    desc: "일상 사실 및 추론",
    bgClass: "bg-[linear-gradient(145deg,#fff7ed,#ffedd5)]",
    imagePath: "/images/places/home.png",
  },
  {
    key: "hospital",
    label: "병원",
    desc: "증상 표현 및 소통",
    bgClass: "bg-[linear-gradient(145deg,#f8fafc,#e2e8f0)]",
    imagePath: "/images/places/hospital.png",
  },
  {
    key: "cafe",
    label: "카페",
    desc: "주문 및 사회적 활동",
    bgClass: "bg-[linear-gradient(145deg,#fff7ed,#fde68a)]",
    imagePath: "/images/places/cafe.png",
  },
  {
    key: "bank",
    label: "은행",
    desc: "숫자 및 금융 인지",
    bgClass: "bg-[linear-gradient(145deg,#eff6ff,#dbeafe)]",
    imagePath: "/images/places/bank.png",
  },
  {
    key: "park",
    label: "공원",
    desc: "청각 및 사물 이름",
    bgClass: "bg-[linear-gradient(145deg,#f0fdf4,#dcfce7)]",
    imagePath: "/images/places/park.png",
  },
  {
    key: "mart",
    label: "마트",
    desc: "물건 사기 및 계산",
    bgClass: "bg-[linear-gradient(145deg,#fff1f2,#ffe4e6)]",
    imagePath: "/images/places/mart.png",
  },
] as const;

export default function SelectPage() {
  const router = useRouter();
  const { patient, ageGroup } = useTrainingSession();
  const [isMounted, setIsMounted] = useState(false);
  const [resumeModal, setResumeModal] = useState<{
    open: boolean;
    place: string;
    resumePath: string;
  }>({ open: false, place: "", resumePath: "" });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getStartPath = (place: string) =>
    `/step-1?place=${encodeURIComponent(place)}`;

  const getResumeLabel = (path: string) => {
    if (path.includes("/result")) return "결과 보기";
    if (path.includes("/step-6")) return "Step 6 이어하기";
    if (path.includes("/step-5")) return "Step 5 이어하기";
    if (path.includes("/step-4")) return "Step 4 이어하기";
    if (path.includes("/step-3")) return "Step 3 이어하기";
    if (path.includes("/step-2")) return "Step 2 이어하기";
    if (path.includes("/step-1")) return "Step 1 이어하기";
    return "처음부터 시작";
  };

  const go = (place: string) => {
    if (!patient) {
      router.push(getStartPath(place));
      return;
    }

    const startPath = getStartPath(place);
    const checkpoint = getTrainingExitProgress(place);

    // 홈 이탈 체크포인트가 있으면 이어하기를 우선 제공
    if (checkpoint?.currentStep && checkpoint.currentStep >= 1 && checkpoint.currentStep <= 6) {
      const checkpointResumePath = `/step-${checkpoint.currentStep}?place=${encodeURIComponent(place)}`;
      setResumeModal({ open: true, place, resumePath: checkpointResumePath });
      return;
    }

    const resumePath = SessionManager.getResumePath(patient as any, place);

    // report(=result)까지 완료된 세션은 이어하기를 띄우지 않고 처음부터 시작
    if (resumePath.includes("/result")) {
      router.push(startPath);
      return;
    }

    if (resumePath !== startPath) {
      setResumeModal({ open: true, place, resumePath });
      return;
    }

    router.push(startPath);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* 상단 프로필 섹션: Step 페이지 헤더와 높이감을 맞춤 */}
      <div className="h-16 px-6 border-b border-orange-100 flex justify-between items-center bg-white/90 backdrop-blur-md shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-5">
          <img
            src="/images/logo/logo.png"
            alt="GOLDEN logo"
            className="w-10 h-10 rounded-xl object-cover"
          />
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest leading-none">
              Active Patient Profile
            </p>
            <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">
              {isMounted ? patient?.name ?? "정보 없음" : "정보 없음"}
              <span className="text-sm font-bold text-slate-500 ml-2">
                {isMounted ? patient?.age ?? "-" : "-"}세
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-4 py-1.5 rounded-full text-xs font-black shadow-sm border bg-white text-slate-700 border-slate-200 hover:bg-slate-100 transition-all"
          >
            로그아웃
          </button>
          <button
            type="button"
            onClick={() => router.push("/report")}
            className="px-4 py-1.5 rounded-full text-xs font-black shadow-sm border bg-[#0B1A3A] text-white border-[#0B1A3A] hover:bg-[#09152f] transition-all"
          >
            리포트 보기
          </button>
          <span
            className={`px-4 py-1.5 rounded-full text-xs font-black shadow-sm border ${
              ageGroup === "Senior"
                ? "bg-orange-50 text-orange-700 border-orange-200"
                : "bg-slate-50 text-slate-700 border-slate-200"
            }`}
          >
            {ageGroup === "Senior" ? "실버 규준 적용" : "일반 규준 적용"}
          </span>
        </div>
      </div>

      {/* 선택 카드 섹션: 중앙 정렬 및 고정 그리드 */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center overflow-hidden">
        <div className="w-full max-w-6xl h-full px-4 md:px-8 lg:px-10 pt-2 md:pt-3 pb-2 md:pb-3 flex flex-col">
          <div className="w-full max-w-md mx-auto mt-5 rounded-2xl border border-[#0B1A3A] bg-[#0B1A3A] px-4 py-2 shadow-sm">
            <p className="text-center text-white font-black text-sm md:text-lg tracking-tight leading-snug">
              훈련을 진행할 장소를 선택해 주세요
            </p>
          </div>

          <div className="flex-1 min-h-0 min-w-0 w-full max-w-[900px] mx-auto grid grid-cols-2 md:grid-cols-3 gap-1.5 md:gap-2 lg:gap-2.5 justify-items-center content-center">
            {PLACES.map((p) => (
              <button
                key={p.key}
                onClick={() => go(p.key)}
                className={`group w-full max-w-[158px] sm:max-w-[184px] md:max-w-[210px] lg:max-w-[228px] aspect-square rounded-[22px] md:rounded-[28px] border-2 border-orange-100 hover:border-orange-300 transition-all duration-300 flex flex-col items-center justify-center px-2.5 shadow-sm hover:shadow-[0_12px_28px_rgba(249,115,22,0.16)] active:scale-95 relative overflow-hidden ${p.bgClass}`}
              >
                {p.imagePath && (
                  <div
                    className="absolute inset-0 bg-center bg-cover opacity-100 scale-[1.02]"
                    style={{ backgroundImage: `url(${p.imagePath})` }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/25" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(255,255,255,0.18),transparent_35%)]" />
                <div className="text-center px-3 md:px-5 z-10">
                  <span
                    className="block text-[28px] md:text-[36px] lg:text-[44px] font-black italic text-white mb-1.5 tracking-tight leading-none"
                    style={{
                      textShadow:
                        "0 1px 0 rgba(0,0,0,0.28), 0 5px 10px rgba(0,0,0,0.26)",
                    }}
                  >
                    {p.label}
                  </span>
                  <p className="inline-flex items-center justify-center rounded-sm border-2 border-white/90 bg-black/25 px-3 py-1 text-[10px] md:text-[11px] text-white font-extrabold leading-tight break-keep backdrop-blur-[1px]">
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
          <div className="w-full max-w-md bg-white rounded-3xl border border-orange-100 p-6 shadow-2xl">
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.25em] mb-2">
              Saved Progress
            </p>
            <h3 className="text-xl font-black text-slate-900 mb-2 break-keep">
              이전 진행 기록이 있습니다
            </h3>
            <p className="text-sm text-slate-600 font-bold mb-6">
              {getResumeLabel(resumeModal.resumePath)} 또는 처음부터 다시 시작할
              수 있습니다.
            </p>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => {
                  router.push(resumeModal.resumePath);
                  clearTrainingExitProgress(resumeModal.place);
                  setResumeModal({ open: false, place: "", resumePath: "" });
                }}
                className="w-full py-3.5 rounded-2xl bg-[#0B1A3A] text-white font-black hover:bg-[#09152f] transition-all"
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
                  clearTrainingExitProgress(resumeModal.place);
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
                className="w-full py-2 text-xs text-slate-500 font-bold"
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
