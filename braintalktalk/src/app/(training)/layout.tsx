// src/app/(training)/layout.tsx
"use client";

import React from "react";
import MainLayoutShell from "@/components/layout/MainLayoutShell";
import FaceTracker from "@/components/diagnosis/FaceTracker";
import MonitoringDashboard from "@/components/diagnosis/MonitoringDashboard";
import { useHybridAnalysis } from "@/hooks/useHybridAnalysis";

export default function TrainingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ updateFaceMetrics로 변경
  const { metrics, updateFaceMetrics } = useHybridAnalysis();

  return (
    <MainLayoutShell
      content={children}
      monitoring={
        <FaceTracker
          // ✅ 이제 FaceTracker에서 넘겨주는 metrics 객체를 그대로 훅에 전달
          onMetricsUpdate={(m) => updateFaceMetrics(m)}
        />
      }
      dashboard={<MonitoringDashboard metrics={metrics} />}
    />
  );
}
