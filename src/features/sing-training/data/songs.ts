import { LyricLine, SongKey, SongMeta } from "@/features/sing-training/types";

export const SING_TRAINING_CATALOG_VERSION = "sing-catalog-2026-03-12";
export const SING_TRAINING_ANALYSIS_VERSION = "brain-sing-sim-v1";

const COMMON_GOVERNANCE: SongMeta["governance"] = {
  catalogVersion: SING_TRAINING_CATALOG_VERSION,
  analysisVersion: SING_TRAINING_ANALYSIS_VERSION,
  requirementIds: [
    "SING-REQ-001",
    "SING-REQ-IO-001",
    "SING-REQ-VV-001",
    "SING-REQ-FAIL-001",
  ],
  intendedUse:
    "30초 내외 노래 훈련 세션에서 음원/가사 타임라인을 고정하고 발성·안면 반응 지표를 일관되게 산출하기 위한 내부 카탈로그 정의",
  inputs: [
    "선택된 곡 식별자",
    "고정된 음원 파일 경로",
    "가사 라인 및 음절 단위 cue 타임라인",
    "카메라/마이크 권한 상태",
  ],
  outputs: [
    "곡별 훈련 화면 구성",
    "실시간 가사 표시 기준",
    "세션 결과에 포함되는 곡/버전 메타데이터",
  ],
  failureModes: [
    "존재하지 않는 곡 key 요청",
    "오디오 메타데이터 로드 실패",
    "카메라 또는 마이크 권한 거부",
    "세션 결과 저장 직렬화 실패",
  ],
};

function buildEvenCues(txt: string, d: number) {
  const chars = Array.from(txt);
  const step = chars.length > 0 ? d / chars.length : d;

  return chars.map((char, index) => ({
    syllable: char,
    start: Number((index * step).toFixed(2)),
    end: Number(((index + 1) * step).toFixed(2)),
  }));
}

function lyricLine(t: number, d: number, txt: string): LyricLine {
  return {
    t,
    d,
    txt,
    cues: buildEvenCues(txt, d),
  };
}

export const SONGS: Record<SongKey, SongMeta> = {
  나비야: {
    level: "Level 1",
    subtitle: "가장 쉬운 발성 진입과 호흡 연결",
    accentClass: "from-emerald-500/45 to-emerald-800/70",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-100",
    audioSrc: "/audio/sing-training/nabiya.mp3",
    durationSec: 24.41,
    selection: {
      description:
        "짧고 익숙한 멜로디로 가장 부담 없이 호흡 시작과 발성 진입을 확인합니다.",
      imagePath: "/images/mode/sing-card.png",
      imagePosition: "18% 18%",
      overlayStyle:
        "linear-gradient(135deg, rgba(236, 253, 245, 0.32) 0%, rgba(52, 211, 153, 0.22) 100%)",
      badgeStyle: "linear-gradient(90deg, #6EE7B7 0%, #34D399 100%)",
      startLabelStyle: "text-emerald-200/95",
    },
    governance: COMMON_GOVERNANCE,
    lyrics: [
      lyricLine(0, 3.38, "나비야 나비야"),
      lyricLine(3.38, 2.8, "이리 날아 오너라"),
      lyricLine(6.17, 3.18, "호랑나비 흰나비"),
      lyricLine(9.35, 3.08, "춤을 추며 오너라"),
      lyricLine(12.43, 3.04, "봄바람에 꽃잎도"),
      lyricLine(15.46, 3.09, "방긋 방긋 웃으며"),
      lyricLine(18.55, 3.1, "참새도 짹 짹 짹"),
      lyricLine(21.65, 2.76, "노래하며 춤춘다"),
    ],
  },
  "둥글게 둥글게": {
    level: "Level 3",
    subtitle: "빠른 반복 리듬과 연속 조음 유지",
    accentClass: "from-emerald-500/45 to-emerald-800/70",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-100",
    audioSrc: "/audio/sing-training/dunggeulge.mp3",
    durationSec: 30.91,
    selection: {
      description:
        "빠른 반복 리듬과 연속 조음이 많아 환자 기준으로 부담이 큰 편입니다.",
      imagePath: "/images/mode/sing-card.png",
      imagePosition: "14% 26%",
      overlayStyle:
        "linear-gradient(135deg, rgba(250, 245, 255, 0.34) 0%, rgba(192, 132, 252, 0.22) 100%)",
      badgeStyle: "linear-gradient(90deg, #F9A8D4 0%, #F472B6 100%)",
      startLabelStyle: "text-fuchsia-200/95",
    },
    governance: COMMON_GOVERNANCE,
    lyrics: [
      lyricLine(0, 2.03, "둥글게 둥글게"),
      lyricLine(2.03, 1.92, "둥글게 둥글게"),
      lyricLine(3.95, 2.28, "빙글빙글 돌아가며"),
      lyricLine(6.22, 1.56, "춤을 춥시다"),
      lyricLine(7.78, 1.9, "손뼉을 치면서"),
      lyricLine(9.68, 1.9, "노래를 부르며"),
      lyricLine(11.58, 1.28, "랄라 랄라"),
      lyricLine(12.86, 2.69, "즐거웁게 춤추자"),
      lyricLine(15.55, 2.08, "링가 링가 링가"),
      lyricLine(17.64, 1.79, "링가 링가링"),
      lyricLine(19.42, 2.02, "링가 링가 링가"),
      lyricLine(21.44, 1.88, "링가 링가링"),
      lyricLine(23.32, 1.99, "손에 손을 잡고"),
      lyricLine(25.31, 1.87, "모두 다함께"),
      lyricLine(27.18, 3.73, "즐거웁게 뛰어 봅시다"),
    ],
  },
  아리랑: {
    level: "Level 2",
    subtitle: "긴 호흡 유지와 느린 유창성 조절",
    accentClass: "from-teal-500/40 to-emerald-900/70",
    badgeClass: "bg-teal-50 text-teal-700 border-teal-100",
    audioSrc: "/audio/sing-training/arirang.mp3",
    durationSec: 37.73,
    selection: {
      description:
        "느린 흐름에 맞춰 호흡 길이와 발화 유창성을 비교적 안정적으로 점검합니다.",
      imagePath: "/images/mode/sing-card.png",
      imagePosition: "16% 22%",
      overlayStyle:
        "linear-gradient(135deg, rgba(239, 246, 255, 0.32) 0%, rgba(96, 165, 250, 0.22) 100%)",
      badgeStyle: "linear-gradient(90deg, #93C5FD 0%, #60A5FA 100%)",
      startLabelStyle: "text-sky-200/95",
    },
    governance: COMMON_GOVERNANCE,
    lyrics: [
      lyricLine(0, 4.78, "아리랑~ 아리랑~"),
      lyricLine(4.78, 4.67, "아라~리~요~~~"),
      lyricLine(9.45, 4.8, "아리랑~ 고~개~를~"),
      lyricLine(14.25, 4.75, "넘어간다"),
      lyricLine(19.01, 4.75, "나를 버리고 "),
      lyricLine(23.76, 4.75, "가시는 님~은~~~"),
      lyricLine(28.51, 4.65, "십리도~ 못~가~서~"),
      lyricLine(33.16, 4.57, "발병난다"),
    ],
  },
  "도라지 타령": {
    level: "Level 3",
    subtitle: "빠른 장단 반응과 명료한 조음",
    accentClass: "from-emerald-400/45 to-cyan-900/70",
    badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-100",
    audioSrc: "/audio/sing-training/doraji.mp3",
    durationSec: 47.9,
    lyricLeadOffsetSec: 0,
    selection: {
      description:
        "빠른 장단 반응과 발음 명료도를 함께 요구하는 고난도 곡입니다.",
      imagePath: "/images/mode/sing-card.png",
      imagePosition: "12% 30%",
      overlayStyle:
        "linear-gradient(135deg, rgba(250, 245, 255, 0.34) 0%, rgba(192, 132, 252, 0.22) 100%)",
      badgeStyle: "linear-gradient(90deg, #F9A8D4 0%, #F472B6 100%)",
      startLabelStyle: "text-fuchsia-200/95",
    },
    governance: COMMON_GOVERNANCE,
    lyrics: [
      lyricLine(0, 3.83, "도라지 도라지~"),
      lyricLine(3.83, 3.27, "백도~ 라~ 지"),
      lyricLine(7.09, 3.58, "심~ 심 산~ 천~ 에~"),
      lyricLine(10.68, 3.09, "백도라지"),
      lyricLine(13.76, 3.7, "한두 뿌리만~"),
      lyricLine(17.46, 3.09, "캐어~ 도~"),
      lyricLine(20.55, 1.52, "대바구니로"),
      lyricLine(22.07, 5.12, "처리철~ 철~ 넘는구나"),
      lyricLine(27.2, 1.6, "에~ 헤~ 요~"),
      lyricLine(28.8, 1.9, "데~ 헤~ 요~"),
      lyricLine(30.7, 3.75, "에헤~ 요~"),
      lyricLine(34.45, 2.88, "어여라 난다~"),
      lyricLine(37.32, 3.5, "지화자자 좋~ 다"),
      lyricLine(40.82, 1.63, "네가 내 간장을"),
      lyricLine(42.46, 2.01, "스리살~ 살~"),
      lyricLine(44.47, 0.8, "다 녹인다"),
    ],
  },
  군밤타령: {
    level: "Level 2",
    subtitle: "박자 전환과 짧은 문장 지속 발성",
    accentClass: "from-emerald-400/45 to-slate-900/70",
    badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
    audioSrc: "/audio/sing-training/gunbam.mp3",
    durationSec: 29.64,
    selection: {
      description:
        "짧은 문장과 박자 전환 구간에서 호흡 조절과 발화 지속성을 평가합니다.",
      imagePath: "/images/mode/sing-card.png",
      imagePosition: "10% 20%",
      overlayStyle:
        "linear-gradient(135deg, rgba(239, 246, 255, 0.32) 0%, rgba(96, 165, 250, 0.22) 100%)",
      badgeStyle: "linear-gradient(90deg, #93C5FD 0%, #60A5FA 100%)",
      startLabelStyle: "text-sky-200/95",
    },
    governance: COMMON_GOVERNANCE,
    lyrics: [
      lyricLine(0, 2.46, "바람이 분다"),
      lyricLine(2.46, 1.68, "바람이 불어"),
      lyricLine(4.14, 2.42, "연평바~다에"),
      lyricLine(6.56, 1.96, "어~헐싸 돈바람 분다"),
      lyricLine(8.53, 1.1, "얼싸좋네"),
      lyricLine(9.63, 2.1, "아 좋네 군밤이여"),
      lyricLine(11.73, 2.46, "에라 생률밤이로구나"),
      lyricLine(14.19, 4.01, "너는~ 처녀 나는~ 총각"),
      lyricLine(18.2, 2.38, "처녀 총~각이"),
      lyricLine(20.57, 1.99, "어~헐싸 막놀아난다"),
      lyricLine(22.57, 1, "얼싸좋네"),
      lyricLine(23.57, 2.18, "아 좋네 군밤이여"),
      lyricLine(25.75, 0.8, "에라 생률밤이로구나"),
    ],
  },
  "밀양 아리랑": {
    level: "Level 3",
    subtitle: "고난도 박자 변화와 호흡 반응",
    accentClass: "from-emerald-400/45 to-emerald-950/75",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-100",
    audioSrc: "/audio/sing-training/miryang-arirang.mp3",
    durationSec: 36.53,
    selection: {
      description:
        "긴 흐름과 큰 박자 변화가 있어 가장 난도가 높은 축에 속합니다.",
      imagePath: "/images/mode/sing-card.png",
      imagePosition: "8% 28%",
      overlayStyle:
        "linear-gradient(135deg, rgba(250, 245, 255, 0.34) 0%, rgba(192, 132, 252, 0.22) 100%)",
      badgeStyle: "linear-gradient(90deg, #F9A8D4 0%, #F472B6 100%)",
      startLabelStyle: "text-fuchsia-200/95",
    },
    governance: COMMON_GOVERNANCE,
    lyrics: [
      lyricLine(0, 1.32, "날좀 보~~소"),
      lyricLine(1.32, 1.64, "날좀 보~~소"),
      lyricLine(2.96, 3.34, "남좀~~ 보~~ 소~~"),
      lyricLine(6.3, 1.56, "동지섣~달~"),
      lyricLine(7.86, 2.32, "꽃본듯~이~"),
      lyricLine(10.18, 2.35, "날좀~~보~소"),
      lyricLine(12.52, 1.3, "아리 아리랑"),
      lyricLine(13.82, 1.77, "쓰리 쓰리랑"),
      lyricLine(15.59, 2.97, "아라리~가 났~~네~~~"),
      lyricLine(18.56, 3.16, "아리~랑~ 고개~로~"),
      lyricLine(21.72, 2.81, "날 넘~겨 주~소"),
      lyricLine(24.53, 3.46, "정든 님~~이 오시는~~데"),
      lyricLine(27.99, 2.78, "인사~를 못~~해~~~"),
      lyricLine(30.77, 3.41, "행주 치~마~ 입에 물~고~"),
      lyricLine(34.19, 0.8, "입만~~ 방~긋"),
    ],
  },
};

export const SONG_KEYS = Object.keys(SONGS) as SongKey[];
