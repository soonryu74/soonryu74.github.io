/* 근거영양 — 하루 영양소 기준표: 묶음(그룹)과 성분 카드 연결
   수치는 kdri.js(성인)·kdri_child.js(영유아·소아청소년)·haru_cond.js(건강문제별)에서 읽음 */
window.EBN_HARU = {
  groups: [
    { id: 'macro', name: '에너지·단백질·식이섬유·수분', desc: '식사의 뼈대. 단백질 외에는 보충제로 채울 일이 드뭅니다.', nuts: ['energy', 'protein', 'fiber', 'water'] },
    { id: 'bone', name: '뼈·근육', desc: '칼슘과 비타민 D가 중심. 칼슘은 상한이 있어 식사+보충 합계를 봐야 합니다.', nuts: ['calcium', 'vitd', 'vitk', 'magnesium', 'phosphorus', 'fluoride'] },
    { id: 'blood', name: '혈액·빈혈', desc: '철·엽산·B12는 부족하면 빈혈로 이어집니다. 철은 검사 후 보충이 원칙입니다.', nuts: ['iron', 'folate', 'b12', 'copper'] },
    { id: 'energyb', name: '에너지 대사(비타민 B군·콜린)', desc: '대부분 식사로 채워집니다. 나이아신·B6는 보충제 상한에 주의합니다.', nuts: ['b1', 'b2', 'niacin', 'b6', 'pantothenic', 'biotin', 'choline'] },
    { id: 'immune', name: '항산화·면역·피부', desc: '비타민 A·E·셀레늄은 "많을수록 좋다"가 아니라 상한이 중요한 영양소입니다.', nuts: ['vita', 'vitc', 'vite', 'zinc', 'selenium'] },
    { id: 'bp', name: '혈압·전해질', desc: '나트륨은 줄이고 칼륨은 채우는 방향. 신장질환·일부 혈압약 복용 시 칼륨 보충제는 위험할 수 있습니다.', nuts: ['sodium', 'potassium'] },
    { id: 'trace', name: '갑상선·미량 무기질', desc: '한국인은 해조류로 요오드를 충분히 또는 많이 먹는 편입니다.', nuts: ['iodine', 'manganese', 'chromium', 'molybdenum'] }
  ],
  /* 영양소 id → 성분 카드 id (seongbun.html#id). 카드가 없으면 링크만 생략 */
  card: { vita: 'vita', vitd: 'vitd', vite: 'vite', vitk: 'vitk', vitc: 'vitc', b6: 'b6', folate: 'folate', b12: 'b12', biotin: 'biotin',
    calcium: 'calcium', magnesium: 'magnesium', iron: 'iron', zinc: 'zinc', selenium: 'selenium', chromium: 'chromium', potassium: 'potassium', protein: 'protein' },
  /* 성분 카드가 없는 영양소의 보충 관련 메모(출처는 링크 페이지에) */
  extra: { niacin: ['고용량 니아신은 이 사이트에서 "유해 근거"로 분류', 'goyongryang.html#niacin-mega'] }
};
