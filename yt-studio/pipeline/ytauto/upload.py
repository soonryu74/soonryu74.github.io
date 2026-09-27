"""유튜브 업로드 (YouTube Data API v3). 기본은 '비공개'로 올려 사람이 확인한 뒤 공개한다."""
from __future__ import annotations

from pathlib import Path

from .config import HERE

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.force-ssl",  # 자막 올리기용
]
CLIENT_SECRET = HERE / "client_secret.json"
TOKEN = HERE / "token.json"


def get_service():
    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build
    except ImportError as e:
        raise RuntimeError("업로드용 패키지가 없어요: pip install google-api-python-client google-auth-oauthlib") from e
    creds = Credentials.from_authorized_user_file(str(TOKEN), SCOPES) if TOKEN.exists() else None
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CLIENT_SECRET.exists():
                raise RuntimeError(f"{CLIENT_SECRET} 가 없어요. 설치 안내의 '유튜브 업로드 연결'을 따라 주세요.")
            flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRET), SCOPES)
            creds = flow.run_local_server(port=0)  # 브라우저가 열리면 내 채널 계정으로 로그인
        TOKEN.write_text(creds.to_json(), encoding="utf-8")
    return build("youtube", "v3", credentials=creds)


def upload(video: Path, meta: dict, ucfg: dict, thumbnail: Path | None = None,
           srt: Path | None = None, privacy: str | None = None, publish_at: str | None = None) -> str:
    from googleapiclient.errors import HttpError
    from googleapiclient.http import MediaFileUpload

    yt = get_service()
    status = {
        "privacyStatus": privacy or ucfg.get("privacy", "private"),
        "selfDeclaredMadeForKids": bool(ucfg.get("made_for_kids", False)),
        "containsSyntheticMedia": bool(ucfg.get("contains_synthetic_media", True)),
    }
    if publish_at:  # 예약 공개는 비공개 상태에서만 가능
        status["privacyStatus"] = "private"
        status["publishAt"] = publish_at
    body = {
        "snippet": {
            "title": meta["title"][:100],
            "description": meta.get("description", "")[:4900],
            "tags": meta.get("tags", [])[:30],
            "categoryId": str(ucfg.get("category_id", "28")),
            "defaultLanguage": "ko",
            "defaultAudioLanguage": "ko",
        },
        "status": status,
    }
    req = yt.videos().insert(part="snippet,status", body=body,
                             media_body=MediaFileUpload(str(video), chunksize=-1, resumable=True))
    resp = None
    while resp is None:
        prog, resp = req.next_chunk()
        if prog:
            print(f"  업로드 {int(prog.progress() * 100)}%")
    vid = resp["id"]
    print(f"  업로드 완료: https://youtu.be/{vid}  ({status['privacyStatus']})")
    if thumbnail and thumbnail.exists():
        try:
            yt.thumbnails().set(videoId=vid, media_body=MediaFileUpload(str(thumbnail))).execute()
            print("  썸네일 적용 완료")
        except HttpError as e:
            print(f"  ! 썸네일은 채널 '전화번호 인증' 후 올릴 수 있어요 ({e.status_code})")
    if srt and srt.exists() and ucfg.get("upload_captions", True):
        try:
            yt.captions().insert(
                part="snippet",
                body={"snippet": {"videoId": vid, "language": "ko", "name": "한국어", "isDraft": False}},
                media_body=MediaFileUpload(str(srt), mimetype="application/octet-stream"),
            ).execute()
            print("  자막 파일 등록 완료")
        except HttpError as e:
            print(f"  ! 자막 등록 실패 ({e.status_code}) — 영상에는 자막이 이미 새겨져 있어요")
    return vid
