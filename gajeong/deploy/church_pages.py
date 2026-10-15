#!/usr/bin/env python3
"""교회 전용 주소(/코드/index.html)를 만든다 — 카카오톡 미리보기에 교회 이름·로고가 뜨게.

mokjang.github.io 저장소의 GitHub Actions가 15분마다 돌린다.
서버에서 교회 이름·로고만 읽고(공개 함수 church_public_churches), 바뀐 것이 있으면 커밋한다.
이 스크립트가 만든 폴더에는 .church-page 표시 파일을 둔다. 교회가 없어지면 그 폴더만 지운다.
"""
import html, json, os, re, shutil, sys, urllib.request

SITE = 'https://mokjang.github.io/'
SB_URL = 'https://dxhmprqfgigljgbstqrg.supabase.co'
SB_KEY = 'sb_publishable__FXGut04uxuz44s2443_8g_AByEuL-n'   # 화면(common.js)에 이미 공개된 키
MARK = '.church-page'
SLUG_RE = re.compile(r'^[a-z0-9-]{2,40}$')

PAGE = """<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="한 주 목장 이야기와 기도제목을 담는 곳">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="한 주 목장 이야기와 기도제목을 담는 곳">
<meta property="og:image" content="{image}">
<meta property="og:url" content="{url}">
<link rel="icon" type="image/png" href="{icon}">
<!-- 자동으로 만든 교회 주소 (deploy/church_pages.py). 열면 교회 로그인 화면으로 간다 -->
<script>
try {{ localStorage.setItem('gajeong-church', {mem}); }} catch (e) {{}}
location.replace('../?c={slug}' + location.hash);
</script>
</head>
<body style="background:#f5f1e8;margin:0">
<noscript><p style="font-family:sans-serif;text-align:center;padding:40px 16px"><a href="../?c={slug}">{name} {unit} 나눔터로 가기</a></p></noscript>
</body>
</html>
"""


def fetch():
    req = urllib.request.Request(SB_URL + '/rest/v1/rpc/church_public_churches', data=b'{}', method='POST',
                                 headers={'apikey': SB_KEY, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def absolute(u):
    if not u:
        return ''
    return u if re.match(r'^https?://', u) else SITE + u.lstrip('/')


def render(c):
    slug, name, logo = c['slug'], c['name'], c.get('logo_url') or ''
    terms = c.get('terms') or {}
    unit = terms.get('unit') if isinstance(terms.get('unit'), str) and re.match(r'^[가-힣A-Za-z0-9 ]{1,8}$', terms.get('unit', '')) else '목장'
    # 자바스크립트 문자열로 넣을 JSON 글자 (</script> 가 끼어들지 못하게)
    mem = json.dumps(json.dumps({'slug': slug, 'name': name, 'logo_url': logo, 'theme': c.get('theme') or 'note', 'terms': terms}, ensure_ascii=False),
                     ensure_ascii=False).replace('</', '<\\/')
    return PAGE.format(
        title=html.escape(name + ' ' + unit + ' 나눔터'), name=html.escape(name), unit=html.escape(unit), slug=slug,
        image=html.escape(absolute(logo) or SITE + 'assets/og.png'),
        icon=html.escape(absolute(logo) or SITE + 'assets/icon-192.png'),
        url=SITE + slug + '/',
        mem=mem,
    )


def main(root):
    churches = [c for c in fetch() if SLUG_RE.match(c.get('slug') or '')]
    keep = set()
    for c in churches:
        d = os.path.join(root, c['slug'])
        if os.path.exists(d) and not os.path.exists(os.path.join(d, MARK)):
            print('건너뜀(직접 만든 폴더):', c['slug']); continue
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(render(c))
        open(os.path.join(d, MARK), 'w').write('')
        keep.add(c['slug'])
    for name in os.listdir(root):
        d = os.path.join(root, name)
        if os.path.isdir(d) and os.path.exists(os.path.join(d, MARK)) and name not in keep:
            shutil.rmtree(d); print('지움:', name)
    print('교회 주소', len(keep), '곳')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '.')
