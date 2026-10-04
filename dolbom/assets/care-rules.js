/* 모심 — 돌봄 추천 규칙
 *
 * 조건·결과·예외·출처·기준일을 이 파일 한 곳에서 관리한다.
 * 화면(gajok.html)은 recommendCare(state) 하나만 호출한다.
 * recommendCare 는 순수 함수다 — DOM·네트워크·저장소를 건드리지 않는다.
 *
 * 설계 원칙
 *  1) 자격·급여·배정을 단정하지 않는다. 조사·판정은 공단과 지자체의 몫이다.
 *  2) 모르면 모른다고 하고 상담 경로를 준다. 빈 화면을 돌려주지 않는다.
 *  3) 의료행위가 필요한 경우 개인 구직 목록으로 보내지 않는다.
 */

window.CARE_RULES = {
  기준일: '2026-10-04',

  출처: {
    장기요양자격: {
      이름: '노인장기요양보험 — 신청 대상',
      url: 'https://www.longtermcare.or.kr',
      요지: '만 65세 이상, 또는 65세 미만이면서 노인성 질병(치매·뇌혈관질환·파킨슨병 등)이 있고, ' +
            '6개월 이상 혼자서 일상생활을 수행하기 어렵다고 인정되는 사람'
    },
    본인부담: {
      이름: '장기요양 본인부담금',
      url: 'https://www.longtermcare.or.kr',
      확인일: '2026-10-04'
    },
    상담: {
      공단: { 이름: '국민건강보험공단', 전화: '1577-1000' },
      복지상담: { 이름: '보건복지상담센터', 전화: '129',
                 안내: '일반 복지상담은 평일 09~18시. 긴급복지지원 등 일부는 24시간 운영.' },
      치매: { 이름: '치매상담콜센터', 전화: '1899-9988', 안내: '24시간' }
    }
  },

  // 급여비용에 대한 본인부담률(%). 비급여·한도 초과분은 여기에 포함되지 않는다.
  본인부담: {
    일반:   { 재가: 15, 시설: 20 },
    감경40: { 재가: 9,  시설: 12, 대상: '건강보험료 순위 25% 초과 ~ 50% 이하' },
    감경60: { 재가: 6,  시설: 8,  대상: '의료급여 2종, 건강보험료 하위 25% 이하 등' },
    면제:   { 대상: '생계급여·의료급여(1종) 수급자', 설명: '급여비용 본인부담 없음' },
    예외: '식사재료비·상급침실 차액·이미용비 등 비급여와, 월 한도액을 넘긴 금액은 ' +
          '감경·면제 대상이어도 전액 본인이 부담한다.'
  },

  // 의료행위는 면허를 가진 제공기관을 통해야 한다. 개인 구직으로 연결하지 않는다.
  의료서비스: [
    { 이름: '장기요양 방문간호',   제공: '방문간호기관의 간호사·간호조무사(지시서 필요)', 경로: '장기요양 등급 + 방문간호지시서' },
    { 이름: '의료기관 가정간호',   제공: '의료기관 소속 가정전문간호사',                  경로: '주치의 의뢰' },
    { 이름: '방문진료(재택의료)', 제공: '의사',                                          경로: '방문진료 수행 의료기관 신청' }
  ]
};

/**
 * 장기요양 등급 신청 가능성 판정.
 * 자격을 확정하지 않는다. 다음 행동을 고르기 위한 분류일 뿐이다.
 * 반환: 'unknown' | 'disability' | 'not_ltc' | 'short_term' | 'maybe' | 'likely' | 'has_grade'
 */
window.judgeLtc = function (state) {
  var ctx = function (v) { return state.context && state.context.has(v); };
  if (ctx('ltc')) return 'has_grade';
  if (!state.who || state.who === 'unknown') return 'unknown';
  if (state.who === 'disabled') return 'disability';

  // 연령·질병 요건: 만 65세 이상이거나, 65세 미만이면서 노인성 질병이 있는 경우
  var 연령질병충족 = (state.who === 'senior' || state.who === 'disease');
  if (!연령질병충족) {
    // 65세 미만이고 노인성 질병이 아닌 경우(예: 수술 후 회복) — 장기요양 대상이 아니다.
    return state.duration === 'short' ? 'short_term' : 'not_ltc';
  }
  if (state.duration === 'short') return 'short_term';
  if (!state.duration || state.duration === 'unknown') return 'maybe';

  var 도움필요 = ['partial', 'most', 'bed'].indexOf(state.mobility) >= 0;
  var 인지저하 = ['mild', 'severe'].indexOf(state.cognition) >= 0;
  if (!도움필요 && !인지저하) return 'maybe';
  return 'likely';
};

/**
 * 추천 카드 목록을 만든다. 순수 함수.
 * @param {{who:string, mobility:string, cognition:string, duration:string,
 *          needs:Set<string>, context:Set<string>}} state
 * @returns {Array<{tag,color,title,body,link,linkText}>}
 */
window.recommendCare = function (state) {
  var R = window.CARE_RULES;
  var need = function (v) { return state.needs && state.needs.has(v); };
  var ctx  = function (v) { return state.context && state.context.has(v); };
  var cards = [];

  // ── 1. 통합돌봄 상담 — 등급 여부와 무관한 1차 관문
  cards.push({
    tag: '가장 먼저', color: 'tip',
    title: '우리 동네 통합돌봄 상담 신청',
    body: '등급이 있든 없든 <b>읍·면·동 행정복지센터</b>에 상담을 신청하면, 상태를 조사해 의료·요양·생활지원을 묶어 연계합니다. ' +
          '무엇부터 할지 모를 때 여기서 시작하세요. <b>장기요양 등급 판정과는 별개의 절차</b>입니다.',
    link: 'tonghap-dolbom.html', linkText: '통합돌봄 자세히'
  });

  // ── 2. 장기요양 — 단정하지 않고 분류에 따라 다르게 안내
  var ltc = window.judgeLtc(state);

  if (ltc === 'has_grade') {
    cards.push({
      tag: '보유중', color: 'tip', title: '등급 활용 · 상태가 달라졌다면 변경 신청',
      body: '이미 등급이 있으시면 방문요양·주야간보호 등 <b>재가급여</b>를 이용하실 수 있습니다. ' +
            '상태가 나빠졌다면 <b>등급 변경 신청</b>으로 급여를 조정할 수 있습니다.',
      link: 'jangki-yoyang.html', linkText: '재가급여 보기'
    });
  } else if (ltc === 'likely' || ltc === 'maybe') {
    var 머리 = (ltc === 'likely')
      ? '신청 요건에 해당할 가능성이 있습니다.'
      : '해당 여부가 입력만으로는 분명하지 않습니다.';
    cards.push({
      tag: (ltc === 'likely' ? '확인해 보세요' : '상담 권장'), color: 'tip',
      title: '노인장기요양보험 등급 신청 상담',
      body:머리 + ' 신청 대상은 <b>만 65세 이상</b>이거나, 65세 미만이라도 <b>노인성 질병</b>이 있으면서 ' +
            '<b>6개월 이상 혼자 일상생활을 하기 어려울 것으로 예상되는</b> 경우입니다. ' +
            '<b>6개월을 기다린 뒤 신청하라는 뜻이 아닙니다</b> — 지금 신청할 수 있습니다.<br>' +
            '최종 대상 여부와 등급은 <b>공단의 방문조사와 등급판정위원회</b>에서 정해집니다. ' +
            '국민건강보험공단 <b>' + R.출처.상담.공단.전화 + '</b>으로 문의하세요.',
      link: 'jangki-yoyang.html', linkText: '신청 절차 보기'
    });
  } else if (ltc === 'short_term' || ltc === 'not_ltc') {
    cards.push({
      tag: '알아두세요', color: 'warn',
      title: '이 경우는 장기요양 등급 대상이 아닐 수 있습니다',
      body: '장기요양은 <b>만 65세 이상</b>이거나 <b>노인성 질병</b>이 있고, 어려움이 <b>6개월 이상 이어질 것으로 예상될 때</b>가 기준입니다. ' +
            '수술 후 단기 회복처럼 <b>시간이 지나면 나아질 상태</b>라면 해당하지 않을 수 있습니다.<br>' +
            '대신 <b>통합돌봄 상담</b>, <b>퇴원환자 지역사회 연계</b>, 건강보험 <b>가정간호</b>, 민간 간병 등을 알아보세요. ' +
            '판단이 어려우면 공단 <b>' + R.출처.상담.공단.전화 + '</b>에 문의하시면 됩니다.',
      link: 'tonghap-dolbom.html', linkText: '통합돌봄 상담 알아보기'
    });
  } else if (ltc === 'disability') {
    cards.push({
      tag: '다른 제도', color: 'tip', title: '장애인 활동지원 제도를 함께 확인하세요',
      body: '장애가 있는 분은 <b>장애인 활동지원</b> 제도가 따로 있습니다. 장기요양과 <b>동시에 적용되지 않는 경우</b>가 있어 ' +
            '어느 쪽이 유리한지 상담이 필요합니다. 읍·면·동 또는 공단 <b>' + R.출처.상담.공단.전화 + '</b>에 문의하세요.',
      link: 'jiyeok.html', linkText: '지역 창구 찾기'
    });
  } else {
    cards.push({
      tag: '먼저 확인', color: 'tip', title: '어떤 제도가 맞는지 상담으로 확인하세요',
      body: '선택하신 내용만으로는 어떤 제도가 맞는지 판단하기 어렵습니다. ' +
            '읍·면·동 통합돌봄 상담이나 공단 <b>' + R.출처.상담.공단.전화 + '</b>에서 상태를 설명하시면 맞는 경로를 안내받으실 수 있습니다.',
      link: 'jiyeok.html', linkText: '지역 창구 찾기'
    });
  }

  // ── 3. 의료·간호 — 반드시 면허 제공기관으로. 개인 구직 목록으로 보내지 않는다.
  if (need('medical') || ctx('discharge')) {
    cards.push({
      tag: '의료 · 간호', color: 'law',
      title: '집에서 받는 진료·간호는 제공기관을 통해야 합니다',
      body: '주사·투약 관리, 흡인, 욕창 처치 같은 <b>의료행위는 면허를 가진 사람만</b> 할 수 있습니다. ' +
            '개인에게 직접 구하는 것이 아니라 아래 경로 중 하나로 신청하세요.' +
            '<ul style="margin:8px 0 0;padding-left:20px">' +
            R.의료서비스.map(function (s) {
              return '<li><b>' + s.이름 + '</b> — ' + s.제공 + ' <span style="color:var(--muted)">(' + s.경로 + ')</span></li>';
            }).join('') +
            '</ul>' +
            (ctx('discharge')
              ? '<br>퇴원을 앞두셨다면 <b>병원의 퇴원지원·사회사업팀</b>에 먼저 문의하세요. ' +
                '전국 시·군·구가 병원과 협약해 <b>퇴원환자 지역사회 연계</b>를 운영합니다.'
              : ''),
      link: 'jangki-yoyang.html', linkText: '방문간호 알아보기'
    });
  }

  // ── 4. 급여로 받는 돌봄 서비스 (기관을 통해 제공)
  var 기관서비스 = [];
  var heavy = ['most', 'bed'].indexOf(state.mobility) >= 0;
  if (need('bath') || heavy) 기관서비스.push('<b>방문요양 · 방문목욕</b> — 요양보호사가 방문해 신체활동·목욕을 지원');
  if (need('day') || state.cognition === 'severe') 기관서비스.push('<b>주·야간보호</b> — 낮 동안 기관에서 돌봄·기능훈련');
  if (need('home')) 기관서비스.push('<b>복지용구 · 주거환경 개선</b> — 안전손잡이·미끄럼방지 등');
  if (기관서비스.length) {
    cards.push({
      tag: '기관을 통해', color: 'law', title: '장기요양 급여로 받을 수 있는 서비스',
      body: '아래 서비스는 <b>지정된 장기요양기관</b>이 제공합니다(등급 필요). 우리 동네 기관의 공단 평가등급을 비교해 보세요.' +
            '<ul style="margin:8px 0 0;padding-left:20px">' + 기관서비스.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul>',
      link: 'gigwan.html', linkText: '우리 동네 기관 평가 보기'
    });
  }

  // ── 5. 생활 지원 (급여 밖 영역 — 개인·지역 자원 활용 가능)
  var 생활서비스 = [];
  if (need('meal')) 생활서비스.push('<b>식사·반찬 지원</b> — 지자체 도시락·반찬 배달, 영양관리');
  if (need('house')) 생활서비스.push('<b>가사 지원</b> — 청소·세탁·장보기');
  if (need('move')) 생활서비스.push('<b>병원동행·이동지원</b> — 진료 동행, 교통 지원');
  if (need('safety') || ctx('alone')) 생활서비스.push('<b>응급안전안심서비스</b> — 응급호출·활동감지 장비(독거 어르신)');
  if (생활서비스.length) {
    cards.push({
      tag: '생활 지원', color: 'tip', title: '일상생활을 돕는 서비스',
      body: '<ul style="margin:0 0 0;padding-left:20px">' + 생활서비스.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul>' +
            '<p style="margin:10px 0 0">지자체마다 제공 범위가 다릅니다. 통합돌봄 상담에서 우리 동네에 무엇이 있는지 확인하세요.</p>',
      link: 'tonghap-dolbom.html', linkText: '통합돌봄에서 확인'
    });
  }

  // ── 6. 치매
  if (state.cognition === 'mild' || state.cognition === 'severe') {
    cards.push({
      tag: '치매', color: 'tip', title: '치매안심센터 · 치매상담콜',
      body: '가까운 <b>치매안심센터</b>에서 무료 검진·상담·가족교육을 받으실 수 있습니다. ' +
            '<b>' + R.출처.상담.치매.전화 + '</b> 치매상담콜센터는 ' + R.출처.상담.치매.안내 + ' 운영합니다.',
      link: 'jiyeok.html', linkText: '지역 창구 찾기'
    });
  }

  // ── 7. 비용 — 면제·감경과 비급여를 구분해서 안내
  if (ctx('lowincome')) {
    var B = R.본인부담;
    cards.push({
      tag: '비용', color: 'law', title: '본인부담 면제 · 감경 대상 확인',
      body: '<ul style="margin:0 0 8px;padding-left:20px">' +
            '<li><b>' + B.면제.대상 + '</b> — 급여비용 본인부담 <b>면제</b></li>' +
            '<li><b>60% 감경</b>(' + B.감경60.대상 + ') — 재가 <b>' + B.감경60.재가 + '%</b> · 시설 <b>' + B.감경60.시설 + '%</b></li>' +
            '<li><b>40% 감경</b>(' + B.감경40.대상 + ') — 재가 <b>' + B.감경40.재가 + '%</b> · 시설 <b>' + B.감경40.시설 + '%</b></li>' +
            '<li>일반 — 재가 ' + B.일반.재가 + '% · 시설 ' + B.일반.시설 + '%</li>' +
            '</ul>' +
            '<b>주의</b> — ' + B.예외 + ' 감경 대상 여부는 공단이 판단하므로 <b>' + R.출처.상담.공단.전화 + '</b>에서 확인하세요.',
      link: 'jangki-yoyang.html', linkText: '비용 안내 보기'
    });
  }

  // ── 8. 다음 단계 — 항상
  cards.push({
    tag: '다음 단계', color: 'tip', title: '우리 지역 신청창구 찾기',
    body: '거주 지역을 고르면 관할 읍·면·동과 전국 공통 상담전화를 안내합니다. ' +
          '보건복지상담센터 <b>' + R.출처.상담.복지상담.전화 + '</b> — ' + R.출처.상담.복지상담.안내,
    link: 'jiyeok.html', linkText: '지역 창구 찾기'
  });

  return cards;
};
