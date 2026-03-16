// src/hooks/useTrainingSession.ts
"use client";

import { useMemo } from "react";
import { getOrCreateSessionId, loadPatientProfile } from "@/lib/patientStorage";

export function useTrainingSession() {
  const sessionId = useMemo(() => getOrCreateSessionId(), []);
  const patient = useMemo(() => loadPatientProfile(), []);

  const hasPatient = !!patient?.name && !!patient?.age;

  // ✅ ageGroup을 계산해서 포함시킵니다.
  const ageGroup = useMemo(() => {
    if (!patient?.age) return "Standard";
    return Number(patient.age) >= 65 ? "Senior" : "Standard";
  }, [patient?.age]);

  return { sessionId, patient, hasPatient, ageGroup };
}
