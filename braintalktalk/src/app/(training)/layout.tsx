"use client";

import React from "react";
import { TrainingProvider, useTraining } from "./TrainingContext";

function TrainingLayoutContent({ children }: { children: React.ReactNode }) {
  const { footerData } = useTraining();

  // 데이터 파싱 유틸리티 함수 (숫자와 마침표만 추출)
  const parseValue = (text: string | undefined, index: number) => {
    if (!text) return "0";
    const parts = text.split("|");
    return parts[index]?.replace(/[^0-9.]/g, "").trim() || "0";
  };

  return (
    <div className="h-screen w-full bg-[#F8F9FA] flex items-center justify-center p-0 overflow-hidden font-sans">
      <div className="w-full max-w-[1400px] h-[90vh] bg-white rounded-[48px] shadow-2xl border border-gray-100 flex flex-col overflow-hidden relative">
        {/* 상단 메인 콘텐츠 영역 */}
        <div className="flex-1 flex flex-col overflow-hidden">{children}</div>

        {/* 전역 Footer - 데이터 6분할 한 줄 레이아웃 */}
        <footer className="px-10 py-5 border-t border-gray-100 bg-white shrink-0">
          <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
            {/* 1. 안면 대칭성 (LeftText의 첫 번째 값) */}
            <div className="flex flex-col items-start min-w-[100px]">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-0.5">
                Symmetry Index
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-mono font-black text-emerald-600">
                  {parseValue(footerData.leftText, 0)}
                </span>
                <span className="text-[9px] font-bold text-gray-300">SI</span>
              </div>
            </div>

            {/* 2. 음성 정확도 (LeftText의 두 번째 값) */}
            <div className="flex flex-col items-start min-w-[100px]">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-0.5">
                Acoustic Acc.
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-mono font-black text-blue-600">
                  {parseValue(footerData.leftText, 1)}
                </span>
                <span className="text-[9px] font-bold text-gray-300">%</span>
              </div>
            </div>

            {/* 3. 시스템 엔진 상태 (CenterText) */}
            <div className="flex flex-col items-start min-w-[120px]">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-0.5">
                Engine Status
              </span>
              <span className="text-sm font-black text-orange-400 leading-none">
                {footerData.centerText || "Ready"}
              </span>
            </div>

            {/* 4. 비주얼 프레임 (RightText의 첫 번째 값) */}
            <div className="flex flex-col items-start min-w-[100px]">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-0.5">
                Visual Feed
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-mono font-black text-gray-700">
                  {parseValue(footerData.rightText, 0)}
                </span>
                <span className="text-[9px] font-bold text-gray-300">fps</span>
              </div>
            </div>

            {/* 5. 모달리티 싱크 (RightText의 두 번째 값) */}
            <div className="flex flex-col items-start min-w-[100px]">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-0.5">
                Modality Sync
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-mono font-black text-gray-700">
                  {parseValue(footerData.rightText, 1)}
                </span>
                <span className="text-[9px] font-bold text-gray-300">ms</span>
              </div>
            </div>

            {/* 6. 전체 지연 시간 (고정 혹은 추가 데이터) */}
            <div className="flex flex-col items-start min-w-[100px]">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-0.5">
                Total Latency
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-mono font-black text-rose-500">
                  42
                </span>
                <span className="text-[9px] font-bold text-gray-300">ms</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function TrainingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TrainingProvider>
      <TrainingLayoutContent>{children}</TrainingLayoutContent>
    </TrainingProvider>
  );
}
