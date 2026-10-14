"""보관 — 결과물을 비공개 저장소(soonryu74/yt-studio-output)의 <작업명>/<편키>/ 에 복사하고 README 한 줄 + 커밋 · 푸시.
사용: python archive.py --repo /home/user/yt-studio-output --job SCIC강의 --key 하이라이트 FILE … [--materials FILE …] [--note "설명"] [--no-push]
  · 100MB 넘는 파일은 거부(조각내지 말고 upscale.py --limit-mb 나 crf 를 올려 다시).
  · config.json · client_secret*.json · token.json · .env 류는 거부(비밀 정보).
  · 푸시 전에 git fetch --depth=50 + rebase(다른 세션이 같은 저장소에 올리므로)."""
from __future__ import annotations

import argparse
import datetime as dt
import fnmatch
import shutil
import subprocess
from pathlib import Path

LIMIT = 100 * 1000 * 1000
SECRETS = ["config.json", "client_secret*.json", "token.json", "*.env", ".env*", "*credentials*.json"]
TRAILER = ""   # 커밋 꼬리말(Co-Authored-By 등)은 세션 규칙대로 --trailer 로 넘긴다


def git(repo: Path, *args: str, check=True) -> str:
    return subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True, check=check).stdout.strip()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True); ap.add_argument("--job", required=True); ap.add_argument("--key", required=True)
    ap.add_argument("files", nargs="+"); ap.add_argument("--materials", nargs="*", default=[])
    ap.add_argument("--note", default=""); ap.add_argument("--no-push", action="store_true")
    ap.add_argument("--trailer", default=TRAILER)
    a = ap.parse_args()
    repo = Path(a.repo); dest = repo / a.job / a.key; mat = repo / a.job / "재료"
    todo = [(Path(f), dest) for f in a.files] + [(Path(f), mat) for f in a.materials]
    for f, _ in todo:
        if any(fnmatch.fnmatch(f.name, pat) for pat in SECRETS):
            raise SystemExit(f"비밀 정보로 보이는 파일은 올리지 않음: {f.name}")
        if f.stat().st_size > LIMIT:
            raise SystemExit(f"100MB 초과: {f.name} ({f.stat().st_size / 1e6:.0f}MB) → crf 를 올려 다시 굽기")
    git(repo, "fetch", "-q", "--depth=50", "origin", "main", check=False)
    git(repo, "rebase", "-q", "origin/main", check=False)
    added = []
    for f, d in todo:
        d.mkdir(parents=True, exist_ok=True); shutil.copy2(f, d / f.name); added.append(str((d / f.name).relative_to(repo)))
    readme = dest / "README.md"
    line = f"- {dt.date.today()} · " + ", ".join(Path(x).name for x in added) + (f" — {a.note}" if a.note else "") + "\n"
    if not readme.exists():
        readme.write_text(f"# {a.job} / {a.key}\n\n", encoding="utf-8")
    with open(readme, "a", encoding="utf-8") as fh:
        fh.write(line)
    git(repo, "add", a.job)
    msg = f"{a.job}/{a.key}: " + (a.note or ", ".join(Path(x).name for x in added[:3])) + "\n\n" + a.trailer
    git(repo, "commit", "-q", "-m", msg)
    h = git(repo, "rev-parse", "--short", "HEAD")
    if not a.no_push:
        for i in range(4):
            r = subprocess.run(["git", "-C", str(repo), "push", "-q", "origin", "HEAD:main"], capture_output=True, text=True)
            if r.returncode == 0:
                break
            git(repo, "fetch", "-q", "--depth=50", "origin", "main", check=False); git(repo, "rebase", "-q", "origin/main", check=False)
            import time; time.sleep(2 ** (i + 1))
        else:
            raise SystemExit("푸시 실패: " + r.stderr[-300:])
    print("DONE", h, *added, flush=True)


if __name__ == "__main__":
    main()
