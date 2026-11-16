#!/usr/bin/env python3
"""《입구》 v8 단일 진실 소스 생성기. v7 샷 정의(../v7/tools/gen_v7.py)를 가져와 바꾸고 새 샷을 더한다.
실행: python3 tools/gen_v8.py  (v8 폴더에서) -> 02 샷리스트, 03 프롬프트, 05 자막, 09 예산"""
import csv, math, os, copy, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..")
sp = importlib.util.spec_from_file_location("g7", os.path.join(HERE, "..", "..", "v7", "tools", "gen_v7.py")); g7 = importlib.util.module_from_spec(sp); sp.loader.exec_module(g7)
V7 = {s["shot_id"]: s for s in g7.S}; CH = dict(g7.CH); STYLE = g7.STYLE; CAVE = g7.CAVE_LIGHT
INTRO_SEC, CREDIT_SEC, PRICE, MIN_GEN, MAX_GEN = 20, 20, 0.37, 4, 15
NEG = g7.NEG + ", banners, posters, signs, printed letters on props, audience behind the speaker, hand touching cave wall, black bars"
CH["H07"] = "Kim Hae-in at 7, a small Korean girl with a short bob, yellow raincoat, wearing her father's oversized white hard hat and oversized yellow rubber-coated work gloves"
RAIN = "grey overcast rain, flat daylight"; LAKE = CAVE + " Still black water mirroring the beams."
HALL_BG = " Behind her is only a plain wall with a dim projected photo of a dark cave; no audience visible behind her, no banners, no signs, no posters."
SIL = ("Near-total darkness on a black underground lake; one tiny warm light far across the water gives only a faint rim on two seated silhouettes "
       "at opposite ends of a small inflatable boat, an old man in a hard hat on the left and a woman on the right, a wide empty space between them. "
       "They do not face each other; both look down at the water. Arms close to their own bodies; no arms or hands extend into the space between them. "
       "No faces visible, no hands visible. Full-frame 16:9, no black bars.")
S = []
def _add(s, scene, dur):
    s = copy.deepcopy(s); s["scene_id"] = scene; s["duration_sec"] = dur
    s["shot_id"] = f"{scene}-{sum(1 for x in S if x['scene_id']==scene)+1:02d}"
    if s["ai_tool"] == "Seedance": s["negative_prompt"] = NEG
    S.append(s); return s
def take(v7id, scene, dur, **over):          # v7 샷 재사용
    s = dict(V7[v7id]); s.update(over); return _add(s, scene, dur)
def new(scene, dur, typ, chars, action, camera, light, audio, prompt, cont, claim, tool="Seedance", tries=4):
    return _add(dict(shot_type=typ, characters=chars, action=action, camera=camera, lighting=light, audio=audio, ai_tool=tool,
                     prompt=prompt, negative_prompt="n/a", continuity_id=cont, source_claim_id=claim, tries=tries), scene, dur)
r = lambda s, a, b: s.replace(a, b)

take("S0-01", "S0", INTRO_SEC)
# S1 꿈 14
new("S1",5,"dream wide","-","꿈: 온통 흰 벽, 아이의 숨소리","slow drift, soft focus","soft white glow, no visible source","아이 숨소리",
    "Dreamlike shot, a vast snow-white mineral cave wall filling the frame, soft glowing haze, shallow focus drifting slowly, quiet and unreal.","LOC_CAVE_WALL","C31")
new("S1",6,"dream close","H07","너무 큰 노란 장갑을 낀 작은 손이 흰 쪽으로 뻗는다. 화면 밖 '해인아!'","close on small hand, soft focus","soft white glow","숨소리, 화면 밖 남자 목소리",
    "Dreamlike close shot, a small child's hand wearing a far too large bright yellow rubber-coated work glove reaches slowly toward a glowing white wall, soft haze, shallow focus; the hand stops and the image begins to fade.","CH_H07;PR_GLOVE_NEW;LOC_CAVE_WALL","C31",tries=8)
new("S1",3,"black","-","암전","black frame","none","정적","n/a (black frame, edit)","EDIT_BLACK","C31",tool="NONE",tries=0)
# S2 2005 (무엇을 끌어안았는지는 숨긴다) 30
take("S1-01","S2",5, prompt=r(V7["S1-01"]["prompt"],"working beside a dug hole","standing beside a dug hole"))
take("S1-03","S2",4)
new("S2",4,"close","-","구멍: 바닥 없는 검은 허공, 찬 김","locked close",RAIN,"낮은 바람",
    "Close shot in rain of a narrow ragged break in muddy ground that opens into a vast black void below, like the roof of a cave; only pure darkness inside, no bottom, no soil walls, no roots; faint cold mist rising.","LOC_FIELD","F01")
new("S2",3,"close","D44","구멍 가장자리로 다급하게 뻗어 버티는 어른의 팔","close on forearm",RAIN,"거친 숨, 빗소리",
    "Close shot in rain, a man's forearm in a rain-soaked navy sleeve thrust down over the muddy edge of a hole, straining hard, his grip hidden below the frame edge; nothing below the edge is shown.","CH_D44;LOC_FIELD","C30",tries=6)
new("S2",4,"top-down","-","노란 장갑 한 짝이 어둠으로 떨어진다","top-down into the hole","weak daylight from above","장갑이 늦게 떨어지는 울림",
    "Top-down shot into a black void, a single clean bright yellow rubber-coated work glove tumbling down away from camera, shrinking until the darkness swallows it.","PR_GLOVE_NEW","C02",tries=8)
take("S1-06","S2",5, action="동수 얼굴: 공포, 거친 숨. 화면 아래의 무언가를 끌어안고 있다. 타이틀 합성",
     prompt=f"Close-up, {CH['D44']}, rain on his face, breathing hard, terrified, looking down at something he clutches against his chest just below the frame; the frame never shows what he holds.", tries=8)
new("S2",5,"wide from behind","D44","빗속에 웅크린 동수의 뒷모습. 주위엔 아무도 없다","static wide from behind",RAIN,"빗소리",
    f"Wide shot from behind, {CH['D44']} kneeling hunched over beside a hole and a utility pole in an empty rainy field, his body hiding whatever he holds; he glances over his shoulder; nobody else around.","CH_D44;LOC_FIELD","C30",tries=6)
# S3 행사장 26
take("S2-01","S3",4); take("S2-02","S3",4)
take("S2-03","S3",4, prompt=V7["S2-03"]["prompt"]+HALL_BG)
take("S2-04","S3",3, prompt=f"Close-up, {CH['H31']} looks past the camera toward the back of the room and goes very still, without widening her eyes."+HALL_BG)
take("S2-05","S3",3)
take("S2-06","S3",3, prompt=f"Close-up, {CH['H31']} lowers her eyes and says one short flat sentence, face controlled, almost blank."+HALL_BG)
take("S2-07","S3",3); take("S2-08","S3",2)
# S4 사무실 18
take("S3-01","S4",3); take("S3-02","S4",4)
new("S4",4,"insert","-","보고서 표지의 붉은 도장(후반 합성 텍스트)","top-down insert","cool overcast window light","정적",
    "Top-down insert of a worn grey report cover on a desk with a blank rectangular area where a stamp will be composited. No readable text.","LOC_OFFICE;TXT_05","C32")
take("S3-03","S4",4); take("S3-04","S4",3)
# S5 집 38
take("S4-01","S5",5); take("S4-02","S5",3); take("S4-03","S5",4); take("S4-04","S5",5); take("S4-05","S5",3); take("S4-06","S5",5)
take("S4-07","S5",6, prompt=f"Medium shot, {CH['H34']} places a sheet of paper on the dining table and says two short quiet sentences.")
take("S4-08","S5",5); take("S4-09","S5",2)
# S6 입구 18
take("S5-01","S6",3); take("S5-02","S6",6); take("S5-03","S6",4); take("S5-04","S6",5)
# S7 흰 벽 28
take("S6-01","S7",5); take("S6-02","S7",3)
new("S7",7,"side-on medium close","D64","옆얼굴의 동수가 벽에 손을 뻗다 한 뼘 앞에서 멈추고 거둔다. 화면 밖 '만지면 안 돼요.'","static side-on",CAVE,"대사(화면 밖), 물방울",
    f"Side-on medium close shot: {CH['D64']} in profile on the left, wearing an old yellowed white hard hat with a small black headlamp glowing warm orange, no letters on the strap. A white mineral cave wall on the right, also side-on, so the dark air between his fingertips and the wall is clearly visible as a gap. He raises his bare hand toward the wall, absorbed; the hand stops a hand's width short and holds; the gap stays visible the whole time and the fingertips never make contact. Then he slowly lowers the hand and looks down.","CH_D64;PR_HELMET;PR_LAMP;LOC_CAVE_WALL","C13",tries=8)
take("S6-05","S7",3)
new("S7",3,"close-up","H34","이번엔 해인이 벽을 너무 오래 본다","slow push-in",CAVE,"물방울",
    f"Close-up, {CH['H34']} in a helmet with a headlamp, staring at a white cave wall off-screen for too long, a flicker of recognition and unease.","CH_H34;LOC_CAVE_WALL","C31")
new("S7",4,"close-up","H34","해인 대사: 꿈에서 본 것 같다","static close-up",CAVE,"대사",
    f"Close-up, {CH['H34']} still looking at the wall, says one hesitant sentence almost to herself.","CH_H34;LOC_CAVE_WALL","C31",tries=6)
new("S7",3,"close-up","D64","동수가 딸을 돌아본다. 입을 열었다가 닫는다","static close-up",CAVE,"정적",
    f"Close-up, {CH['D64']} turns his head toward his daughter, opens his mouth to speak, then closes it and looks away.","CH_D64","C30",tries=6)
# S8 호수 34
take("S7-01","S8",6); take("S7-02","S8",4); take("S7-03","S8",5); take("S7-04","S8",5); take("S7-05","S8",5)
take("S7-06","S8",5, action="동수가 노를 잡은 딸의 오른손을 본다", prompt="Close shot of a woman's right hand gripping an oar, tilt up to an old man's eyes watching that hand, unable to speak.")
take("S7-07","S8",4)
# S9 장갑·회상 64
new("S9",5,"wide","-","랜턴 빛이 검은 바위를 훑다가 노란색에 멈춘다","beam drifts right and stops","one narrow warm orange headlamp beam; nothing outside the beam visible","물방울, 숨 멎는 소리",
    "Inside a completely black lava tube cave, the only light is one narrow warm orange headlamp beam, a small moving circle; no ambient light, no cool or green tones. The beam starts on bare wet black rock, drifts slowly to the right, catches a patch of dull yellow and stops on it: a single old rubber-coated work glove lying in a rock crevice, clearly empty, flat and collapsed, faded ochre yellow, more than half covered by a hard white mineral crust.","LOC_CREVICE;PR_GLOVE_AGED","C16",tries=8)
take("S8-02","S9",3, prompt="Macro shot, a single old right work glove lying flat and collapsed in a rock crevice, clearly empty, dull faded ochre yellow, a hard white mineral crust like limescale fusing it to the black rock, beige knit cuff frayed; lit only by one warm orange headlamp beam.")
take("S8-03","S9",4); take("S8-04","S9",3)
take("S8-05","S9",5); take("S8-06","S9",3); take("S8-07","S9",2)
new("S9",5,"close-up","D64","'그건 내 손에서 빠진 게 아니다.'","very slow push-in",CAVE,"대사",
    f"Close-up, {CH['D64']} eyes fixed on the crevice, says one slow heavy sentence.","CH_D64","C30",tries=6)
new("S9",4,"flashback wide","H07","2005년: 아빠 안전모와 큰 장갑을 낀 일곱 살 해인이 도시락 보자기를 들고 걸어온다","static wide",RAIN,"빗소리, 아이 발소리",
    f"Wide shot in light rain on a Jeju field with black stone walls and a utility pole, {CH['H07']}, carrying a cloth-wrapped lunch bundle, walking toward camera, smiling.","CH_H07;PR_GLOVE_NEW;PR_HELMET;LOC_FIELD","C30",tries=8)
new("S9",2,"flashback close","H07","아이 발밑의 흙이 꺼진다","close on small rain boots",RAIN,"흙 무너지는 소리",
    "Close shot of a child's small yellow rain boots on wet soil as the ground beneath them suddenly sags and cracks. The shot cuts before any fall is seen.","CH_H07;LOC_FIELD","C30",tries=6)
new("S9",4,"flashback close","D44;H07","동수의 손이 아이 손목을 붙잡는다. 아이 손에서 장갑만 미끄러져 떨어진다","close on hands",RAIN,"거친 숨, 빗소리",
    "Close shot in rain over the muddy edge of a hole: a man's strong bare hand grips a small child's wrist tightly; an oversized bright yellow work glove slips off the child's small hand and drops away into darkness; the man's grip holds firm.","CH_D44;CH_H07;PR_GLOVE_NEW","C30",tries=10)
new("S9",4,"flashback medium","D44;H07","아이를 끌어올려 끌어안는다. 아이는 울지도 못한다","static medium",RAIN,"숨소리",
    f"Medium shot in rain, {CH['D44']} on his knees clutching a small girl in a yellow raincoat tightly against his chest beside a hole; the girl is safe, wide-eyed and silent; one oversized yellow glove still on her left hand, her right hand bare.","CH_D44;CH_H07;PR_GLOVE_NEW;LOC_FIELD","C30",tries=8)
new("S9",4,"flashback wide","D44;H07","한 손으로 아이를 안은 채 합판으로 구멍을 덮고 걸어 나간다","static wide, he exits frame",RAIN,"합판 끌리는 소리, 빗소리",
    f"Wide shot in rain, {CH['D44']} carrying a small girl on one arm drags a sheet of plywood over a hole beside a utility pole with his free hand, then walks away carrying her without looking back.","CH_D44;CH_H07;LOC_FIELD","C28",tries=8)
new("S9",4,"close","H34","해인이 자기 오른손을 내려다본다","close on her right hand, tilt to her face",CAVE,"물방울",
    f"Close shot, a woman's bare right hand slowly opening in warm headlamp light, tilt up to the face of {CH['H34']}, stunned.","CH_H34","C30",tries=6)
new("S9",4,"close-up","D64","'찾은 건 너다. 일곱 살짜리가.'","static close-up",CAVE,"대사",
    f"Close-up, {CH['D64']} finally looking straight at his daughter, says two short quiet sentences.","CH_D64","C30",tries=6)
new("S9",5,"close-up","D64","'넌 그 뒤로 일 년을 말을 안 했다.'","static close-up",CAVE,"대사",
    f"Close-up, {CH['D64']} voice almost gone, says one slow sentence, eyes wet.","CH_D64","C33",tries=6)
take("S8-13","S9",3)
# S10 어둠 52
take("S9-01","S10",3); take("S9-02","S10",3); take("S9-03","S10",3); take("S9-04","S10",8)
for dur, act in ((5,"해인: '왜 말 안 했어요. 이십 년을.'"),(7,"동수: '네가 다시 입을 뗀 날… 그걸로 됐다 싶었다.'"),
                 (8,"해인: '그날, 뒷문에 계신 거 봤어요.' / '보고도… 모른다고 했어요.'"),(6,"동수: '내가 안 갔어야 했다.' 해인: '아니요.' 실루엣 하나가 조금 기운다")):
    new("S10",dur,"silhouette wide","H34;D64",act,"static wide, same frame for all four","distant single light, rim only","대사, 물방울",
        f"Static wide shot. {SIL} Both figures almost completely still.","CH_H34;CH_D64;PR_HELMET;LOC_LAKE","C20",tries=6)
take("S9-09","S10",6, prompt="Close shot. The very first second is pure black. Then a headlamp clicks on and warm orange light reveals two hands on the rubber edge of a small boat, black water behind: one hand already resting on top of the other. The top hand is clearly a woman's, smaller and slender with smooth skin, from a dark green field jacket sleeve. The bottom hand is an old man's, large, weathered and wrinkled, from a faded navy work jacket sleeve. The hands stay completely still.")
take("S9-10","S10",3)
# S11 지상 30
take("S10-01","S11",3); take("S10-02","S11",2); take("S10-03","S11",3); take("S10-04","S11",4); take("S10-05","S11",3); take("S10-06","S11",3); take("S10-07","S11",4)
new("S11",2,"insert","-","뒤에서 철문이 닫히고 자물쇠가 채워진다","close on padlock","low golden evening light","철문, 자물쇠",
    "Close shot, an iron gate swings shut and a gloved hand snaps a heavy padlock closed, golden evening light.","LOC_GATE","C32")
take("S10-08","S11",3); take("S10-09","S11",3)
# S12 집 16
take("S11-01","S12",8, action="신발장: 왼쪽 장갑 옆에 오른쪽 장갑을 내려놓는다. 한 켤레. 어른 장갑이다")
take("S11-02","S12",8)
take("S12-01","S13",CREDIT_SEC)
t = 0
for s in S: s["start_sec"] = t; t += s["duration_sec"]

SUBS = [
 ("S1-02",4.0,1.6,"dialogue","동수(화면 밖)","해인아!","Hae-in!"),
 ("S2-06",1.5,3.0,"title","","입구","THE OPENING"),
 ("S3-03",0.5,3.3,"dialogue","주민(화면 밖)","발견한 인부가 아버님이라던데요.","I heard the worker who found it\nis your father."),
 ("S3-06",0.6,2.2,"dialogue","해인","…모르는 분입니다.","...I don't know him."),
 ("S4-02",0.2,3.6,"text","","「발견 경위: 공사 인부, 성명 미상」","\"Found by: a construction worker,\nname unknown\""),
 ("S4-03",0.3,3.4,"text","","「최종 조사 · 이후 영구 폐쇄」","\"Final survey.\nPermanent closure to follow.\""),
 ("S4-04",1.0,2.5,"text","","김동수","Kim Dong-su"),
 ("S5-06",2.5,2.0,"dialogue","동수","3년 만이구나.","Three years."),
 ("S5-07",1.6,4.0,"dialogue","해인","내일이면 영영 닫혀요. 같이 가요.","Tomorrow it closes for good.\nCome with me."),
 ("S7-03",3.0,2.2,"dialogue","해인","만지면 안 돼요.","Don't touch it."),
 ("S7-06",0.4,3.4,"dialogue","해인","…여기, 꿈에서 본 것 같아요.","...I think I've seen this place.\nIn a dream."),
 ("S8-04",0.8,3.2,"dialogue","동수","눈이… 없는 건가?","It has... no eyes?"),
 ("S8-05",0.5,3.8,"dialogue","해인","여기선 다른 걸로 길을 찾겠죠.","Down here, it must find its way\nby something else."),
 ("S9-05",0.2,4.6,"dialogue","해인","아버지 거죠? 이거면 이름 넣을 수 있어요.","It's yours, isn't it?\nWith this, I can put your name in."),
 ("S9-06",0.5,1.8,"dialogue","동수","넣지 마라.","Don't."),
 ("S9-08",0.5,4.0,"dialogue","동수","그건 내 손에서 빠진 게 아니다.","That didn't come off my hand."),
 ("S9-15",0.3,3.4,"dialogue","동수","찾은 건 너다. 일곱 살짜리가.","You found it.\nA seven-year-old."),
 ("S9-16",0.4,4.2,"dialogue","동수","넌 그 뒤로 일 년을 말을 안 했다.","After that, you didn't speak\nfor a year."),
 ("S10-05",1.0,3.4,"dialogue","해인","왜 말 안 했어요. 이십 년을.","Why didn't you tell me?\nFor twenty years."),
 ("S10-06",1.0,5.2,"dialogue","동수","네가 다시 입을 뗀 날… 그걸로 됐다 싶었다.","The day you spoke again...\nI thought, that's enough."),
 ("S10-07",0.8,2.8,"dialogue","해인","그날, 뒷문에 계신 거 봤어요.","That day, I saw you at the back door."),
 ("S10-07",4.4,3.2,"dialogue","해인","보고도… 모른다고 했어요.","I saw you...\nand I said I didn't know you."),
 ("S10-08",0.8,2.4,"dialogue","동수","내가 안 갔어야 했다.","I shouldn't have gone."),
 ("S10-08",4.2,1.4,"dialogue","해인","아니요.","No."),
 ("S11-03",0.5,2.0,"dialogue","해인","비워 두세요.","Leave it blank."),
 ("S11-04",1.6,2.2,"dialogue","팀장","그럼 이분은…","Then this gentleman is..."),
 ("S11-05",0.5,2.2,"dialogue","해인","제 아버지예요.","He's my father."),
 ("S11-09",0.3,2.5,"dialogue","해인","아빠. 밥 먹고 가요.","Dad. Stay for dinner."),
]
REF = {"CH_D44":"동수 44세","CH_D61":"동수 61세 양복","CH_D64":"동수 64세","CH_H31":"해인(행사장, 조끼)","CH_H34":"해인(현재, 녹색 재킷)","CH_H07":"해인 7세(신규)","CH_LEAD":"팀장",
       "PR_GLOVE_NEW":"장갑: 새것","PR_GLOVE_LEFT":"장갑: 먼지 앉은 왼쪽","PR_GLOVE_AGED":"장갑: 침전물 앉은 오른쪽","PR_HELMET":"안전모","PR_LAMP":"안전모+헤드랜턴"}
def tc(x):
    ms = round(x*1000); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000); return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
def main():
    by = {s["shot_id"]: s for s in S}; subs = []
    for sid, off, dur, kind, who, ko, en in SUBS:
        st = by[sid]["start_sec"] + off; subs.append(dict(shot_id=sid, start=st, end=st+dur, ko=ko, en=en, who=who))
    for s in S: s["subtitle"] = " / ".join(x["en"].replace("\n", " ") for x in subs if x["shot_id"] == s["shot_id"])
    cols = ["shot_id","scene_id","start_sec","duration_sec","shot_type","characters","action","camera","lighting","audio","subtitle","ai_tool","prompt","negative_prompt","continuity_id","source_claim_id"]
    with open(f"{OUT}/02_shotlist_v8.csv","w",newline="",encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore"); w.writeheader(); w.writerows(S)
    for name, both in (("05_subtitles_ko_en_v8.srt",True),("05b_subtitles_en_burnin_v8.srt",False)):
        with open(f"{OUT}/{name}","w",encoding="utf-8") as f:
            for i, x in enumerate(subs, 1):
                f.write(f"{i}\n{tc(x['start'])} --> {tc(x['end'])}\n{(x['ko'].replace(chr(10),' ')+chr(10)+x['en']) if both else x['en']}\n\n")
    with open(f"{OUT}/09_production_budget_v8.csv","w",newline="",encoding="utf-8-sig") as f:
        w = csv.writer(f); w.writerow(["shot_id","edit_sec","gen_sec_per_try","tries_assumed","gen_sec_total","usd_per_sec_ASSUMED","usd_est"]); ts = tu = 0
        for s in S:
            if s["ai_tool"] != "Seedance": continue
            g = min(MAX_GEN, max(MIN_GEN, math.ceil(s["duration_sec"])+1)); gs = g*s["tries"]; u = round(gs*PRICE, 2); ts += gs; tu += u
            w.writerow([s["shot_id"], s["duration_sec"], g, s["tries"], gs, PRICE, u])
        w.writerow(["TOTAL_SEEDANCE","","","",ts,PRICE,round(tu,2)]); w.writerow(["CONTINGENCY_30PCT","","","","","",round(tu*0.3,2)])
    lines = {}
    for x in subs: lines.setdefault(x["shot_id"], []).append(f"{x['who']}: {x['ko']}" if x["who"] else x["ko"])
    with open(f"{OUT}/03_seedance_prompts_v8.md","w",encoding="utf-8") as f:
        f.write("# 《입구》 v8 — Seedance 프롬프트 (제작용)\n\n> `tools/gen_v8.py`가 생성. 화면 비율 16:9, 1080p. 샷마다 '첨부'에 적힌 시트를 참고 이미지로 넣고 프롬프트를 그대로 붙여넣는다.\n"
                "> 글자(문서·도장·자막·타이틀)는 생성하지 않고 편집에서 합성한다. 생성할 때마다 날짜·계정·모델 버전·프롬프트·결과 파일명을 기록한다(약관 5.5).\n\n"
                f"## 공통 부정 프롬프트\n```\n{NEG}\n```\n\n## Veo 테스트에서 얻은 규칙\n- '닿지 않는다'는 부정문 대신 손과 벽 사이의 **보이는 간격**을 묘사한다.\n- 글자 금지는 현수막·포스터·간판까지 직접 적는다.\n- 물건이 떨어질 때는 누가 놓는지까지 적는다.\n- 빈 장갑은 '납작하게 누운, 비어 있는'이라고 적는다.\n- 실루엣은 두 사람 사이를 비우고 팔이 가운데로 나오지 않게 적는다.\n\n## 샷별 프롬프트\n")
        for s in S:
            if s["ai_tool"] != "Seedance": continue
            refs = [REF[c] for c in s["continuity_id"].split(";") if c in REF]
            g = min(MAX_GEN, max(MIN_GEN, math.ceil(s["duration_sec"])+1))
            f.write(f"\n### {s['shot_id']} · 편집 {s['duration_sec']}초 · 생성 {g}초 · {s['shot_type']}\n- 내용: {s['action']}\n- 첨부: {', '.join(refs) if refs else '없음'}\n"
                    + (f"- 대사(한국어 음성): {' / '.join(lines[s['shot_id']])}\n" if s['shot_id'] in lines and 'dialogue' in [k for (i,_,_,k,_,_,_) in SUBS if i==s['shot_id']] else "")
                    + f"```\n{STYLE} {s['prompt']} Camera: {s['camera']}. Lighting: {s['lighting']}\n```\n")
    print(f"rows={len(S)} total={t}s subs={len(subs)}")
if __name__ == "__main__": main()
