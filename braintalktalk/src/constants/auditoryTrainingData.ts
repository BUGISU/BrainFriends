import { PlaceType } from "./trainingData";

export const HOME_REHAB_PROTOCOL = {
  basic: [
    { id: 1, question: "집에는 문이 있다.", answer: true, duration: 10 },
    {
      id: 2,
      question: "침대는 앉아서 먹는 곳이다.",
      answer: false,
      duration: 10,
    },
    { id: 3, question: "집에서 잠을 잘 수 있다.", answer: true, duration: 10 },
    { id: 4, question: "냉장고는 음식을 넣는다.", answer: true, duration: 10 },
    {
      id: 5,
      question: "화장실은 요리하는 곳이다.",
      answer: false,
      duration: 10,
    },
    { id: 6, question: "소파는 앉는 가구다.", answer: true, duration: 10 },
    { id: 7, question: "집에 불을 켜면 밝아진다.", answer: true, duration: 10 },
    {
      id: 8,
      question: "밥을 먹기 전에 손을 씻는다.",
      answer: true,
      duration: 10,
    },
    {
      id: 9,
      question: "밤에 잘 때 불을 켜고 잔다.",
      answer: false,
      duration: 10,
    },
    {
      id: 10,
      question: "옷이 더러우면 세탁기에 넣는다.",
      answer: true,
      duration: 10,
    },
  ],
  intermediate: [
    {
      id: 11,
      question: "집에서 전화가 울리면 받을 수 있다.",
      answer: true,
      duration: 10,
    },
    {
      id: 12,
      question: "냉장고 문을 열면 음식이 더워진다.",
      answer: false,
      duration: 10,
    },
    { id: 13, question: "집에서 TV를 볼 수 있다.", answer: true, duration: 10 },
    {
      id: 14,
      question: "비가 오면 창문을 닫는다.",
      answer: true,
      duration: 10,
    },
  ],
  advanced: [
    {
      id: 15,
      question: "가스를 켜두고 끄지 않으면 위험할 수 있다.",
      answer: true,
      duration: 10,
    },
    {
      id: 16,
      question: "바닥에 물이 있으면 미끄러질 수 있다.",
      answer: true,
      duration: 10,
    },
    {
      id: 17,
      question: "청소를 하지 않으면 집이 더 깨끗해진다.",
      answer: false,
      duration: 10,
    },
    {
      id: 18,
      question: "밤늦게 TV를 크게 틀면 가족이 잠을 못 잘 수 있다.",
      answer: true,
      duration: 10,
    },
    {
      id: 19,
      question: "집에 혼자 있어도 항상 안전하다.",
      answer: false,
      duration: 10,
    },
    {
      id: 20,
      question: "불을 끄면 전기 요금을 줄일 수 있다.",
      answer: true,
      duration: 10,
    },
  ],
};

export const HOSPITAL_REHAB_PROTOCOL = {
  basic: [
    { id: 1, question: "배가 아프면 병원에 간다.", answer: true, duration: 10 },
    {
      id: 2,
      question: "의사는 환자를 진료하는 사람이다.",
      answer: true,
      duration: 10,
    },
    {
      id: 3,
      question: "안과는 눈이 아플 때 가는 곳이다.",
      answer: true,
      duration: 10,
    },
    {
      id: 4,
      question: "병원에서 소리를 크게 질러야 한다.",
      answer: false,
      duration: 10,
    },
    { id: 5, question: "약국은 약을 사는 곳이다.", answer: true, duration: 10 },
  ],
  intermediate: [
    {
      id: 6,
      question: "주사를 맞을 때는 소매를 걷는다.",
      answer: true,
      duration: 10,
    },
    {
      id: 7,
      question: "열이 나면 체온계로 온도를 잰다.",
      answer: true,
      duration: 10,
    },
    {
      id: 8,
      question: "치과는 귀가 아플 때 가는 곳이다.",
      answer: false,
      duration: 10,
    },
    {
      id: 9,
      question: "처방전이 있어야 약국에서 조제약을 받는다.",
      answer: true,
      duration: 10,
    },
  ],
  advanced: [
    {
      id: 10,
      question: "진료실에 들어가기 전 대기 명단에서 이름을 확인한다.",
      answer: true,
      duration: 10,
    },
    {
      id: 11,
      question: "감기에 걸리면 얼음물을 많이 마시는 것이 좋다.",
      answer: false,
      duration: 10,
    },
    {
      id: 12,
      question: "병원 접수처에 신분증이나 건강보험증을 제시한다.",
      answer: true,
      duration: 10,
    },
  ],
};

export const CAFE_REHAB_PROTOCOL = {
  basic: [
    {
      id: 1,
      question: "커피숍에서 음료를 마실 수 있다.",
      answer: true,
      duration: 10,
    },
    {
      id: 2,
      question: "따뜻한 음료는 컵이 뜨거울 수 있다.",
      answer: true,
      duration: 10,
    },
    {
      id: 3,
      question: "카페에서 잠을 자려고 침대를 찾는다.",
      answer: false,
      duration: 10,
    },
    {
      id: 4,
      question: "진동벨이 울리면 음료를 가지러 간다.",
      answer: true,
      duration: 10,
    },
  ],
  intermediate: [
    {
      id: 5,
      question: "아이스 아메리카노에는 얼음이 들어간다.",
      answer: true,
      duration: 10,
    },
    {
      id: 6,
      question: "커피숍에서 음식을 직접 요리해서 먹는다.",
      answer: false,
      duration: 10,
    },
    {
      id: 7,
      question: "주문할 때 '따뜻한 것'과 '차거운 것' 중 선택한다.",
      answer: true,
      duration: 10,
    },
    {
      id: 8,
      question: "다 마신 컵은 테이블에 그냥 두고 나간다.",
      answer: false,
      duration: 10,
    },
  ],
  advanced: [
    {
      id: 9,
      question: "테이크아웃은 카페 밖으로 가져 나가는 것을 말한다.",
      answer: true,
      duration: 10,
    },
    {
      id: 10,
      question: "디카페인 커피는 카페인이 적게 든 커피를 말한다.",
      answer: true,
      duration: 10,
    },
    {
      id: 11,
      question: "카페 안에서는 금연을 해야 한다.",
      answer: true,
      duration: 10,
    },
  ],
};

export const BANK_REHAB_PROTOCOL = {
  basic: [
    {
      id: 1,
      question: "은행은 돈을 저금하는 곳이다.",
      answer: true,
      duration: 10,
    },
    {
      id: 2,
      question: "통장을 만들려면 은행에 가야 한다.",
      answer: true,
      duration: 10,
    },
    {
      id: 3,
      question: "은행에서 물건을 빌려주고 돈을 받는다.",
      answer: false,
      duration: 10,
    },
    {
      id: 4,
      question: "현금인출기(ATM)에서 돈을 찾을 수 있다.",
      answer: true,
      duration: 10,
    },
  ],
  intermediate: [
    {
      id: 5,
      question: "은행에 가면 번호표를 뽑고 기다린다.",
      answer: true,
      duration: 10,
    },
    {
      id: 6,
      question: "비밀번호는 다른 사람에게 알려줘도 된다.",
      answer: false,
      duration: 10,
    },
    {
      id: 7,
      question: "통장에 돈을 넣으면 잔액이 늘어난다.",
      answer: true,
      duration: 10,
    },
    {
      id: 8,
      question: "신분증 없이도 통장을 새로 만들 수 있다.",
      answer: false,
      duration: 10,
    },
  ],
  advanced: [
    {
      id: 9,
      question: "대출은 은행에서 돈을 빌리는 것을 의미한다.",
      answer: true,
      duration: 10,
    },
    {
      id: 10,
      question: "비밀번호를 3번 이상 틀리면 계좌가 잠길 수 있다.",
      answer: true,
      duration: 10,
    },
    {
      id: 11,
      question: "은행 업무 시간은 보통 오후 4시에 마감된다.",
      answer: true,
      duration: 10,
    },
  ],
};

export const PARK_REHAB_PROTOCOL = {
  basic: [
    {
      id: 1,
      question: "공원에는 나무와 풀이 있다.",
      answer: true,
      duration: 10,
    },
    {
      id: 2,
      question: "공원에서 자전거를 탈 수 있다.",
      answer: true,
      duration: 10,
    },
    {
      id: 3,
      question: "공원 벤치는 앉아서 쉬는 곳이다.",
      answer: true,
      duration: 10,
    },
    {
      id: 4,
      question: "공원에는 사자가 돌아다닌다.",
      answer: false,
      duration: 10,
    },
    {
      id: 5,
      question: "낮의 공원은 밝고 밤의 공원은 어둡다.",
      answer: true,
      duration: 10,
    },
  ],
  intermediate: [
    {
      id: 6,
      question: "나뭇잎은 보통 초록색이다.",
      answer: true,
      duration: 10,
    },
    {
      id: 7,
      question: "공원 산책로에서는 달리기나 걷기를 한다.",
      answer: true,
      duration: 10,
    },
    {
      id: 8,
      question: "공원에 쓰레기를 아무데나 버려도 된다.",
      answer: false,
      duration: 10,
    },
    {
      id: 9,
      question: "꽃이 피는 계절은 주로 봄이다.",
      answer: true,
      duration: 10,
    },
  ],
  advanced: [
    {
      id: 10,
      question: "운동기구를 사용하기 전에는 준비운동을 하는 것이 좋다.",
      answer: true,
      duration: 10,
    },
    {
      id: 11,
      question: "공원 내 흡연 구역이 아닌 곳에서는 담배를 피울 수 없다.",
      answer: true,
      duration: 10,
    },
    {
      id: 12,
      question: "애완견과 산책할 때는 반드시 목줄을 착용해야 한다.",
      answer: true,
      duration: 10,
    },
  ],
};

export const MART_REHAB_PROTOCOL = {
  basic: [
    {
      id: 1,
      question: "마트는 물건을 사는 곳이다.",
      answer: true,
      duration: 10,
    },
    {
      id: 2,
      question: "사과와 바나나는 과일 코너에 있다.",
      answer: true,
      duration: 10,
    },
    {
      id: 3,
      question: "마트에서 물건을 그냥 들고 집으로 간다.",
      answer: false,
      duration: 10,
    },
    {
      id: 4,
      question: "카트는 물건을 담아 이동할 때 쓴다.",
      answer: true,
      duration: 10,
    },
    {
      id: 5,
      question: "우유는 냉장고 안에 보관되어 있다.",
      answer: true,
      duration: 10,
    },
  ],
  intermediate: [
    {
      id: 6,
      question: "물건을 고른 후에는 계산대에서 돈을 낸다.",
      answer: true,
      duration: 10,
    },
    {
      id: 7,
      question: "만원으로 오천원짜리 물건을 사면 거스름돈이 남는다.",
      answer: true,
      duration: 10,
    },
    {
      id: 8,
      question: "아이스크림은 따뜻한 곳에 보관해야 한다.",
      answer: false,
      duration: 10,
    },
    {
      id: 9,
      question: "유통기한이 지난 음식은 먹지 않는 것이 좋다.",
      answer: true,
      duration: 10,
    },
  ],
  advanced: [
    {
      id: 10,
      question: "영수증을 확인하면 내가 산 물건의 가격을 알 수 있다.",
      answer: true,
      duration: 10,
    },
    {
      id: 11,
      question: "마트 안에서 시식용 음식은 돈을 내고 먹어야 한다.",
      answer: false,
      duration: 10,
    },
    {
      id: 12,
      question: "포인트 카드를 사용하면 구매 금액의 일부를 적립할 수 있다.",
      answer: true,
      duration: 10,
    },
  ],
};

export const REHAB_PROTOCOLS: Record<PlaceType, any> = {
  home: HOME_REHAB_PROTOCOL,
  hospital: HOSPITAL_REHAB_PROTOCOL,
  cafe: CAFE_REHAB_PROTOCOL,
  bank: BANK_REHAB_PROTOCOL,
  park: PARK_REHAB_PROTOCOL,
  mart: MART_REHAB_PROTOCOL,
};
