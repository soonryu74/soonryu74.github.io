# -*- coding: utf-8 -*-
"""「입구」 v4 샷리스트 CSV + Seedance 프롬프트 MD 생성기. 타임라인의 단일 진실 소스."""
import csv, math

STYLE = ("Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. "
         "Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. "
         "No text, no logos, no subtitles, no lens flare.")
CAVE = ("Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. "
        "Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave.")
DS = "Korean man, 64, short white hair, weathered face, thick calloused hands, faded orange safety vest, old scratched white hard hat"
DS05 = "Korean man, 43, short black hair wet with rain, orange safety vest, white hard hat"
HI = "Korean woman, 34, black low ponytail, black technical work jacket, headlamp strap on forehead"
TEAM = "cave survey team in identical black work jackets and headlamps, faces in shadow"

# (id, scene, seconds_used, mode, refs, function, camera, prompt, audio/subs, fail, retry, priority)
# non-AI blocks: mode 'NONE'
S = []
def add(*a): S.append(a)

add("INTRO","S0",20,"NONE","","공식 인트로(주최 제공)","","","주최 제공 영상 그대로","","","-")
# S1 0:20–0:48
add("1-1","S1",5,"T2V","R-2005","2005 발견. 비 오는 밭, 공사","fixed wide",
    f"Wide shot. Gray rain over flat Jeju farmland with black stone walls. An excavator digs a hole beside a new concrete utility pole; a worker ({DS05}) shovels at the edge. Fixed camera, overcast, desaturated 2005 documentary feel.",
    "빗소리, 굴착기","비가 안개처럼 뭉개짐 / 전신주가 나무로 생성","'concrete utility pole with wires' 명시, 'rain as thin streaks' 추가","P2")
add("1-2","S1",4,"T2V","R-2005","삽이 헛돌고 흙이 꺼진다","fixed low",
    "Close on muddy boots and a shovel blade. The shovel sinks and the wet soil suddenly gives way, mud collapsing into a black opening. Fixed low camera, rain.",
    "흙 무너지는 소리","구멍이 물웅덩이로 보임","'dry black void, no water' 추가","P2")
add("1-3","S1",5,"I2V","R-DS05","차가운 바람이 올라온다 (S4 매치)","slow push-in",
    f"{DS05} leans over a dark hole in wet ground. A cold wind rises from below and lifts his hair; he freezes. Slow push-in on his face. Rain on skin.",
    "바람 소리 (저음)","머리카락이 안 움직임","'hair visibly blown upward' 반복, 생성 길이 10초로","P1")
add("1-4","S1",6,"T2V","R-WALL","손전등 원 안의 흰 벽","slow pan",
    "POV flashlight beam from above into a dark shaft. The circle of light finds a black basalt wall streaked with bone-white calcite deposits. Slow pan across the white. Pure black outside the beam.",
    "물방울 1회","원 밖이 회색","'pure black, zero ambient light' 2회 반복","P1")
add("1-5","S1",5,"T2V","R-GLOVE","노란 장갑이 떨어진다 (S10-7 대칭)","fixed top-down",
    "Looking straight down a black shaft. A yellow rubber work glove slips from a hand at the top of frame and falls away from camera, caught briefly in a flashlight beam, then swallowed by darkness.",
    "낙하음 지연 1.5초","장갑이 둘로 보임 / 손이 프레임에 남음","'one glove only', 'the hand exits frame immediately'","P1")
add("TITLE","S1",3,"NONE","","타이틀 '입구 / The Opening'","","","무음","","","-")
# S2 0:48–1:10
add("2-1","S2",6,"I2V","R-HI","2005 보고서를 넘기다 한 줄에서 멈춘다","slow push-in",
    "Close on a woman's hand turning pages of a bound 2005 cave survey report with photos and diagrams under fluorescent light. The hand stops on a line of text. Slow push-in on the page. (The line '발견자: 공사 인부(성명 미상)' is composited in editing.)",
    "종이 소리. 자막 합성: Discovered by: construction worker (name unknown)","페이지에 가짜 글자 생성","'blank text lines, no legible letters' 명시 후 편집 합성","P1")
add("2-2","S2",4,"I2V","R-HI","보고서를 덮고 명단 양식을 당긴다","fixed",
    "The same hand closes the report firmly and pulls a blank form forward. Fixed camera, fluorescent light.",
    "","","","P2")
add("2-3","S2",7,"REF","R-HI;R-LEADER","이름을 쓴다. 팀장: 기록은 못 고쳐","fixed two-shot",
    f"{HI} writes a name on a form with a pen. Across the desk a gray-haired middle-aged man in a gray jacket watches and speaks briefly. Fixed two-shot, office, fluorescent light.",
    "팀장: 기록은 못 고쳐. 20년 전 거야. / 해인: 압니다. 이번 조사 명단에만. | SUB: The record can't be changed. It's twenty years old. / I know. Just this survey's roster.","입 모양 불일치","대사는 후반 더빙. 입은 'speaks briefly'만","P1")
add("2-4","S2",5,"T2V","R-LEADER","팀장이 서명한다","fixed",
    "Close on a man's hand holding a pen above a signature box, hesitating, then signing. Fixed camera, fluorescent light, desk.",
    "","","","P2")
# S3 1:10–1:55
add("3-1","S3",6,"T2V","R-GATE;R-HI","돌담길, 밭마다 팻말","slow tracking",
    f"Evening. {HI} walks along a Jeju black-stone-wall lane past quiet fields. On each field gate a weathered official notice board on a post. Slow tracking beside her.",
    "바람. 팻말 문구 편집 합성: 천연기념물 제466호 보호구역 · 현상변경 허가 필요","팻말에 가짜 글자","'blank sign' 명시 후 합성","P2")
add("3-2","S3",4,"REF","R-HI","이웃이 고개를 돌린다","fixed medium",
    f"An elderly Jeju farmer walking toward {HI} on the lane sees her, turns his head away and passes without greeting. Fixed medium shot, dusk.",
    "","노인이 웃음","'expression closed, avoids eye contact'","P2")
add("3-3","S3",5,"I2V","R-HOME","밥상 위 그릇 하나","slow push-in",
    "Small rural Korean room at night, one bare incandescent bulb. Low table with one bowl of rice and one spoon. Old TV glow flickers on the wall. Slow push-in on the single bowl.",
    "TV 소리 낮게","그릇이 둘","'exactly one bowl, one spoon'","P1")
add("3-4","S3",5,"I2V","R-DS25","보지 않고 먹는다. 숟가락을 더듬는다","fixed medium",
    f"{DS}, gray shirt, no hat, eats alone at a low table with his eyes lowered, never looking at the glowing TV, his hand feeling for the spoon by touch. Fixed medium shot, warm bulb light.",
    "","TV를 쳐다봄","'eyes stay down the whole time'","P1")
add("3-5","S3",5,"T2V","R-HOME","벽의 안전모와 액자","slow pan",
    "Slow pan across a wall under warm bulb light: a scratched white hard hat on a nail, then a faded framed snapshot of a young man carrying a small girl on his shoulders in front of a concrete utility pole.",
    "","액자 속 인물 얼굴 왜곡","액자 이미지는 R-PHOTO로 별도 생성 후 합성","P2")
add("3-6","S3",5,"REF","R-DS25;R-HI","문을 연다. 딸을 보지 않고 문고리를 만진다","fixed",
    f"{DS}, no hat, opens a wooden door. Outside in the dark stands {HI}. He does not meet her eyes; his hand stays on the door handle, thumb moving over the metal. Fixed shot from inside the house.",
    "동수: …몇 년 만이냐. / 해인: 3년. | SUB: …How many years has it been. / Three.","눈을 마주침","'he looks at the door frame, not at her'","P1")
add("3-7","S3",6,"REF","R-DS25;R-HI","허가서. 뚫은 놈. 니도.","fixed two-shot",
    f"Inside the room, {HI} holds out a folded document. {DS}, no hat, does not take it; he looks at the hard hat on the wall. Fixed two-shot, warm bulb light, long pause.",
    "동수: 20년 동안 나보고 뚫은 놈이라 그랬다. 니도. / 해인: …맞잖아요. | SUB: For twenty years they called me the man who broke it. You did too. / …You did.","","","P1")
add("3-8","S3",5,"I2V","R-DS25","안전모를 내려 먼지를 턴다","fixed macro",
    "Close on thick weathered hands lifting an old white hard hat from a nail and brushing dust off it with a palm. Warm light. Fixed camera.",
    "먼지 터는 소리","손가락 6개","'five fingers' 명시, 손 레퍼런스 R-DS25-hand 첨부","P1")
add("3-9","S3",4,"I2V","R-HI","해인이 그릇 하나를 본다","slow push-in",
    f"{HI}, indoors, glances down at a low table with one bowl and one spoon and says nothing. Slow push-in on her face. Warm bulb light.",
    "","","","P2")
# S4 1:55–2:15
add("4-1","S4",5,"I2V","R-GATE;R-TEAM","전신주, 철문, 조사팀","slow aerial pull-out",
    f"Overcast morning. Flat Jeju field with black stone walls, a concrete utility pole, a rusted steel hatch in a concrete frame beside it. A {TEAM} unloads equipment from a white van. Slow aerial pull-out.",
    "","철문이 지하실 문처럼 큼","'small hatch, about one meter square'","P2")
add("4-2","S4",5,"REF","R-DS25;R-HI","헤드랜턴을 씌운다. 손이 이마에 닿는다","fixed close two-shot",
    f"{HI} fastens a headlamp over an old white hard hat worn by {DS}. Her fingers touch his forehead for a moment; both go still. Close two-shot, fixed, overcast light.",
    "","","","P1")
add("4-3","S4",5,"REF","R-DS25","철문이 열리고 바람이 올라온다 (S1-3 매치)","slow push-in",
    f"A steel hatch door swings open. Cold air rises from the dark and lifts the white hair of {DS} standing at the edge. Slow push-in. Overcast.",
    "바람 소리 (S1-3과 동일 음원)","","","P1")
add("4-4","S4",5,"T2V","","위에서 본 구멍, 작아지는 빛","fixed top-down",
    "Looking straight down a dark vertical shaft. Headlamp circles descend one by one, growing smaller, until the last one moves out of view. Fixed top-down camera. Pure black.",
    "","","","P2")
# S5 2:15–2:40
add("5-1","S5",7,"I2V","R-ROLL","용암두루마리 벽을 훑는 랜턴 원 여섯 개","slow tracking",
    f"Pitch-black lava tube. Six headlamp beams sweep across a black basalt wall carrying long horizontal rolled ridges like a scroll, with bone-white calcite flows over it. Beams cross and separate. Slow tracking along the wall. {CAVE}",
    "발소리, 물방울","벽 전체가 밝아짐","CAVE 문구 반복, 'beams are small circles'","P1")
add("5-2","S5",5,"I2V","R-ROOT","뿌리를 따라 자란 흰 종유관, 물방울","slow tilt up",
    f"A headlamp beam tilts up to a black basalt ceiling where thin bone-white soda-straw stalactites hang along the paths of tree roots. A single water drop swells at a tip and falls. Slow tilt up then hold. {CAVE}",
    "물방울 1회","종유관이 굵은 고드름","'thin straws, pencil-thin'","P1")
add("5-3","S5",7,"REF","R-DS25;R-WALL","흰 벽 앞에서 손이 멈춘다","fixed side profile",
    f"{DS} with headlamp stands before a white calcite wall in a black cave. He slowly reaches out his thick hand toward the white, then stops a hand's width away and holds. Fixed side profile; his own headlamp is the only light. {CAVE}",
    "해인(화면 밖): 만지면 안 돼요. | SUB: Don't touch.","손이 벽에 닿음","'the hand never touches the wall, stops with a visible gap'","P0")
add("5-4","S5",6,"REF","R-HI","멈춘 손 → 해인의 시선","rack focus",
    f"Close on a weathered hand frozen a hand's width from a white calcite wall. Rack focus to {HI} in the background watching the hand, her headlamp beam low. {CAVE}",
    "","","","P1")
# S6 2:40–3:20
add("6-1","S6",7,"I2V","R-LAKE","보트. 빛이 두 번","slow tracking side",
    f"A small gray rubber boat glides on perfectly still black underground water; {HI} rows at the back, {DS} sits at the front. Their headlamps reflect off the water onto a low basalt ceiling as two circles of light. Slow tracking from the side. {CAVE}",
    "노 젓는 물소리","보트에 모터/셋째 인물","'two people only, no motor'","P1")
add("6-2","S6",5,"T2V","R-LAKE","담수·염수 경계 아지랑이","slow push-in",
    f"A headlamp beam shines down into clear black water. A shimmering, wavering layer where fresh water meets denser salt water, like heat haze underwater. Slow push-in. {CAVE}",
    "","층이 안개로 보임","'sharp refraction layer, not fog'","P2")
add("6-3","S6",7,"I2V","R-FISH","눈이 퇴화한 물고기","slow tracking with fish",
    f"A small pale-pink translucent cave goby, 4 cm, with an unusually large head and eyes reduced to two tiny dark dots beneath the skin, drifts slowly through a warm headlamp beam in black water beside a rubber boat edge. It does not flee the light. Macro, slow tracking. {CAVE}",
    "","눈이 생김 / 물고기가 둘","'no visible eyeball', 'one fish only' 2회 반복","P0")
add("6-4","S6",5,"REF","R-DS25","동수가 들여다본다. 빛이 없어서 눈이 없어진 거냐","fixed close",
    f"{DS} leans over the edge of a rubber boat and looks down into black water lit by his headlamp, his face faintly reflected. Fixed close shot. {CAVE}",
    "동수: 빛이 없어서 눈이 없어진 거냐. | SUB: Did they lose their eyes because there's no light?","","","P1")
add("6-5","S6",5,"REF","R-HI","해인: 안 써도 살 수 있어서요","fixed medium",
    f"{HI} holds the oars still and looks at the man across the boat, calm, and speaks one short line. Fixed medium shot, black water, her beam low. {CAVE}",
    "해인: 안 써도 살 수 있어서요. | SUB: Because they could live without using them.","","","P1")
add("6-6","S6",6,"REF","R-DS25","동수가 자기 손을 내려다본다. 그럼 뭘 보고 사냐","fixed close",
    f"{DS} in a rubber boat slowly turns his thick weathered hands palm-up in his own headlamp light and looks at them. Fixed close shot, black water beyond. {CAVE}",
    "동수: 그럼 뭘 보고 사냐. / 해인(화면 밖): 안 봐요. 느껴요. | SUB: Then what do they see by? / They don't see. They feel.","손가락 수","손 레퍼런스 첨부, 'five fingers each'","P0")
add("6-7","S6",5,"I2V","R-FISH","물고기가 빛을 가로질러 사라진다","fixed macro",
    f"The pale-pink translucent goby, eyes buried beneath its skin, crosses the full width of a headlamp beam in black water and disappears at the edge of the light. Fixed macro. {CAVE}",
    "","","","P1")
# S7 3:20–3:40
add("7-1","S7",5,"I2V","R-SAND","보트가 모래에 닿는다. 파도 소리","fixed low from boat",
    f"The nose of a rubber boat slides onto a dark sand bank at the end of black underground water. A headlamp beam ahead reveals sand rising into darkness. Fixed low camera from the boat. {CAVE}",
    "먼 파도 소리","","","P2")
add("7-2","S7",5,"I2V","R-SAND;R-INSCRIPTION","항아리들, 벽의 두 글자","slow pan",
    f"A headlamp beam settles on round stoneware jars half-buried in dark sand, one tipped over, abalone shells scattered. The beam lifts to a black basalt wall where two carved characters are half-covered by white calcite crust. Slow pan from jars to wall. (Characters 火川 composited in editing.) {CAVE}",
    "","글자가 엉뚱한 문자","'two scratched marks, illegible' 후 합성","P1")
add("7-3","S7",6,"T2V","R-SILLA","회상(창작 재현): 횃불, 항아리를 두고 글자를 긋는다","fixed wide",
    "Same sand bank long ago. Four figures in rough undyed hemp clothing hold pine torches, faces entirely outside the firelight. One kneels and sets a round stoneware jar on the wet sand; another scratches marks into the black wall with an iron point. Only torchlight, deep orange, black beyond. Silhouettes, dreamlike.",
    "횃불 소리. 자막(작게): 창작 재현 / dramatization","얼굴이 보임","'faces never lit'","P2")
add("7-4","S7",4,"T2V","R-SAND","횃불이 돌아선다 → 현재 항아리","fixed same framing",
    "The torches turn and walk away up the sand into darkness until the last flame disappears. Hold on black. Then a cool white headlamp beam fades in on the same jar, now half-buried and 1,200 years old. Fixed camera, same framing.",
    "","","","P2")
# S8 3:40–4:10
add("8-1","S8",5,"T2V","R-GLOVE","랜턴이 바위 틈에서 멈춘다. 장갑","slow pan then hold",
    f"A headlamp beam sweeps along a black basalt crevice at the edge of a sand bank, then stops. In the beam: a yellow rubber work glove crusted in white calcite. Slow pan then hold. {CAVE}",
    "","","","P1")
add("8-2","S8",5,"REF","R-DS25","동수가 얼어붙는다","slow push-in",
    f"{DS} with headlamp stares at something low in a rock crevice. His body goes completely still; his beam trembles slightly. Slow push-in on his face. {CAVE}",
    "","","","P1")
add("8-3","S8",5,"REF","R-HI","해인이 본다. 사진을 찍고 기록한다 (보존 절차)","fixed medium",
    f"{HI} approaches, sees the yellow glove in the crevice, pauses, then raises a rugged camera-tablet and photographs it with a small flash, and writes on a clipboard. Fixed medium shot, headlamp light. {CAVE}",
    "셔터음","플래시가 동굴 전체를 밝힘","'brief small flash, cave stays black'","P1")
add("8-4","S8",5,"REF","R-HI;R-GLOVE","장갑을 표본 봉투에 넣는다. 라벨 한 칸은 비어 있다","fixed macro",
    f"Close on gloved hands lifting the calcite-crusted yellow glove from the crevice with tweezers-like care and sliding it into a clear specimen bag with a white label. White dust falls. The pen hovers over one blank line on the label and does not write. Fixed macro, headlamp light. {CAVE}",
    "","라벨에 가짜 글자","'blank label' 후 합성: 유입 경위: ______","P0")
add("8-5","S8",6,"REF","R-HI;R-DS25;R-GLOVE","봉투를 아버지 손에 쥐어준다","fixed macro",
    f"Close on hands. A young woman's hand places a clear specimen bag holding a white-crusted yellow glove into an older man's thick open palm. His fingers close on it. Fixed macro, warm headlamp light. {CAVE}",
    "","","","P0")
add("8-6","S8",4,"REF","R-HI","해인이 돌아서 보트로 간다","fixed wide from behind",
    f"{HI} turns away and walks back across dark sand toward a rubber boat, her headlamp beam leading. Behind her the man stands alone holding a small bag. Fixed wide from behind her. {CAVE}",
    "","","","P2")
# S9 4:10–4:45
add("9-1","S9",5,"REF","R-HI;R-DS25;R-LAKE","보트가 호수 가운데. 노를 멈춘다. 끄죠","fixed wide side",
    f"Rubber boat in the middle of a black underground lake. {HI} at the back stops rowing; {DS} at the front. Two headlamp circles on water and ceiling. Fixed wide from the side. {CAVE}",
    "해인: 끄죠. | SUB: Let's turn them off.","","","P1")
add("9-2","S9",4,"REF","R-HI;R-DS25","랜턴 두 개가 꺼진다 → 검정","fixed close two-shot",
    f"Close two-shot in a boat: both people reach up and switch off their headlamps one after the other. Light disappears; the frame goes to pure black. Fixed camera. {CAVE}",
    "","프레임이 회색으로 남음","마지막 1초는 편집에서 검정 처리","P1")
add("BLACK","S9",10,"NONE","","암전 (기본 10초, 8/15초 대안)","","","물방울, 두 사람의 숨, 먼 파도. 동수: …보인다. / 해인: 뭐가요. / 동수: 아무것도. | SUB: …I can see. / See what. / Nothing.","","","-")
add("9-3","S9",6,"REF","R-HI-hand;R-DS25-hand","랜턴이 켜진다. 이미 잡혀 있는 두 손","fixed macro",
    f"Pure black. A single headlamp switches on. In the new circle of light, resting on a rubber boat edge: a young woman's slender hand lying on top of an older man's thick weathered hand. Neither hand moves. Fixed macro, nothing else visible. {CAVE}",
    "숨소리","손가락 수 / 손 위치가 9-4와 다름","손 레퍼런스 2쌍 고정. 10회 이상 생성. 채택 컷의 손 위치를 9-4 프롬프트에 기술","P0")
add("9-4","S9",5,"REF","R-HI;R-DS25","둘 다 손을 쳐다보지 않는다","fixed two-shot",
    f"Two-shot in a rubber boat under one headlamp: {DS} looks down at the water, {HI} looks up at the ceiling, their joined hands resting on the boat edge between them, out of focus, woman's hand on top. Neither looks at the hands. Fixed. {CAVE}",
    "","손이 떨어져 있음","'hands stay joined, same position as previous shot'","P0")
add("9-5","S9",5,"I2V","R-FISH","물고기가 보트 옆을 지난다","fixed macro",
    f"The pale-pink translucent goby, eyes buried beneath its skin, drifts past a rubber boat edge at the bottom of a single headlamp beam and slips into black water. Fixed macro. {CAVE}",
    "","","","P2")
# S10 4:45–5:25
add("10-1","S10",5,"I2V","R-GATE-dusk;R-TEAM","저녁. 철문 앞 조사팀, 장비 내려놓음. 한 명이 비켜선다","slow push-in",
    f"Evening, flat Jeju field, blue dusk. A {TEAM} waits around an open steel hatch, equipment set down. One researcher steps back from the hatch edge to make room. Slow push-in.",
    "바람","군중이 도열한 것처럼 보임","'loosely gathered, not in lines'","P1")
add("10-2","S10",5,"REF","R-DS25;R-LEADER","동수가 봉투를 들고 올라온다. 팀장이 안전모를 벗는다","fixed low",
    f"{DS} climbs up out of a steel hatch in the ground holding a small clear specimen bag. Nearby a gray-haired team leader quietly takes off his own hard hat. Fixed low camera at ground level. Dusk.",
    "","","","P1")
add("10-3","S10",5,"REF","R-DS25;R-LEADER","팀장이 봉투를 받으려 손을 내민다. 동수가 봉투를 본다","fixed medium",
    f"The team leader holds out an open hand toward {DS}, who looks down at the specimen bag in his own hand for a long moment. Fixed medium two-shot, dusk.",
    "","","","P1")
add("10-4","S10",6,"REF","R-DS25;R-LEADER","동수가 봉투를 건넨다. 동굴이나 잘 닫으쇼","fixed medium",
    f"{DS} places the specimen bag into the team leader's hand and lets go. The leader says something; the old man answers in a few words and looks away toward the field. Fixed medium two-shot, dusk.",
    "팀장: 보고서에 올리겠습니다. / 동수: …동굴이나 잘 닫으쇼. | SUB: I'll put it in the report. / …Just close the cave properly.","","","P1")
add("10-5","S10",5,"REF","R-HI;R-GLOVE","해인이 봉투 라벨의 빈 칸에 쓴다","fixed macro",
    f"Close on {HI}'s hand writing with a pen on the white label of a clear specimen bag that holds a calcite-crusted yellow glove, held flat on a clipboard. Fixed macro, dusk light. (Text '유입 경위: 2005년 공사 중 낙하 — 김동수' composited.)",
    "펜 소리. 자막 합성: Origin: dropped during construction, 2005 — Kim Dong-su","가짜 글자","'blank label' 후 합성","P0")
add("10-6","S10",5,"REF","R-LEADER;R-TEAM","팀장이 읽고 아래에 서명한다. 사람들이 조용히 본다","fixed medium",
    f"The gray-haired team leader reads the label, nods once, and signs below it. Around him {TEAM} watches in silence; no one bows, no one speaks. Fixed medium, dusk.",
    "","집단이 고개를 숙임","'no bowing, heads level'","P1")
add("10-7","S10",4,"REF","R-GLOVE","봉투 속 장갑이 저녁빛 속으로 올라온다 (S1-5 대칭)","fixed low, tilt up",
    "Low angle. A clear specimen bag holding a white-crusted yellow glove is lifted up into the last blue-orange dusk light above a dark field, held by a woman's hand. Slow tilt up with the bag. Sky behind.",
    "바람","","","P0")
add("10-8","S10",5,"T2V","R-GATE-dusk","철문이 닫힌다. 자물쇠. 봉인지","fixed close",
    "A steel hatch door closes over a concrete frame in a dark field. Hands fasten a heavy padlock and press an official paper seal across the seam. Fixed close on the seam, dusk to night.",
    "자물쇠 소리","봉인지에 글자","'blank white paper strip'","P2")
# S11 5:25–5:40
add("11-1","S11",5,"REF","R-DS25;R-GATE","동수가 전신주에 손을 댄다","slow push-in",
    f"Night wind over a Jeju field. A concrete utility pole, wires humming, a sealed hatch below it with a small sign. {DS} places his hand flat on the pole. Slow push-in on the hand.",
    "전선 윙 소리","","","P1")
add("11-2","S11",5,"REF","R-DS25;R-HI","동수가 처음으로 딸을 본다","fixed close two-shot",
    f"{DS} turns his head and looks directly at {HI} standing beside him, for the first time holding her gaze. She looks back. Night, wind, pole behind. Fixed close two-shot.",
    "","눈을 피함","'direct eye contact, held'","P0")
add("11-3","S11",5,"REF","R-DS25;R-HI","동수가 딸의 손을 잡는다. 둘이 앞을 본다","slow pull-out",
    f"Wide from behind: {DS} and {HI} stand side by side before a utility pole in a dark field. His thick hand reaches sideways and takes hers. Both turn to face forward. Slow pull-out, wind in their hair.",
    "","","","P1")
add("CREDITS","S12",20,"NONE","","엔딩 크레딧","","","무음→전선 소리","","","-")

SCENE_LABEL = {"S0":"공식 인트로","S1":"2005 비 오는 밭","S2":"2025 세계자연유산본부","S3":"월정리 동수의 집","S4":"입구","S5":"동굴 상류 흰 벽","S6":"호수","S7":"호수 끝 모래 둑","S8":"바위 틈 장갑","S9":"호수 가운데 어둠","S10":"지상 철문","S11":"전신주","S12":"크레딧"}

def req_len(sec, mode):
    if mode=="NONE": return 0
    return 5 if sec<=5 else 10   # 가정: Dreamina 길이 옵션 5/10초. UI에서 확인 필요

def mmss(t): return f"{t//60}:{t%60:02d}"

rows=[]; t=0
for (sid,scene,sec,mode,refs,func,cam,prompt,audio,fail,retry,prio) in S:
    start=t; end=t+sec; t=end
    rows.append(dict(샷ID=sid, 장면=scene, 장면명=SCENE_LABEL[scene], 이야기기능=func, 시작=mmss(start), 종료=mmss(end), 시작초=start, 종료초=end,
        최종사용길이초=sec, 생성요청길이초=req_len(sec,mode), 방식=mode, 레퍼런스ID=refs, 카메라=cam,
        프롬프트=(prompt+" "+STYLE if mode!="NONE" else ""), 음향_대사_자막=audio, 예상실패=fail, 재생성지시=retry, 우선순위=prio))
with open("02_입구_샷리스트_v4.csv","w",newline="",encoding="utf-8-sig") as f:
    w=csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)

# 03 프롬프트 MD
L=["# 「입구」 v4 — Seedance 프롬프트 (샷별)","",
   "**단일 진실 소스**: `02_입구_샷리스트_v4.csv` (이 문서는 `gen_v4.py`가 CSV와 함께 생성). 수정은 gen_v4.py에서.","",
   "## 공통 블록","","**STYLE (모든 샷 끝에 자동 부착)**","```",STYLE,"```","**CAVE (동굴 샷에 포함)**","```",CAVE,"```",
   "**인물 고정 문구**","```",f"동수 2025: {DS}",f"동수 2005: {DS05}",f"해인: {HI}",f"연구원: {TEAM}","```","",
   "## 광원 규칙 (현실 정합)","- '광원 하나'는 **샷 안의 주광원이 하나**라는 뜻. 헤드랜턴 여러 개가 보이는 샷(5-1, 6-1, 9-1)은 각 랜턴이 작은 원을 만들고 그 사이는 검정. 수면 반사(6-1)는 같은 랜턴의 2차 반사. 지상 샷(S1·S3·S4·S10·S11)은 자연광·백열등이 주광원이며 CAVE 블록을 붙이지 않는다.","",
   "## 생성 요청 길이 가정","- Dreamina 길이 옵션을 5초/10초로 가정(제작 당일 UI 확인). ≤5초 샷은 5초, 6~7초 샷은 10초로 요청 후 편집에서 트리밍.","",
   "## 우선순위","- **P0** 먼저 시험: 영화의 성패를 가르는 손·물고기·라벨 컷. 각 10회 이상.","- P1 인물·관계 컷. P2 환경·전환 컷(실패해도 편집으로 대체 가능).",""]
cur=None
for r in rows:
    if r["장면"]!=cur:
        cur=r["장면"]; L+= [f"## {cur}. {r['장면명']}",""]
    if r["방식"]=="NONE":
        L+= [f"### {r['샷ID']} · {r['시작']}–{r['종료']} ({r['최종사용길이초']}s) · 생성 없음",f"- {r['이야기기능']}",f"- 음향/대사: {r['음향_대사_자막']}",""]; continue
    L+= [f"### {r['샷ID']} · {r['시작']}–{r['종료']} · 사용 {r['최종사용길이초']}s / 요청 {r['생성요청길이초']}s · {r['방식']} · {r['우선순위']}",
         f"- 기능: {r['이야기기능']}", f"- 레퍼런스: {r['레퍼런스ID'] or '없음'} · 카메라: {r['카메라']}",
         f"- 음향/대사/자막: {r['음향_대사_자막'] or '없음'}",
         f"- 예상 실패: {r['예상실패'] or '—'} → 재생성: {r['재생성지시'] or '—'}",
         "```", r["프롬프트"], "```",""]
open("03_Seedance_프롬프트_v4.md","w",encoding="utf-8").write("\n".join(L))
print("rows", len(rows), "total", t)
