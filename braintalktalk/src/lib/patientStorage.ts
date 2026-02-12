// src/lib/patientStorage.ts

export interface PatientProfile {
  sessionId: string;
  name: string;
  gender: "M" | "F" | "U";
  age: number;
  educationYears: number; // ✅ 추가: 0 (무학), 1-6 (초등), 7+ (중등 이상)
  phone?: string;
  hand: "R" | "L" | "U";
  language?: string;
  createdAt: number;
  updatedAt: number;
}

const KEY = "btt.patient_profile";

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "server";
  const existing = sessionStorage.getItem("btt.sessionId");
  if (existing) return existing;

  let sid: string;
  try {
    sid = window.crypto.randomUUID();
  } catch (e) {
    sid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  sessionStorage.setItem("btt.sessionId", sid);
  return sid;
}

export function loadPatientProfile(): PatientProfile | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      educationYears: parsed.educationYears ?? 0, // ✅ 안전장치: 값이 없으면 0 반환
    } as PatientProfile;
  } catch {
    return null;
  }
}

export function savePatientProfile(
  input: Omit<PatientProfile, "sessionId" | "createdAt" | "updatedAt">,
): PatientProfile {
  const sessionId = getOrCreateSessionId();
  const now = Date.now();
  const prev = loadPatientProfile();

  const next: PatientProfile = {
    ...input,
    sessionId,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  };

  sessionStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearAllStorage() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem("btt.sessionId");
  }
}
