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

const PLACE_SEEDS: Record<PlaceType, VisualSeed[]> = {
  home: [
    { label: "텔레비전", emoji: "📺" },
    { label: "냉장고", emoji: "🧊" },
    { label: "거울", emoji: "🪞" },
    { label: "시계", emoji: "⏰" },
    { label: "소파", emoji: "🛋️" },
    { label: "숟가락", emoji: "🥄" },
    { label: "젓가락", emoji: "🥢" },
    { label: "컵", emoji: "☕" },
    { label: "책", emoji: "📘" },
    { label: "빗", emoji: "🪮" },
    { label: "리모컨", emoji: "🎮" },
    { label: "베개", emoji: "🛏️" },
  ],
  hospital: [
    { label: "붕대", emoji: "🩹" },
    { label: "주사기", emoji: "💉" },
    { label: "반창고", emoji: "🩹" },
    { label: "실내화", emoji: "👟" },
    { label: "리모컨", emoji: "🎮" },
    { label: "옷걸이", emoji: "🪝" },
    { label: "마스크", emoji: "😷" },
    { label: "청진기", emoji: "🩺" },
    { label: "의사", emoji: "🧑‍⚕️" },
    { label: "간호사", emoji: "👩‍⚕️" },
    { label: "체온계", emoji: "🌡️" },
    { label: "휠체어", emoji: "🦽" },
  ],
  cafe: [
    { label: "커피", emoji: "☕" },
    { label: "케이크", emoji: "🍰" },
    { label: "쿠키", emoji: "🍪" },
    { label: "빵", emoji: "🍞" },
    { label: "샌드위치", emoji: "🥪" },
    { label: "주스", emoji: "🧃" },
    { label: "차", emoji: "🍵" },
    { label: "아이스크림", emoji: "🍨" },
    { label: "커피머신", emoji: "☕" },
    { label: "메뉴판", emoji: "📜" },
    { label: "포크", emoji: "🍴" },
    { label: "테이블", emoji: "🪑" },
  ],
  bank: [
    { label: "지폐", emoji: "💵" },
    { label: "동전", emoji: "🪙" },
    { label: "카드", emoji: "💳" },
    { label: "도장", emoji: "💮" },
    { label: "ATM", emoji: "🏧" },
    { label: "통장", emoji: "📕" },
    { label: "계산기", emoji: "🧮" },
    { label: "펜", emoji: "🖊️" },
    { label: "번호표", emoji: "🎫" },
    { label: "금고", emoji: "🗄️" },
    { label: "지갑", emoji: "👛" },
    { label: "가방", emoji: "👜" },
  ],
  park: [
    { label: "나무", emoji: "🌳" },
    { label: "꽃", emoji: "🌸" },
    { label: "벤치", emoji: "🪵" },
    { label: "강아지", emoji: "🐶" },
    { label: "자전거", emoji: "🚲" },
    { label: "공", emoji: "⚽" },
    { label: "연", emoji: "🪁" },
    { label: "모자", emoji: "🧢" },
    { label: "식수대", emoji: "🚰" },
    { label: "쓰레기통", emoji: "🗑️" },
    { label: "분수", emoji: "⛲" },
    { label: "운동화", emoji: "👟" },
  ],
  mart: [
    { label: "사과", emoji: "🍎" },
    { label: "바나나", emoji: "🍌" },
    { label: "수박", emoji: "🍉" },
    { label: "우유", emoji: "🥛" },
    { label: "달걀", emoji: "🥚" },
    { label: "두부", emoji: "🧈" },
    { label: "카트", emoji: "🛒" },
    { label: "바구니", emoji: "🧺" },
    { label: "쇼핑백", emoji: "🛍️" },
    { label: "라면", emoji: "🍜" },
    { label: "당근", emoji: "🥕" },
    { label: "생선", emoji: "🐟" },
  ],
};

export const VISUAL_MATCHING_IMAGE_FILENAME_MAP: Record<
  PlaceType,
  Record<string, string>
> = {
  home: {
    텔레비전: "television",
    냉장고: "refrigerator",
    거울: "mirror",
    시계: "clock",
    소파: "sofa",
    숟가락: "spoon",
    젓가락: "chopsticks",
    컵: "cup",
    책: "book",
    빗: "comb",
    리모컨: "remote-control",
    베개: "pillow",
  },
  hospital: {
    붕대: "glasses",
    주사기: "water-bottle",
    반창고: "towel",
    실내화: "slipper",
    리모컨: "blanket",
    옷걸이: "calendar",
    마스크: "mask",
    청진기: "stethoscope",
    의사: "doctor",
    간호사: "nurse",
    체온계: "thermometer",
    휠체어: "wheelchair",
  },
  cafe: {
    커피: "coffee",
    케이크: "cake",
    쿠키: "cookie",
    빵: "bread",
    샌드위치: "sandwich",
    주스: "juice",
    차: "tea",
    아이스크림: "ice-cream",
    커피머신: "coffee-machine",
    메뉴판: "menu",
    포크: "fork",
    테이블: "table",
  },
  bank: {
    지폐: "money-paper",
    동전: "coin",
    카드: "card",
    도장: "stamp",
    ATM: "atm",
    통장: "passbook",
    계산기: "calculator",
    펜: "pen",
    번호표: "number-ticket",
    금고: "safe",
    지갑: "wallet",
    가방: "bag",
  },
  park: {
    나무: "tree",
    꽃: "flower",
    벤치: "bench",
    강아지: "dog",
    자전거: "bicycle",
    공: "ball",
    연: "kite",
    모자: "hat",
    식수대: "water-fountain",
    쓰레기통: "trash-bin",
    분수: "fountain",
    운동화: "sneakers",
  },
  mart: {
    사과: "apple",
    바나나: "banana",
    수박: "watermelon",
    우유: "milk",
    달걀: "egg",
    두부: "tofu",
    카트: "cart",
    바구니: "basket",
    쇼핑백: "paper-bag",
    라면: "ramen",
    당근: "carrot",
    생선: "fish",
  },
};

export const VISUAL_MATCHING_RECOMMENDED_COUNT = 12;

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
