// 화면 확인용 예시 데이터. 실제 운영 데이터와 예약 기능은 Firebase 연결 후 제공한다.
const photoUrl = (id, width = 700) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`;
export const demoDestinations = [
  { id: 'jeju', name: '제주', region: '제주', english: 'JEJU ISLAND', summary: '바람 따라, 푸른 바다 곁으로', tag: '바다 · 자연', image: 'photo-1517154421773-0529f29ea451', description: '바다와 오름을 함께 즐기는 느긋한 여행을 계획해 보세요. 해안 산책과 작은 마을에서의 휴식을 테마로 구성한 예시 여행지입니다.' },
  { id: 'gangneung', name: '강릉', region: '강원', english: 'GANGNEUNG', summary: '파도 소리로 채우는 하루', tag: '해변 · 산책', image: 'photo-1507525428034-b723cf961d3e', description: '바다를 바라보며 걷고 잠시 쉬어가는 여행. 해변 산책과 카페에서 보내는 시간을 테마로 구성한 예시 여행지입니다.' },
  { id: 'suncheon', name: '순천', region: '전남', english: 'SUNCHEON', summary: '자연의 속도로 걷는 시간', tag: '자연 · 힐링', image: 'photo-1472396961693-142e6e269027', description: '초록 풍경과 계절의 변화를 천천히 살펴보세요. 자연 속 산책과 여유로운 쉼을 테마로 구성한 예시 여행지입니다.' },
  { id: 'gyeongju', name: '경주', region: '경북', english: 'GYEONGJU', summary: '오래된 풍경 속 새로운 쉼', tag: '문화 · 골목', image: 'photo-1548115184-bc6544d06a58', description: '역사와 일상이 만나는 길을 따라 걸어보세요. 문화 산책과 골목 여행을 테마로 구성한 예시 여행지입니다.' }
];
export const demoStays = [
  { id: 'stay-jeju', destinationId: 'jeju', name: '제주, 바람이 머무는 집', location: '제주 · 감성 숙소', summary: '창 너머 풍경과 함께하는 조용한 휴식', price: 120000, image: 'photo-1449158743715-0a90ebb6d2d8' },
  { id: 'stay-gangneung', destinationId: 'gangneung', name: '강릉, 파도 곁 스테이', location: '강원 강릉 · 오션 스테이', summary: '느긋한 아침을 위한 나만의 작은 공간', price: 150000, image: 'photo-1611892440504-42a792e24d32' },
  { id: 'stay-gyeongju', destinationId: 'gyeongju', name: '경주, 느린 하루', location: '경북 경주 · 조용한 숙소', summary: '여행의 끝에서 만나는 따뜻한 머무름', price: 100000, image: 'photo-1449844908441-8829872d2607' }
];
