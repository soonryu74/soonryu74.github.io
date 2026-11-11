#!/usr/bin/env python3
"""《입구》 v7 단일 진실 소스 생성기.
이 파일의 SHOTS/SUBS를 고치고 실행하면 02 샷리스트, 03 프롬프트, 05 자막, 09 예산이 다시 만들어진다.
실행: python3 tools/gen_v7.py   (v5 폴더에서)
"""
import csv, math, os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")

# ---- 가정값 (공식 확인 전: PENDING) ---------------------------------------
INTRO_SEC = 20        # 주최 인트로 길이. 공식 미확인 -> 확인 후 이 값만 고치고 재실행
CREDIT_SEC = 20
PRICE_PER_SEC = 0.37  # USD, Seedance 2.0 1080p BytePlus. 2차 출처 추정치(공식 단가표 미확인)
MIN_GEN, MAX_GEN = 4, 15  # Seedance 2.0 클립 길이(2차 출처)

STYLE = ("Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, "
         "muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, "
         "soft film grain, no on-screen text.")
CAVE_LIGHT = ("Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; "
              "wet basalt, white carbonate deposits catching the light; no ambient fill.")
NEG = ("text, letters, subtitles, watermark, logo, extra fingers, fused hands, deformed face, face drift, "
       "age change, costume change, cartoon, anime, oversaturated, tourist-brochure look, lens flare spam")

CH = {
 "D44": "Kim Dong-su at 44, lean Korean electrical line worker, short black hair, rain-soaked navy work jacket, white hard hat",
 "D64": "Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact",
 "H34": "Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression",
 "LEAD": "survey team leader, Korean man in his 50s, glasses, grey field vest",
}

# (shot_id, scene, dur, type, chars, action_ko, camera, lighting, audio, tool, prompt, continuity, claim, tries)
S = []
def add(scene, dur, typ, chars, action, camera, light, audio, prompt, cont, claim="", tool="Seedance", tries=4):
    n = sum(1 for x in S if x["scene_id"] == scene) + 1
    S.append(dict(shot_id=f"{scene}-{n:02d}", scene_id=scene, duration_sec=dur, shot_type=typ, characters=chars,
                  action=action, camera=camera, lighting=light, audio=audio, ai_tool=tool, prompt=prompt,
                  negative_prompt=NEG if tool == "Seedance" else "n/a", continuity_id=cont,
                  source_claim_id=claim, tries=tries))

CH["H31"] = "Kim Hae-in at 31, same woman, hair tied back, grey surveyor vest over a white shirt"
CH["D61"] = "Kim Dong-su at 61, same man, grey cropped hair, wearing his one ill-fitting dark suit jacket over a work shirt"

RAIN = "grey overcast rain, flat daylight"
add("S0", INTRO_SEC, "organizer intro", "-", "주최 제공 인트로(길이 미확인)", "-", "-", "주최 원본", "n/a (organizer asset)", "ORG_INTRO", "R03", tool="NONE", tries=0)

# S1 2005 발견 30s
add("S1",5,"wide","D44","비 오는 밭, 돌담 옆 전신주 공사","static wide",RAIN,"빗소리, 바람",
    f"Wide shot, rainy Jeju farmland with black basalt stone walls, a utility pole being installed, {CH['D44']} working beside a dug hole. {RAIN}.","CH_D44;LOC_FIELD;PR_GLOVE_NEW","F01")
add("S1",5,"medium","D44","동수가 삽으로 구멍 가장자리를 다듬는다","slow push-in",RAIN,"삽, 빗소리",
    f"Medium shot, {CH['D44']} wearing a pair of bright yellow work gloves, trimming the edge of a hole with a shovel in the rain.","CH_D44;LOC_FIELD;PR_GLOVE_NEW","C01")
add("S1",4,"close","-","흙이 꺼지고 찬 바람이 올라온다","locked close, slight shake",RAIN,"흙 무너지는 소리, 낮은 바람",
    "Close shot of wet soil at the bottom of a dug hole suddenly collapsing inward, revealing darkness, cold mist rising from below.","LOC_FIELD","F01")
add("S1",5,"POV","-","손전등 빛: 검은 돌, 안쪽의 흰 벽","POV tilt down, handheld","single flashlight beam into darkness","동굴 바람, 물방울",
    "POV looking down through a ragged opening in the ground, a flashlight beam reveals black lava rock and, deeper inside, a snow-white mineral wall.","LOC_CAVE_WALL","F04")
add("S1",4,"close","D44","뻗던 손이 멈추고 오른쪽 노란 장갑이 어둠으로 떨어진다","close on hand, tilt follows glove","flashlight spill","장갑이 늦게 떨어지는 울림",
    "Close shot, a man's rain-wet right hand stops above a dark opening, one bright yellow work glove slips off the hole edge and falls into the darkness, shrinking out of sight.","CH_D44;PR_GLOVE_NEW","C02",tries=8)
add("S1",4,"close-up","D44","동수 얼굴: 놀라움이 아니라 겁. 타이틀 합성","static close-up",RAIN,"빗소리 잦아듦",
    f"Close-up, {CH['D44']}, rain on his face, looking down into a hole with fear rather than wonder, he swallows.","CH_D44","C03",tries=6)
add("S1",3,"wide","D44","주위를 둘러본다. 아무도 없다. 왼손 장갑은 그대로","static wide",RAIN,"빗소리",
    f"Wide shot, {CH['D44']} alone in an empty rainy field looks around over his shoulder; a yellow glove on his left hand only, right hand bare.","CH_D44;LOC_FIELD;PR_GLOVE_NEW","C03")

HALL = "flat fluorescent community-hall light"
add("S2",4,"wide","H31","마을 회관 무대, 동굴 사진 앞의 해인","static wide",HALL,"웅성거림",
    f"Wide shot of a small community hall, residents on folding chairs seen from behind, {CH['H31']} standing on a low stage before a projected photo of a dark cave interior. {HALL}.","CH_H31;LOC_HALL","C26")
add("S2",4,"medium","D61","뒷문이 열리고 양복 재킷의 동수가 초청장을 쥐고 벽에 붙어 선다","static medium",HALL,"문 소리",
    f"Medium shot, a back door opens quietly and {CH['D61']} slips in holding a folded invitation card, standing against the wall.","CH_D61;LOC_HALL;PR_INVITE","C26",tries=6)
add("S2",4,"medium","H31","화면 밖 질문을 듣는 해인","static medium",HALL,"화면 밖 대사, 수군거림",
    f"Medium shot, {CH['H31']} on stage listening to a question from the audience, her expression tightening; she does not speak.","CH_H31;LOC_HALL","C26")
add("S2",3,"close-up","H31","해인의 눈이 뒷문의 아버지와 마주친다","static close-up",HALL,"수군거림",
    f"Close-up, {CH['H31']} looks past the audience toward the back of the room and freezes.","CH_H31","C26")
add("S2",3,"close-up","D61","동수가 아주 작게 고개를 끄덕인다","static close-up",HALL,"정적",
    f"Close-up, {CH['D61']} gives a very small reassuring nod, as if to say it is all right.","CH_D61","C26",tries=6)
add("S2",3,"close-up","H31","해인 대사","static close-up",HALL,"대사",
    f"Close-up, {CH['H31']} says one short flat sentence, eyes dropping.","CH_H31","C26",tries=6)
add("S2",3,"close","D61","초청장을 반으로 접는다","close on hands",HALL,"종이 접는 소리",
    "Close shot, an older man's rough hands slowly fold an invitation card in half. No readable text.","CH_D61;PR_INVITE","C26",tries=6)
add("S2",2,"wide","H31","문이 닫힌다. 해인은 보지 않는다","static wide",HALL,"문 닫힘",
    f"Wide shot from the back of the hall, the back door swings shut; on the distant stage {CH['H31']} keeps her eyes down.","CH_H31;LOC_HALL","C26")

OFFICE = "cool overcast window light, quiet office"
add("S3",3,"medium","H34","해인이 낡은 보고서를 넘긴다","static medium",OFFICE,"종이 넘기는 소리",
    f"Medium shot, {CH['H34']} at a desk turning pages of an old bound survey report with blank pages. {OFFICE}.","CH_H34;LOC_OFFICE","C04")
add("S3",4,"insert","-","보고서 한 줄(후반 합성 텍스트)","top-down insert",OFFICE,"정적",
    "Top-down insert of an aged report page with a blank printed-form layout, a finger resting under an empty line. No readable text.","LOC_OFFICE;TXT_01","C04")
add("S3",4,"insert","H34","명단 맨 아래에 이름을 쓴다(후반 합성)","close on pen hand",OFFICE,"펜 소리",
    "Close shot of a woman's hand writing with a pen at the bottom of a blank participant list form. No readable text.","CH_H34;TXT_02","C05")
add("S3",2,"insert","LEAD","팀장이 말없이 서명한다","close on hand",OFFICE,"펜 소리",
    "Close shot, an older man's hand signs the bottom of a blank form with a pen. No readable text.","CH_LEAD;TXT_03","C06")
add("S3",3,"medium","H34","서명이 마르기도 전에 종이를 집어 든다","static medium",OFFICE,"종이 소리",
    f"Medium shot, {CH['H34']} picks the sheet of paper off the desk at once and turns to leave.","CH_H34;LOC_OFFICE","C06")

HOUSE = "dim interior, single window daylight, warm brown shadows"
add("S4",5,"detail","-","신발장 구석, 먼지 앉은 왼쪽 노란 장갑 한 짝","slow push-in",HOUSE,"바람",
    "Detail shot, the corner of an old wooden shoe cabinet in a rural Korean house entrance, a single faded yellow left work glove lying alone, covered in dust.","PR_GLOVE_LEFT;LOC_HOUSE","C27",tries=6)
add("S4",3,"medium","H34","해인이 장갑을 보지 못하고 지나친다","static medium",HOUSE,"발소리",
    f"Medium shot, {CH['H34']} steps through a house entrance past an old shoe cabinet without looking at it.","CH_H34;LOC_HOUSE","C27")
add("S4",4,"insert","-","식탁 위 밥그릇 하나","static",HOUSE,"시계 소리",
    f"Static shot of a small wooden dining table with a single rice bowl and one pair of chopsticks. {HOUSE}.","LOC_HOUSE","C08")
add("S4",5,"insert","-","가족사진, 액자 모서리에 반으로 접힌 초청장","slow pan",HOUSE,"정적",
    "Slow pan across a wall: an old framed photo of a man in a hard hat carrying a little girl on his shoulders in front of a utility pole; a card folded in half tucked into the corner of the frame. No readable text.","LOC_HOUSE;PR_PHOTO;PR_INVITE;CH_H14","C09")
add("S4",3,"close-up","H34","해인의 눈이 초청장에서 멈춘다","static close-up",HOUSE,"정적",
    f"Close-up, {CH['H34']} staring at something on the wall, a flicker of shame.","CH_H34;LOC_HOUSE","C09")
add("S4",5,"medium","D64","문이 열리고 동수가 딸을 보지 않은 채 말한다","static medium",HOUSE,"문 소리, 대사",
    f"Medium shot, a door opens and {CH['D64']} steps in, eyes lowered, says one short sentence without looking up.","CH_D64;LOC_HOUSE","C10",tries=6)
add("S4",5,"medium","H34","허가서를 식탁에 놓고 말한다","static medium",HOUSE,"종이, 대사",
    f"Medium shot, {CH['H34']} places a sheet of paper on the dining table and says two quiet words.","CH_H34;LOC_HOUSE","C06",tries=6)
add("S4",5,"medium","D64","종이를 읽지 않고 벽의 안전모를 내려 먼지를 턴다","static medium",HOUSE,"먼지 터는 소리",
    f"Medium shot, {CH['D64']} ignores the paper, takes an old white hard hat down from the wall and brushes the dust off with his palm.","CH_D64;PR_HELMET;LOC_HOUSE","C10")
add("S4",3,"two-shot","H34;D64","둘 다 그날 얘기를 하지 않는다","static wide two-shot",HOUSE,"시계 소리",
    "Wide two-shot in a dim rural kitchen, an old man holding a hard hat and his adult daughter standing apart, neither looking at the other.","CH_H34;CH_D64;LOC_HOUSE","C10")

GATE = "overcast daylight, cold air"
add("S5",3,"wide","H34;D64;LEAD","철문 앞 조사팀","static wide",GATE,"바람, 장비 소리",
    "Wide shot, a small survey team in helmets gathered at a locked iron gate set into a low concrete structure in a Jeju field.","LOC_GATE;CH_LEAD;CH_H34;CH_D64","C11")
add("S5",6,"close two-shot","H34;D64","헤드랜턴을 고정하다 손끝이 이마에 닿자 둘 다 멈춘다","close, static",GATE,"클립 소리, 정적",
    f"Close two-shot, {CH['H34']} fixes a headlamp onto the old white hard hat worn by {CH['D64']}; her fingertip brushes his forehead and both freeze for a beat.","CH_H34;CH_D64;PR_HELMET;PR_LAMP","C12",tries=8)
add("S5",4,"close-up","D64","2005년과 같은 찬 바람","static close-up",GATE,"동굴 바람",
    f"Close-up, {CH['D64']} facing a dark open gate, cold air moves his collar, a flicker of old fear.","CH_D64;LOC_GATE","C03")
add("S5",5,"wide","D64","동수가 마지막으로 내려간다","high angle from inside","daylight above, darkness below","발소리 울림",
    f"High-angle shot from inside a dark stairwell, {CH['D64']} is the last to descend metal stairs, daylight shrinking behind him.","CH_D64;LOC_GATE;PR_HELMET","C11")

add("S6",5,"wide","H34;D64","랜턴 빛이 어둠을 가른다","slow dolly forward",CAVE_LIGHT,"물방울, 발소리",
    f"Wide shot inside a lava tube, two figures with headlamps walk slowly, beams cutting the darkness. {CAVE_LIGHT}","LOC_CAVE;CH_H34;CH_D64;PR_LAMP","F04")
add("S6",4,"detail","-","흰 탄산염 벽, 물방울","slow pan",CAVE_LIGHT,"물방울",
    f"Detail shot, white carbonate deposits flowing over black lava rock, a water drop forming and falling. {CAVE_LIGHT}","LOC_CAVE_WALL","F04")
add("S6",4,"medium","D64","동수가 저도 모르게 벽에 손을 뻗는다","side medium",CAVE_LIGHT,"숨소리",
    f"Side medium shot, {CH['D64']} slowly raises his bare hand toward a white cave wall, absorbed. {CAVE_LIGHT}","CH_D64;LOC_CAVE_WALL","C13")
add("S6",4,"close","D64","'만지면 안 돼요.' 손이 벽 한 뼘 앞에서 멈춘다","close on hand and wall",CAVE_LIGHT,"대사(화면 밖)",
    "Close shot, an old man's hand stops in mid-air a hand's width from a white mineral cave wall, fingers trembling slightly, never touching.","CH_D64;LOC_CAVE_WALL","C13",tries=8)
add("S6",4,"medium","D64","거둔 손을 작업복에 문질러 닦는다","static medium",CAVE_LIGHT,"옷 스치는 소리",
    f"Medium shot, {CH['D64']} lowers his hand without touching the wall and wipes his palm on his jacket as if it were dirty.","CH_D64;LOC_CAVE_WALL","C13",tries=6)
add("S6",3,"close-up","H34","해인이 그 손을 본다","static close-up",CAVE_LIGHT,"물방울",
    f"Close-up, {CH['H34']} watching her father's hand, saying nothing.","CH_H34","C13")

LAKE = CAVE_LIGHT + " Still black water mirroring the beams."
add("S7",6,"wide","H34;D64","검은 호수, 보트 위 부녀","static wide",LAKE,"노 젓는 소리",
    f"Wide shot, a small inflatable boat with two people crossing a black underground lake in a lava tube. {LAKE}","LOC_LAKE;CH_H34;CH_D64","F02")
add("S7",4,"detail","-","주황빛 반사가 천장에 일렁인다","tilt up",LAKE,"물결",
    "Tilt up from black water to a cave ceiling where rippling warm orange reflections move across the rock.","LOC_LAKE","C14")
add("S7",5,"detail","-","작고 창백한 물고기가 빛 가장자리를 스친다(종 묘사 PENDING)","top-down at surface",LAKE,"물소리",
    "Top-down shot through clear dark water, a tiny pale fish glides past the edge of a light beam and vanishes.","LOC_LAKE","F06",tries=6)
add("S7",5,"close-up","D64","동수 대사","static close-up",LAKE,"대사",
    f"Close-up, {CH['D64']} looking down at the water, says a short hesitant question.","CH_D64;LOC_LAKE","F06",tries=6)
add("S7",5,"close-up","H34","해인 대사","static close-up",LAKE,"대사",
    f"Close-up, {CH['H34']} holding an oar, answers softly with one sentence, eyes on the water.","CH_H34;LOC_LAKE","C14",tries=6)
add("S7",6,"close","D64;H34","동수가 노를 잡은 딸의 손을 본다","close on hands, tilt to his eyes",LAKE,"노, 물방울",
    "Close shot of a woman's hands gripping an oar, tilt up to an old man's eyes watching them, unable to speak.","CH_D64;CH_H34;LOC_LAKE","C14")
add("S7",5,"wide","H34;D64","말없이 흘러가는 보트","slow drift",LAKE,"정적, 물결",
    f"Wide shot, the small boat drifts in silence, two headlamp beams apart, not facing each other. {LAKE}","LOC_LAKE;CH_H34;CH_D64","F02")

add("S8",4,"wide","-","랜턴 빛이 바위 틈의 노란색에 멈춘다","pan stops",CAVE_LIGHT,"정적",
    "A headlamp beam pans across black rock and stops on a small patch of faded yellow wedged in a crevice.","LOC_CREVICE;PR_GLOVE_AGED","C16",tries=6)
add("S8",4,"detail","-","침전물 앉은 낡은 오른쪽 작업장갑","macro, static",CAVE_LIGHT,"물방울",
    "Macro shot, a single old yellow right work glove lodged in a rock crevice, stiff and faded, thin white mineral crust on its surface.","PR_GLOVE_AGED;LOC_CREVICE","C16",tries=8)
add("S8",3,"close-up","D64","동수가 얼어붙는다","static close-up",CAVE_LIGHT,"숨 멎는 소리",
    f"Close-up, {CH['D64']} frozen, lips parted, headlamp light trembling.","CH_D64","C16")
add("S8",3,"medium","H34","해인이 처음으로 환해지며 사진을 찍는다","static medium",CAVE_LIGHT,"셔터",
    f"Medium shot, {CH['H34']} brightens for the first time and photographs the crevice with a small camera.","CH_H34;LOC_CREVICE","C17")
add("S8",5,"close-up","H34","해인 대사","static close-up",CAVE_LIGHT,"대사",
    f"Close-up, {CH['H34']} speaks eagerly, two short hopeful sentences, almost smiling.","CH_H34","C18",tries=6)
add("S8",3,"close-up","D64","'넣지 마라.'","static close-up",CAVE_LIGHT,"대사",
    f"Close-up, {CH['D64']} still staring ahead, says two quiet firm words.","CH_D64","C28",tries=6)
add("S8",2,"close-up","H34","해인이 돌아본다","static close-up",CAVE_LIGHT,"정적",
    f"Close-up, {CH['H34']} turns her head sharply, the smile gone.","CH_H34","C28")
add("S8",4,"flashback wide","D44","2005년: 합판을 끌어다 구멍을 덮는다","static wide",RAIN,"빗소리만",
    f"Wide shot in heavy rain, {CH['D44']} drags a sheet of plywood over a hole in the ground beside a utility pole, hurried and furtive.","CH_D44;LOC_FIELD","C28",tries=6)
add("S8",4,"flashback medium","D44","흙을 퍼 올리고, 장갑 없는 오른손으로 삽을 쥔 채 걸어 나간다","static, he exits frame",RAIN,"삽, 빗소리",
    f"Medium shot in rain, {CH['D44']} shovels wet soil onto a plywood sheet, glances around, then walks away gripping the shovel in his bare right hand, a yellow glove on the left only, never looking back.","CH_D44;LOC_FIELD;PR_GLOVE_NEW","C28",tries=6)
add("S8",4,"close-up","D64","'덮었다. 잘릴까 봐.'","static close-up",CAVE_LIGHT,"대사",
    f"Close-up, {CH['D64']} eyes fixed on the crevice, says two short broken sentences.","CH_D64","C28",tries=6)
add("S8",5,"close-up","D64","'내가 찾았다고… 끝내 말 못 했다.'","very slow push-in",CAVE_LIGHT,"대사",
    f"Close-up, {CH['D64']} speaks slowly with a long pause in the middle, voice almost gone.","CH_D64","C28",tries=6)
add("S8",3,"close-up","H34","해인의 얼굴: 믿어온 이야기가 무너진다","static close-up",CAVE_LIGHT,"물방울",
    f"Close-up, {CH['H34']} stunned, certainty draining from her face.","CH_H34","C18")
add("S8",4,"close","H34","손에 든 카메라가 천천히 내려간다","close on hands",CAVE_LIGHT,"정적",
    "Close shot, a woman's hands holding a small camera slowly lower it to her side.","CH_H34","C18")

add("S9",4,"wide","H34;D64","돌아오는 보트, 해인이 노를 멈춘다","static wide",LAKE,"노 멈춤",
    f"Wide shot, the boat in the middle of the black lake, {CH['H34']} stops rowing and lets the oars rest.","LOC_LAKE;CH_H34;CH_D64","C19")
add("S9",3,"close-up","H34","해인이 말없이 자기 랜턴을 끈다","static close-up",LAKE,"스위치",
    f"Close-up, {CH['H34']} reaches up and switches off her headlamp; her face drops into shadow.","CH_H34;PR_LAMP","C19")
add("S9",4,"close-up","D64","동수가 딸을 보다가 자기 랜턴도 끈다","static close-up",LAKE,"스위치",
    f"Close-up, {CH['D64']} looks toward his daughter for a moment, then switches off his own headlamp; the frame falls to black.","CH_D64;PR_LAMP","C19",tries=6)
add("S9",8,"black","-","완전한 어둠. 물방울, 숨, 물결","black frame","none","물방울, 숨, 물결","n/a (black frame, edit)","EDIT_BLACK","C19",tool="NONE",tries=0)
SIL = "Near-total darkness; one tiny distant warm light far across black water gives only a faint rim on two seated silhouettes in a small boat; shoulders and heads barely visible, no faces, no hands visible."
add("S9",6,"silhouette wide","H34;D64","희미한 어깨선. 해인: '그날, 뒷문에 계신 거 봤어요.'","static wide","distant single light, rim only","대사, 물방울",
    f"Static wide shot. {SIL} Both figures completely still.","CH_H34;CH_D64;LOC_LAKE","C20",tries=8)
add("S9",6,"silhouette wide","H34;D64","해인: '보고도… 모른다고 했어요.'","static wide, same frame","distant single light, rim only","대사, 물방울 두 번",
    f"Static wide shot. {SIL} The smaller figure's head lowers slightly.","CH_H34;CH_D64;LOC_LAKE","C20",tries=6)
add("S9",6,"silhouette wide","H34;D64","동수: '내가 안 갔어야 했다.' 해인: '아니요.'","static wide, same frame","distant single light, rim only","대사",
    f"Static wide shot. {SIL} The larger figure's shoulders sink.","CH_H34;CH_D64;LOC_LAKE","C20",tries=6)
add("S9",2,"silhouette wide","H34;D64","실루엣 하나가 조금 기운다","static wide, same frame","distant single light, rim only","옷 스치는 소리",
    f"Static wide shot. {SIL} One silhouette leans a little toward the other.","CH_H34;CH_D64;LOC_LAKE","C20",tries=6)
add("S9",6,"close","H34;D64","랜턴이 켜지면 해인의 손이 동수의 손 위에 있다","close on hands",LAKE,"스위치, 물결",
    "Close shot, a headlamp clicks on and warm light reveals a woman's hand already resting on top of an old man's weathered hand on the boat's edge; the hands stay still.","CH_H34;CH_D64;LOC_LAKE","C20",tries=8)
add("S9",3,"two-shot","H34;D64","서로 보지 않지만 손은 그대로","static two-shot",LAKE,"물결",
    "Two-shot in the boat, father and daughter look in different directions, their hands still joined between them.","CH_H34;CH_D64;LOC_LAKE","C20",tries=6)

EVE = "low golden evening light, long shadows"
add("S10",3,"wide","LEAD;H34;D64","저녁빛, 팀장이 봉투와 조사표를 들고 있다","static wide",EVE,"바람",
    f"Wide shot outside the iron gate, {CH['LEAD']} holding a clipboard and a clear sample bag with an old yellow glove, facing a woman and an old man. {EVE}.","LOC_GATE;CH_LEAD;CH_H34;CH_D64;PR_BAG","C21")
add("S10",2,"insert","LEAD","펜이 조사표의 빈칸을 가리킨다","close on clipboard",EVE,"정적",
    "Close shot, a pen tip points at an empty line on a blank field form on a clipboard. No readable text.","CH_LEAD;TXT_04","C21")
add("S10",3,"close-up","H34","'비워 두세요.'","static close-up",EVE,"대사",
    f"Close-up, {CH['H34']} says one calm short sentence.","CH_H34","C22",tries=6)
add("S10",4,"medium","LEAD","팀장이 끄덕이고 동수를 보며 묻는다","static medium",EVE,"대사",
    f"Medium shot, {CH['LEAD']} nods, then glances past her toward the old man and begins a hesitant question.","CH_LEAD","C22",tries=6)
add("S10",3,"close-up","H34","'제 아버지예요.'","static close-up",EVE,"대사",
    f"Close-up, {CH['H34']} answers plainly and clearly, one short sentence, chin up.","CH_H34","C23",tries=6)
add("S10",3,"close-up","D64","동수가 딸을 본다","static close-up",EVE,"정적",
    f"Close-up, {CH['D64']} looks at his daughter, eyes wet, very still.","CH_D64","C23",tries=6)
add("S10",4,"close","LEAD;D64","팀장이 봉투를 내밀고 동수가 두 손으로 받는다","close on hands",EVE,"봉투 소리",
    "Close shot, a clear sample bag holding an old yellow glove is handed over; an old man's two weathered hands receive it carefully.","CH_LEAD;CH_D64;PR_BAG;PR_GLOVE_AGED","C24",tries=6)
add("S10",3,"medium from behind","H34","전신주 아래, 해인의 뒷모습 대사","static, from behind",EVE,"전선 우는 소리, 대사",
    f"Medium shot from behind, a woman in a dark green field jacket stands under a weathered utility pole with humming wires, Jeju field at dusk. {EVE}.","CH_H34;LOC_POLE","C25")
add("S10",3,"close-up","D64","동수가 딸의 눈을 피하지 않는다","static close-up",EVE,"정적",
    f"Close-up, {CH['D64']} turns and holds eye contact without looking away, the faintest softening.","CH_D64","C25",tries=6)

add("S11",7,"detail","D64","신발장: 왼쪽 장갑 옆에 오른쪽 장갑을 내려놓는다. 한 켤레","static detail",HOUSE,"조용한 실내",
    "Detail shot on an old wooden shoe cabinet, an old man's hand places a mineral-crusted yellow right work glove next to a dusty faded yellow left work glove; the two lie side by side as a pair.","CH_D64;PR_GLOVE_LEFT;PR_GLOVE_AGED;LOC_HOUSE","C27",tries=8)
add("S11",7,"detail","-","식탁, 밥그릇 둘. 김이 오른다. 사람은 없다","static, slow fade out",HOUSE,"수저 놓는 소리",
    f"Static shot of a small wooden dining table with two steaming rice bowls and two pairs of chopsticks, no people in frame. {HOUSE}.","LOC_HOUSE","C08",tries=6)

add("S12",CREDIT_SEC,"credits","-","크레딧 및 창작 고지(편집 타이포)","-","-","잔향","n/a (edit typography)","EDIT_CREDIT","C29",tool="NONE",tries=0)

# 시작 시각(파일 시간)
t = 0
for s in S:
    s["start_sec"] = t; t += s["duration_sec"]

# ---- 자막: (shot_id, offset, dur, kind, speaker, ko, en) ------------------
SUBS = [
 ("S1-06",1.0,2.8,"title","","입구","THE OPENING"),
 ("S2-03",0.5,3.3,"dialogue","주민(화면 밖)","발견한 인부가 아버님이라던데요.","I heard the worker who found it\nis your father."),
 ("S2-06",0.6,2.2,"dialogue","해인","…모르는 분입니다.","...I don't know him."),
 ("S3-02",0.2,3.6,"text","","「발견 경위: 공사 인부, 성명 미상」","\"Found by: a construction worker,\nname unknown\""),
 ("S3-03",1.0,2.5,"text","","김동수","Kim Dong-su"),
 ("S4-06",2.5,2.0,"dialogue","동수","3년 만이구나.","Three years."),
 ("S4-07",2.2,2.0,"dialogue","해인","같이 가요.","Come with me."),
 ("S6-04",0.2,2.2,"dialogue","해인","만지면 안 돼요.","Don't touch it."),
 ("S7-04",0.8,3.2,"dialogue","동수","눈이… 없는 건가?","It has... no eyes?"),
 ("S7-05",0.5,3.8,"dialogue","해인","여기선 다른 걸로 길을 찾겠죠.","Down here, it must find its way\nby something else."),
 ("S8-05",0.2,4.6,"dialogue","해인","이거 맞죠? 이거면 이름 넣을 수 있어요.","This is yours, isn't it?\nWith this, I can put your name in."),
 ("S8-06",0.5,1.8,"dialogue","동수","넣지 마라.","Don't."),
 ("S8-10",0.3,3.4,"dialogue","동수","덮었다. 잘릴까 봐.","I covered it up.\nI was afraid they'd fire me."),
 ("S8-11",0.3,4.4,"dialogue","동수","내가 찾았다고… 끝내 말 못 했다.","I never could say...\nthat I was the one who found it."),
 ("S9-05",1.0,3.6,"dialogue","해인","그날, 뒷문에 계신 거 봤어요.","That day, I saw you at the back door."),
 ("S9-06",1.5,3.8,"dialogue","해인","보고도… 모른다고 했어요.","I saw you...\nand I said I didn't know you."),
 ("S9-07",0.8,2.4,"dialogue","동수","내가 안 갔어야 했다.","I shouldn't have gone."),
 ("S9-07",4.2,1.4,"dialogue","해인","아니요.","No."),
 ("S10-03",0.5,2.0,"dialogue","해인","비워 두세요.","Leave it blank."),
 ("S10-04",1.6,2.2,"dialogue","팀장","그럼 이분은…","Then this gentleman is..."),
 ("S10-05",0.5,2.2,"dialogue","해인","제 아버지예요.","He's my father."),
 ("S10-08",0.3,2.5,"dialogue","해인","아빠. 밥 먹고 가요.","Dad. Stay for dinner."),
]

def tc(x):
    ms = round(x * 1000); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def main():
    by = {s["shot_id"]: s for s in S}
    subs = []
    for sid, off, dur, kind, who, ko, en in SUBS:
        st = by[sid]["start_sec"] + off
        subs.append(dict(shot_id=sid, start=st, end=st + dur, kind=kind, speaker=who, ko=ko, en=en))
    for s in S:
        s["subtitle"] = " / ".join(x["en"].replace("\n", " ") for x in subs if x["shot_id"] == s["shot_id"])

    cols = ["shot_id","scene_id","start_sec","duration_sec","shot_type","characters","action","camera","lighting",
            "audio","subtitle","ai_tool","prompt","negative_prompt","continuity_id","source_claim_id"]
    with open(f"{OUT}/02_shotlist_v7.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore"); w.writeheader(); w.writerows(S)

    for name, both in (("05_subtitles_ko_en_v7.srt", True), ("05b_subtitles_en_burnin_v7.srt", False)):
        with open(f"{OUT}/{name}", "w", encoding="utf-8") as f:
            for i, x in enumerate(subs, 1):
                body = (x["ko"].replace("\n", " ") + "\n" + x["en"]) if both else x["en"]
                f.write(f"{i}\n{tc(x['start'])} --> {tc(x['end'])}\n{body}\n\n")

    with open(f"{OUT}/09_production_budget_v7.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["shot_id","edit_sec","gen_sec_per_try","tries_assumed","gen_sec_total","usd_per_sec_ASSUMED","usd_est","note"])
        tot_s = tot_u = 0
        for s in S:
            if s["ai_tool"] != "Seedance": continue
            g = min(MAX_GEN, max(MIN_GEN, math.ceil(s["duration_sec"]) + 1))  # 편집 여유 1초
            gs = g * s["tries"]; u = round(gs * PRICE_PER_SEC, 2); tot_s += gs; tot_u += u
            w.writerow([s["shot_id"], s["duration_sec"], g, s["tries"], gs, PRICE_PER_SEC, u,
                        "난이도 높음(손/장갑/대사)" if s["tries"] > 4 else ""])
        w.writerow(["TOTAL_SEEDANCE", "", "", "", tot_s, PRICE_PER_SEC, round(tot_u, 2), "추정. 단가·횟수 모두 가정"])
        w.writerow(["CONTINGENCY_30PCT", "", "", "", "", "", round(tot_u * 0.3, 2), "재생성 예비비 가정"])
        w.writerow(["NON_SEEDANCE", "", "", "", "", "", "PENDING", "AI 음성·음악·편집툴·폰트 비용 미산정"])

    with open(f"{OUT}/03_seedance_prompts_v7.md", "w", encoding="utf-8") as f:
        f.write("# 《입구》 v7 — Seedance 프롬프트\n\n> `tools/gen_v7.py`가 생성. 직접 수정 금지(스크립트를 고칠 것). 영상 생성은 승인 전 실행 금지.\n\n")
        f.write(f"## 공통 스타일 (모든 샷 앞에 붙임)\n```\n{STYLE}\n```\n\n## 동굴 조명 블록 (S5~S9)\n```\n{CAVE_LIGHT}\n```\n\n## 공통 부정 프롬프트\n```\n{NEG}\n```\n\n")
        f.write("## 연속성 규칙\n- 인물·소품은 `04_character_and_prop_bible_v7.md`의 레퍼런스 이미지를 매 샷 첨부한다(continuity_id 기준).\n"
                "- 한 샷 = 한 동작. 대사 샷은 화자 1명만 입을 연다.\n- 문서·라벨·자막·타이틀 글자는 생성하지 않고 후반 합성한다(TXT_xx).\n"
                "- 동굴 벽·유물에 손이 닿는 결과물은 불합격 처리한다.\n- 대사 음성(한국어) 생성 방식은 PENDING: Seedance 자체 오디오/립싱크 지원 여부 공식 확인 후 결정.\n\n## 샷별 프롬프트\n")
        for s in S:
            if s["ai_tool"] != "Seedance": continue
            f.write(f"\n### {s['shot_id']} · {s['duration_sec']}s · {s['shot_type']}\n- 동작: {s['action']}\n- 카메라: {s['camera']}\n- 연속성: `{s['continuity_id']}`\n"
                    f"```\n{STYLE} {s['prompt']} Camera: {s['camera']}. Lighting: {s['lighting']}\n```\n")
    print(f"shots={len(S)} total_sec={t} subs={len(subs)}")

if __name__ == "__main__":
    main()
