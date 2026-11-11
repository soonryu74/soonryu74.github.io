#!/usr/bin/env python3
"""《입구》 v5 단일 진실 소스 생성기.
이 파일의 SHOTS/SUBS를 고치고 실행하면 02 샷리스트, 03 프롬프트, 05 자막, 09 예산이 다시 만들어진다.
실행: python3 tools/gen_v5.py   (v5 폴더에서)
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

RAIN = "grey overcast rain, flat daylight"
add("S0", INTRO_SEC, "organizer intro", "-", "주최 제공 인트로(길이 미확인)", "-", "-", "주최 원본", "n/a (organizer asset)", "ORG_INTRO", "R03", tool="NONE", tries=0)

# S1 2005 발견 28s
add("S1",5,"wide","D44","비 오는 밭, 돌담 옆 전신주 공사","static wide",RAIN,"빗소리, 바람",
    f"Wide shot, rainy Jeju farmland with black basalt stone walls, a utility pole being installed, {CH['D44']} working beside a dug hole. {RAIN}.","CH_D44;LOC_FIELD;PR_GLOVE_NEW","F01")
add("S1",5,"medium","D44","동수가 삽으로 구멍 가장자리를 다듬는다","slow push-in",RAIN,"삽, 빗소리",
    f"Medium shot, {CH['D44']} wearing bright yellow work gloves, trimming the edge of a hole with a shovel in the rain.","CH_D44;LOC_FIELD;PR_GLOVE_NEW","C01")
add("S1",4,"close","-","흙이 푹 꺼지고 찬 바람이 솟는다","locked close, slight shake",RAIN,"흙 무너지는 소리, 낮은 바람",
    "Close shot of wet soil at the bottom of a dug hole suddenly collapsing inward, revealing darkness, cold mist rising from below.","LOC_FIELD","F01")
add("S1",5,"POV","-","손전등 빛: 검은 돌, 안쪽의 흰 벽","POV tilt down, handheld","single flashlight beam into darkness","동굴 바람, 물방울",
    "POV looking down through a ragged opening in the ground, a flashlight beam reveals black lava rock and, deeper inside, a snow-white mineral wall.","LOC_CAVE_WALL","F04")
add("S1",4,"close","D44","뻗은 손이 멈추고 노란 장갑 한 짝이 어둠으로 떨어진다","close on hand, tilt follows glove","flashlight spill","장갑이 늦게 떨어지는 울림",
    "Close shot, a man's rain-wet hand stops above a dark opening, one bright yellow work glove slips off the hole edge and falls into the darkness, shrinking out of sight.","CH_D44;PR_GLOVE_NEW","C02",tries=8)
add("S1",5,"close-up","D44","동수 얼굴: 놀라움보다 두려움. 타이틀 합성","static close-up",RAIN,"빗소리 잦아듦",
    f"Close-up, {CH['D44']}, rain on his face, looking down into a hole with fear rather than wonder, he swallows and pulls back slightly.","CH_D44","C03",tries=6)

OFFICE = "cool overcast window light, quiet office"
add("S2",3,"medium","H34","해인이 낡은 보고서를 넘긴다","static medium",OFFICE,"종이 넘기는 소리",
    f"Medium shot, {CH['H34']} at a desk turning pages of an old bound survey report with blank pages. {OFFICE}.","CH_H34;LOC_OFFICE","C04")
add("S2",4,"insert","-","보고서 한 줄(후반 합성 텍스트)","top-down insert",OFFICE,"정적",
    "Top-down insert of an aged report page with a blank printed-form layout and a blurred photo of a ground opening, a finger resting under an empty line. No readable text.","LOC_OFFICE;TXT_01","C04")
add("S2",3,"insert","H34","해인이 명단에 이름을 쓴다(후반 합성)","close on pen hand",OFFICE,"펜 소리",
    "Close shot of a woman's hand writing with a pen on a blank participant list form. No readable text.","CH_H34;TXT_02","C05")
add("S2",4,"over-shoulder","LEAD;H34","팀장 대사","OTS on leader",OFFICE,"대사",
    f"Over-the-shoulder shot, {CH['LEAD']} looks up from a sheet of paper and speaks one short calm sentence.","CH_LEAD;CH_H34;LOC_OFFICE","C05",tries=6)
add("S2",5,"close-up","H34","해인 대사","static close-up",OFFICE,"대사",
    f"Close-up, {CH['H34']} speaks quietly and firmly, two short sentences, eyes steady.","CH_H34;LOC_OFFICE","C05",tries=6)
add("S2",3,"insert","LEAD","팀장이 서명한다","close on hand",OFFICE,"펜 소리",
    "Close shot, an older man's hand signs the bottom of a blank form with a pen. No readable text.","CH_LEAD;TXT_03","C06")

HOUSE = "dim interior, single window daylight, warm brown shadows"
add("S3",4,"wide","H34","마을 길, 가상 안내문, 이웃 한 명이 시선을 돌린다","tracking behind",  "overcast afternoon","바람, 발소리",
    f"Tracking shot behind {CH['H34']} walking a narrow Jeju village lane between basalt stone walls, past a blank signboard; one elderly neighbour glances at her then looks away.","CH_H34;LOC_VILLAGE","C07")
add("S3",4,"insert","-","식탁 위 밥그릇 하나","static",HOUSE,"시계 소리",
    f"Static shot of a small wooden dining table with a single rice bowl and one pair of chopsticks. {HOUSE}.","LOC_HOUSE","C08")
add("S3",4,"insert","-","벽의 가족사진과 접힌 초청장","slow pan",HOUSE,"정적",
    "Slow pan across a wall: an old framed photo of a man in a hard hat carrying a little girl on his shoulders in front of a utility pole, a folded card tucked into the frame edge. No readable text.","LOC_HOUSE;PR_PHOTO;CH_H14","C09")
add("S3",4,"medium","D64","문이 열리고 동수가 딸을 보지 않은 채 말한다","static medium",HOUSE,"문 소리, 대사",
    f"Medium shot, a door opens and {CH['D64']} steps in, eyes lowered, says one short sentence without looking up.","CH_D64;LOC_HOUSE","C10",tries=6)
add("S3",5,"close-up","H34","해인 고백 대사","static close-up",HOUSE,"대사",
    f"Close-up, {CH['H34']} speaks haltingly, a pause after the first words, eyes glistening but controlled.","CH_H34;LOC_HOUSE","C10",tries=6)
add("S3",3,"close-up","D64","동수는 대답하지 않는다","static close-up",HOUSE,"정적",
    f"Close-up, {CH['D64']} stays silent, jaw tight, eyes fixed on the floor.","CH_D64;LOC_HOUSE","C10")
add("S3",4,"close-up","H34","해인 대사","static close-up",HOUSE,"대사",
    f"Close-up, {CH['H34']} asks a question, then adds two short phrases, voice low.","CH_H34;LOC_HOUSE","C10",tries=6)
add("S3",6,"close-up","D64","동수의 두려움 고백","very slow push-in",HOUSE,"대사",
    f"Close-up, {CH['D64']} speaks slowly with a long pause in the middle, still not meeting her eyes.","CH_D64;LOC_HOUSE","C03",tries=6)
add("S3",4,"close-up","H34","해인 대사","static close-up",HOUSE,"대사",
    f"Close-up, {CH['H34']} asks one hurt question, barely above a whisper.","CH_H34;LOC_HOUSE","C10",tries=6)
add("S3",5,"medium","D64","긴 침묵, 벽의 안전모를 만진다. 끝에 '그랬지.'","static medium",HOUSE,"정적 후 대사",
    f"Medium shot, {CH['D64']} reaches to an old white hard hat hanging on the wall and rests his fingers on it for a long silent moment, then says one word.","CH_D64;PR_HELMET;LOC_HOUSE","C10",tries=6)
add("S3",5,"two-shot","H34;D64","해인이 허가서를 놓고, 동수는 안전모 먼지를 턴다","static wide two-shot",HOUSE,"종이, 먼지 터는 소리",
    f"Wide two-shot, {CH['H34']} places a sheet of paper on the table; {CH['D64']} does not read it, takes the old hard hat down and brushes the dust off.","CH_H34;CH_D64;PR_HELMET;LOC_HOUSE","C06")

GATE = "overcast daylight, cold air"
add("S4",4,"wide","H34;D64;LEAD","철문 앞 가상 조사팀","static wide",GATE,"바람, 장비 소리",
    "Wide shot, a small survey team in helmets gathered at a locked iron gate set into a low concrete structure in a Jeju field.","LOC_GATE;CH_LEAD","C11")
add("S4",6,"close two-shot","H34;D64","해인이 헤드랜턴을 고정, 손끝이 이마에 닿자 둘 다 멈춘다","close, static",GATE,"클립 소리, 정적",
    f"Close two-shot, {CH['H34']} fixes a headlamp onto the old white hard hat worn by {CH['D64']}; her fingertip brushes his forehead and both freeze for a beat.","CH_H34;CH_D64;PR_HELMET;PR_LAMP","C12",tries=8)
add("S4",4,"close-up","D64","2005년과 같은 찬 바람","static close-up",GATE,"동굴 바람",
    f"Close-up, {CH['D64']} facing a dark open gate, cold air moves his collar, a flicker of old fear.","CH_D64;LOC_GATE","C03")
add("S4",5,"wide","D64","동수가 마지막으로 계단을 내려간다","high angle from inside",  "daylight above, darkness below","발소리 울림",
    f"High-angle shot from inside a dark stairwell, {CH['D64']} is the last to descend metal stairs, daylight shrinking behind him.","CH_D64;LOC_GATE;PR_HELMET","C11")

add("S5",6,"wide","H34;D64","랜턴 빛이 검은 동굴을 가른다","slow dolly forward",CAVE_LIGHT,"물방울, 발소리",
    f"Wide shot inside a lava tube, two figures with headlamps walk slowly, beams cutting the darkness. {CAVE_LIGHT}","LOC_CAVE;CH_H34;CH_D64;PR_LAMP","F04")
add("S5",5,"detail","-","흰 탄산염 벽, 물방울","slow pan",CAVE_LIGHT,"물방울",
    f"Detail shot, white carbonate deposits flowing over black lava rock, a water drop forming and falling. {CAVE_LIGHT}","LOC_CAVE_WALL","F04")
add("S5",5,"medium","D64","동수가 무의식적으로 벽에 손을 뻗는다","side medium",CAVE_LIGHT,"숨소리",
    f"Side medium shot, {CH['D64']} slowly raises his bare hand toward a white cave wall, absorbed. {CAVE_LIGHT}","CH_D64;LOC_CAVE_WALL","C13")
add("S5",4,"close","D64","'만지면 안 돼요.' 손이 벽 한 뼘 앞에서 멈춘다","close on hand and wall",CAVE_LIGHT,"대사(화면 밖)",
    "Close shot, an old man's hand stops in mid-air a hand's width from a white mineral cave wall, fingers trembling slightly, never touching.","CH_D64;LOC_CAVE_WALL","C13",tries=8)
add("S5",6,"two-shot","D64;H34","손을 천천히 거둔다. 딸이 그 손을 본다","rack focus hand to Hae-in",CAVE_LIGHT,"물방울",
    f"Two-shot, the old man's hand slowly withdraws from the wall without touching it; focus racks to {CH['H34']} watching his hand.","CH_D64;CH_H34;LOC_CAVE_WALL","C13",tries=6)

LAKE = CAVE_LIGHT + " Still black water mirroring the beams."
add("S6",6,"wide","H34;D64","검은 호수, 보트 위 부녀","static wide",LAKE,"노 젓는 소리",
    f"Wide shot, a small inflatable boat with two people crossing a black underground lake in a lava tube. {LAKE}","LOC_LAKE;CH_H34;CH_D64","F02")
add("S6",5,"detail","-","수면 반사광이 천장에 일렁인다","tilt up",LAKE,"물결",
    "Tilt up from black water to a cave ceiling where rippling orange reflections move across the rock.","LOC_LAKE","C14")
add("S6",5,"detail","-","작고 창백한 물고기가 스친다(종 묘사 PENDING)","top-down at surface",LAKE,"물소리",
    "Top-down shot through clear dark water, a tiny pale fish glides past the edge of a light beam and vanishes.","LOC_LAKE","F06",tries=6)
add("S6",5,"close-up","D64","동수 대사","static close-up",LAKE,"대사",
    f"Close-up, {CH['D64']} looking down at the water, says a short hesitant question.","CH_D64;LOC_LAKE","F06",tries=6)
add("S6",5,"close-up","H34","해인 대사","static close-up",LAKE,"대사",
    f"Close-up, {CH['H34']} holding an oar, answers softly with one sentence, eyes on the water.","CH_H34;LOC_LAKE","C14",tries=6)
add("S6",6,"close","D64;H34","동수가 노를 잡은 딸의 손을 본다","close on hands, tilt to his eyes",LAKE,"노, 물방울",
    "Close shot of a woman's hands gripping an oar, tilt up to an old man's eyes watching them, unable to speak.","CH_D64;CH_H34;LOC_LAKE","C14")
add("S6",7,"wide","H34;D64","말없이 흘러가는 보트","slow drift",LAKE,"정적, 물결",
    f"Wide shot, the small boat drifts in silence, two headlamp beams apart, not facing each other. {LAKE}","LOC_LAKE;CH_H34;CH_D64","F02")

add("S7",6,"wide","H34;D64","호수 끝 모래 둑에 닿는다","static wide",CAVE_LIGHT,"보트가 모래에 닿는 소리",
    f"Wide shot, the boat reaches a pale sand bank at the end of the underground lake, two people step out carefully. {CAVE_LIGHT}","LOC_SAND;CH_H34;CH_D64","F02")
add("S7",5,"detail","-","바닥의 오래된 토기 조각처럼 보이는 물체, 손대지 않음","slow push-in",CAVE_LIGHT,"정적",
    "Detail shot, an ancient weathered pottery fragment half-buried in cave sand inside a headlamp beam, two pairs of boots stop at a respectful distance, nobody touches it.","LOC_SAND","F05")
add("S7",4,"medium","H34","해인이 무전으로 위치만 알린다","static medium",CAVE_LIGHT,"무전 잡음(대사 없음)",
    f"Medium shot, {CH['H34']} speaks briefly into a handheld radio, pointing at the ground without stepping closer.","CH_H34;LOC_SAND","C15")
add("S7",5,"close-up","D64","동수가 오랜 세월의 흔적을 본다","static close-up",CAVE_LIGHT,"물방울",
    f"Close-up, {CH['D64']} looking at something on the ground for a long time, the weight of years on his face.","CH_D64;LOC_SAND","C15")

add("S8",4,"wide","-","랜턴 빛이 바위 틈의 노란색에 멈춘다","pan stops",CAVE_LIGHT,"정적",
    "A headlamp beam pans across black rock and stops on a small patch of faded yellow wedged in a crevice.","LOC_CREVICE;PR_GLOVE_AGED","C16",tries=6)
add("S8",4,"detail","-","침전물이 앉은 낡은 작업장갑 한 짝","macro, static",CAVE_LIGHT,"물방울",
    "Macro shot, a single old yellow work glove lodged in a rock crevice, stiff and faded, thin white mineral crust on its surface.","PR_GLOVE_AGED;LOC_CREVICE","C16",tries=8)
add("S8",3,"close-up","D64","동수가 얼어붙는다","static close-up",CAVE_LIGHT,"숨 멎는 소리",
    f"Close-up, {CH['D64']} frozen, lips parted, headlamp light trembling.","CH_D64","C16")
add("S8",4,"medium","H34","해인이 사진을 찍고 무전한다","static medium",CAVE_LIGHT,"셔터, 무전 잡음",
    f"Medium shot, {CH['H34']} photographs the crevice with a small camera, then lifts a radio.","CH_H34;LOC_CREVICE","C17")
add("S8",4,"medium","LEAD;D64","조사팀이 봉투에 담아 동수에게 잠시 보여준다","static medium",CAVE_LIGHT,"봉투 소리",
    f"Medium shot, {CH['LEAD']} wearing nitrile gloves holds up a clear sample bag containing the old yellow work glove for the old man to see.","CH_LEAD;CH_D64;PR_GLOVE_AGED;PR_BAG","C17",tries=6)
add("S8",5,"close-up","D64","동수 고백","static close-up",CAVE_LIGHT,"대사",
    f"Close-up, {CH['D64']} staring at the bag, speaks slowly with a pause in the middle.","CH_D64","C03",tries=6)
add("S8",3,"close-up","H34","해인 대사","static close-up",CAVE_LIGHT,"대사",
    f"Close-up, {CH['H34']} says one gentle sentence.","CH_H34","C18",tries=6)
add("S8",3,"close-up","D64","동수 대사","static close-up",CAVE_LIGHT,"대사",
    f"Close-up, {CH['D64']} answers in a breaking low voice, one short sentence.","CH_D64","C03",tries=6)
add("S8",3,"close-up","H34","해인이 처음으로 아버지 얼굴을 제대로 본다","slow push-in",CAVE_LIGHT,"정적",
    f"Close-up, {CH['H34']} really looks at her father's face for the first time, accusation fading into complicated understanding.","CH_H34","C18")

add("S9",5,"wide","H34;D64","돌아오는 보트, 해인이 노를 멈춘다","static wide",LAKE,"노 멈춤, 대사",
    f"Wide shot, the boat in the middle of the black lake, {CH['H34']} stops rowing and says one word.","LOC_LAKE;CH_H34;CH_D64","C19")
add("S9",4,"two-shot","H34;D64","두 사람이 랜턴을 끈다","static two-shot",LAKE,"스위치 두 번",
    "Two-shot in the boat, both reach up to their headlamps and switch them off one after the other; the frame falls to total black.","CH_H34;CH_D64;PR_LAMP","C19",tries=6)
add("S9",8,"black","-","완전한 어둠. 물방울, 숨, 물결","black frame","none","물방울, 숨, 물결","n/a (black frame, edit)","EDIT_BLACK","C19",tool="NONE",tries=0)
add("S9",9,"black","D64;H34","어둠 속 대사와 사과","black frame","none","대사, 옷 스치는 소리","n/a (black frame, edit; AI voice only)","EDIT_BLACK","C20",tool="NONE",tries=0)
add("S9",6,"close","H34;D64","랜턴이 켜지면 해인의 손이 동수의 손 위에 있다","close on hands",LAKE,"스위치, 물결",
    "Close shot, a headlamp clicks on and warm light reveals a woman's hand already resting on top of an old man's weathered hand on the boat's edge; the hands stay still.","CH_H34;CH_D64;LOC_LAKE","C20",tries=8)
add("S9",5,"two-shot","H34;D64","서로 보지 않지만 손을 놓지 않는다","static two-shot",LAKE,"물결",
    "Two-shot in the boat, father and daughter look in different directions, their hands still joined between them.","CH_H34;CH_D64;LOC_LAKE","C20",tries=6)

EVE = "low golden evening light, long shadows"
add("S10",4,"wide","LEAD;H34;D64","저녁빛, 조사팀이 장비를 정리","static wide",EVE,"바람, 장비",
    f"Wide shot outside the iron gate, the survey team packing equipment cases. {EVE}.","LOC_GATE;CH_LEAD","C11")
add("S10",5,"medium","LEAD;D64","팀장이 봉투를 보여주며 말한다","static medium",EVE,"대사",
    f"Medium shot, {CH['LEAD']} holds the clear sample bag with the yellow glove toward the old man and says one formal sentence.","CH_LEAD;CH_D64;PR_GLOVE_AGED;PR_BAG","C21",tries=6)
add("S10",5,"close-up","D64","동수가 장갑을 내려다본다","static close-up",EVE,"정적",
    f"Close-up, {CH['D64']} looks down at the bag for a long moment, wanting to keep it.","CH_D64;PR_BAG","C22")
add("S10",4,"close","D64","봉투를 조사팀 쪽으로 밀어준다","close on hands",EVE,"봉투 스치는 소리",
    "Close shot, an old man's hand slowly slides a clear sample bag holding a yellow glove across a folding table toward another pair of hands.","CH_D64;PR_BAG;PR_GLOVE_AGED","C22",tries=6)
add("S10",5,"close-up","D64","동수 대사","static close-up",EVE,"대사",
    f"Close-up, {CH['D64']} speaks with a pause, plain and settled.","CH_D64","C22",tries=6)
add("S10",5,"close","H34","해인이 조사표에 적는다","close on pen hand",EVE,"펜 소리",
    "Close shot, a woman's hand writes on a blank field form on a clipboard in golden light. No readable text.","CH_H34;TXT_04","C23")
add("S10",5,"insert","-","조사표 '유입 경위'란(후반 합성 텍스트)","top-down insert",EVE,"정적",
    "Top-down insert of a blank field survey form on a clipboard, pen resting beside an empty line, golden light. No readable text.","TXT_04","C23")
add("S10",3,"close-up","LEAD","팀장이 확인한다","static close-up",EVE,"정적",
    f"Close-up, {CH['LEAD']} reads a clipboard and gives a small nod.","CH_LEAD","C23")
add("S10",5,"close","H34","봉투 속 장갑이 해인 손에서 저녁빛을 받는다(S1 대칭)","close, low angle",EVE,"바람",
    "Low-angle close shot, a woman's hand holds up a clear sample bag with the old yellow glove against the evening sun, the yellow glowing.","CH_H34;PR_BAG;PR_GLOVE_AGED","C23",tries=8)
add("S10",4,"close","LEAD","장갑이 보관함으로 들어간다","close on case",EVE,"보관함 닫힘",
    "Close shot, gloved hands place the sample bag into a grey storage case and close the lid.","CH_LEAD;PR_BAG","C17")

add("S11",4,"medium","D64","봉인된 문, 전선이 운다. 동수가 전신주에 손을 댄다","static medium",EVE,"전선 우는 소리",
    f"Medium shot, {CH['D64']} rests his palm on a weathered concrete utility pole near the closed iron gate, wires humming in the wind. {EVE}.","CH_D64;LOC_POLE","C24")
add("S11",4,"two-shot","H34;D64","해인이 옆에 서서 말한다","static two-shot",EVE,"대사",
    f"Two-shot, {CH['H34']} steps beside her father at the pole and says one quiet sentence with a pause.","CH_H34;CH_D64;LOC_POLE","C24",tries=6)
add("S11",4,"close-up","D64","동수가 돌아보고 딸의 눈을 피하지 않는다","static close-up",EVE,"정적",
    f"Close-up, {CH['D64']} turns his head and, for the first time, holds eye contact without looking away.","CH_D64","C24",tries=6)
add("S11",4,"close","D64;H34","아버지가 먼저 손을 내밀고 해인이 잡는다","close on hands",EVE,"정적",
    "Close shot, an old man's hand reaches out first, a woman's hand takes it, simple firm grip, golden backlight.","CH_D64;CH_H34","C24",tries=8)
add("S11",4,"wide","D64;H34","카메라를 등지고 나란히 선다. 긴 정적","static wide from behind",EVE,"전선, 바람",
    "Wide shot from behind, father and daughter stand side by side with their backs to camera beside a utility pole, Jeju field at dusk, long stillness.","CH_D64;CH_H34;LOC_POLE","C24")

add("S12",CREDIT_SEC,"credits","-","크레딧 및 창작 고지(편집 타이포)","-","-","잔향","n/a (edit typography)","EDIT_CREDIT","C25",tool="NONE",tries=0)

# 시작 시각(파일 시간)
t = 0
for s in S:
    s["start_sec"] = t; t += s["duration_sec"]

# ---- 자막: (shot_id, offset, dur, kind, speaker, ko, en) ------------------
SUBS = [
 ("S1-06",2.0,3.0,"title","","입구","THE OPENING"),
 ("S2-02",0.2,3.7,"text","","「최초 발견 경위: 공사 인부, 성명 미상」\n극중 가상 문서","\"First found by: a worker, name unknown\"\n(Fictional document)"),
 ("S2-03",0.5,2.3,"text","","김동수","Kim Dong-su"),
 ("S2-04",0.8,2.6,"dialogue","팀장","기록을 고칠 수는 없어.","We can't change the record."),
 ("S2-05",0.3,4.4,"dialogue","해인","알아요. 이번에는 같이 들어가게 해주세요.","I know. Just let him go in\nwith us this time."),
 ("S3-04",1.8,2.0,"dialogue","동수","3년 만이구나.","Three years."),
 ("S3-05",0.2,4.6,"dialogue","해인","그날… 사람들 앞에서 아버지 모른다고 했어요.","That day... in front of everyone,\nI said I didn't know you."),
 ("S3-07",0.2,3.7,"dialogue","해인","왜 아무 말도 안 했어요? 그때도, 지금도.","Why didn't you say anything?\nNot then. Not now."),
 ("S3-08",0.3,5.5,"dialogue","동수","처음 구멍이 열렸을 때… 내가 뭘 망가뜨린 줄 알았다.","When the ground first opened...\nI thought I had broken something."),
 ("S3-09",0.3,3.4,"dialogue","해인","그래서 나 혼자 다 듣게 뒀어요?","So you let me take it all alone?"),
 ("S3-10",3.4,1.5,"dialogue","동수","그랬지.","I did."),
 ("S5-04",0.2,2.2,"dialogue","해인","만지면 안 돼요.","Don't touch it."),
 ("S6-04",0.8,3.2,"dialogue","동수","눈이… 없는 건가?","It has... no eyes?"),
 ("S6-05",0.5,3.8,"dialogue","해인","여기선 다른 걸로 길을 찾겠죠.","Down here, it must find its way\nby something else."),
 ("S8-06",0.2,4.6,"dialogue","동수","그날 이걸 떨어뜨리고… 도망치고 싶었다.","I dropped this that day...\nand I wanted to run."),
 ("S8-07",0.1,2.8,"dialogue","해인","아버지가 발견한 거잖아요.","But you're the one who found it."),
 ("S8-08",0.1,2.8,"dialogue","동수","그땐… 망가뜨린 줄 알았어.","Back then... I thought I'd ruined it."),
 ("S9-01",2.8,1.5,"dialogue","해인","잠깐만요.","Wait."),
 ("S9-04",0.8,1.5,"dialogue","동수","해인아.","Hae-in."),
 ("S9-04",3.0,1.2,"dialogue","해인","네.","Yes."),
 ("S9-04",5.0,3.6,"dialogue","동수","그날 너 혼자 두면 안 됐는데.","I shouldn't have left you\nalone that day."),
 ("S10-02",1.2,3.2,"dialogue","팀장","조사기록에 남기겠습니다.","We'll enter it in the survey record."),
 ("S10-05",0.3,4.4,"dialogue","동수","여기 있던 건… 여기 기록으로 남겨주쇼.","It was here all along...\nKeep it here, in the record."),
 ("S10-07",0.4,4.2,"text","","「2005년 공사 중 낙하 — 김동수 진술」","\"Fell during construction, 2005\n— statement of Kim Dong-su\""),
 ("S11-02",0.6,3.0,"dialogue","해인","다음엔… 내가 먼저 올게요.","Next time... I'll come first."),
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
    with open(f"{OUT}/02_shotlist_v5.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore"); w.writeheader(); w.writerows(S)

    for name, both in (("05_subtitles_ko_en_v5.srt", True), ("05b_subtitles_en_burnin_v5.srt", False)):
        with open(f"{OUT}/{name}", "w", encoding="utf-8") as f:
            for i, x in enumerate(subs, 1):
                body = (x["ko"].replace("\n", " ") + "\n" + x["en"]) if both else x["en"]
                f.write(f"{i}\n{tc(x['start'])} --> {tc(x['end'])}\n{body}\n\n")

    with open(f"{OUT}/09_production_budget_v5.csv", "w", newline="", encoding="utf-8-sig") as f:
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

    with open(f"{OUT}/03_seedance_prompts_v5.md", "w", encoding="utf-8") as f:
        f.write("# 《입구》 v5 — Seedance 프롬프트\n\n> `tools/gen_v5.py`가 생성. 직접 수정 금지(스크립트를 고칠 것). 영상 생성은 승인 전 실행 금지.\n\n")
        f.write(f"## 공통 스타일 (모든 샷 앞에 붙임)\n```\n{STYLE}\n```\n\n## 동굴 조명 블록 (S5~S9)\n```\n{CAVE_LIGHT}\n```\n\n## 공통 부정 프롬프트\n```\n{NEG}\n```\n\n")
        f.write("## 연속성 규칙\n- 인물·소품은 `04_character_and_prop_bible_v5.md`의 레퍼런스 이미지를 매 샷 첨부한다(continuity_id 기준).\n"
                "- 한 샷 = 한 동작. 대사 샷은 화자 1명만 입을 연다.\n- 문서·라벨·자막·타이틀 글자는 생성하지 않고 후반 합성한다(TXT_xx).\n"
                "- 동굴 벽·유물에 손이 닿는 결과물은 불합격 처리한다.\n- 대사 음성(한국어) 생성 방식은 PENDING: Seedance 자체 오디오/립싱크 지원 여부 공식 확인 후 결정.\n\n## 샷별 프롬프트\n")
        for s in S:
            if s["ai_tool"] != "Seedance": continue
            f.write(f"\n### {s['shot_id']} · {s['duration_sec']}s · {s['shot_type']}\n- 동작: {s['action']}\n- 카메라: {s['camera']}\n- 연속성: `{s['continuity_id']}`\n"
                    f"```\n{STYLE} {s['prompt']} Camera: {s['camera']}. Lighting: {s['lighting']}\n```\n")
    print(f"shots={len(S)} total_sec={t} subs={len(subs)}")

if __name__ == "__main__":
    main()
