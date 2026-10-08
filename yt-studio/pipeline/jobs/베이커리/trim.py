"""자막 사이 긴 공백 줄이기 — 컷(cuts.json) 단위로 각 샷을 '대사가 끝나는 곳 + 여유'까지만 남긴다.
out: cut_{tag}.mp4 · cut_{tag}.json (대사 번호 → 새 시작 시각)"""
import json, subprocess, sys, wave
FPS = 24
CUTS = json.load(open('cuts.json')); R = json.load(open('timing_refined.json'))
LOGO_FROM = {'a': 49.75, 'b': 49.0}            # 원본 끝 로고 화면 — 모션 엔딩 카드로 대체하므로 잘라낸다
TITLE = {'a': [(19.96, 21.71), (41.5, 43.71)], 'b': [(9.83, 13.92)]}   # 글이 크게 나오는 카드 — 통째로 둔다
HEAD_MAX, TAIL, NOVOICE, MIN = 1.0, 0.6, 1.3, 0.9
def wav_len(p):
    with wave.open(p) as w: return w.getnframes() / w.getframerate()
def plan(tag):
    src_dur = {'a': 50.83, 'b': 50.38}[tag]
    cuts = [0.0] + [c for c in CUTS[tag] if c < LOGO_FROM[tag]] + [LOGO_FROM[tag]]
    shots = [(cuts[i], cuts[i + 1]) for i in range(len(cuts) - 1)]
    lines = R['A' if tag == 'a' else 'B']
    vo = []
    for i, (t0, t, txt) in enumerate(lines):
        p = f'voice/{tag.upper()}{i:02d}.wav'
        try: d = wav_len(p)
        except FileNotFoundError: d = 1.0
        vo.append((t, d, txt))
    # 순서대로 새 타임라인을 흉내 내며 자른다: 대사는 (자막 시각 ↔ 앞 대사 끝+0.2) 중 늦은 쪽에서 시작 → 샷은 그 대사 끝 + 여유까지
    segs = []; new = [None] * len(vo); acc = 0.0; prev_end = 0.0; GAP = 0.2
    for s, e in shots:
        ins = [(j, t, d) for j, (t, d, _) in enumerate(vo) if s <= t < e]
        title = any(a - 0.05 <= s and e <= b + 0.05 for a, b in TITLE[tag])
        ks = s if (title or not ins or ins[0][1] - s <= HEAD_MAX + 0.5) else ins[0][1] - HEAD_MAX
        req = acc + (NOVOICE if not ins else MIN)
        for j, t, d in ins:
            st = max(acc + (t - ks), prev_end + GAP); new[j] = round(st, 3); prev_end = st + d
            req = max(req, prev_end + TAIL)
        if not ins and prev_end > acc: req = max(req, prev_end + TAIL)      # 앞 대사가 아직 말하는 중이면 그만큼 둔다
        ke = e if title else min(e, ks + (req - acc))
        ke = max(ke, min(e, ks + MIN))
        segs.append((round(ks, 3), round(ke, 3))); acc += ke - ks
    for j in range(len(vo)):                       # 로고 화면 이후의 대사(마지막 줄) → 본편 끝에서 시작
        if new[j] is None: st = max(acc, prev_end + GAP); new[j] = round(st, 3); prev_end = st + vo[j][1]
    total = sum(ke - ks for ks, ke in segs)
    return segs, new, total, vo
if __name__ == '__main__':
    for tag in 'ab':
        segs, new, total, vo = plan(tag)
        print(tag, f'{total:.1f}s', 'segs', len(segs))
        for (t, d, txt), n in zip(vo, new): print(f'   {t:5.1f} → {n:5.1f}  +{d:.1f}  {txt}')
        if '--build' in sys.argv:
            fc = ''.join(f'[0:v]trim={ks}:{ke},setpts=PTS-STARTPTS[v{i}];' for i, (ks, ke) in enumerate(segs))
            fc += ''.join(f'[v{i}]' for i in range(len(segs))) + f'concat=n={len(segs)}:v=1:a=0[v]'
            subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', f'in/{tag}.mp4', '-filter_complex', fc, '-map', '[v]',
                            '-r', '24', '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p', f'cut_{tag}.mp4'], check=True)
            json.dump({'segs': segs, 'starts': new, 'total': total}, open(f'cut_{tag}.json', 'w'))
