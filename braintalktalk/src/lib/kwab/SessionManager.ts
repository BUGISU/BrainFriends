// src/lib/kwab/SessionManager.ts
/**
 * 학습 세션 관리 시스템
 * - 각 Step의 결과를 누적
 * - 실시간 K-WAB 점수 계산
 * - localStorage 기반 영속성
 */

import {
  calculateKWABScores,
  KWABScores,
  PatientProfile,
  SpontaneousSpeechResult,
  AuditoryComprehensionResult,
  RepetitionResult,
  NamingResult,
  ReadingResult,
  WritingResult,
} from "./KWABScoring";

// ============================================================================
// 1. Step별 결과 타입
// ============================================================================

export interface Step1Result {
  // 청각 이해 (O/X 문제)
  correctAnswers: number;
  totalQuestions: number;
  averageResponseTime: number; // ms
  timestamp: number;
}

export interface Step2Result {
  // 따라말하기
  items: Array<{
    text: string;
    symmetryScore: number; // 0-100
    pronunciationScore: number; // 0-100
    audioLevel: number; // dB
  }>;
  averageSymmetry: number;
  averagePronunciation: number;
  timestamp: number;
}

export interface Step3Result {
  // 단어-이미지 매칭
  correctAnswers: number;
  totalQuestions: number;
  averageResponseTime: number;
  timestamp: number;
}

export interface Step4Result {
  // 유창성 학습 (문장 완성)
  items: Array<{
    sentence: string;
    completed: boolean;
    pauseDuration: number; // ms
  }>;
  averagePause: number;
  completionRate: number;
  timestamp: number;
}

export interface Step5Result {
  // 읽기 학습
  correctAnswers: number;
  totalQuestions: number;
  timestamp: number;
}

export interface Step6Result {
  // 쓰기 학습
  completedTasks: number;
  totalTasks: number;
  accuracy: number; // 0-100
  timestamp: number;
}

// ============================================================================
// 2. 전체 세션 데이터
// ============================================================================

export interface TrainingSession {
  sessionId: string;
  patient: PatientProfile;
  place: string; // "공원", "마트" 등
  startedAt: number;
  completedAt?: number;

  // Step별 결과
  step1?: Step1Result;
  step2?: Step2Result;
  step3?: Step3Result;
  step4?: Step4Result;
  step5?: Step5Result;
  step6?: Step6Result;

  // K-WAB 점수 (실시간 계산)
  kwabScores?: KWABScores;
}

// ============================================================================
// 3. SessionManager 클래스
// ============================================================================

const SESSION_STORAGE_KEY = "kwab_training_session";

export class SessionManager {
  private session: TrainingSession;

  constructor(patient: PatientProfile, place: string) {
    // 기존 세션 로드 또는 새로 생성
    const existing = this.loadSession();
    if (existing && existing.patient.age === patient.age) {
      this.session = existing;
    } else {
      this.session = {
        sessionId: `session_${Date.now()}`,
        patient,
        place,
        startedAt: Date.now(),
      };
      this.saveSession();
    }
  }

  // ========================================================================
  // Step별 결과 저장
  // ========================================================================

  saveStep1Result(result: Step1Result) {
    this.session.step1 = result;
    this.updateKWABScores();
    this.saveSession();
  }

  saveStep2Result(result: Step2Result) {
    this.session.step2 = result;
    this.updateKWABScores();
    this.saveSession();
  }

  saveStep3Result(result: Step3Result) {
    this.session.step3 = result;
    this.updateKWABScores();
    this.saveSession();
  }

  saveStep4Result(result: Step4Result) {
    this.session.step4 = result;
    this.updateKWABScores();
    this.saveSession();
  }

  saveStep5Result(result: Step5Result) {
    this.session.step5 = result;
    this.updateKWABScores();
    this.saveSession();
  }

  saveStep6Result(result: Step6Result) {
    this.session.step6 = result;
    this.session.completedAt = Date.now();
    this.updateKWABScores();
    this.saveSession();
  }

  // ========================================================================
  // K-WAB 점수 계산
  // ========================================================================

  private updateKWABScores() {
    // Step별 결과를 K-WAB 형식으로 변환
    const spontaneousSpeech = this.convertToSpontaneousSpeech();
    const auditoryComprehension = this.convertToAuditoryComprehension();
    const repetition = this.convertToRepetition();
    const naming = this.convertToNaming();
    const reading = this.convertToReading();
    const writing = this.convertToWriting();

    // K-WAB 점수 계산
    this.session.kwabScores = calculateKWABScores(this.session.patient, {
      spontaneousSpeech,
      auditoryComprehension,
      repetition,
      naming,
      reading,
      writing,
    });
  }

  // ========================================================================
  // Step 결과 → K-WAB 형식 변환
  // ========================================================================

  private convertToSpontaneousSpeech(): SpontaneousSpeechResult {
    // 현재는 단순화: Step 4의 유창성 데이터를 활용
    const step4 = this.session.step4;
    if (!step4) {
      return { contentScore: 0, fluencyScore: 0 };
    }

    // 유창성 점수: 휴지 시간이 짧을수록 높은 점수
    const avgPause = step4.averagePause;
    let fluencyScore = 10;
    if (avgPause > 1000) fluencyScore = 7;
    else if (avgPause > 800) fluencyScore = 8;
    else if (avgPause > 500) fluencyScore = 9;

    // 내용 점수: 완성률 기반
    const contentScore = Math.round(step4.completionRate * 10);

    return { contentScore, fluencyScore };
  }

  private convertToAuditoryComprehension(): AuditoryComprehensionResult {
    const step1 = this.session.step1;
    const step3 = this.session.step3;

    // Step 1: 예-아니오 검사 (각 3점)
    const yesNoScore = step1
      ? Math.min((step1.correctAnswers / step1.totalQuestions) * 60, 60)
      : 0;

    // Step 3: 청각적 낱말인지 (각 1점)
    const wordRecognitionScore = step3
      ? Math.min((step3.correctAnswers / step3.totalQuestions) * 60, 60)
      : 0;

    // 명령이행: 현재 미구현 (기본값 40점 - 평균)
    const commandScore = 40;

    return { yesNoScore, wordRecognitionScore, commandScore };
  }

  private convertToRepetition(): RepetitionResult {
    const step2 = this.session.step2;
    if (!step2) {
      return { totalScore: 0 };
    }

    // 발음 정확도 평균을 100점 만점으로 변환
    const totalScore = Math.round(step2.averagePronunciation);
    return { totalScore: Math.min(totalScore, 100) };
  }

  private convertToNaming(): NamingResult {
    // 현재는 기본값 (추후 Step 확장 시 구현)
    return {
      objectNamingScore: 40, // 평균값
      wordFluencyScore: 10,
      sentenceCompletionScore: 6,
      sentenceResponseScore: 6,
    };
  }

  private convertToReading(): ReadingResult {
    const step5 = this.session.step5;
    if (!step5) {
      return { totalScore: 0 };
    }

    const totalScore = Math.round(
      (step5.correctAnswers / step5.totalQuestions) * 100
    );
    return { totalScore: Math.min(totalScore, 100) };
  }

  private convertToWriting(): WritingResult {
    const step6 = this.session.step6;
    if (!step6) {
      return { totalScore: 0 };
    }

    const totalScore = Math.round(step6.accuracy);
    return { totalScore: Math.min(totalScore, 100) };
  }

  // ========================================================================
  // Storage 관리
  // ========================================================================

  private saveSession() {
    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.session));
    }
  }

  private loadSession(): TrainingSession | null {
    if (typeof window !== "undefined") {
      const data = localStorage.getItem(SESSION_STORAGE_KEY);
      if (data) {
        try {
          return JSON.parse(data);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  // ========================================================================
  // Getter
  // ========================================================================

  getSession(): TrainingSession {
    return this.session;
  }

  getKWABScores(): KWABScores | undefined {
    return this.session.kwabScores;
  }

  getCompletionRate(): number {
    const completed = [
      this.session.step1,
      this.session.step2,
      this.session.step3,
      this.session.step4,
      this.session.step5,
      this.session.step6,
    ].filter((s) => s !== undefined).length;

    return (completed / 6) * 100;
  }

  // ========================================================================
  // 세션 초기화
  // ========================================================================

  static clearSession() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  static hasActiveSession(): boolean {
    if (typeof window !== "undefined") {
      return localStorage.getItem(SESSION_STORAGE_KEY) !== null;
    }
    return false;
  }
}

// ============================================================================
// 4. React Hook으로 래핑
// ============================================================================

export function useSessionManager(patient: PatientProfile, place: string) {
  const manager = new SessionManager(patient, place);
  
  return {
    session: manager.getSession(),
    kwabScores: manager.getKWABScores(),
    completionRate: manager.getCompletionRate(),
    saveStep1: (result: Step1Result) => manager.saveStep1Result(result),
    saveStep2: (result: Step2Result) => manager.saveStep2Result(result),
    saveStep3: (result: Step3Result) => manager.saveStep3Result(result),
    saveStep4: (result: Step4Result) => manager.saveStep4Result(result),
    saveStep5: (result: Step5Result) => manager.saveStep5Result(result),
    saveStep6: (result: Step6Result) => manager.saveStep6Result(result),
  };
}
