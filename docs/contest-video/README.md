# 「3초 뒤의 나」 영상 소스

59초 · 1080x1920 · 30fps · 세로 쇼츠. 장면, 자막, 효과음, 음악을 모두 코드로 만들었음.

| 파일 | 역할 |
|---|---|
| 3cho-dwi-ui-na.mp4 | 완성 영상 |
| video.html | 장면 애니메이션 (render(t) 함수가 시간 t초의 한 프레임을 그림) |
| audio.py | 효과음과 배경음악 합성 (numpy) |
| frames.py | 프레임을 JPG로 저장 (Playwright + Chromium) |

## 다시 만드는 순서

1. 글꼴 준비: `npm pack @fontsource/noto-sans-kr` 후 압축을 풀어 `font/package/files/` 가 되도록 둠
2. `python3 audio.py` → audio.wav
3. `python3 frames.py 0 1770` → frames/f00000.jpg ...
4. 인코딩

```
ffmpeg -framerate 30 -i frames/f%05d.jpg -i audio.wav -c:v libx264 -crf 23 -pix_fmt yuv420p -c:a aac -b:a 160k -t 59 out.mp4
```

## 수정 포인트

- 자막 문구: video.html 의 각 장면 함수(S1~S7) 안 caption(), text() 호출
- 장면 길이: video.html 의 SC 배열 (시작 시각)
- 효과음 타이밍: audio.py 의 시각 상수 (장면 시작 시각과 맞춰야 함)
- 내레이션 음성은 아직 없음. 본인 목소리를 녹음해 편집 단계에서 얹을 수 있음.
