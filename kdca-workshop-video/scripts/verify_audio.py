"""내레이션 받아쓰기 검증"""
import sys,base64,json,urllib.request,re
H={"Content-Type":"application/json","x-goog-api-key":"dummy"}
B="https://generativelanguage.googleapis.com/v1beta/"
ms=json.load(urllib.request.urlopen(urllib.request.Request(B+"models?pageSize=200",headers=H)))["models"]
M=sorted(m["name"] for m in ms if re.fullmatch(r"models/gemini-[0-9.]+-flash",m["name"]))[-1]
print(M)
for n in sys.argv[1:]:
    b=base64.b64encode(open(f"public/audio/{n}.mp3",'rb').read()).decode()
    body={"contents":[{"parts":[{"text":"Transcribe this audio verbatim. Output only the transcript."},{"inlineData":{"mimeType":"audio/mp3","data":b}}]}]}
    try: print(n,json.load(urllib.request.urlopen(urllib.request.Request(B+M+":generateContent",data=json.dumps(body).encode(),headers=H),timeout=120))["candidates"][0]["content"]["parts"][0]["text"].strip())
    except Exception as e: print(n,"ERR",e)
