// src/constants/trainingData.ts

// 1. 공통 타입 정의
export type PlaceType = "home" | "hospital" | "cafe" | "bank" | "park" | "mart";

// 2. 메인 장소 설정
export const TRAINING_PLACES = [
  {
    id: "home",
    title: "우리 집",
    description: "일상 사실 이해와 안전 추론",
    icon: "🏠",
    color: "#8B4513",
  },
  {
    id: "hospital",
    title: "병원",
    description: "증상 표현 및 접수 절차 인지",
    icon: "🏥",
    color: "#E11D48",
  },
  {
    id: "cafe",
    title: "커피숍",
    description: "메뉴 선택 및 사회적 상호작용",
    icon: "☕",
    color: "#7C2D12",
  },
  {
    id: "bank",
    title: "은행",
    description: "숫자 계산 및 금융 업무 이해",
    icon: "🏦",
    color: "#1E3A8A",
  },
  {
    id: "park",
    title: "공원",
    description: "기초 청각 인지 및 색상 구분",
    icon: "🌳",
    color: "#2D5A27",
  },
  {
    id: "mart",
    title: "마트",
    description: "물건 이름대기와 금전 인지",
    icon: "🛒",
    color: "#DAA520",
  },
];
