import subprocess, sys, os
SRC="/root/.claude/uploads/11800c57-83f7-54e5-ae26-d7f4e722a5a3/5f107d96-2026_10_15_18_05.mp4"
SP="/tmp/claude-0/-home-user-soonryu74-github-io/11800c57-83f7-54e5-ae26-d7f4e722a5a3/scratchpad"
FB=f"{SP}/fonts/ext/public/static/Pretendard-Bold.otf"
FM=f"{SP}/fonts/ext/public/static/Pretendard-Medium.otf"
FS=f"{SP}/fonts/ext/public/static/Pretendard-SemiBold.otf"
OUT=sys.argv[1]; D=f"{SP}/full"; os.makedirs(D,exist_ok=True)
# continuous timeline: (start, end, crop_h, main, sub)   crop_h<=505 drops the original caption band
T=[
 (0.0,  5.63, 505, "", ""),
 (5.63, 10.73,505, "See the Sound", ""),
 (10.73,22.17,505, "2.1인치 라운드\n터치 디스플레이", "손끝으로 EQ·모드 바로 전환"),
 (22.17,32.47,505, "터치 · 앱 · 음성 · 리모컨", "네 가지 방식으로 조작"),
 (32.47,46.0, 450, "돌비 애트모스 · DTS:X", "HDMI eARC 지원"),
 (46.0, 49.5, 505, "3.0.2 채널로 시작", ""),
 (49.5, 61.0, 505, "5.1.2 채널로 확장", "서라운드·서브우퍼 추가 가능"),
 (61.0, 63.77,505, "소리가 방 전체를 감싼다", "하이트 채널 입체 음향"),
 (63.77,72.9, 505, "RoomFit 룸 보정", "폰으로 내 공간에 맞춰 자동 튜닝"),
 (72.9, 77.07,505, "대사가 또렷하게", "Clearer Dialogue"),
 (77.07,80.17,505, "WiiM Home 앱", ""),
 (80.17,84.83,505, "주요 스트리밍 서비스 지원", "DLNA/UPnP · TIME CONNECT"),
 (84.83,90.93,505, "모든 방을 하나로", "Every Room in Sync"),
 (90.93,100.17,505,"8개 드라이버 +\n4개 패시브 라디에이터", ""),
 (100.17,104.6,505,"탑파이어링 하이트 채널", "천장 반사로 위에서 내려오는 소리"),
 (104.6,115.67,505,"최대 출력 135W", ""),
 (115.67,121.17,505,"", ""),
 (121.17,133.6,"end","WiiM Bar","See the Sound. Build the Theater."),
]

def cap(main, sub):
    # Shorts safe zone: main at ~58% height, clear of the top bar, right-side icons and bottom title area
    lines = main.count("\n")+1
    y_main = 1120 if lines==1 else 1060
    y_sub  = y_main + lines*86 + 36
    t = (f",drawtext=fontfile='{FB}':text='{esc(main)}':fontsize=70:fontcolor=white:line_spacing=14:text_align=C:x=(w-tw)/2:y={y_main}:"
         f"borderw=6:bordercolor=black:shadowcolor=black@0.6:shadowx=3:shadowy=3")
    if sub:
        t += (f",drawtext=fontfile='{FS}':text='{esc(sub)}':fontsize=46:fontcolor=0xFFE86B:x=(w-tw)/2:y={y_sub}:"
              f"borderw=5:bordercolor=black:shadowcolor=black@0.6:shadowx=2:shadowy=2")
    return t

def esc(t): return t.replace("\\","\\\\").replace(":","\\:").replace("'","\\\\\\'").replace("%","\\%")
lst=[]
for i,(s,e,ch,main,sub) in enumerate(T):
    if ch=="end":
        vf="crop=1080:608:0:655,scale=1080:-2,pad=1080:1920:0:(oh-ih)/2:color=white"
        vf+=f",drawtext=fontfile='{FB}':text='{esc(main)}':fontsize=96:fontcolor=0x111111:x=(w-tw)/2:y=420"
        vf+=f",drawtext=fontfile='{FM}':text='{esc(sub)}':fontsize=44:fontcolor=0x333333:x=(w-tw)/2:y=540"
    else:
        vf=f"crop=1080:{ch}:0:655,scale=-2:1920,crop=1080:1920"
        if main:
            vf+=cap(main,sub)
    seg=f"{D}/f{i:02d}.mp4"
    subprocess.run(["ffmpeg","-y","-v","error","-ss",str(s),"-to",str(e),"-i",SRC,"-vf",vf+",format=yuv420p,fps=30","-an",
                    "-c:v","libx264","-preset","fast","-crf","16",seg],check=True)
    lst.append(f"file '{seg}'")
open(f"{D}/list.txt","w").write("\n".join(lst)+"\n")
subprocess.run(["ffmpeg","-y","-v","error","-stats","-f","concat","-safe","0","-i",f"{D}/list.txt","-i",SRC,
    "-map","0:v","-map","1:a","-af","loudnorm=I=-14:TP=-1.5,aresample=48000","-c:v","libx264","-preset","medium","-crf","19","-c:a","aac","-b:a","192k",
    "-shortest","-movflags","+faststart",OUT],check=True)
