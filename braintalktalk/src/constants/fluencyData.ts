import { PlaceType } from "./trainingData";

export interface FluencyScenario {
  id: number;
  situation: string;
  prompt: string;
  hint: string;
  minDuration: number;
}

export interface FluencyMetrics {
  totalDuration: number;
  speechDuration: number;
  silenceRatio: number;
  averageAmplitude: number;
  peakCount: number;
  fluencyScore: number;
  rawScore: number;
}

export const FLUENCY_SCENARIOS: Record<PlaceType, FluencyScenario[]> = {
  home: [
    {
      id: 1,
      situation: "아침에 일어났을 때",
      prompt: "아침에 일어나서 무엇을 하시나요? 순서대로 말씀해 주세요.",
      hint: "예: 일어나서 세수하고...",
      minDuration: 10,
    },
    {
      id: 2,
      situation: "저녁 식사 준비",
      prompt: "저녁에 가족을 위해 어떤 음식을 만들고 싶으세요?",
      hint: "예: 된장찌개를 끓이려면...",
      minDuration: 10,
    },
    {
      id: 3,
      situation: "집 청소할 때",
      prompt: "집을 깨끗이 청소하려면 어떻게 해야 하나요?",
      hint: "예: 먼저 빗자루로...",
      minDuration: 10,
    },
  ],
  hospital: [
    {
      id: 1,
      situation: "접수할 때",
      prompt: "병원에 처음 왔을 때 어떻게 접수하나요?",
      hint: "예: 먼저 접수처에 가서...",
      minDuration: 10,
    },
    {
      id: 2,
      situation: "증상 설명",
      prompt: "의사 선생님께 어디가 아픈지 설명해 주세요.",
      hint: "예: 며칠 전부터 머리가...",
      minDuration: 10,
    },
    {
      id: 3,
      situation: "약국에서",
      prompt: "처방전을 들고 약국에 가면 어떻게 하나요?",
      hint: "예: 약사님께 처방전을 주고...",
      minDuration: 10,
    },
  ],
  cafe: [
    {
      id: 1,
      situation: "음료 주문",
      prompt: "카페에서 좋아하는 음료를 주문해 보세요.",
      hint: "예: 따뜻한 아메리카노 한 잔...",
      minDuration: 10,
    },
    {
      id: 2,
      situation: "친구와 대화",
      prompt: "카페에서 친구를 만났을 때 어떤 이야기를 하고 싶으세요?",
      hint: "예: 요즘 어떻게 지내?...",
      minDuration: 10,
    },
    {
      id: 3,
      situation: "직원에게 요청",
      prompt: "음료에 문제가 있을 때 어떻게 말씀하시겠어요?",
      hint: "예: 죄송한데 이 음료가...",
      minDuration: 10,
    },
  ],
  bank: [
    {
      id: 1,
      situation: "계좌 개설",
      prompt: "은행에서 새 통장을 만들려면 어떻게 해야 하나요?",
      hint: "예: 신분증을 가지고...",
      minDuration: 10,
    },
    {
      id: 2,
      situation: "돈 입금",
      prompt: "ATM에서 돈을 입금하는 방법을 설명해 주세요.",
      hint: "예: 카드를 넣고...",
      minDuration: 10,
    },
    {
      id: 3,
      situation: "상담 요청",
      prompt: "은행 직원에게 대출 상담을 요청해 보세요.",
      hint: "예: 안녕하세요, 대출에 대해...",
      minDuration: 10,
    },
  ],
  park: [
    {
      id: 1,
      situation: "산책할 때",
      prompt: "공원에서 산책하면서 보이는 것들을 설명해 주세요.",
      hint: "예: 나무가 있고, 꽃이...",
      minDuration: 10,
    },
    {
      id: 2,
      situation: "운동할 때",
      prompt: "공원에서 어떤 운동을 하시나요? 방법을 알려주세요.",
      hint: "예: 먼저 준비운동을 하고...",
      minDuration: 10,
    },
    {
      id: 3,
      situation: "날씨 이야기",
      prompt: "오늘 날씨가 어떤가요? 자세히 말씀해 주세요.",
      hint: "예: 오늘은 맑고...",
      minDuration: 10,
    },
  ],
  mart: [
    {
      id: 1,
      situation: "장보기",
      prompt: "마트에서 일주일치 장을 보려면 무엇을 사야 하나요?",
      hint: "예: 채소랑 고기, 그리고...",
      minDuration: 10,
    },
    {
      id: 2,
      situation: "물건 찾기",
      prompt: "마트 직원에게 원하는 물건 위치를 물어보세요.",
      hint: "예: 실례합니다, 라면이 어디...",
      minDuration: 10,
    },
    {
      id: 3,
      situation: "계산할 때",
      prompt: "계산대에서 어떻게 결제하시나요?",
      hint: "예: 카드로 결제할게요...",
      minDuration: 10,
    },
  ],
};
