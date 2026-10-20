# -*- coding: utf-8 -*-
"""「입구」 v4.2 생성기 — 단일 진실 소스. 출력: 02 CSV, 02b 템플릿 CSV, 03 프롬프트 MD, DISCLOSURE_STEP3_draft.md, scene_ranges.json
v4.2: STYLE_BASE/CAVE_LIGHT 분리, 실내 인물 상수(DS_HOME/HI_CIVIL), 프롬프트 내 한글 메모 제거(notes 열), 7-4·8-3 분할, 감정 컷 +2s, 10-7 동작 명시."""
import csv, json

STYLE_BASE = ("Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. "
              "Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.")
CAVE_LIGHT = ("Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. "
              "Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light.")
DS      = "Korean man, 64, short white hair, deeply weathered face, thick calloused hands, faded orange safety vest over gray shirt, old scratched white hard hat"
DS_HOME = "Korean man, 64, short white hair, deeply weathered face, thick calloused hands, worn gray long-sleeve shirt, bareheaded"
DS05    = "Korean man, 44, short black hair wet with rain, orange safety vest, white hard hat"
HI      = "Korean woman, 34, black low ponytail, small mole under left eye, black technical work jacket, headlamp strap on forehead"
HI_CIVIL= "Korean woman, 34, black low ponytail, small mole under left eye, black technical work jacket, bareheaded"
LEADER  = "gray-haired Korean man in his 50s, gray field jacket"
TEAM    = "cave survey team in identical black work jackets and headlamps, faces in shadow"

S=[]
def add(sid,scene,sec,mode,refs,func,cam,prompt,audio,fail,retry,prio,cave=False,notes=""):
    S.append(dict(sid=sid,scene=scene,sec=sec,mode=mode,refs=refs,func=func,cam=cam,prompt=prompt,audio=audio,fail=fail,retry=retry,prio=prio,cave=cave,notes=notes))

add("INTRO","S0",20,"NONE","","공식 인트로(주최 제공)","","","주최 제공 영상 그대로","","","-",notes="주최 드라이브 원본. 길이 20초는 가정(파일 확인 전)")
# S1
add("1-1","S1",5,"T2V","R-2005","2005 발견. 비 오는 밭, 전신주를 세운다","fixed wide",
    f"Wide shot. Gray rain over flat Jeju farmland with black stone walls. A crane truck lowers a new concrete utility pole upright into a freshly dug hole; a worker ({DS05}) steadies it at the base. Fixed camera, overcast, desaturated documentary feel.",
    "빗소리, 굴착기","비가 안개처럼 / 전신주가 나무","'concrete utility pole with wires', 'rain as thin streaks' 추가","P2")
add("1-2","S1",4,"T2V","R-2005","땅이 꺼지고 전신주가 지하로 빨려 들어간다","fixed low",
    "Low angle in the rain. The ground at the base of a concrete utility pole suddenly gives way; the pole lurches and sinks several meters straight down into a dry black opening, mud sliding in after it, and stops tilted. Fixed low camera.",
    "흙 무너지는 굉음, 전신주 둔탁음","구멍이 물웅덩이 / 전신주가 쓰러짐","'sinks straight down, stays upright', 'dry black void' 추가","P1",notes="사실 근거: 국가유산청 소식지 2017 '전신주가 지하로 쑥 빨려 들어가는 바람에 발견'")
add("1-3","S1",5,"I2V","R-DS05","차가운 바람이 올라온다 (4-3 매치)","slow push-in",
    f"{DS05} leans over the dark gap beside a tilted, half-sunken utility pole in wet ground. A cold wind rises from below and visibly lifts his hair; he freezes. Slow push-in on his face. Rain on skin.",
    "바람 소리(저음)","머리카락이 안 움직임","'hair visibly blown upward' 반복, 10초 요청","P1")
add("1-4","S1",8,"T2V","R-WALL;R-ROOT","손전등 원 안의 흰 벽 — 첫 빛 (훅)","slow pan",
    "POV flashlight beam shining straight down into a pitch-black volcanic shaft. As the circle of light reaches the inner wall, bone-white soda-straw stalactites and glistening calcite flowstone emerge over black basalt. Slow pan across the untouched white formations. Pure black outside the beam.",
    "물방울 1회","원 밖이 회색 / 석회동굴처럼 밝음","CAVE_LIGHT 반복, 'small circle of light'","P0",cave=True,notes="v4.2 +2s, P0 격상(첫 30초 훅)")
add("1-5","S1",5,"T2V","R-GLOVE","노란 장갑이 떨어진다 (10-7 대칭)","fixed top-down",
    "Looking straight down a black shaft. One yellow rubber work glove slips from a hand at the top of frame; the hand exits frame immediately and the glove falls away from camera, caught briefly in a flashlight beam, then swallowed by darkness.",
    "낙하음 1.5초 지연","장갑 둘 / 손 잔류","'one glove only' 반복","P1",cave=True)
add("TITLE","S1",3,"NONE","","타이틀 '입구 / The Opening'","","","무음","","","-")
# S2
add("2-1","S2",6,"I2V","R-DOC","보고서를 넘기다 한 줄에서 멈춘다","slow push-in",
    "Close on a woman's slender hand turning pages of a bound cave survey report with photographs and diagrams under cool fluorescent office light. Her index finger stops on a single unprinted blank line in a table. Slow push-in on the blank line, shallow focus, no legible letters anywhere on the page.",
    "종이 소리 | SUB(합성): Discovered by: construction worker (name unknown)","페이지에 가짜 글자","'no legible letters' 2회","P1",
    notes="편집 합성: '발견자: 공사 인부(성명 미상)' + 구석 고지 '극중 재구성된 기록 / dramatized record'. 극중 가상 문서")
add("2-2","S2",4,"I2V","R-DOC","보고서를 덮고 명단 양식을 당긴다","fixed",
    "The same hand closes the report firmly and pulls forward a blank form with an empty header area. Fixed camera, cool fluorescent light, no legible letters.",
    "","","","P2",notes="편집 합성: 헤더 '2025년 학술조사 참가자 명단'. 극중 가상 문서")
add("2-3","S2",7,"REF","R-HI-civil;R-LEADER","이름을 쓴다. 팀장: 기록은 못 고쳐","fixed two-shot",
    f"{HI_CIVIL} writes a name on a roster form with a pen. Across the desk a {LEADER} watches and speaks briefly. Fixed two-shot, office interior, cool fluorescent light.",
    "팀장: 기록은 못 고쳐. 20년 전 거야. / 해인: 압니다. 이번 조사 명단에만. | SUB: The official record can't be changed. It's twenty years old. / I know. Just on this survey's roster.","입 모양 불일치","대사는 후반 더빙, 'speaks briefly'만","P1")
add("2-4","S2",5,"T2V","R-LEADER","팀장이 서명한다","fixed",
    "Close on a man's hand holding a pen above a signature box, hesitating, then signing. Fixed camera, fluorescent light, desk, no legible letters.",
    "","","","P2")
# S3
add("3-1","S3",6,"T2V","R-GATE;R-HI-civil;R-SIGN","돌담길, 팻말 하나","slow tracking",
    f"Evening dusk. {HI_CIVIL} walks along a Jeju black-stone-wall lane past quiet fields. Beside one field gate stands a weathered metal notice board with a blank flat face, no letters. Slow tracking beside her, cool blue dusk light.",
    "바람 | 팻말 합성(극중 소품, 실존 표지판 아님): 천연기념물 보호구역 · 허가 없이 현상을 변경할 수 없습니다 / Natural Monument Protected Zone — No alteration without permit","팻말 글자","'blank flat face' 반복","P2",notes="팻말 1개, 글자 편집 합성")
add("3-2","S3",4,"REF","R-HI-civil","노인 한 사람이 고개를 돌린다","fixed medium",
    f"An elderly Jeju farmer walking toward {HI_CIVIL} on a stone-wall lane sees her, closes his expression, turns his head away and passes without greeting. Fixed medium shot, cool dusk light.",
    "","노인이 웃음","'expression closed, avoids eye contact'","P2")
add("3-3","S3",5,"I2V","R-HOME","밥상 위 그릇 하나","slow push-in",
    "Small rural Korean room at night, one bare incandescent bulb. Low table with exactly one bowl of rice and one spoon. Old TV glow flickers on the wall. Slow push-in on the single bowl.",
    "TV 소리 낮게","그릇이 둘","'exactly one bowl, one spoon'","P1")
add("3-4","S3",5,"I2V","R-DS25-home","보지 않고 먹는다. 숟가락을 더듬는다","fixed medium",
    f"{DS_HOME} eats alone at a low table with his eyes lowered, never looking at the flickering TV, his right hand feeling for the spoon on the table by touch. Fixed medium shot, warm incandescent bulb light.",
    "","TV를 쳐다봄","'eyes stay down the whole time'","P1")
add("3-5","S3",5,"T2V","R-HOME;R-PHOTO","벽의 안전모와 액자","slow pan",
    "Slow pan across a wall under warm bulb light: a scratched white hard hat hanging on a nail, then a faded framed film snapshot of a young man carrying a small girl on his shoulders in front of a concrete utility pole.",
    "","액자 속 얼굴 왜곡","액자는 R-PHOTO 별도 생성 후 합성","P2",notes="액자 사진 1996년 설정('96 날짜 도장은 합성)")
add("3-6","S3",7,"REF","R-DS25-home;R-HI-civil","문을 연다. 딸을 보지 않고 문고리를 만진다","fixed",
    f"{DS_HOME} opens a wooden door. Outside in the dark stands {HI_CIVIL}. He does not meet her eyes; he looks at the door frame while his thumb slowly rubs the metal door handle. Fixed shot from inside, warm bulb light against night darkness.",
    "동수: …몇 년 만이냐. / 해인: 3년. | SUB: …How many years has it been? / Three.","눈을 마주침","'he looks at the door frame, not at her'","P1",notes="v4.2 +2s")
add("3-7","S3",6,"REF","R-DS25-home;R-HI-civil","허가서. 뚫은 놈. 니도.","fixed two-shot",
    f"Inside the small room, {HI_CIVIL} holds out a folded document. {DS_HOME} does not take it; he turns his gaze toward the old white hard hat hanging on the wall nail. Fixed two-shot, warm incandescent bulb light.",
    "동수: 20년 동안 나보고 뚫은 놈이라 그랬다. 니도. / 해인: …맞잖아요. | SUB: For twenty years they blamed me for breaking it open. Even you. / …You did.","","","P1")
add("3-8","S3",5,"I2V","R-DS25-hand","안전모를 내려 먼지를 턴다","fixed macro",
    "Close on thick weathered five-fingered hands lifting an old white hard hat from a wall nail and brushing dust off it with a palm. Warm bulb light. Fixed camera.",
    "먼지 터는 소리","손가락 6개","손 레퍼런스 첨부, 'five fingers' 반복","P1")
add("3-9","S3",4,"I2V","R-HI-civil","해인이 그릇 하나를 본다","slow push-in",
    f"{HI_CIVIL} stands indoors, glances down at the low table with one single bowl and one spoon, and remains silent. Slow push-in on her face, warm bulb light.",
    "","","","P2")
# S4
add("4-1","S4",5,"I2V","R-GATE;R-TEAM","전신주, 철문, 조사팀","slow aerial pull-out",
    f"Overcast morning. Flat Jeju field with black stone walls, a concrete utility pole, a rusted steel hatch about one meter square in a concrete frame beside it. A {TEAM} unloads equipment from a white van. Slow aerial pull-out.",
    "","철문이 지하실 문처럼 큼","'about one meter square'","P2")
add("4-2","S4",5,"REF","R-DS25;R-HI","헤드랜턴을 씌운다. 손이 이마에 닿는다","fixed close two-shot",
    f"{HI} fastens a headlamp over the old white hard hat worn by {DS}. Her fingers touch his forehead for a moment; both go still. Close two-shot, fixed, overcast light.",
    "","","","P1")
add("4-3","S4",5,"REF","R-DS25","철문이 열리고 바람이 올라온다 (1-3 매치)","slow push-in",
    f"A steel hatch door swings open. Cold air rises from the dark and lifts the loose white hair at the temples of {DS} standing at the edge, hard hat on. Slow push-in. Overcast.",
    "바람 소리(1-3 동일 음원)","안전모 쓴 채 머리 전체가 날림","'only the hair below the hard hat moves'","P1",notes="안전모 착용 상태에서 관자놀이 머리카락만")
add("4-4","S4",5,"T2V","","위에서 본 구멍, 사다리, 작아지는 빛","fixed top-down",
    "Looking straight down a dark vertical shaft with a steel ladder fixed to one side. Headlamp circles descend the ladder one by one, growing smaller, until the last one moves out of view. Fixed top-down camera. Pure black.",
    "","","","P2",cave=True)
# S5
add("5-1","S5",7,"I2V","R-ROLL","용암두루마리 벽을 훑는 랜턴 원 여섯 개","slow tracking",
    "Six small headlamp circles sweep along a lava tube: rope-like lava rolls run along the black floor, a frozen lava fall steps down one wall, and calcite flows in bone-white, pale yellow and rust-red cover the rock. Beams cross and separate. Slow tracking along the passage.",
    "발소리, 물방울","벽 전체가 밝아짐","CAVE_LIGHT 반복, 'beams are small circles'","P1",cave=True)
add("5-2","S5",5,"I2V","R-ROOT","뿌리를 따라 자란 흰 종유관, 물방울","slow tilt up",
    "A headlamp beam tilts up to a black basalt ceiling where thin bone-white soda-straw stalactites hang like pipe-organ tubes, and calcite has grown along old tree roots into slender pale pillars from ceiling to floor. A single water drop swells at a tip and falls. Slow tilt up then hold.",
    "물방울 1회","종유관이 굵은 고드름","'pencil-thin straws'","P1",cave=True)
add("5-3","S5",9,"REF","R-DS25;R-DS25-hand;R-WALL","흰 벽 앞에서 손이 멈춘다","fixed side profile",
    f"{DS} with lit headlamp stands before a bone-white calcite wall. He slowly reaches out his thick five-fingered hand toward the white surface, then stops a full hand's width away without touching it, trembling slightly, and holds. Fixed side profile; his own headlamp is the only light.",
    "해인(화면 밖): 만지면 안 돼요. | SUB: Don't touch it.","손이 벽에 닿음","'never touches, visible gap' 반복","P0",cave=True,notes="v4.2 +2s")
add("5-4","S5",6,"REF","R-HI","멈춘 손 → 해인의 시선","rack focus",
    f"Close on a weathered hand frozen a hand's width from a white calcite wall. Rack focus to {HI} in the background watching the hand, her headlamp beam low.",
    "","","","P1",cave=True)
# S6
add("6-1","S6",7,"I2V","R-LAKE","보트. 빛이 두 번","slow tracking side",
    f"A small gray rubber boat glides on perfectly still black underground water; {HI} rows at the back, {DS} sits at the front, two people only, no motor. Their headlamps reflect off the water onto a low basalt ceiling as two circles of light. Slow tracking from the side.",
    "노 젓는 물소리","모터/셋째 인물","'two people only, no motor'","P1",cave=True)
add("6-2","S6",5,"T2V","R-HAZE","물속 경계층 아지랑이","slow push-in",
    "A headlamp beam shines down into clear black water. A shimmering, wavering refraction layer where fresh water meets denser salt water, like heat haze underwater. Slow push-in.",
    "","층이 안개","'sharp refraction layer, not fog'","P2",cave=True,notes="해수 영향은 확인, '층'의 시각화는 창작적 표현")
add("6-3","S6",9,"I2V","R-FISH;R-LAKE","눈이 퇴화한 물고기","slow tracking with fish",
    "Macro shot. A single small pale-pink translucent cave goby, 3.5 cm long, with an unusually large head and eyes reduced to two tiny dark dots buried beneath the skin with no visible eyeball, drifts slowly through a single warm headlamp beam in black water beside a gray rubber boat edge. One fish only, calm, unafraid of the light. Slow tracking with the fish.",
    "","눈알 생김 / 물고기 둘","'no visible eyeball', 'one fish only' 2회 반복","P0",cave=True,notes="v4.2 +2s. 크기 3.44cm(2014 측정) 반영")
add("6-4","S6",5,"REF","R-DS25","동수가 들여다본다. 빛이 없어서 눈이 없어진 거냐","fixed close",
    f"{DS} leans over the edge of a rubber boat and looks down into black water lit by his headlamp, his face faintly reflected. Fixed close shot.",
    "동수: 빛이 없어서 눈이 없어진 거냐. | SUB: Did they lose their eyes because there's no light?","","","P1",cave=True)
add("6-5","S6",5,"REF","R-HI","해인: 안 써도 살 수 있었나 봐요","fixed medium",
    f"{HI} holds the oars still and looks at the man across the boat, calm, and speaks one short line. Fixed medium shot, black water, her beam low.",
    "해인: …안 써도 살 수 있었나 봐요. | SUB: …Maybe they could live without using them.","","","P1",cave=True)
add("6-6","S6",6,"REF","R-DS25;R-DS25-hand","동수가 자기 손을 내려다본다. 그럼 뭘 보고 사냐","fixed close",
    f"{DS} in a rubber boat slowly turns his thick five-fingered hands palm-up in his own headlamp light and looks at them. Fixed close shot, black water beyond.",
    "동수: 그럼 뭘 보고 사냐. / 해인(화면 밖): 안 봐요. 느껴요. | SUB: Then what do they see by? / They don't see. They feel.","손가락 수","손 레퍼런스, 'five fingers each'","P0",cave=True)
add("6-7","S6",5,"I2V","R-FISH","물고기가 빛을 가로질러 사라진다","fixed macro",
    "The pale-pink translucent goby, eyes buried beneath its skin, crosses the full width of a headlamp beam in black water and disappears at the edge of the light. Fixed macro.",
    "","","","P1",cave=True)
# S7
add("7-1","S7",5,"I2V","R-SAND","보트가 모래에 닿는다. 파도 소리","fixed low from boat",
    "The nose of a gray rubber boat slides onto a dark sand bank at the end of black underground water. A headlamp beam ahead reveals sand rising into darkness. Fixed low camera from the boat.",
    "먼 파도 소리","","","P2",cave=True)
add("7-2","S7",5,"I2V","R-SAND;R-INSCRIPTION","항아리들, 벽의 두 자국","slow pan",
    "A headlamp beam settles on gray stoneware bottles and jars half-buried in dark wet sand, one tipped over, broken sherds, abalone and limpet shells and a dark smear of old charcoal nearby. The beam tilts up to a black basalt wall where two shallow scratched marks are half-covered by white calcite crust, illegible. Slow pan from the jars to the wall.",
    "","각자가 문자처럼 생성","'two shallow illegible marks'","P1",cave=True,notes="기종명(장동병 등)은 미검증이라 쓰지 않음. 각자 글자는 합성하지 않고 '두 자국'으로만")
add("7-3","S7",6,"T2V","R-SILLA","창작 재현: 횃불, 항아리를 두고 벽에 자국을 긋는다","fixed wide",
    "Long ago on the same sand bank. Four silhouetted figures in rough undyed hemp clothing hold pine torches, faces entirely outside the firelight; a small fire of embers glows on the sand. One kneels and sets a gray stoneware jar on the wet sand; another scratches two marks into the black wall with an iron point. Only torchlight, deep orange, black beyond. Dreamlike silhouettes.",
    "횃불 소리 | 화면 하단 자막(6초 내내): 창작 재현 — 유물은 실제, 장면은 상상 / Dramatization — artifacts are real, the scene is imagined","얼굴이 보임","'faces never lit'","P2",cave=True)
add("7-4a","S7",5,"T2V","R-SILLA","횃불이 돌아선다, 마지막 불이 사라진다","fixed",
    "Four silhouetted figures holding pine torches turn away from a gray stoneware jar resting on dark sand and walk up into the pitch-black cave until the last orange flame disappears into pure black. Fixed camera.",
    "횃불 멀어짐","","","P2",cave=True,notes="v4.2 분할(구 7-4 전반)")
add("7-4b","S7",5,"I2V","R-SAND","현재: 같은 항아리에 랜턴이 켜진다 (매치컷)","fixed same framing",
    "Pure black frame. A single cool-white headlamp beam sweeps in and illuminates the same gray stoneware jar, now weathered, crusted with white calcite and half-buried in dark sand. Fixed camera, identical framing to the previous shot.",
    "물방울","","","P2",cave=True,notes="v4.2 분할(구 7-4 후반). 7-4a 마지막 프레임을 첫 프레임 참조로")
# S8
add("8-1","S8",5,"T2V","R-GLOVE","랜턴이 바위 틈에서 멈춘다. 장갑","slow pan then hold",
    "A headlamp beam sweeps along a black basalt crevice at the edge of a sand bank, then stops. In the beam: a yellow rubber work glove crusted in white calcite. Slow pan then hold.",
    "","","","P1",cave=True)
add("8-2","S8",5,"REF","R-DS25","동수가 얼어붙는다","slow push-in",
    f"{DS} with headlamp stares at something low in a rock crevice. His body goes completely still; his beam trembles slightly. Slow push-in on his face.",
    "","","","P1",cave=True)
add("8-3a","S8",5,"REF","R-HI","해인이 본다. 사진 한 장","fixed medium",
    f"{HI} approaches the rock crevice, sees the calcite-crusted yellow glove, pauses, and photographs it once with a rugged tablet camera; a brief small flash lights only the crevice while the cave stays black. Fixed medium shot.",
    "셔터음","플래시가 동굴을 밝힘","'brief small flash, cave stays black'","P1",cave=True,notes="v4.2 분할(구 8-3 전반)")
add("8-3b","S8",4,"REF","R-HI","기록, 집게와 봉투를 꺼낸다","fixed medium-close",
    "The same woman lowers the tablet, makes a brief note on a field clipboard under her headlamp light, and picks up steel specimen tweezers and a clear polyethylene bag. Fixed medium-close shot.",
    "","","","P2",cave=True,notes="v4.2 분할(구 8-3 후반). 극중 절차(실제 규정 아님)")
add("8-4","S8",5,"REF","R-HI-hand;R-GLOVE;R-BAG","장갑을 표본 봉투에. 라벨 한 칸은 비어 있다","fixed macro",
    "Macro close-up on gloved hands using steel tweezers to gently lift the white calcite-crusted yellow work glove from the basalt crevice and slide it into a clear specimen bag with a blank white label strip. Fine white calcite dust falls. A pen tip hovers above the blank label and stops without writing. Fixed macro.",
    "","라벨에 가짜 글자","'blank white label strip' 반복","P0",cave=True,notes="편집 합성: 라벨 '유입 경위: ______'")
add("8-5","S8",6,"REF","R-HI-hand;R-DS25-hand;R-BAG","봉투를 아버지 손에 쥐어준다","fixed macro",
    "Close on hands. A young woman's slender five-fingered hand places a clear specimen bag holding a white-crusted yellow glove into an older man's thick, scarred, open left palm. His fingers close on it. Fixed macro, warm headlamp light.",
    "","","","P0",cave=True)
add("8-6","S8",4,"REF","R-HI","해인이 돌아서 보트로 간다","fixed wide from behind",
    f"{HI} turns away and walks back across dark sand toward a rubber boat, her headlamp beam leading. Behind her the man stands alone holding a small clear bag. Fixed wide from behind her.",
    "","","","P2",cave=True)
# S9
add("9-1","S9",5,"REF","R-HI;R-DS25;R-LAKE","보트가 호수 가운데. 노를 멈춘다. 끄죠","fixed wide side",
    f"Rubber boat in the middle of a black underground lake. {HI} at the back stops rowing; {DS} at the front. Two headlamp circles on water and ceiling. Fixed wide from the side.",
    "해인: 끄죠. | SUB: Let's turn them off.","","","P1",cave=True)
add("9-2","S9",4,"REF","R-HI;R-DS25","랜턴 두 개가 꺼진다 → 검정","fixed close two-shot",
    "Close two-shot in a boat: both people reach up and switch off their headlamps one after the other, the man first. Light disappears; the frame goes to pure black. Fixed camera.",
    "","프레임이 회색","마지막 1초 편집 검정","P1",cave=True)
add("BLACK","S9",10,"NONE","","암전 (기본 10초, 8/15초 대안)","","","물방울·숨·먼 파도. 동수: …보인다. / 해인: 뭐가요. / 동수: 아무것도. | SUB: …I can see. / See what? / Nothing.","","","-",notes="SOUND_TIMELINE 초 단위. 자막은 검정 위 흰 글자")
add("9-3","S9",8,"REF","R-HI-hand;R-DS25-hand;R-LAKE","랜턴이 켜진다. 이미 포개진 두 손","fixed macro",
    "Pure black. A single warm headlamp switches on. In the small circle of light, resting on the gray rubber boat edge: a young woman's slender five-fingered hand lying still on top of an older man's thick, scarred, calloused five-fingered hand. Neither hand moves. Extreme macro close-up, pure black water beyond.",
    "숨소리, 점등 후 무음 3초","손가락 수 / 손 위치","손 레퍼런스 2쌍 고정. 파일럿 3회 → 통과 후 확대. 채택 컷의 손 위치를 9-4 프롬프트에 기술","P0",cave=True,notes="v4.2 +2s. 영화의 성패")
add("9-4","S9",5,"REF","R-HI;R-DS25","둘 다 손을 쳐다보지 않는다","fixed two-shot",
    f"Two-shot in a rubber boat under one headlamp: {DS} looks down at the water, {HI} looks up at the ceiling, their joined hands resting on the boat edge between them, out of focus, the woman's hand on top. Neither looks at the hands. Fixed.",
    "","손이 떨어져 있음","'hands stay joined, same position as previous shot'","P0",cave=True)
add("9-5","S9",5,"I2V","R-FISH","물고기가 보트 옆을 지난다","fixed macro",
    "The pale-pink translucent goby, eyes buried beneath its skin, drifts past a gray rubber boat edge at the bottom of a single headlamp beam and slips into black water. Fixed macro.",
    "","","","P2",cave=True)
# S10
add("10-1","S10",5,"I2V","R-GATE-dusk;R-TEAM","저녁. 철문 앞 조사팀. 한 명이 비켜선다","slow push-in",
    f"Evening, flat Jeju field, blue dusk. A {TEAM} waits loosely gathered around an open steel hatch, equipment set down, not in lines. One researcher steps back from the hatch edge to make room. Slow push-in.",
    "바람","도열처럼 보임","'loosely gathered, not in lines'","P1")
add("10-2","S10",5,"REF","R-DS25;R-LEADER;R-BAG","동수가 봉투를 들고 올라온다. 팀장이 안전모를 벗는다","fixed low",
    f"{DS} climbs up out of a steel hatch in the ground holding a small clear specimen bag in his left hand. Nearby a {LEADER} quietly takes off his own hard hat. Fixed low camera at ground level. Dusk.",
    "","","","P1")
add("10-3","S10",5,"REF","R-DS25;R-LEADER;R-BAG","팀장이 손을 내민다. 동수가 봉투를 본다","fixed medium",
    f"The {LEADER} holds out an open hand toward {DS}, who looks down at the specimen bag in his own hand for a long moment. Fixed medium two-shot, dusk.",
    "","","","P1")
add("10-4","S10",6,"REF","R-DS25;R-LEADER;R-BAG","동수가 봉투를 건넨다 (클로즈업). 동굴이나 잘 닫으쇼","fixed close",
    f"Close on hands and faces: {DS} moves the clear specimen bag to his right hand, places it into the {LEADER}'s open hand and lets go slowly. The leader says something; the old man answers in a few words and looks away toward the field. Fixed close two-shot, dusk.",
    "팀장: 보고서에 올리겠습니다. / 동수: …동굴이나 잘 닫으쇼. | SUB: I'll put it in the report. / …Just seal the cave tight.","","","P1",notes="자막에 '이름'을 넣지 않는다(공식 기록 정정 오인 방지)")
add("10-5","S10",7,"REF","R-HI-hand;R-BAG","해인이 봉투 라벨의 빈 칸에 쓴다","fixed macro",
    "Extreme macro close-up on a young woman's slender five-fingered hand in a black jacket sleeve holding a black pen, writing steadily across a blank white label strip on a clear specimen bag that contains a calcite-crusted yellow work glove, resting flat on a clipboard. Cool blue dusk light, no legible text.",
    "펜 소리 | SUB(합성): Origin: dropped during utility-pole work, 2005 — Kim Dong-su","가짜 글자","'no legible text' 반복","P0",notes="v4.2 +2s. 편집 합성: '유입 경위: 2005년 공사 중 낙하 — 김동수'. 표본 라벨은 공식 문서가 아님")
add("10-6","S10",5,"REF","R-LEADER;R-TEAM","팀장이 읽고 아래에 서명한다. 사람들이 조용히 본다","fixed medium",
    f"The {LEADER} reads the label, nods once, and signs below it. Around him a {TEAM} watches in silence; no one bows, no one speaks, heads level. Fixed medium, dusk.",
    "","집단이 고개 숙임","'no bowing, heads level'","P1")
add("10-7","S10",4,"REF","R-BAG;R-GLOVE;R-GATE-dusk;R-HI-hand","해인의 손이 봉투를 저녁빛 속으로 들어 올린다 (1-5 대칭)","slow tilt up",
    "Low angle. A young woman's hand grips the top of a clear specimen bag holding a white-crusted yellow glove and lifts it upward into the last blue-orange dusk light above a dark field; the bag is held firmly by the hand the whole time and never floats. Slow tilt up following the hand and bag. Sky behind.",
    "바람","장갑이 스스로 떠오름 / 손 없음","'held firmly by the hand, never floats' 반복","P0",notes="파일럿 2번 컷")
add("10-8","S10",5,"T2V","R-GATE-dusk","철문이 닫힌다. 자물쇠. 봉인지","fixed close",
    "A steel hatch door closes over a concrete frame in a dark field. Hands fasten a heavy padlock and press a blank white paper strip across the seam. Fixed close on the seam, dusk to night.",
    "자물쇠 소리","봉인지에 글자","'blank white paper strip'","P2",notes="입구 밀폐는 실제 관행(국가유산청 2017: 조사 외 완전 밀폐). '최종 조사 후 영구'만 창작")
# S11
add("11-1","S11",5,"REF","R-DS25;R-GATE","동수가 전신주에 손을 댄다","slow push-in",
    f"Night wind over a Jeju field. A concrete utility pole, wires humming, a sealed hatch below it with a small blank sign. {DS} places his hand flat on the pole. Slow push-in on the hand.",
    "전선 윙 소리","","","P1")
add("11-2","S11",7,"REF","R-DS25;R-HI","동수가 처음으로 딸을 본다","fixed close two-shot",
    f"Night wind over a dark Jeju field, concrete utility pole behind. {DS} slowly turns his head and looks directly into the eyes of {HI_CIVIL} standing beside him, holding her gaze for the first time. She looks straight back at him. Fixed close two-shot.",
    "","눈을 피함","'direct eye contact, held'","P0",notes="v4.2 +2s. 해인은 랜턴 벗은 상태")
add("11-3","S11",5,"REF","R-DS25;R-HI","동수가 딸의 손을 잡는다. 둘이 앞을 본다","slow pull-out",
    f"Wide from behind: {DS} and {HI_CIVIL} stand side by side before a utility pole in a dark field. His thick hand reaches sideways and takes hers. Both turn to face forward. Slow pull-out, wind in their hair.",
    "","","","P1")
add("CREDITS","S12",20,"NONE","","엔딩 크레딧","","","무음→전선 소리","","","-")

SCENE_LABEL={"S0":"공식 인트로","S1":"2005 비 오는 밭","S2":"2025 조사기관 사무실(극중)","S3":"월정리 동수의 집","S4":"입구","S5":"동굴 상류 흰 벽","S6":"호수","S7":"호수 끝 모래 둑","S8":"바위 틈 장갑","S9":"호수 가운데 어둠","S10":"지상 철문","S11":"전신주","S12":"크레딧"}
def req_len(sec,mode): return 0 if mode=="NONE" else (5 if sec<=5 else 10)   # 가정: 5/10초 옵션
def mmss(t): return f"{t//60}:{t%60:02d}"
rows=[]; t=0
for s in S:
    a=t; b=t+s["sec"]; t=b
    full = "" if s["mode"]=="NONE" else (s["prompt"]+" "+(CAVE_LIGHT+" " if s["cave"] else "")+STYLE_BASE)
    rows.append(dict(샷ID=s["sid"],장면=s["scene"],장면명=SCENE_LABEL[s["scene"]],이야기기능=s["func"],시작=mmss(a),종료=mmss(b),시작초=a,종료초=b,
        최종사용길이초=s["sec"],생성요청길이초=req_len(s["sec"],s["mode"]),방식=s["mode"],레퍼런스ID=s["refs"],카메라=s["cam"],
        광원블록=("CAVE_LIGHT" if s["cave"] else ("없음" if s["mode"]=="NONE" else "STYLE_BASE만")),프롬프트=full,음향_대사_자막=s["audio"],
        편집합성_비고=s["notes"],예상실패=s["fail"],재생성지시=s["retry"],우선순위=s["prio"]))
with open("02_입구_샷리스트_v4.2.csv","w",newline="",encoding="utf-8-sig") as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
with open("02b_shotlist_template_schema.csv","w",newline="",encoding="utf-8") as f:
    w=csv.writer(f); w.writerow("shot_id,scene_id,edit_start_sec,edit_end_sec,edit_duration_sec,generation_requested_sec,source_type,model,reference_ids,prompt_id,dialogue,subtitle,sfx,priority,proof_path,status".split(","))
    for r in rows:
        src="official_intro" if r["샷ID"]=="INTRO" else ("edit_only" if r["방식"]=="NONE" else "seedance"); d=r["음향_대사_자막"]
        w.writerow([r["샷ID"],r["장면"],r["시작초"],r["종료초"],r["최종사용길이초"],r["생성요청길이초"],src,("Seedance 2.5 (fallback 2.0)" if src=="seedance" else ""),r["레퍼런스ID"],("P-"+r["샷ID"] if src=="seedance" else ""),d.split("|")[0].strip() if "|" in d else "",d.split("SUB:")[1].strip() if "SUB:" in d else "",d if "|" not in d else "",r["우선순위"],"","planned"])
# 장면 범위 JSON (시나리오 헤더 동기화용)
sc={}
for r in rows: sc.setdefault(r["장면"],[r["시작초"],r["종료초"]]); sc[r["장면"]][1]=r["종료초"]
json.dump(sc,open("scene_ranges.json","w"),ensure_ascii=False,indent=1)
# 03 프롬프트 MD
ai=[r for r in rows if r["방식"]!="NONE"]; ai_sec=sum(r["최종사용길이초"] for r in ai); intro=20
L=["# 「입구」 v4.2 — Seedance 프롬프트 (샷별)","",f"**단일 진실 소스** `02_입구_샷리스트_v4.2.csv` (gen_v4.py 생성). 총 {len(rows)}행, AI {len(ai)}컷 {ai_sec}s / 전체 {t}s.","",
   "## 공통 블록 (v4.2 분리)","","**STYLE_BASE — 모든 AI 샷 끝에 부착 (지상·실내 포함)**","```",STYLE_BASE,"```","**CAVE_LIGHT — 동굴 샷에만 (광원블록 열 = CAVE_LIGHT)**","```",CAVE_LIGHT,"```",
   "**인물 상수**","```",f"DS (동굴·지상 장비): {DS}",f"DS_HOME (실내, 안전모 없음): {DS_HOME}",f"DS05 (2005): {DS05}",f"HI (동굴, 랜턴): {HI}",f"HI_CIVIL (사무실·돌담길·마지막): {HI_CIVIL}",f"LEADER: {LEADER}",f"TEAM: {TEAM}","```","",
   "## 광원 규칙 (현실 정합)","- '광원 하나'는 샷 안의 **주광원이 하나**라는 뜻. 랜턴 여러 개가 보이는 샷(5-1, 6-1, 9-1)은 각 랜턴이 작은 원을 만들고 그 사이는 검정. 수면 반사(6-1)는 같은 랜턴의 2차 반사. 지상·실내 샷은 자연광·백열등·저녁빛이 주광원이며 CAVE_LIGHT를 붙이지 않는다. 용접 불꽃은 v4에서 삭제됨(자물쇠·봉인지).","",
   "## 프롬프트 위생 규칙","- 프롬프트 본문에 한글·괄호 메모·합성 지시를 넣지 않는다(→ `편집합성_비고` 열). 글자가 필요한 모든 면은 'blank / no legible letters'로 생성 후 편집 합성.","- 샷당 카메라 이동 하나. 한 프롬프트에 두 국면(시간 점프·매치컷)을 넣지 않는다(7-4a/7-4b, 8-3a/8-3b로 분할).","",
   "## Seedance 사양 검증 (Dreamina 공식 페이지, 2026-10-20)","","| 항목 | 2.0 | 2.5 | 판정 |","|---|---|---|---|",
   "| 참조 입력 | 12개(이미지 9·영상 3·오디오 3, 각 ≤15초) | 최대 50개 | 확인됨(공식) |","| 모드 | Single-frame / Multiframes | Omni reference | 확인됨(공식) |",
   "| 1회 출력 길이 | 미표기(요금 환산 10초 기준) | 30초, 확장 5~180초 베타 | 일부 확인 — **5/10초 옵션은 가정** |","| 해상도 | 1080p 다운로드 | 동일 | 일부 확인 |",
   "| 요금 | Basic $15/1,575cr · Standard $36/3,885cr · Advanced 17,600cr(가격 미표기) | — | 일부 확인 — 샷당 단가 미공개 → PENDING |","| @ 태그 | @AssetName | @Image1… | 공식 가이드. UI 당일 확인 |","",
   "## 우선순위","- **P0** 파일럿 3컷(9-3, 10-7, 6-3) 각 3회 → 통과 후 나머지 P0·P1 확대. 'P0 각 10회' 표현은 v4.2에서 폐기.",""]
cur=None
for r in rows:
    if r["장면"]!=cur: cur=r["장면"]; L+=[f"## {cur}. {r['장면명']}",""]
    if r["방식"]=="NONE":
        L+=[f"### {r['샷ID']} · {r['시작']}–{r['종료']} ({r['최종사용길이초']}s) · 생성 없음",f"- {r['이야기기능']}",f"- 음향/대사: {r['음향_대사_자막']}",f"- 비고: {r['편집합성_비고'] or '—'}",""]; continue
    L+=[f"### {r['샷ID']} · {r['시작']}–{r['종료']} · 사용 {r['최종사용길이초']}s / 요청 {r['생성요청길이초']}s · {r['방식']} · {r['광원블록']} · {r['우선순위']}",
        f"- 기능: {r['이야기기능']}",f"- 레퍼런스: {r['레퍼런스ID'] or '없음'} · 카메라: {r['카메라']}",f"- 음향/대사/자막: {r['음향_대사_자막'] or '없음'}",
        f"- 편집 합성·비고: {r['편집합성_비고'] or '—'}",f"- 예상 실패: {r['예상실패'] or '—'} → 재생성: {r['재생성지시'] or '—'}","```",r["프롬프트"],"```",""]
open("03_Seedance_프롬프트_v4.2.md","w",encoding="utf-8").write("\n".join(L))
# 제출문 초안(수치 자동)
refs=sorted(set(x for r in ai for x in r["레퍼런스ID"].split(";") if x))
D=f"""# 제출 폼 Step 3 초안 — AI & Rights Disclosure (v4.2, 수치는 생성기 산출. 완성 영상 후 재산출 필요)

**Why generative AI was necessary.** *The Opening* is set in Yongcheon Cave, Jeju — a lava tube within the Geomunoreum Lava Tube System inscribed as UNESCO World Natural Heritage in 2007 (Jeju Volcanic Island and Lava Tubes). Designated Natural Monument in February 2006, the cave is not open to the public and entry requires permission from the Korea Heritage Service; filming inside is restricted to authorized surveys. The film does not depict the actual cave; it depicts a fictional cave inspired by published descriptions (white carbonate speleothems over black basalt, an underground lake, a cave goby with regressed eyes, Unified Silla pottery). Generative video was the only way to stage a fictional human story in such a place without entering it.

**What is fictional.** All characters, the discovery report and its 'name unknown' line, the survey roster, the civilian's participation, the 'final survey and sealing', the specimen-bag procedure and the village's blame are invented, and the film says so on screen (S2 corner notice; first credit card).

**Seedance ratio (planned).** Total runtime {t}s including the official intro ({intro}s). Seedance-generated footage: {ai_sec}s across {len(ai)} shots = {ai_sec/t:.1%} of the full file, {ai_sec/(t-intro):.1%} excluding the intro. Non-generated: official intro, title card (3s), an intentional 10s blackout, end credits (20s). No live-action footage. Per-shot timecodes attached. (PENDING: final numbers to be recomputed from the finished edit and generation ledger.)

**Consistency method.** One light-source rule per shot (CAVE_LIGHT block), pure-black boundaries outside headlamp beams, {len(refs)} fixed reference assets ({', '.join(refs)}), separate indoor (bareheaded) and underground (hard hat/headlamp) character sheets, dedicated macro hand references for every hand shot.

**Supporting tools (post only).** On-screen Korean text (report line, roster header, sign, specimen label) and English subtitles were composited in editing onto AI-generated blank surfaces. Sound design from recorded/CC0 sources; no music after the blackout. Generation logs, prompts and reference sheets archived.
"""
open("DISCLOSURE_STEP3_draft.md","w",encoding="utf-8").write(D)
print("rows",len(rows),"total",t,"ai",ai_sec,"ratio",round(ai_sec/t,4),round(ai_sec/(t-intro),4))
