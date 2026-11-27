// 안전 앱을 켠 빌드를 .next-safety 에 만든다. 맥·윈도우에서 같은 명령으로 돌도록 환경변수를 여기서 넣는다.
import { spawnSync } from "node:child_process";
const r = spawnSync("npx", ["next", "build"], { stdio: "inherit", shell: true, env: { ...process.env, NEXT_PUBLIC_SAFETY_APP: "on", NEXT_DIST_DIR: ".next-safety" } });
process.exit(r.status ?? 1);
