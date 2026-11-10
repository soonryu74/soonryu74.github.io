// 이전 빌드 결과(heartguard/index.html, heartguard/assets/)만 지운다. 소스(app/)는 건드리지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
fs.rmSync(path.join(out, 'assets'), { recursive: true, force: true });
fs.rmSync(path.join(out, 'index.html'), { force: true });
