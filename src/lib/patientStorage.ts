// src/lib/patientStorage.ts

export interface PatientProfile {
  sessionId: string;
  name: string;
  gender: "M" | "F" | "U";
  age: number;
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
  // ✅ localStorage 대신 sessionStorage로 변경
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PatientProfile;
  } catch {
    return null;
  }
}

export function savePatientProfile(
  input: Omit<PatientProfile, "sessionId" | "createdAt" | "updatedAt">
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

  // ✅ localStorage 대신 sessionStorage로 변경
  sessionStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

// ✅ 앱 초기화 시 사용할 삭제 함수 추가
export function clearAllStorage() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem("btt.sessionId");
  }
}
