# Gemini 모델 기본값 검증 (2026-10)

- 확인 일시: 2026-10-11 21:35 UTC (`GET v1beta/models`, pageToken 끝까지)
- 전체 모델 수: **62개**
- 배경: 구글 공지 — 2026-10-22 이후 프리뷰(preview) 모델 호출 차단. 커밋 3cf978d 의 교체값을 실제 호출로 검증.

## TTS 모델 (generateContent, "테스트입니다.", AUDIO + Kore)

| 모델 | 메서드 | 호출 결과 |
|---|---|---|
| gemini-3.8-flash-tts | generateContent, countTokens, batchGenerateContent | **200**, 1.44초, `audio/wav` (24kHz mono 16bit, WAV 헤더 포함) |
| gemini-3.8-flash-lite-tts | generateContent, countTokens, batchGenerateContent | **200**, 1.44초, `audio/wav` (24kHz mono 16bit, WAV 헤더 포함) |
| gemini-3.1-flash-tts-preview | generateContent, countTokens, batchGenerateContent | 200, 1.36초, raw PCM (preview) |
| gemini-2.5-flash-preview-tts | countTokens, generateContent | 200, 1.25초, raw PCM (preview, 1회차는 content 없는 응답) |
| gemini-2.5-pro-preview-tts | countTokens, generateContent, batchGenerateContent | 200, 1.37초, raw PCM (preview) |

주의: 3.8 계열은 **raw PCM 이 아니라 WAV 파일 통째로** 준다. 기존 스크립트는 받은 바이트를 PCM 으로 보고 WAV 헤더를 또 씌웠으므로, 그대로 쓰면 앞부분 44바이트(헤더)가 소리로 들어갔다 → 두 스크립트에 RIFF 감지 처리 추가.

## 영상(omni·veo) 모델

| 모델 | 메서드 | 호출 결과 |
|---|---|---|
| gemini-omni-1.1-flash | generateContent, countTokens (**predictLongRunning 없음**) | `generate_videos` → **404** `models/gemini-omni-1.1-flash is not found for API version v1beta, or is not supported for predictLongRunning. Call ModelService.ListModels to see the list of available models and their supported methods.` |
| gemini-omni-flash-preview | generateContent, countTokens | 미호출 (preview) |
| veo-3.1-generate-preview | predictLongRunning | 미호출 (preview, 10-22 차단 대상) |
| veo-3.1-fast-generate-preview | predictLongRunning | 미호출 (preview) |
| veo-3.1-lite-generate-preview | predictLongRunning | 미호출 (preview) |

predictLongRunning 을 지원하는 **정식(preview 아닌) 영상 모델은 목록에 없음** → 규칙대로 `veo_model` 은 그대로 둠.

## 이미지·텍스트 모델

| 모델 | 메서드 | 결과 |
|---|---|---|
| gemini-2.5-flash-image | generateContent, countTokens, batchGenerateContent | 목록에 있음, 정식 |
| gemini-2.5-flash | generateContent, countTokens, createCachedContent, batchGenerateContent | 목록에 있음, 정식 |

## 최종 기본값

| 파일 | 이전(3cf978d 이전) | 현재 | 근거 |
|---|---|---|---|
| jobs/베이커리/gen_voice_gemini.py `TTS_MODEL` | gemini-2.5-flash-preview-tts | gemini-3.8-flash-tts | 정식, 200 |
| 같은 파일 예비 `TTS_FALLBACK` (신규) | (주석만) | gemini-3.8-flash-lite-tts | 정식, 200. 404/400(모델) 응답 시 한 번 자동 전환 |
| jobs/7기홍보/gen_narration.py `TTS_MODEL` | gemini-2.5-flash-preview-tts | gemini-3.8-flash-tts | 정식, 200 |
| 같은 파일 예비 `TTS_FALLBACK` (신규) | gemini-2.5-pro-preview-tts (docstring) | gemini-3.8-flash-lite-tts | 정식, 200. 404/400(모델) 응답 시 한 번 자동 전환 |
| ytauto/visuals.py `_veo()`, ytauto/config.py, config.example.json `veo_model` | veo-3.1-generate-preview | gemini-omni-1.1-flash (변경 없음) | generate_videos 404. 대체할 정식 predictLongRunning 모델 없음 → 규칙상 유지 |
| ytauto/visuals.py, ytauto/config.py `gemini_image_model` | gemini-2.5-flash-image | 그대로 | 정식, 목록 확인 |
| ytauto/llm.py `model` | gemini-2.5-flash | 그대로 | 정식, 목록 확인 |

## 남은 위험

1. **영상 생성(`_veo`)은 지금 기본값으로 실패한다.** gemini-omni-1.1-flash 는 generate_videos(predictLongRunning)를 지원하지 않음(404). 10-22 전까지는 설정에서 `veo_model` 을 `veo-3.1-generate-preview` 로 바꾸면 동작, 그 이후는 정식 Veo 출시 또는 omni 의 generateContent 영상 출력 방식으로 `_veo()` 재작성 필요.
2. 3.8 TTS 는 응답 형식이 WAV 로 바뀌었다. 이 저장소의 다른 곳에서 Gemini TTS 응답을 PCM 으로 가정하는 코드가 생기면 같은 문제가 난다.
3. 10-22 이후 모델 목록·차단 범위를 다시 확인할 것 (이번 확인은 10-11 기준).

## 후속 조치 (2026-10-11 21:50 UTC)
- `veo_model` 기본값을 **veo-3.1-generate-preview 로 되돌림** (visuals.py, config.py, config.example.json). gemini-omni-1.1-flash 는 지금 바로 404 라 7기홍보 `run.py` 의 veo 클립 생성이 멈추기 때문. 되돌린 값은 10-22 까지만 동작.
- 10-22 이후 영상 생성을 계속하려면 공지대로 **Gemini Enterprise Agent Platform** 으로 연동 전환이 필요하다(대표님 결정 사항). 전환 전까지는 영상 클립 대신 이미지(gemini-2.5-flash-image)+켄번스 또는 미드저니 V1 클립(midjourney-ref 스킬)으로 대체.
