/* 근거영양 — 건강문제별 하루 영양소 목표(진료지침·연구 기준). 각 항목 src 참고. 작성 2026-10-05 */
window.EBN_HARU_COND = [
 {
  "id": "healthy",
  "lead": "진단받은 질환·복용 약이 없으면 2025 한국인 영양소 섭취기준(KDRI)을 그대로 기준으로 삼습니다.",
  "items": [
   {
    "nut": "other",
    "label": "전체 영양소",
    "dir": "same",
    "target": "2025 KDRI 권장섭취량·충분섭취량·상한섭취량 그대로",
    "vsKdri": "차이 없음 — 이 페이지의 기본선",
    "why": "질환별 지침이 따로 정한 조정이 없으면 일반 성인 기준이 적용됩니다.",
    "level": "guideline",
    "src": [
     [
      "2025 한국인 영양소 섭취기준 (보건복지부)",
      "https://www.mohw.go.kr/board.es?mid=a10411010200&bid=0019&act=view&list_no=1488446"
     ]
    ]
   }
  ],
  "notes": [
   "나트륨은 충분섭취량(19~64세 1,500 mg, 65~74세 1,300 mg, 75세 이상 1,200 mg)과 별도로 만성질환위험감소섭취량(19~64세 2,300 mg, 65~74세 1,900 mg, 75세 이상 1,800 mg)이 함께 제시돼 있습니다."
  ]
 },
 {
  "id": "htn",
  "lead": "고혈압에서 수치로 정해진 조정은 나트륨이 핵심이고, 칼륨은 '음식으로 늘리는 방향'이 권고되지만 신장 기능이 떨어졌으면 예외입니다.",
  "items": [
   {
    "nut": "sodium",
    "label": "나트륨",
    "dir": "limit",
    "target": "대한고혈압학회 2018 지침: 소금 하루 6 g 미만(나트륨 약 2.4 g; 학회 환산식 소금=나트륨×2.5). 미국 2025 AHA/ACC: 나트륨 2,300 mg 미만, 가능하면 1,500 mg 미만",
    "vsKdri": "19~64세 KDRI 만성질환위험감소섭취량 2,300 mg과 비슷한 선(65~74세 1,900 mg·75세 이상 1,800 mg은 이보다 낮음). 미국 지침의 이상적 목표 1,500 mg은 19~64세 KDRI 충분섭취량과 같은 수준",
    "why": "대한고혈압학회는 소금 6 g 미만 제한을 Class I로 권고하며, 한국인 평균 섭취(소금 약 10 g)를 절반으로 줄이면 수축기 혈압이 4~6 mmHg 내려간다고 설명합니다. 2026 개정판도 나트륨 제한을 강하게 권고하는 기조를 유지했습니다.",
    "level": "guideline",
    "src": [
     [
      "대한고혈압학회 2018 고혈압 진료지침 Part II (Clin Hypertens 2019)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC6670135/"
     ],
     [
      "대한고혈압학회 2026 진료지침 하이라이트 (Clin Hypertens 2026)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC13197191/"
     ],
     [
      "2025 AHA/ACC 고혈압 지침 비교 해설 (Nephrol Dial Transplant 2026)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC13624793/"
     ],
     [
      "2025 AHA/ACC 고혈압 지침 (PubMed 40811497)",
      "https://pubmed.ncbi.nlm.nih.gov/40811497/"
     ]
    ]
   },
   {
    "nut": "potassium",
    "label": "칼륨",
    "dir": "more",
    "target": "채소·과일 등 칼륨이 풍부한 음식 섭취 권장(지침은 별도 수치 목표를 제시하지 않음). 미국 2025 AHA/ACC: 칼륨 함유 대체 소금은 CKD 등 고칼륨혈증 위험이 없을 때만 고려(2a)",
    "vsKdri": "KDRI 충분섭취량 3,500 mg 자체는 그대로 — 음식으로 채우는 방향",
    "why": "대한고혈압학회는 칼륨이 풍부한 음식이 혈압을 낮춘다고 하면서도 신기능이 떨어진 환자는 칼륨 섭취에 주의하라고 명시합니다. 2025 AHA/ACC도 CKD 등 고칼륨혈증을 일으킬 수 있는 상황은 칼륨 대체 소금 권고에서 예외로 둡니다.",
    "level": "guideline",
    "src": [
     [
      "대한고혈압학회 2018 고혈압 진료지침 Part II (Clin Hypertens 2019)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC6670135/"
     ],
     [
      "2025 AHA/ACC 고혈압 지침 비교 해설 (Nephrol Dial Transplant 2026)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC13624793/"
     ]
    ]
   },
   {
    "nut": "other",
    "label": "식사 패턴(DASH형)",
    "dir": "more",
    "target": "채소·신선한 과일·생선·견과·불포화지방 섭취를 늘리고 붉은 고기를 줄이며 저지방 유제품 선택(Class I, Level A)",
    "vsKdri": "KDRI에는 식사 패턴 기준이 없음 — 영양소 총량이 아닌 식단 구성 권고",
    "why": "대한고혈압학회는 특정 영양소보다 전체 식사 패턴 변화가 중요하다고 보며, DASH 식사가 혈압을 약 11/6 mmHg 낮췄다고 인용합니다.",
    "level": "guideline",
    "src": [
     [
      "대한고혈압학회 2018 고혈압 진료지침 Part II (Clin Hypertens 2019)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC6670135/"
     ]
    ]
   }
  ],
  "notes": [
   "대한고혈압학회 2018 지침: 미량영양소·칼슘·마그네슘·식이섬유 보충제가 혈압에 미치는 효과는 아직 분명한 근거가 없다고 기술합니다.",
   "만성 신장질환이 함께 있으면 칼륨 항목은 '신장질환' 탭의 기준을 따릅니다."
  ]
 },
 {
  "id": "diabetes",
  "lead": "당뇨병이라고 비타민·미네랄 목표치가 올라가지는 않습니다. 지침은 혈당 개선 목적의 보충제를 권하지 않으며, 수치로 정한 조정은 나트륨과 단백질 정도입니다.",
  "items": [
   {
    "nut": "sodium",
    "label": "나트륨",
    "dir": "limit",
    "target": "하루 2,300 mg 미만(대한당뇨병학회 권고 9; 미국당뇨병학회 ADA 권고 5.20)",
    "vsKdri": "19~64세 KDRI 만성질환위험감소섭취량 2,300 mg과 같은 선(65~74세 1,900 mg·75세 이상 1,800 mg은 이보다 낮음)",
    "why": "나트륨 제한은 혈압과 심혈관 위험을 낮추며, 대한당뇨병학회는 고혈압이 동반됐다고 해서 일반인보다 더 엄격한 제한을 둘 근거는 부족하다고 설명합니다.",
    "level": "guideline",
    "src": [
     [
      "대한당뇨병학회 2025 진료지침 (Diabetes Metab J 2025)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12270580/"
     ],
     [
      "ADA Standards of Care 2026 — 5장 (권고 5.16·5.17·5.20)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12690188/"
     ]
    ]
   },
   {
    "nut": "protein",
    "label": "단백질",
    "dir": "same",
    "target": "제한 불필요(대한당뇨병학회 권고 7). 신장질환이 있어도 0.8 g/kg/일 미만으로 낮추는 것은 권고하지 않음; 투석 중이면 1.0~1.2 g/kg/일",
    "vsKdri": "KDRI 2025 성인 권장섭취량(약 0.91 g/kg/일, 에너지적정비율 10~20%) 범위 — 대한당뇨병학회는 총 에너지의 약 14~16%를 제시",
    "why": "대한당뇨병학회는 0.8 g/kg 미만 제한이 단백질·필수영양소 부족을 부를 수 있고 투석 환자에서는 영양불량을 악화시킨다고 봅니다. 미국당뇨병학회(ADA)도 CKD에서 일반 권장량 미만으로 줄일 필요가 없다는 입장입니다.",
    "level": "guideline",
    "src": [
     [
      "대한당뇨병학회 2025 진료지침 (Diabetes Metab J 2025)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12270580/"
     ],
     [
      "ADA Standards of Care 2026 — 5장 (권고 5.16·5.17·5.20)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12690188/"
     ]
    ]
   },
   {
    "nut": "other",
    "label": "비타민·미네랄 보충제",
    "dir": "nosupp",
    "target": "혈당 개선 목적의 일상적 보충은 권고하지 않음(대한당뇨병학회 권고 10; ADA 5.16). 베타카로틴 보충은 하지 않도록 상담(ADA 5.17)",
    "vsKdri": "KDRI 그대로 — 결핍이 확인되거나 가능성이 높은 경우(임신·수유, 고령, 채식, 초저열량·저탄수화물 식사)만 예외",
    "why": "비타민 C·E, 크롬·마그네슘·셀레늄 등 보충의 혈당 효과는 결핍이 없는 사람에서 불분명하며, 베타카로틴은 폐암·심혈관 사망 증가와 연관됐습니다.",
    "level": "guideline",
    "src": [
     [
      "대한당뇨병학회 2025 진료지침 (Diabetes Metab J 2025)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12270580/"
     ],
     [
      "ADA Standards of Care 2026 — 5장 (권고 5.16·5.17·5.20)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12690188/"
     ]
    ]
   },
   {
    "nut": "b12",
    "label": "비타민 B12",
    "dir": "check",
    "target": "메트포르민 장기 복용 시 B12 수치 확인 — 특히 원인 모를 빈혈·말초신경병증이 있을 때(대한당뇨병학회); ADA도 주기적 검사를 고려하도록 기술",
    "vsKdri": "섭취 기준(2.4 µg)은 그대로 — 바뀌는 것은 '검사로 확인'하는 점",
    "why": "메트포르민 장기 사용은 B12 결핍과 연관됩니다. 보충 여부는 검사 결과로 판단하는 것이 지침의 방식입니다.",
    "level": "guideline",
    "src": [
     [
      "대한당뇨병학회 2025 진료지침 (Diabetes Metab J 2025)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12270580/"
     ],
     [
      "ADA Standards of Care 2026 — 9장 약물치료(메트포르민·B12)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12690185/"
     ]
    ]
   },
   {
    "nut": "sat_fat",
    "label": "포화지방",
    "dir": "limit",
    "target": "총 에너지의 7% 미만, 트랜스지방은 피함(대한당뇨병학회 권고 8 해설)",
    "vsKdri": "2025 KDRI 성인 에너지적정비율과 같은 선(지방 15~30%, 포화지방 7% 미만, 트랜스지방 1% 미만) — 당뇨병이라고 더 엄격해지지는 않음",
    "why": "포화·트랜스지방을 불포화지방으로 바꾸면 혈당과 심혈관 위험이 개선됩니다. 다만 오메가-3 등 불포화지방 '보충제'는 같은 이득이 확인되지 않았습니다.",
    "level": "guideline",
    "src": [
     [
      "대한당뇨병학회 2025 진료지침 (Diabetes Metab J 2025)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12270580/"
     ]
    ]
   },
   {
    "nut": "fiber",
    "label": "식이섬유",
    "dir": "more",
    "target": "통곡물·콩류·채소·생과일 등 식이섬유가 풍부한 탄수화물 선택(권고 5; 수치 목표는 없고 근거로 하루 25~29 g 분석을 인용)",
    "vsKdri": "KDRI 2025 충분섭취량(남 30 g, 여 19~49세 20 g·50세 이상 25 g)과 같은 방향 — 지침은 한국 성인 평균 섭취가 약 23 g/일에 머문다고 기술",
    "why": "식이섬유가 풍부한 탄수화물은 혈당 조절, 심혈관질환 예방, 사망률 감소와 연관됩니다. 신기능이 크게 떨어졌거나 일부 약을 쓰면 고칼륨혈증에 주의하라고 덧붙입니다.",
    "level": "guideline",
    "src": [
     [
      "대한당뇨병학회 2025 진료지침 (Diabetes Metab J 2025)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12270580/"
     ]
    ]
   }
  ],
  "notes": [
   "SGLT2 억제제 복용 중 초저탄수화물(케톤) 식사는 케톤산증 주의가 필요하다고 대한당뇨병학회가 언급합니다."
  ]
 },
 {
  "id": "dyslip",
  "lead": "이상지질혈증·심혈관질환에서 바뀌는 것은 미량영양소가 아니라 지방의 '종류'와 식이섬유이며, 베타카로틴·비타민 E 보충제는 예방 목적으로 권하지 않습니다.",
  "items": [
   {
    "nut": "sat_fat",
    "label": "포화지방·총지방",
    "dir": "limit",
    "target": "포화지방 총 에너지의 7% 미만(I/A), 총지방 30% 이내(IIa/B), 오메가-6 다가불포화지방 10% 미만, 트랜스지방 피함(I/A)",
    "vsKdri": "2025 KDRI 성인 에너지적정비율(지방 15~30%, 포화지방 7% 미만, 트랜스지방 1% 미만)과 같은 선 — 오메가-6 10% 미만만 지침에서 추가",
    "why": "포화지방을 불포화지방으로 바꾸면 LDL 콜레스테롤이 내려갑니다. 2022년 5판 지침도 지방 30% 이내 제한을 유지했다고 대한당뇨병학회 지침이 인용합니다.",
    "level": "guideline",
    "src": [
     [
      "한국지질·동맥경화학회 2018 이상지질혈증 치료지침 (J Lipid Atheroscler 2019)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC7379116/"
     ],
     [
      "대한당뇨병학회 2025 진료지침 (Diabetes Metab J 2025)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12270580/"
     ]
    ]
   },
   {
    "nut": "fiber",
    "label": "식이섬유",
    "dir": "more",
    "target": "식이섬유 하루 25 g 초과(I/A)",
    "vsKdri": "KDRI 2025 충분섭취량(남 30 g, 여 19~49세 20 g·50세 이상 25 g)과 비슷한 수준 — 남성은 KDRI 값이 더 높음",
    "why": "수용성 식이섬유는 혈중 콜레스테롤과 중성지방을 낮춥니다. 지침은 유럽 지침의 수용성 섬유 5~15 g(총 25~40 g)을 함께 인용합니다.",
    "level": "guideline",
    "src": [
     [
      "한국지질·동맥경화학회 2018 이상지질혈증 치료지침 (J Lipid Atheroscler 2019)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC7379116/"
     ]
    ]
   },
   {
    "nut": "other",
    "label": "식이 콜레스테롤",
    "dir": "limit",
    "target": "고콜레스테롤혈증이 있으면 하루 300 mg 이내(IIa/B)",
    "vsKdri": "2025 KDRI도 19세 이상 300 mg/일 미만을 권고(에너지적정비율 각주) — 같은 수치",
    "why": "식이 콜레스테롤은 포화·트랜스지방보다 LDL에 미치는 영향이 작고 개인차가 커서, 지침은 일률적 제한은 필요 없다고 보면서 혈중 콜레스테롤이 높은 경우의 과다 섭취를 피하도록 권고합니다.",
    "level": "guideline",
    "src": [
     [
      "한국지질·동맥경화학회 2018 이상지질혈증 치료지침 (J Lipid Atheroscler 2019)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC7379116/"
     ]
    ]
   },
   {
    "nut": "other",
    "label": "탄수화물·당",
    "dir": "limit",
    "target": "총 탄수화물 에너지의 65% 미만, 당 10~20% 이내(IIa/B)",
    "vsKdri": "2025 KDRI 탄수화물 적정비율(50~65%)의 상한과 같은 선 — KDRI도 총당류 20% 이내·첨가당 10% 이내를 제시",
    "why": "단순당을 포함한 과다 탄수화물 섭취는 혈중 중성지방을 올립니다.",
    "level": "guideline",
    "src": [
     [
      "한국지질·동맥경화학회 2018 이상지질혈증 치료지침 (J Lipid Atheroscler 2019)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC7379116/"
     ]
    ]
   },
   {
    "nut": "other",
    "label": "오메가-3 지방산",
    "dir": "check",
    "target": "중성지방이 높을 때 2~4 g이 중성지방을 낮출 수 있음(지침 해설). 500 mg/dL 이상 지속 시 약물(피브레이트·오메가-3) 치료를 의료진이 판단",
    "vsKdri": "KDRI 2025 EPA+DHA 충분섭취량은 성인 250 mg/일 — 2~4 g은 그 8~16배로 진단·처방 맥락의 수치",
    "why": "오메가-3는 콜레스테롤은 낮추지 않으며, 대한당뇨병학회는 일반 당뇨병 인구에서 심혈관 예방 목적의 불포화지방 보충을 권고하지 않습니다.",
    "level": "guideline",
    "src": [
     [
      "한국지질·동맥경화학회 2018 이상지질혈증 치료지침 (J Lipid Atheroscler 2019)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC7379116/"
     ],
     [
      "대한당뇨병학회 2025 진료지침 (Diabetes Metab J 2025)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12270580/"
     ]
    ]
   },
   {
    "nut": "vite",
    "label": "비타민 E·베타카로틴 보충제",
    "dir": "nosupp",
    "target": "심혈관질환·암 예방 목적의 베타카로틴 또는 비타민 E 보충제 사용을 권고하지 않음(미국 USPSTF D등급, 일반 성인 대상)",
    "vsKdri": "음식 속 비타민 E·카로티노이드 섭취(KDRI)는 그대로",
    "why": "USPSTF는 두 보충제에 대해 '반대'를 권고했고, 종합비타민 등 나머지 보충제는 근거 불충분으로 판단했습니다.",
    "level": "guideline",
    "src": [
     [
      "USPSTF 2022 — 심혈관질환·암 예방 목적 비타민 보충 (베타카로틴·비타민 E 반대)",
      "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/vitamin-supplementation-to-prevent-cvd-and-cancer-preventive-medication"
     ]
    ]
   }
  ],
  "notes": [
   "생선(특히 등푸른생선) 주 2~3회, 통곡물·콩·채소 위주 식단이 함께 권고됩니다."
  ]
 },
 {
  "id": "ckd",
  "lead": "신장질환은 질환 탭 중 기준이 가장 크게 달라집니다. 단백질은 투석 전에는 줄이고 투석 후에는 늘리며, 나트륨·칼슘은 상한이 생기고 칼륨·인은 혈액검사로 조정합니다.",
  "items": [
   {
    "nut": "protein",
    "label": "단백질(투석 전 3~5기)",
    "dir": "limit",
    "target": "KDIGO 2024(국제 지침): 0.8 g/kg/일 유지(G3~G5, 2C), 1.3 g/kg/일 초과 피함; 진행 고위험·의지가 있는 경우 의료진 감독 하 초저단백 0.3~0.4 g/kg + 필수아미노산·케토산 유사체(총 0.6 g/kg까지) 고려. 미국 KDOQI 2020(대사적으로 안정): 비당뇨 0.55~0.60 g/kg(이상체중) 또는 0.28~0.43 g/kg + 케토산 유사체, 당뇨 동반 0.6~0.8 g/kg",
    "vsKdri": "KDRI 2025 성인 단백질 권장섭취량(약 0.91 g/kg/일)보다 약간 낮은 수준(KDIGO는 WHO 일반 인구 권장량과 같다고 설명) — 더 엄격한 저단백은 미국 KDOQI 기준이며 담당 의료진·영양사 관리가 전제",
    "why": "고단백 섭취는 사구체 과여과로 신기능 저하를 부추길 수 있어 제한합니다. 두 지침 모두 대사적으로 불안정한 사람에게는 저단백 처방을 하지 말라고 하며, 노쇠·근감소가 있는 고령자는 더 높은 단백질·열량 목표를 고려하라고 합니다(KDIGO).",
    "level": "guideline",
    "src": [
     [
      "KDIGO 2024 CKD 진료지침 (Kidney Int 2024;105:S117) 원문 PDF",
      "https://kdigo.org/wp-content/uploads/2024/03/KDIGO-2024-CKD-Guideline.pdf"
     ],
     [
      "KDOQI 2020 CKD 영양 지침 (Am J Kidney Dis 2020; PubMed 32829751)",
      "https://pubmed.ncbi.nlm.nih.gov/32829751/"
     ],
     [
      "KDOQI 2020 해설 — 단백질 권고 표 (Nephrology 2022)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC9303594/"
     ],
     [
      "대한신장학회지 KRCP 2024 — KDOQI 2020 비투석 CKD 권고 요약표(표 1)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11467355/"
     ]
    ]
   },
   {
    "nut": "protein",
    "label": "단백질(투석 중)",
    "dir": "more",
    "target": "혈액투석·복막투석, 대사적으로 안정: 1.0~1.2 g/kg/일(이상체중) (KDOQI 2020)",
    "vsKdri": "KDRI 2025 성인 권장섭취량(약 0.91 g/kg/일)보다 높음",
    "why": "투석 중에는 제한이 아니라 충분한 섭취가 기준입니다. 대한당뇨병학회는 투석 중 단백질 제한이 에너지 손실과 영양불량을 악화시킬 수 있다고 보고 당뇨병성 신장질환 투석 시 1.0~1.2 g/kg를 권고합니다.",
    "level": "guideline",
    "src": [
     [
      "KDOQI 2020 해설 — 단백질 권고 표 (Nephrology 2022)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC9303594/"
     ],
     [
      "대한당뇨병학회 2025 진료지침 (Diabetes Metab J 2025)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12270580/"
     ]
    ]
   },
   {
    "nut": "sodium",
    "label": "나트륨",
    "dir": "limit",
    "target": "KDIGO 2024: 하루 2 g 미만(90 mmol, 소금 5 g 미만, 2C). KDOQI 2020: 2.3 g 미만(100 mmol)",
    "vsKdri": "19~64세 KDRI 만성질환위험감소섭취량 2,300 mg보다 낮거나 같음(65~74세 1,900 mg·75세 이상 1,800 mg은 KDIGO 2 g보다 낮음)",
    "why": "KDIGO 2024는 KDIGO 2021 혈압 지침·2022 당뇨병 지침의 같은 권고를 그대로 채택했습니다. 다만 염분 소실성 신병증 환자에게는 나트륨 제한이 대개 적절하지 않습니다(KDIGO).",
    "level": "guideline",
    "src": [
     [
      "KDIGO 2024 CKD 진료지침 (Kidney Int 2024;105:S117) 원문 PDF",
      "https://kdigo.org/wp-content/uploads/2024/03/KDIGO-2024-CKD-Guideline.pdf"
     ],
     [
      "대한신장학회지 KRCP 2024 — KDOQI 2020 비투석 CKD 권고 요약표(표 1)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11467355/"
     ]
    ]
   },
   {
    "nut": "potassium",
    "label": "칼륨",
    "dir": "check",
    "target": "혈청 칼륨을 정상 범위로 유지하도록 개인별 조정(KDOQI). 고칼륨혈증 병력이 있으면 생체이용률 높은 칼륨 식품(가공식품 등) 섭취 제한 상담(KDIGO 3.11.5.2)",
    "vsKdri": "KDRI 충분섭취량 3,500 mg을 일률 적용하지 않음 — 혈액검사가 기준",
    "why": "채소·과일·통곡물의 칼륨은 흡수율이 낮아 일괄 제한하지 않는 쪽으로 바뀌었고, 고칼륨혈증이면 변비·산증·약물 등 다른 원인부터 확인합니다. 칼륨 보충제·칼륨 소금은 의료진 확인이 전제입니다.",
    "level": "guideline",
    "src": [
     [
      "KDIGO 2024 CKD 진료지침 (Kidney Int 2024;105:S117) 원문 PDF",
      "https://kdigo.org/wp-content/uploads/2024/03/KDIGO-2024-CKD-Guideline.pdf"
     ],
     [
      "대한신장학회지 KRCP 2024 — KDOQI 2020 비투석 CKD 권고 요약표(표 1)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11467355/"
     ],
     [
      "KDOQI 2020 해설 — 단백질 권고 표 (Nephrology 2022)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC9303594/"
     ]
    ]
   },
   {
    "nut": "phosphorus",
    "label": "인",
    "dir": "check",
    "target": "고인산혈증이 있으면 식이 인 제한(2D), 인의 출처(동물성·식물성·첨가물) 고려(KDIGO-MBD 4.1.8). KDOQI: 혈청 인 정상 유지 목표로 조정",
    "vsKdri": "KDRI 권장 650 mg을 일률 적용하지 않음 — 혈청 인 수치가 기준",
    "why": "가공식품의 인 첨가물은 흡수율이 높아 우선 줄일 대상이며, 식물성 인은 흡수율이 낮습니다.",
    "level": "guideline",
    "src": [
     [
      "KDIGO 2017 CKD-MBD 개정 지침 PDF",
      "https://kdigo.org/wp-content/uploads/2017/02/2017-KDIGO-CKD-MBD-GL-Update.pdf"
     ],
     [
      "대한신장학회지 KRCP 2024 — KDOQI 2020 비투석 CKD 권고 요약표(표 1)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11467355/"
     ],
     [
      "KDOQI 2020 해설 — 단백질 권고 표 (Nephrology 2022)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC9303594/"
     ]
    ]
   },
   {
    "nut": "calcium",
    "label": "칼슘",
    "dir": "limit",
    "target": "KDOQI 2020: 식사·보충제·칼슘계 인결합제를 모두 합쳐 하루 800~1,000 mg(활성형 비타민 D 비사용 시). KDIGO-MBD: 고칼슘혈증 피함(2C), 칼슘계 인결합제 용량 제한(2B)",
    "vsKdri": "KDRI 권장(남 800 mg·여 650~750 mg)과 비슷하지만 '약·보충제 포함 총량 상한'으로 관리",
    "why": "KDIGO가 고칼슘혈증 회피와 칼슘계 인결합제 용량 제한을 권고하므로, 보충제와 인결합제를 포함한 총량으로 봅니다.",
    "level": "guideline",
    "src": [
     [
      "대한신장학회지 KRCP 2024 — KDOQI 2020 비투석 CKD 권고 요약표(표 1)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11467355/"
     ],
     [
      "KDIGO 2017 CKD-MBD 개정 지침 PDF",
      "https://kdigo.org/wp-content/uploads/2017/02/2017-KDIGO-CKD-MBD-GL-Update.pdf"
     ]
    ]
   },
   {
    "nut": "vitd",
    "label": "비타민 D",
    "dir": "check",
    "target": "25(OH)D 측정 후 결핍·부족이면 일반 인구와 같은 방식으로 교정(KDIGO-MBD 3.1.3, 2C). 투석 전 G3a~G5에서 칼시트리올·활성형 비타민 D 유사체는 일상적으로 쓰지 않음(4.2.2)",
    "vsKdri": "KDRI 충분섭취량(10~15 µg)과 상한 100 µg은 그대로 — 결핍 여부는 검사로",
    "why": "영양형 비타민 D(콜레칼시페롤 등)와 처방용 활성형은 구분해야 하며, 활성형은 중증 부갑상선기능항진증에서 의료진이 판단합니다.",
    "level": "guideline",
    "src": [
     [
      "KDIGO 2017 CKD-MBD 개정 지침 PDF",
      "https://kdigo.org/wp-content/uploads/2017/02/2017-KDIGO-CKD-MBD-GL-Update.pdf"
     ]
    ]
   },
   {
    "nut": "other",
    "label": "건강기능식품·한약·일반의약품",
    "dir": "nosupp",
    "target": "신장에 해로울 수 있는 일반의약품·식이보충제·한약재 사용을 점검하고 줄일 것(KDIGO 2024 Practice Point 4.1.3)",
    "vsKdri": "해당 없음 — 보충제 사용 자체를 의료진과 점검",
    "why": "KDIGO는 신장 건강을 위협할 수 있는 비처방 대체요법은 중단을 권하도록 하며, 과량 비타민 C 보충제가 신세뇨관 옥살산칼슘 침착을, 크레아틴 보충제가 간질성 신염을 일으킨 사례를 예로 듭니다.",
    "level": "guideline",
    "src": [
     [
      "KDIGO 2024 CKD 진료지침 (Kidney Int 2024;105:S117) 원문 PDF",
      "https://kdigo.org/wp-content/uploads/2024/03/KDIGO-2024-CKD-Guideline.pdf"
     ]
    ]
   }
  ],
  "notes": [
   "KDOQI 2020 에너지 권고: 25~35 kcal/kg 이상체중/일(나이·활동량·체성분 등으로 개별화) — 대한신장학회지 요약표 기준.",
   "KDOQI 2020 원문(AJKD)은 접근이 막혀 수치를 2차 문헌(대한신장학회지 KRCP 2024 표 1, Nephrology 2022 해설 표 1)으로 확인했습니다.",
   "단백질 g/kg는 '식품 무게'가 아니라 단백질 그램 수입니다(고기 100 g ≠ 단백질 100 g)."
  ]
 },
 {
  "id": "liver",
  "lead": "간경변은 단백질과 열량을 오히려 늘리는 쪽이 기준이고, 복수가 있으면 나트륨을 제한합니다. 지방간은 체중 감량이 핵심이며 비타민 E는 조직검사로 확인된 지방간염 일부에서만 거론됩니다.",
  "items": [
   {
    "nut": "protein",
    "label": "단백질(간경변)",
    "dir": "more",
    "target": "1.2~1.5 g/kg/일 이상(유럽간학회 EASL 2019; 대한간학회 2026 복수 지침 B1). 간성뇌증이 있어도 단백질 제한은 피함(EASL A1)",
    "vsKdri": "일반 성인 권장 수준보다 높음",
    "why": "간경변은 '가속된 기아' 상태라 근육 손실을 막고 근감소증을 되돌리기 위해 단백질을 늘립니다. 과거의 간성뇌증 단백질 제한은 지금 지침에서는 권하지 않습니다.",
    "level": "guideline",
    "src": [
     [
      "EASL 2019 만성 간질환 영양 진료지침 (J Hepatol)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC6657019/"
     ],
     [
      "대한간학회 2026 간경변 복수 진료지침 (Clin Mol Hepatol)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC13430399/"
     ]
    ]
   },
   {
    "nut": "energy",
    "label": "열량(간경변)",
    "dir": "more",
    "target": "비만이 아니면 35 kcal/kg/일 이상(EASL), 복수 환자 30~35 kcal/kg/일(대한간학회). 영양불량 비대상성 간경변은 늦은 저녁 간식·아침 식사 포함. 비만 간경변은 하루 500~800 kcal 감량 + 단백질 1.5 g/kg 초과(EASL C2)",
    "vsKdri": "개인별 필요량 기준 — 공복 시간을 줄이는 식사 배분이 추가",
    "why": "밤 동안의 긴 공복이 근단백 분해를 부르므로 취침 전 간식이 권고됩니다.",
    "level": "guideline",
    "src": [
     [
      "EASL 2019 만성 간질환 영양 진료지침 (J Hepatol)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC6657019/"
     ],
     [
      "대한간학회 2026 간경변 복수 진료지침 (Clin Mol Hepatol)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC13430399/"
     ]
    ]
   },
   {
    "nut": "sodium",
    "label": "나트륨(복수)",
    "dir": "limit",
    "target": "복수가 있으면 소금 5 g 미만(나트륨 2,000 mg 미만, 88 mmol; 대한간학회 2026 B1). EASL: 약 80 mmol(나트륨 2 g)로 제한하되 60 mmol 미만으로는 낮추지 않음",
    "vsKdri": "19~64세 KDRI 만성질환위험감소섭취량 2,300 mg보다 낮음(65~74세 1,900 mg·75세 이상 1,800 mg과는 비슷한 수준)",
    "why": "지나친 저염은 식사량을 줄여 영양불량을 부를 수 있어 하한도 함께 제시됩니다. 수분 제한은 심한 저나트륨혈증(혈청 나트륨 125 mmol/L 미만)이 아니면 필요하지 않습니다(대한간학회 B1).",
    "level": "guideline",
    "src": [
     [
      "대한간학회 2026 간경변 복수 진료지침 (Clin Mol Hepatol)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC13430399/"
     ],
     [
      "EASL 2019 만성 간질환 영양 진료지침 (J Hepatol)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC6657019/"
     ]
    ]
   },
   {
    "nut": "energy",
    "label": "체중 감량(지방간·MASLD)",
    "dir": "limit",
    "target": "체중 3~5% 감량은 간 지방을 줄이고, 지방간염·섬유화 개선에는 대체로 10% 넘는 감량이 필요(AASLD 2023)",
    "vsKdri": "열량 목표를 감량 목적에 맞춰 낮추는 방향",
    "why": "과잉 열량, 특히 포화지방·정제 탄수화물·가당 음료와 과당 과다 섭취가 지방간·지방간염 위험을 높입니다. 식사 구성(저탄수·저지방·지중해식·간헐적 단식 등)과 열량 제한 강도에 따른 효과는 비슷하다고 보며, 지중해식은 지속 가능성과 심혈관 이득 때문에 자주 권해집니다.",
    "level": "guideline",
    "src": [
     [
      "AASLD 2023 NAFLD 진료 가이던스 (Hepatology)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC10735173/"
     ]
    ]
   },
   {
    "nut": "vite",
    "label": "비타민 E(고용량)",
    "dir": "check",
    "target": "당뇨가 없는 대사이상 지방간염(MASH)에서 하루 800 IU가 지방간염 개선을 기대할 수 있음(대한간학회 2025, B2); 미국간학회 AASLD는 '선택된 일부'에서 고려. 단순 지방간·일반인 대상 권고 아님",
    "vsKdri": "KDRI 충분섭취량 12 mg α-TE의 수십 배 — 800 IU(천연형 RRR-α-토코페롤, 1 IU≈0.67 mg)는 약 536 mg로 KDRI 상한 540 mg에 근접",
    "why": "PIVENS 시험에서 간 염증은 줄었으나 섬유화 개선은 없었습니다. 장기 투여 시 전립선암·출혈성 뇌졸중 증가, 400 IU 초과 고용량의 사망률 증가 가능성이 거론돼 의료진 판단이 전제입니다.",
    "level": "guideline",
    "src": [
     [
      "대한간학회 2025 MASLD 진료지침 (Clin Mol Hepatol)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11925433/"
     ],
     [
      "AASLD 2023 NAFLD 진료 가이던스 (Hepatology)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC10735173/"
     ]
    ]
   },
   {
    "nut": "vitd",
    "label": "비타민 D",
    "dir": "check",
    "target": "간경변에서 25(OH)D 측정 권고; 20 ng/mL 미만이면 경구 보충해 30 ng/mL 초과를 목표(EASL B1)",
    "vsKdri": "KDRI 충분섭취량(10~15 µg)은 그대로 — 결핍 여부는 검사로",
    "why": "만성 간질환에서 비타민 D 결핍(<20 ng/mL)은 64~92%로 흔하고 예후와 연관됩니다.",
    "level": "guideline",
    "src": [
     [
      "EASL 2019 만성 간질환 영양 진료지침 (J Hepatol)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC6657019/"
     ]
    ]
   },
   {
    "nut": "vita",
    "label": "비타민 A(고용량 보충제)",
    "dir": "limit",
    "target": "고용량 비타민 A 보충제 피함 — 음식 수준 섭취는 KDRI 그대로",
    "vsKdri": "KDRI 상한 3,000 µg RAE(레티놀 기준)를 넘지 않도록",
    "why": "NIH LiverTox는 고용량 비타민 A가 간손상·황달·간비대·문맥고혈압·간경변을 일으킬 수 있다고 기술합니다. EASL은 미량영양소·비타민(철 포함)은 결핍이 확인되거나 임상적으로 의심될 때 교정하라고 권고합니다.",
    "level": "review",
    "src": [
     [
      "NIH LiverTox — Vitamin A (PubMed 31643494)",
      "https://pubmed.ncbi.nlm.nih.gov/31643494/"
     ],
     [
      "EASL 2019 만성 간질환 영양 진료지침 (J Hepatol)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC6657019/"
     ]
    ]
   }
  ],
  "notes": [
   "철·아연 등 미량영양소는 '결핍이 확인되거나 임상적으로 의심될 때' 보충하는 것이 EASL 권고(II-1, C1)입니다.",
   "유럽간학회(EASL)는 비대상성 간경변에서 종합비타민 경구 투여 과정이 정당화될 수 있다고 기술합니다(값싸고 부작용이 거의 없다는 이유). 투여 여부는 담당 의료진이 판단합니다."
  ]
 },
 {
  "id": "osteo",
  "lead": "골다공증은 칼슘과 비타민 D 목표가 일반 성인보다 올라가지만, 칼슘은 식사가 우선이고 고용량 보충제는 오히려 주의 대상입니다.",
  "items": [
   {
    "nut": "calcium",
    "label": "칼슘",
    "dir": "more",
    "target": "하루 800~1,000 mg(대한골대사학회 2015; 50세 이상 남성·폐경 후 여성). 음식이 최선이며 식사로 부족할 때 보충제 고려",
    "vsKdri": "KDRI 권장(50세 이상 남 800 mg·여 750 mg)보다 남성 0~200 mg, 여성 50~250 mg 높음",
    "why": "800~1,200 mg 수준에서 골밀도와의 양의 연관이 관찰됐습니다. 대한폐경학회 2024 지침은 칼슘이 '역치 영양소'라 그 이상은 추가 이득이 없고, 고용량 보충제는 심혈관·신장결석 위험 우려로 신중해야 한다고 기술합니다.",
    "level": "guideline",
    "src": [
     [
      "대한골대사학회 2015 칼슘·비타민 D 입장문 (J Bone Metab)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC4691588/"
     ],
     [
      "대한폐경학회 2024 골다공증 지침 Part I (J Menopausal Med)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11103071/"
     ]
    ]
   },
   {
    "nut": "vitd",
    "label": "비타민 D",
    "dir": "more",
    "target": "하루 800 IU 초과(대한골대사학회 2015). 25(OH)D 30 ng/mL를 목표로 하는 환자는 하루 800~1,000 IU(20~25 µg) (2022 입장문). 골다공증 약 복용 시 25(OH)D 20 ng/mL 이상, 골흡수억제제 사용 시 30 ng/mL 이상이 더 효과적일 수 있음",
    "vsKdri": "KDRI 충분섭취량(64세 이하 10 µg=400 IU, 65세 이상 15 µg=600 IU)보다 높음; 상한 100 µg(4,000 IU) 이내",
    "why": "대한골대사학회는 25(OH)D 50 ng/mL 초과는 오히려 해로울 수 있다고 보고, 간헐적 고용량보다 매일 복용을 더 권합니다. 대한폐경학회 2024는 폐경 후 여성에서 800 IU/일을 권고합니다.",
    "level": "guideline",
    "src": [
     [
      "대한골대사학회 2015 칼슘·비타민 D 입장문 (J Bone Metab)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC4691588/"
     ],
     [
      "대한골대사학회 2022 비타민 D 입장문 (J Bone Metab)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC9760769/"
     ],
     [
      "대한폐경학회 2024 골다공증 지침 Part I (J Menopausal Med)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11103071/"
     ]
    ]
   },
   {
    "nut": "protein",
    "label": "단백질",
    "dir": "more",
    "target": "고령 골다공증 환자에서 0.8 g/kg/일 초과가 골밀도 증가·골절 감소와 연관, 한국 연구는 0.9 g/kg 이상을 제시. 2 g/kg 초과는 소변 칼슘 배설 증가(대한폐경학회 2024)",
    "vsKdri": "KDRI 2025 성인 권장섭취량(약 0.91 g/kg/일; 50세 이상 남 60 g·여 50 g)과 비슷한 수준 — 부족하지 않게 채우는 방향",
    "why": "단백질은 뼈 부피의 절반을 차지하며, 고관절 골절 후 적절한 단백질 보충은 재원 기간 단축과 기능 회복에 도움이 됐다고 보고됩니다. 신장질환이 있으면 신장 탭 기준이 우선합니다.",
    "level": "guideline",
    "src": [
     [
      "대한폐경학회 2024 골다공증 지침 Part I (J Menopausal Med)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11103071/"
     ]
    ]
   },
   {
    "nut": "vita",
    "label": "비타민 A",
    "dir": "limit",
    "target": "하루 10,000 IU 이상 장기 섭취는 피함(대한폐경학회 2024)",
    "vsKdri": "KDRI 상한 3,000 µg RAE(≈10,000 IU)와 같은 선",
    "why": "과량의 비타민 A는 뼈 건강에 해로울 수 있습니다.",
    "level": "guideline",
    "src": [
     [
      "대한폐경학회 2024 골다공증 지침 Part I (J Menopausal Med)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11103071/"
     ]
    ]
   }
  ],
  "notes": [
   "대한폐경학회 2024: 비타민 K·이소플라본·오메가-3·마그네슘 보충의 골절·골밀도 효과는 아직 확정되지 않았습니다."
  ]
 },
 {
  "id": "hf_af",
  "lead": "심부전은 나트륨 제한이 기본이지만 지나친 저염의 이득은 입증되지 않았고, 수분 제한은 저나트륨혈증 때 적용됩니다. 와파린을 복용하면 비타민 K는 '줄이기'가 아니라 '매일 일정하게'가 기준입니다.",
  "items": [
   {
    "nut": "sodium",
    "label": "나트륨(심부전)",
    "dir": "limit",
    "target": "증상 있는 심부전에서 나트륨 제한(IIa, C); 중등도~중증 심부전은 나트륨 하루 2 g 미만 권장(대한심장학회 2017)",
    "vsKdri": "19~64세 KDRI 만성질환위험감소섭취량 2,300 mg보다 약간 낮음(65~74세 1,900 mg·75세 이상 1,800 mg과는 비슷한 수준)",
    "why": "과도한 염분 제한은 신경호르몬계를 활성화할 수 있다는 우려도 지침에 함께 적혀 있습니다. SODIUM-HF 시험(외래 심부전, NYHA 2~3)에서 1,500 mg 미만 목표 식사는 1년 내 사망·심혈관 입원·응급실 방문을 줄이지 못했습니다.",
    "level": "guideline",
    "src": [
     [
      "대한심장학회 2017 만성 심부전 진료지침 (Korean Circ J)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC5614939/"
     ],
     [
      "SODIUM-HF 무작위 시험 (Lancet 2022; PubMed 35381194)",
      "https://pubmed.ncbi.nlm.nih.gov/35381194/"
     ]
    ]
   },
   {
    "nut": "water",
    "label": "수분",
    "dir": "check",
    "target": "저나트륨혈증이 있고 다른 원인이 없으면 하루 800~1,000 mL로 수분 제한 가능(대한심부전학회 2022)",
    "vsKdri": "KDRI 수분 충분섭취량(음식+음료 총수분, 성인 남 2,100~2,600 mL·여 1,800~2,100 mL)을 일률적으로 줄이지 않음 — 수분 제한은 저나트륨혈증 등 검사 소견이 있을 때 담당 의료진이 결정",
    "why": "체중이 하루 2 kg 넘게 늘면 급성 악화 위험이 높아 의료진 연락과 염분 제한 강화가 권고됩니다(2017 지침).",
    "level": "guideline",
    "src": [
     [
      "대한심부전학회 2022 심부전 진료지침: 치료 (Int J Heart Fail 2023)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC10172080/"
     ],
     [
      "대한심장학회 2017 만성 심부전 진료지침 (Korean Circ J)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC5614939/"
     ]
    ]
   },
   {
    "nut": "potassium",
    "label": "칼륨",
    "dir": "check",
    "target": "알도스테론 길항제(MRA) 시작 전 신기능·전해질 확인, eGFR 30 미만 또는 칼륨 5.0 mEq/L 초과면 신중 투여. 이뇨제 시작 시 저칼륨혈증(≤3.5 mEq/L)이 있으면 칼륨 보존 이뇨제 또는 칼륨 보충을 의료진이 판단(2017 지침)",
    "vsKdri": "KDRI 충분섭취량 3,500 mg은 그대로 — 보충제·칼륨 소금은 혈액검사 기준",
    "why": "MRA·ACE억제제·ARB는 고칼륨혈증을, 루프·티아지드 이뇨제는 저칼륨혈증을 일으킬 수 있어 방향이 약에 따라 반대입니다. 미국 2025 AHA/ACC는 고칼륨혈증 위험 상황에서 칼륨 대체 소금을 권하지 않습니다.",
    "level": "guideline",
    "src": [
     [
      "대한심부전학회 2022 심부전 진료지침: 치료 (Int J Heart Fail 2023)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC10172080/"
     ],
     [
      "대한심장학회 2017 만성 심부전 진료지침 (Korean Circ J)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC5614939/"
     ],
     [
      "2025 AHA/ACC 고혈압 지침 비교 해설 (Nephrol Dial Transplant 2026)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC13624793/"
     ]
    ]
   },
   {
    "nut": "vitk",
    "label": "비타민 K(와파린 복용 시)",
    "dir": "same",
    "target": "와파린 복용 시 식사 비타민 K 섭취를 일정하게 유지(미국 2023 ACC/AHA 심방세동 지침, INR 2~3 관리 권고의 일부)",
    "vsKdri": "KDRI 충분섭취량(남 75 µg·여 65 µg) 수준 그대로 — 핵심은 '매일 비슷하게'",
    "why": "비타민 K 섭취가 갑자기 늘거나 줄면 INR이 흔들립니다.",
    "level": "guideline",
    "src": [
     [
      "2023 ACC/AHA/ACCP/HRS 심방세동 지침 (Circulation 2024)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11095842/"
     ]
    ]
   },
   {
    "nut": "other",
    "label": "오메가-3 보충제(심방세동)",
    "dir": "nosupp",
    "target": "심방세동 예방 목적의 오메가-3 보충은 효과가 없거나 오히려 심방세동을 늘릴 가능성(미국 2023 ACC/AHA 심방세동 지침). 메타분석: 보충 시 심방세동 위험 HR 1.25, 1 g/일 초과 HR 1.49",
    "vsKdri": "KDRI 2025 EPA+DHA 충분섭취량은 성인 250 mg/일(식사 기준) — 1 g/일 넘는 보충제 용량과는 구분",
    "why": "혈중 오메가-3 수치는 심방세동과 반비례했지만, 보충제 무작위 시험에서는 용량이 높을수록 위험이 증가했습니다(1 g당 HR 1.11).",
    "level": "meta",
    "src": [
     [
      "2023 ACC/AHA/ACCP/HRS 심방세동 지침 (Circulation 2024)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11095842/"
     ],
     [
      "오메가-3 보충과 심방세동 위험 메타분석 (Circulation 2021; PubMed 34612056)",
      "https://pubmed.ncbi.nlm.nih.gov/34612056/"
     ]
    ]
   },
   {
    "nut": "iron",
    "label": "철",
    "dir": "check",
    "target": "철 결핍이 확인된 심부전(특히 LVEF 50% 미만 최근 입원)에서 정맥 철분 투여가 합리적(IIa). 경구 철분은 페리틴을 거의 올리지 못함(대한심부전학회 2022)",
    "vsKdri": "KDRI 권장 섭취량은 그대로 — 보충은 혈액검사(페리틴·트랜스페린 포화도) 기준",
    "why": "심부전 환자의 약 50%가 철 결핍이며, 경구 철분 16주 투여는 운동능력을 개선하지 못했습니다. 일반 철분 보충제는 이 근거의 대상이 아닙니다.",
    "level": "guideline",
    "src": [
     [
      "대한심부전학회 2022 진료지침: 동반질환(철 결핍) (Int J Heart Fail 2023)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC10406556/"
     ]
    ]
   }
  ],
  "notes": [
   "미국 2023 ACC/AHA 심방세동 지침: 심방세동 발작 예방 목적으로 카페인을 끊도록 권하는 것은 이득이 없다고 보며(카페인이 증상을 유발한다고 느끼는 경우는 예외), 리듬 조절을 원하면 음주를 최소화하거나 끊는 것이 권고됩니다."
  ]
 },
 {
  "id": "thyroid",
  "lead": "한국은 요오드 섭취가 충분하거나 넘치는 지역이라, 갑상선질환에서는 요오드를 '보충'하기보다 해조류·요오드 보충제의 과다를 점검하는 쪽이 근거에 가깝습니다.",
  "items": [
   {
    "nut": "iodine",
    "label": "요오드",
    "dir": "limit",
    "target": "해조류·요오드 함유 보충제의 과다 섭취 점검. 국내 연구: 하시모토 갑상선기능저하증 환자가 하루 100 µg 미만으로 3개월 제한 시 78.3%가 정상 기능 회복(대조군 45.5%); 요오드 과다(요중 요오드 ≥300 µg/L) 무증상 기능저하증에서 제한에 성공한 군(요중 요오드 <300 µg/L 도달)의 TSH 9.0→4.7 mU/L",
    "vsKdri": "KDRI 권장 150 µg, 상한 2,400 µg — 국내 성인 추정 섭취 중앙값 약 249 µg/일(요중 요오드 기반), 13.4%가 상한 초과",
    "why": "요오드 과잉은 감수성 있는 사람에서 갑상선호르몬 합성을 억제해 가역적 기능저하를 일으킬 수 있습니다. 단, 이 수치는 진료지침이 아닌 국내 개별 연구 결과이므로 제한 여부는 의료진과 상의가 전제입니다.",
    "level": "review",
    "src": [
     [
      "하시모토 갑상선기능저하증 요오드 제한 연구 (Yonsei Med J 2003; PubMed 12728462)",
      "https://pubmed.ncbi.nlm.nih.gov/12728462/"
     ],
     [
      "무증상 갑상선기능저하증 요오드 제한 코호트 (Thyroid 2014; PubMed 24892764)",
      "https://pubmed.ncbi.nlm.nih.gov/24892764/"
     ],
     [
      "국민건강영양조사 요오드 영양상태 (Eur J Nutr 2019; PubMed 29188371)",
      "https://pubmed.ncbi.nlm.nih.gov/29188371/"
     ],
     [
      "한국인 식이 요오드 섭취 분석 (Nutr Res Pract 2025)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12518750/"
     ],
     [
      "요오드 과잉과 레보티록신 중단 (Endocrinol Metab 2026, 대한내분비학회지)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC13341182/"
     ]
    ]
   },
   {
    "nut": "selenium",
    "label": "셀레늄",
    "dir": "check",
    "target": "유럽 EUGOGO 2021: 경증·활동성 갑상선눈병증에서 셀레늄(셀레늄 결핍 지역 기준; 유럽 시험 용량 100 µg 하루 2회, 6개월). 국내 3상(SeGOSS)에서는 이득이 재현되지 않음. 하시모토: 메타분석에서 TPO 항체 감소, 갑상선호르몬 치료를 받지 않는 환자에서 TSH 소폭 감소(지침 권고 아님)",
    "vsKdri": "KDRI 권장 60 µg, 상한 400 µg — 시험 용량 200 µg/일은 상한 이내지만 식사분과 합산 필요",
    "why": "한국 등 동아시아는 식사 셀레늄 섭취가 유럽보다 높아 보충 이득이 줄어들 수 있다고 국내 프레임워크가 설명합니다.",
    "level": "guideline",
    "src": [
     [
      "EUGOGO 2021 갑상선눈병증 진료지침 (PubMed 34297684)",
      "https://pubmed.ncbi.nlm.nih.gov/34297684/"
     ],
     [
      "한국 갑상선눈병증 진료 프레임워크 (Endocrinol Metab 2026)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC13341189/"
     ],
     [
      "하시모토 셀레늄 보충 메타분석 (Thyroid 2024; PubMed 38243784)",
      "https://pubmed.ncbi.nlm.nih.gov/38243784/"
     ]
    ]
   },
   {
    "nut": "other",
    "label": "칼슘·철 보충제와 레보티록신",
    "dir": "check",
    "target": "레보티록신은 탄산칼슘·황산철 등 흡수를 방해하는 보충제와 시간 간격을 둠 — 관행적으로 4시간(검증되지는 않음). 아침 식사 60분 전 또는 저녁 식사 3시간 이상 후 취침 시 일정하게 복용(미국갑상선학회 ATA 2014)",
    "vsKdri": "칼슘·철 섭취 기준(KDRI)은 그대로 — 복용 '시간'의 문제",
    "why": "탄산칼슘 동시 복용 시 흡수가 약 20% 줄었고, 철은 T4와 복합체를 만들어 TSH를 올렸습니다. 에스프레소 커피도 흡수를 떨어뜨립니다.",
    "level": "guideline",
    "src": [
     [
      "ATA 2014 갑상선기능저하증 치료 지침 (Thyroid)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC4267409/"
     ]
    ]
   }
  ],
  "notes": [
   "국내 1세 이상 인구의 식이 요오드 섭취는 분포가 크게 치우쳐 있어(중앙값 114 µg/일, 평균 785 µg/일) 부족과 과잉이 함께 존재합니다(2025 분석)."
  ]
 },
 {
  "id": "gi",
  "lead": "위장 수술·흡수장애·위산억제제 장기 복용은 B12·철·칼슘·비타민 D·티아민의 '흡수'를 떨어뜨려, 진료지침의 목표량이 일반 성인 기준보다 수 배~수백 배 높아지거나 혈액검사 확인이 기준이 됩니다.",
  "items": [
   {
    "nut": "b12",
    "label": "비타민 B12 (비만수술 후)",
    "dir": "more",
    "target": "ASMBS(미국) 비만수술 후: 경구(붕해정·설하·액상) 350–500 µg/일, 또는 주사 1,000 µg/월 — 용량·경로는 담당 의료진과 결정",
    "vsKdri": "일반 성인 권장 2.4 µg의 약 150~200배",
    "why": "ASMBS는 비만수술을 받은 모든 환자에게 B12 보충을 권고(B등급)합니다. 위에서 내인자·위산이 줄어 음식 속 B12를 흡수하지 못하기 때문입니다. 위암 위절제 환자 대상의 별도 수치 기준은 이번 조사에서 확인하지 못했습니다.",
    "level": "guideline",
    "src": [
     [
      "ASMBS 영양 가이드라인 2016 개정: 미량영양소(SOARD 2017)",
      "https://asmbs.org/wp-content/uploads/2017/06/ASMBS-Nutritional-Guidelines-2016-Update.pdf"
     ],
     [
      "Parrott 2017, PMID 28392254",
      "https://pubmed.ncbi.nlm.nih.gov/28392254/"
     ]
    ]
   },
   {
    "nut": "b12",
    "label": "비타민 B12 (위축성 위염·위산억제제 장기)",
    "dir": "check",
    "target": "고정 목표량 없음 — 혈중 B12 확인 후 의료진이 결정. 미국 IOM은 50세 이상에게 권장량을 주로 강화식품·보충제 형태로 채우도록 권고(한국 기준 아님)",
    "vsKdri": "한국 권장량 2.4 µg과 양은 같음. 한국 섭취기준에는 형태 구분이 없고, '결정형(보충제·강화식품)으로 채우라'는 것은 미국 IOM의 권고",
    "why": "미국 IOM은 노인의 10~30%가 (주로 위축성 위염으로) 음식 속 B12를 잘 흡수하지 못할 수 있다고 보고, 50세 이상은 강화식품·보충제로 권장량을 채우도록 권고합니다. 위산억제제 2년 이상 복용은 B12 결핍 위험 증가와 관련(PPI 오즈비 1.65)이 있었고, 미국소화기학회(AGA)는 자가면역 위축성 위염에서 B12·철 결핍 빈혈 평가를 권합니다.",
    "level": "guideline",
    "src": [
     [
      "미국 IOM 영양소 섭취기준: 비타민 B12 (1998)",
      "https://nap.nationalacademies.org/read/6015/chapter/11"
     ],
     [
      "Lam 2013 (JAMA), PMID 24327038",
      "https://pubmed.ncbi.nlm.nih.gov/24327038/"
     ],
     [
      "AGA 위축성 위염 임상 업데이트 2021, PMID 34454714",
      "https://pubmed.ncbi.nlm.nih.gov/34454714/"
     ]
    ]
   },
   {
    "nut": "iron",
    "label": "철",
    "dir": "more",
    "target": "ASMBS(미국) 비만수술 후: 저위험(남성·빈혈력 없음) 종합비타민으로 18 mg 이상, 월경 중 여성·위우회술·위소매절제술·십이지장전환술 후 원소철 최소 45–60 mg/일(모든 보충제 합산). 영국 BSG: 염증성 장질환 비활동기 경구철 하루 100 mg 이하(활동기는 경구철을 쓰지 않음 — 담당 의료진 판단)",
    "vsKdri": "일반 성인 권장 남 8 mg·여 12 mg(50세 미만) 대비 비만수술 후 최대 약 4~7배. 상한(45 mg)을 넘는 범위는 의료진 관리 하 용량",
    "why": "ASMBS는 철을 칼슘·위산억제제·피트산·폴리페놀 식품과 시간을 나눠 분할 복용하도록 권합니다. 염증성 장질환에서는 활동성 염증이 철 흡수를 막아 활동기에는 경구철을 쓰지 않고, 비활동기에도 원소철 100 mg 이하가 기준이며, 활동성 염증·중등도 이상 빈혈(Hb <10 g/dL)·경구철 불내성 등에서는 정맥철이 1차로 고려됩니다(BSG 2019·ECCO 2015).",
    "level": "guideline",
    "src": [
     [
      "ASMBS 영양 가이드라인 2016 개정: 미량영양소(SOARD 2017)",
      "https://asmbs.org/wp-content/uploads/2017/06/ASMBS-Nutritional-Guidelines-2016-Update.pdf"
     ],
     [
      "영국소화기학회(BSG) 염증성 장질환 가이드라인 2019 (Gut)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC6872448/"
     ],
     [
      "ECCO 철결핍·빈혈 합의 2015 (J Crohns Colitis)",
      "https://academic.oup.com/ecco-jcc/article/9/3/211/361529"
     ]
    ]
   },
   {
    "nut": "calcium",
    "label": "칼슘",
    "dir": "more",
    "target": "ASMBS(미국) 비만수술 후: 식사+보충 합계 1,200–1,500 mg/일(십이지장전환술 1,800–2,400 mg), 분할 복용. 구연산칼슘은 식사와 무관, 탄산칼슘은 식사와 함께",
    "vsKdri": "일반 성인 권장 남 800 mg·여 650~750 mg 대비 약 1.5~2.3배",
    "why": "ASMBS는 비만수술 환자 전원에게 칼슘 보충을 권고합니다. 위산이 줄면 탄산칼슘 흡수가 떨어지므로 구연산칼슘은 공복에도 흡수되는 형태로 안내됩니다. 염증성 장질환으로 스테로이드를 쓰는 기간에는 칼슘 800–1,000 mg/일이 기준입니다(BSG 2019).",
    "level": "guideline",
    "src": [
     [
      "ASMBS 영양 가이드라인 2016 개정: 미량영양소(SOARD 2017)",
      "https://asmbs.org/wp-content/uploads/2017/06/ASMBS-Nutritional-Guidelines-2016-Update.pdf"
     ],
     [
      "영국소화기학회(BSG) 염증성 장질환 가이드라인 2019 (Gut)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC6872448/"
     ]
    ]
   },
   {
    "nut": "vitd",
    "label": "비타민 D",
    "dir": "more",
    "target": "ASMBS(미국) 비만수술 후: D3 3,000 IU(75 µg)/일, 혈중 25(OH)D 30 ng/mL 초과까지(혈중 농도 기준으로 의료진이 조정). 영국 BSG: 염증성 장질환 스테로이드 사용 중 800 IU/일, 그 외에는 혈중 농도 측정 후 결핍 교정",
    "vsKdri": "한국 충분섭취량 400 IU(10 µg, 19~64세; 65세 이상 600 IU) 대비 비만수술 후 5~7.5배(상한 4,000 IU 이내)",
    "why": "ASMBS 권고는 근거 등급 D(전문가 의견 수준)이며 혈중 농도를 기준으로 조정합니다. 염증성 장질환은 비타민 D 결핍이 과반에서 흔해 BSG가 측정·교정을 제안합니다(약한 권고).",
    "level": "guideline",
    "src": [
     [
      "ASMBS 영양 가이드라인 2016 개정: 미량영양소(SOARD 2017)",
      "https://asmbs.org/wp-content/uploads/2017/06/ASMBS-Nutritional-Guidelines-2016-Update.pdf"
     ],
     [
      "영국소화기학회(BSG) 염증성 장질환 가이드라인 2019 (Gut)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC6872448/"
     ]
    ]
   },
   {
    "nut": "b1",
    "label": "티아민(B1)",
    "dir": "more",
    "target": "ASMBS(미국) 비만수술 후: 최소 12 mg/일, 가능하면 B복합제로 50 mg 하루 1~2회",
    "vsKdri": "일반 성인 권장 1.0~1.2 mg의 약 10배 이상",
    "why": "구토·섭취 감소로 티아민 결핍(베르니케 뇌병증 위험)이 생길 수 있어 ASMBS는 권장량보다 높은 보충을 제안합니다(12 mg은 C등급, 50 mg은 D등급).",
    "level": "guideline",
    "src": [
     [
      "ASMBS 영양 가이드라인 2016 개정: 미량영양소(SOARD 2017)",
      "https://asmbs.org/wp-content/uploads/2017/06/ASMBS-Nutritional-Guidelines-2016-Update.pdf"
     ]
    ]
   },
   {
    "nut": "magnesium",
    "label": "마그네슘 (PPI 장기)",
    "dir": "check",
    "target": "목표량 없음 — 장기 복용 시 혈중 마그네슘 확인이 기준",
    "vsKdri": "섭취기준 자체는 같음(남 360~380·여 280 mg). 보충은 결핍 확인 후",
    "why": "관찰연구 9편(10만 9천여 명) 메타분석에서 PPI 복용자의 저마그네슘혈증 위험이 1.43배였습니다. 예방 목적의 일상 보충을 권하는 가이드라인은 확인하지 못했습니다.",
    "level": "meta",
    "src": [
     [
      "Cheungpasitporn 2015 메타분석 (Ren Fail), PMID 26108134",
      "https://pubmed.ncbi.nlm.nih.gov/26108134/"
     ]
    ]
   },
   {
    "nut": "folate",
    "label": "엽산 (비만수술 후·메토트렉세이트 복용 IBD)",
    "dir": "more",
    "target": "ASMBS(미국) 비만수술 후: 종합비타민으로 400–800 µg/일(가임기 여성 800–1,000 µg). 영국 BSG: 메토트렉세이트 복용 시 엽산 1 mg/일 또는 5 mg/주(처방 용량)",
    "vsKdri": "일반 성인 권장 400 µg DFE 대비 같거나 높음. 메토트렉세이트 병용 용량은 처방 용량으로 보충제 상한(1,000 µg)과 별도로 의료진이 관리",
    "why": "ASMBS는 종합비타민을 통한 엽산 보충을 권고합니다(B등급). 염증성 장질환에서 메토트렉세이트는 엽산과 함께 투여해 위장·간 독성을 줄이는 것이 BSG 기준입니다.",
    "level": "guideline",
    "src": [
     [
      "ASMBS 영양 가이드라인 2016 개정: 미량영양소(SOARD 2017)",
      "https://asmbs.org/wp-content/uploads/2017/06/ASMBS-Nutritional-Guidelines-2016-Update.pdf"
     ],
     [
      "영국소화기학회(BSG) 염증성 장질환 가이드라인 2019 (Gut)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC6872448/"
     ]
    ]
   }
  ],
  "notes": [
   "설파살라진 복용자의 엽산 보충 용량은 이번에 원문으로 확인하지 못해 제외했습니다.",
   "ASMBS 권고는 비만수술 기준이며, 위암 위절제 환자에게 그대로 적용되는지는 별도 가이드라인 확인이 필요합니다."
  ]
 },
 {
  "id": "autoimmune",
  "lead": "자가면역질환 자체보다 치료약이 기준을 바꿉니다. 메토트렉세이트는 엽산 병용이 표준이고, 스테로이드를 3개월 넘게 쓰면 칼슘·비타민 D 목표가 올라갑니다.",
  "items": [
   {
    "nut": "folate",
    "label": "엽산 (메토트렉세이트 복용 시)",
    "dir": "more",
    "target": "영국 BNF·NICE CKS 처방 기준: 엽산 5 mg 주 1회, 메토트렉세이트 복용일과 다른 날(부작용 시 10 mg/주까지) — 용량·요일은 담당 의사 처방에 따름",
    "vsKdri": "일반 성인 권장 400 µg DFE/일과 성격이 다른 처방 용량. 보충제 상한(1,000 µg/일)과 별개로 의사가 관리",
    "why": "코크란 메타분석(6개 RCT, 624명)에서 엽산·폴린산 병용은 위장 부작용 26%, 간수치 상승 77%, 투약 중단 61%를 줄였고 메토트렉세이트 효과는 떨어뜨리지 않았습니다. 영국 BNF·NICE CKS·BSR가 주 5 mg을 권하고, ACR 2021은 메토트렉세이트 불내성 시 엽산 증량을 조건부 권고합니다.",
    "level": "meta",
    "src": [
     [
      "코크란 2013 (Shea), PMID 23728635",
      "https://pubmed.ncbi.nlm.nih.gov/23728635/"
     ],
     [
      "NHS SPS: 류마티스관절염 메토트렉세이트와 엽산",
      "https://www.sps.nhs.uk/articles/using-folic-acid-with-methotrexate-in-rheumatoid-arthritis/"
     ],
     [
      "ACR 류마티스관절염 치료 가이드라인 2021",
      "https://assets.contentstack.io/v3/assets/bltee37abb6b278ab2c/blt9e44ccb701e1918c/63360f6775c0be225b8d943a/ra-guideline-2021.pdf"
     ]
    ]
   },
   {
    "nut": "calcium",
    "label": "칼슘 (스테로이드 2.5 mg/일 이상 3개월 초과)",
    "dir": "more",
    "target": "ACR(미국) 2022: 식사+보충 합계 원소칼슘 1,000–1,200 mg/일까지",
    "vsKdri": "일반 성인 권장 남 800 mg·여 650~750 mg 대비 약 1.3~1.8배",
    "why": "ACR 2022는 스테로이드를 장기 사용하는 모든 성인에게 연령에 맞는 칼슘·비타민 D 섭취 최적화를 조건부 권고합니다. 골절 감소 근거의 확실성은 낮음~매우 낮음이며, 골절 위험이 중등도 이상이면 골다공증 약물 치료가 별도로 권고됩니다.",
    "level": "guideline",
    "src": [
     [
      "ACR 스테로이드 유발 골다공증 가이드라인 2022 (원고 PDF)",
      "https://assets.contentstack.io/v3/assets/bltee37abb6b278ab2c/blt819db9d198ddff2f/giop-guideline-manuscript-2022.pdf"
     ],
     [
      "Humphrey 2023, PMID 37884467",
      "https://pubmed.ncbi.nlm.nih.gov/37884467/"
     ]
    ]
   },
   {
    "nut": "vitd",
    "label": "비타민 D (스테로이드 장기 사용)",
    "dir": "more",
    "target": "ACR(미국) 2022: 혈중 25(OH)D 30–50 ng/mL 이상 유지 목표, 보통 600–800 IU(15–20 µg)/일 이상 필요(혈중 농도로 의료진이 조정)",
    "vsKdri": "일반 성인 충분섭취량 400 IU(10 µg, 65세 이상 600 IU) 대비 높음",
    "why": "ACR 2022는 혈중 비타민 D를 모니터링하고 목표 농도 유지를 위해 보충하도록 안내합니다.",
    "level": "guideline",
    "src": [
     [
      "ACR 스테로이드 유발 골다공증 가이드라인 2022 (원고 PDF)",
      "https://assets.contentstack.io/v3/assets/bltee37abb6b278ab2c/blt819db9d198ddff2f/giop-guideline-manuscript-2022.pdf"
     ]
    ]
   }
  ],
  "notes": [
   "육아종 질환(사르코이드증 등)의 비타민 D 고칼슘혈증 주의는 이번 조사에서 원문 확인을 하지 않았습니다."
  ]
 },
 {
  "id": "cancer",
  "lead": "암 치료 중에는 단백질·에너지 목표가 올라가지만, 비타민·미네랄은 권장량 수준이 기준이며 결핍이 없는 고용량 항산화제는 진료지침이 권하지 않습니다.",
  "items": [
   {
    "nut": "protein",
    "label": "단백질",
    "dir": "more",
    "target": "체중 kg당 1.0 g 초과, 가능하면 1.5 g/kg/일까지(ESPEN, 유럽). 악액질은 최소 1.2 g/kg(ESMO, 유럽)",
    "vsKdri": "일반 성인 권장(남 60~65 g·여 50~55 g, 60 kg 기준 약 0.8~1.1 g/kg)보다 높음",
    "why": "ESPEN 암 영양 가이드라인은 단백질을 1 g/kg 이상, 가능하면 1.5 g/kg까지 권합니다. ESMO는 고령·만성질환의 동화저항 때문에 최소 1.2 g/kg를 제시합니다. 신장기능 저하가 있으면 별도 조정이 필요합니다.",
    "level": "guideline",
    "src": [
     [
      "ESPEN 암 환자 영양 가이드라인 2017, PMID 27637832",
      "https://pubmed.ncbi.nlm.nih.gov/27637832/"
     ],
     [
      "Muscaritoli·Arends 2019: ESPEN 권고 요약표 (Ther Adv Med Oncol)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC6854759/"
     ],
     [
      "ESMO 암 악액질 진료지침 2021 (ESMO Open)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC8233663/"
     ]
    ]
   },
   {
    "nut": "energy",
    "label": "에너지",
    "dir": "check",
    "target": "ESPEN(유럽): 보행 가능 25–30 kcal/kg/일, 와상 20–25 kcal/kg/일(출발점, 체중·영양상태로 조정)",
    "vsKdri": "에너지 필요추정량 대신 체중 기준 목표를 사용",
    "why": "ESPEN은 총에너지소비가 대개 건강인과 비슷하다고 보고 이 범위를 출발점으로, 체중·영양상태에 따라 조정하도록 권합니다.",
    "level": "guideline",
    "src": [
     [
      "Muscaritoli·Arends 2019: ESPEN 권고 요약표 (Ther Adv Med Oncol)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC6854759/"
     ],
     [
      "ESMO 암 악액질 진료지침 2021 (ESMO Open)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC8233663/"
     ]
    ]
   },
   {
    "nut": "other",
    "label": "고용량 항산화제(비타민 A·C·E, 카로티노이드, CoQ10)",
    "dir": "nosupp",
    "target": "비타민·미네랄은 권장량과 비슷한 양. 결핍 없는 고용량 보충은 권하지 않음",
    "vsKdri": "목표는 일반 성인 권장량과 같음 — '더 먹는' 쪽이 아님",
    "why": "ESPEN은 특정 결핍이 없으면 고용량 미량영양소 사용을 권하지 않습니다. 유방암 항암 코호트(SWOG S0221, 1,134명)에서 항암 전·중 항산화 보충제 사용은 재발 위험 증가 경향(HR 1.41, P=0.06)과 관련됐습니다(관찰연구).",
    "level": "guideline",
    "src": [
     [
      "Muscaritoli·Arends 2019: ESPEN 권고 요약표 (Ther Adv Med Oncol)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC6854759/"
     ],
     [
      "SWOG S0221 보충제 코호트(J Clin Oncol 2020), PMID 31855498",
      "https://pubmed.ncbi.nlm.nih.gov/31855498/"
     ]
    ]
   },
   {
    "nut": "other",
    "label": "철·비타민 B12 단일 보충제 (항암 중)",
    "dir": "check",
    "target": "결핍 확인 시에만 — 수치 기준 없음",
    "vsKdri": "일반 성인 기준과 같음. 단일 보충제 추가는 종양내과 확인 후",
    "why": "같은 SWOG S0221 코호트에서 항암 전·중 B12 사용은 무병생존 악화(HR 1.83), 항암 중 철 사용은 재발 증가(HR 1.79)와 관련됐고, 종합비타민은 관련이 없었습니다. 관찰연구라 인과관계는 확정되지 않았습니다.",
    "level": "review",
    "src": [
     [
      "SWOG S0221 보충제 코호트(J Clin Oncol 2020), PMID 31855498",
      "https://pubmed.ncbi.nlm.nih.gov/31855498/"
     ]
    ]
   }
  ],
  "notes": [
   "페메트렉시드 등 일부 항암제는 엽산·B12 병용이 처방의 일부일 수 있습니다(이번에 라벨 원문은 확인하지 않음).",
   "국가암정보센터·대한암학회 영양 기준 수치는 이번 조사에서 확인하지 못했습니다."
  ]
 },
 {
  "id": "pregnancy",
  "lead": "임신은 엽산·철이 '더' 필요한 대표 시기이지만, 비타민 A(레티놀)는 상한을 지켜야 하고 한국인은 요오드를 이미 많이 먹는 편입니다.",
  "items": [
   {
    "nut": "folate",
    "label": "엽산",
    "dir": "more",
    "target": "USPSTF(미국): 임신 계획·가능 여성 엽산 보충제 400–800 µg/일, 임신 1개월 전부터 임신 2~3개월까지. 신경관결손 임신력 등 고위험은 4 mg(4,000 µg)/일을 써 온 관행",
    "vsKdri": "한국 기준 임신부 권장 620 µg DFE(400+220), 수유부 550 µg DFE(400+150). 보충제 상한 1,000 µg — 4 mg은 의사 처방 영역",
    "why": "USPSTF는 400–800 µg 보충을 A등급으로 권고합니다(고위험군은 적용 대상 아님). 4 mg은 이전 신경관결손 임신 여성 1,817명 RCT(MRC 1991, 72% 예방)에 근거하지만, 1 mg 초과 용량의 추가 이득은 확립되지 않았다는 비판도 있습니다.",
    "level": "guideline",
    "src": [
     [
      "USPSTF 엽산 권고 2023 (A등급)",
      "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/folic-acid-for-the-prevention-of-neural-tube-defects-preventive-medication"
     ],
     [
      "2025 한국인 영양소 섭취기준(보건복지부)",
      "https://www.mohw.go.kr/board.es?mid=a10411010200&bid=0019&act=view&list_no=1488446"
     ],
     [
      "MRC Vitamin Study (Lancet 1991), PMID 1677062",
      "https://pubmed.ncbi.nlm.nih.gov/1677062/"
     ],
     [
      "Dolin 2018 (Fetal Diagn Ther), PMID 30134243",
      "https://pubmed.ncbi.nlm.nih.gov/30134243/"
     ]
    ]
   },
   {
    "nut": "iron",
    "label": "철",
    "dir": "more",
    "target": "한국 기준 임신부 21 mg/일(19~49세). WHO는 원소철 30–60 mg + 엽산 400 µg 매일, 임신 초기부터",
    "vsKdri": "비임신 여성 12 mg에 +9 mg. 수유부 부가량 0. WHO 범위 상단(60 mg)은 한국 상한 45 mg을 넘으므로 보충 용량은 담당 의료진과 결정",
    "why": "WHO는 저체중아·산모 빈혈·철결핍 예방을 위해 임신 기간 내내 매일 철·엽산 보충을 권고하며, 빈혈 유병률 40% 이상 지역에서는 높은 용량을 선호합니다.",
    "level": "guideline",
    "src": [
     [
      "2025 한국인 영양소 섭취기준(보건복지부)",
      "https://www.mohw.go.kr/board.es?mid=a10411010200&bid=0019&act=view&list_no=1488446"
     ],
     [
      "WHO 임신 중 철분 보충",
      "https://www.who.int/data/nutrition/nlis/info/antenatal-iron-supplementation"
     ]
    ]
   },
   {
    "nut": "vita",
    "label": "비타민 A(레티놀)",
    "dir": "limit",
    "target": "상한 3,000 µg RAE(10,000 IU)/일 이하. 권장은 임신부 720 µg RAE(650+70)",
    "vsKdri": "권장량은 +70 µg로 소폭 증가, 상한은 일반 성인과 같음",
    "why": "임신부 22,748명 코호트에서 보충제 레티놀 10,000 IU/일 초과 시 약 57명 중 1명꼴로 보충제 기인 기형이 추정됐고, 위험은 임신 7주 이전 노출에 집중됐습니다. 베타카로틴은 레티놀 상한에 포함되지 않습니다.",
    "level": "review",
    "src": [
     [
      "2025 한국인 영양소 섭취기준(보건복지부)",
      "https://www.mohw.go.kr/board.es?mid=a10411010200&bid=0019&act=view&list_no=1488446"
     ],
     [
      "Rothman 1995 (NEJM), PMID 7477116",
      "https://pubmed.ncbi.nlm.nih.gov/7477116/"
     ]
    ]
   },
   {
    "nut": "iodine",
    "label": "요오드",
    "dir": "check",
    "target": "한국 기준 임신부 240 µg(150+90), 수유부 340 µg(150+190). 임신·수유 상한 미설정",
    "vsKdri": "권장량은 증가하지만, 한국 가임기 여성의 실제 섭취가 이미 이를 크게 웃도는 경우가 많음",
    "why": "국민건강영양조사(2013–2015) 분석에서 가임기 여성의 소변 기준 추정 요오드 섭취량은 평균 1,198 µg/일이었고 48%가 과잉 범위(소변 300 µg/L 이상)였고, 15%는 결핍 범위(100 µg/L 미만)였습니다. 해조류 섭취를 고려하지 않은 요오드 보충제 추가는 신중해야 합니다.",
    "level": "review",
    "src": [
     [
      "2025 한국인 영양소 섭취기준(보건복지부)",
      "https://www.mohw.go.kr/board.es?mid=a10411010200&bid=0019&act=view&list_no=1488446"
     ],
     [
      "가임기 여성 요오드 섭취 안전성(영양과 건강 저널 2021)",
      "https://e-jnh.org/DOIx.php?id=10.4163/jnh.2021.54.6.644"
     ]
    ]
   },
   {
    "nut": "dha",
    "label": "오메가-3(DHA 등)",
    "dir": "check",
    "target": "정량 목표는 이번 조사에서 미확인 — 한국 기준 요약표에 없음",
    "vsKdri": "한국 섭취기준 요약표에 임신 DHA 부가량 없음",
    "why": "코크란 2018(70개 RCT, 약 2만 명)에서 임신 중 오메가-3는 조산(37주 미만)을 줄였고(RR 0.89, 높은 확실성) 34주 미만 조기 조산도 줄였지만(RR 0.58), 42주 초과 과숙 임신은 늘 수 있었습니다(RR 1.61).",
    "level": "meta",
    "src": [
     [
      "코크란 2018 임신 중 오메가-3, PMID 30480773",
      "https://pubmed.ncbi.nlm.nih.gov/30480773/"
     ]
    ]
   }
  ],
  "notes": [
   "2025 한국인 영양소 섭취기준: 임신·수유 부가량 엽산 +220/+150 µg, 철 +9 mg(임신), 요오드 +90/+190 µg, 비타민 A 상한 3,000 µg RAE.",
   "4 mg 고위험 엽산의 대한산부인과학회 공식 문서는 이번에 확인하지 못했습니다."
  ]
 },
 {
  "id": "anticoag",
  "lead": "와파린 복용자에게 비타민 K는 '피하는' 영양소가 아니라 '매주 일정하게' 먹는 영양소이며, 출혈·상호작용 위험이 있는 보충제는 새로 시작하기 전에 의료진 확인이 기준입니다.",
  "items": [
   {
    "nut": "vitk",
    "label": "비타민 K (와파린)",
    "dir": "same",
    "target": "MedlinePlus(미국): 많이 먹지 않고, 섭취량을 주 단위로 일정하게 — 별도 목표량 없음. 식단 변경 전 담당 의료진 상의",
    "vsKdri": "일반 성인 충분섭취량(남 75·여 65 µg)과 같음. 완전히 피하는 것이 아니라 '많이 먹지 않기·변동 최소화'",
    "why": "미국 국립의학도서관(MedlinePlus)은 비타민 K가 많은 채소·식물성 기름을 피할 필요는 없지만 많이 먹지 않도록 하고, 적어도 섭취량을 날마다·주마다 바꾸지 말며 식단을 바꾸기 전 의료진과 상의하도록 안내합니다. DOAC(직접경구항응고제)는 와파린보다 음식·보충제 영향이 적고 정기적인 INR 모니터링이 필요 없습니다(상호작용 확인은 여전히 필요).",
    "level": "guideline",
    "src": [
     [
      "MedlinePlus: 와파린 복용 안내",
      "https://medlineplus.gov/ency/patientinstructions/000292.htm"
     ],
     [
      "MedlinePlus: 와파린 약물 정보",
      "https://medlineplus.gov/druginfo/meds/a682277.html"
     ],
     [
      "DOAC 식품·보충제 상호작용 리뷰 (Int J Mol Sci 2021)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC8395160/"
     ]
    ]
   },
   {
    "nut": "other",
    "label": "허브·보충제(마늘, 은행잎, 인삼, 코엔자임 Q10, 에키네시아, 세인트존스워트)",
    "dir": "check",
    "target": "새로 시작하기 전 의료진 확인 — 수치 기준 없음",
    "vsKdri": "해당 없음(섭취기준 영양소 아님)",
    "why": "MedlinePlus는 이 제품들이 와파린과 상호작용할 수 있다고 명시합니다. 세인트존스워트는 DOAC 농도를 떨어뜨릴 수 있어 항응고제 복용자는 피하도록 리뷰가 권합니다.",
    "level": "review",
    "src": [
     [
      "MedlinePlus: 와파린 약물 정보",
      "https://medlineplus.gov/druginfo/meds/a682277.html"
     ],
     [
      "DOAC 식품·보충제 상호작용 리뷰 (Int J Mol Sci 2021)",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC8395160/"
     ]
    ]
   },
   {
    "nut": "dha",
    "label": "어유(오메가-3) 보충제",
    "dir": "check",
    "target": "복용 여부·용량을 일정하게 유지, 변경 전 의료진 상의",
    "vsKdri": "해당 없음",
    "why": "MedlinePlus는 와파린 복용 중 섭취량을 일정하게 유지해야 할 품목에 어유 보충제를 포함합니다.",
    "level": "guideline",
    "src": [
     [
      "MedlinePlus: 와파린 복용 안내",
      "https://medlineplus.gov/ency/patientinstructions/000292.htm"
     ]
    ]
   },
   {
    "nut": "vite",
    "label": "비타민 E 보충제",
    "dir": "check",
    "target": "고용량 보충 전 의료진 확인 — 수치 기준 미확인",
    "vsKdri": "일반 성인 충분섭취량 12 mg α-TE",
    "why": "와파린 복용 심방세동 환자 566명 후향 코호트에서 혈중 비타민 E가 높을수록 출혈 사건이 많았습니다(관찰연구, 보충제 용량별 기준은 아님).",
    "level": "review",
    "src": [
     [
      "Pastori 2013 (J Am Heart Assoc), PMID 24166490",
      "https://pubmed.ncbi.nlm.nih.gov/24166490/"
     ]
    ]
   }
  ],
  "notes": [
   "아스피린·클로피도그렐 등 항혈소판제와 보충제의 출혈 상호작용 수치 근거는 이번 조사 범위에서 확인하지 못했습니다."
  ]
 },
 {
  "id": "smoker",
  "lead": "흡연자에게 가장 분명한 기준은 '베타카로틴 보충제를 피하라'는 것이고, 비타민 C 추가 필요량은 미국 기준에만 있으며 한국 섭취기준 요약표에는 흡연자 부가량이 없습니다.",
  "items": [
   {
    "nut": "other",
    "label": "베타카로틴 보충제",
    "dir": "nosupp",
    "target": "보충제로 복용하지 않음(식품 속 카로티노이드는 해당 없음)",
    "vsKdri": "한국 기준에 베타카로틴 별도 권장량 없음. 흡연자 대상 보충 비권고(USPSTF D등급) 방향",
    "why": "USPSTF는 심혈관질환·암 예방 목적의 베타카로틴 보충을 권하지 않으며(D등급) 흡연자·석면 노출자의 폐암 증가를 주요 위해로 듭니다. ATBC(남성 흡연자, 20 mg/일)에서 폐암 18% 증가, CARET(30 mg + 레티놀 25,000 IU)에서 폐암 상대위험 1.28이었습니다.",
    "level": "guideline",
    "src": [
     [
      "USPSTF 비타민 보충 권고 2022",
      "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/vitamin-supplementation-to-prevent-cvd-and-cancer-preventive-medication"
     ],
     [
      "ATBC 시험 (NEJM 1994), PMID 8127329",
      "https://pubmed.ncbi.nlm.nih.gov/8127329/"
     ],
     [
      "CARET 시험 (NEJM 1996), PMID 8602180",
      "https://pubmed.ncbi.nlm.nih.gov/8602180/"
     ]
    ]
   },
   {
    "nut": "vitc",
    "label": "비타민 C",
    "dir": "more",
    "target": "미국 기준: 흡연자는 권장량에 +35 mg/일(남 125·여 110 mg). 식품으로 충족 가능한 범위",
    "vsKdri": "한국 2025 기준은 성인 100 mg이며 요약표에 흡연자 부가량 없음",
    "why": "미국 IOM은 흡연자의 비타민 C 대사 회전이 하루 약 35 mg 더 많아 추가 필요량을 정했습니다. 고용량 보충의 이득을 뜻하는 수치는 아닙니다.",
    "level": "guideline",
    "src": [
     [
      "미국 IOM 영양소 섭취기준: 비타민 C (2000)",
      "https://nap.nationalacademies.org/read/9810/chapter/7"
     ],
     [
      "2025 한국인 영양소 섭취기준(보건복지부)",
      "https://www.mohw.go.kr/board.es?mid=a10411010200&bid=0019&act=view&list_no=1488446"
     ]
    ]
   },
   {
    "nut": "b6",
    "label": "비타민 B6·B12 고용량 단일 보충제 (남성 흡연자)",
    "dir": "check",
    "target": "장기 고용량(B6 20 mg/일 초과, B12 55 µg/일 초과) 단일제는 신중 — 확정 기준 아님",
    "vsKdri": "일반 성인 권장 B6 1.4~1.5 mg, B12 2.4 µg",
    "why": "VITAL 코호트(관찰연구)에서 남성의 10년 평균 B6 >20 mg/일(HR 1.82), B12 >55 µg/일(HR 1.98) 단일 보충제 사용이 폐암 증가와 관련됐고, 기저 흡연 남성에서 더 높았습니다. 종합비타민·여성에서는 관련이 없었습니다.",
    "level": "review",
    "src": [
     [
      "VITAL 코호트 (J Clin Oncol 2017), PMID 28829668",
      "https://pubmed.ncbi.nlm.nih.gov/28829668/"
     ]
    ]
   }
  ],
  "notes": [
   "2025 한국인 영양소 섭취기준 본문에 흡연자 관련 서술이 있는지는 미확인(요약표 기준으로만 확인)."
  ]
 },
 {
  "id": "stones",
  "lead": "결석 병력이 있어도 칼슘은 줄이지 않는 것이 기준이고, 줄여야 하는 쪽은 나트륨·과도한 동물성 단백질·고용량 비타민 C이며 물은 늘립니다.",
  "items": [
   {
    "nut": "water",
    "label": "수분",
    "dir": "more",
    "target": "EAU(유럽): 마시는 수분 2.5–3.0 L/일(물이 우선), 소변량 2.0–2.5 L/일. 심장·신장 질환 등으로 수분 제한 중이면 담당 의료진과 확인",
    "vsKdri": "한국 성인 수분 충분섭취량은 총 1.8~2.6 L(이 중 마시는 액체 0.9~1.2 L). 결석 예방 목표의 마시는 양은 그 약 2~3배",
    "why": "EAU 요로결석 가이드라인의 일반 예방 수칙입니다. 수분 섭취량과 결석 발생은 반복적으로 반비례 관계를 보였습니다.",
    "level": "guideline",
    "src": [
     [
      "EAU 요로결석 가이드라인: 대사 평가·재발 예방",
      "https://uroweb.org/guidelines/urolithiasis/chapter/metabolic-evaluation-and-recurrence-prevention"
     ]
    ]
   },
   {
    "nut": "calcium",
    "label": "칼슘",
    "dir": "same",
    "target": "EAU(유럽): 식사 칼슘을 제한하지 않음(EAU가 제시한 하루 필요량 1,000–1,200 mg). 칼슘 보충제는 장성 고옥살산뇨증(식사와 함께)이 아니면 권하지 않음",
    "vsKdri": "핵심은 '줄이지 않기'. EAU 수치는 한국 권장(남 800·여 650~750 mg)보다 높은 유럽 기준",
    "why": "식사 칼슘과 결석은 반비례 관계여서 EAU는 강한 이유가 없으면 칼슘 제한을 하지 않도록 합니다. 장에서 옥살산과 결합해 흡수를 막기 때문입니다.",
    "level": "guideline",
    "src": [
     [
      "EAU 요로결석 가이드라인: 대사 평가·재발 예방",
      "https://uroweb.org/guidelines/urolithiasis/chapter/metabolic-evaluation-and-recurrence-prevention"
     ]
    ]
   },
   {
    "nut": "sodium",
    "label": "나트륨",
    "dir": "limit",
    "target": "EAU(유럽): 소금(NaCl) 4–5 g/일 이하(나트륨 약 1,600–2,000 mg)",
    "vsKdri": "한국 만성질환위험감소섭취량(2,300 mg)보다 낮은 목표",
    "why": "나트륨이 많으면 소변 칼슘 배설이 늘고 구연산이 줄어 결석 위험이 커집니다. 단, 나트륨 제한 단독의 전향적 시험은 없다고 EAU는 밝힙니다.",
    "level": "guideline",
    "src": [
     [
      "EAU 요로결석 가이드라인: 대사 평가·재발 예방",
      "https://uroweb.org/guidelines/urolithiasis/chapter/metabolic-evaluation-and-recurrence-prevention"
     ]
    ]
   },
   {
    "nut": "protein",
    "label": "동물성 단백질",
    "dir": "limit",
    "target": "EAU(유럽): 동물성 단백질 0.8–1.0 g/kg/일 이내",
    "vsKdri": "동물성 단백질에 한정한 상한. 총 단백질 권장량(남 60~65 g·여 50~55 g)과는 별개로 과잉만 피함",
    "why": "EAU는 동물성 단백질 과잉이 소변 칼슘·요산을 늘리고 구연산을 줄인다고 보고 이 범위로 제한하도록 합니다. 성장기 아동은 제한에 주의합니다.",
    "level": "guideline",
    "src": [
     [
      "EAU 요로결석 가이드라인: 대사 평가·재발 예방",
      "https://uroweb.org/guidelines/urolithiasis/chapter/metabolic-evaluation-and-recurrence-prevention"
     ]
    ]
   },
   {
    "nut": "vitc",
    "label": "비타민 C 보충제",
    "dir": "limit",
    "target": "과도한 섭취 피하기(칼슘옥살산 결석). 남성 보충제 1,000 mg/일 이상에서 위험 증가 관찰",
    "vsKdri": "일반 성인 권장 100 mg, 상한 2,000 mg — 상한보다 훨씬 낮은 보충 용량(1,000 mg/일)에서도 남성의 첫 결석 위험 증가가 관찰됨. 결석 병력자용 수치 기준은 없음",
    "why": "비타민 C는 옥살산의 전구체이며, 결석 위험 인자로서의 역할은 논란이 있지만 EAU는 칼슘옥살산 결석 환자에게 과다 섭취를 피하도록 권합니다. 대규모 코호트에서 남성의 보충제 1,000 mg/일 이상은 첫 결석 발생 위험 HR 1.19였고 여성·식품 비타민 C는 관련이 없었습니다.",
    "level": "guideline",
    "src": [
     [
      "EAU 요로결석 가이드라인: 대사 평가·재발 예방",
      "https://uroweb.org/guidelines/urolithiasis/chapter/metabolic-evaluation-and-recurrence-prevention"
     ],
     [
      "Ferraro 2016 (Am J Kidney Dis), PMID 26463139",
      "https://pubmed.ncbi.nlm.nih.gov/26463139/"
     ]
    ]
   },
   {
    "nut": "other",
    "label": "옥살산 많은 식품",
    "dir": "limit",
    "target": "과량 섭취 제한 — 특히 소변 옥살산이 높은 경우",
    "vsKdri": "해당 없음(섭취기준 영양소 아님)",
    "why": "EAU는 옥살산 부하를 막기 위해 옥살산이 많은 식품의 과량 섭취를 제한하도록 하며, 소변 검사로 고옥살산뇨가 확인된 환자에게 특히 해당합니다.",
    "level": "guideline",
    "src": [
     [
      "EAU 요로결석 가이드라인: 대사 평가·재발 예방",
      "https://uroweb.org/guidelines/urolithiasis/chapter/metabolic-evaluation-and-recurrence-prevention"
     ]
    ]
   }
  ],
  "notes": [
   "AUA 2026 개정판(J Urol, PMID 42529981)은 초록에 수치가 없어 원문 수치를 확인하지 못했습니다. 위 수치는 EAU 웹판 기준입니다.",
   "결석 성분(요산·시스틴 등)과 24시간 소변 검사 결과에 따라 기준이 달라집니다."
  ]
 },
 {
  "id": "gout",
  "lead": "ACR 2020 통풍 가이드라인은 비타민 C 보충제를 '권하지 않는' 쪽으로 바꿨고, 음주·퓨린·과당 제한과 과체중 시 체중 감량을 조건부 권고합니다.",
  "items": [
   {
    "nut": "vitc",
    "label": "비타민 C 보충제",
    "dir": "nosupp",
    "target": "ACR(미국) 2020: 통풍 치료 목적의 추가는 조건부 비권고",
    "vsKdri": "식사 기준(100 mg)은 일반 성인과 같음. 보충제 추가만 비권고",
    "why": "소규모 RCT 2편(29명·40명)에서 요산 변화가 임상적으로 의미 없었다며 ACR이 이전의 사용 지지를 철회했습니다(근거 확실성 낮음).",
    "level": "guideline",
    "src": [
     [
      "ACR 통풍 가이드라인 2020",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC10563586/"
     ],
     [
      "FitzGerald 2020, PMID 32391934",
      "https://pubmed.ncbi.nlm.nih.gov/32391934/"
     ]
    ]
   },
   {
    "nut": "other",
    "label": "알코올",
    "dir": "limit",
    "target": "음주 제한(조건부 권고, 확실성 낮음)",
    "vsKdri": "해당 없음",
    "why": "직전 24시간 1~2잔 초과 음주 시 발작 위험 40% 증가(용량-반응), 금주·절주자의 요산은 1.6 mg/dL 낮았습니다.",
    "level": "guideline",
    "src": [
     [
      "ACR 통풍 가이드라인 2020",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC10563586/"
     ]
    ]
   },
   {
    "nut": "other",
    "label": "퓨린",
    "dir": "limit",
    "target": "퓨린 섭취 제한(조건부 권고, 확실성 낮음)",
    "vsKdri": "해당 없음",
    "why": "퓨린 섭취량과 발작 위험에 용량-반응 관계가 있었지만, 저퓨린 교육 RCT(29명)에서는 요산이 낮아지지 않아 식이 효과는 작다고 ACR은 설명합니다.",
    "level": "guideline",
    "src": [
     [
      "ACR 통풍 가이드라인 2020",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC10563586/"
     ]
    ]
   },
   {
    "nut": "other",
    "label": "고과당 옥수수시럽(과당)",
    "dir": "limit",
    "target": "고과당 옥수수시럽 섭취 제한(조건부 권고, 확실성 매우 낮음)",
    "vsKdri": "해당 없음",
    "why": "과당 1 g/kg 섭취 시 2시간 내 혈중 요산이 1~2 mg/dL 올랐고, 간호사 건강연구에서 섭취가 많을수록 통풍 발생이 많았습니다.",
    "level": "guideline",
    "src": [
     [
      "ACR 통풍 가이드라인 2020",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC10563586/"
     ]
    ]
   },
   {
    "nut": "energy",
    "label": "체중(에너지)",
    "dir": "limit",
    "target": "ACR(미국) 2020: 과체중·비만이면 체중 감량 프로그램(특정 식단 지정 없음, 조건부 권고)",
    "vsKdri": "에너지 필요추정량보다 감량 방향",
    "why": "ACR은 체중 감량에 따른 요산 저하·발작 감소 자료를 근거로 조건부 권고합니다(확실성 매우 낮음).",
    "level": "guideline",
    "src": [
     [
      "ACR 통풍 가이드라인 2020",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC10563586/"
     ]
    ]
   }
  ],
  "notes": [
   "체리·유제품 단백질은 근거 확실성이 낮아 ACR이 권고를 내리지 않았습니다.",
   "대한류마티스학회 2023 한국 통풍 가이드라인(KJIM)에서는 식이 보충제 관련 수치 권고를 확인하지 못했습니다."
  ]
 },
 {
  "id": "surgery",
  "lead": "수술 전 보충제 중단은 상당 부분 '관례·전문가 합의'에 기반합니다. 마늘·은행잎·인삼은 출혈, 일부 허브는 마취 상호작용 우려가 있고, 어유는 무작위시험에서 출혈 증가가 없었습니다.",
  "items": [
   {
    "nut": "other",
    "label": "마늘·은행잎·인삼 보충제",
    "dir": "check",
    "target": "수술팀 지시에 따라 중단 — ASA 환자 안내는 '경우에 따라 최소 2주 전 중단'",
    "vsKdri": "해당 없음(섭취기준 영양소 아님)",
    "why": "JAMA 리뷰는 마늘·은행잎·인삼의 출혈 영향을 직접적 위험으로 정리했습니다. SPAQI 합의(83종)는 이득이 입증되지 않은 허브 보충제는 수술 전 일시 중단해도 손해가 적다는 원칙을 따릅니다. 이는 RCT가 아닌 전문가 합의·리뷰 수준 근거입니다.",
    "level": "review",
    "src": [
     [
      "Ang-Lee 2001 (JAMA), PMID 11448284",
      "https://pubmed.ncbi.nlm.nih.gov/11448284/"
     ],
     [
      "SPAQI 합의문 2021 (Mayo Clin Proc), PMID 33741131",
      "https://pubmed.ncbi.nlm.nih.gov/33741131/"
     ],
     [
      "미국마취과학회(ASA) 환자 안내: 허브·보충제와 마취",
      "https://madeforthismoment.asahq.org/wp-content/uploads/2020/10/ASA_Supplements-Anesthesia_Updated-1.pdf"
     ]
    ]
   },
   {
    "nut": "other",
    "label": "세인트존스워트·카바·발레리안",
    "dir": "check",
    "target": "수술 전 복용 사실 알리고 중단 여부는 마취과 지시 기준",
    "vsKdri": "해당 없음",
    "why": "카바·발레리안은 마취제의 진정 효과를 강화하고, 세인트존스워트는 수술 중 쓰는 여러 약의 대사를 빠르게 할 수 있습니다(JAMA 리뷰).",
    "level": "review",
    "src": [
     [
      "Ang-Lee 2001 (JAMA), PMID 11448284",
      "https://pubmed.ncbi.nlm.nih.gov/11448284/"
     ],
     [
      "미국마취과학회(ASA) 환자 안내: 허브·보충제와 마취",
      "https://madeforthismoment.asahq.org/wp-content/uploads/2020/10/ASA_Supplements-Anesthesia_Updated-1.pdf"
     ]
    ]
   },
   {
    "nut": "dha",
    "label": "어유(오메가-3)",
    "dir": "check",
    "target": "일괄 중단 근거는 약함 — 수술팀 판단 기준",
    "vsKdri": "해당 없음",
    "why": "심장수술 1,516명 무작위시험(수술 전 EPA+DHA 8–10 g 2~5일, 이후 2 g/일)에서 주요 출혈은 늘지 않았고(OR 0.81) 수혈량은 오히려 줄었습니다. 연구진은 '어유 중단·수술 연기' 관행의 재검토를 제안했습니다.",
    "level": "review",
    "src": [
     [
      "Akintoye 2018 OPERA 출혈 분석 (Circ Cardiovasc Qual Outcomes), PMID 30571332",
      "https://pubmed.ncbi.nlm.nih.gov/30571332/"
     ]
    ]
   }
  ],
  "notes": [
   "비타민 E의 수술 전 중단 근거는 이번 조사에서 원문을 확인하지 못해 제외했습니다.",
   "SPAQI 합의문의 성분별 중단 기간(일수)은 원문 접근이 막혀 확인하지 못했습니다.",
   "ASRA(마취통증의학회) 항혈전제·부위마취 가이드라인 5판(2025)의 허브 관련 문구는 원문 미확인입니다."
  ]
 }
];
