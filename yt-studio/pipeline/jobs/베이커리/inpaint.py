"""구운 자막 지우기 v5 — 순백 획(테두리가 어두운 성분만) → 테두리 포함 마스크 → cv2.inpaint."""
import sys, subprocess, numpy as np, cv2
W, H, FPS = 1280, 720, 24
Y0, Y1 = 570, 705
KEEP = {'b': [(13.5, 17.0), (19.5, 23.0), (29.5, 34.5)]}
K3 = np.ones((3, 3), np.uint8)
def mask_of(fr, t, tag):
    band = fr[Y0:Y1]
    g = cv2.cvtColor(band, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(band, cv2.COLOR_BGR2HSV)
    local = cv2.blur(g, (31, 31)).astype(np.int16)
    white_raw = ((band.min(axis=2) > 190) & (hsv[..., 1] < 45) & ((g.astype(np.int16) - local) > 8)).astype(np.uint8)
    big = cv2.morphologyEx(white_raw, cv2.MORPH_OPEN, np.ones((13, 13), np.uint8))
    white = cv2.subtract(white_raw, cv2.dilate(big, np.ones((5, 5), np.uint8)))
    big2 = cv2.morphologyEx(white_raw, cv2.MORPH_OPEN, np.ones((25, 25), np.uint8))
    white2 = cv2.subtract(white_raw, cv2.dilate(big2, np.ones((3, 3), np.uint8)))   # 구제용(배경 흰 면과 붙은 글자)
    darkpx = ((g < 110) | ((local - g.astype(np.int16)) > 18)).astype(np.uint8)
    # 성분별: 바깥 링(2~5px)에서 어두운 비율
    n, lab, st, _ = cv2.connectedComponentsWithStats(white, 8)
    core = np.zeros_like(white)
    for i in range(1, n):
        x, y, w, h, a = st[i]
        if a < 6 or h > 60 or w > 110: continue
        comp = (lab == i).astype(np.uint8)
        ring = cv2.subtract(cv2.dilate(comp, np.ones((9, 9), np.uint8)), cv2.dilate(comp, K3))
        rp = ring.sum()
        if rp and (ring & darkpx).sum() / rp > 0.22: core |= comp
    if not core.any(): return np.zeros((H, W), np.uint8)
    # 글줄로 묶어서 고립 성분 제거
    line = cv2.dilate(core, np.ones((9, 41), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(line, 8)
    sel = np.zeros_like(core); box = np.zeros_like(core)
    for i in range(1, n):
        x, y, w, h, a = st[i]
        if w < 80: continue
        sel[lab == i] = 1
        # 자막은 가운데 정렬 → 좌우 대칭으로 글줄 박스 확장(끝 글자 구제)
        bx0 = min(x, W - (x + w)) - 24; bx1 = max(x + w, W - x) + 24
        box[max(0, y - 4):y + h + 4, max(0, bx0):min(W, bx1)] = 1
    core = cv2.bitwise_and(core, sel)
    if not core.any(): return np.zeros((H, W), np.uint8)
    # 글줄 박스 안의 흰 획은 테두리 검사 없이 모두 포함(놓친 글자 구제)
    core = cv2.bitwise_or(core, cv2.bitwise_and(white2, box))
    near = cv2.dilate(core, np.ones((11, 11), np.uint8))
    dark = (((local - g.astype(np.int16)) > 6) & (near > 0)).astype(np.uint8)
    m = cv2.dilate(cv2.bitwise_or(core, dark), np.ones((7, 7), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    full = np.zeros((H, W), np.uint8); full[Y0:Y1] = m
    for a, b in KEEP.get(tag, []):
        if a <= t <= b: full[:int(H * 0.82), :int(W * 0.5)] = 0
    return full
def clean(fr, t, tag):
    m = mask_of(fr, t, tag)
    return (cv2.inpaint(fr, m, 5, cv2.INPAINT_TELEA) if m.any() else fr), m
if __name__ == '__main__':
    src, dst, tag = sys.argv[1], sys.argv[2], sys.argv[3]
    dec = subprocess.Popen(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'], stdout=subprocess.PIPE)
    enc = subprocess.Popen(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                            '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p', dst], stdin=subprocess.PIPE)
    i = 0; n = W * H * 3
    while True:
        buf = dec.stdout.read(n)
        if len(buf) < n: break
        fr = np.frombuffer(buf, np.uint8).reshape(H, W, 3).copy()
        fr, _ = clean(fr, i / FPS, tag)
        enc.stdin.write(fr.tobytes()); i += 1
    enc.stdin.close(); enc.wait(); print('frames', i)
