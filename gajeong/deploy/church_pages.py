#!/usr/bin/env python3
"""교회 전용 주소(/코드/index.html)를 만든다 — 카카오톡 미리보기에 교회 이름·로고가 뜨게.

첫 화면(index.html)을 그대로 복사하고 <base href="../"> 와 교회 미리보기 줄만 바꾼다.
(예전처럼 첫 화면으로 넘기면 주소창이 공통 주소로 바뀌어, 거기서 공유하면 공통 로고가 떴다)

mokjang.github.io 저장소(주소 mokjang.app)의 GitHub Actions가 15분마다 돌린다.
서버에서 교회 이름·로고만 읽고(공개 함수 church_public_churches), 바뀐 것이 있으면 커밋한다.
이 스크립트가 만든 폴더에는 .church-page 표시 파일을 둔다. 교회가 없어지면 그 폴더만 지운다.
"""
import html, io, json, os, re, shutil, sys, urllib.request

from PIL import Image   # 홈 화면 아이콘 만들기 (pip install pillow)

SITE = 'https://mokjang.app/'
SB_URL = 'https://dxhmprqfgigljgbstqrg.supabase.co'
SB_KEY = 'sb_publishable__FXGut04uxuz44s2443_8g_AByEuL-n'   # 화면(common.js)에 이미 공개된 키
MARK = '.church-page'
SLUG_RE = re.compile(r'^[a-z0-9-]{2,40}$')

HEAD = """<meta charset="utf-8">
{og}
<base href="../">
<!-- 자동으로 만든 교회 주소 (deploy/church_pages.py): 첫 화면 그대로, 미리보기 글·그림만 교회 것.
     주소창이 /{slug}/ 에 남으니 브라우저에서 바로 카톡 공유해도 교회 로고가 뜬다 -->
<script>
try {{ localStorage.setItem('gajeong-church', {mem}); }} catch (e) {{}}
(function (q) {{ if (q.get('c') !== '{slug}') {{ q.set('c', '{slug}'); history.replaceState(null, '', location.pathname + '?' + q + location.hash); }} }})(new URLSearchParams(location.search));
</script>"""

OG = """<title>{title}</title>
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="{desc}">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{image}">{size}
<meta property="og:site_name" content="{name}">"""
# og:url 은 일부러 넣지 않는다 — 카톡은 og:url 이 있으면 그 주소의 (예전에 저장해 둔) 미리보기를 쓴다.
# 미리보기 줄은 맨 앞에 둔다 — 카톡은 문서 앞부분만 읽는다.

DESC = '한 주 목장 이야기와 기도제목을 담는 곳'


def fetch():
    req = urllib.request.Request(SB_URL + '/rest/v1/rpc/church_public_churches', data=b'{}', method='POST',
                                 headers={'apikey': SB_KEY, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def absolute(u):
    if not u:
        return ''
    return u if re.match(r'^https?://', u) else SITE + u.lstrip('/')


def logo_image(logo, root):
    """교회 로고 그림 (사이트 안 파일이면 그대로 읽고, 아니면 내려받는다)"""
    if not logo:
        return None
    try:
        if re.match(r'^https?://', logo):
            with urllib.request.urlopen(logo, timeout=30) as r:
                data = r.read()
        else:
            data = open(os.path.join(root, logo.lstrip('/')), 'rb').read()
        return Image.open(io.BytesIO(data)).convert('RGBA')
    except Exception as e:
        print('로고를 못 읽음:', logo, e); return None


def square(img, size, fill):
    """흰 정사각형 가운데에 로고를 fill 비율 크기로 얹는다"""
    out = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    w, h = img.size
    k = size * fill / max(w, h)
    small = img.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
    out.alpha_composite(small, ((size - small.width) // 2, (size - small.height) // 2))
    return out.convert('RGB')


def write_if_changed(path, data):
    if os.path.exists(path) and open(path, 'rb').read() == data:
        return
    open(path, 'wb').write(data)


def write_icons(d, img):
    # any: 로고를 크게 / maskable: 안드로이드가 동그랗게 잘라도 남도록 작게(안전 구역 80% 안)
    for name, size, fill in (('icon-180.png', 180, .8), ('icon-192.png', 192, .84), ('icon-512.png', 512, .84), ('icon-maskable-512.png', 512, .6)):
        b = io.BytesIO(); square(img, size, fill).save(b, 'PNG', optimize=True)
        write_if_changed(os.path.join(d, name), b.getvalue())


def manifest(c, unit):
    slug = c['slug']
    return json.dumps({
        'id': '/' + slug + '/',
        'name': c['name'] + ' ' + unit + ' 나눔터',
        'short_name': c['name'],
        'lang': 'ko',
        'start_url': '/' + slug + '/',
        'scope': '/',
        'display': 'standalone',
        'background_color': '#ffffff',
        'theme_color': {'sky': '#0b57a4', 'night': '#15191b'}.get(c.get('theme'), '#1f4d3b'),
        'icons': [
            {'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
            {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
            {'src': 'icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
        ],
    }, ensure_ascii=False, indent=2) + '\n'


def unit_of(c):
    terms = c.get('terms') or {}
    u = terms.get('unit')
    return u if isinstance(u, str) and re.match(r'^[가-힣A-Za-z0-9 ]{1,8}$', u) else '목장'


def render(c, root, base, icons=False):
    slug, name, logo = c['slug'], c['name'], c.get('logo_url') or ''
    terms = c.get('terms') or {}
    unit = unit_of(c)
    # 자바스크립트 문자열로 넣을 JSON 글자 (</script> 가 끼어들지 못하게)
    mem = json.dumps(json.dumps({'slug': slug, 'name': name, 'logo_url': logo, 'theme': c.get('theme') or 'note', 'terms': terms}, ensure_ascii=False),
                     ensure_ascii=False).replace('</', '<\\/')
    # 미리보기 그림: assets/og-<코드>.png 를 따로 만들어 두었으면 그것, 아니면 교회 로고
    wide = os.path.exists(os.path.join(root, 'assets', 'og-' + slug + '.png'))
    image = SITE + 'assets/og-' + slug + '.png' if wide else (absolute(logo) or SITE + 'assets/og.png')
    og = OG.format(title=html.escape(name + ' ' + unit + ' 나눔터'), desc=DESC, image=html.escape(image), name=html.escape(name),
                   size='\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">' if wide else '',
                   )
    # 첫 화면의 제목·미리보기 줄(<title> ~ og:url)은 빼고, 교회 것을 맨 앞(charset 바로 뒤)에 넣는다
    page, n = re.subn(r'<title>.*?<meta property="og:url"[^>]*>\n?', '', base, count=1, flags=re.S)
    page = page.replace('<meta charset="utf-8">', HEAD.format(slug=slug, mem=mem, og=og), 1)
    if icons:   # 홈 화면에 추가하면 교회 로고·이름으로
        page = page.replace('<link rel="manifest" href="manifest.webmanifest">', '<link rel="manifest" href="' + slug + '/manifest.webmanifest">', 1)
        page = page.replace('<link rel="apple-touch-icon" href="assets/icon-192.png">', '<link rel="apple-touch-icon" href="' + slug + '/icon-180.png">', 1)
        page = page.replace('<meta name="apple-mobile-web-app-title" content="목장나눔터">', '<meta name="apple-mobile-web-app-title" content="' + html.escape(name) + '">', 1)
    if n != 1 or page.count('<base ') != 1:
        raise SystemExit('index.html 모양이 달라져 교회 주소를 만들 수 없음')
    return page


def main(root):
    churches = [c for c in fetch() if SLUG_RE.match(c.get('slug') or '')]
    base = open(os.path.join(root, 'index.html'), encoding='utf-8').read()
    keep = set()
    for c in churches:
        d = os.path.join(root, c['slug'])
        if os.path.exists(d) and not os.path.exists(os.path.join(d, MARK)):
            print('건너뜀(직접 만든 폴더):', c['slug']); continue
        os.makedirs(d, exist_ok=True)
        img = logo_image(c.get('logo_url'), root)
        if img:
            write_icons(d, img)
            write_if_changed(os.path.join(d, 'manifest.webmanifest'), manifest(c, unit_of(c)).encode('utf-8'))
        else:
            for f in ('icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'manifest.webmanifest'):
                if os.path.exists(os.path.join(d, f)): os.remove(os.path.join(d, f))
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(render(c, root, base, icons=bool(img)))
        open(os.path.join(d, MARK), 'w').write('')
        keep.add(c['slug'])
    for name in os.listdir(root):
        d = os.path.join(root, name)
        if os.path.isdir(d) and os.path.exists(os.path.join(d, MARK)) and name not in keep:
            shutil.rmtree(d); print('지움:', name)
    print('교회 주소', len(keep), '곳')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '.')
