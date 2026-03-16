import { PlaceType } from "./trainingData";

export interface ReadingScenario {
  id: number;
  title: string;
  text: string;
  wordCount: number;
}

export const READING_TEXTS: Record<PlaceType, ReadingScenario[]> = {
  home: [
    {
      id: 1,
      title: "아침 일과",
      text: "아침에 일어나면 세수를 하고 이를 닦습니다. 그리고 맛있는 아침 밥을 먹습니다.",
      wordCount: 15,
    },
    {
      id: 2,
      title: "청소 하기",
      text: "방이 지저분해서 청소기를 돌립니다. 창문을 열고 환기도 시킵니다.",
      wordCount: 12,
    },
    {
      id: 3,
      title: "휴식 시간",
      text: "소파에 앉아서 텔레비전을 봅니다. 따뜻한 차 한 잔을 마시며 쉽니다.",
      wordCount: 13,
    },
  ],
  hospital: [
    {
      id: 1,
      title: "진료 받기",
      text: "병원에 도착하면 먼저 접수를 합니다. 번호표를 받고 대기실에서 기다립니다.",
      wordCount: 12,
    },
    {
      id: 2,
      title: "검사 하기",
      text: "선생님을 만나서 증상을 말합니다. 혈압을 재고 청진기로 소리를 듣습니다.",
      wordCount: 13,
    },
    {
      id: 3,
      title: "약국 가기",
      text: "처방전을 받아서 약국으로 갑니다. 약사님 설명을 듣고 약을 받습니다.",
      wordCount: 12,
    },
  ],
  cafe: [
    {
      id: 1,
      title: "커피 주문",
      text: "카페에 가서 따뜻한 커피를 주문합니다. 잠시 기다리면 음료가 나옵니다.",
      wordCount: 12,
    },
    {
      id: 2,
      title: "자리 잡기",
      text: "창가 자리에 앉아서 책을 읽습니다. 음악 소리가 작게 들려와 좋습니다.",
      wordCount: 12,
    },
    {
      id: 3,
      title: "정리 하기",
      text: "다 마신 컵은 반납대에 둡니다. 가방을 챙겨서 카페를 나옵니다.",
      wordCount: 11,
    },
  ],
  bank: [
    {
      id: 1,
      title: "번호표 뽑기",
      text: "은행에 들어가서 번호표를 뽑습니다. 대기 인원이 많아 조금 기다려야 합니다.",
      wordCount: 12,
    },
    {
      id: 2,
      title: "창구 업무",
      text: "제 번호가 불려서 창구로 갑니다. 신분증을 보여주고 통장을 만듭니다.",
      wordCount: 12,
    },
    {
      id: 3,
      title: "업무 종료",
      text: "서명을 마친 뒤 카드를 받았습니다. 친절하게 안내해 주셔서 감사합니다.",
      wordCount: 11,
    },
  ],
  park: [
    {
      id: 1,
      title: "산책 시작",
      text: "날씨가 좋아서 공원에 산책을 나왔습니다. 푸른 나무들이 많이 보입니다.",
      wordCount: 12,
    },
    {
      id: 2,
      title: "가벼운 운동",
      text: "운동 기구를 사용하여 스트레칭을 합니다. 몸이 훨씬 가벼워지는 기분입니다.",
      wordCount: 12,
    },
    {
      id: 3,
      title: "벤치 휴식",
      text: "잠시 벤치에 앉아 시원한 바람을 느킵니다. 새들이 노래하는 소리가 들립니다.",
      wordCount: 12,
    },
  ],
  mart: [
    {
      id: 1,
      title: "장보기 목록",
      text: "마트에 도착해서 카트를 챙깁니다. 살 물건들을 하나씩 확인합니다.",
      wordCount: 11,
    },
    {
      id: 2,
      title: "식재료 고르기",
      text: "신선한 과일과 채소를 바구니에 담습니다. 우유와 달걀도 잊지 않고 챙깁니다.",
      wordCount: 12,
    },
    {
      id: 3,
      title: "계산 하기",
      text: "계산대 줄을 서서 기다립니다. 봉투에 물건을 담아 집으로 돌아갑니다.",
      wordCount: 11,
    },
  ],
};
