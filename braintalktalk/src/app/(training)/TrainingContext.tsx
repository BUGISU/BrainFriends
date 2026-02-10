"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";

// ============================================================================
// 타입 정의
// ============================================================================

interface FooterData {
  leftText: string;
  centerText: string;
  rightText: string;
}

interface SidebarMetrics {
  // 카메라 상태
  cameraActive: boolean;
  faceDetected: boolean;

  // 음성 (발성 크기)
  voiceLevel: number; // dB (0-100)

  // 조음 정확도
  articulationAccuracy: number; // % (0-100)

  // 얼굴 안면 대칭성
  facialSymmetry: number; // 0-1 (Symmetry Index)
}

interface ClinicalMetrics {
  // 시스템 지연시간 (목표: ≤ 50ms)
  systemLatency: number; // ms

  // 안면 트래킹 정밀도 (목표: ≤ 0.5mm)
  trackingPrecision: number; // mm

  // 음성 분석 정확도 (목표: ≥ 95.2%)
  analysisAccuracy: number; // %

  // 임상적 상관성 (목표: r ≥ 0.85)
  correlation: number; // r

  // 반복 측정 신뢰도 (목표: ICC ≥ 0.80)
  reliability: number; // ICC

  // 분석 안정성 (목표: CV ≤ 10%)
  stability: number; // CV%
}

interface TrainingContextType {
  // 기존 하단 푸터
  footerData: FooterData;
  updateFooter: (data: Partial<FooterData>) => void;

  // 왼쪽 사이드바 지표
  sidebarMetrics: SidebarMetrics;
  updateSidebar: (data: Partial<SidebarMetrics>) => void;

  // 하단 임상 지표
  clinicalMetrics: ClinicalMetrics;
  updateClinical: (data: Partial<ClinicalMetrics>) => void;
}

// ============================================================================
// Context 생성
// ============================================================================

const TrainingContext = createContext<TrainingContextType | undefined>(
  undefined,
);

// ============================================================================
// Provider
// ============================================================================

export const TrainingProvider = ({ children }: { children: ReactNode }) => {
  // 1️⃣ 하단 푸터 데이터
  const [footerData, setFooterData] = useState<FooterData>({
    leftText: "SI: 0% | VOICE: 0dB",
    centerText: "Ready",
    rightText: "Frames: 0 | Samples: 0",
  });

  // 2️⃣ 왼쪽 사이드바 지표
  const [sidebarMetrics, setSidebarMetrics] = useState<SidebarMetrics>({
    cameraActive: false,
    faceDetected: false,
    voiceLevel: 0,
    articulationAccuracy: 0,
    facialSymmetry: 0,
  });

  // 3️⃣ 하단 임상 지표
  const [clinicalMetrics, setClinicalMetrics] = useState<ClinicalMetrics>({
    systemLatency: 0,
    trackingPrecision: 0,
    analysisAccuracy: 0,
    correlation: 0,
    reliability: 0,
    stability: 0,
  });

  // ========================================================================
  // Update 함수들 (무한 루프 방지)
  // ========================================================================

  const updateFooter = useCallback((data: Partial<FooterData>) => {
    setFooterData((prev) => {
      const isChanged = Object.keys(data).some(
        (key) => (data as any)[key] !== (prev as any)[key],
      );
      if (!isChanged) return prev;
      return { ...prev, ...data };
    });
  }, []);

  const updateSidebar = useCallback((data: Partial<SidebarMetrics>) => {
    setSidebarMetrics((prev) => {
      const isChanged = Object.keys(data).some(
        (key) => (data as any)[key] !== (prev as any)[key],
      );
      if (!isChanged) return prev;
      return { ...prev, ...data };
    });
  }, []);

  const updateClinical = useCallback((data: Partial<ClinicalMetrics>) => {
    setClinicalMetrics((prev) => {
      const isChanged = Object.keys(data).some(
        (key) => (data as any)[key] !== (prev as any)[key],
      );
      if (!isChanged) return prev;
      return { ...prev, ...data };
    });
  }, []);

  return (
    <TrainingContext.Provider
      value={{
        footerData,
        updateFooter,
        sidebarMetrics,
        updateSidebar,
        clinicalMetrics,
        updateClinical,
      }}
    >
      {children}
    </TrainingContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

export const useTraining = () => {
  const context = useContext(TrainingContext);
  if (!context) {
    throw new Error("useTraining must be used within TrainingProvider");
  }
  return context;
};
