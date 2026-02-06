"use client";

import React from "react";

export default function TrainingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-full bg-[#F8F9FA] flex items-center justify-center p-0 overflow-hidden font-sans">
      {/* 1400x90vh 규격 고정 */}
      <div className="w-full max-w-[1400px] h-[90vh] bg-white rounded-[48px] shadow-2xl border border-gray-100 flex flex-col overflow-hidden relative">
        <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
        {/* 고정 푸터: 절대 위치나 고정 높이로 배치하여 흔들림 방지 */}
        <footer className="px-10 py-4 border-t border-gray-50 flex justify-between items-center bg-white shrink-0">
          <div className="flex gap-6 text-[9px] font-black text-gray-300 uppercase tracking-widest">
            <span>SI: 87% | VOICE: ANALYZING...</span>
            <span className="text-orange-200 font-bold">
              Visual-Verbal Association Training
            </span>
          </div>
          <div className="text-[9px] font-black text-gray-200 uppercase tracking-widest">
            Frames: 1269 | Samples: 132
          </div>
        </footer>
      </div>
    </div>
  );
}
