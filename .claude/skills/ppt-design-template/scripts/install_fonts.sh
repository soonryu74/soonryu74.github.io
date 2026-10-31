#!/usr/bin/env bash
# 렌더링 QA용 무료 한글 폰트 설치 (리눅스/맥 사용자 폰트 폴더).
# 실패한 항목은 건너뛰고 계속 진행한다. 모든 폰트는 상업적 이용 가능한 무료 폰트(OFL 또는 각 배포사 라이선스).
set -u
DEST="${FONT_DIR:-$HOME/.fonts/ppt-design-template}"
mkdir -p "$DEST"; cd "$DEST" || exit 1
TMP="$(mktemp -d)"
fetch() { curl -fsSL --max-time 120 -o "$2" "$1" && echo "  ok  $2" || echo "  skip $2"; }

echo "[1/5] Pretendard (OFL) — 본문용"
for w in Regular Medium SemiBold Bold ExtraBold Black; do
  [ -f "Pretendard-$w.ttf" ] || fetch "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/alternative/Pretendard-$w.ttf" "Pretendard-$w.ttf"
done

echo "[2/5] Gmarket Sans (지마켓 무료 배포) — 제목·썸네일용"
if [ ! -f "GmarketSansTTFBold.ttf" ]; then
  fetch "https://corp.gmarket.com/fonts/GmarketSansTTF.zip" "$TMP/gmarket.zip" && (cd "$TMP" && unzip -oq gmarket.zip && find . -iname "*.ttf" -exec mv {} "$DEST"/ \;)
fi

echo "[3/5] Paperlogy (OFL) — 제목용"
if ! ls Paperlogy-*.ttf >/dev/null 2>&1; then
  fetch "https://cdn.jsdelivr.net/gh/Freesentation/paperlogy@main/Paperlogy-1.001.zip" "$TMP/paperlogy.zip" \
  || fetch "https://github.com/Freesentation/paperlogy/raw/refs/heads/main/Paperlogy-1.001.zip" "$TMP/paperlogy.zip"
  [ -f "$TMP/paperlogy.zip" ] && (cd "$TMP" && unzip -oq paperlogy.zip && find . -iname "*.ttf" -exec mv {} "$DEST"/ \;)
fi

echo "[4/5] Google Fonts (OFL): Black Han Sans(검은고딕), Do Hyeon(배민 도현), Jua(배민 주아) — 썸네일 임팩트용"
[ -f BlackHanSans-Regular.ttf ] || fetch "https://fonts.gstatic.com/s/blackhansans/v24/ea8Aad44WunzF9a-dL6toA8r8nqV.ttf" "BlackHanSans-Regular.ttf"
[ -f DoHyeon-Regular.ttf ]     || fetch "https://fonts.gstatic.com/s/dohyeon/v21/TwMN-I8CRRU2zM86HFE3.ttf" "DoHyeon-Regular.ttf"
[ -f Jua-Regular.ttf ]         || fetch "https://fonts.gstatic.com/s/jua/v18/co3KmW9ljjAjcw.ttf" "Jua-Regular.ttf"

echo "[5/5] Cafe24 Ssurround (카페24 무료 배포, OFL) — 둥근 제목용"
if ! ls Cafe24Ssurround*.ttf >/dev/null 2>&1; then
  fetch "https://img.cafe24.com/csdstatic/freefonts/download/kr/Cafe24Ssurround-v2.0.zip" "$TMP/ssurround.zip" \
  && (cd "$TMP" && unzip -oq ssurround.zip && find . -iname "*.ttf" -exec mv {} "$DEST"/ \;)
fi

rm -rf "$TMP"
fc-cache -f >/dev/null 2>&1 || true
echo; echo "설치된 패밀리:"; fc-list : family | grep -iE "pretendard|gmarket|paperlogy|black han|do hyeon|jua|ssurround" | sort -u
