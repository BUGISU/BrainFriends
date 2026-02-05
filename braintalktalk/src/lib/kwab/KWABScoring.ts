// src/lib/kwab/KWABScoring.ts
/**
 * K-WAB (한국판 웨스턴 실어증 검사) 채점 시스템
 * - 문서 기준: K-WAB.pdf, K-WAB내용전달기준표.pdf, K-WAB유창성기준표.pdf
 */

// ============================================================================
// 1. 타입 정의
// ============================================================================

export interface PatientProfile {
  age: number;
  educationYears: number; // 0, 1-6, 7+
}

export interface SpontaneousSpeechResult {
  contentScore: number; // 0-10 (내용전달)
  fluencyScore: number; // 0-10 (유창성)
}

export interface AuditoryComprehensionResult {
  yesNoScore: number; // 0-60
  wordRecognitionScore: number; // 0-60
  commandScore: number; // 0-80
}

export interface RepetitionResult {
  totalScore: number; // 0-100
}

export interface NamingResult {
  objectNamingScore: number; // 0-60
  wordFluencyScore: number; // 0-20
  sentenceCompletionScore: number; // 0-10
  sentenceResponseScore: number; // 0-10
}

export interface ReadingResult {
  totalScore: number; // 0-100
}

export interface WritingResult {
  totalScore: number; // 0-100
}

export interface KWABScores {
  // 하위 검사 점수
  spontaneousSpeech: SpontaneousSpeechResult;
  auditoryComprehension: AuditoryComprehensionResult;
  repetition: RepetitionResult;
  naming: NamingResult;
  reading: ReadingResult;
  writing: WritingResult;

  // 주요 지수
  aq: number; // Aphasia Quotient (실어증 지수)
  lq: number; // Language Quotient (언어 지수)
  cq: number; // Cortical Quotient (피질 지수)

  // 해석
  aphasiaType: string | null;
  severity: "정상" | "경도" | "중등도" | "중증" | "최중증";
  percentile: number; // 동일 연령/교육 그룹 내 백분위
}

// ============================================================================
// 2. 정상군 표준편차 데이터 (정상군_표준편차.pdf)
// ============================================================================

const NORMAL_STANDARDS = {
  "15-65_0": { mean: 90.73, sd: 4.4 },
  "15-65_1-6": { mean: 94.47, sd: 4.11 },
  "15-65_7+": { mean: 97.21, sd: 2.25 },
  "65+_0": { mean: 88.09, sd: 5.87 },
  "65+_1-6": { mean: 94.39, sd: 9.82 },
  "65+_7+": { mean: 94.91, sd: 5.0 },
};

function getNormalStandard(age: number, eduYears: number) {
  const ageKey = age >= 65 ? "65+" : "15-65";
  let eduKey: string;
  if (eduYears === 0) eduKey = "0";
  else if (eduYears <= 6) eduKey = "1-6";
  else eduKey = "7+";

  const key = `${ageKey}_${eduKey}` as keyof typeof NORMAL_STANDARDS;
  return NORMAL_STANDARDS[key];
}

// ============================================================================
// 3. AQ 계산 (Aphasia Quotient)
// ============================================================================
// 공식: AQ = (스스로말하기 + 알아듣기 + 따라말하기 + 이름대기) / 10

function calculateAQ(
  spontaneous: SpontaneousSpeechResult,
  auditory: AuditoryComprehensionResult,
  repetition: RepetitionResult,
  naming: NamingResult
): number {
  const spontaneousTotal = spontaneous.contentScore + spontaneous.fluencyScore; // 0-20
  const auditoryTotal =
    auditory.yesNoScore + auditory.wordRecognitionScore + auditory.commandScore; // 0-200

  const repetitionTotal = repetition.totalScore; // 0-100
  const namingTotal =
    naming.objectNamingScore +
    naming.wordFluencyScore +
    naming.sentenceCompletionScore +
    naming.sentenceResponseScore; // 0-100

  // AQ 공식 적용
  const aq =
    (spontaneousTotal / 20) * 10 +
    (auditoryTotal / 200) * 10 +
    (repetitionTotal / 100) * 10 +
    (namingTotal / 100) * 10;

  return Math.round(aq * 100) / 100; // 소수점 2자리
}

// ============================================================================
// 4. LQ 계산 (Language Quotient)
// ============================================================================
// 공식: AQ 산정 + 읽기(20점) + 쓰기(20점)

function calculateLQ(
  aq: number,
  reading: ReadingResult,
  writing: WritingResult
): number {
  const readingScore = (reading.totalScore / 100) * 20;
  const writingScore = (writing.totalScore / 100) * 20;

  const lq = aq + readingScore + writingScore;
  return Math.round(lq * 100) / 100;
}

// ============================================================================
// 5. CQ 계산 (Cortical Quotient)
// ============================================================================
// 공식: AQ + 읽기(10점) + 쓰기(10점) + 동작(10점) + 구성-시공간-계산(10점)
// 주의: 현재 시스템에서는 동작/구성 검사 미구현이므로 제외

function calculateCQ(
  aq: number,
  reading: ReadingResult,
  writing: WritingResult
): number {
  const readingScore = (reading.totalScore / 100) * 10;
  const writingScore = (writing.totalScore / 100) * 10;

  // 동작, 구성 점수는 현재 0으로 처리
  const cq = aq + readingScore + writingScore;
  return Math.round(cq * 100) / 100;
}

// ============================================================================
// 6. 실어증 유형 판별
// ============================================================================

function classifyAphasiaType(scores: {
  fluency: number;
  comprehension: number;
  repetition: number;
  naming: number;
}): string | null {
  const { fluency, comprehension, repetition, naming } = scores;

  // 정상 범위
  if (
    fluency >= 9 &&
    comprehension >= 9 &&
    repetition >= 9 &&
    naming >= 9
  ) {
    return null; // 실어증 없음
  }

  // 브로카 실어증: 유창성↓, 이해↑, 따라말하기↓
  if (fluency < 7 && comprehension >= 7 && repetition < 7) {
    return "브로카 실어증";
  }

  // 베르니케 실어증: 유창성↑, 이해↓, 따라말하기↓
  if (fluency >= 7 && comprehension < 7 && repetition < 7) {
    return "베르니케 실어증";
  }

  // 전도 실어증: 유창성↑, 이해↑, 따라말하기↓
  if (fluency >= 7 && comprehension >= 7 && repetition < 7) {
    return "전도 실어증";
  }

  // 전실어증: 모두 낮음
  if (fluency < 5 && comprehension < 5 && repetition < 5) {
    return "전실어증";
  }

  return "미분류 실어증";
}

// ============================================================================
// 7. 심각도 판별
// ============================================================================

function determineSeverity(
  aq: number
): "정상" | "경도" | "중등도" | "중증" | "최중증" {
  if (aq >= 93.8) return "정상";
  if (aq >= 76) return "경도";
  if (aq >= 51) return "중등도";
  if (aq >= 26) return "중증";
  return "최중증";
}

// ============================================================================
// 8. 백분위 계산
// ============================================================================

function calculatePercentile(
  aq: number,
  age: number,
  eduYears: number
): number {
  const standard = getNormalStandard(age, eduYears);
  const zScore = (aq - standard.mean) / standard.sd;

  // Z-score를 백분위로 변환 (정규분포 가정)
  // 간단한 근사식 사용
  const percentile = 50 + 50 * Math.tanh(zScore / 2);
  return Math.round(percentile);
}

// ============================================================================
// 9. 메인 채점 함수
// ============================================================================

export function calculateKWABScores(
  patient: PatientProfile,
  results: {
    spontaneousSpeech: SpontaneousSpeechResult;
    auditoryComprehension: AuditoryComprehensionResult;
    repetition: RepetitionResult;
    naming: NamingResult;
    reading: ReadingResult;
    writing: WritingResult;
  }
): KWABScores {
  const aq = calculateAQ(
    results.spontaneousSpeech,
    results.auditoryComprehension,
    results.repetition,
    results.naming
  );

  const lq = calculateLQ(aq, results.reading, results.writing);
  const cq = calculateCQ(aq, results.reading, results.writing);

  const aphasiaType = classifyAphasiaType({
    fluency: results.spontaneousSpeech.fluencyScore,
    comprehension: results.auditoryComprehension.commandScore / 8, // 0-10 스케일로 정규화
    repetition: results.repetition.totalScore / 10,
    naming:
      (results.naming.objectNamingScore +
        results.naming.wordFluencyScore +
        results.naming.sentenceCompletionScore +
        results.naming.sentenceResponseScore) /
      10,
  });

  const severity = determineSeverity(aq);
  const percentile = calculatePercentile(aq, patient.age, patient.educationYears);

  return {
    spontaneousSpeech: results.spontaneousSpeech,
    auditoryComprehension: results.auditoryComprehension,
    repetition: results.repetition,
    naming: results.naming,
    reading: results.reading,
    writing: results.writing,
    aq,
    lq,
    cq,
    aphasiaType,
    severity,
    percentile,
  };
}

// ============================================================================
// 10. 개별 검사 채점 헬퍼 함수들
// ============================================================================

/**
 * 스스로 말하기 - 내용전달 채점
 * 기준: K-WAB내용전달기준표.pdf
 */
export function scoreContentDelivery(params: {
  correctAnswers: number; // 첫 6개 항목 중 정답 개수
  pictureDescriptionItems: number; // 그림 설명 시 언급한 사물/인물/행동 개수
}): number {
  const { correctAnswers, pictureDescriptionItems } = params;

  if (correctAnswers === 0) return 0;
  if (correctAnswers === 1) return 2;
  if (correctAnswers === 2) return 3;
  if (correctAnswers === 3) {
    if (pictureDescriptionItems >= 1) return 5;
    return 4;
  }
  if (correctAnswers === 4) {
    if (pictureDescriptionItems >= 6) return 7;
    if (pictureDescriptionItems >= 1) return 6;
    return 4;
  }
  if (correctAnswers === 5) {
    if (pictureDescriptionItems < 6) return 8;
  }
  if (correctAnswers === 6) {
    if (pictureDescriptionItems >= 10) return 9;
    return 8;
  }

  // 완벽한 경우
  if (
    correctAnswers === 6 &&
    pictureDescriptionItems >= 10
  ) {
    return 10;
  }

  return 4; // 기본값
}

/**
 * 스스로 말하기 - 유창성 채점
 * 기준: K-WAB유창성기준표.pdf
 */
export function scoreFluency(params: {
  syllablesPerUtterance: number; // 발화당 음절 수
  hasCompleteSentences: boolean; // 완전한 문장 존재 여부
  hasWordFindingDifficulty: boolean; // 낱말찾기 어려움
  speechRate: "normal" | "slow" | "very_slow"; // 발화 속도
}): number {
  const { syllablesPerUtterance, hasCompleteSentences, speechRate } = params;

  if (syllablesPerUtterance === 0) return 0;
  if (syllablesPerUtterance < 7 && !hasCompleteSentences) return 4;
  if (syllablesPerUtterance >= 7 && hasCompleteSentences) return 5;
  if (hasCompleteSentences && speechRate === "slow") return 7;
  if (hasCompleteSentences && speechRate === "normal") return 9;
  if (
    hasCompleteSentences &&
    speechRate === "normal" &&
    !params.hasWordFindingDifficulty
  ) {
    return 10;
  }

  return 5; // 중간값 기본
}

/**
 * 예-아니오 검사 채점
 * 각 문항당 3점
 */
export function scoreYesNo(correctCount: number, totalQuestions: number = 20): number {
  return Math.min(correctCount * 3, 60);
}

/**
 * 청각적 낱말인지 채점
 * 각 문항당 1점
 */
export function scoreWordRecognition(correctCount: number): number {
  return Math.min(correctCount, 60);
}

/**
 * 따라말하기 채점
 * 각 어절당 2점
 */
export function scoreRepetition(correctSyllables: number): number {
  return Math.min(correctSyllables * 2, 100);
}

/**
 * 물건이름대기 채점
 * 정반응 3점, 음소착어 2점, 단서 후 정반응 1점
 */
export function scoreObjectNaming(scores: Array<0 | 1 | 2 | 3>): number {
  return Math.min(
    scores.reduce((sum, score) => sum + score, 0),
    60
  );
}
