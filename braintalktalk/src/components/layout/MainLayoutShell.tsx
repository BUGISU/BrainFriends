"use client";

import React from "react";
import SafetyDisclaimer from "./SafetyDisclaimer"; //

interface MainLayoutShellProps {
  content: React.ReactNode; // 좌측: 학습/진단 메인 (예: 영상, 문제)
  monitoring: React.ReactNode; // 우측 상단: FaceTracker (카메라)
  dashboard: React.ReactNode; // 우측 하단: MonitoringDashboard (수치)
}

export default function MainLayoutShell({
  content,
  monitoring,
  dashboard,
}: MainLayoutShellProps) {
  return (
    // 1. 전체 배경 및 정렬 (가장 안정적인 방식)
    <div className="min-h-screen w-full bg-[#F8F9FA] p-4 md:p-8 flex justify-center">
      <div className="w-full max-w-[1600px] flex flex-col gap-6">
        {/* 2. 유연한 그리드 레이아웃 (나중에 사이드바 폭 조절이 매우 쉬움) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
          {/* 좌측: 어떤 콘텐츠가 들어와도 수용 가능 */}
          <section className="bg-white rounded-[40px] p-6 shadow-sm border border-gray-100 min-h-[600px]">
            {content}
          </section>

          {/* 우측: 모니터링 모듈들을 차례로 쌓는 구조 */}
          <aside className="flex flex-col gap-6 min-w-0">
            {monitoring}
            {dashboard}
            {/* 💡 나중에 '시선 추적기'나 '자세 분석기'를 여기 그냥 추가하면 끝! */}
          </aside>
        </div>
        {/* 상단: 안전 고지사항 (SaMD 필수) */}
        <SafetyDisclaimer />
      </div>
    </div>
  );
}
