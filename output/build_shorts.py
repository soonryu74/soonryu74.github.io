import subprocess, sys
SRC="/root/.claude/uploads/11800c57-83f7-54e5-ae26-d7f4e722a5a3/5f107d96-2026_10_15_18_05.mp4"
SP="/tmp/claude-0/-home-user-soonryu74-github-io/11800c57-83f7-54e5-ae26-d7f4e722a5a3/scratchpad"
FB=f"{SP}/fonts/ext/public/static/Pretendard-Bold.otf"
FM=f"{SP}/fonts/ext/public/static/Pretendard-Medium.otf"
OUT=sys.argv[1]
XF=0.35
# (start, end, mode, main caption, sub caption)
SEG=[
 (1.2, 5.6,  "hook", "사운드바 하나로\n극장을 만든다?", "WiiM Bar"),
 (12.0,16.0, "fill", "2.1인치 라운드 터치 디스플레이", "손끝으로 EQ·모드 바로 전환"),
 (25.3,27.8, "fill", "터치 · 앱 · 음성 · 리모컨", "네 가지 방식으로 조작"),
 (29.2,30.3, "fill", "터치 · 앱 · 음성 · 리모컨", "전용 리모컨 기본 포함"),
 (33.6,36.1, "fill", "돌비 애트모스 · DTS:X", "HDMI eARC 지원"),
 (49.8,53.3, "fill", "5.1.2 채널로 확장", "사운드바 하나로 시작"),
 (57.3,60.6, "fill", "서라운드 · 서브우퍼 추가", "원하는 만큼 키우는 홈시어터"),
 (61.0,63.8, "fill", "소리가 방 전체를 감싼다", "하이트 채널 입체 음향"),
 (63.8,68.5, "fill", "RoomFit 룸 보정", "폰으로 내 공간에 맞춰 자동 튜닝"),
 (72.9,77.0, "fill", "대사가 또렷하게", "Clearer Dialogue"),
 (91.0,96.0, "fill", "8개 드라이버 + 4개 패시브 라디에이터", ""),
 (102.1,104.6,"fill","탑파이어링 하이트 채널", "천장 반사로 위에서 내려오는 소리"),
 (108.2,112.0,"fill","최대 출력 135W", ""),
 (122.0,128.0,"end", "WiiM Bar", "See the Sound. Build the Theater."),
]
def esc(t): return t.replace("\\","\\\\").replace(":","\\:").replace("'","\\\\\\'").replace("%","\\%")
fc=[]; durs=[]; inputs=[]; import os; SEGDIR=f"{SP}/segs"; os.makedirs(SEGDIR,exist_ok=True)
for i,(s,e,mode,main,sub) in enumerate(SEG):
    d=e-s; durs.append(d)
    ch=450 if s==33.6 else 505; base=f"[0:v]crop=1080:{ch}:0:655," if mode!="end" else f"[0:v]crop=1080:608:0:655,"
    if mode=="end":
        base+="scale=1080:-2,pad=1080:1920:0:(oh-ih)/2:color=white,"
        txt=(f"drawtext=fontfile='{FB}':text='{esc(main)}':fontsize=96:fontcolor=0x111111:x=(w-tw)/2:y=420,"
             f"drawtext=fontfile='{FM}':text='{esc(sub)}':fontsize=44:fontcolor=0x333333:x=(w-tw)/2:y=540")
    else:
        base+="scale=-2:1920,crop=1080:1920,"
        if mode=="hook":
            txt=(f"drawtext=fontfile='{FB}':text='{esc(main)}':fontsize=104:fontcolor=white:line_spacing=18:x=(w-tw)/2:y=560:"
                 f"shadowcolor=black@0.7:shadowx=4:shadowy=4,"
                 f"drawtext=fontfile='{FM}':text='{esc(sub)}':fontsize=48:fontcolor=white@0.85:x=(w-tw)/2:y=840:shadowcolor=black@0.7:shadowx=3:shadowy=3")
        else:
            txt=(f"drawtext=fontfile='{FB}':text='{esc(main)}':fontsize=62:fontcolor=white:x=(w-tw)/2:y=1380:"
                 f"box=1:boxcolor=black@0.5:boxborderw=22")
            if sub:
                txt+=(f",drawtext=fontfile='{FM}':text='{esc(sub)}':fontsize=40:fontcolor=white@0.92:x=(w-tw)/2:y=1500:"
                      f"box=1:boxcolor=black@0.4:boxborderw=16")
    seg=f"{SEGDIR}/seg{i:02d}.mp4"
    subprocess.run(["ffmpeg","-y","-v","error","-ss",str(s),"-to",str(e),"-i",SRC,"-filter_complex",base+txt+",format=yuv420p,fps=30[v]","-map","[v]","-map","0:a",
        "-c:v","libx264","-preset","fast","-crf","16","-c:a","aac","-b:a","256k","-ar","48000","-ac","2",seg],check=True)
    inputs+=["-i",seg]
    fc.append(f"[{i}:v]setpts=PTS-STARTPTS[v{i}]"); fc.append(f"[{i}:a]asetpts=PTS-STARTPTS[a{i}]")
# xfade chain
n=len(SEG); vprev="v0"; aprev="a0"; off=0.0
for i in range(1,n):
    off+=durs[i-1]-XF
    fc.append(f"[{vprev}][v{i}]xfade=transition=fade:duration={XF}:offset={off:.3f}[vx{i}]")
    fc.append(f"[{aprev}][a{i}]acrossfade=d={XF}[ax{i}]")
    vprev=f"vx{i}"; aprev=f"ax{i}"
fc.append(f"[{vprev}]fade=t=in:st=0:d=0.5[vout]")
fc.append(f"[{aprev}]afade=t=in:st=0:d=0.5,afade=t=out:st={off+durs[-1]-1.0:.2f}:d=1.0,loudnorm=I=-14:TP=-1.5[aout]")
total=sum(durs)-XF*(n-1)
print("total sec:",round(total,1))
cmd=["ffmpeg","-y","-v","error","-stats",*inputs,"-filter_complex",";".join(fc),"-map","[vout]","-map","[aout]",
     "-c:v","libx264","-preset","medium","-crf","19","-c:a","aac","-b:a","192k","-movflags","+faststart",OUT]
subprocess.run(cmd,check=True)
