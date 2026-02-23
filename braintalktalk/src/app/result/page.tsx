"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { loadPatientProfile } from "@/lib/patientStorage";
import { PlaceType } from "@/constants/trainingData";
import { FLUENCY_SCENARIOS } from "@/constants/fluencyData";
import {
  calculateKWABScores,
  scoreContentDelivery,
  scoreFluency,
} from "@/lib/kwab/KWABScoring";

type ExportFile = {
  name: string;
  data: Uint8Array;
};

type FinalResultCsvRow = {
  case_id?: string;
  eval_date?: string;
  aq_score_0_100?: string;
  aq_sd_band?: string;
  fluency_score_avg_0_10?: string;
  spontaneous_speech_total_0_20?: string;
};

type DerivedKwab = {
  evidence: Array<{
    situation: string;
    transcript: string;
    matchedKeywords: string[];
    matchedKeywordCount: number;
    syllablesPerUtterance: number;
    speechRate: "normal" | "slow" | "very_slow";
    hasCompleteSentences: boolean;
    hasWordFindingDifficulty: boolean;
    contentScore: number;
    fluencyScore: number;
  }>;
  spontaneousSpeech: {
    contentScore: number;
    fluencyScore: number;
    total: number;
  };
  auditoryComprehension: {
    yesNoScore: number;
    wordRecognitionScore: number;
    commandScore: number;
    total: number;
  };
  repetition: {
    totalScore: number;
  };
  naming: {
    objectNamingScore: number;
    wordFluencyScore: number;
    sentenceCompletionScore: number;
    sentenceResponseScore: number;
    total: number;
  };
  contentScore: number;
  fluencyScore: number;
  spontaneousTotal: number;
  aq: number;
  lq: number;
  cq: number;
  aphasiaType: string | null;
  classificationBasis: {
    fluency: number;
    comprehension: number;
    repetition: number;
    naming: number;
  };
  classificationReason: string;
  severity: string;
  percentile: number;
};

function makeCrc32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
}

const CRC32_TABLE = makeCrc32Table();

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    const idx = (crc ^ data[i]) & 0xff;
    crc = (CRC32_TABLE[idx] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatUint8Arrays(chunks: Uint8Array[]) {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

function dataUrlToBytes(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { bytes: new Uint8Array(), mime: "application/octet-stream" };
  const mime = match[1] || "application/octet-stream";
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, mime };
}

function extensionFromMime(mime: string) {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mpeg")) return "mp3";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  return "bin";
}

function createZipBlob(files: ExportFile[]) {
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = new TextEncoder().encode(file.name);
    const crc = crc32(file.data);
    const size = file.data.length;

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, size, true);
    localView.setUint32(22, size, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localChunks.push(localHeader, file.data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, size, true);
    centralView.setUint32(24, size, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralChunks.push(centralHeader);
    offset += localHeader.length + file.data.length;
  }

  const centralSize = centralChunks.reduce((sum, c) => sum + c.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);

  const zipBytes = concatUint8Arrays([...localChunks, ...centralChunks, end]);
  return new Blob([zipBytes], { type: "application/zip" });
}

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<number[]>([]);
  const [playingIndex, setPlayingIndex] = useState<string | null>(null);
  const [audioStatus, setAudioStatus] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [csvLatest, setCsvLatest] = useState<FinalResultCsvRow | null>(null);

  // URL에서 점수 파싱
  const queryScores = useMemo(
    () => ({
      1: Number(searchParams.get("step1") || 0),
      2: Number(searchParams.get("step2") || 0),
      3: Number(searchParams.get("step3") || 0),
      4: Number(searchParams.get("step4") || 0),
      5: Number(searchParams.get("step5") || 0),
      6: Number(searchParams.get("step6") || 0),
    }),
    [searchParams],
  );
  const place = useMemo(
    () => ((searchParams.get("place") as PlaceType) || "home"),
    [searchParams],
  );

  const derivedKwab = useMemo<DerivedKwab | null>(() => {
    if (!sessionData) return null;

    const normalize = (text: string) =>
      (text || "").toLowerCase().replace(/\s+/g, "");
    const getSentenceCount = (text: string) =>
      Math.max(
        1,
        (text || "")
          .split(/[.!?。！？\n]/)
          .map((s) => s.trim())
          .filter(Boolean).length,
      );

    const step4Items = (sessionData?.step4?.items || []) as any[];
    const scenarios = FLUENCY_SCENARIOS[place] || FLUENCY_SCENARIOS.home;

    const spontaneousScores = step4Items.map((item) => {
      const transcript = String(item?.transcript || "");
      const prompt = String(item?.prompt || "");
      const situation = String(item?.text || "");
      const scenario = scenarios.find((s) => s.prompt === prompt);
      const keywords = scenario?.answerKeywords || [];

      const normalizedTranscript = normalize(transcript);
      const matchedKeywords = Array.from(
        new Set(
        keywords.filter((keyword) =>
          normalizedTranscript.includes(normalize(keyword)),
        ),
        ),
      );
      const matchedKeywordCount = matchedKeywords.length;

      const contentScore = scoreContentDelivery({
        correctAnswers: Math.min(6, Math.round(matchedKeywordCount / 2)),
        pictureDescriptionItems: Math.min(12, matchedKeywordCount),
      });

      const syllables = (transcript.match(/[가-힣]/g) || []).length;
      const sentenceCount = getSentenceCount(transcript);
      const syllablesPerUtterance = Math.max(
        0,
        Math.round(syllables / sentenceCount),
      );
      const speechDuration = Math.max(1, Number(item?.speechDuration || 0));
      const syllablesPerSecond = syllables / speechDuration;

      const speechRate: "normal" | "slow" | "very_slow" =
        syllablesPerSecond >= 3.5
          ? "normal"
          : syllablesPerSecond >= 2
            ? "slow"
            : "very_slow";

      const fluencyScore = scoreFluency({
        syllablesPerUtterance,
        hasCompleteSentences: sentenceCount >= 2 || /[.!?]/.test(transcript),
        hasWordFindingDifficulty: Number(item?.silenceRatio || 0) >= 35,
        speechRate,
      });

      return {
        situation,
        transcript,
        matchedKeywords,
        matchedKeywordCount,
        syllablesPerUtterance,
        speechRate,
        hasCompleteSentences: sentenceCount >= 2 || /[.!?]/.test(transcript),
        hasWordFindingDifficulty: Number(item?.silenceRatio || 0) >= 35,
        contentScore,
        fluencyScore,
      };
    });

    const average = (values: number[]) =>
      values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : 0;

    const contentScore = Number(
      average(spontaneousScores.map((s) => s.contentScore)).toFixed(2),
    );
    const fluencyScore = Number(
      average(spontaneousScores.map((s) => s.fluencyScore)).toFixed(2),
    );

    const step1Items = (sessionData?.step1?.items || []) as any[];
    const step2Items = (sessionData?.step2?.items || []) as any[];
    const step3Items = (sessionData?.step3?.items || []) as any[];
    const step1Correct = step1Items.filter((item) => item?.isCorrect).length;
    const step1Accuracy = step1Items.length
      ? step1Correct / step1Items.length
      : Math.max(0, Math.min(1, Number(queryScores[1] || 0) / 20));

    const step3Correct = step3Items.filter((item) => item?.isCorrect).length;
    const step3Accuracy = step3Items.length
      ? step3Correct / step3Items.length
      : Math.max(0, Math.min(1, Number(queryScores[3] || 0) / 100));

    const step2AvgPercent = step2Items.length
      ? step2Items.reduce(
          (sum, item) => sum + Number(item?.finalScore ?? item?.speechScore ?? 0),
          0,
        ) / step2Items.length
      : Number(queryScores[2] || 0);

    const namingTotal = Math.round(step3Accuracy * 100);
    const objectNamingScore = Math.round(namingTotal * 0.6);
    const wordFluencyScore = Math.round(namingTotal * 0.2);
    const sentenceCompletionScore = Math.round(namingTotal * 0.1);
    const sentenceResponseScore =
      namingTotal -
      objectNamingScore -
      wordFluencyScore -
      sentenceCompletionScore;

    const scorePack = calculateKWABScores(
      {
        age: Number(loadPatientProfile()?.age ?? 65),
        educationYears: Number(loadPatientProfile()?.educationYears ?? 6),
      },
      {
        spontaneousSpeech: { contentScore, fluencyScore },
        auditoryComprehension: {
          // Step1을 알아듣기 전체(예/아니오+낱말인지+명령이행)의 대표 점수로 사용
          yesNoScore: Math.round(step1Accuracy * 60),
          wordRecognitionScore: Math.round(step1Accuracy * 60),
          commandScore: Math.round(step1Accuracy * 80),
        },
        repetition: {
          totalScore: Math.max(0, Math.min(100, Math.round(step2AvgPercent))),
        },
        naming: {
          // Step3 정확도를 이름대기/낱말찾기 100점 척도로 환산
          objectNamingScore: Math.max(0, Math.min(60, objectNamingScore)),
          wordFluencyScore: Math.max(0, Math.min(20, wordFluencyScore)),
          sentenceCompletionScore: Math.max(
            0,
            Math.min(10, sentenceCompletionScore),
          ),
          sentenceResponseScore: Math.max(0, Math.min(10, sentenceResponseScore)),
        },
        // Step5/6은 실독증/실서증 파트로 분리: AQ/유형 계산에서 제외
        reading: { totalScore: 0 },
        writing: { totalScore: 0 },
      },
    );

    const classificationBasis = {
      fluency: Number(scorePack.spontaneousSpeech.fluencyScore.toFixed(2)),
      comprehension: Number(
        (scorePack.auditoryComprehension.commandScore / 8).toFixed(2),
      ),
      repetition: Number((scorePack.repetition.totalScore / 10).toFixed(2)),
      naming: Number(
        (
          (scorePack.naming.objectNamingScore +
            scorePack.naming.wordFluencyScore +
            scorePack.naming.sentenceCompletionScore +
            scorePack.naming.sentenceResponseScore) /
          10
        ).toFixed(2),
      ),
    };

    const classificationReason =
      scorePack.aphasiaType === null
        ? "프로젝트 Step 기반 AQ 추정에서 핵심 점수가 정상 범위에 가까워 실어증 없음으로 해석됩니다."
        : String(scorePack.aphasiaType).includes("(추정)")
          ? "원검사 A/B/C/D 분리 채점이 아닌 Step 기반 환산 점수이므로, 가장 가까운 유형을 추정으로 제시합니다."
          : "원검사 분리 채점이 아닌 Step 기반 환산 점수로 유형을 추정했습니다.";

    return {
      spontaneousSpeech: {
        contentScore,
        fluencyScore,
        total: Number((contentScore + fluencyScore).toFixed(2)),
      },
      evidence: spontaneousScores,
      auditoryComprehension: {
        yesNoScore: scorePack.auditoryComprehension.yesNoScore,
        wordRecognitionScore: scorePack.auditoryComprehension.wordRecognitionScore,
        commandScore: scorePack.auditoryComprehension.commandScore,
        total: Number(
          (
            scorePack.auditoryComprehension.yesNoScore +
            scorePack.auditoryComprehension.wordRecognitionScore +
            scorePack.auditoryComprehension.commandScore
          ).toFixed(2),
        ),
      },
      repetition: {
        totalScore: scorePack.repetition.totalScore,
      },
      naming: {
        objectNamingScore: scorePack.naming.objectNamingScore,
        wordFluencyScore: scorePack.naming.wordFluencyScore,
        sentenceCompletionScore: scorePack.naming.sentenceCompletionScore,
        sentenceResponseScore: scorePack.naming.sentenceResponseScore,
        total: Number(
          (
            scorePack.naming.objectNamingScore +
            scorePack.naming.wordFluencyScore +
            scorePack.naming.sentenceCompletionScore +
            scorePack.naming.sentenceResponseScore
          ).toFixed(2),
        ),
      },
      contentScore,
      fluencyScore,
      spontaneousTotal: Number((contentScore + fluencyScore).toFixed(2)),
      aq: Number(scorePack.aq.toFixed(1)),
      lq: Number(scorePack.lq.toFixed(1)),
      cq: Number(scorePack.cq.toFixed(1)),
      aphasiaType: scorePack.aphasiaType,
      classificationBasis,
      classificationReason,
      severity: scorePack.severity,
      percentile: scorePack.percentile,
    };
  }, [place, queryScores, sessionData]);

  const calculatedScores = useMemo(() => {
    const clamp = (value: number, min: number, max: number) =>
      Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0));
    const avg = (values: number[]) =>
      values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const csvFluencyRaw = Number(csvLatest?.fluency_score_avg_0_10 ?? NaN);
    const csvAqRaw = Number(csvLatest?.aq_score_0_100 ?? NaN);

    const step1Items = sessionData?.step1?.items || [];
    const step1Total = step1Items.length || 20;
    const step1Correct = step1Items.length
      ? step1Items.filter((item: any) => item?.isCorrect).length
      : clamp(queryScores[1], 0, 20);
    const step1Raw = clamp(step1Correct, 0, step1Total);
    const step1Percent = clamp((step1Raw / Math.max(1, step1Total)) * 100, 0, 100);

    const step2Items = sessionData?.step2?.items || [];
    const step2Percent = step2Items.length
      ? clamp(
          avg(
            step2Items.map((item: any) =>
              Number(item?.finalScore ?? item?.speechScore ?? 0),
            ),
          ),
          0,
          100,
        )
      : clamp(queryScores[2], 0, 100);

    const step3Items = sessionData?.step3?.items || [];
    const step3Percent = step3Items.length
      ? clamp(
          (step3Items.filter((item: any) => item?.isCorrect).length /
            step3Items.length) *
            100,
          0,
          100,
        )
      : clamp(queryScores[3], 0, 100);

    const step4Items = sessionData?.step4?.items || [];
    const step4Raw = step4Items.length
      ? clamp(
          avg(
            step4Items.map((item: any) => Number(item?.fluencyScore ?? 0)),
          ),
          0,
          10,
        )
      : clamp(queryScores[4], 0, 10);
    const step4RawFromMethod = derivedKwab
      ? clamp(derivedKwab.fluencyScore, 0, 10)
      : Number.isFinite(csvFluencyRaw)
        ? clamp(csvFluencyRaw, 0, 10)
        : step4Raw;
    const step4Percent = clamp(step4RawFromMethod * 10, 0, 100);

    const step5Items = sessionData?.step5?.items || [];
    const step5Percent = step5Items.length
      ? clamp(
          avg(step5Items.map((item: any) => Number(item?.readingScore ?? 0))),
          0,
          100,
        )
      : clamp(queryScores[5], 0, 100);

    const step6Items = sessionData?.step6?.items || [];
    const step6Total = 5;
    const step6Raw = step6Items.length
      ? clamp(step6Items.filter((item: any) => item?.isCorrect !== false).length, 0, step6Total)
      : clamp(queryScores[6], 0, step6Total);
    const step6Percent = clamp((step6Raw / step6Total) * 100, 0, 100);

    return {
      1: { raw: step1Raw, max: step1Total, percent: step1Percent },
      2: { raw: step2Percent, max: 100, percent: step2Percent },
      3: { raw: step3Percent, max: 100, percent: step3Percent },
      4: { raw: step4RawFromMethod, max: 10, percent: step4Percent },
      5: { raw: step5Percent, max: 100, percent: step5Percent },
      6: { raw: step6Raw, max: step6Total, percent: step6Percent },
      aq: derivedKwab
        ? clamp(derivedKwab.aq, 0, 100)
        : Number.isFinite(csvAqRaw)
          ? clamp(csvAqRaw, 0, 100)
          : null,
    } as const;
  }, [csvLatest, derivedKwab, queryScores, sessionData]);

  const stepDetails = useMemo(
    () => [
      {
        id: 1,
        title: "청각 이해",
        score: calculatedScores[1].raw,
        max: calculatedScores[1].max,
        percent: calculatedScores[1].percent,
        display: `${Math.round(calculatedScores[1].raw)}/${calculatedScores[1].max}`,
      },
      {
        id: 2,
        title: "따라말하기",
        score: calculatedScores[2].raw,
        max: 100,
        percent: calculatedScores[2].percent,
        display: `${Math.round(calculatedScores[2].percent)}%`,
      },
      {
        id: 3,
        title: "단어-그림 매칭",
        score: calculatedScores[3].raw,
        max: 100,
        percent: calculatedScores[3].percent,
        display: `${Math.round(calculatedScores[3].percent)}%`,
      },
      {
        id: 4,
        title: "유창성 (K-WAB)",
        score: calculatedScores[4].raw,
        max: 10,
        percent: calculatedScores[4].percent,
        display: `${calculatedScores[4].raw.toFixed(1)}/10`,
      },
      {
        id: 5,
        title: "읽기 능력",
        score: calculatedScores[5].raw,
        max: 100,
        percent: calculatedScores[5].percent,
        display: `${Math.round(calculatedScores[5].percent)}%`,
      },
      {
        id: 6,
        title: "쓰기 능력",
        score: calculatedScores[6].raw,
        max: calculatedScores[6].max,
        percent: calculatedScores[6].percent,
        display: `${Math.round(calculatedScores[6].percent)}%`,
      },
    ],
    [calculatedScores],
  );

  // src/app/result/page.tsx (useEffect 수정)

  useEffect(() => {
    setIsMounted(true);

    try {
      // ✅ 데이터 로드 전 100ms 대기 (비동기 저장 여유 시간)
      setTimeout(() => {
        const backups = {
          step1: JSON.parse(localStorage.getItem("step1_data") || "[]"),
          step2: JSON.parse(
            localStorage.getItem("step2_recorded_audios") || "[]",
          ),
          step3: JSON.parse(localStorage.getItem("step3_data") || "[]"),
          step4: JSON.parse(
            localStorage.getItem("step4_recorded_audios") || "[]",
          ),
          step5: JSON.parse(
            localStorage.getItem("step5_recorded_data") || "[]",
          ),
          step6: JSON.parse(
            localStorage.getItem("step6_recorded_data") || "[]",
          ),
        };

        console.log("📊 [LOAD] Step 1:", backups.step1.length);
        console.log("📊 [LOAD] Step 2:", backups.step2.length);
        console.log("📊 [LOAD] Step 3:", backups.step3.length);
        console.log("📊 [LOAD] Step 4:", backups.step4.length);
        console.log("📊 [LOAD] Step 5:", backups.step5.length);
        console.log("📊 [LOAD] Step 6:", backups.step6.length);

        setSessionData({
          step1: { items: backups.step1 },
          step2: { items: backups.step2 },
          step3: { items: backups.step3 },
          step4: { items: backups.step4 },
          step5: { items: backups.step5 },
          step6: { items: backups.step6 },
        });
      }, 100);
    } catch (e) {
      console.error("❌ Data Load Error:", e);
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadCsvResult() {
      try {
        const res = await fetch("/api/kwab/final-result", {
          cache: "no-store",
        });
        const json = await res.json();
        if (!cancelled && json?.ok && json?.latest) {
          setCsvLatest(json.latest as FinalResultCsvRow);
        }
      } catch {
        // CSV 연결 실패 시 기존 계산값을 그대로 사용합니다.
      }
    }

    loadCsvResult();
    return () => {
      cancelled = true;
    };
  }, []);

  const playAudio = (audioUrl: string, id: string) => {
    if (playingIndex === id && audioStatus === "playing") {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingIndex(null);
      setAudioStatus("idle");
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setPlayingIndex(id);
    setAudioStatus("loading");
    audio.onplaying = () => setAudioStatus("playing");
    audio.onended = () => {
      setPlayingIndex(null);
      setAudioStatus("idle");
    };
    audio.onpause = () => {
      if (!audio.ended) {
        setPlayingIndex(null);
        setAudioStatus("idle");
      }
    };
    audio.play().catch(() => {
      setPlayingIndex(null);
      setAudioStatus("idle");
    });
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  const handleExportData = () => {
    if (!sessionData) return;

    const patient = loadPatientProfile();
    const now = new Date();
    const testDateTime = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    const safeToken = (v: string) =>
      v.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "");

    const rawBirthDate =
      (patient as any)?.birthDate ||
      (patient as any)?.birthdate ||
      (patient as any)?.dob ||
      "";
    const birthDate = rawBirthDate
      ? String(rawBirthDate).replace(/[^\d]/g, "")
      : "unknown";
    const patientName = safeToken(patient?.name || "patient");

    const exportPayload = {
      exportedAt: now.toISOString(),
      patient,
      summaryScores: {
        step1Raw: calculatedScores[1].raw,
        step1Percent: calculatedScores[1].percent,
        step2Raw: calculatedScores[2].raw,
        step2Percent: calculatedScores[2].percent,
        step3Raw: calculatedScores[3].raw,
        step3Percent: calculatedScores[3].percent,
        step4Raw: calculatedScores[4].raw,
        step4Percent: calculatedScores[4].percent,
        step5Raw: calculatedScores[5].raw,
        step5Percent: calculatedScores[5].percent,
        step6Raw: calculatedScores[6].raw,
        step6Percent: calculatedScores[6].percent,
        aqScore: calculatedScores.aq,
        aqSdBand: csvLatest?.aq_sd_band ?? null,
        kwabDerived: derivedKwab,
        aphasiaType: derivedKwab?.aphasiaType ?? null,
      },
      details: sessionData,
    };

    const files: ExportFile[] = [
      {
        name: "scores.json",
        data: new TextEncoder().encode(JSON.stringify(exportPayload, null, 2)),
      },
    ];

    const stepEntries = [
      { key: "step2", items: sessionData.step2?.items || [] },
      { key: "step4", items: sessionData.step4?.items || [] },
      { key: "step5", items: sessionData.step5?.items || [] },
    ];

    stepEntries.forEach((step) => {
      (step.items as any[]).forEach((item, idx) => {
        const audioUrl = item?.audioUrl;
        if (typeof audioUrl !== "string" || !audioUrl.startsWith("data:")) return;
        const { bytes, mime } = dataUrlToBytes(audioUrl);
        if (!bytes.length) return;
        const ext = extensionFromMime(mime);
        files.push({
          name: `audio/${step.key}_${idx + 1}.${ext}`,
          data: bytes,
        });
      });
    });

    const step6Items = (sessionData.step6?.items || []) as any[];
    step6Items.forEach((item, idx) => {
      const imageUrl = item?.userImage;
      if (typeof imageUrl !== "string" || !imageUrl.startsWith("data:")) return;
      const { bytes, mime } = dataUrlToBytes(imageUrl);
      if (!bytes.length) return;
      const ext = extensionFromMime(mime);
      files.push({
        name: `images/step6_${idx + 1}.${ext}`,
        data: bytes,
      });
    });

    const zipBlob = createZipBlob(files);
    const url = URL.createObjectURL(zipBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${patientName}-${birthDate}-${testDateTime}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const chartPoints = useMemo(() => {
    const values = [
      calculatedScores[4].percent,
      calculatedScores[1].percent,
      calculatedScores[2].percent,
      calculatedScores[3].percent,
      calculatedScores[5].percent,
      calculatedScores[6].percent,
    ];
    return values
      .map((val, i) => {
        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        const r = (Math.min(val, 100) / 100) * 75;
        return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`;
      })
      .join(" ");
  }, [calculatedScores]);

  if (!isMounted || !sessionData) return null;

  return (
    <div className="min-h-screen bg-[#FDFCFB] p-4 md:p-8 text-[#4A2C2A]">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 헤더 (AQ 계산 포함) */}
        <header className="bg-white rounded-[32px] p-8 shadow-sm border border-orange-100 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-[#4A2C2A]">
              종합 언어 재활 리포트
            </h1>
            <p className="text-xs text-orange-300 font-bold uppercase tracking-widest mt-1">
              Report Generated
            </p>
          </div>
          <div className="text-orange-500 font-black text-3xl">
            AQ{" "}
            {(
              calculatedScores.aq ??
              (calculatedScores[4].percent * 0.2 +
                calculatedScores[1].percent * 0.1 +
                calculatedScores[2].percent * 0.1 +
                calculatedScores[3].percent * 0.1) *
                2
            ).toFixed(1)}
            {derivedKwab ? (
              <p className="text-[10px] text-orange-400 font-bold mt-1 text-right leading-tight">
                내용 {derivedKwab.contentScore.toFixed(1)} / 유창성 {derivedKwab.fluencyScore.toFixed(1)} / 자발화 {derivedKwab.spontaneousTotal.toFixed(1)}
                <br />
                {derivedKwab.aphasiaType || "실어증 없음"} · {derivedKwab.severity} · 백분위 {derivedKwab.percentile}%
              </p>
            ) : null}
            {csvLatest?.aq_sd_band ? (
              <p className="text-[10px] text-orange-400 font-bold mt-1 text-right">
                {csvLatest.aq_sd_band}
              </p>
            ) : null}
          </div>
        </header>

        {/* 01. 역량 프로파일 차트 */}
        <section className="bg-white rounded-[40px] p-8 shadow-sm border border-orange-50">
          {/* ... (차트 렌더링 코드 유지) ... */}
          <div className="flex flex-col md:flex-row items-center justify-around gap-10">
            <div className="w-52 h-52 relative">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {[0.25, 0.5, 0.75, 1].map((st) => (
                  <polygon
                    key={st}
                    points={stepDetails
                      .map((_, i) => {
                        const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                        return `${100 + 75 * st * Math.cos(a)},${100 + 75 * st * Math.sin(a)}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="#FEE2E2"
                    strokeWidth="1"
                  />
                ))}
                <polygon
                  points={chartPoints}
                  fill="rgba(249, 115, 22, 0.1)"
                  stroke="#F97316"
                  strokeWidth="3"
                />
              </svg>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {stepDetails.map((d) => (
                <div key={d.id} className="border-l-2 border-orange-100 pl-3">
                  <p className="text-[10px] text-gray-400 font-black uppercase">
                    {d.title}
                  </p>
                  <p className="text-lg font-black text-slate-700">{d.display}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {derivedKwab && (
          <section className="bg-white rounded-[40px] p-8 shadow-sm border border-orange-50">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-orange-400 font-black text-lg">02</span>
              <h2 className="font-bold text-gray-700">K-WAB 점수요약표</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-orange-100 p-4 bg-orange-50/30">
                <p className="text-[11px] font-black text-orange-500 uppercase mb-2">
                  스스로 말하기 (0-20)
                </p>
                <p className="text-sm font-bold text-slate-700">
                  내용전달 {derivedKwab.spontaneousSpeech.contentScore.toFixed(1)} / 유창성 {derivedKwab.spontaneousSpeech.fluencyScore.toFixed(1)}
                </p>
                <p className="text-xl font-black text-slate-800 mt-1">
                  {derivedKwab.spontaneousSpeech.total.toFixed(1)} / 20
                </p>
              </div>

              <div className="rounded-2xl border border-orange-100 p-4 bg-orange-50/30">
                <p className="text-[11px] font-black text-orange-500 uppercase mb-2">
                  알아듣기 (0-200)
                </p>
                <p className="text-sm font-bold text-slate-700">
                  예/아니오 {Math.round(derivedKwab.auditoryComprehension.yesNoScore)} + 낱말인지 {Math.round(derivedKwab.auditoryComprehension.wordRecognitionScore)} + 명령이행 {Math.round(derivedKwab.auditoryComprehension.commandScore)}
                </p>
                <p className="text-xl font-black text-slate-800 mt-1">
                  {Math.round(derivedKwab.auditoryComprehension.total)} / 200
                </p>
              </div>

              <div className="rounded-2xl border border-orange-100 p-4 bg-orange-50/30">
                <p className="text-[11px] font-black text-orange-500 uppercase mb-2">
                  따라말하기 (0-100)
                </p>
                <p className="text-xl font-black text-slate-800">
                  {Math.round(derivedKwab.repetition.totalScore)} / 100
                </p>
              </div>

              <div className="rounded-2xl border border-orange-100 p-4 bg-orange-50/30">
                <p className="text-[11px] font-black text-orange-500 uppercase mb-2">
                  이름대기 및 낱말찾기 (0-100)
                </p>
                <p className="text-xl font-black text-slate-800 mt-1">
                  {Math.round(derivedKwab.naming.total)} / 100
                </p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">
                  A/B/C/D 분리 채점 아님 (프로젝트 환산)
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-100 p-4 bg-slate-50">
              <p className="text-[11px] font-black text-slate-500 uppercase mb-2">
                지수 요약
              </p>
              <p className="text-sm font-bold text-slate-700">
                AQ {derivedKwab.aq.toFixed(1)}
              </p>
              <p className="text-[11px] text-slate-500 font-bold mt-1">
                AQ = (스스로말하기 {derivedKwab.spontaneousSpeech.total.toFixed(1)} + 알아듣기 {Math.round(derivedKwab.auditoryComprehension.total)} + 따라말하기 {Math.round(derivedKwab.repetition.totalScore)} + 이름대기 {Math.round(derivedKwab.naming.total)}) / 4.2
              </p>
              <p className="text-[11px] text-slate-500 font-bold mt-1">
                LQ/CQ는 Step5/6 제외 설정으로 현재 판정에서 사용하지 않습니다.
              </p>
              <p className="text-[11px] text-slate-500 font-bold mt-1">
                AQ/유형 계산 반영: Step4(스스로말하기), Step1(알아듣기), Step2(따라말하기), Step3(이름대기 및 낱말찾기)
              </p>
              <p className="text-sm font-black text-orange-600 mt-1">
                실어증 유형(프로젝트 추정): {derivedKwab.aphasiaType || "실어증 없음"} ({derivedKwab.severity})
              </p>
              <div className="mt-3 rounded-xl border border-orange-100 bg-white p-3">
                <p className="text-[11px] font-black text-orange-500 uppercase mb-1">
                  유형 판별 근거 점수 (0~10)
                </p>
                <p className="text-xs font-bold text-slate-700">
                  유창성 {derivedKwab.classificationBasis.fluency.toFixed(1)} / 이해 {derivedKwab.classificationBasis.comprehension.toFixed(1)} / 따라말하기 {derivedKwab.classificationBasis.repetition.toFixed(1)} / 이름대기 {derivedKwab.classificationBasis.naming.toFixed(1)}
                </p>
                <p className="text-[11px] text-slate-500 font-bold mt-1 leading-relaxed">
                  {derivedKwab.classificationReason}
                </p>
              </div>

            </div>
          </section>
        )}

        {/* 03. 단계별 상세 기록 (데이터 출력 핵심부) */}
        <section className="bg-white rounded-[40px] p-8 shadow-sm border border-orange-50">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-orange-400 font-black text-lg">03</span>
            <h2 className="font-bold text-gray-700">단계별 상세 기록</h2>
          </div>

          <div className="space-y-4">
            {stepDetails.map((step) => {
              const isOpen = expandedSteps.includes(step.id);
              const items = sessionData[`step${step.id}`]?.items || [];

              return (
                <div
                  key={step.id}
                  className="border border-orange-50 rounded-2xl overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedSteps((prev) =>
                        prev.includes(step.id)
                          ? prev.filter((i) => i !== step.id)
                          : [...prev, step.id],
                      )
                    }
                    className="w-full flex justify-between items-center p-5 bg-white hover:bg-orange-50/10"
                  >
                    <span className="font-black text-sm text-slate-600">
                      {step.title}{" "}
                      <span className="text-orange-400 ml-1">
                        ({items.length})
                      </span>
                    </span>
                    <span>{isOpen ? "▲" : "▼"}</span>
                  </button>

                  {isOpen && (
                    <div className="p-6 bg-white border-t border-orange-50 space-y-4">
                      {items.length === 0 ? (
                        <p className="text-center text-xs text-gray-300 py-4 font-bold">
                          기록된 데이터가 없습니다.
                        </p>
                      ) : step.id === 6 ? (
                        /* Step 6: 쓰기 이미지 전용 레이아웃 */
                        <div className="grid grid-cols-2 gap-4">
                          {items.map((item: any, idx: number) => (
                            <div
                              key={idx}
                              className="bg-[#FBFBFC] rounded-2xl p-4 border border-slate-100 text-center"
                            >
                              <p className="text-[10px] font-black text-orange-400 mb-2 uppercase">
                                단어: {item.text || item.word}
                              </p>
                              <div className="bg-white rounded-xl aspect-square flex items-center justify-center border border-slate-100">
                                {item.userImage ? (
                                  <img
                                    src={item.userImage}
                                    alt="writing"
                                    className="max-w-full max-h-full object-contain p-2"
                                  />
                                ) : (
                                  "NO IMAGE"
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* 기타 Step: 리스트 레이아웃 */
                        items.map((item: any, i: number) => (
                          <div
                            key={i}
                            className="flex justify-between items-center p-4 bg-[#FBFBFC] rounded-xl border border-slate-50"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-600 break-words">
                                "
                                {item.text ||
                                  item.question ||
                                  item.targetText ||
                                  item.targetWord ||
                                  "기록 없음"}
                                "
                              </p>
                              {step.id === 5 &&
                                typeof item.totalTime === "number" &&
                                typeof item.wordsPerMinute === "number" && (
                                  <p className="text-[11px] text-slate-400 font-bold mt-1">
                                    읽기 시간 {item.totalTime}s / 속도 {item.wordsPerMinute} WPM
                                  </p>
                                )}
                            </div>
                            <div className="flex gap-2">
                              {(() => {
                                const audioId = `s${step.id}-${i}`;
                                const hasAudio =
                                  typeof item.audioUrl === "string" &&
                                  item.audioUrl.length > 0;
                                const isLoading =
                                  playingIndex === audioId &&
                                  audioStatus === "loading";
                                const isPlaying =
                                  playingIndex === audioId &&
                                  audioStatus === "playing";
                                return (
                                  <button
                                    onClick={() =>
                                      hasAudio ? playAudio(item.audioUrl, audioId) : null
                                    }
                                    disabled={!hasAudio}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black transition-colors ${
                                      !hasAudio
                                        ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                                        : isPlaying
                                          ? "bg-orange-500 text-white"
                                          : "bg-orange-100 text-orange-500"
                                    }`}
                                    title={
                                      !hasAudio
                                        ? "녹음 데이터 없음"
                                        : isPlaying
                                          ? "재생 중 (클릭 시 정지)"
                                          : "음성 재생"
                                    }
                                  >
                                    {!hasAudio ? "–" : isLoading ? "…" : isPlaying ? "■" : "▶"}
                                  </button>
                                );
                              })()}
                              <span
                                className={`text-[10px] font-black px-2 py-1 rounded-md ${item.isCorrect ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-400"}`}
                              >
                                {item.isCorrect ? "CORRECT" : "WRONG"}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 하단 버튼 영역 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-12">
          <button
            onClick={handleExportData}
            className="py-5 bg-orange-500 text-white rounded-[24px] font-black"
          >
            데이터 저장하기
          </button>
          <button
            onClick={() => window.print()}
            className="py-5 bg-slate-900 text-white rounded-[24px] font-black"
          >
            리포트 PDF 저장
          </button>
          <button
            onClick={() => router.push("/")}
            className="py-5 bg-white text-slate-400 border border-slate-200 rounded-[24px] font-black"
          >
            처음으로
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div>LOADING...</div>}>
      <ResultContent />
    </Suspense>
  );
}
