import numpy as np, wave
SR=44100; DUR=59.0
N=int(SR*DUR); L=np.zeros(N); Rr=np.zeros(N)
rng=np.random.default_rng(3)
def add(sig,t0,pan=0.0,gain=1.0):
    i=int(t0*SR); j=min(N,i+len(sig))
    if i>=N or j<=i: return
    s=sig[:j-i]*gain
    L[i:j]+=s*(1-max(0,pan)); Rr[i:j]+=s*(1+min(0,pan))
def tt(d): return np.arange(int(d*SR))/SR
def env(d,a=.01,r=.1):
    n=int(d*SR);e=np.ones(n);na=min(n,max(1,int(a*SR)));nr=min(n,max(1,int(r*SR)))
    e[:na]=np.linspace(0,1,na);e[-nr:]=np.minimum(e[-nr:],np.linspace(1,0,nr));return e
def sine(f,d,a=.01,r=.1,h=(1,)):
    t=tt(d);x=sum((1/(k))*np.sin(2*np.pi*f*k*t) for k in h);return x*env(d,a,r)
def noise(d,lp=None):
    x=rng.standard_normal(int(d*SR))
    if lp:
        a=np.exp(-2*np.pi*lp/SR);y=np.zeros_like(x);p=0
        for i in range(len(x)): p=a*p+(1-a)*x[i];y[i]=p
        x=y*(1/ (np.std(y)+1e-9))*0.7
    return x
def lpfilt(x,fc):
    a=np.exp(-2*np.pi*fc/SR);y=np.empty_like(x);p=0.0
    for i in range(len(x)):
        p=a*p+(1-a)*x[i];y[i]=p
    return y
def sweep(f0,f1,d,a=.01,r=.1):
    t=tt(d);f=f0+(f1-f0)*(t/d)**1.0;ph=2*np.pi*np.cumsum(f)/SR;return np.sin(ph)*env(d,a,r)
# 에코/리버브(간단)
def echo(buf,delay,fb,times):
    out=buf.copy()
    for k in range(1,times+1):
        d=int(delay*SR*k);out[d:]+=buf[:-d]*(fb**k)
    return out

# ---- 1) 음악 베드 ----
def pad(freqs,t0,d,g=.05,lfo=.15):
    t=tt(d)
    x=np.zeros_like(t)
    for f in freqs:
        for det in (-.004,0,.004):
            x+=np.sin(2*np.pi*f*(1+det)*t+rng.random()*6)+.3*np.sin(2*np.pi*f*2*(1+det)*t)
    x*= (0.8+0.2*np.sin(2*np.pi*lfo*t))
    x*=env(d,min(2,d/3),min(2,d/3))
    add(x/len(freqs)/3*g*3,t0)
A2,E3,A3,C4,E4=110,164.81,220,261.63,329.63
# 긴장 구간 0~36: Am 드론
pad([A2,E3,A3,C4],0,36.5,g=.35)
pad([A2*1.5, E4],2.2,34,g=.12,lfo=.3)
# 36~56 밝은 C 메이저
C3,G3,C4_,E4_,G4,B4,C5,E5,G5=130.81,196,261.63,329.63,392,493.88,523.25,659.25,783.99
pad([C3,G3,C4_,E4_],35.5,22,g=.38)
pad([G3,B4/2,E4_,G4],42,16,g=.22)
pad([C3,G3,C4_,E4_,G4],55,4,g=.35)
# 아르페지오 (42~56)
seq=[C5,E5,G5,E5,C5,G4,E5,G5]
k=0;t=42.0
while t<55.5:
    f=seq[k%len(seq)]
    s=sine(f,1.4,a=.005,r=1.2,h=(1,2,3))*0.18
    add(s,t,pan=(-.3 if k%2 else .3));k+=1;t+=.5
# 36~42 하강 리졸브
for i,f in enumerate([E5,C5,G4]): add(sine(f,2.5,.01,2.2,h=(1,2))*.16,37.8+i*.35,0)
# 마지막 차임
for t0,f in [(47.0,C5),(50.2,G5),(56.0,C5)]:
    add(echo(sine(f,2.5,.003,2.4,h=(1,2,4))*.25,.22,.5,4)[:int(3*SR)],t0)
# ---- 2) 효과음 ----
def blip(f,d=.12,g=.25): return sine(f,d,.005,.07,h=(1,2))*g
# 시간 정지 (2.2)
add(sweep(1200,90,1.3,.005,1.0)*.28,2.2)
add(noise(.6,lp=300)*env(.6,.002,.6)*.6,2.2)
add(echo(sine(988,1.2,.01,1.1)*.18,.18,.5,4),2.5)
add(sweep(300,1400,.7,.2,.2)*.14,2.7)
# 카운트다운
for base in (4,14,24):
    for i,f in enumerate((660,660,990)): add(blip(f),base+i*.8)
# S2 교통
carT0=4+2.4; tBrk=2.4+(2400-1260)/900
add(noise(1.6,lp=900)*np.linspace(0,1,int(1.6*SR))**2*.0+0,0) # placeholder
# 접근 엔진 소리 (노이즈 상승+도플러 느낌)
d=1.6;eng=noise(d,lp=240)*np.sin(np.linspace(0,np.pi*0.9,int(d*SR)))*.9
add(eng,4+tBrk-1.3,pan=.5,gain=.6)
# 경적
hornT=4+tBrk-0.15
for f in (392,494): add((np.sign(np.sin(2*np.pi*f*tt(.55)))*.5+np.sin(2*np.pi*f*tt(.55))*.5)*env(.55,.01,.06)*.12,hornT,pan=.4)
# 급제동 (스키드 소리)
sk=noise(.75,lp=3500)*np.linspace(1,.3,int(.75*SR)); sk=sk-lpfilt(sk,1800)
add(sk*.5,4+tBrk,pan=.3)
add(sine(60,.35,.002,.3,h=(1,2))*.7,4+tBrk+.72)
# 경고 하트비트
def thump(t0,g=.5):
    add(sine(55,.22,.002,.2,h=(1,2))*g,t0);add(sine(55,.18,.002,.16,h=(1,2))*g*.7,t0+.2)
for base,st in ((4,5.4),(14,6.3),(24,7.0)):
    t=base+st
    while t<base+(8.9 if base!=24 else 11):
        thump(t,.38);t+=.78
# 경고음 (낮은 알람)
def alarm(t0,d=.6,g=.14):
    x=np.sign(np.sin(2*np.pi*(440+120*np.sign(np.sin(2*np.pi*3*tt(d))))*tt(d)))
    add(lpfilt(x*env(d,.01,.08),2500)*g,t0)
alarm(4+tBrk+.2);alarm(19.6);alarm(24+6.6,.8)
# S3 빗소리 14~24
rain=lpfilt(noise(10,None),6000); rain=rain-lpfilt(rain,900)
add(rain*.22*env(10,1,1),14)
# 미끄러짐 (19.0)
add(sweep(900,200,.45,.01,.2)*.2,19.0)
add(noise(.3,lp=2000)*env(.3,.002,.28)*.4,19.4)
for i,(dt,f) in enumerate([(.25,1500),(.45,900),(.58,1200)]): add(blip(f,.05,.2),19.0+dt+.4)  # 폰 튕김
# S4 알림 / 터치
add(blip(1174,.12,.22),26.0);add(blip(1568,.14,.22),26.14)
add(noise(.05,lp=3000)*.5,24+6.55)
add(sweep(1600,300,.5,.005,.4)*.22,24+6.6)
# S5 되감기 (36~37.8)
add(sweep(150,2400,1.7,.05,.1)*.2,36.0)
add(lpfilt(noise(1.8),3000)*np.linspace(.2,.5,int(1.8*SR))*.5,36.0)
add(sweep(2400,600,.35,.01,.3)*.12,37.7)
# 초록불 (36+1.8+2.4)
add(blip(784,.18,.22),40.2);add(blip(1047,.3,.22),40.42)
# 차 지나감 40.8~42.6
d=2.2;x=noise(d,lp=420)*np.sin(np.linspace(0,np.pi,int(d*SR)))*.9
add(x,40.6,pan=.6);
add(x*0.0,0)
pan=np.linspace(.6,-.6,1) 
# 발걸음 43~45.8
t=43.0
while t<45.8:
    add(noise(.07,lp=700)*env(.07,.001,.06)*.5,t);t+=.46
# ---- 3) 마스터 ----
m=np.stack([L,Rr],1)
fade=np.ones(N);fade[:int(.25*SR)]=np.linspace(0,1,int(.25*SR));fade[-int(.8*SR):]=np.linspace(1,0,int(.8*SR))
m*=fade[:,None]
m/=np.max(np.abs(m))*1.0
m*=0.85
pcm=(m*32767).astype(np.int16)
with wave.open('audio.wav','wb') as w:
    w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
print('ok',m.shape)
