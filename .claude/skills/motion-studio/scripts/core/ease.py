"""시간 · 이징 · 색 섞기 — 모든 장면이 쓰는 기본 수학"""


def cl(x, a=0.0, b=1.0): return max(a, min(b, x))
def seg(t, a, b): return cl((t - a) / (b - a)) if b > a else float(t >= a)   # 구간 [a, b] → 0~1
def eo(x): return 1 - (1 - x) ** 3                                            # ease-out
def eio(x): return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2        # ease-in-out


def back(x, c=1.9):
    """살짝 넘쳤다 돌아오는 튕김 (c = 넘침 정도)"""
    return 0.0 if x <= 0 else 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2


def mix(c, a, bg):
    """색 c를 배경 bg 위에 a만큼 (0 = 배경 · 1 = c)"""
    return tuple(int(bg[i] + (c[i] - bg[i]) * a) for i in range(3))
