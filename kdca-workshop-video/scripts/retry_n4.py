"""n4 내레이션을 '길' 발음이 확인될 때까지 재생성"""
import base64,json,urllib.request,subprocess,sys
H={"Content-Type":"application/json","x-goog-api-key":"dummy"}
Q="이 음성의 첫 문장에서 '누구도 가 보지 않은' 바로 다음에 나오는 한 음절 명사를 들리는 그대로 한 글자로만 답하세요 (예: 길, 글, 귤)."
Q2="이 음성의 맨 처음에 말하는 연도를 들리는 그대로 한글 음절로만 적어 주세요 (예: 이천십 년 / 이천이십 년)."
def ask(q):
    b=base64.b64encode(open("public/audio/n4.mp3","rb").read()).decode()
    body={"contents":[{"parts":[{"text":q},{"inlineData":{"mimeType":"audio/mp3","data":b}}]}]}
    r=urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",data=json.dumps(body).encode(),headers=H)
    return json.load(urllib.request.urlopen(r,timeout=120))["candidates"][0]["content"]["parts"][0]["text"].strip()
for i in range(8):
    subprocess.run([sys.executable,"scripts/gen_audio.py","tts","n4"],capture_output=True)
    a=[ask(Q) for _ in range(3)]; y=[ask(Q2) for _ in range(2)]
    print(i,a,y,flush=True)
    if all(x.strip(" .*")=="길" for x in a) and all("이천이십" in x for x in y): print("OK"); break
