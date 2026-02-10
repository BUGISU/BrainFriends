"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";

interface FooterData {
  leftText: string;
  centerText: string;
  rightText: string;
}

interface TrainingContextType {
  footerData: FooterData;
  updateFooter: (data: Partial<FooterData>) => void;
}

const TrainingContext = createContext<TrainingContextType | undefined>(
  undefined,
);

export const TrainingProvider = ({ children }: { children: ReactNode }) => {
  const [footerData, setFooterData] = useState<FooterData>({
    leftText: "SI: 0% | VOICE: 0dB",
    centerText: "Ready",
    rightText: "Frames: 0 | Samples: 0",
  });

  // useCallback과 변경 감지 로직으로 무한 루프 방지
  const updateFooter = useCallback((data: Partial<FooterData>) => {
    setFooterData((prev) => {
      const isChanged = Object.keys(data).some(
        (key) => (data as any)[key] !== (prev as any)[key],
      );
      if (!isChanged) return prev;
      return { ...prev, ...data };
    });
  }, []);

  return (
    <TrainingContext.Provider value={{ footerData, updateFooter }}>
      {children}
    </TrainingContext.Provider>
  );
};

// 이 부분이 export 되어 있어야 layout.tsx에서 에러가 나지 않습니다
export const useTraining = () => {
  const context = useContext(TrainingContext);
  if (!context) {
    throw new Error("useTraining must be used within TrainingProvider");
  }
  return context;
};
