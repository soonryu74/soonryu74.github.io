"""「밧모섬의 증인」 Flow·Veo 촬영 대본 — 장면(가사 단락)별 화면 설명.

SCENES[편][장면 번호] = [(영어 설명, 한글 요약), …]
한 장면 안의 컷들이 이 목록을 차례로 돌려 쓰고, 컷마다 카메라 움직임을 바꾼다 (musical.flow_prompts).

빛 원칙: 하늘에서 내리는 빛기둥(GOD)은 한 편에 두 번뿐 — 주의 음성이 처음 들릴 때와 피날레.
나머지는 장면에 실제로 있는 빛만 쓴다 (새벽·노을·달빛·번개·횃불·등잔·사무실 형광등·네온·가로등).
주의 음성은 빛 대신 바람·꺼지는 화면·펄럭이는 불꽃·열리는 문 같은 '반응'으로 보여 준다.
"""
from __future__ import annotations

J = ("the aged apostle John (about 90 years old, long white beard and white hair, coarse brown hooded wool robe, "
     "rope belt, wooden staff)")
GOD = ("a vast column of warm golden light with soft rainbow-tinted rays pouring down from parted clouds "
       "(the Voice of God, never shown as a person)")

STYLE = ("Epic biblical feature film, photorealistic, anamorphic widescreen. Natural, motivated lighting that comes only "
         "from sources in the scene (sun, moon, lightning, fire, oil lamps, city lights); no light beams from the sky. "
         "Subtle atmospheric haze, restrained color grade, shallow depth of field. "
         "People are seen from behind, in silhouette or at a distance, never in facial close-up. "
         "Jesus is never depicted. No text, no subtitles, no logos, no watermark.")

SCENES: dict[str, dict[int, list[tuple[str, str]]]] = {
    "2-1": {
        0: [(f"{J} stands on a rocky cliff of Patmos at dusk in warm low sunset light, seen from behind, gazing at a faint vision of a modern city skyline forming in the clouds over the Aegean sea", "노을 진 밧모섬 절벽, 구름 속 현대 도시 환상"),
            (f"{J} walks slowly along the cliff edge leaning on his staff, wind moving his robe, the sea glittering below", "지팡이를 짚고 절벽을 걷는 요한"),
            (f"detail of {J}'s weathered hands gripping the wooden staff, then tilt up to his silhouette against the orange sky", "지팡이 쥔 손 → 노을 앞 실루엣"),
            (f"{J} kneels on the rock and lifts both hands toward the horizon as the sun sinks, seen from a distance", "해 지는 쪽으로 두 손 든 요한")],
        1: [(f"{GOD} descending through storm clouds over a modern city at night, five roads diverging below", "폭풍 구름을 뚫고 내려오는 빛기둥, 다섯 갈래 길 (빛기둥 ①)"),
            (f"a sudden strong wind rushes over the cliff, {J} bows to the ground, his robe and beard blown, the dark sea churning", "갑작스런 바람, 엎드린 요한")],
        2: [("a church surrounded by high stone walls with locked iron gates under flat grey overcast daylight, the people inside turning their backs to a busy city outside", "흐린 날, 높은 담 안에 갇힌 교회"),
            ("worshippers inside a walled courtyard singing with eyes closed while beyond the wall the city streets are grey and crowded", "담 안에서 노래하는 사람들, 담 너머 회색 도시")],
        3: [("in a dark room a gust of wind knocks a woven basket off a small oil lamp, its little flame suddenly lighting the room and the window toward the night city", "바람에 바구니가 벗겨지며 드러난 등불"),
            ("a quiet night street lit by shop windows, people stop walking and turn their heads as if they heard a voice", "가게 불빛 거리, 무언가 들은 듯 멈추는 사람들")],
        4: [("a church interior turned into a flashy concert hall with neon lights and giant LED screens, crowd seen from behind, a plain wooden cross dim in a corner", "네온과 대형 화면의 콘서트장이 된 교회, 구석의 십자가"),
            ("the camera moves through the dancing crowd toward a forgotten wooden cross standing in shadow", "군중 사이로 잊힌 나무 십자가"),
            ("confetti falling through colored stage lights while the wooden cross stays in darkness", "색 조명 속 꽃가루, 어둠 속 십자가")],
        5: [("the neon signs and LED screens of the concert hall flicker and go dark one by one, the crowd freezes in sudden silence", "네온과 화면이 하나씩 꺼지고 멈춰 선 군중"),
            ("the emptied hall in darkness, a single work lamp left on beside the plain wooden cross", "텅 빈 어둠 속, 작업등 하나 옆의 십자가")],
        6: [("a split screen of a warm Sunday church service and a grey Monday office with tired workers under fluorescent lights", "따뜻한 주일 예배와 형광등 아래 월요일 사무실"),
            ("office workers in suits walk out of a church into grey rain under umbrellas, their Bibles closed", "우산 쓰고 교회를 나서는 직장인들"),
            ("hands slide a Bible into a desk drawer and close it, then turn toward the cold glow of a computer screen", "성경을 서랍에 넣고 모니터로 돌아서는 손")],
        7: [("aerial view at early sunrise, the first natural light touching office towers, family homes and a parliament building", "해 뜨는 도시 — 사무실·가정·국회"),
            ("morning sun through office blinds slowly moves across rows of empty desks", "블라인드 사이 아침 햇살, 빈 책상들")],
        8: [("a businessman in a suit stands at night between a candlelit church doorway and a dark alley where he counts money under a streetlight, seen from a distance", "촛불 켜진 교회 문과 가로등 골목 사이의 사업가 — 두 얼굴"),
            ("two shadows of the same man walk in opposite directions on a wet neon-lit street at night", "젖은 네온 거리, 반대로 걸어가는 두 그림자"),
            ("a man in a suit removes a church name badge and pockets it before entering a smoky backroom, seen from behind", "교회 이름표를 떼고 뒷방으로 들어가는 남자")],
        9: [("a thunderstorm over a modern city at night, lightning flashing across the skyline, heavy rain", "번개 치는 밤 도시"),
            ("under a single bare bulb, one hand drops coins into an offering box while another hand takes money from a poor worker, hands only", "알전구 아래 헌금하는 손과 빼앗는 손"),
            ("the businessman falls to his knees on the wet street in the rain under a flickering streetlight, seen from behind", "빗속 가로등 아래 무릎 꿇는 사업가"),
            ("slow-motion rain falling past neon reflections in puddles", "네온이 비친 웅덩이에 떨어지는 빗방울")],
        10: [("people walk out of a church into city streets carrying lanterns and bread as the sun rises between skyscrapers", "해 뜨는 도시로 등불과 빵을 들고 나가는 사람들"),
             ("volunteers hand bread and warm drinks to homeless people under a bridge at dawn, seen from a distance", "새벽 다리 밑에서 빵을 나누는 사람들"),
             ("office workers pause to pray quietly at their desks in soft morning window light, seen from behind", "아침 창가 책상에서 조용히 기도하는 직장인들")],
        11: [("aerial view of a city at blue hour as many small warm windows switch on and spread through the streets like a living network", "도시 곳곳에 켜지는 작은 창문 불빛"),
             ("a family table and an office desk both lit by the same small warm lamp, intercut in one frame", "가정의 식탁과 사무실 책상의 작은 등")],
        12: [(f"{J} on the cliff raising his wooden staff toward the rising sun, seen from behind", "해돋이를 향해 지팡이를 드는 요한"),
             (f"{J} bows his head in thanks, sunrise rim light on his white hair, profile silhouette", "감사로 고개 숙인 요한의 옆모습")],
        13: [(f"a great crowd fills the city streets with hands raised as {GOD} breaks over the skyline", "거리를 채운 군중 위로 빛기둥 (빛기둥 ②)"),
             ("the crowd sings in golden-hour sunlight between tall buildings, seen from behind", "해 질 녘 빌딩 사이 노래하는 군중"),
             ("the camera cranes up from the crowd to reveal the whole city glowing in the sunrise", "군중에서 해 뜨는 도시 전체로 솟는 화면")],
    },
    "2-2": {
        0: [(f"{J} stands on a rocky cliff of Patmos above the Aegean sea in soft pale dawn light, seen from behind and far away", "새벽 밧모섬 절벽의 요한"),
            (f"{J} unrolls a scroll on a flat rock by the sea, wind lifting its edges", "바닷가 바위에서 두루마리를 펴는 요한"),
            (f"{J} lifts his eyes as low clouds drift apart over the sea", "흩어지는 구름을 올려다보는 요한")],
        1: [(f"{GOD} falling through the roof opening of a dark vaulted stone room in ancient Smyrna where early Christians kneel by oil lamps", "서머나 돌방에 내리는 빛기둥 (빛기둥 ①)"),
            ("seven small oil-lamp flames on golden lampstands suddenly flare up brighter in a dark room", "일곱 촛대의 불꽃이 확 살아남"),
            ("poor early Christians in patched clothes share a small loaf of bread by oil lamplight, hands only", "등잔 아래 빵을 나누는 가난한 손들")],
        2: [("early Christians in a dim Roman prison with stone arches and iron bars pray with raised hands by the light of one torch, chains on the floor", "횃불 하나 켜진 로마 감옥, 손 들고 기도하는 성도들"),
            ("Roman soldiers seen from behind lead a calm believer through a torch-lit stone corridor", "횃불 복도로 끌려가는 담담한 성도"),
            ("a believer walks alone toward the daylight at the end of an arena tunnel, seen from behind", "경기장 통로 끝 햇빛을 향해 걷는 성도")],
        3: [("a huge ancient wooden door slowly swings open in a candlelit stone hall, bright morning daylight and wind entering from outside, small humble people kneeling before it", "촛불 켜진 돌방, 천천히 열리는 거대한 문"),
            ("detail of an ancient iron key turning in a lock by candlelight", "촛불 곁에서 돌아가는 열쇠"),
            ("wind sweeps through the open door, candle flames bending and robes fluttering", "열린 문으로 부는 바람, 휘는 촛불")],
        4: [("humble early Christians walk together through a great open stone gate toward a sunrise over green hills, long shadows", "열린 성문을 지나 해돋이로 걷는 성도들"),
            ("a small child and an old woman walk hand in hand through the open gate, seen from behind", "손잡고 성문을 지나는 아이와 할머니"),
            ("a line of people climbs a hill path at blue-hour dawn, each carrying a small oil lamp", "새벽 언덕을 등잔 들고 오르는 행렬")],
        5: [(f"{J} stands on a rock with one arm raised before a crowd of early Christians under a red and gold sunset, seen from behind the crowd", "노을 아래 성도들 앞에서 팔을 든 요한"),
            (f"{J} lifts his staff high as the crowd raises their hands, wide shot at sunset", "지팡이를 높이 드는 요한과 환호하는 무리")],
        6: [(f"{J} kneels alone on dark rocks by the sea at night under cold moonlight, seen from far away, blue tones", "달빛 아래 홀로 무릎 꿇은 요한"),
            (f"waves crash against black rocks in moonlight, {J} a small bowed silhouette", "달빛 파도 속 작은 실루엣")],
        7: [("a large modern church auditorium at night with only dim blue exit lights, scattered office workers in suits kneeling between rows of empty chairs, city lights through tall windows", "밤의 텅 빈 대예배실, 무릎 꿇은 직장인들"),
            ("a modern office floor at night under cold fluorescent light, workers standing silent at their desks, one man holding a small wooden cross, seen from a distance", "형광등 밤 사무실, 작은 십자가를 쥔 직장인"),
            ("a woman in office clothes prays alone on a subway platform as trains rush past, seen from behind", "지하철 승강장에서 홀로 기도하는 여성"),
            ("an empty church parking lot in the rain at night, a single car headlight on", "비 내리는 빈 교회 주차장"),
            ("a small cross necklace resting in an open palm beside a dark phone screen, detail", "손바닥 위 작은 십자가 목걸이")],
        8: [("in the dark auditorium the warm house lights come on one by one and the kneeling people slowly lift their heads", "하나씩 켜지는 예배당 조명, 고개 드는 사람들"),
            ("dawn breaks through the office windows, papers stirring on the desks as the sleepless workers look up", "밤샌 사무실로 들어오는 새벽"),
            ("open hands lifted in warm lamplight, hands only", "따뜻한 등불 속으로 펼친 손들")],
        9: [(f"{J} with arms wide open on a cliff at sunrise over the Aegean sea, seen from behind", "해돋이 절벽에서 두 팔 벌린 요한"),
            (f"{J} walks toward the rising sun along the cliff path, robe glowing at the edges", "해를 향해 걸어가는 요한")],
        10: [("a great multitude of ancient and modern people stand together with hands raised in a vast valley at golden hour", "해 질 녘 골짜기, 고대와 현대 성도의 연합"),
             (f"a huge crowd worships on a hillside with hands raised as {GOD} bursts over them", "언덕 위 군중에게 쏟아지는 빛기둥 (빛기둥 ②)"),
             ("robed early Christians and modern office workers walk side by side toward the rising sun, seen from behind", "나란히 해를 향해 걷는 초대교회 성도와 직장인"),
             ("the camera cranes high over the multitude in the valley at sunset", "골짜기 군중 위로 높이 솟는 화면")],
    },
    "2-3": {
        0: [(f"{J} kneels on dark rocks by a stormy sea at night, lightning flashing, seen from far away", "번개 치는 밤바다, 바위에 무릎 꿇은 요한"),
            (f"{J} rises against the wind, robe whipping, staff planted in the rock, lit by lightning", "번개 속 바람을 맞서 일어서는 요한"),
            ("a lightning flash reveals five distant ancient cities along a dark coastline", "번개에 드러나는 다섯 고대 도시")],
        1: [(f"{GOD} over the ruins of the library of Celsus in Ephesus at dusk, where a golden lampstand's flame is fading", "에베소 폐허 위 빛기둥, 꺼져 가는 촛대 (빛기둥 ①)"),
            ("a cold wind makes the weak flame of the golden lampstand gutter and almost die", "찬바람에 꺼질 듯한 촛대 불꽃")],
        2: [("people kneel in repentance in a large empty modern church hall full of banners and stage equipment, lit only by one work lamp", "작업등 하나 켜진 무대장비 홀, 회개하는 사람들"),
            ("hands relight a small oil lamp from another flame, detail", "다른 불꽃으로 작은 등불을 다시 켜는 손"),
            ("people slowly rise to their feet holding small glowing lamps", "등불을 들고 천천히 일어서는 사람들")],
        3: [("the ancient acropolis of Pergamum on a hill with a pagan altar under a stormy red sky, a long bolt of lightning striking like a sword", "붉은 폭풍 하늘, 칼처럼 내리꽂는 번개 — 버가모"),
            ("rain and wind lash the altar, torches going out one by one", "비바람에 꺼져 가는 제단의 횃불")],
        4: [("people smash golden idols of money and power in a dark torch-lit hall, sparks flying, seen from behind", "횃불 홀에서 황금 우상을 부수는 사람들"),
            ("gold coins scatter across a stone floor in slow motion", "돌바닥에 흩어지는 금화"),
            ("a large golden statue topples and shatters in the firelight", "불빛 속에 넘어져 깨지는 황금상")],
        5: [("the ancient marketplace of Thyatira with hanging purple cloth at dusk, long shadows, a distant fire glowing on the horizon", "노을 진 두아디라 시장, 자주 천, 멀리 번지는 불"),
            ("purple cloth billows in a hot wind as the fire glow approaches", "뜨거운 바람에 흩날리는 자주 천")],
        6: [("people throw treasures into a bonfire at night, sparks rising into the dark", "밤 모닥불에 보물을 던지는 사람들"),
            ("a bright morning star rises over the hills in the pre-dawn sky above the kneeling crowd", "새벽 하늘에 떠오르는 샛별")],
        7: [("the ancient city of Sardis on a cliff at night, grand buildings with no lights, lifeless, cold moonlight", "불 꺼진 사데 도시, 차가운 달빛"),
            ("an empty grand hall covered in dust and cobwebs, moonlight through a broken window", "먼지와 거미줄의 빈 대전, 깨진 창 달빛")],
        8: [("a crowd rises from sleep in a dark church as pale dawn comes through the windows, people putting on white robes", "새벽 창빛에 깨어나 흰옷을 입는 사람들"),
            ("people in white robes step out into the morning sunlight, seen from behind", "흰옷 입고 아침 햇살로 나가는 무리")],
        9: [("the rich ancient city of Laodicea with a Roman aqueduct and villas in hazy midday heat", "뜨거운 한낮, 수도교와 별장의 라오디게아"),
            ("a large closed wooden door with warm lamplight glowing around its edges, dust trembling on it as if someone knocks from outside", "문틈 등불빛, 두드리는 듯 떨리는 문"),
            ("lukewarm water trickles from a broken Roman aqueduct into a stagnant pool", "수도교에서 흘러내리는 미지근한 물")],
        10: [("a wealthy candlelit church hall with golden decorations where people weep and open a large wooden door", "촛불과 금장식의 교회, 울며 문을 여는 사람들"),
             ("daylight floods through the opened door over the gold decorations, people stepping outside", "열린 문으로 들어오는 햇빛, 밖으로 나가는 사람들")],
        11: [(f"{J} stands on a high rock shouting with arms raised in a storm, lightning behind him, seen from behind", "폭풍과 번개 속 높은 바위에서 외치는 요한")],
        12: [("five groups of people from five ancient cities walk together toward the rising sun", "해를 향해 함께 걷는 다섯 교회"),
             ("five small torches brought together into one great fire at dawn", "다섯 횃불이 하나의 큰 불로")],
        13: [("a modern congregation rises to their feet with hands raised in a large church under warm house lights", "따뜻한 조명 아래 손 들고 일어서는 현대 교회"),
             ("office workers and families stand together in the aisle, seen from behind", "통로에 함께 선 직장인과 가족들")],
        14: [(f"a vast crowd on a hillside with hands raised as {GOD} bursts from heaven", "언덕 위 군중에게 쏟아지는 빛기둥 (빛기둥 ②)"),
             ("seven great flames on golden lampstands burn on the hilltop at night above a worshipping multitude", "밤 언덕 위 일곱 금 촛대의 불꽃과 군중")],
    },
}
