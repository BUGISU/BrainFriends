// src/constants/visualTrainingData.ts

import { PlaceType } from "./trainingData";

type VisualSeed = {
  label: string;
  emoji: string;
};

type VisualQuestion = {
  id: number;
  targetWord: string;
  options: Array<{
    id: string;
    label: string;
    emoji: string;
  }>;
  answerId: string;
};

const OPTION_IDS = ["a", "b", "c", "d", "e", "f"] as const;

// 1. 최적화된 시드 데이터 (문서 Step 3 데이터 100% 반영)
const PLACE_SEEDS: Record<PlaceType, VisualSeed[]> = {
  home: [
    { label: "신문", emoji: "📰" },
    { label: "빗", emoji: "🪮" },
    { label: "전화기", emoji: "☎️" },
    { label: "시계", emoji: "⏰" },
    { label: "달력", emoji: "📅" },
    { label: "액자", emoji: "🖼️" },
    { label: "리모컨", emoji: "🎮" },
    { label: "안경", emoji: "👓" },
  ],
  hospital: [
    { label: "붕대", emoji: "🩹" },
    { label: "주사기", emoji: "💉" },
    { label: "반창고", emoji: "🩹" },
    { label: "실내화", emoji: "👟" },
    { label: "리모컨", emoji: "🎮" },
    { label: "옷걸이", emoji: " hanger" },
    { label: "휠체어", emoji: "🦽" },
    { label: "청진기", emoji: "🩺" },
  ],
  cafe: [
    { label: "커피", emoji: "☕" },
    { label: "빨대", emoji: "🥤" },
    { label: "진동벨", emoji: "🔔" },
    { label: "컵받침", emoji: "🍵" },
    { label: "머그컵", emoji: "🥛" },
    { label: "케이크", emoji: "🍰" },
    { label: "포크", emoji: "🍴" },
    { label: "메뉴판", emoji: "📜" },
  ],
  bank: [
    { label: "통장", emoji: "📕" },
    { label: "도장", emoji: "💮" },
    { label: "신분증", emoji: "🆔" },
    { label: "카드", emoji: "💳" },
    { label: "번호표", emoji: "🎫" },
    { label: "계산기", emoji: "🧮" },
    { label: "지폐", emoji: "💵" },
    { label: "동전", emoji: "🪙" },
  ],
  park: [
    { label: "나무", emoji: "🌳" },
    { label: "꽃", emoji: "🌸" },
    { label: "벤치", emoji: "🪵" },
    { label: "자전거", emoji: "🚲" },
    { label: "분수대", emoji: " fountains" },
    { label: "나비", emoji: "🦋" },
    { label: "연", emoji: "🪁" },
    { label: "해", emoji: "☀️" },
  ],
  mart: [
    { label: "사과", emoji: "🍎" },
    { label: "카트", emoji: "🛒" },
    { label: "우유", emoji: "🥛" },
    { label: "당근", emoji: "🥕" },
    { label: "바나나", emoji: "🍌" },
    { label: "계란", emoji: "🥚" },
    { label: "지갑", emoji: "👛" },
    { label: "영수증", emoji: "🧾" },
  ],
};

// 2. 이미지 파일명 매핑 (영문 ID) - 논리적 오류 전면 수정
export const VISUAL_MATCHING_IMAGE_FILENAME_MAP: Record<
  PlaceType,
  Record<string, string>
> = {
  home: {
    신문: "newspaper",
    빗: "comb",
    전화기: "telephone",
    시계: "clock",
    달력: "calendar",
    액자: "frame",
    리모컨: "remote-control",
    안경: "glasses",
  },
  hospital: {
    붕대: "bandage",
    주사기: "syringe",
    반창고: "plaster",
    실내화: "slipper",
    리모컨: "remote-control",
    옷걸이: "hanger",
    휠체어: "wheelchair",
    청진기: "stethoscope",
  },
  cafe: {
    커피: "coffee",
    빨대: "straw",
    진동벨: "pager",
    컵받침: "coaster",
    머그컵: "mug",
    케이크: "cake",
    포크: "fork",
    메뉴판: "menu",
  },
  bank: {
    통장: "passbook",
    도장: "stamp",
    신분증: "id-card",
    카드: "card",
    번호표: "number-ticket",
    계산기: "calculator",
    지폐: "money",
    동전: "coin",
  },
  park: {
    나무: "tree",
    꽃: "flower",
    벤치: "bench",
    자전거: "bicycle",
    분수대: "fountain",
    나비: "butterfly",
    연: "kite",
    해: "sun",
  },
  mart: {
    사과: "apple",
    카트: "cart",
    우유: "milk",
    당근: "carrot",
    바나나: "banana",
    계란: "egg",
    지갑: "wallet",
    영수증: "receipt",
  },
};

export const VISUAL_MATCHING_RECOMMENDED_COUNT = 6;

const createQuestionSet = (seeds: VisualSeed[]): VisualQuestion[] => {
  return seeds.map((seed, index) => {
    const answerId = OPTION_IDS[0];
    const candidates = seeds.filter((item) => item.label !== seed.label);
    const start = index % Math.max(1, candidates.length);
    const distractors = candidates
      .slice(start)
      .concat(candidates.slice(0, start))
      .slice(0, OPTION_IDS.length - 1);

    const options = [seed, ...distractors].map((item, optionIndex) => ({
      id: OPTION_IDS[optionIndex],
      label: item.label,
      emoji: item.emoji,
    }));

    return {
      id: index + 1,
      targetWord: seed.label,
      options,
      answerId,
    };
  });
};

export const VISUAL_MATCHING_PROTOCOLS: Record<PlaceType, VisualQuestion[]> = {
  home: createQuestionSet(PLACE_SEEDS.home),
  hospital: createQuestionSet(PLACE_SEEDS.hospital),
  cafe: createQuestionSet(PLACE_SEEDS.cafe),
  bank: createQuestionSet(PLACE_SEEDS.bank),
  park: createQuestionSet(PLACE_SEEDS.park),
  mart: createQuestionSet(PLACE_SEEDS.mart),
};
