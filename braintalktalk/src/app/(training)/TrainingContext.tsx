"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface ClinicalMetrics {
  systemLatency: number;
  trackingPrecision: number;
  analysisAccuracy: number;
  correlation: number;
  reliability: number;
  stability: number;
}

interface SidebarMetrics {
  facialSymmetry: number;
  mouthOpening: number;
  faceDetected: boolean;
  cameraActive: boolean;
  landmarks?: any[];
}

interface TrainingContextType {
  clinicalMetrics: ClinicalMetrics;
  sidebarMetrics: SidebarMetrics;
  updateClinical: (data: Partial<ClinicalMetrics>) => void;
  updateSidebar: (data: Partial<SidebarMetrics>) => void;
}

const TrainingContext = createContext<TrainingContextType | undefined>(
  undefined,
);

export function TrainingProvider({ children }: { children: React.ReactNode }) {
  const [clinicalMetrics, setClinicalMetrics] = useState<ClinicalMetrics>({
    systemLatency: 0,
    trackingPrecision: 0,
    analysisAccuracy: 95.2,
    correlation: 0.85,
    reliability: 0.8,
    stability: 0,
  });

  const [sidebarMetrics, setSidebarMetrics] = useState<SidebarMetrics>({
    facialSymmetry: 0,
    mouthOpening: 0,
    faceDetected: false,
    cameraActive: false,
    landmarks: [],
  });

  const updateClinical = useCallback((data: Partial<ClinicalMetrics>) => {
    setClinicalMetrics((prev) => ({ ...prev, ...data }));
  }, []);

  const updateSidebar = useCallback((data: Partial<SidebarMetrics>) => {
    setSidebarMetrics((prev) => ({ ...prev, ...data }));
  }, []);

  return (
    <TrainingContext.Provider
      value={{
        clinicalMetrics,
        sidebarMetrics,
        updateClinical,
        updateSidebar,
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
