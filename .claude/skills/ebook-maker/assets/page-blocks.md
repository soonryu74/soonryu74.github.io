# 페이지 블록 스니펫

`prose` 안이나 페이지에 넣는 조각들. 복사해서 쓴다.

## 본문 문단 (기본)
```html
<div class="prose">
  <p>한 문단은 2~3문장. 핵심 단어만 <b>굵게</b>.</p>
  <p>다음 문단. 한 쪽에 2~4문단이면 충분하다.</p>
</div>
```

## 수식 / 공식 (가운데 모노)
```html
<p class="fml">출력 = f(입력)</p>
```

## 인용 / 강조 문장 (앰버 왼쪽선)
```html
<blockquote>기억할 한 문장은 이렇게 따로 세운다.</blockquote>
```

## 콜아웃 메모 (잉크 왼쪽선) — 보통 페이지 맨 아래
```html
<p class="note">이 쪽에서 꼭 남길 한 줄.</p>
```

## 코드 블록
```html
<pre>model = keras.Sequential([
  layers.Dense(16, activation='relu'),
  layers.Dense(1,  activation='sigmoid'),
])</pre>
```

## 표
```html
<div class="tw"><table>
  <tr><th>구분</th><th>빌려 쓰기</th><th>소유하기</th></tr>
  <tr><td><b>비용</b></td><td>매달 과금</td><td>무료</td></tr>
  <tr><td><b>속도</b></td><td>남이 정함</td><td>내 PC</td></tr>
</table></div>
```
낱말풀이처럼 첫 칸이 좁아야 하면 `<table>` 대신 `<div class="tw gl"><table>…`.

## 출처 표기 (작게, 흐리게)
```html
<p class="src">출처: ○○ 리포트 2026 · 저자 재구성</p>
```

## 차례 — 2단(절이 6개 이상일 때)
```html
<div class="toclist dense">
  <a class="tocrow" data-go="1"><span class="tn">1</span><span class="tt"><b>제목</b><i>부제</i></span></a>
  <!-- … -->
</div>
```

## 다중 챕터(절) 구조 — 섹션 순서
```
표지(cover)
차례(alt)  ← tocrow data-go = 각 오프너 chnum
1절 오프너(open, chnum 1)
  1절 본문(글)
  1절 본문(그림+글)
  1절 영상(alt)
2절 오프너(open, chnum 2)
  2절 본문 …
  2절 영상(alt)
…
맺음/CTA(open)
```

## 표지 이미지 / 오프너 이미지
- 표지: `<div class="fig covfig"><img src="img/cover.webp" alt=""></div>` (테두리 없음, 가운데, 작게)
- 오프너에 그림을 넣으려면: `<div class="fig openfig"><img src="img/open.webp" alt=""></div>`

## 영상 페이지 전체
```html
<section class="s alt" data-label="절 이름"><div class="paper"><div class="pin">
  <div class="vidpg">
    <span class="eyebrow">영상으로 보기</span><h3>영상 제목</h3>
    <p class="vnote">약 3분 30초</p>
    <div class="vwrap" data-v="YOUTUBE_ID">
      <button class="vframe" aria-label="영상 재생"><img loading="lazy" src="https://i.ytimg.com/vi/YOUTUBE_ID/hqdefault.jpg" alt=""><span class="vplay"></span></button>
    </div>
    <div class="vqr"><img class="qr" alt="QR" src=""><div><b>youtu.be/YOUTUBE_ID</b><span>휴대폰으로 QR 을 찍으세요</span></div></div>
  </div>
</div><div class="foot"><span class="brand">브랜드</span><span class="pnum"></span></div></div></section>
```
QR 을 안 쓰면 `<div class="vqr">…</div>` 삭제. 쓰면 `python3 qr.py 책.html`.

## 쪽 번호 · 드롭다운
직접 안 매긴다. `.foot` 안에 빈 `<span class="pnum"></span>` 만 두면 JS가 "N / 전체" 로 채우고, `#jump` 드롭다운도 각 섹션 `data-label` 로 자동 생성한다.
