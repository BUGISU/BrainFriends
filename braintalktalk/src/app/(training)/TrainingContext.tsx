"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface TrainingContextType {
  clinicalMetrics: {
    systemLatency: number;
    trackingPrecision: number;
    analysisAccuracy: number;
    correlation: number;
    reliability: number;
    stability: number;
  };
  sidebarMetrics: {
    facialSymmetry: number;
    faceDetected: boolean;
    cameraActive: boolean;
    landmarks?: any[]; // ✅ 안면 좌표 데이터 타입 추가
  };
  footerData: {
    leftText: string;
    rightText: string;
  };
  updateClinical: (
    data: Partial<TrainingContextType["clinicalMetrics"]>,
  ) => void;
  updateSidebar: (data: Partial<TrainingContextType["sidebarMetrics"]>) => void;
  updateFooter: (data: Partial<TrainingContextType["footerData"]>) => void;
}

const TrainingContext = createContext<TrainingContextType | undefined>(
  undefined,
);

export function TrainingProvider({ children }: { children: React.ReactNode }) {
  const [clinicalMetrics, setClinicalMetrics] = useState({
    systemLatency: 0,
    trackingPrecision: 0,
    analysisAccuracy: 95.2,
    correlation: 0.85,
    reliability: 0.8,
    stability: 0,
  });

  const [sidebarMetrics, setSidebarMetrics] = useState({
    facialSymmetry: 0,
    faceDetected: false,
    cameraActive: false,
    landmarks: [],
  });

  const [footerData, setFooterData] = useState({
    leftText: "",
    rightText: "",
  });

  const updateClinical = useCallback((data: any) => {
    setClinicalMetrics((prev) => ({ ...prev, ...data }));
  }, []);

  const updateSidebar = useCallback((data: any) => {
    setSidebarMetrics((prev) => ({ ...prev, ...data }));
  }, []);

  const updateFooter = useCallback((data: any) => {
    setFooterData((prev) => ({ ...prev, ...data }));
  }, []);

  return (
    <TrainingContext.Provider
      value={{
        clinicalMetrics,
        sidebarMetrics,
        footerData,
        updateClinical,
        updateSidebar,
        updateFooter,
      }}
    >
      {children}
    </TrainingContext.Provider>
  );
}

export const useTraining = () => {
  const context = useContext(TrainingContext);
  if (!context)
    throw new Error("useTraining must be used within a TrainingProvider");
  return context;
};
