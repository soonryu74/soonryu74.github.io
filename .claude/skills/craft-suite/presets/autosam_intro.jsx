// 오토샘 로고 인트로 (3.5초) — EffectCraft 와 애프터 이펙트 둘 다에서 돈다 (After Effects 스크립트 API).
// 남색 바탕 → 금색 선이 가운데서 양옆으로 그어짐 → «오토샘» 튀어 오름 → 아래 한 줄이 서서히.
// EffectCraft:  effectcraft-cli script autosam_intro.jsx --save-as 오토샘_인트로.ecproj
// 애프터 이펙트: 파일 ▸ 스크립트 ▸ 스크립트 파일 실행… 에서 이 파일
// 세로(쇼츠)로: 아래 VERTICAL 을 true 로.

var VERTICAL = false;
var TITLE = "오토샘";
var SUB = "영상 자동화 공장";
var FONT = "Pretendard-Bold";        // 없으면 시스템 글꼴로 대체된다
var NAVY = [11 / 255, 18 / 255, 36 / 255];
var GOLD = [242 / 255, 193 / 255, 78 / 255];
var WHITE = [1, 1, 1];

var W = VERTICAL ? 1080 : 1920, H = VERTICAL ? 1920 : 1080, DUR = 3.5, FPS = 30;
var comp = app.project.items.addComp("오토샘인트로", W, H, 1, DUR, FPS);

function ease(prop) {
    // 모든 키를 부드럽게 (애프터 이펙트의 Easy Ease 와 같은 값)
    var e = new KeyframeEase(0, 75);
    for (var k = 1; k <= prop.numKeys; k++) {
        var n = prop.value instanceof Array ? prop.value.length : 1;
        if (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) n = 1;
        var arr = [];
        for (var i = 0; i < n; i++) arr.push(e);
        prop.setTemporalEaseAtKey(k, arr, arr);
    }
}

function textLayer(str, size, color, y) {
    var l = comp.layers.addText(str);
    var src = l.text.sourceText;
    var td = src.value;
    td.font = FONT;
    td.fontSize = size;
    td.fillColor = color;
    td.applyFill = true;
    td.justification = ParagraphJustification.CENTER_JUSTIFY;
    src.setValue(td);
    l.transform.position.setValue([W / 2, y]);
    return l;
}

// 1) 바탕
comp.layers.addSolid(NAVY, "바탕", W, H, 1, DUR);

// 2) 금색 선 — 가로 크기 0 → 100%
var lineW = VERTICAL ? 640 : 760, lineY = H / 2 + (VERTICAL ? 120 : 90);
var line = comp.layers.addSolid(GOLD, "금색선", lineW, 8, 1, DUR);
line.transform.position.setValue([W / 2, lineY]);
var ls = line.transform.scale;
ls.setValueAtTime(0.2, [0, 100]);
ls.setValueAtTime(0.9, [100, 100]);
ease(ls);

// 3) 제목 — 작게 → 살짝 크게 → 제자리 (튀어 오름) + 나타남
var title = textLayer(TITLE, VERTICAL ? 200 : 220, WHITE, H / 2 - (VERTICAL ? 10 : 0));
var ts = title.transform.scale;
ts.setValueAtTime(0.6, [60, 60]);
ts.setValueAtTime(1.0, [108, 108]);
ts.setValueAtTime(1.25, [100, 100]);
ease(ts);
var to = title.transform.opacity;
to.setValueAtTime(0.6, 0);
to.setValueAtTime(0.85, 100);

// 4) 아래 한 줄 — 서서히 + 살짝 올라옴
var subY = lineY + (VERTICAL ? 110 : 90);
var sub = textLayer(SUB, VERTICAL ? 64 : 60, GOLD, subY);
var so = sub.transform.opacity;
so.setValueAtTime(1.3, 0);
so.setValueAtTime(1.9, 100);
var sp = sub.transform.position;
sp.setValueAtTime(1.3, [W / 2, subY + 24]);
sp.setValueAtTime(1.9, [W / 2, subY]);
ease(sp);

// 5) 끝 0.4초 전체 어두워지며 마무리
var fade = comp.layers.addSolid([0, 0, 0], "끝페이드", W, H, 1, DUR);
var fo = fade.transform.opacity;
fo.setValueAtTime(DUR - 0.4, 0);
fo.setValueAtTime(DUR, 100);

comp.openInViewer && comp.openInViewer();
