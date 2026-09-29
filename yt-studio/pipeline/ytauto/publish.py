"""여러 편을 한 번에 유튜브에 올리고 재생목록에 넣기.

업로드.json (한 폴더에 하나):
[
  {"video": "projects/…/0824_가로.mp4", "thumbnail": "projects/…/0824_썸네일_가로.jpg",
   "title": "…", "description": "…", "tags": ["…"], "playlist": "1분 칼럼", "privacy": "private"},
  …
]
경로는 pipeline 폴더 기준. 올린 결과는 같은 폴더의 업로드_결과.txt 에 링크로 남고,
이미 올린 편(결과 파일에 있는 편)은 다시 올리지 않는다.
"""
from __future__ import annotations

import json
from pathlib import Path

from . import upload as up
from .config import HERE


def _playlists(yt) -> dict[str, str]:
    """내 채널의 재생목록 {이름: id}."""
    out, token = {}, None
    while True:
        r = yt.playlists().list(part="snippet", mine=True, maxResults=50, pageToken=token).execute()
        for it in r.get("items", []):
            out[it["snippet"]["title"]] = it["id"]
        token = r.get("nextPageToken")
        if not token:
            return out


def ensure_playlist(yt, name: str, privacy: str = "public") -> str:
    pl = _playlists(yt)
    if name in pl:
        return pl[name]
    r = yt.playlists().insert(part="snippet,status", body={
        "snippet": {"title": name, "description": ""}, "status": {"privacyStatus": privacy}}).execute()
    print(f"  재생목록 만듦: {name}")
    return r["id"]


def add_to_playlist(yt, playlist_id: str, video_id: str) -> None:
    yt.playlistItems().insert(part="snippet", body={"snippet": {
        "playlistId": playlist_id, "resourceId": {"kind": "youtube#video", "videoId": video_id}}}).execute()


def publish(folder: Path, ucfg: dict, public: bool = False, only: list[str] | None = None) -> list[str]:
    plan = json.loads((folder / "업로드.json").read_text(encoding="utf-8"))
    done_f = folder / "업로드_결과.txt"
    done = done_f.read_text(encoding="utf-8") if done_f.exists() else ""
    yt = up.get_service()
    links, pl_cache = [], {}
    for it in plan:
        video = HERE / it["video"]
        if only and not any(k in it["video"] for k in only):
            continue
        if video.name in done:
            print(f"  이미 올림: {video.name}")
            continue
        if not video.exists():
            print(f"  ! 영상 없음: {video}")
            continue
        meta = {"title": it["title"], "tags": it.get("tags", []),
                "description": it.get("description", "") + ("\n\n" + ucfg["description_footer"]
                                                             if ucfg.get("description_footer") else "")}
        thumb = HERE / it["thumbnail"] if it.get("thumbnail") else None
        privacy = "public" if public else it.get("privacy") or ucfg.get("privacy", "private")
        print(f"▶ {it['title']}")
        vid = up.upload(video, meta, ucfg, thumb, None, privacy, it.get("publish_at"))
        name = it.get("playlist")
        if name:
            pl_cache.setdefault(name, ensure_playlist(yt, name))
            add_to_playlist(yt, pl_cache[name], vid)
            print(f"  재생목록 '{name}' 에 추가")
        link = f"https://youtu.be/{vid}"
        links.append(link)
        with done_f.open("a", encoding="utf-8") as f:
            f.write(f"{video.name}\t{link}\t{it['title']}\n")
    return links
